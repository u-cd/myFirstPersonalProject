import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uesmrlothnuxcxfsjget.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlc21ybG90aG51eGN4ZnNqZ2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzQ3NjEsImV4cCI6MjA3Nzc1MDc2MX0.nWMZtSd9iwyN2QGNgYnuHpPnUfQ3vyg8tsHAjz78q0g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
