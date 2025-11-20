import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { yourName, yourBusiness, niche, painPoint, cta } = await req.json();
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
    // Ask for plain text, not JSON
    const prompt = `Create a 5-step sales script with alternating speakers.

Name: ${yourName || 'Alex'}
Business: ${yourBusiness || 'our company'}
Niche: ${niche || 'companies'}
Pain Point: ${painPoint}
CTA: ${cta}

IMPORTANT: Do NOT use markdown formatting. Do NOT use code blocks. Do NOT wrap output in triple backticks. Return ONLY plain text.

Format as exactly 5 lines. Each line: SPEAKER: Message
Start with "You:" and alternate.

Output ONLY these 5 lines with no other text:
You: [message]
Prospect: [message]
You: [message]
Prospect: [message]
You: [message]`;
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
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
          temperature: 0.7,
          maxOutputTokens: 1024
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
    if (!data.candidates || !data.candidates[0]) {
      console.error('Invalid response structure:', data);
      return new Response(JSON.stringify({
        error: 'Invalid response from Gemini',
        details: data
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
    const lines = text.split('\n').filter((line)=>line.trim().length > 0).slice(0, 5);
    const nodes = lines.map((line, i)=>{
      const [speaker, ...messageParts] = line.split(':');
      const message = messageParts.join(':').trim();
      return {
        id: String(i + 1),
        type: 'script',
        position: {
          x: 0,
          y: i * 100
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
