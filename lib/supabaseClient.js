import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsbedmtfdysqfwjxfitx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYmVkbXRmZHlzcWZ3anhmaXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MjQyNDQsImV4cCI6MjA2MjIwMDI0NH0.TjhsVTO-7WOJQHkdD9JSTRuAsSFH1wPX_cQgkBw9h1k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);