import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get current authenticated user
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Sign in with Google OAuth
export async function signInWithGoogle() {
    try {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Sign in with email (magic link)
export async function signInWithEmail(email) {
    try {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Sign out user
export async function signOut() {
    try {
        await supabase.auth.signOut();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Listen for auth state changes
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}
