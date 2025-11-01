import supabase from '../app/utils/supabase';
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
    // ✅ Validate inputs
    if (!bilties || bilties.length === 0) {
      throw new Error('No bilties provided');
    }
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }

    // ✅ Verify authentication session
    let userSession = null;
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem('userSession');
      if (!sessionStr) {
        throw new Error('⚠️ No active session found. Please login again.');
      }
      userSession = JSON.parse(sessionStr);
      
      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(userSession.expiresAt);
      if (now > expiresAt) {
        throw new Error('⚠️ Session expired. Please login again.');
      }
    }

    console.log('✅ Starting bill save process...', { 
      biltiesCount: bilties.length, 
      billOptions,
      userId: user.id,
      branchId: user.branch_id,
      hasValidSession: !!userSession
    });

    // ✅ Generate PDF based on template
    const template = billOptions?.printTemplate || 'portrait';
    let pdfResult;

    if (template === 'landscape') {
      pdfResult = await generateLandscapeBillPDF(bilties, cities, filterDates, billOptions, true);
    } else {
      pdfResult = await generatePortraitBillPDF(bilties, cities, filterDates, billOptions, true);
    }

    const pdfBlob = pdfResult.blob;
    if (!pdfBlob) {
      throw new Error('❌ Failed to generate PDF blob');
    }

    console.log('✅ PDF generated successfully, blob size:', pdfBlob.size);

    // ✅ Generate filename
    const billTypeLabel = billOptions?.customName || billOptions?.billType || 'statement';
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    const filename = `${billTypeLabel}_${dateStr}_${timeStr}.pdf`;
    const filepath = `${user.id || 'default'}/${filename}`;

    console.log('📤 Uploading PDF to Supabase storage...', filepath);
    console.log('📋 User info for upload:', { 
      userId: user.id, 
      username: user.username,
      branchId: user.branch_id 
    });

    // Upload PDF to Supabase storage bucket
    // Note: Supabase uses the anon key by default. For RLS to work properly,
    // you need to ensure your storage policies allow uploads based on user context
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bill')
      .upload(filepath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      console.error('❌ Full error details:', JSON.stringify(uploadError, null, 2));
      
      // Enhanced error messages for common RLS issues
      if (uploadError.message?.includes('row-level security') || 
          uploadError.message?.includes('policy') ||
          uploadError.message?.includes('violates') ||
          uploadError.statusCode === '42501') {
        throw new Error(
          `🚨 STORAGE PERMISSION ERROR\n\n` +
          `The storage bucket needs RLS policies to allow uploads.\n\n` +
          `TO FIX: Go to Supabase Dashboard → Storage → Policies → bill bucket\n` +
          `Create a policy: INSERT with "bucket_id = 'bill'"\n\n` +
          `See URGENT_FIX_STORAGE.md for detailed instructions.\n\n` +
          `Technical: ${uploadError.message}`
        );
      } else if (uploadError.message?.includes('duplicate')) {
        throw new Error(`⚠️ File already exists: ${filename}. Please try again.`);
      } else if (uploadError.message?.includes('not found') || uploadError.statusCode === '404') {
        throw new Error(`⚠️ Storage bucket 'bill' not found. Please create it in Supabase Dashboard.`);
      } else {
        throw new Error(`❌ Upload failed: ${uploadError.message}`);
      }
    }

    console.log('✅ PDF uploaded successfully:', uploadData);

    // ✅ Get public URL
    const { data: urlData } = supabase.storage
      .from('bill')
      .getPublicUrl(filepath);

    const publicUrl = urlData.publicUrl;
    console.log('✅ Public URL generated:', publicUrl);

    // ✅ Calculate totals
    const totalAmount = bilties.reduce((sum, bilty) => 
      sum + parseFloat(bilty.total || bilty.amount || 0), 0
    );
    const paidAmount = bilties
      .filter(b => (b.payment_mode || b.payment_status || '').toLowerCase() === 'paid')
      .reduce((sum, bilty) => sum + parseFloat(bilty.total || bilty.amount || 0), 0);
    const toPayAmount = bilties
      .filter(b => (b.payment_mode || b.payment_status || '').toLowerCase() === 'to-pay')
      .reduce((sum, bilty) => sum + parseFloat(bilty.total || bilty.amount || 0), 0);

    console.log('✅ Calculated totals:', { totalAmount, paidAmount, toPayAmount });

    // ✅ Prepare bill record data
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

    console.log('💾 Saving bill record to database...', billRecord);

    // Save bill record to database
    const { data: billData, error: dbError } = await supabase
      .from('monthly_bill')
      .insert([billRecord])
      .select();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      console.error('❌ Full error details:', JSON.stringify(dbError, null, 2));
      
      // Enhanced error messages for common database issues
      if (dbError.code === '23505' || dbError.message?.includes('duplicate')) {
        throw new Error(`⚠️ Duplicate entry: This bill may already exist. Please check and try again.`);
      } else if (dbError.code === '23503' || dbError.message?.includes('foreign key')) {
        throw new Error(`⚠️ Invalid reference: Referenced data is invalid. Please contact admin.`);
      } else if (dbError.code === '23502' || dbError.message?.includes('null value')) {
        throw new Error(`⚠️ Missing required data: ${dbError.message}`);
      } else if (dbError.code === '23514' || dbError.message?.includes('check constraint')) {
        throw new Error(`⚠️ Invalid data: Bill type or template value is invalid. Please check your selections.`);
      } else if (dbError.message?.includes('column') && dbError.message?.includes('does not exist')) {
        throw new Error(`⚠️ Database schema mismatch: ${dbError.message}. Please refresh the page.`);
      } else {
        throw new Error(`❌ Database error: ${dbError.message}`);
      }
    }

    console.log('✅ Bill saved successfully to database:', billData);

    console.log('✅✅✅ Bill save process completed successfully!');

    return {
      success: true,
      pdfUrl: pdfResult.url,
      publicUrl: publicUrl,
      billData: billData[0],
      message: '✅ Bill saved successfully!'
    };

  } catch (error) {
    console.error('❌ Error in saveBillToSupabase:', error);
    return {
      success: false,
      error: error.message || '❌ Failed to save bill',
      pdfUrl: null
    };
  } finally {
    if (setIsSaving) setIsSaving(false);
  }
};
