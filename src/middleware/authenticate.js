const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function authenticate(req, res, next) {
    try {
        if (!supabase) return res.status(500).json({ error: '' });
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(400).json({ error: '' });
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data || !data.user) return res.status(400).json({ error: '' });
        req.authUser = data.user;
        next();
    } catch {
        return res.status(400).json({ error: '' });
    }
}

module.exports = { authenticate };
