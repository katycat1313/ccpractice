/**
 * Multi-Hat AI Sales Agent
 * Wears two essential hats seamlessly in one conversation:
 * 1. HAT_COACH: Friendly, direct, cut-the-BS sales mentor & conversational script builder
 * 2. HAT_PROSPECT: Realistic target buyer dynamically adapted to the pulled business & stage
 */

export const AGENT_HATS = {
  COACH: 'coach',
  PROSPECT: 'prospect'
};

/**
 * Generate Coach Mentorship & Conversational Script / Rebuttal Building Response
 */
export function generateCoachResponse({
  userMessage,
  currentBusiness,
  callStage,
  _callStrategy
}) {
  const text = (userMessage || '').toLowerCase();
  const firstName = currentBusiness.ownerName.split(' ')[0];

  // 1. CONVERSATIONAL SCRIPT BUILDING
  if (text.includes('script') || text.includes('build') || text.includes('write') || text.includes('create') || text.includes('opener')) {
    const isCall2 = callStage === 'call2' || text.includes('call 2') || text.includes('callback') || text.includes('close');
    
    const scriptObj = {
      id: `script-${Date.now()}`,
      name: `${currentBusiness.name} - ${isCall2 ? 'Call 2 Closing Script' : 'Call 1 Discovery Script'}`,
      industry: currentBusiness.industry,
      description: `Custom 5-step script crafted conversationally with Cut-The-BS Coach for ${currentBusiness.name}.`,
      nodes: [
        {
          id: 'node-1',
          type: 'script',
          position: { x: 250, y: 40 },
          data: {
            title: isCall2 ? 'Step 1: Scheduled Callback Entry' : 'Step 1: 5-Second Pattern Interrupt',
            speaker: 'You',
            text: isCall2
              ? `Hey ${firstName}, Alex following up as promised for our 2:00 walkthrough. Did you have that 1-pager open, or should we dive straight into how you stop unbilled change orders?`
              : `Hey ${firstName}, Alex here. I know you weren't expecting my call and you're probably in your truck, but give me 20 seconds: if this isn't relevant, tell me to jump in a lake. Fair?`
          }
        },
        {
          id: 'node-2',
          type: 'script',
          position: { x: 250, y: 170 },
          data: {
            title: 'Step 2: Bleeding Neck Pain Hook',
            speaker: 'You',
            text: isCall2
              ? `On Tuesday you mentioned losing around $3,000 a week because field technicians forget to bill extra materials on emergency calls. I want to show you the 2-button mobile fix.`
              : currentBusiness.call1Hook || `When your technicians finish an emergency job on-site, how do you guarantee all extra parts and labor get billed before they drive off?`
          }
        },
        {
          id: 'node-3',
          type: 'script',
          position: { x: 250, y: 300 },
          data: {
            title: 'Step 3: High-Value Contrast',
            speaker: 'You',
            text: `Most contractors hated BuilderTrend and Jobber because it costs $400/month and field crews refuse to touch it. Ours has only 2 buttons: snap photo, tap approval, customer invoices go out in 48 hours.`
          }
        },
        {
          id: 'node-4',
          type: 'script',
          position: { x: 250, y: 430 },
          data: {
            title: 'Step 4: 50% Deposit & Milestone Risk Reversal',
            speaker: 'You',
            text: `The 50% deposit reserves our dedicated engineering sprint for your company on our calendar. And we milestone-stage it: you inspect the live staging build and approve Milestone 1 before the second 50% is released. Equal risk.`
          }
        },
        {
          id: 'node-5',
          type: 'script',
          position: { x: 250, y: 560 },
          data: {
            title: isCall2 ? 'Step 5: Contract Onboarding Ask' : 'Step 5: Locked Callback Time',
            speaker: 'You',
            text: isCall2
              ? `Should we send the agreement and the onboarding link over to your direct office email so we can lock in Monday's sprint kick-off?`
              : `Let's do 10 minutes tomorrow morning at 8:30 AM before your guys roll out to the job site. What's your direct cell?`
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'node-1', target: 'node-2', type: 'smoothstep' },
        { id: 'e2-3', source: 'node-2', target: 'node-3', type: 'smoothstep' },
        { id: 'e3-4', source: 'node-3', target: 'node-4', type: 'smoothstep' },
        { id: 'e4-5', source: 'node-4', target: 'node-5', type: 'smoothstep' }
      ]
    };

    const reply = 
      `Alright, let's build this script together! Here's the cut-the-BS framework we just co-created tailored to **${currentBusiness.name}**:\n\n` +
      `1. **The Pattern Interrupt:** Disarms their defense in 5 seconds.\n` +
      `2. **The Bleeding Neck Pain:** Pins down their $3,000/week leak (${currentBusiness.bleedingNeckPain.split(';')[0]}).\n` +
      `3. **The Contrast Bridge:** Differentiates you from bloated apps like BuilderTrend or Jobber.\n` +
      `4. **The 50% Deposit Shield:** Protects your cash flow with milestone escrow.\n` +
      `5. **The Closing Ask:** Locks down ${isCall2 ? 'the onboarding agreement' : 'tomorrow at 8:30 AM'}.\n\n` +
      `Click **"Save to My Scripts"** below if you like this version, or tell me what lines to tweak!`;

    return {
      text: reply,
      script: scriptObj
    };
  }

  // 2. 50% DEPOSIT / PRICING REBUTTAL CO-CREATION
  if (text.includes('deposit') || text.includes('50%') || text.includes('upfront') || text.includes('price') || text.includes('escrow')) {
    const rebuttalObj = {
      id: `reb-${Date.now()}`,
      objection: `I don't pay 50% upfront before you build it`,
      category: `Deposit Defense & Milestone Escrow`,
      goldenLine: `${firstName}, I completely understand why you ask—plenty of agencies take a deposit, disappear for three weeks, and deliver broken software. The 50% deposit is what reserves your dedicated developer sprint exclusively on our calendar for the next 14 days. And we milestone-stage it: you test the staging portal and sign off on Milestone 1 before the second 50% is ever due. Equal risk on both sides.`,
      whyItWorks: `Validates their fear of flaky vendors without apologizing or discounting, then introduces milestone escrow.`,
      createdAt: new Date().toISOString()
    };

    return {
      text:
        `Let's co-create the exact rebuttal for **"${currentBusiness.depositPushback}"**:\n\n` +
        `👉 **Verbatim Golden Line:**\n"${rebuttalObj.goldenLine}"\n\n` +
        `• **Why it works:** ${rebuttalObj.whyItWorks}\n\n` +
        `If you like this response, click **"Save to My Rebuttals"** below to add it to your personal arsenal!`,
      rebuttalObj
    };
  }

  // 3. "JUST SEND ME AN EMAIL" PIVOT
  if (text.includes('email') || text.includes('send info')) {
    const rebuttalObj = {
      id: `reb-${Date.now()}`,
      objection: `"Just send me an email / send info"`,
      category: `20-Second Permission Pivot`,
      goldenLine: `${firstName}, I could send an email, but honestly your inbox is probably slammed with 50 vendor pitches a day. Give me literally 20 seconds right now: if this isn't directly relevant to stopping unbilled change orders on your vans, tell me to jump in a lake and I won't call again. Fair enough?`,
      whyItWorks: `Pattern interrupts automatic brush-off and sets a low-stakes 20-second contract.`,
      createdAt: new Date().toISOString()
    };

    return {
      text:
        `Never accept *"Just send me an email"*. Here is the 20-Second Permission Pivot we co-created for ${firstName}:\n\n` +
        `👉 **Verbatim Golden Line:**\n"${rebuttalObj.goldenLine}"\n\n` +
        `Click **"Save to My Rebuttals"** below to store this in your personal arsenal!`,
      rebuttalObj
    };
  }

  // 4. CUSTOM REBUTTAL REQUEST (e.g. "how do I handle when they say X?")
  if (text.includes('rebut') || text.includes('say when') || text.includes('objection') || text.includes('busy') || text.includes('truck')) {
    const cleanObjection = userMessage.replace(/how do i handle|how to rebut|what to say when|what do i say when/i, '').trim();
    const rebuttalObj = {
      id: `reb-${Date.now()}`,
      objection: cleanObjection || `"I'm busy in my truck right now"`,
      category: `Field Objection Counter`,
      goldenLine: `${firstName}, I know you're busy running calls right now. I'll take 15 seconds: Are your technicians handwriting extra parts on paper tickets that get lost under truck seats? If not, I'll hang up right now.`,
      whyItWorks: `Respects their immediate time while dropping a high-contrast dollar problem.`,
      createdAt: new Date().toISOString()
    };

    return {
      text:
        `Here is the custom rebuttal we just crafted for **${rebuttalObj.objection}**:\n\n` +
        `👉 **Verbatim Line:**\n"${rebuttalObj.goldenLine}"\n\n` +
        `Click **"Save to My Rebuttals"** below if you want to store this in your personal vault!`,
      rebuttalObj
    };
  }

  // GENERAL COACHING
  return {
    text:
      `Direct coaching for **${currentBusiness.name}** (${currentBusiness.industry}):\n\n` +
      `• **Target Prospect:** ${currentBusiness.ownerName} (${currentBusiness.ownerRole})\n` +
      `• **Bleeding Neck Pain:** ${currentBusiness.bleedingNeckPain}\n` +
      `• **Recommended Opening Hook:** "${callStage === 'call2' ? currentBusiness.call2Hook : currentBusiness.call1Hook}"\n\n` +
      `You can tell me: *"Build me a script for ${currentBusiness.industry}"*, *"How do I counter [objection]?"*, or hit **"📞 Dial Call"** to drill live with me in character!`
  };
}

/**
 * Generate Realistic Prospect Roleplay Response
 */
export function generateProspectRoleplayResponse({
  userMessage,
  currentBusiness,
  callStage,
  callStrategy,
  messagesCount
}) {
  const text = (userMessage || '').toLowerCase();

  // 1. Prospect pushes back on 50% deposit
  if (text.includes('deposit') || text.includes('50%') || text.includes('half upfront') || text.includes('payment') || text.includes('retainer')) {
    if (text.includes('milestone') || text.includes('staging') || text.includes('escrow') || text.includes('reserve') || text.includes('sprint') || text.includes('approve')) {
      return {
        text: `Alright, that's fair. If I can test the staging site and approve Milestone 1 before the second half goes out, I'm okay with that. Send the agreement over to my office email.`,
        coachTip: `🔥 Deposit Closed! You successfully used Milestone Escrow to eliminate his risk without discounting. Now confirm his direct email and set onboarding!`
      };
    } else {
      return {
        text: `Whoa, hold on. 50% upfront before you've delivered a single line of working code? I don't work with agencies that way. Why shouldn't I pay 100% when you're done?`,
        coachTip: `⚠️ Deposit Objection! Remind him: the 50% deposit locks in his dedicated engineering sprint exclusively on your calendar, and offer MILESTONE STAGING so he tests Milestone 1 before releasing the rest!`
      };
    }
  }

  // 2. Prospect gives "Just send me an email"
  if (text.includes('email') && !text.includes('20 seconds') && !text.includes('lake') && !text.includes('spam')) {
    return {
      text: `Yeah, look, just send an email with your pricing and a brochure to info@${currentBusiness.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com and I'll look at it when I get a chance.`,
      coachTip: `🚫 DO NOT ACCEPT THIS BRUSH-OFF! Use the 20-Second Permission Pivot: "I could do that Hank, but your inbox is full of vendor pitches. Give me 20 seconds right now: if it doesn't plug unbilled change orders, tell me to jump in a lake!"`
    };
  }

  // 3. User delivered a strong Pattern Interrupt / 20 seconds contract
  if (text.includes('20 seconds') || text.includes('jump in a lake') || text.includes('truck') || text.includes('not expecting my call') || text.includes('fair')) {
    return {
      text: `(Chuckles) Alright, you got 20 seconds before I head into this job site. What's this about?`,
      coachTip: `🎯 Pattern Interrupt Nailed! He granted you 20 seconds of attention. Now immediately drop the Bleeding Neck Pain Hook about unbilled change orders!`
    };
  }

  // 4. User touches the bleeding neck pain (unbilled parts, technician tracking)
  if (text.includes('parts') || text.includes('unbilled') || text.includes('extra') || text.includes('freon') || text.includes('ticket') || text.includes('leak') || text.includes('billing')) {
    return {
      text: `Man, honestly that's a huge headache for us. My guys lose paper tickets under their truck seats and by the time invoicing happens on Friday, half the extra copper and freon is missing. What do you do about that?`,
      coachTip: `💥 Pain Confirmed! He admitted the $3,000 weekly leak. Contrast your 2-button mobile solution against bloated tools like BuilderTrend or Jobber!`
    };
  }

  // 5. Late in call - ask for callback or agreement
  if (messagesCount >= 4) {
    if (callStage === 'call2' || callStrategy === 'one_call_close') {
      return {
        text: `Look Alex, if this can really stop my techs from leaking $3,000 a week and you back it up with the milestone staging, let's do it. What's the next step?`,
        coachTip: `🏆 CLOSING TIME! Direct him to the onboarding agreement, take the 50% deposit reservation, and lock in the Monday sprint!`
      };
    } else {
      return {
        text: `Sounds like it could help us. I have crews rolling out tomorrow at 8:00 AM. Call my cell at 8:30 AM and walk me through the live screen.`,
        coachTip: `📅 Callback Locked! Confirm his cell number and send the calendar invite immediately.`
      };
    }
  }

  // Default natural prospect pushback
  return {
    text: `Look, I get five calls a day from marketing people. How is this any different from every other software company promising the moon?`,
    coachTip: `Differentiate with field simplicity: "Most systems have 800 buttons made for accountants. Ours has 2 buttons for guys wearing work boots."`
  };
}

/**
 * Generate Post-Call Debrief (Strengths, Weaknesses, Pivots)
 */
export function generateCallDebrief({
  messages,
  currentBusiness,
  callStage,
  callStrategy,
  durationSeconds
}) {
  const userMessages = messages.filter(m => m.speaker === 'You');
  const userTextCombined = userMessages.map(m => m.text).join(' ').toLowerCase();

  let score = 50;
  const strengths = [];
  const weaknesses = [];
  const pointersAndPivots = [];

  // 1. Pattern Interrupt check
  if (userTextCombined.includes('20 seconds') || userTextCombined.includes('jump in a lake') || userTextCombined.includes('expecting my call')) {
    score += 15;
    strengths.push('Disarmed prospect with authentic pattern interrupt and 20-second contract.');
  } else {
    weaknesses.push('Missed 5-second Pattern Interrupt (risk of early prospect hangup).');
    pointersAndPivots.push({
      moment: 'Call Opening (First 10s)',
      said: userMessages[0]?.text || 'Generic opener',
      pivot: `"Hey ${currentBusiness.ownerName.split(' ')[0]}, I know you weren't expecting my call and you're probably in your truck, but give me 20 seconds: if this isn't relevant, tell me to jump in a lake. Fair?"`
    });
  }

  // 2. Bleeding neck pain check
  if (userTextCombined.includes('parts') || userTextCombined.includes('unbilled') || userTextCombined.includes('leak') || userTextCombined.includes('extra') || userTextCombined.includes('freon')) {
    score += 15;
    strengths.push('Directly engaged prospect’s bleeding neck pain ($3,000/wk unbilled extras).');
  } else {
    weaknesses.push('Failed to quantify their bleeding neck pain in dollars.');
    pointersAndPivots.push({
      moment: 'Discovery & Pain Hook',
      said: 'Talked about generic features',
      pivot: `"When your technicians finish an emergency call at 6 PM, how do you guarantee all extra copper fittings and freon get billed before they drive away?"`
    });
  }

  // 3. 50% deposit / milestone risk reversal
  if (userTextCombined.includes('milestone') || userTextCombined.includes('staging') || userTextCombined.includes('escrow') || userTextCombined.includes('sprint')) {
    score += 20;
    strengths.push('Defended 50% upfront deposit using milestone escrow risk reversal.');
  } else if (callStage === 'call2' || callStrategy === 'one_call_close') {
    weaknesses.push('Did not offer milestone staging protection to close the 50% deposit.');
    pointersAndPivots.push({
      moment: '50% Deposit Closing Phase',
      said: 'Did not address upfront deposit fear',
      pivot: `"The 50% deposit reserves our dedicated engineering sprint for you. And we milestone-stage it: you inspect Milestone 1 on staging before releasing the rest. Equal risk."`
    });
  }

  score = Math.min(100, Math.max(30, score));

  let coachVerdict = "";
  if (score >= 80) {
    coachVerdict = `🔥 **Apex Performance!** You controlled the frame, surfaced the contractor's pain, and locked down commitment without discounting.`;
  } else if (score >= 60) {
    coachVerdict = `⚡ **Solid Rep with Room to Sharpen:** Good dialogue control, but tighten your deposit defense with milestone escrow to guarantee higher closing rates.`;
  } else {
    coachVerdict = `🥋 **Field Rookie Rep:** You allowed the contractor to control the conversation. Focus on delivering the 5-second Pattern Interrupt and quantifying unbilled change orders!`;
  }

  return {
    score,
    prospectName: currentBusiness.ownerName,
    businessName: currentBusiness.name,
    callStage: callStage === 'call2' ? 'Call 2: Scheduled Close' : 'Call 1: Discovery',
    duration: `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
    coachVerdict,
    strengths,
    weaknesses,
    pointersAndPivots
  };
}
