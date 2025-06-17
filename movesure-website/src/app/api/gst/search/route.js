import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with EWB-specific configuration
const supabase = createClient(
  'https://qyrmfspbzarfjfvtcfce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5cm1mc3BiemFyZmpmdnRjZmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTQ3MjUsImV4cCI6MjA2NTI5MDcyNX0.djmtp0bkZEL2QZWq70q1oqYPpvkx4Lloix5ntW59vsQ'
);

export async function POST(request) {
  try {
    const { gstin } = await request.json();

    // Validate GSTIN format
    if (!gstin || gstin.length !== 15) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid 15-digit GSTIN'
      }, { status: 400 });
    }

    console.log('Searching for active auth tokens...');

    // Get active auth token from database - try multiple approaches
    let tokenData = null;
    let authToken = null;

    // Method 1: Try to get any active auth token
    const { data: tokens, error: tokenError } = await supabase
      .from('auth_tokens')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    console.log('Token query result:', { tokens, tokenError });

    if (tokenError) {
      console.error('Database error:', tokenError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${tokenError.message}`
      }, { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      // Method 2: Try without is_active filter
      const { data: allTokens, error: allTokensError } = await supabase
        .from('auth_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('All tokens query result:', { allTokens, allTokensError });

      if (allTokensError) {
        return NextResponse.json({
          success: false,
          error: `Database error: ${allTokensError.message}`
        }, { status: 500 });
      }

      if (!allTokens || allTokens.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No authentication tokens found in database. Please add tokens in settings first.'
        }, { status: 400 });
      }

      // Use the most recent token
      tokenData = allTokens[0];
    } else {
      tokenData = tokens[0];
    }

    // Extract auth token - try different possible field names
    authToken = tokenData.auth_token || tokenData.token || tokenData.access_token || tokenData.bearer_token;

    if (!authToken) {
      console.error('Token fields available:', Object.keys(tokenData));
      return NextResponse.json({
        success: false,
        error: 'Authentication token field not found. Available fields: ' + Object.keys(tokenData).join(', ')
      }, { status: 400 });
    }

    console.log('Using auth token:', authToken.substring(0, 20) + '...');

    // Make API call to GST service
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: authToken,
        'x-api-key': 'key_live_ntAPuJY6MmlucPdCo2cwL7eIXZIAXO0j',
        'x-accept-cache': 'true',
        'x-api-version': '1',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ gstin: gstin.toUpperCase() })
    };

    console.log('Making GST API call for GSTIN:', gstin.toUpperCase());

    const response = await fetch('https://api.sandbox.co.in/gst/compliance/public/gstin/search', options);
    
    console.log('GST API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GST API error response:', errorText);
      throw new Error(`GST API error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('GST API result:', result);

    if (result.code === 200 && result.data?.status_cd === "1") {
      return NextResponse.json({
        success: true,
        data: result.data.data,
        transaction_id: result.transaction_id
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message || `API returned code: ${result.code}. ${result.data?.message || 'GSTIN not found or invalid'}`
      }, { status: 400 });
    }

  } catch (error) {
    console.error('GST Search API Error:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`
    }, { status: 500 });
  }
}
