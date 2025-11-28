import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[Deepgram Voice Agent] CORS preflight request');
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  console.log('[Deepgram Voice Agent] Request received');
  console.log('[Deepgram Voice Agent] Method:', req.method);
  console.log('[Deepgram Voice Agent] Headers:', Object.fromEntries(req.headers.entries()));

  try {
    // Check for API key
    const apiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!apiKey) {
      console.error('[Deepgram Voice Agent] CRITICAL: DEEPGRAM_API_KEY is not set in environment');
      return new Response(JSON.stringify({ 
        error: 'DEEPGRAM_API_KEY is not configured',
        details: 'Server configuration error - API key missing'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    console.log('[Deepgram Voice Agent] API key found:', apiKey.substring(0, 8) + '...');

    // Get audio blob from request
    console.log('[Deepgram Voice Agent] Reading audio blob from request...');
    const audioBlob = await req.blob();
    console.log('[Deepgram Voice Agent] Audio blob size:', audioBlob.size, 'bytes');
    console.log('[Deepgram Voice Agent] Audio blob type:', audioBlob.type);

    if (audioBlob.size === 0) {
      console.error('[Deepgram Voice Agent] ERROR: Audio blob is empty');
      return new Response(JSON.stringify({ 
        error: 'Empty audio data',
        details: 'No audio data received from client'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Send audio to Deepgram Voice Agent API
    console.log('[Deepgram Voice Agent] Sending request to Deepgram API...');
    const deepgramUrl = 'https://api.deepgram.com/v1/agent/listen';
    console.log('[Deepgram Voice Agent] Deepgram URL:', deepgramUrl);

    const deepgramResponse = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'audio/webm',
      },
      body: audioBlob,
    });

    console.log('[Deepgram Voice Agent] Deepgram response status:', deepgramResponse.status);
    console.log('[Deepgram Voice Agent] Deepgram response headers:', Object.fromEntries(deepgramResponse.headers.entries()));

    if (!deepgramResponse.ok) {
      const errorBody = await deepgramResponse.text();
      console.error('[Deepgram Voice Agent] Deepgram API Error Response:');
      console.error('[Deepgram Voice Agent] Status:', deepgramResponse.status);
      console.error('[Deepgram Voice Agent] Status Text:', deepgramResponse.statusText);
      console.error('[Deepgram Voice Agent] Error Body:', errorBody);
      
      let errorDetails = errorBody;
      try {
        const errorJson = JSON.parse(errorBody);
        errorDetails = errorJson.error || errorJson.message || errorBody;
        console.error('[Deepgram Voice Agent] Parsed error:', errorJson);
      } catch (e) {
        console.error('[Deepgram Voice Agent] Could not parse error as JSON');
      }

      return new Response(
        JSON.stringify({ 
          error: `Deepgram API failed`,
          status: deepgramResponse.status,
          statusText: deepgramResponse.statusText,
          details: errorDetails
        }), 
        { 
          status: deepgramResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get response audio from Deepgram
    console.log('[Deepgram Voice Agent] Reading audio response from Deepgram...');
    const responseAudio = await deepgramResponse.arrayBuffer();
    console.log('[Deepgram Voice Agent] Response audio size:', responseAudio.byteLength, 'bytes');

    if (responseAudio.byteLength === 0) {
      console.warn('[Deepgram Voice Agent] WARNING: Deepgram returned empty audio response');
      return new Response(JSON.stringify({ 
        error: 'Empty response from Deepgram',
        details: 'Deepgram returned no audio data'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[Deepgram Voice Agent] SUCCESS: Returning audio response to client');
    
    // Return the audio response
    return new Response(responseAudio, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'audio/webm',
        'X-Audio-Size': responseAudio.byteLength.toString()
      },
      status: 200,
    });

  } catch (error) {
    console.error('[Deepgram Voice Agent] UNEXPECTED ERROR:');
    console.error('[Deepgram Voice Agent] Error name:', error.name);
    console.error('[Deepgram Voice Agent] Error message:', error.message);
    console.error('[Deepgram Voice Agent] Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        errorType: error.name,
        message: error.message,
        details: error.stack
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
