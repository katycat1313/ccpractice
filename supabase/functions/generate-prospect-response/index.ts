import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { conversationHistory, difficulty = 'Medium' } = await req.json();

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid conversationHistory.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const historyText = conversationHistory.map(line => `${line.speaker}: ${line.text}`).join('\n');

    let difficultyInstruction = 'You are slightly skeptical and ask clarifying questions. Do not be overly agreeable.';
    if (difficulty === 'Easy') {
      difficultyInstruction = 'You are generally agreeable, interested, and ask positive questions.';
    } else if (difficulty === 'Hard') {
      difficultyInstruction = 'You are busy, raise strong objections, and are difficult to convince. Keep your answers short and to the point.';
    }

    const prompt = `You are a sales prospect on a call. You are talking to a salesperson.
The conversation so far:
${historyText}

The salesperson just said: "${conversationHistory[conversationHistory.length - 1].text}"

Your personality: ${difficultyInstruction}

Generate ONLY your next single line of dialogue. Do NOT include your speaker name (e.g., "Prospect:").

Your response should be a single, short sentence.`;

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9, // Higher temperature for more unpredictability
          maxOutputTokens: 100,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error('Gemini error:', error);
      return new Response(JSON.stringify({ error: `Gemini API error: ${geminiResponse.status}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await geminiResponse.json();

    if (!data.candidates || !data.candidates[0]) {
      console.error('Invalid response structure from Gemini:', data);
      return new Response(JSON.stringify({ error: 'Invalid response from Gemini' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseText = data.candidates[0].content.parts[0].text.trim();

    return new Response(JSON.stringify({ responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
