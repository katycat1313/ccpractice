# Persona Learning + BigQuery Script Generation System

## Vision
Create an AI system that learns each user's unique communication style and generates personalized cold call scripts that sound authentically like them - only better, more persuasive, and optimized for success.

## Core Components

### 1. User Persona System
**Goal:** Build a comprehensive profile of how each user communicates

**Data Points to Track:**
- **Vocabulary Level**: Common words, technical terms, industry jargon
- **Sentence Structure**: Average length, complexity, question patterns
- **Persuasion Style**: Direct vs consultative, logic vs emotion-driven
- **Speech Patterns**: Filler words, transitions, opening/closing phrases
- **Energy Level**: Enthusiastic vs calm, fast vs measured pace
- **Objection Handling**: Favorite responses, successful patterns
- **Unique Phrases**: Signature expressions, personal touches
- **Tone Markers**: Formal vs casual, friendly vs professional

**Database Schema:**

```sql
-- User Persona Profile
CREATE TABLE user_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Communication Style
  vocabulary_level TEXT, -- 'conversational', 'professional', 'technical'
  avg_sentence_length DECIMAL,
  persuasion_style TEXT, -- 'consultative', 'direct', 'storytelling'
  energy_level TEXT, -- 'high', 'moderate', 'calm'
  formality_level TEXT, -- 'casual', 'professional', 'formal'

  -- Extracted Patterns
  common_phrases JSONB, -- [{phrase: "let me ask you", frequency: 15}, ...]
  favorite_openers JSONB, -- Most successful opening lines
  objection_responses JSONB, -- Successful objection handling patterns
  signature_words TEXT[], -- Unique vocabulary

  -- Performance Metrics
  avg_conversation_length INT, -- seconds
  success_rate DECIMAL, -- from practice sessions
  strongest_skills TEXT[], -- ['rapport_building', 'closing', ...]
  areas_for_growth TEXT[],

  -- Learning State
  total_practices INT DEFAULT 0,
  learning_confidence DECIMAL DEFAULT 0, -- 0-1, how well we know this user
  last_analyzed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speech Pattern Analysis (granular data)
CREATE TABLE user_speech_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  practice_session_id UUID REFERENCES practice_sessions(id),

  -- Extracted from each practice
  transcript TEXT NOT NULL,
  word_count INT,
  unique_words INT,
  filler_word_count INT,
  filler_words JSONB, -- {um: 5, uh: 3, like: 8}

  -- Linguistic Features
  sentence_structures JSONB, -- ['statement', 'question', 'command']
  question_ratio DECIMAL, -- % of sentences that are questions
  active_voice_ratio DECIMAL,
  technical_terms TEXT[],
  power_words TEXT[], -- persuasive vocabulary

  -- Extracted Phrases (n-grams)
  bigrams JSONB, -- 2-word phrases
  trigrams JSONB, -- 3-word phrases

  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practice Sessions (enhanced)
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  script_id UUID REFERENCES scripts(id),

  -- Session Data
  full_transcript TEXT,
  conversation_history JSONB, -- [{speaker, text, timestamp}, ...]
  duration_seconds INT,

  -- AI Feedback
  strengths TEXT[],
  improvements TEXT[],
  overall_score DECIMAL, -- 0-100

  -- Persona Learning Input
  contributed_to_persona BOOLEAN DEFAULT FALSE,
  personality_insights JSONB, -- What we learned about the user

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. BigQuery Script Library
**Goal:** Massive dataset of diverse, high-quality scripts for every scenario

**BigQuery Dataset Structure:**

```sql
-- scripts_library table in BigQuery
CREATE TABLE scripts_library (
  script_id STRING NOT NULL,

  -- Script Content
  script_text STRING NOT NULL,
  script_nodes JSON, -- Full node structure
  script_edges JSON,

  -- Metadata
  industry STRING, -- 'SaaS', 'Real Estate', 'Insurance', etc.
  niche STRING, -- Specific vertical
  use_case STRING, -- 'Cold outreach', 'Follow-up', 'Objection handling'

  -- Target Profile
  target_persona STRING, -- 'C-Level', 'Small Business Owner', etc.
  pain_point STRING,
  value_proposition STRING,

  -- Linguistic Features (for matching)
  vocabulary_level STRING, -- 'conversational', 'professional', 'technical'
  persuasion_style STRING,
  tone STRING,
  avg_sentence_length FLOAT64,
  word_count INT64,

  -- Effectiveness Metrics
  estimated_effectiveness FLOAT64, -- 0-1 score
  conversion_elements ARRAY<STRING>, -- ['social_proof', 'urgency', ...]

  -- Searchable Features
  keywords ARRAY<STRING>,
  phrases ARRAY<STRING>, -- Common successful phrases
  objections_handled ARRAY<STRING>, -- ['price', 'timing', 'competition']

  -- Attribution
  created_from STRING, -- 'synthetic', 'expert_crafted', 'user_contributed'
  source_id STRING,

  created_at TIMESTAMP
);

