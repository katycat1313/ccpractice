import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

// The main function that will be executed when the edge function is called
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 1. AUTHENTICATE USER ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 2. GET FORM DATA ---
    const { yourName, yourBusiness, niche, painPoint, cta } = await req.json();
    if (!painPoint || !cta) {
      return new Response(JSON.stringify({ error: 'Missing required form data (painPoint, cta).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- 3. CALL GEMINI API ---
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set in Supabase environment variables.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `
      You are an expert sales scriptwriter. Create a 5-step, two-sided sales script between "You" and "Prospect".
      The script should be based on these details:
      - Your Name: ${yourName || 'Alex'}
      - Your Business: ${yourBusiness || 'our company'}
      - Customer Niche: ${niche || 'companies'}
      - Customer Pain Point: ${painPoint}
      - Call to Action: ${cta}

      The JSON object must have two keys: "nodes" and "edges".
      - "nodes" should be an array of 5 objects, each with "id", "type" ('script'), "position", and "data" ({ "speaker", "text" }).
        - Alternate the "speaker" between "You" and "Prospect". Start with "You".
        - Position the nodes to form a clear, linear flow.
      - "edges" should be an array of 4 objects, each with "id", "source", "target", and "sourceHandle" (set to null).
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    console.log('Gemini response data:', JSON.stringify(geminiData, null, 2));
    
    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content || !geminiData.candidates[0].content.parts || !geminiData.candidates[0].content.parts[0]) {
      console.error('Invalid Gemini response structure:', geminiData);
      return new Response(JSON.stringify({ error: 'Failed to parse script from AI response.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // With JSON mode, the 'text' part is a JSON string that needs to be parsed.
    const scriptJson = geminiData.candidates[0].content.parts[0].text;
    const scriptData = JSON.parse(scriptJson);
    console.log('Parsed script data:', JSON.stringify(scriptData, null, 2));

    // --- 4. SAVE TO DATABASE ---
    const scriptName = `AI Script for ${painPoint}`;
    const { data: newScript, error: insertError } = await supabaseAdmin
      .from('scripts')
      .insert({
        user_id: user.id,
        name: scriptName,
        nodes: scriptData.nodes,
        edges: scriptData.edges,
        metadata: { generated: true, topic: painPoint },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      throw insertError;
    }

    // --- 5. RETURN RESULT ---
    return new Response(JSON.stringify(newScript), {
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