import { NextResponse } from 'next/server';

// ── Validation Helpers ──

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
const DOC_NUM_REGEX = /^[A-Za-z0-9/\-]{1,16}$/;
const VEHICLE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$|^TM[A-Z0-9]{4,6}$/i;
const HSN_REGEX = /^[0-9]{4,8}$/;

const VALID_SUPPLY_TYPES = ['outward', 'inward'];
const VALID_DOC_TYPES = ['Tax Invoice', 'Bill of Supply', 'Bill of Entry', 'Delivery Challan', 'Credit Note', 'Others'];
const VALID_TRANSPORT_MODES = ['Road', 'Rail', 'Air', 'Ship', 'In Transit'];

function isValidGstin(val) {
  return typeof val === 'string' && (val === 'URP' || GSTIN_REGEX.test(val));
}

function isValidPincode(val) {
  return typeof val === 'number' && val >= 100000 && val <= 999999;
}

function validatePayload(body) {
  const errors = [];

  // ── Required top-level fields ──
  if (!body.userGstin || !GSTIN_REGEX.test(body.userGstin)) {
    errors.push(`userGstin: Must be a valid 15-character GSTIN (got '${body.userGstin || ''}')`);
  }
  if (!VALID_SUPPLY_TYPES.includes(body.supply_type)) {
    errors.push(`supply_type: Must be 'outward' or 'inward' (got '${body.supply_type || ''}')`);
  }
  if (!body.sub_supply_type) {
    errors.push('sub_supply_type: Required');
  }
  if (!VALID_DOC_TYPES.includes(body.document_type)) {
    errors.push(`document_type: Must be one of: ${VALID_DOC_TYPES.join(', ')} (got '${body.document_type || ''}')`);
  }

  // document_number
  if (!body.document_number) {
    errors.push('document_number: Required');
  } else if (body.document_number.length > 16) {
    errors.push(`document_number: Max 16 characters allowed, you provided ${body.document_number.length} characters ('${body.document_number}')`);
  } else if (!DOC_NUM_REGEX.test(body.document_number)) {
    errors.push(`document_number: Only A-Z a-z 0-9 / - allowed (got '${body.document_number}')`);
  }

  // document_date (dd/mm/yyyy)
  if (!body.document_date) {
    errors.push('document_date: Required (dd/mm/yyyy)');
  } else {
    const parts = body.document_date.split('/');
    if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
      errors.push(`document_date: Must be dd/mm/yyyy format (got '${body.document_date}')`);
    } else {
      const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (isNaN(d.getTime())) {
        errors.push(`document_date: Invalid date '${body.document_date}'`);
      } else if (d > new Date()) {
        errors.push(`document_date: Cannot be a future date`);
      }
    }
  }

  // GSTIN fields
  if (!isValidGstin(body.gstin_of_consignor)) {
    errors.push(`gstin_of_consignor: Must be valid 15-char GSTIN or 'URP' (got '${body.gstin_of_consignor || ''}')`);
  }
  if (!isValidGstin(body.gstin_of_consignee)) {
    errors.push(`gstin_of_consignee: Must be valid 15-char GSTIN or 'URP' (got '${body.gstin_of_consignee || ''}')`);
  }

  // Pincodes
  if (!isValidPincode(body.pincode_of_consignor)) {
    errors.push(`pincode_of_consignor: Must be exactly 6 digits (got '${body.pincode_of_consignor}')`);
  }
  if (!isValidPincode(body.pincode_of_consignee)) {
    errors.push(`pincode_of_consignee: Must be exactly 6 digits (got '${body.pincode_of_consignee}')`);
  }

  // States
  if (!body.state_of_consignor) errors.push('state_of_consignor: Required');
  if (!body.state_of_supply) errors.push('state_of_supply: Required');

  // Amounts
  if (typeof body.taxable_amount !== 'number' || body.taxable_amount < 0) {
    errors.push('taxable_amount: Must be a non-negative number');
  }
  if (typeof body.total_invoice_value !== 'number' || body.total_invoice_value <= 0) {
    errors.push('total_invoice_value: Must be a positive number');
  }

  // Amount sum check (Rs 2 grace)
  if (typeof body.taxable_amount === 'number' && typeof body.total_invoice_value === 'number') {
    const sum = (body.taxable_amount || 0)
      + (body.cgst_amount || 0)
      + (body.sgst_amount || 0)
      + (body.igst_amount || 0)
      + (body.cess_amount || 0)
      + (body.cess_nonadvol_value || 0)
      + (body.other_value || 0);
    if (sum > body.total_invoice_value + 2) {
      errors.push(`Amount mismatch: sum of amounts (${sum.toFixed(2)}) exceeds total_invoice_value (${body.total_invoice_value}) by more than Rs.2`);
    }
  }

  // Transport
  if (!VALID_TRANSPORT_MODES.includes(body.transportation_mode)) {
    errors.push(`transportation_mode: Must be one of: ${VALID_TRANSPORT_MODES.join(', ')} (got '${body.transportation_mode || ''}')`);
  }

  const dist = Number(body.transportation_distance);
  if (isNaN(dist) || dist < 0 || dist > 4000) {
    errors.push(`transportation_distance: Must be 0-4000 km (got '${body.transportation_distance}')`);
  }

  // Vehicle / doc requirements by mode
  if (body.transportation_mode === 'Road') {
    if (!body.vehicle_number) {
      errors.push("vehicle_number: Required when transportation_mode is 'Road'");
    } else if (!VEHICLE_REGEX.test(body.vehicle_number.replace(/\s/g, ''))) {
      errors.push(`vehicle_number: Invalid format '${body.vehicle_number}'. Use format like KA12BL4567 or TMXXXXXX for temp`);
    }
  }
  if (['Rail', 'Air', 'Ship'].includes(body.transportation_mode) && !body.transporter_document_number) {
    errors.push(`transporter_document_number: Required when transportation_mode is '${body.transportation_mode}'`);
  }

  // ── itemList ──
  if (!Array.isArray(body.itemList) || body.itemList.length === 0) {
    errors.push('itemList: At least 1 item is required');
  } else if (body.itemList.length > 250) {
    errors.push(`itemList: Maximum 250 items allowed (got ${body.itemList.length})`);
  } else {
    body.itemList.forEach((item, idx) => {
      const prefix = `itemList[${idx}]`;
      if (!item.hsn_code || !HSN_REGEX.test(item.hsn_code)) {
        errors.push(`${prefix}.hsn_code: Must be 4-8 numeric digits (got '${item.hsn_code || ''}')`);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`${prefix}.quantity: Must be > 0`);
      }
      if (!item.unit_of_product) {
        errors.push(`${prefix}.unit_of_product: Required`);
      }
      if (typeof item.taxable_amount !== 'number') {
        errors.push(`${prefix}.taxable_amount: Required and must be a number`);
      }
      // Auto-fill product_name
      if (!item.product_name && item.product_description) {
        item.product_name = item.product_description;
      }
      if (!item.product_name) {
        errors.push(`${prefix}.product_name: Required (or provide product_description)`);
      }
    });
  }

  return errors;
}