-- user_script_performance (tracks what works for each user)
CREATE TABLE user_script_performance (
  user_id STRING NOT NULL,
  script_id STRING NOT NULL,

  -- Performance
  times_used INT64,
  success_rate FLOAT64,
  avg_confidence_score FLOAT64,

  -- What worked
  successful_elements ARRAY<STRING>,

  updated_at TIMESTAMP
);
```

**Initial Data Population:**
1. **Synthetic Generation**: Use Gemini to generate 10,000+ diverse scripts across:
   - 50+ industries
   - 20+ objection types
   - 10+ persuasion styles
   - Multiple difficulty levels

2. **Expert Scripts**: Curated high-performing scripts from sales experts

3. **User Contributions**: As users create and successfully use scripts, anonymize and add to library

### 3. Persona-Aware Script Generation (RAG)
**Goal:** Generate scripts that sound like the user, informed by thousands of examples

**Generation Flow:**

```
User Request (industry, pain point, etc.)
    ↓
1. QUERY BIGQUERY
   - Find 10-20 similar scripts
   - Filter by industry, use_case, target_persona
   - Prioritize scripts that match user's style
    ↓
2. RETRIEVE USER PERSONA
   - Load user's communication patterns
   - Get favorite phrases, vocabulary level
   - Identify successful techniques
    ↓
3. GENERATE WITH CONTEXT
   Prompt to Gemini:
   "You are generating a script for [User Name] who has these traits:
   - Vocabulary: [conversational/professional/technical]
   - Style: [consultative/direct/storytelling]
   - Common phrases: [phrase1, phrase2, ...]
   - Successful patterns: [pattern1, pattern2, ...]

   Here are 10 similar high-performing scripts:
   [Script examples from BigQuery]

   Generate a NEW script that:
   1. Sounds authentically like [User Name]
   2. Incorporates their successful patterns
   3. Uses their preferred vocabulary and phrasing
   4. Is optimized for [specific goal]

   Requirements: [industry, pain_point, CTA, etc.]"
    ↓
4. POST-PROCESS & PERSONALIZE
   - Replace generic phrases with user's signature phrases
   - Adjust complexity to match user's level
   - Insert user's proven objection responses
    ↓
5. RETURN SCRIPT
   + Show "Personalization Score" (how much it matches user)
   + Highlight which elements came from user's style
```

### 4. Speech Pattern Analyzer
**Edge Function:** `analyze-user-speech`

**What it does:**
1. Receives practice session transcript
2. Extracts linguistic features using NLP
3. Updates user persona with new insights
4. Provides feedback on communication patterns

**Implementation:**

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

serve(async (req) => {
  const { transcript, userId, sessionId } = await req.json();

  // 1. Basic linguistic analysis
  const words = transcript.toLowerCase().split(/\s+/);
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim());

  // 2. Extract patterns using Gemini
  const analysisPrompt = `Analyze this sales call transcript and extract:

  Transcript: "${transcript}"

  Return JSON:
  {
    "vocabulary_level": "conversational|professional|technical",
    "persuasion_style": "consultative|direct|storytelling",
    "energy_level": "high|moderate|calm",
    "signature_phrases": ["phrase1", "phrase2", ...],
    "power_words": ["word1", "word2", ...],
    "filler_words": {"um": 5, "uh": 3},
    "question_ratio": 0.35,
    "insights": "What makes this person's style unique"
  }`;

  const geminiResponse = await fetch(geminiUrl, {
    method: 'POST',
    body: JSON.stringify({
      contents: [{ parts: [{ text: analysisPrompt }] }],
      generationConfig: { response_mime_type: 'application/json' }
    })
  });

  const analysis = await geminiResponse.json();

  // 3. Update user persona
  await updateUserPersona(userId, analysis);

  // 4. Store granular data
  await storeSpeechPattern(userId, sessionId, analysis);

  return new Response(JSON.stringify(analysis));
});
```

