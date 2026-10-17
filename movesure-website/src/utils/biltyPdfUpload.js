/**
 * biltyPdfUpload.js
 * 
 * Standalone utility to generate a bilty PDF (headless, no React) and upload
 * it to Supabase Storage bucket `pdf_bilty`. Updates the `pdf_bucket` column
 * on the bilty row with the public URL.
 *
 * On UPDATE: deletes the old PDF file first, then uploads the new one.
 */

import supabase from '../app/utils/supabase';
import { getTemplate } from '../templates';
import { fetchPrintDetails, loadTemplateAssets } from '../templates/print-data';

const getCityNameByCode = (cityCode) => {
  const map = { ALG: 'ALIGARH', KP: 'KANPUR' };
  return map[cityCode?.toUpperCase()] || cityCode || '';
};

// ==========================================
// 🔑 PUBLIC API
// ==========================================

/**
 * Generate a bilty PDF as an ArrayBuffer (headless – no DOM needed beyond jsPDF).
 */
export async function generateBiltyPdfBuffer(biltyData, billBookId = null) {
  // 1) Header (permanent_details for branch + company), template (bill book series) and cities
  const [printInfo, fromCityRes, toCityRes, branchRes] = await Promise.all([
    fetchPrintDetails({
      biltyId: biltyData.id,
      branchId: biltyData.branch_id,
      billBookId: biltyData.bill_book_id || billBookId
    }),
    biltyData.from_city_id
      ? supabase.from('cities').select('*').eq('id', biltyData.from_city_id).single()
      : Promise.resolve({ data: null }),
    biltyData.to_city_id
      ? supabase.from('cities').select('*').eq('id', biltyData.to_city_id).single()
      : Promise.resolve({ data: null }),
    biltyData.branch_id
      ? supabase.from('branches').select('branch_code, branch_name, city_code').eq('id', biltyData.branch_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const fromCity = fromCityRes.data || (branchRes.data ? { city_name: getCityNameByCode(branchRes.data.city_code), city_code: branchRes.data.city_code } : null);
  const toCity = toCityRes.data;

  let transportData = null;
  if (biltyData.to_city_id) {
    const tRes = await supabase.from('transports').select('*').eq('city_id', biltyData.to_city_id).limit(1).single();
    transportData = tRes.data;
  }

  // 2) Draw with the same template the print preview uses
  const { qrDataURL, logo } = await loadTemplateAssets(printInfo.template, biltyData.gr_no);
  const pdf = getTemplate(printInfo.template)({
    bilty: biltyData,
    header: printInfo.header,
    fromCity,
    toCity,
    transport: transportData,
    qrDataURL,
    logo
  });

  // 3) Return as ArrayBuffer
  return pdf.output('arraybuffer');
}

/**
 * Upload a bilty PDF to Supabase Storage and update the `pdf_bucket` column.
 *
 * @param {Object} biltyData – The saved bilty row (needs .id, .gr_no, .branch_id, etc.)
 * @param {string|null} oldPdfBucketUrl – The previous pdf_bucket URL (if updating). Will be deleted.
 * @returns {string|null} The public URL of the uploaded PDF, or null on failure.
 */
export async function uploadBiltyPdf(biltyData, oldPdfBucketUrl = null, billBookId = null) {
  try {
    console.log('📄 [PDF Upload] Starting background PDF generation for GR:', biltyData.gr_no);

    // 1) Generate PDF buffer
    const pdfBuffer = await generateBiltyPdfBuffer(biltyData, billBookId);

    // 2) Build the storage path: branch_id/gr_no.pdf
    const filePath = `${biltyData.branch_id}/${biltyData.gr_no.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    // 3) Upload new PDF FIRST (upsert so re-saves overwrite)
    //    ⚠️ Upload before deleting old — if upload fails, user still has the old PDF
    const { error: uploadError } = await supabase.storage
      .from('pdf_bilty')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ [PDF Upload] Upload failed:', uploadError.message);
      return null;
    }

    // 4) Get public URL
    const { data: urlData } = supabase.storage.from('pdf_bilty').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      console.error('❌ [PDF Upload] Could not get public URL');
      return null;
    }

    console.log('✅ [PDF Upload] Uploaded successfully:', publicUrl);

    // 5) NOW delete old PDF (only after new one confirmed uploaded)
    if (oldPdfBucketUrl) {
      try {
        const bucketPrefix = '/storage/v1/object/public/pdf_bilty/';
        const idx = oldPdfBucketUrl.indexOf(bucketPrefix);
        if (idx !== -1) {
          const oldPath = decodeURIComponent(oldPdfBucketUrl.substring(idx + bucketPrefix.length));
          // Only delete if old path is different from new path (otherwise upsert already replaced it)
          if (oldPath !== filePath) {
            console.log('🗑️ [PDF Upload] Deleting old PDF:', oldPath);
            const { error: delError } = await supabase.storage.from('pdf_bilty').remove([oldPath]);
            if (delError) console.warn('⚠️ [PDF Upload] Failed to delete old PDF:', delError.message);
            else console.log('✅ [PDF Upload] Old PDF deleted');
          }
        }
      } catch (delErr) {
        console.warn('⚠️ [PDF Upload] Error parsing old PDF URL for deletion:', delErr.message);
      }
    }

    // 6) Update bilty record with the URL
    if (biltyData.id) {
      const { error: updateError } = await supabase
        .from('bilty')
        .update({ pdf_bucket: publicUrl })
        .eq('id', biltyData.id);

      if (updateError) {
        console.error('❌ [PDF Upload] Failed to update pdf_bucket column:', updateError.message);
      } else {
        console.log('✅ [PDF Upload] pdf_bucket column updated for bilty:', biltyData.id);
      }
    }

    return publicUrl;
  } catch (err) {
    console.error('❌ [PDF Upload] Unexpected error:', err);
    return null;
  }
}
