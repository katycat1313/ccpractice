import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
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

    const { yourName, yourBusiness, product, niche, painPoint, cta } = await req.json();
    if (!painPoint || !cta) {
      return new Response(JSON.stringify({
        error: 'Missing required form data (painPoint, cta).'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'GEMINI_API_KEY is not set.'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Enhanced prompt using synthetic dataset patterns
    const prompt = `You are an expert cold calling script generator. Create a realistic cold calling script based on these examples from successful sales calls.

BUSINESS DETAILS:
- Your Name: ${yourName || 'Sales Rep'}
- Your Business: ${yourBusiness || 'Your Company'}
- Product/Service: ${product || 'your solution'}
- Target Niche: ${niche || 'business professionals'}
- Pain Point You Solve: ${painPoint}
- Call Objective/CTA: ${cta}

EXAMPLE PATTERNS FROM REAL COLD CALLS:

Example 1:
You: Hi this is Alex with Brightlane. How are you today?
Prospect: I have a minute, go ahead.
You: The reason I'm calling is we help companies in enterprise IT using an employee onboarding system to reduce high churn.
Prospect: We don't have budget / not a priority right now.
You: I understand — many of our customers felt the same until they tried Brightlane. What if I showed you a short example?
Prospect: That sounds interesting — can you share more?
You: Can I ask: how are you currently handling high churn?
You: Would you be open to book a 15-minute demo?

Example 2:
You: Hi this is Sam with SparkBridge. How are you today?
Prospect: Who is this again?
You: The reason I'm calling is we help companies in mobile app studios using a collaboration tool to reduce high churn.
Prospect: What does that look like for a team like ours?
You: I understand — many of our customers felt the same until they tried SparkBridge. What if I showed you a short example?
Prospect: That sounds interesting — can you share more?
You: Would you be open to ${cta}?

Example 3:
You: Hi this is Morgan with BluePeak. How are you today?
Prospect: I have a minute, go ahead.
You: The reason I'm calling is we help companies in healthcare clinics using an analytics platform to reduce manual reconciliation.
Prospect: What does that look like for a team like ours?
You: Can I ask: how are you currently handling manual reconciliation?
You: Would you be open to book a 15-minute demo?

CREATE YOUR SCRIPT following these patterns:

1. Start with opening: "Hi this is ${yourName || '[name]'} with ${yourBusiness || '[company]'}. How are you today?"

2. Prospect responds (use variations):
   - "I have a minute, go ahead."
   - "Who is this again?"

3. Your value prop: "The reason I'm calling is we help companies in ${niche} using ${product || 'a [solution]'} to reduce ${painPoint}."

4. Prospect engagement (realistic mix):
   - "That sounds interesting — can you share more?"
   - "What does that look like for a team like ours?"
   - "We don't have budget / not a priority right now."

5. Handle objections: "I understand — many of our customers felt the same until they tried ${yourBusiness}. What if I showed you a short example?"

6. Discovery question: "Can I ask: how are you currently handling ${painPoint}?"

7. Call to action: "Would you be open to ${cta}?"

OUTPUT FORMAT:
- Plain text only (no markdown, no code blocks)
- Each line: "Speaker: message"
- Alternate "You:" and "Prospect:"
- 8-12 lines total
- Natural, realistic conversation flow
- Include objection handling
- End with clear CTA

Generate the script now:`;

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096
        }
      })
    });

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error('Gemini error:', error);
      return new Response(JSON.stringify({
        error: `Gemini API error: ${geminiResponse.status}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const data = await geminiResponse.json();
    console.log('Gemini response structure:', JSON.stringify(data).substring(0, 500));

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Invalid response structure:', data);
      return new Response(JSON.stringify({
        error: 'Invalid response from Gemini',
        details: data,
        finishReason: data.candidates?.[0]?.finishReason
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const text = data.candidates[0].content.parts[0].text;

    // Parse the plain text response into nodes and edges
    const lines = text.split('\n').filter((line)=>line.trim().length > 0 && (line.includes('You:') || line.includes('Prospect:')));
    
    const nodes = lines.map((line, i)=>{
      const [speaker, ...messageParts] = line.split(':');
      const message = messageParts.join(':').trim();
      
      return {
        id: String(i + 1),
        type: 'script',
        position: {
          x: 400,
          y: i * 150
        },
        data: {
          speaker: speaker.trim(),
          text: message
        }
      };
    });

    const edges = [];
    for(let i = 0; i < nodes.length - 1; i++){
      edges.push({
        id: `e${i + 1}-${i + 2}`,
        source: String(i + 1),
        target: String(i + 2),
        sourceHandle: null
      });
    }

    return new Response(JSON.stringify({
      nodes,
      edges
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