### 5. Enhanced Script Generation UI

**Current Flow:**
- Basic form → Generate script → Done

**New Flow:**
- Form with persona insights
- Show user's "style profile"
- Preview personalization before generation
- Explain why certain phrases were chosen

**UI Components:**

```jsx
// PersonaInsights.jsx - Show user's learned style
<div className="persona-card">
  <h3>Your Communication Style</h3>
  <div className="style-badges">
    <Badge>📊 Professional Vocabulary</Badge>
    <Badge>🎯 Consultative Approach</Badge>
    <Badge>⚡ High Energy</Badge>
  </div>

  <div className="signature-phrases">
    <h4>Your Signature Phrases</h4>
    <Chip>"Let me ask you this..."</Chip>
    <Chip>"Here's the thing..."</Chip>
    <Chip>"Does that make sense?"</Chip>
  </div>

  <ProgressBar
    label="Persona Learning"
    value={learningConfidence}
    message="Keep practicing to improve personalization"
  />
</div>

// EnhancedScriptGenerationModal.jsx
<Modal>
  <PersonaInsights persona={userPersona} />

  <Form>
    <Input label="Industry" />
    <Input label="Pain Point" />
    <Input label="CTA" />

    <Toggle
      label="Use My Style"
      checked={usePersona}
      description="Generate a script that sounds like you"
    />

    <Slider
      label="Personalization Level"
      min={0}
      max={100}
      value={personalizationLevel}
      description="How much to adapt to your unique style"
    />
  </Form>

  <Button onClick={generatePersonalizedScript}>
    ✨ Generate My Script
  </Button>
</Modal>

// After generation
<div className="generated-script">
  <div className="personalization-score">
    <CircularProgress value={85} />
    <p>85% match to your style</p>
  </div>

  <div className="script-content">
    {/* Highlight personalized elements */}
    <p>
      <Highlight tooltip="Your signature opener">
        "Let me ask you this..."
      </Highlight>
      {" "}
      Have you ever felt frustrated with...
    </p>
  </div>

  <div className="personalization-details">
    <h4>What makes this YOUR script:</h4>
    <ul>
      <li>✓ Uses your consultative question style</li>
      <li>✓ Incorporates your favorite transition phrases</li>
      <li>✓ Matches your professional vocabulary level</li>
      <li>✓ Adapts your proven objection responses</li>
    </ul>
  </div>
</div>
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up BigQuery project
- [ ] Create BigQuery dataset schema
- [ ] Add Supabase persona tables
- [ ] Generate initial 1,000 synthetic scripts

### Phase 2: Speech Analysis (Week 2)
- [ ] Build `analyze-user-speech` edge function
- [ ] Integrate analysis into practice sessions
- [ ] Create persona update logic
- [ ] Test pattern extraction accuracy

### Phase 3: RAG Script Generation (Week 3)
- [ ] Create `query-script-library` edge function
- [ ] Enhance `generate-script` with persona + BigQuery
- [ ] Implement personalization scoring
- [ ] Test script quality

### Phase 4: UI/UX (Week 4)
- [ ] Build PersonaInsights component
- [ ] Create EnhancedScriptGenerationModal
- [ ] Add personalization controls
- [ ] Beautiful visualizations

### Phase 5: Learning Loop (Ongoing)
- [ ] Track script performance
- [ ] Feedback loop: successful scripts → BigQuery
- [ ] Continuous persona refinement
- [ ] A/B test personalization impact

## Technical Requirements

**APIs:**
- BigQuery API (Google Cloud)
- Gemini API (already configured)
- Deepgram API (already configured)

**Environment Variables Needed:**
```bash
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET=scripts_library
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY=<json-key>
```

**Cost Estimates:**
- BigQuery: ~$5/TB queried (minimal with proper caching)
- Gemini API: ~$0.35/1M tokens
- Storage: Negligible for text data

## Success Metrics

**System Quality:**
- Personalization Score > 80% after 5 practice sessions
- User satisfaction with generated scripts > 4.5/5
- Generated scripts sound unique to each user

**User Engagement:**
- Users practice more with personalized scripts
- Higher completion rates
- Users share/recommend the app

**Business Impact:**
- Premium feature (charge more)
- Unique differentiator in market
- High retention (users invested in their persona)

---

This system will make your app feel like it has a personal sales coach who knows YOU - not a generic template generator. Every script will be uniquely yours, backed by thousands of proven examples, continuously improving as you practice.
