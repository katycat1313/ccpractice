import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(
  rawUrl &&
  typeof rawUrl === 'string' &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('example.com') &&
  rawAnonKey &&
  typeof rawAnonKey === 'string' &&
  rawAnonKey.length > 20
);

// Starter scripts for initial local state
const INITIAL_SCRIPTS = [
  {
    id: 'script-sample-saas',
    user_id: 'demo-user-id',
    name: 'SaaS Outbound: Reducing Release Cycles',
    nodes: [
      { id: '1', type: 'script', position: { x: 0, y: 0 }, data: { speaker: 'You', text: 'Hi, this is Alex with Brightlane. How are you today?' } },
      { id: '2', type: 'script', position: { x: 400, y: 150 }, data: { speaker: 'Prospect', text: 'I have a minute, go ahead.' } },
      { id: '3', type: 'script', position: { x: 0, y: 300 }, data: { speaker: 'You', text: 'The reason I’m calling is we help SaaS engineering teams using an automated analytics platform to cut slow release cycles in half.' } },
      { id: '4', type: 'script', position: { x: 400, y: 450 }, data: { speaker: 'Prospect', text: 'What does that look like for a team like ours?' } },
      { id: '5', type: 'script', position: { x: 0, y: 600 }, data: { speaker: 'You', text: 'Would you be open to booking a 15-minute quick walkthrough this Thursday?' } }
    ],
    edges: [
      { id: 'e0-1', source: '1', target: '2', animated: false },
      { id: 'e1-2', source: '2', target: '3', animated: false },
      { id: 'e2-3', source: '3', target: '4', animated: false },
      { id: 'e3-4', source: '4', target: '5', animated: false }
    ],
    metadata: {
      yourName: 'Alex',
      yourBusiness: 'Brightlane',
      product: 'analytics platform',
      niche: 'SaaS startups',
      pain: 'slow release cycles',
      cta: 'book a 15-minute demo',
      tone: 'friendly',
      difficulty: 'medium',
      prospect: {
        name: 'Jordan Lee',
        title: 'VP of Engineering',
        description: 'Pragmatic tech leader focused on developer velocity and team efficiency.',
        personality: 'Direct & Analytical',
        objectionStyle: 'Wants to see concrete technical ROI'
      }
    },
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'script-sample-fintech',
    user_id: 'demo-user-id',
    name: 'Fintech Security Solution Cold Call',
    nodes: [
      { id: '1', type: 'script', position: { x: 0, y: 0 }, data: { speaker: 'You', text: 'Hi, this is Taylor with Northstar. How are you doing today?' } },
      { id: '2', type: 'script', position: { x: 400, y: 150 }, data: { speaker: 'Prospect', text: 'Who is this again? What is this regarding?' } },
      { id: '3', type: 'script', position: { x: 0, y: 300 }, data: { speaker: 'You', text: 'I’m calling because we help fintech firms automate compliance reconciliation and prevent audit penalties.' } },
      { id: '4', type: 'script', position: { x: 400, y: 450 }, data: { speaker: 'Prospect', text: 'We already have internal systems handling that.' } },
      { id: '5', type: 'script', position: { x: 0, y: 600 }, data: { speaker: 'You', text: 'That is common! Most clients felt the same until recent regulation updates. Would you be open to a 10-minute comparison call?' } }
    ],
    edges: [
      { id: 'e0-1', source: '1', target: '2', animated: false },
      { id: 'e1-2', source: '2', target: '3', animated: false },
      { id: 'e2-3', source: '3', target: '4', animated: false },
      { id: 'e3-4', source: '4', target: '5', animated: false }
    ],
    metadata: {
      yourName: 'Taylor',
      yourBusiness: 'Northstar',
      product: 'security compliance',
      niche: 'fintech firms',
      pain: 'audit penalties and manual reconciliation',
      cta: 'schedule a 10-minute comparison call',
      tone: 'confident',
      difficulty: 'hard',
      prospect: {
        name: 'Morgan Vance',
        title: 'Head of Risk & Compliance',
        description: 'Cautious risk officer with strict criteria and zero patience for buzzwords.',
        personality: 'Skeptical & Guarded',
        objectionStyle: 'Challenges claims and questions differentiation'
      }
    },
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString()
  }
];

