import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dasjvafuudjotbaoawrj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhc2p2YWZ1dWRqb3RiYW9hd3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDc0MDYsImV4cCI6MjA3MDA4MzQwNn0.ti3wfv7-sz5jRDsLH4MYvEkXToRIv_rzIxMnCKuKsqk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);