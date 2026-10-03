/**
 * Custom Prospect Profiles Manager
 * Authentic West Virginia Mountain State Trade Personas
 * Grounded, realistic, pragmatic contractors across Kanawha County, Teays Valley & Elkview.
 */

const STORAGE_KEY = 'scriptmaster_custom_prospects';

export const DEFAULT_PROSPECTS = [
  {
    id: 'prosp-carl',
    name: "Carl 'Mac' McIntyre",
    companyName: 'McIntyre Construction & Remodeling',
    role: 'Residential General Contractor & Builder',
    industry: 'Residential Remodeling & Additions',
    city: 'Kanawha County / Charleston, WV',
    avatarUrl: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80',
    portraitUrl: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80',
    tag: 'In Truck Cab • Route 60',
    painHeader: 'WEEKEND ESTIMATING BURNOUT:',
    bleedingNeckPain: 'Spending 10 hours every Sunday handwriting kitchen & bath quotes; eating $1,200 on unbudgeted plumbing runs because changes were noted on lumber scraps.',
    skepticism: 'Honest & Pragmatic (Wants tools that work without steady 5G in hollows)',
    commonObjections: [
      "Can my guys use this when there's no cell service out in the hollows?",
      "I do all my quotes with a legal pad on Sundays, don't need another subscription.",
      "Just shoot an email to my wife Connie at the office."
    ],
    greeting: "McIntyre Construction, this is Carl. I'm hauling lumber down Route 60 right now, what's on your mind?"
  },
  {
    id: 'prosp-bo',
    name: "Travis 'Bo' Pauley",
    companyName: 'Pauley Heating & Mechanical',
    role: 'Commercial & Residential HVAC Owner',
    industry: 'Commercial & Residential HVAC',
    city: 'Teays Valley / South Charleston, WV',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    portraitUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    tag: 'Fleet of 4 Vans • Route 119 Calls',
    painHeader: 'VAN INVENTORY & UNBILLED PARTS SLIPS:',
    bleedingNeckPain: 'Field techs grabbing brass fittings and line sets at supply houses; receipts end up faded on the floorboards and never make it onto the invoice.',
    skepticism: 'Direct & Fast-Moving (Interrupted by dispatch radio, needs clear ROI in 20s)',
    commonObjections: [
      "I've got two dispatch calls waiting on Route 119, give me the bottom line in 30 seconds.",
      "My techs aren't computer guys, they're not going to spend 20 minutes tapping on a screen.",
      "We already buy our parts through Ferguson and put it on account."
    ],
    greeting: "Bo Pauley here, Pauley Mechanical. Make it quick—I've got a compressor call in Teays Valley."
  },
  {
    id: 'prosp-delbert',
    name: 'Delbert Workman',
    companyName: 'Workman Excavating & Septic',
    role: 'Owner & Earthmoving Operator',
    industry: 'Site Prep, Septic & Excavation',
    city: 'Elkview / Cross Lanes, WV',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    portraitUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    tag: 'In Machine Cab • Elk River Sites',
    painHeader: 'UNBILLED OPERATOR & ROCK HOURS:',
    bleedingNeckPain: "Eating $3,800 in extra diesel and hammer time when trenching hits unexpected sandstone ledge that wasn't covered in the initial estimate.",
    skepticism: "Calm & Practical (Cuts straight through hype: 'Will my operators actually log this from a jobsite?')",
    commonObjections: [
      "Will my operators actually log this from a trackhoe cab with muddy gloves?",
      "Every site along the Elk River has unpredictable sandstone; how does your software budget that?",
      "I don't buy anything from cold callers, send me paperwork in the mail."
    ],
    greeting: "Workman Excavating, Delbert speaking. Hang on, let me shut down the trackhoe. What you got?"
  }
];

export function getCustomProspects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROSPECTS));
      return DEFAULT_PROSPECTS;
    }
    const parsed = JSON.parse(raw);
    
    // If user has old generic personas (Hank/Dave/Sarah), seamlessly migrate to authentic WV personas
    const hasOldGeneric = parsed.some(p => p.id === 'prosp-hank' || p.name?.includes('Hank'));
    if (hasOldGeneric || !parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROSPECTS));
      localStorage.setItem('scriptmaster_active_prospect_id', 'prosp-carl');
      return DEFAULT_PROSPECTS;
    }

    // Ensure all required properties are populated and blonde woman photo is replaced
    let updated = false;
    const synced = parsed.map(p => {
      if (p.id === 'prosp-carl' || p.name?.includes('Carl') || p.avatarUrl?.includes('1544717305-2782549b5136')) {
        updated = true;
        return {
          ...p,
          avatarUrl: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80',
          portraitUrl: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80'
        };
      }
      const match = DEFAULT_PROSPECTS.find(d => d.id === p.id);
      if (match) {
        if (!p.avatarUrl || p.avatarUrl !== match.avatarUrl || !p.tag || !p.painHeader) {
          updated = true;
          return { ...match, ...p, avatarUrl: match.avatarUrl, tag: match.tag, painHeader: match.painHeader };
        }
      }
      return p;
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
    }
    return synced;
  } catch (err) {
    console.warn('Failed to load prospects:', err);
    return DEFAULT_PROSPECTS;
  }
}

