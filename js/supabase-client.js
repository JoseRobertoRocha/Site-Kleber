// Preencha com os dados do seu projeto Supabase (Project Settings > API).
// A anon key é publica por design — a proteção real vem das policies de
// Row Level Security definidas em supabase/schema.sql, não desta chave.
const SUPABASE_URL = 'https://eflxktpfreiicjmktuya.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9jUK75ExgNdxVx4i2q6ipg_Tn-5M--R';

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
