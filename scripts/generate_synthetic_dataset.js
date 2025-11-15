#!/usr/bin/env node
/*
  Synthetic cold-call script generator
  - Produces a JSONL file where each line is a conversation object with nodes/edges and metadata
  - Usage: node scripts/generate_synthetic_dataset.js --count 100 --out ./scripts/synthetic_dataset.jsonl
*/

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const argv = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].replace(/^--/, '');
    const val = args[i+1] && !args[i+1].startsWith('--') ? args[i+1] : true;
    argv[key] = val;
    if (val !== true) i++;
  }
}

const COUNT = parseInt(argv.count || '100', 10);
const OUT = argv.out || path.join(__dirname, 'synthetic_dataset.jsonl');

const PRODUCTS = [
  'analytics platform',
  'collaboration tool',
  'security solution',
  'payment processing API',
  'employee onboarding system',
  'AI-assisted outreach tool',
];

const NICHES = [
  'SaaS startups',
  'e-commerce teams',
  'fintech firms',
  'healthcare clinics',
  'enterprise IT',
  'mobile app studios',
];

const PAIN_POINTS = [
  'slow release cycles',
  'high churn',
  'manual reconciliation',
  "poor sales prospecting",
  'disconnected toolchain',
  'inefficient hiring processes',
  'lack of engagement',
  'poor customer feedback',
  'high turnover rates',
];

const CTAS = [
  'book a 15-minute demo',
  'schedule a follow-up call',
  'try a 14-day free trial',
  'connect the week after next',
  'see a live walkthrough',
];

const NAMES = ['Alex', 'Taylor', 'Jordan', 'Sam', 'Casey', 'Riley', 'Morgan', 'Dakota'];
const BUSINESSES = ['Brightlane', 'Northstar', 'BluePeak', 'SparkBridge', 'Crescent'];

const TONES = ['friendly', 'direct', 'curious', 'empathetic', 'confident'];
const PERSONAS = ['CTO', 'VP of Sales', 'Head of Growth', 'Operations Manager', 'HR Lead', 'Founder'];

const OBJECTION_TYPES = [
  'budget',
  'timing',
  'no-need',
  'skepticism',
  'technical-fit',
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pluralize(n, s) { return n === 1 ? s : s + 's'; }

function makeConversationTemplate(opts) {
  // Build a short 3-7 turn script alternating You/Prospect
  const turns = [];
  const turnCount = Math.floor(Math.random() * 5) + 3; // 3-7 turns
  const yourName = opts.yourName || rand(NAMES);
  const yourBusiness = opts.yourBusiness || rand(BUSINESSES);
  const product = opts.product || rand(PRODUCTS);
  const niche = opts.niche || rand(NICHES);
  const pain = opts.pain || rand(PAIN_POINTS);
  const cta = opts.cta || rand(CTAS);
  const tone = opts.tone || rand(TONES);
  const persona = opts.persona || rand(PERSONAS);
  const objection_type = opts.objection_type || rand(OBJECTION_TYPES);
  const difficulty = opts.difficulty || rand(DIFFICULTIES);

  // Common templates we'll vary between to keep structure
  const templates = {
    opener: (name) => `Hi this is ${name} with ${yourBusiness}. How are you today?`,
    value: () => `The reason I’m calling is we help companies in ${niche} using a ${product} to reduce ${pain}.`,
    qualifier: () => `Can I ask: how are you currently handling ${pain}?`,
    objection_bridge: () => `I understand — many of our customers felt the same until they tried ${yourBusiness}. What if I showed you a short example?`,
    cta_close: () => `Would you be open to ${cta}?`,
    prospect_question: () => `What does that look like for a team like ours?`,
    prospect_objection: () => `We don't have budget / not a priority right now.`,
    prospect_interest: () => `That sounds interesting — can you share more?`,
  };

  // Turn 1: opener
  turns.push({ speaker: 'You', text: templates.opener(yourName) });

  // Turn 2: prospect reply (random)
  turns.push({ speaker: 'Prospect', text: Math.random() > 0.3 ? 'I have a minute, go ahead.' : 'Who is this again?' });

  // Turn 3: value prop
  turns.push({ speaker: 'You', text: templates.value() });

  // Additional turns
  for (let i = 3; i < turnCount; i++) {
    const isYou = i % 2 === 0; // you on even indices (0-based)
    if (isYou) {
      // Your variations
      const v = Math.random();
      if (v < 0.4) turns.push({ speaker: 'You', text: templates.qualifier() });
      else if (v < 0.7) turns.push({ speaker: 'You', text: templates.objection_bridge() });
      else turns.push({ speaker: 'You', text: templates.cta_close() });
    } else {
      // Prospect variations
      const v = Math.random();
      if (v < 0.35) turns.push({ speaker: 'Prospect', text: templates.prospect_question() });
      else if (v < 0.65) turns.push({ speaker: 'Prospect', text: templates.prospect_objection() });
      else turns.push({ speaker: 'Prospect', text: templates.prospect_interest() });
    }
  }

  // Ensure last turn is a CTA or prospect interest
  if (turns[turns.length - 1].speaker === 'You' && !turns[turns.length - 1].text.includes(templates.cta_close().split(' ')[0])) {
    turns.push({ speaker: 'You', text: templates.cta_close() });
  }

  // Build nodes/edges in a simple sequential layout
  const nodes = turns.map((t, idx) => ({
    id: String(idx + 1),
    type: 'script',
    position: { x: (idx % 2) * 400, y: idx * 200 },
    data: { speaker: t.speaker, text: t.text, sentiment: estimateSentiment(t.text) },
  }));

  const edges = nodes.slice(0, -1).map((n, idx) => ({ id: `e${idx}-${idx+1}`, source: String(idx+1), target: String(idx+2), animated: false }));

  return {
    nodes,
    edges,
    metadata: {
      yourName,
      yourBusiness,
      product,
      niche,
      pain,
      cta,
      tone,
      persona,
      objection_type,
      difficulty,
      template: 'mixed-seq',
    },
  };
}

// Very small heuristic sentiment estimator for synthetic labeling
function estimateSentiment(text) {
  const t = text.toLowerCase();
  const negative = ['not', "don't", "didn't", 'no', 'nope', 'never', 'budget', 'not sure', "don't have", "don't think"];
  const positive = ['yes', 'sounds', 'interesting', 'ok', 'sure', 'available', 'great', 'love', 'good'];
  let score = 0;
  negative.forEach(w => { if (t.includes(w)) score -= 1; });
  positive.forEach(w => { if (t.includes(w)) score += 1; });
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function main() {
  const outStream = fs.createWriteStream(OUT, { flags: 'w' });
  for (let i = 0; i < COUNT; i++) {
    const conv = makeConversationTemplate({});
    outStream.write(JSON.stringify(conv) + '\n');
  }
  outStream.end();
  console.log(`Wrote ${COUNT} synthetic scripts to ${OUT}`);
}

main();
