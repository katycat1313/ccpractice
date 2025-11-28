import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization').replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { transcript, script } = await req.json();
    if (!transcript || !script) {
      return new Response(JSON.stringify({ error: 'Missing transcript or script.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `
      You are a sales coach analyzing a practice session.
      Original Script: ${script}
      User's Transcript: ${transcript}

      Provide feedback in a JSON object with two keys: "strengths" and "improvements".
      - "strengths" should be an array of strings highlighting what the user did well.
      - "improvements" should be an array of strings suggesting areas for improvement.
      Focus on accuracy, pacing, and filler words.
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          response_mime_type: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error:', errorBody);
      return new Response(JSON.stringify({ error: `Gemini API failed with status ${geminiResponse.status}.` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiData = await geminiResponse.json();
    const feedbackJson = geminiData.candidates[0].content.parts[0].text;
    const feedback = JSON.parse(feedbackJson);

    return new Response(JSON.stringify(feedback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unexpected Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
