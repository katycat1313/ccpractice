import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const apiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'DEEPGRAM_API_KEY is not set.' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const audioBlob = await req.blob();
    
    // Console logging for debugging
    console.log(`[STT] Processing audio blob: ${audioBlob.size} bytes`);

    // Call Deepgram with streaming-enabled endpoint
    const deepgramResponse = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&filler_words=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBlob,
      }
    );

    if (!deepgramResponse.ok) {
      const errorBody = await deepgramResponse.text();
      console.error(`[STT] Deepgram error: ${deepgramResponse.status}`, errorBody);
      return new Response(
        JSON.stringify({ error: `Deepgram API failed with status ${deepgramResponse.status}` }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const transcriptionData = await deepgramResponse.json();
    
    // Extract transcript from Deepgram response
    if (!transcriptionData.results?.channels?.[0]?.alternatives?.[0]) {
      console.error('[STT] Invalid Deepgram response structure:', transcriptionData);
      return new Response(
        JSON.stringify({ error: 'Invalid response structure from Deepgram' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const transcript = transcriptionData.results.channels[0].alternatives[0].transcript;
    const confidence = transcriptionData.results.channels[0].alternatives[0].confidence;

    console.log(`[STT] Transcript: "${transcript.substring(0, 100)}..." (confidence: ${confidence})`);

    return new Response(
      JSON.stringify({ 
        transcript,
        confidence,
        words: transcriptionData.results.channels[0].alternatives[0].words?.length || 0,
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[STT] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});