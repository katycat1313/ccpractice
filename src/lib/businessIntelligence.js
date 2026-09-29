/**
 * Business Intelligence & Persona Adaptation Engine
 * Automatically analyzes any business name, trade, website, or city
 * and configures the exact prospect persona the agent becomes.
 */

export const PRESET_BUSINESSES = [
  {
    id: 'miller-hvac',
    name: 'Miller Heating & Air Conditioning',
    industry: 'HVAC & Refrigeration',
    city: 'Fort Worth, TX',
    fleetSize: '8 Service Vans',
    revenue: '$2.4M / year',
    ownerName: 'Hank Miller',
    ownerRole: 'Founder & Head of Field Ops',
    avatar: '🔨',
    personality: 'Gruff, busy, taking call in his truck between job sites. Skeptical of software guys.',
    bleedingNeckPain: 'Losing $3,200/month in unbilled emergency service calls and missing calls while on roofs.',
    call1Hook: 'Are your technicians still handwriting extra parts and freon on paper tickets that get lost under truck seats?',
    call2Hook: 'Following up on our 2:00 call to review the 2-button change order tracker that plugs your unbilled freon leak.',
    depositPushback: 'Look Alex, I am not paying 50% upfront before we test this on our 8 vans. Can we do 100% on delivery?'
  },
  {
    id: 'flowpro-plumbing',
    name: '24/7 Flow Pro Emergency Plumbing',
    industry: 'Emergency Plumbing & Drain Cleaning',
    city: 'Phoenix, AZ',
    fleetSize: '5 Box Trucks',
    revenue: '$1.6M / year',
    ownerName: 'Dave Kowalski',
    ownerRole: 'Master Plumber & Owner',
    avatar: '🔧',
    personality: 'Impatient, blunt, hands in a sink or under a slab. Gets frustrated by robotic voice menus.',
    bleedingNeckPain: '85% of homeowners call the next plumber on Google if his phone rings more than 3 times.',
    call1Hook: 'How many $3,000 emergency slab leak calls went to competitors last month because your hands were covered in grease?',
    call2Hook: 'Reviewing our missed call text back simulation that captured 14 test leads during after-hours dispatch.',
    depositPushback: 'I got burned by a web agency in Scottsdale that took a $2,500 deposit and vanished. Why should I trust a 50% deposit?'
  },
  {
    id: 'apex-builds',
    name: 'Apex Custom Builds & Remodeling',
    industry: 'General Contractor / Luxury Remodeling',
    city: 'Denver, CO',
    fleetSize: '15 Subcontractor Crews',
    revenue: '$4.8M / year',
    ownerName: 'Elena Rostova',
    ownerRole: 'Principal General Contractor',
    avatar: '📐',
    personality: 'Sharp, organized, hates software bloat. Tried BuilderTrend and her crew refused to use it.',
    bleedingNeckPain: 'Subcontractors doing unapproved scope changes, leading to $20k+ disputed final draws with homeowners.',
    call1Hook: 'How are you stopping your framers and drywallers from doing unbilled extras before getting homeowner sign-off?',
    call2Hook: 'Walkthrough of the 1-click mobile sign-off tool to ensure your next $85,000 draw payment is released on time.',
    depositPushback: 'We never release 50% upfront without milestone escrow and lien waiver stages. How is our risk protected?'
  },
  {
    id: 'titan-roofing',
    name: 'Titan Commercial Roofing Solutions',
    industry: 'Commercial & Industrial Roofing',
    city: 'Atlanta, GA',
    fleetSize: '12 Crew Trucks',
    revenue: '$6.2M / year',
    ownerName: 'Marcus Vance',
    ownerRole: 'VP of Commercial Operations',
    avatar: '🏢',
    personality: 'Authoritative, fast-talking, demands bottom-line numbers within 15 seconds.',
    bleedingNeckPain: 'Commercial property managers demanding real-time drone and repair photo proof before approving $40,000 invoices.',
    call1Hook: 'Give me 20 seconds Marcus: are your crews still uploading inspection photos to Dropbox that property managers claim they never received?',
    call2Hook: 'Finalizing the custom client inspection portal for your Atlanta commercial property accounts.',
    depositPushback: 'Our corporate policy requires net-30 upon system inspection. Explain why you require a 50% retainer.'
  },
  {
    id: 'summit-electrical',
    name: 'Summit Industrial Electrical',
    industry: 'Industrial Electrical & Controls',
    city: 'Chicago, IL',
    fleetSize: '10 Vans & Bucket Trucks',
    revenue: '$3.5M / year',
    ownerName: 'Jim Brody',
    ownerRole: 'Master Electrician & Operations Manager',
    avatar: '⚡',
    personality: 'Pragmatic, methodical, tests whether you actually understand commercial high-voltage work.',
    bleedingNeckPain: 'Technicians underquoting emergency panel upgrades on-site without checking current copper supply pricing.',
    call1Hook: 'When your guys are on an emergency panel swap at 9 PM, how do they verify current wire pricing before giving the quote?',
    call2Hook: 'Reviewing the on-site wire & breaker calculator that ensures 42% gross margin on every dispatch.',
    depositPushback: 'I need to see milestone sign-offs before my accounting department cuts a 50% check.'
  }
];

/**
 * Dynamically analyzes any user-entered business name, URL, or trade description
 * and generates a high-fidelity business profile & persona.
 */