// ── Route Handler ──

export async function POST(request) {
  try {
    const body = await request.json();

    // 1) Validate
    const errors = validatePayload(body);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Validation failed',
          errors,
          error_type: 'validation',
        },
        { status: 400 }
      );
    }

    // 2) Build payload for the Python backend
    const payload = {
      user_gstin: body.userGstin,
      supply_type: body.supply_type,
      sub_supply_type: body.sub_supply_type,
      sub_supply_description: body.sub_supply_description || '',
      document_type: body.document_type,
      document_number: body.document_number,
      document_date: body.document_date,
      gstin_of_consignor: body.gstin_of_consignor,
      legal_name_of_consignor: body.legal_name_of_consignor || '',
      address1_of_consignor: body.address1_of_consignor || '',
      address2_of_consignor: body.address2_of_consignor || '',
      place_of_consignor: body.place_of_consignor || '',
      pincode_of_consignor: body.pincode_of_consignor,
      state_of_consignor: body.state_of_consignor,
      actual_from_state_name: body.actual_from_state_name || body.state_of_consignor,
      gstin_of_consignee: body.gstin_of_consignee,
      legal_name_of_consignee: body.legal_name_of_consignee || '',
      address1_of_consignee: body.address1_of_consignee || '',
      address2_of_consignee: body.address2_of_consignee || '',
      place_of_consignee: body.place_of_consignee || '',
      pincode_of_consignee: body.pincode_of_consignee,
      state_of_supply: body.state_of_supply,
      actual_to_state_name: body.actual_to_state_name || body.state_of_supply,
      transaction_type: body.transaction_type || 1,
      taxable_amount: body.taxable_amount,
      cgst_amount: body.cgst_amount || 0,
      sgst_amount: body.sgst_amount || 0,
      igst_amount: body.igst_amount || 0,
      cess_amount: body.cess_amount || 0,
      cess_nonadvol_value: body.cess_nonadvol_value || 0,
      other_value: body.other_value || 0,
      total_invoice_value: body.total_invoice_value,
      transporter_id: body.transporter_id || '',
      transporter_name: body.transporter_name || '',
      transporter_document_number: body.transporter_document_number || '',
      transporter_document_date: body.transporter_document_date || '',
      vehicle_number: body.vehicle_number ? body.vehicle_number.toUpperCase().replace(/\s/g, '') : '',
      vehicle_type: body.vehicle_type || 'Regular',
      transportation_mode: body.transportation_mode,
      transportation_distance: String(body.transportation_distance || '0'),
      generate_status: body.generate_status || 1,
      data_source: body.data_source || 'erp',
      item_list: body.itemList.map((item) => ({
        product_name: item.product_name || item.product_description || '',
        product_description: item.product_description || item.product_name || '',
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit_of_product: item.unit_of_product,
        cgst_rate: item.cgst_rate || 0,
        sgst_rate: item.sgst_rate || 0,
        igst_rate: item.igst_rate || 0,
        cess_rate: item.cess_rate || 0,
        cessNonAdvol: item.cessNonAdvol || 0,
        taxable_amount: item.taxable_amount,
      })),
    };

    console.log('Generate E-Way Bill Payload:', JSON.stringify(payload, null, 2));

    // 3) Call Python backend
    const response = await fetch('http://xok5owjast5f4mxl1hu7ztq5.46.202.162.119.sslip.io/api/generate-ewaybill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'error',
          message: data.message || 'E-Way Bill generation failed',
          nic_code: data.nic_code || '',
          data,
        },
        { status: response.status }
      );
    }

    // 4) Interpret results
    const results = data.results || data;
    const resultCode = results.code || data.code || 200;

    if (resultCode === 204 || results.status === 'No Content') {
      return NextResponse.json(
        {
          status: 'error',
          message: results.message || data.message || 'E-Way Bill generation failed',
          nic_code: results.nic_code || '',
          data,
        },
        { status: 400 }
      );
    }

    // Success – extract fields
    const msg = results.message || data.message || {};
    const ewayBillNo = msg.ewayBillNo || msg.ewbNo || data.ewayBillNo || '';
    const ewayBillDate = msg.ewayBillDate || msg.ewbDt || data.ewayBillDate || '';
    const validUpto = msg.validUpto || data.validUpto || '';
    const alert = msg.alert || data.alert || '';
    const url = msg.url || data.url || '';

    return NextResponse.json({
      status: 'success',
      message: 'E-Way Bill generated successfully',
      ewayBillNo,
      ewayBillDate,
      validUpto,
      alert,
      url,
      data,
    });
  } catch (error) {
    console.error('Generate E-Way Bill error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Internal server error',
        error: error.toString(),
      },
      { status: 500 }
    );
  }
}
