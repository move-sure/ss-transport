import supabase from '@/app/utils/supabase';
import { generatePortraitBillPDF } from '@/components/bill/portrait-bill-generator';
import { generateLandscapeBillPDF } from '@/components/bill/landscape-bill-generator';

/**
 * Save bill to Supabase storage and database
 * @param {Array} bilties - Array of bilty objects to include in bill
 * @param {Object} billOptions - Bill options (billType, customName, printTemplate)
 * @param {Object} user - User object from useAuth
 * @param {Object} filterDates - Filter dates object
 * @param {Array} cities - Cities array
 * @param {Function} setIsSaving - State setter for saving status
 * @returns {Promise<Object>} - Returns { success, pdfUrl, error }
 */
export const saveBillToSupabase = async (
  bilties,
  billOptions,
  user,
  filterDates = null,
  cities = [],
  setIsSaving = null
) => {
  if (setIsSaving) setIsSaving(true);

  try {
    // Validate inputs
    if (!bilties || bilties.length === 0) {
      throw new Error('No bilties provided');
    }
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }

    console.log('Starting bill save process...', { 
      biltiesCount: bilties.length, 
      billOptions,
      userId: user.id,
      branchId: user.branch_id
    });

    // Generate PDF based on template
    const template = billOptions?.printTemplate || 'portrait';
    let pdfResult;

    if (template === 'landscape') {
      pdfResult = await generateLandscapeBillPDF(bilties, cities, filterDates, billOptions, true);
    } else {
      pdfResult = await generatePortraitBillPDF(bilties, cities, filterDates, billOptions, true);
    }

    const pdfBlob = pdfResult.blob;
    if (!pdfBlob) {
      throw new Error('Failed to generate PDF blob');
    }

    console.log('PDF generated successfully, blob size:', pdfBlob.size);

    // Generate filename
    const billTypeLabel = billOptions?.customName || billOptions?.billType || 'statement';
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    const filename = `${billTypeLabel}_${dateStr}_${timeStr}.pdf`;
    const filepath = `${user.id || 'default'}/${filename}`;

    console.log('Uploading PDF to Supabase storage...', filepath);

    // Upload PDF to Supabase storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bill')
      .upload(filepath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('PDF uploaded successfully:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('bill')
      .getPublicUrl(filepath);

    const publicUrl = urlData.publicUrl;
    console.log('Public URL generated:', publicUrl);

    // Calculate totals
    const totalAmount = bilties.reduce((sum, bilty) => 
      sum + parseFloat(bilty.total || bilty.amount || 0), 0
    );
    const paidAmount = bilties
      .filter(b => (b.payment_mode || b.payment_status || '').toLowerCase() === 'paid')
      .reduce((sum, bilty) => sum + parseFloat(bilty.total || bilty.amount || 0), 0);
    const toPayAmount = bilties
      .filter(b => (b.payment_mode || b.payment_status || '').toLowerCase() === 'to-pay')
      .reduce((sum, bilty) => sum + parseFloat(bilty.total || bilty.amount || 0), 0);

    console.log('Calculated totals:', { totalAmount, paidAmount, toPayAmount });

    // Prepare bill record data
    const billRecord = {
      bill_type: billOptions?.customName ? 'custom' : (billOptions?.billType || 'consignor'),
      bill_name: billOptions?.customName || null,
      date_from: filterDates?.dateFrom || bilties[0]?.bilty_date || new Date().toISOString().slice(0, 10),
      date_to: filterDates?.dateTo || bilties[bilties.length - 1]?.bilty_date || new Date().toISOString().slice(0, 10),
      consignor_name: filterDates?.consignorName || null,
      consignee_name: filterDates?.consigneeName || null,
      city_name: filterDates?.cityName || null,
      payment_mode: filterDates?.paymentMode || null,
      total_bilties: bilties.length,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      topay_amount: toPayAmount,
      pdf_template: billOptions?.printTemplate || 'portrait',
      pdf_url: publicUrl,
      pdf_filename: filename
    };

    console.log('Saving bill record to database...', billRecord);

    // Save bill record to database
    const { data: billData, error: dbError } = await supabase
      .from('monthly_bill')
      .insert([billRecord])
      .select();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Bill saved successfully to database:', billData);

    return {
      success: true,
      pdfUrl: pdfResult.url,
      publicUrl: publicUrl,
      billData: billData[0],
      message: 'Bill saved successfully!'
    };

  } catch (error) {
    console.error('Error in saveBillToSupabase:', error);
    return {
      success: false,
      error: error.message || 'Failed to save bill',
      pdfUrl: null
    };
  } finally {
    if (setIsSaving) setIsSaving(false);
  }
};
