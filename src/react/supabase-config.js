import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic runtime validation to avoid accidentally using a service-role key client-side
function assertAnonKey(key) {
	if (!key) throw new Error('supabase error');
	// Service-role keys typically contain 'service_role' in JWT claims; naive guard:
	if (String(key).toLowerCase().includes('service_role')) {
		throw new Error('supabase error');
	}
}

if (!SUPABASE_URL) throw new Error('supabase error');
assertAnonKey(SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
