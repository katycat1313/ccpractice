import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sanitize URL: Strip accidental /rest/v1, /auth/v1, or trailing slashes
const sanitizeSupabaseUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  return url
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/auth\/v1\/?$/i, '')
    .replace(/\/storage\/v1\/?$/i, '')
    .replace(/\/+$/, '');
};

const cleanUrl = sanitizeSupabaseUrl(rawUrl);

const isConfigured = Boolean(
  cleanUrl &&
  cleanUrl.startsWith('http') &&
  !cleanUrl.includes('example.com') &&
  rawAnonKey &&
  typeof rawAnonKey === 'string' &&
  rawAnonKey.length > 20
);

// High-Converting Starter Scripts for Contractor PaaS, AI Receptionist, Missed Call Text Back, and 50% Deposit Freelance Projects
const INITIAL_SCRIPTS = [
  {
    id: 'script-contractor-paas',
    user_id: 'demo-user-id',
    name: 'Custom Contractor PaaS: Stop Change Order Leakage & Speed Up Cash Flow',
    nodes: [
      { id: '1', type: 'script', position: { x: 0, y: 0 }, data: { speaker: 'You', text: 'Hey Hank, I know you are likely out on a job site—I will take 20 seconds. We built a custom contractor management platform for trade businesses that stops change orders from falling through the cracks and gets draw invoices paid in 48 hours.' } },
      { id: '2', type: 'script', position: { x: 400, y: 150 }, data: { speaker: 'Prospect', text: 'Look, I am parked outside a client job right now. We already use paper tickets or BuilderTrend. Why would I switch?' } },
      { id: '3', type: 'script', position: { x: 0, y: 300 }, data: { speaker: 'You', text: 'Totally get it. Most contractors hated BuilderTrend because it costs $400/month and crews refuse to touch it. Our PaaS has only the 3 buttons your guys need on-site: 1-tap change order capture, photo logs, and instant client mobile sign-off.' } },
      { id: '4', type: 'script', position: { x: 400, y: 450 }, data: { speaker: 'Prospect', text: 'Sounds good in theory, but who has time to set all that up and train my guys?' } },
      { id: '5', type: 'script', position: { x: 0, y: 600 }, data: { speaker: 'You', text: 'We handle the entire white-glove setup and crew onboarding for you. We lock in a dedicated sprint with a 50% kickoff deposit, configure your custom workflow, and only invoice the remaining 50% once your crew is actively running jobs without hiccups. Can I show you a 10-minute screen share this Thursday?' } },
      { id: '6', type: 'script', position: { x: 400, y: 750 }, data: { speaker: 'Prospect', text: 'Alright, if it actually saves my guys time on change orders, shoot an invite to my email.' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: false },
      { id: 'e2-3', source: '2', target: '3', animated: false },
      { id: 'e3-4', source: '3', target: '4', animated: false },
      { id: 'e4-5', source: '4', target: '5', animated: false },
      { id: 'e5-6', source: '5', target: '6', animated: false }
    ],
    metadata: {
      yourName: 'Alex',
      yourBusiness: 'BuildSync PaaS',
      product: 'Custom Contractor Management Platform',
      niche: 'Roofing, HVAC & General Contractors',
      pain: 'Losing thousands on unbilled change orders and messy job dispatch',
      cta: 'Book a 10-minute live screen share',
      tone: 'direct & confident',
      difficulty: 'medium',
      prospect: {
        id: 'hank',
        name: 'Hank Miller',
        title: 'Owner, Miller Roofing & HVAC',
        role: 'Trade Contractor Owner',
        description: 'Busy contractor taking the call from his truck cab at a job site. Gruff, hates tech jargon, wants to know if this will save time or make money.',
        personality: 'Gruff & Practical',
        objectionStyle: 'Challenges jargon, skeptical about apps his crew won\'t use',
        color: 'bg-amber-600',
        avatar: '🔨'
      }
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'script-ai-receptionist',
    user_id: 'demo-user-id',
    name: '24/7 AI Receptionist: Never Lose a $3,000 Emergency Job Call',
    nodes: [
      { id: '1', type: 'script', position: { x: 0, y: 0 }, data: { speaker: 'You', text: 'Hey Dave, quick 15-second question: when your hands are under a sink or you are driving between calls and the phone rings, where does that customer call go?' } },
      { id: '2', type: 'script', position: { x: 400, y: 150 }, data: { speaker: 'Prospect', text: 'It goes to voicemail, or my wife tries to answer if she is near the phone. Why?' } },
      { id: '3', type: 'script', position: { x: 0, y: 300 }, data: { speaker: 'You', text: 'Because 85% of people calling for an emergency plumber or HVAC tech hang up on voicemail and immediately hire the next company on Google. We set up a 24/7 AI Receptionist that answers on the first ring, quotes your diagnostic fee, and books the emergency dispatch onto your calendar.' } },
      { id: '4', type: 'script', position: { x: 400, y: 450 }, data: { speaker: 'Prospect', text: 'I do not want some robotic voice ticking off my customers.' } },
      { id: '5', type: 'script', position: { x: 0, y: 600 }, data: { speaker: 'You', text: 'Completely agree! It sounds like a warm, natural receptionist that screens the job address, emergency level, and sends photos to your cell before you arrive. Can I text you a live demo number right now so you can test-call it yourself?' } },
      { id: '6', type: 'script', position: { x: 400, y: 750 }, data: { speaker: 'Prospect', text: 'Yeah, text me the demo number right now. Let me see how it sounds.' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: false },
      { id: 'e2-3', source: '2', target: '3', animated: false },
      { id: 'e3-4', source: '3', target: '4', animated: false },
      { id: 'e4-5', source: '4', target: '5', animated: false },
      { id: 'e5-6', source: '5', target: '6', animated: false }
    ],
    metadata: {
      yourName: 'Alex',
      yourBusiness: 'Apex Voice Automations',
      product: '24/7 AI Receptionist & Emergency Triage',
      niche: 'Emergency Plumbing & HVAC Contractors',
      pain: 'Missing $3,000 emergency jobs while hands are occupied in the field',
      cta: 'Text live demo phone number for instant test call',
      tone: 'conversational & sharp',
      difficulty: 'medium',
      prospect: {
        id: 'dave',
        name: 'Dave Kowalski',
        title: 'Master Plumber & Founder, 24/7 Flow Pro',
        role: 'Emergency Service Contractor',
        description: 'Under a kitchen sink or driving between calls. Constantly misses customer calls that go straight to competitors on Google.',
        personality: 'Impatient & Direct',
        objectionStyle: 'Questions AI realism and says he is on a job',
        color: 'bg-blue-600',
        avatar: '🔧'
      }
    },
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'script-missed-call-text',
    user_id: 'demo-user-id',
    name: 'Missed Call Text Back: Convert Lost Inbound Callers into Booked Revenue',
    nodes: [
      { id: '1', type: 'script', position: { x: 0, y: 0 }, data: { speaker: 'You', text: 'Hey Hank, quick question: what happens right now if a homeowner calls your business line while you are on a roof or talking to a supplier?' } },
      { id: '2', type: 'script', position: { x: 400, y: 150 }, data: { speaker: 'Prospect', text: 'I call them back whenever I get off the phone or later in the afternoon.' } },
      { id: '3', type: 'script', position: { x: 0, y: 300 }, data: { speaker: 'You', text: 'By that afternoon, they have already booked your competitor. We install an automated Missed Call Text Back system: within 4 seconds of a missed call, the caller gets a text saying: "Hey, sorry I missed your call—I am on a job site. What is the emergency?" with a link to request service.' } },
      { id: '4', type: 'script', position: { x: 400, y: 450 }, data: { speaker: 'Prospect', text: 'Does that actually work or do people just ignore automated texts?' } },
      { id: '5', type: 'script', position: { x: 0, y: 600 }, data: { speaker: 'You', text: 'Contractors using it recover an average of 4 to 7 extra jobs every month. The very first job it rescues pays for the entire year. Would you be open to seeing a 3-minute proof of how it connects to your phone?' } },
      { id: '6', type: 'script', position: { x: 400, y: 750 }, data: { speaker: 'Prospect', text: 'Show me how it connects to my cell. Send the link over.' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: false },
      { id: 'e2-3', source: '2', target: '3', animated: false },
      { id: 'e3-4', source: '3', target: '4', animated: false },
      { id: 'e4-5', source: '4', target: '5', animated: false },
      { id: 'e5-6', source: '5', target: '6', animated: false }
    ],
    metadata: {
      yourName: 'Alex',
      yourBusiness: 'FastLead Systems',
      product: 'Instant 5-Second Missed Call Text Back',
      niche: 'Independent Contractors & Home Services',
      pain: '62% of consumers immediately hire the next company on Google if call goes to voicemail',
      cta: 'Show 3-minute proof on mobile',
      tone: 'consultative & direct',
      difficulty: 'medium',
      prospect: {
        id: 'hank',
        name: 'Hank Miller',
        title: 'Owner, Miller Roofing & HVAC',
        role: 'Trade Contractor Owner',
        color: 'bg-amber-600',
        avatar: '🔨'
      }
    },
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 'script-freelance-deposit-close',
    user_id: 'demo-user-id',
    name: 'Custom Freelance Dev: Closing with a 50% Upfront Kickoff Deposit',
    nodes: [
      { id: '1', type: 'script', position: { x: 0, y: 0 }, data: { speaker: 'You', text: 'Julian, based on our scope review, building your custom client portal and automated dispatch pipeline will take a 4-week dedicated sprint with complete milestone staging and deployment.' } },
      { id: '2', type: 'script', position: { x: 400, y: 150 }, data: { speaker: 'Prospect', text: 'The scope looks solid, but your proposal asks for 50% deposit upfront. I never pay upfront for custom software. Can we do 100% on delivery or Net-30?' } },
      { id: '3', type: 'script', position: { x: 0, y: 300 }, data: { speaker: 'You', text: 'I completely understand where you are coming from—there are plenty of unreliable freelancers out there who take deposits and disappear. The 50% deposit reserves our team dedicated engineering sprint exclusively on our calendar and covers cloud architecture setup.' } },
      { id: '4', type: 'script', position: { x: 400, y: 450 }, data: { speaker: 'Prospect', text: 'What guarantees do I have that you will actually deliver what we agreed upon?' } },
      { id: '5', type: 'script', position: { x: 0, y: 600 }, data: { speaker: 'You', text: 'We use milestone verification: in Milestone 1, you test the live clickable architecture and staging portal. You only approve the final 50% release once you test the system and verify all specs before going live. That way our risk is equally shared. Shall I send over the kickoff agreement to lock in next Monday?' } },
      { id: '6', type: 'script', position: { x: 400, y: 750 }, data: { speaker: 'Prospect', text: 'Fair enough. That milestone approval gives me the protection I need. Send the kickoff invoice and agreement.' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: false },
      { id: 'e2-3', source: '2', target: '3', animated: false },
      { id: 'e3-4', source: '3', target: '4', animated: false },
      { id: 'e4-5', source: '4', target: '5', animated: false },
      { id: 'e5-6', source: '5', target: '6', animated: false }
    ],
    metadata: {
      yourName: 'Alex',
      yourBusiness: 'Peak Engineering',
      product: 'Custom Software & Portal Development',
      niche: 'Growing Agencies & Local Business Owners',
      pain: 'Client reluctance to pay 50% deposit before delivery',
      cta: 'Send kickoff agreement and 50% deposit invoice',
      tone: 'authoritative & reassuring',
      difficulty: 'hard',
      prospect: {
        id: 'julian',
        name: 'Julian Thorne',
        title: 'Founder, Apex Brands',
        role: 'Prospective Freelance Client',
        description: 'Wants top quality but always pushes back hard on 50% upfront deposits.',
        personality: 'Savvy & Negotiator',
        objectionStyle: 'Pushes back on 50% downpayment: "Why shouldn\'t I pay 100% upon delivery?"',
        color: 'bg-purple-600',
        avatar: '💻'
      }
    },
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString()
  }
];

function createMockSupabaseClient() {
  const SESSION_STORAGE_KEY = 'scriptmaster_session';
  const SCRIPTS_STORAGE_KEY = 'scriptmaster_scripts';

  const defaultUser = {
    id: 'demo-user-id',
    email: 'demo@scriptmaster.app',
    user_metadata: {
      name: 'Alex Hunter',
      role: 'Founder & Sales Engineer'
    }
  };

  const getStoredSession = () => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // storage unavailable
    }
    const defaultSession = {
      access_token: 'mock-demo-token',
      user: defaultUser
    };
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(defaultSession));
    } catch {
      // storage unavailable
    }
    return defaultSession;
  };

  const saveStoredSession = (session) => {
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // storage unavailable
    }
  };

  const getStoredScripts = () => {
    try {
      const stored = localStorage.getItem(SCRIPTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // storage unavailable
    }
    try {
      localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(INITIAL_SCRIPTS));
    } catch {
      // storage unavailable
    }
    return INITIAL_SCRIPTS;
  };

  const saveStoredScripts = (scripts) => {
    try {
      localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts));
    } catch {
      // storage unavailable
    }
  };

  const authSubscribers = new Set();
  const notifyAuthChange = (event, session) => {
    authSubscribers.forEach((cb) => {
      try {
        cb(event, session);
      } catch (err) {
        console.error('Auth subscriber error:', err);
      }
    });
  };

  return {
    auth: {
      async getSession() {
        const session = getStoredSession();
        return { data: { session }, error: null };
      },
      async getUser() {
        const session = getStoredSession();
        return { data: { user: session?.user || defaultUser }, error: null };
      },
      async signInWithPassword({ email, password: _password }) {
        const namePart = email ? email.split('@')[0] : 'User';
        const user = {
          id: 'usr-' + (email ? btoa(email).slice(0, 8) : 'demo'),
          email: email || 'demo@scriptmaster.app',
          user_metadata: {
            name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
            role: 'Sales Representative'
          }
        };
        const session = {
          access_token: 'mock-token-' + Date.now(),
          user
        };
        saveStoredSession(session);
        notifyAuthChange('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      },
      async signUp({ email, password: _password, data = {} }) {
        const name = data.name || (email ? email.split('@')[0] : 'User');
        const user = {
          id: 'usr-' + Date.now(),
          email: email || 'user@example.com',
          user_metadata: {
            name,
            role: data.role || 'Sales Representative',
            ...data
          }
        };
        const session = {
          access_token: 'mock-token-' + Date.now(),
          user
        };
        saveStoredSession(session);
        notifyAuthChange('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      },
      async signOut() {
        saveStoredSession(null);
        notifyAuthChange('SIGNED_OUT', null);
        return { error: null };
      },
      async updateUser({ data = {} }) {
        const session = getStoredSession();
        if (session && session.user) {
          session.user.user_metadata = {
            ...(session.user.user_metadata || {}),
            ...data
          };
          saveStoredSession(session);
          notifyAuthChange('USER_UPDATED', session);
          return { data: { user: session.user }, error: null };
        }
        return { data: { user: defaultUser }, error: null };
      },
      async resetPasswordForEmail(_email) {
        return { data: {}, error: null };
      },
      onAuthStateChange(callback) {
        authSubscribers.add(callback);
        setTimeout(() => {
          callback('INITIAL_SESSION', getStoredSession());
        }, 0);
        return {
          data: {
            subscription: {
              unsubscribe() {
                authSubscribers.delete(callback);
              }
            }
          }
        };
      }
    },
    from(tableName = 'scripts') {
      const getTableData = () => {
        if (tableName === 'scripts') return getStoredScripts();
        try {
          const raw = localStorage.getItem(`scriptmaster_table_${tableName}`);
          if (raw) return JSON.parse(raw);
        } catch {
          // fallback
        }
        return [];
      };

      const saveTableData = (items) => {
        if (tableName === 'scripts') {
          saveStoredScripts(items);
          return;
        }
        try {
          localStorage.setItem(`scriptmaster_table_${tableName}`, JSON.stringify(items));
        } catch {
          // fallback
        }
      };

      return {
        select(_columns = '*') {
          let filters = [];
          let sortField = null;
          let sortAscending = true;
          let limitCount = null;

          const executeQuery = () => {
            let items = getTableData();
            filters.forEach(({ field, val }) => {
              items = items.filter((s) => s[field] === val);
            });
            if (sortField) {
              items.sort((a, b) => {
                const valA = a[sortField] || '';
                const valB = b[sortField] || '';
                if (valA < valB) return sortAscending ? -1 : 1;
                if (valA > valB) return sortAscending ? 1 : -1;
                return 0;
              });
            }
            if (limitCount !== null) {
              items = items.slice(0, limitCount);
            }
            return items;
          };

          const builder = {
            eq(field, val) {
              filters.push({ field, val });
              return builder;
            },
            order(field, { ascending = true } = {}) {
              sortField = field;
              sortAscending = ascending;
              return builder;
            },
            limit(count) {
              limitCount = count;
              return builder;
            },
            async single() {
              const res = executeQuery();
              if (res.length > 0) {
                return { data: res[0], error: null };
              }
              return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
            },
            then(resolve, reject) {
              const res = executeQuery();
              return Promise.resolve({ data: res, error: null }).then(resolve, reject);
            }
          };

          return builder;
        },
        insert(payload) {
          const items = getTableData();
          const newItem = {
            id: payload.id || `item-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...payload
          };
          items.unshift(newItem);
          saveTableData(items);

          const result = { data: [newItem], error: null };
          return {
            select() {
              return Promise.resolve(result);
            },
            then(resolve, reject) {
              return Promise.resolve(result).then(resolve, reject);
            }
          };
        },
        update(payload) {
          let updatedItem = null;

          const updateRunner = {
            eq(field, val) {
              if (field === 'id') {
                const items = getTableData();
                const index = items.findIndex((s) => s.id === val);
                if (index !== -1) {
                  items[index] = {
                    ...items[index],
                    ...payload,
                    updated_at: new Date().toISOString()
                  };
                  updatedItem = items[index];
                  saveTableData(items);
                }
              }
              return updateRunner;
            },
            select() {
              return Promise.resolve({ data: updatedItem ? [updatedItem] : [], error: null });
            },
            then(resolve, reject) {
              return Promise.resolve({ data: updatedItem ? [updatedItem] : [], error: null }).then(resolve, reject);
            }
          };

          return updateRunner;
        },
        delete() {
          return {
            eq(field, val) {
              if (field === 'id') {
                const items = getTableData();
                const filtered = items.filter((s) => s.id !== val);
                saveTableData(filtered);
              }
              return Promise.resolve({ data: null, error: null });
            }
          };
        }
      };
    },
    functions: {
      async invoke(endpoint, options = {}) {
        const body = options.body || {};

        if (endpoint === 'generate-script') {
          const yourName = body.yourName || 'Alex';
          const yourBusiness = body.yourBusiness || 'Custom Solutions';
          const product = body.product || 'our custom software platform';
          const niche = body.niche || 'contractors and growing businesses';
          const painPoint = body.painPoint || 'losing unbilled jobs and missing emergency calls';
          const cta = body.cta || 'book a 10-minute demo and lock in a 50% deposit kickoff';

          const generatedScript = {
            name: `${product.split('(')[0].trim()} - High-Converting Cold Call Script`,
            nodes: [
              {
                id: '1',
                type: 'script',
                position: { x: 0, y: 0 },
                data: {
                  speaker: 'You',
                  text: `Hey, I know you are in the middle of a job site—I will take 20 seconds. This is ${yourName} with ${yourBusiness}. We help ${niche} eliminate ${painPoint}.`
                }
              },
              {
                id: '2',
                type: 'script',
                position: { x: 400, y: 150 },
                data: {
                  speaker: 'Prospect',
                  text: "I am in my truck right now. What makes your solution any different from what we are already using?"
                }
              },
              {
                id: '3',
                type: 'script',
                position: { x: 0, y: 300 },
                data: {
                  speaker: 'You',
                  text: `Most systems out there are bloated and cost hundreds a month with zero crew adoption. We deliver ${product} tailored to your exact workflow so your team actually uses it on-site.`
                }
              },
              {
                id: '4',
                type: 'script',
                position: { x: 400, y: 450 },
                data: {
                  speaker: 'Prospect',
                  text: "What about the investment and setup time? I don't want to get locked into something that doesn't deliver."
                }
              },
              {
                id: '5',
                type: 'script',
                position: { x: 0, y: 600 },
                data: {
                  speaker: 'You',
                  text: `We use milestone protection: a 50% deposit reserves your dedicated engineering sprint, and the remaining 50% is only released after you test and approve Milestone 1 staging. Would you be open to ${cta}?`
                }
              },
              {
                id: '6',
                type: 'script',
                position: { x: 400, y: 750 },
                data: {
                  speaker: 'Prospect',
                  text: "That milestone protection makes sense. Send over the details and let's set up a quick walkthrough."
                }
              }
            ],
            edges: [
              { id: 'e1-2', source: '1', target: '2', animated: false },
              { id: 'e2-3', source: '2', target: '3', animated: false },
              { id: 'e3-4', source: '3', target: '4', animated: false },
              { id: 'e4-5', source: '4', target: '5', animated: false },
              { id: 'e5-6', source: '5', target: '6', animated: false }
            ],
            metadata: {
              yourName,
              yourBusiness,
              product,
              niche,
              pain: painPoint,
              cta,
              tone: 'confident & direct',
              difficulty: 'medium',
              prospect: {
                name: 'Hank Miller',
                title: 'Trade Contractor Owner',
                description: 'Busy in truck at job site. Wants practical ROI and straightforward terms.',
                personality: 'Gruff & Practical',
                objectionStyle: 'Challenges jargon, asks about crew adoption and payment terms'
              }
            }
          };

          return { data: generatedScript, error: null };
        }

        if (endpoint === 'generate-prospect-response') {
          return {
            data: {
              response: "That sounds relevant, but how does your payment milestone and setup actually work?"
            },
            error: null
          };
        }

        if (endpoint === 'generate-feedback') {
          return {
            data: {
              strengths: [
                'Clear pattern interrupt tailored to busy contractors',
                'Successfully defended the 50% upfront deposit using milestone escrow',
                'Anchored value on rescued revenue and faster cash flow'
              ],
              improvements: [
                'Quantify the cost of missed emergency calls earlier ($3,000/week)',
                'Give the prospect space to elaborate on their change order headache'
              ]
            },
            error: null
          };
        }

        return { data: {}, error: null };
      }
    }
  };
}

let clientInstance;
if (isConfigured) {
  try {
    clientInstance = createClient(cleanUrl, rawAnonKey);
  } catch (err) {
    console.warn('[AI Studio] Supabase init failed, falling back to mock:', err);
    clientInstance = createMockSupabaseClient();
  }
} else {
  clientInstance = createMockSupabaseClient();
}

export const supabase = clientInstance;

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.supabase = supabase;
}
