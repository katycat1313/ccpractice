/**
 * Career & Offer Dossier Manager
 * Persists candidate Resume, target Job Description, Portfolio/GitHub/Project URLs,
 * and KRECHET Academy Agency Pitch details. Syncs with Supabase when configured.
 */

const DOSSIER_KEY = 'scriptmaster_career_dossier_v1';

export const DEFAULT_CAREER_DOSSIER = {
  candidateTitle: 'AI Software Engineer (Application Developer / Solutions Architect)',
  proofStyle: 'Project-based architecture, live deployed systems, and measurable business outcomes (NOT LeetCode algorithm trivia)',
  resume: {
    fileName: '',
    rawText: '',
    summary: '',
    keySkills: [],
    notableProjects: [],
    updatedAt: null,
  },
  jobDescription: {
    fileName: '',
    roleTitle: 'Solutions Architect / AI Application Developer',
    companyName: '',
    rawText: '',
    summary: '',
    keySkills: [],
    keyRequirements: [],
    updatedAt: null,
  },
  portfolioUrls: [
    {
      id: 'url-krechet-default',
      label: 'KRECHET Academy — Digital Marketing Simulations & Workshops',
      url: 'https://krechet.academy',
      summary: 'Interactive digital marketing training platform teaching paid acquisition, attribution, and funnel optimization through live simulations and agency team workshops.',
      fetched: false,
    },
  ],
  krechet: {
    academyName: 'KRECHET Academy',
    tagline: 'Hands-on digital marketing simulations & interactive workshops that train agency strategists without burning live client ad spend.',
    targetAudience: 'Digital Marketing Agencies (Managing Partners, Performance Leads, Account Strategists)',
    coreModules: [
      'Live Paid Media & Funnel Crisis Simulation Lab (real budget allocation & ROAS diagnostics)',
      'Cohort-Based Agency Workshops (4-week applied sprint with live campaign teardown)',
      'Skill Readiness Telemetry & Certification Scorecards for Junior-to-Mid Buyers',
    ],
    pilotOffer: '2-week Agency Cohort Pilot for up to 12 strategists with custom client-vertical simulation scenarios.',
  },
};

export function getCareerDossier() {
  try {
    const raw = localStorage.getItem(DOSSIER_KEY);
    if (!raw) return DEFAULT_CAREER_DOSSIER;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CAREER_DOSSIER,
      ...parsed,
      resume: { ...DEFAULT_CAREER_DOSSIER.resume, ...(parsed.resume || {}) },
      jobDescription: { ...DEFAULT_CAREER_DOSSIER.jobDescription, ...(parsed.jobDescription || {}) },
      portfolioUrls: Array.isArray(parsed.portfolioUrls) ? parsed.portfolioUrls : DEFAULT_CAREER_DOSSIER.portfolioUrls,
      krechet: { ...DEFAULT_CAREER_DOSSIER.krechet, ...(parsed.krechet || {}) },
    };
  } catch {
    return DEFAULT_CAREER_DOSSIER;
  }
}

export function saveCareerDossier(partial) {
  const current = getCareerDossier();
  const next = {
    ...current,
    ...partial,
    resume: partial.resume ? { ...current.resume, ...partial.resume } : current.resume,
    jobDescription: partial.jobDescription
      ? { ...current.jobDescription, ...partial.jobDescription }
      : current.jobDescription,
    krechet: partial.krechet ? { ...current.krechet, ...partial.krechet } : current.krechet,
  };
  try {
    localStorage.setItem(DOSSIER_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('scriptmaster_dossier_updated', { detail: next }));
  } catch {
    /* ignore */
  }
  return next;
}

export async function parseAndSaveDocument({ file, rawText, docType = 'resume' }) {
  let body = { docType, rawText: rawText || '' };

  if (file) {
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    body = {
      docType,
      fileName: file.name,
      mimeType: file.type || 'text/plain',
      base64Data,
    };
  } else {
    body.fileName = docType === 'job_description' ? 'Pasted Job Description' : 'Pasted Resume';
  }

  const res = await fetch('/api/gemini/parse-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to parse document');
  }

  const stamp = new Date().toISOString();
  if (docType === 'job_description') {
    return saveCareerDossier({
      jobDescription: {
        fileName: data.fileName || body.fileName,
        roleTitle: data.roleTitle || 'Target Role',
        companyName: data.companyName || '',
        rawText: data.rawText || '',
        summary: data.summary || '',
        keySkills: data.keySkills || [],
        keyRequirements: data.keyRequirements || [],
        updatedAt: stamp,
      },
    });
  }

  return saveCareerDossier({
    resume: {
      fileName: data.fileName || body.fileName,
      rawText: data.rawText || '',
      summary: data.summary || '',
      keySkills: data.keySkills || [],
      notableProjects: data.notableProjects || [],
      updatedAt: stamp,
    },
  });
}

export async function addPortfolioUrl(url, label = '') {
  const res = await fetch('/api/gemini/fetch-url-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, label }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add URL');
  }

  const current = getCareerDossier();
  const filtered = (current.portfolioUrls || []).filter((u) => u.url !== data.url);
  const nextUrls = [
    {
      id: `url-${Date.now()}`,
      url: data.url,
      label: data.label || data.url,
      summary: data.summary || '',
      fetched: Boolean(data.fetched),
    },
    ...filtered,
  ];
  return saveCareerDossier({ portfolioUrls: nextUrls });
}

export function removePortfolioUrl(id) {
  const current = getCareerDossier();
  const nextUrls = (current.portfolioUrls || []).filter((u) => u.id !== id);
  return saveCareerDossier({ portfolioUrls: nextUrls });
}

export function formatDossierForPrompt(dossier = getCareerDossier()) {
  const lines = [
    `CANDIDATE PROFILE: ${dossier.candidateTitle}`,
    `EVALUATION FORMAT: ${dossier.proofStyle}`,
  ];

  if (dossier.jobDescription?.rawText || dossier.jobDescription?.roleTitle) {
    lines.push(
      `TARGET JOB DESCRIPTION: ${dossier.jobDescription.roleTitle || 'Role'}${
        dossier.jobDescription.companyName ? ` at ${dossier.jobDescription.companyName}` : ''
      }`
    );
    if (dossier.jobDescription.keyRequirements?.length) {
      lines.push(`- JD Key Requirements: ${dossier.jobDescription.keyRequirements.join(' | ')}`);
    }
    if (dossier.jobDescription.rawText) {
      lines.push(`- JD Details:\n${dossier.jobDescription.rawText.slice(0, 2600)}`);
    }
  }

  if (dossier.resume?.rawText) {
    lines.push(`CANDIDATE RESUME (${dossier.resume.fileName || 'Uploaded'}):`);
    if (dossier.resume.notableProjects?.length) {
      lines.push(`- Notable Projects to Probe: ${dossier.resume.notableProjects.join(' | ')}`);
    }
    if (dossier.resume.keySkills?.length) {
      lines.push(`- Tech Stack: ${dossier.resume.keySkills.join(', ')}`);
    }
    lines.push(`- Resume Text:\n${dossier.resume.rawText.slice(0, 2800)}`);
  }

  if (dossier.portfolioUrls?.length) {
    lines.push(`CANDIDATE PORTFOLIO / PROJECT URLS (Reference & ask specific architecture questions about these):`);
    for (const u of dossier.portfolioUrls) {
      lines.push(`- ${u.label} (${u.url}): ${u.summary}`);
    }
  }

  return lines.join('\n');
}
