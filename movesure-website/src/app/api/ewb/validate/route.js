import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { ewbNumber, authToken } = await request.json();

    if (!ewbNumber || !authToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: ewbNumber and authToken' },
        { status: 400 }
      );
    }

    console.log('🔍 Server: Validating EWB:', ewbNumber);
    console.log('🔑 Server: Token length:', authToken.length);
    console.log('🔑 Server: Token preview:', authToken.substring(0, 20) + '...');

    // Make the API call from the server side (no CORS issues)
    const apiUrl = `https://api.sandbox.co.in/gst/compliance/e-way-bill/tax-payer/bill/${ewbNumber}`;
    
    const headers = {
      'accept': 'application/json',
      'authorization': authToken, // Use token directly without prefix
      'x-api-key': 'key_live_ntAPuJY6MmlucPdCo2cwL7eIXZIAXO0j',
      'x-api-version': '1'
    };

    console.log('🌐 Server: Making request to:', apiUrl);
    console.log('📤 Server: Headers:', {
      ...headers,
      authorization: '[HIDDEN]',
      'x-api-key': '[HIDDEN]'
    });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers
    });

    console.log('📥 Server: Response status:', response.status);    const data = await response.json();
    console.log('📊 Server: Response data:', data);

    if (!response.ok) {
      console.error('❌ Server: API error:', data);
      
      // Provide more specific error messages
      let errorMessage = data.message || `API Error: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please check your token and try again.';
      } else if (response.status === 404) {
        errorMessage = 'E-way bill not found. Please verify the EWB number.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request. Please check the EWB number format.';
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
          details: data,
          status: response.status
        },
        { status: response.status }
      );
    }

    // Check for error codes in successful responses (200 status but with error data)
    const responseData = data.data || data;
    if (responseData?.error?.errorCodes) {
      console.error('❌ Server: API returned error code:', responseData.error.errorCodes);
      const errorCode = responseData.error.errorCodes;
      let errorMessage = 'Invalid E-way bill number';
      
      // Handle specific error codes
      switch (errorCode) {
        case '325':
          errorMessage = 'E-way bill number not found. Please verify the number is correct.';
          break;
        case '102':
          errorMessage = 'E-way bill number is invalid or expired.';
          break;
        case '101':
          errorMessage = 'E-way bill number format is incorrect.';
          break;
        default:
          errorMessage = `E-way bill validation failed (Error: ${errorCode})`;
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCode: errorCode,
          details: data
        },
        { status: 400 }
      );
    }

    // Check if status is '0' which indicates failure
    if (responseData?.status === '0') {
      console.error('❌ Server: Validation failed with status 0');
      return NextResponse.json(
        {
          success: false,
          error: 'E-way bill number not found or is invalid.',
          details: data
        },
        { status: 400 }
      );
    }

    // Return the successful response
    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('🚨 Server: EWB validation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request) {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
