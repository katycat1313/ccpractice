export const supabase = {
  from: () => ({
    select: () => ({
      order: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
        then: (resolve) => resolve({ data: [], error: null })
      }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        then: (resolve) => resolve({ data: [], error: null })
      }),
      then: (resolve) => resolve({ data: [], error: null })
    }),
    insert: () => ({
      select: () => Promise.resolve({ data: [{}], error: null }),
      then: (resolve) => resolve({ data: [{}], error: null })
    }),
    update: () => ({
      eq: () => ({
        select: () => Promise.resolve({ data: [{}], error: null }),
        then: (resolve) => resolve({ data: [{}], error: null })
      })
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    })
  }),
  functions: {
    invoke: () => Promise.resolve({ data: { response: "Test prospect reply" }, error: null })
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
};
