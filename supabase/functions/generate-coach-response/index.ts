import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'npm:@google/generative-ai';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userQuery, script, transcript, feedback, history } = await req.json()

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a "Conversational Coach" for a sales representative. Your goal is to help the user improve their sales script delivery.

    You are given the following context:
    1. The original script they were supposed to follow.
    2. The user's transcript from their practice session.
    3. The initial automated feedback they received (strengths and areas for improvement).
    4. The recent conversation history between you and the user.

    The user has just asked the following question: "${userQuery}"

    Based on all this context, provide a specific, actionable, and encouraging response to the user's question. Keep your response concise and focused on helping them improve. Do not be overly verbose.

    ---
    Original Script:
    ${script}
    ---
    User's Transcript:
    ${transcript}
    ---
    Initial Feedback:
    Strengths: ${feedback.strengths.join(', ')}
    Improvements: ${feedback.improvements.join(', ')}
    ---
    Conversation History:
    ${history.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}
    ---
    User's Query: ${userQuery}
    `;

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const result = await model.generateContent(prompt, { safetySettings });
    const response = result.response;
    const text = response.text();

    return new Response(JSON.stringify({ response: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error in generate-coach-response:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