function createMockSupabaseClient() {
  const SESSION_STORAGE_KEY = 'scriptmaster_session';
  const SCRIPTS_STORAGE_KEY = 'scriptmaster_scripts';

  const defaultUser = {
    id: 'demo-user-id',
    email: 'demo@scriptmaster.app',
    user_metadata: {
      name: 'Demo Rep',
      role: 'Sales Representative'
    }
  };

  const getStoredSession = () => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse stored session:', e);
    }
    // Default to active demo session for seamless preview
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
    } catch (e) {
      console.warn('Failed to parse stored scripts:', e);
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
        // Call immediately with initial session
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
    from(_tableName) {
      return {
        select(_columns = '*') {
          let filters = [];
          let sortField = null;
          let sortAscending = true;
          let limitCount = null;

          const executeQuery = () => {
            let scripts = getStoredScripts();
            filters.forEach(({ field, val }) => {
              scripts = scripts.filter((s) => s[field] === val);
            });
            if (sortField) {
              scripts.sort((a, b) => {
                const valA = a[sortField] || '';
                const valB = b[sortField] || '';
                if (valA < valB) return sortAscending ? -1 : 1;
                if (valA > valB) return sortAscending ? 1 : -1;
                return 0;
              });
            }
            if (limitCount !== null) {
              scripts = scripts.slice(0, limitCount);
            }
            return scripts;
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
          const scripts = getStoredScripts();
          const newScript = {
            id: payload.id || 'script-' + Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...payload
          };
          scripts.unshift(newScript);
          saveStoredScripts(scripts);

          const result = { data: [newScript], error: null };
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
                const scripts = getStoredScripts();
                const index = scripts.findIndex((s) => s.id === val);
                if (index !== -1) {
                  scripts[index] = {
                    ...scripts[index],
                    ...payload,
                    updated_at: new Date().toISOString()
                  };
                  updatedItem = scripts[index];
                  saveStoredScripts(scripts);
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
                const scripts = getStoredScripts();
                const filtered = scripts.filter((s) => s.id !== val);
                saveStoredScripts(filtered);
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
          const yourBusiness = body.yourBusiness || 'Peak Solutions';
          const product = body.product || 'our solution';
          const niche = body.niche || 'businesses';
          const painPoint = body.painPoint || 'inefficient workflows';
          const cta = body.cta || 'a quick 15-minute introductory call';

          const generatedScript = {
            name: `${yourBusiness} - Cold Call Script`,
            nodes: [
              {
                id: '1',
                type: 'script',
                position: { x: 0, y: 0 },
                data: {
                  speaker: 'You',
                  text: `Hi, this is ${yourName} with ${yourBusiness}. How are you today?`
                }
              },
              {
                id: '2',
                type: 'script',
                position: { x: 400, y: 150 },
                data: {
                  speaker: 'Prospect',
                  text: "I'm in the middle of something. What is this regarding?"
                }
              },
              {
                id: '3',
                type: 'script',
                position: { x: 0, y: 300 },
                data: {
                  speaker: 'You',
                  text: `I'll be brief. We help ${niche} using ${product} to resolve ${painPoint}.`
                }
              },
              {
                id: '4',
                type: 'script',
                position: { x: 400, y: 450 },
                data: {
                  speaker: 'Prospect',
                  text: "How exactly do you help with that compared to what we're doing now?"
                }
              },
              {
                id: '5',
                type: 'script',
                position: { x: 0, y: 600 },
                data: {
                  speaker: 'You',
                  text: `Great question. Would you be open to ${cta} so I can share a tailored overview?`
                }
              },
              {
                id: '6',
                type: 'script',
                position: { x: 400, y: 750 },
                data: {
                  speaker: 'Prospect',
                  text: "Sure, let's schedule 15 minutes."
                }
              },
              {
                id: '7',
                type: 'script',
                position: { x: 0, y: 900 },
                data: {
                  speaker: 'You',
                  text: "Awesome, I'll send an invite to your calendar right away. Looking forward to it!"
                }
              }
            ],
            edges: [
              { id: 'e1-2', source: '1', target: '2', animated: false },
              { id: 'e2-3', source: '2', target: '3', animated: false },
              { id: 'e3-4', source: '3', target: '4', animated: false },
              { id: 'e4-5', source: '4', target: '5', animated: false },
              { id: 'e5-6', source: '5', target: '6', animated: false },
              { id: 'e6-7', source: '6', target: '7', animated: false }
            ],
            metadata: {
              yourName,
              yourBusiness,
              product,
              niche,
              pain: painPoint,
              cta,
              tone: 'confident',
              difficulty: 'medium',
              prospect: {
                name: 'Jamie Taylor',
                title: 'Decision Maker',
                description: 'Professional and pragmatic. Polite but cautious with unsolicited calls.',
                personality: 'Professional & Neutral',
                objectionStyle: 'Asks clarifying questions, wants to understand value'
              }
            }
          };

          return { data: generatedScript, error: null };
        }

        if (endpoint === 'generate-prospect-response') {
          return {
            data: {
              response: "That sounds relevant, but what kind of results are other teams seeing?"
            },
            error: null
          };
        }

        if (endpoint === 'generate-feedback') {
          return {
            data: {
              strengths: [
                'Clear and professional introduction',
                'Addressed pain points directly',
                'Confident closing call to action'
              ],
              improvements: [
                'Pause slightly after questions to give the prospect space',
                'Quantify business impact earlier in the conversation'
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
    clientInstance = createClient(rawUrl, rawAnonKey);
  } catch (err) {
    console.warn('[AI Studio] Supabase init failed, falling back to mock:', err);
    clientInstance = createMockSupabaseClient();
  }
} else {
  clientInstance = createMockSupabaseClient();
}

export const supabase = clientInstance;

// For debugging in browser console
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.supabase = supabase;
}