export function saveProspect(prospect) {
  try {
    const current = getCustomProspects();
    const id = prospect.id || `prosp-${Date.now()}`;
    const clean = {
      ...prospect,
      id,
      name: prospect.name || 'New Contractor',
      companyName: prospect.companyName || 'Local Contractor',
      role: prospect.role || 'Business Owner',
      industry: prospect.industry || 'Trade Contractor',
      city: prospect.city || 'Charleston, WV',
      tag: prospect.tag || 'Jobsite • Mountain State',
      painHeader: prospect.painHeader || 'UNBILLED JOB EXPENSES:',
      skepticism: prospect.skepticism || 'Pragmatic & Skeptical',
      bleedingNeckPain: prospect.bleedingNeckPain || 'Losing money on unbudgeted change orders and lost paper slips.',
      commonObjections: Array.isArray(prospect.commonObjections)
        ? prospect.commonObjections
        : (prospect.commonObjections || '').split(',').map(s => s.trim()).filter(Boolean),
      greeting: prospect.greeting || `This is ${prospect.name || 'the owner'}. What is this regarding?`
    };

    const existingIndex = current.findIndex(p => p.id === id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = clean;
    } else {
      updated = [clean, ...current];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem('scriptmaster_prospects', JSON.stringify(updated));
    window.dispatchEvent(new Event('scriptmaster_prospects_updated'));
    return clean;
  } catch (err) {
    console.warn('Failed to save prospect:', err);
    return prospect;
  }
}

/**
 * Explicit helper to create a dynamic custom contractor persona
 * Appends record without altering default West Virginia personas (Carl, Bo, Delbert)
 */
export function createCustomTradePersona({
  name,
  company,
  trade,
  location,
  contextTag,
  painHeader,
  painDescription,
  objectionStyle,
  hookTrigger
}) {
  const defaultAvatars = [
    'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
  ];
  const avatarUrl = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
  
  const personaRecord = {
    id: `prosp-${Date.now()}`,
    name: name || 'Custom Trade Contractor',
    companyName: company || `${name || 'Trade'}'s Services`,
    role: trade || 'Contractor Owner',
    industry: trade || 'Commercial Trades',
    city: location || 'Kanawha Valley, WV',
    tag: contextTag || `${trade || 'Commercial Roofer'} • ${location || 'Route 60'}`,
    painHeader: painHeader || 'UNBILLED JOBSITE EXPENSES & LEAKS:',
    bleedingNeckPain: painDescription || 'Spending hours tracking down unbudgeted repair runs and eating costs on jobsite materials.',
    skepticism: objectionStyle || 'Direct & Pragmatic (Busy in the field, needs instant ROI)',
    hookTrigger: hookTrigger || '20-second contract pattern interrupt',
    avatarUrl,
    portraitUrl: avatarUrl,
    commonObjections: [
      "Can my crew use this when there's zero cell service out in the hollows?",
      "I do all my quotes on legal pads on Sunday nights, don't need an app.",
      "Just send an email to my office before I get on this roof."
    ],
    greeting: `${company || 'Contractor'}, ${name ? name.split(' ')[0] : 'Owner'} speaking. I'm out on a job right now, what's this about?`
  };

  return saveProspect(personaRecord);
}

export function deleteProspect(id) {
  try {
    const current = getCustomProspects();
    const filtered = current.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    localStorage.setItem('scriptmaster_prospects', JSON.stringify(filtered));
    window.dispatchEvent(new Event('scriptmaster_prospects_updated'));
    return true;
  } catch (err) {
    console.warn('Failed to delete prospect:', err);
    return false;
  }
}

export function getSelectedProspectId() {
  const current = localStorage.getItem('scriptmaster_active_prospect_id');
  if (!current || current === 'prosp-hank') {
    localStorage.setItem('scriptmaster_active_prospect_id', 'prosp-carl');
    return 'prosp-carl';
  }
  return current;
}

export function setSelectedProspectId(id) {
  localStorage.setItem('scriptmaster_active_prospect_id', id);
  window.dispatchEvent(new Event('scriptmaster_prospect_selected'));
}