export function generateBusinessIntelligence(inputQuery) {
  if (!inputQuery || !inputQuery.trim()) {
    return PRESET_BUSINESSES[0];
  }

  const query = inputQuery.trim();
  const lower = query.toLowerCase();

  // Check preset matches
  const found = PRESET_BUSINESSES.find(b => 
    b.name.toLowerCase().includes(lower) || 
    b.industry.toLowerCase().includes(lower) ||
    lower.includes(b.id)
  );
  if (found) return found;

  // Determine industry and persona dynamics from keywords
  let industry = 'General Trade Contractor';
  let role = 'Owner & Operator';
  let ownerName = 'Brad Stevens';
  let avatar = '🔨';
  let pain = 'Unbilled job-site change orders and losing customer calls during field work.';
  let call1Hook = 'How are your field technicians capturing extra billable work before leaving the customer site?';
  let call2Hook = 'Following up on our scheduled demo to review the field crew workflow tool.';
  let depositPushback = 'I want to be sure my guys will actually use this before I release a 50% upfront payment.';

  if (lower.includes('plumb') || lower.includes('drain') || lower.includes('pipe') || lower.includes('rooter')) {
    industry = 'Emergency Plumbing & Sewer';
    ownerName = 'Dave Kowalski';
    role = 'Master Plumber & Owner';
    avatar = '🔧';
    pain = 'Missing high-margin emergency calls while under sinks; competitors grabbing leads in 90 seconds.';
    call1Hook = 'How many emergency water heater and sewer calls are going straight to voicemail while your hands are full?';
    call2Hook = 'Reviewing the missed call instant text-back system to capture lost emergency plumbing calls.';
    depositPushback = 'I have had agencies take deposits and ghost. How is this 50% deposit protected?';
  } else if (lower.includes('roof') || lower.includes('gutter') || lower.includes('shingle')) {
    industry = 'Roofing & Exterior Restoration';
    ownerName = 'Hank Miller';
    role = 'Owner & Field Supervisor';
    avatar = '🏠';
    pain = 'Can not answer phone while on ladders or roofs; insurance supplements getting denied due to lack of photo proof.';
    call1Hook = 'Give me 20 seconds: how are your crews capturing photo documentation so insurance supplements don\'t get rejected?';
    call2Hook = 'Reviewing the 1-click roof inspection report that speeds up insurer approval times.';
    depositPushback = 'Roofing margins are tight right now. Can we do 25% down instead of 50%?';
  } else if (lower.includes('hvac') || lower.includes('air') || lower.includes('cool') || lower.includes('heat')) {
    industry = 'Heating & Air Conditioning';
    ownerName = 'Hank Miller';
    role = 'Founder & Lead Tech';
    avatar = '❄️';
    pain = 'Technicians forgetting to invoice refrigerant and capacitor upgrades while rushing between 6 daily calls.';
    call1Hook = 'When your techs swap an emergency compressor in 95-degree heat, how do you guarantee all extras get billed?';
    call2Hook = 'Walkthrough of the field dispatch tool that stops $3,000/week in missed technician change orders.';
    depositPushback = 'We don\'t pay 50% upfront before software is operational on our trucks.';
  } else if (lower.includes('electric') || lower.includes('wire') || lower.includes('solar')) {
    industry = 'Electrical Contracting';
    ownerName = 'Jim Brody';
    role = 'Master Electrician & Principal';
    avatar = '⚡';
    pain = 'Slow change order sign-offs holding up final inspection and payment milestones.';
    call1Hook = 'Are your electricians waiting days for general contractors to sign off on panel modifications?';
    call2Hook = 'Checking the 2-button change order tool to speed up sign-offs and draw disbursements.';
    depositPushback = 'Can we split the deposit into three milestone payments instead of 50% upfront?';
  } else if (lower.includes('dent') || lower.includes('clinic') || lower.includes('med') || lower.includes('health')) {
    industry = 'Healthcare / Dental Practice';
    ownerName = 'Dr. Robert Hayes';
    role = 'Practice Principal & Clinical Director';
    avatar = '🦷';
    pain = 'Front desk staff overwhelmed with insurance verification and patient scheduling call backlogs.';
    call1Hook = 'How many new patient inquiries are getting put on hold during your 8:30 AM morning rush?';
    call2Hook = 'Reviewing the automated 24/7 patient booking and insurance pre-qualification system.';
    depositPushback = 'Our clinical board requires strict HIPAA verification before releasing a 50% software deposit.';
  } else if (lower.includes('auto') || lower.includes('mechanic') || lower.includes('tire') || lower.includes('collision')) {
    industry = 'Automotive Repair & Collision';
    ownerName = 'Tony Rossi';
    role = 'Shop Owner & Lead Tech';
    avatar = '🚗';
    pain = 'Customers disputing diagnostic fees and delaying repair authorizations via phone tag.';
    call1Hook = 'How much time do your service writers spend playing phone tag to get customer approval on brake jobs?';
    call2Hook = 'Reviewing the instant SMS digital vehicle inspection that gets 78% authorization in 12 minutes.';
    depositPushback = 'I want to see the shop management integration before paying a 50% deposit.';
  }

  // Extract cleaned name
  let cleanName = query;
  if (query.includes('http')) {
    try {
      const url = new URL(query);
      cleanName = url.hostname.replace('www.', '').split('.')[0];
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1) + ' Services';
    } catch {
      cleanName = query;
    }
  }

  return {
    id: `custom-${Date.now()}`,
    name: cleanName,
    industry,
    city: 'Local Metro Area',
    fleetSize: '6 - 12 Service Vehicles',
    revenue: '$1.8M - $3.5M / year',
    ownerName,
    ownerRole: role,
    avatar,
    personality: 'Direct, focused on crew productivity and cash flow. Dislikes tech jargon and generic pitches.',
    bleedingNeckPain: pain,
    call1Hook,
    call2Hook,
    depositPushback
  };
}
