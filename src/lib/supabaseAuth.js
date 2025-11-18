import { supabase } from '../../supabaseClient.js';

export async function signUp({ email, password, data = {} }) {
  try {
    const res = await supabase.auth.signUp({ email, password }, { data });
    return res; // { data, error }
  } catch (err) {
    return { error: err };
  }
}

export async function signIn({ email, password }) {
  try {
    const res = await supabase.auth.signInWithPassword({ email, password });
    return res;
  } catch (err) {
    return { error: err };
  }
}

export async function resetPassword(email) {
  try {
    const res = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return res;
  } catch (err) {
    return { error: err };
  }
}

export async function signOut() {
  try {
    return await supabase.auth.signOut();
  } catch (err) {
    return { error: err };
  }
}

export async function getUser() {
  try {
    const res = await supabase.auth.getUser();
    return res; // { data: { user }, error }
  } catch (err) {
    return { error: err };
  }
}

export async function getSession() {
  try {
    const res = await supabase.auth.getSession();
    return res;
  } catch (err) {
    return { error: err };
  }
}

export async function updateUser(data) {
  try {
    const res = await supabase.auth.updateUser({ data });
    return res;
  } catch (err) {
    return { error: err };
  }
}
