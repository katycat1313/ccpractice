import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * ANALYZE USER SPEECH EDGE FUNCTION
 *
 * This function analyzes practice session transcripts to learn the user's
 * unique communication style and update their persona profile.
 *
 * Input: { transcript, sessionId }
 * Output: { analysis, personaUpdated, insights }
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { transcript, sessionId, conversationHistory } = await req.json();

    if (!transcript || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Analyze Speech] User: ${user.id}, Transcript length: ${transcript.length}`);

    // ============================================
    // STEP 1: Basic Linguistic Analysis
    // ============================================
    const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = words.length;
    const uniqueWords = new Set(words).size;
    const avgSentenceLength = wordCount / (sentences.length || 1);

    // Count filler words
    const fillerWordsList = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually', 'literally'];
    const fillerWordsCount: Record<string, number> = {};
    let totalFillerWords = 0;

    fillerWordsList.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = transcript.match(regex);
      if (matches) {
        fillerWordsCount[filler] = matches.length;
        totalFillerWords += matches.length;
      }
    });

    // Count questions
    const questions = sentences.filter(s => s.trim().endsWith('?'));
    const questionRatio = questions.length / (sentences.length || 1);

    // Extract bigrams and trigrams
    const bigrams: string[] = [];
    const trigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
      if (i < words.length - 2) {
        trigrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }

    // ============================================
    // STEP 2: AI-Powered Pattern Extraction (Gemini)
    // ============================================
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const analysisPrompt = `You are an expert sales communication analyst. Analyze this sales call transcript and extract the speaker's unique communication patterns.

Transcript: "${transcript}"

Analyze the speaker's style and return a JSON object with these exact fields:

{
  "vocabulary_level": "conversational" | "professional" | "technical",
  "persuasion_style": "consultative" | "direct" | "storytelling" | "analytical",
  "energy_level": "high" | "moderate" | "calm",
  "formality_level": "casual" | "professional" | "formal",
  "signature_phrases": ["phrase1", "phrase2", ...],
  "power_words": ["word1", "word2", ...],
  "strongest_skills": ["rapport_building", "active_listening", "value_articulation", "objection_handling", "closing"],
  "areas_for_growth": ["urgency_creation", "storytelling", "question_technique"],
  "insights": "2-3 sentences describing what makes this person's communication style unique and effective",
  "overall_impression": "Brief summary of their sales approach"
}

Focus on:
- What makes their style unique
- Their natural strengths
- Patterns they use frequently
- Areas they could improve
`;

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: analysisPrompt }]
          }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[Gemini Error]:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const aiAnalysis = JSON.parse(
      geminiData.candidates[0].content.parts[0].text
    );

    console.log('[AI Analysis]:', aiAnalysis);

    // ============================================
    // STEP 3: Store Speech Pattern Data
    // ============================================
    const { data: patternData, error: patternError } = await supabaseClient
      .from('user_speech_patterns')
      .insert({
        user_id: user.id,
        practice_session_id: sessionId,
        transcript: transcript,
        word_count: wordCount,
        unique_words: uniqueWords,
        filler_word_count: totalFillerWords,
        filler_words_detail: fillerWordsCount,
        sentence_structures: sentences.map(s =>
          s.trim().endsWith('?') ? 'question' : 'statement'
        ),
        question_ratio: questionRatio,
        bigrams: bigrams.slice(0, 50), // Store top 50
        trigrams: trigrams.slice(0, 50),
        detected_style: aiAnalysis.persuasion_style,
        detected_energy: aiAnalysis.energy_level,
        insights: aiAnalysis.insights,
      })
      .select()
      .single();

    if (patternError) {
      console.error('[Pattern Storage Error]:', patternError);
    }

    // ============================================
    // STEP 4: Update User Persona (Aggregate Data)
    // ============================================

    // Get current persona
    const { data: currentPersona } = await supabaseClient
      .from('user_personas')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Calculate updated values (weighted average with existing data)
    const practiceCount = (currentPersona?.total_practices || 0) + 1;
    const weight = Math.min(practiceCount, 10) / 10; // Max weight of 10 sessions

    // Merge signature phrases (keep unique, track frequency)
    const existingPhrases = currentPersona?.common_phrases || [];
    const newSignaturePhrases = aiAnalysis.signature_phrases || [];

    // Merge skills arrays
    const mergeSkills = (existing: string[], newSkills: string[]) => {
      const combined = [...(existing || []), ...newSkills];
      const counts: Record<string, number> = {};
      combined.forEach(skill => {
        counts[skill] = (counts[skill] || 0) + 1;
      });
      // Return skills mentioned more than once, sorted by frequency
      return Object.entries(counts)
        .filter(([_, count]) => count >= 1)
        .sort((a, b) => b[1] - a[1])
        .map(([skill]) => skill)
        .slice(0, 5); // Top 5
    };

    const updatedStrongestSkills = mergeSkills(
      currentPersona?.strongest_skills || [],
      aiAnalysis.strongest_skills || []
    );

    const updatedAreasForGrowth = mergeSkills(
      currentPersona?.areas_for_growth || [],
      aiAnalysis.areas_for_growth || []
    );

    // Calculate learning confidence (0-1 based on practice count)
    const learningConfidence = Math.min(practiceCount / 10, 1); // Full confidence after 10 sessions

    // Update persona
    const { data: updatedPersona, error: personaError } = await supabaseClient
      .from('user_personas')
      .upsert({
        user_id: user.id,
        vocabulary_level: aiAnalysis.vocabulary_level,
        avg_sentence_length: avgSentenceLength,
        persuasion_style: aiAnalysis.persuasion_style,
        energy_level: aiAnalysis.energy_level,
        formality_level: aiAnalysis.formality_level,
        common_phrases: [...existingPhrases, ...newSignaturePhrases.map((phrase: string) => ({
          phrase,
          frequency: 1,
          last_seen: new Date().toISOString()
        }))].slice(-20), // Keep last 20
        signature_words: [...new Set([
          ...(currentPersona?.signature_words || []),
          ...(aiAnalysis.power_words || [])
        ])].slice(0, 30),
        strongest_skills: updatedStrongestSkills,
        areas_for_growth: updatedAreasForGrowth,
        total_practices: practiceCount,
        learning_confidence: learningConfidence,
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (personaError) {
      console.error('[Persona Update Error]:', personaError);
      throw personaError;
    }

    console.log(`[Persona Updated] Practices: ${practiceCount}, Confidence: ${learningConfidence}`);

    // ============================================
    // STEP 5: Return Analysis Results
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          basicStats: {
            wordCount,
            uniqueWords,
            avgSentenceLength: avgSentenceLength.toFixed(1),
            questionRatio: (questionRatio * 100).toFixed(1) + '%',
            fillerWordCount: totalFillerWords,
          },
          aiInsights: aiAnalysis,
          persona: updatedPersona,
        },
        message: `Analysis complete! Your persona is ${(learningConfidence * 100).toFixed(0)}% trained.`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Analyze Speech Error]:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
