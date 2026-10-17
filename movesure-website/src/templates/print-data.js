// Data helpers shared by everything that prints a bilty (preview, reprint, background PDF upload).
//
// Template = the bill book (series) -> bill_books.print_template
// Header   = the bilty's branch + company -> permanent_details row

import QRCode from 'qrcode';
import supabase from '../app/utils/supabase';
import { DEFAULT_TEMPLATE, getTemplateAssetConfig } from './index';

const API_BASE = 'https://api.movesure.io/api/bilty';

/**
 * Header (permanent_details row) + template code for a bilty.
 * - Saved bilty: GET /print-details?bilty_id=   (server finds the series via bilty.bill_book_id or GR match)
 * - Not saved yet: GET /print-details?branch_id=&bill_book_id=   (book's template + book's company header)
 * Falls back to the branch default header (and the book's template) straight from Supabase if the API fails.
 *
 * @returns {Promise<{ header: object|null, template: string, isFallback: boolean, templateSource: string|null }>}
 */
export async function fetchPrintDetails({ biltyId, branchId, billBookId } = {}) {
  try {
    const params = new URLSearchParams();
    if (biltyId) {
      params.set('bilty_id', biltyId);
    } else {
      if (branchId) params.set('branch_id', branchId);
      if (billBookId) params.set('bill_book_id', billBookId);
    }
    const res = await fetch(`${API_BASE}/print-details?${params}`);
    const json = await res.json();
    if (res.ok && json.status === 'success' && json.data) {
      return {
        header: json.data,
        template: json.print_template || DEFAULT_TEMPLATE,
        isFallback: !!json.is_fallback,
        templateSource: json.template_source || null
      };
    }
    console.warn('print-details API:', json?.message);
  } catch (err) {
    console.warn('print-details API unreachable, using branch default header:', err.message);
  }

  if (!branchId) return { header: null, template: DEFAULT_TEMPLATE, isFallback: false, templateSource: null };
  const [headerRes, bookRes] = await Promise.all([
    supabase.from('permanent_details').select('*').eq('branch_id', branchId).is('company_id', null).maybeSingle(),
    billBookId
      ? supabase.from('bill_books').select('print_template').eq('id', billBookId).maybeSingle()
      : Promise.resolve({ data: null })
  ]);
  return {
    header: headerRes.data || null,
    template: bookRes.data?.print_template || DEFAULT_TEMPLATE,
    isFallback: false,
    templateSource: bookRes.data ? 'bill_book' : 'default'
  };
}

// QR linking to the public print page. `light` = background colour (template1 uses its lemon sheet colour).
export async function makeBiltyQRCode(grNo, light = '#fafad2') {
  try {
    return await QRCode.toDataURL(`https://console.movesure.io/print/${grNo}`, {
      width: 100, height: 100, margin: 1,
      color: { dark: '#000000', light }
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
}

// Load a /public image as a PNG data URL (browser only), downscaled to maxWidth and optionally greyscaled.
// Returns { dataURL, width, height } or null.
const imageCache = new Map();
export function loadImageDataURL(src, { grayscale = false, maxWidth = 500 } = {}) {
  if (typeof window === 'undefined' || !src) return Promise.resolve(null);
  const key = `${src}|${grayscale}|${maxWidth}`;
  if (!imageCache.has(key)) {
    imageCache.set(key, new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const scale = Math.min(1, maxWidth / img.naturalWidth);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          if (grayscale) {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const px = data.data;
            for (let i = 0; i < px.length; i += 4) {
              const g = Math.round(px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114);
              px[i] = px[i + 1] = px[i + 2] = g; // alpha kept, so transparency survives
            }
            ctx.putImageData(data, 0, 0);
          }
          resolve({ dataURL: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
        } catch (err) {
          console.warn('Could not process image', src, err);
          resolve(null);
        }
      };
      img.onerror = () => { console.warn('Could not load image', src); resolve(null); };
      img.src = src;
    }));
  }
  return imageCache.get(key);
}

// Everything a template needs besides the bilty data: QR (in the template's colours) and logo
export async function loadTemplateAssets(templateCode, grNo) {
  const cfg = getTemplateAssetConfig(templateCode);
  const [qrDataURL, logo] = await Promise.all([
    makeBiltyQRCode(grNo, cfg.qrLight || '#ffffff'),
    cfg.logo ? loadImageDataURL(cfg.logo, { grayscale: !!cfg.logoGrayscale }) : Promise.resolve(null)
  ]);
  return { qrDataURL, logo };
}
