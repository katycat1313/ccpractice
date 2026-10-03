import React from 'react';
import { PhoneCall } from 'lucide-react';

export default function ProspectAvatarCard({ prospect, onCall, isSelected }) {
  const name = prospect?.name || '';
  const isCarl = name.includes('Carl') || name.includes('Mac') || prospect?.id?.includes('carl') || prospect?.id?.includes('mac');
  const isBo = name.includes('Bo') || name.includes('Travis') || name.includes('Pauley') || prospect?.id?.includes('bo');
  const isDelbert = name.includes('Delbert') || name.includes('Workman') || prospect?.id?.includes('delbert');

  // Bottom-up dissolve mask blends the shirt into the bg-slate-800 card body
  const verticalFadeMaskStyle = {
    WebkitMaskImage: 'linear-gradient(to top, transparent 0%, transparent 15%, rgba(0,0,0,0.85) 60%, black 100%)',
    maskImage: 'linear-gradient(to top, transparent 0%, transparent 15%, rgba(0,0,0,0.85) 60%, black 100%)'
  };

  // Safe mature male tradesman image for Carl (hardcode safeguard against blonde woman image)
  const CARL_MALE_PORTRAIT = 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80';
  const BO_MALE_PORTRAIT = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
  const DELBERT_MALE_PORTRAIT = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80';

  let rawUrl = prospect.avatarUrl || prospect.portraitUrl || '';
  // Explicitly purge blonde woman photo (1544717305-2782549b5136)
  if (rawUrl.includes('1544717305-2782549b5136') || isCarl) {
    rawUrl = CARL_MALE_PORTRAIT;
  }

  let avatarUrl = rawUrl;
  let tag = prospect.tag || 'Jobsite • West Virginia';
  let painHeader = prospect.painHeader || 'UNBILLED JOB EXPENSES:';
  let painText = prospect.bleedingNeckPain || '';
  let roleTitle = prospect.role || 'Contractor';
  let location = prospect.city || 'Charleston, WV';
  let company = prospect.companyName || 'Mountain State Contractor';
  let clipId = `clip-${prospect.id || 'contractor'}`;

  // Persona Details
  if (isCarl) {
    avatarUrl = CARL_MALE_PORTRAIT;
    tag = tag || 'In Truck Cab • Route 60';
    painHeader = painHeader || 'WEEKEND ESTIMATING BURNOUT:';
    painText = painText || 'Spending 10 hours every Sunday handwriting kitchen & bath quotes; eating $1,200 on unbudgeted plumbing runs because changes were noted on lumber scraps.';
    roleTitle = 'Residential General Contractor & Builder';
    location = 'Kanawha County / Charleston, WV';
    company = 'McIntyre Construction & Remodeling';
  } else if (isBo) {
    avatarUrl = avatarUrl || BO_MALE_PORTRAIT;
    tag = tag || 'Fleet of 4 Vans • Route 119 Calls';
    painHeader = painHeader || 'VAN INVENTORY & UNBILLED PARTS SLIPS:';
    painText = painText || 'Field techs grabbing brass fittings and line sets at supply houses; receipts end up faded on the floorboards and never make it onto the invoice.';
    roleTitle = 'Commercial & Residential HVAC Owner';
    location = 'Teays Valley / South Charleston, WV';
    company = 'Pauley Heating & Mechanical';
  } else if (isDelbert) {
    avatarUrl = avatarUrl || DELBERT_MALE_PORTRAIT;
    tag = tag || 'In Machine Cab • Elk River Sites';
    painHeader = painHeader || 'UNBILLED OPERATOR & ROCK HOURS:';
    painText = painText || 'Eating $3,800 in extra diesel and hammer time when trenching hits unexpected sandstone ledge that wasn\'t covered in the initial estimate.';
    roleTitle = 'Owner & Earthmoving Operator';
    location = 'Elkview / Cross Lanes, WV';
    company = 'Workman Excavating & Septic';
  }

  // Machined tag badge colors on dark panels
  const tagColorClass = isCarl 
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
    : isBo 
    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

  const dotColorClass = isCarl ? 'bg-amber-400' : isBo ? 'bg-cyan-400' : 'bg-emerald-400';

  return (
    <div 
      className={`bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700/80 shadow-2xl relative overflow-visible mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group transition-all hover:border-slate-600 hover:shadow-indigo-500/5 ${
        isSelected ? 'ring-2 ring-indigo-500/60 border-indigo-500/50' : ''
      }`}
    >
      {/* Left: Cutout Avatar Overlay & Text Information */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        
        {/* Avatar Container: Overflowing top edge (-mt-6 -ml-3 w-28 h-36) */}
        <div className="w-28 h-36 relative -mt-6 -ml-3 shrink-0 overflow-visible z-10">
          <div 
            className="w-full h-full pointer-events-none transition-transform duration-300 group-hover:scale-103"
            style={verticalFadeMaskStyle}
          >
            <svg className="w-full h-full overflow-visible" viewBox="0 0 112 144">
              <defs>
                <clipPath id={clipId}>
                  {/* Contoured torso & head silhouette */}
                  <path d="M 4,144 L 4,118 C 6,98 18,84 34,74 C 32,64 30,52 30,34 C 30,12 42,2 56,2 C 70,2 82,12 82,34 C 82,52 80,64 78,74 C 94,84 106,98 108,118 L 108,144 Z" />
                </clipPath>
              </defs>
              <image
                href={avatarUrl}
                x="2"
                y="0"
                width="108"
                height="144"
                preserveAspectRatio="xMidYMin slice"
                clipPath={`url(#${clipId})`}
              />
            </svg>
          </div>
        </div>

        {/* Text Content (ml-2 flex-1 with plenty of breathing room) */}
        <div className="ml-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h4 className="text-lg font-bold text-white tracking-tight">
              {prospect.name}
            </h4>
            <span className="text-xs text-slate-400 font-medium">
              · {company}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${tagColorClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass} animate-pulse`} />
              <span>{tag}</span>
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium mb-2.5">
            {location} · {roleTitle}
          </p>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/70 text-xs">
            <span className="text-xs font-bold text-rose-400 tracking-wide block mb-1">
              {painHeader}
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {painText}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Pinned Machined Call Button */}
      <button
        onClick={() => onCall && onCall(prospect)}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-full shadow-lg shadow-indigo-600/30 transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-98 self-end md:self-center"
      >
        <PhoneCall className="w-4 h-4 fill-white" />
        <span>Call</span>
      </button>
    </div>
  );
}
