import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const {
      userGstin,
      ewayBillNumber,
      vehicleNumber,
      vehicleType,
      placeOfConsignor,
      stateOfConsignor,
      reasonCodeForVehicleUpdation,
      modeOfTransport,
      transporterDocumentNumber,
      transporterDocumentDate,
      reasonForVehicleUpdation,
      dataSource
    } = body;

    // Prepare payload for the API (matching the Python service expected format)
    const payload = {
      user_gstin: userGstin,
      eway_bill_number: String(ewayBillNumber),
      vehicle_number: vehicleNumber?.toUpperCase(),
      vehicle_type: vehicleType,
      place_of_consignor: placeOfConsignor,
      state_of_consignor: stateOfConsignor,
      reason_code_for_vehicle_updation: reasonCodeForVehicleUpdation,
      reason_for_vehicle_updation: reasonForVehicleUpdation || "",
      mode_of_transport: parseInt(modeOfTransport),
      data_source: dataSource || ""
    };

    // Add optional fields
    if (transporterDocumentNumber) {
      payload.transporter_document_number = transporterDocumentNumber;
    }
    if (transporterDocumentDate) {
      // Convert date format from YYYY-MM-DD to DD/MM/YYYY
      const dateObj = new Date(transporterDocumentDate);
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        payload.transporter_document_date = `${day}/${month}/${year}`;
      } else {
        payload.transporter_document_date = transporterDocumentDate;
      }
    }

    console.log('Vehicle Update Payload:', payload);

    // Call the localhost API (Python service)
    const response = await fetch('http://localhost:5000/api/vehicle-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: data.message || 'Vehicle update failed',
          details: data
        },
        { status: response.status }
      );
    }

    // Check for API-level errors
    const results = data.results || {};
    const resultCode = results.code || 200;
    
    if (resultCode === 204 || results.status === "No Content") {
      return NextResponse.json(
        {
          status: 'error',
          message: results.message || 'Vehicle update failed',
          nicCode: results.nic_code,
          results
        },
        { status: 400 }
      );
    }

    // Success response
    const messageField = results.message || {};
    
    return NextResponse.json({
      status: 'success',
      message: 'Vehicle details updated successfully',
      vehUpdateDate: messageField.vehUpdDate,
      validUpto: messageField.validUpto,
      pdfUrl: messageField.url,
      results
    });

  } catch (error) {
    console.error('Vehicle update error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message || 'Internal server error',
        error: error.toString()
      },
      { status: 500 }
    );
  }
}
