// Preencha com os dados do seu projeto Supabase (Project Settings > API).
// A anon key é publica por design — a proteção real vem das policies de
// Row Level Security definidas em supabase/schema.sql, não desta chave.
const SUPABASE_URL = 'https://dsjckzvtttgmefjtacti.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Sst-n-8Q5_PC3EDiYrrLKQ_OF-DEpsx';

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
