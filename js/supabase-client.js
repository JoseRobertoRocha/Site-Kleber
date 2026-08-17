// Preencha com os dados do seu projeto Supabase (Project Settings > API).
// A anon key é publica por design — a proteção real vem das policies de
// Row Level Security definidas em supabase/schema.sql, não desta chave.
const SUPABASE_URL = 'https://pvuvyzarbsbmlowopjfi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VTOiRks6qgtf-9dMG2jkkg_YytpW8JN';

// autoRefreshToken/persistSession sao o padrao, mas deixamos explicito:
// o SDK so renova o token sozinho enquanto a aba está em primeiro plano
// com o timer rodando. Em aba em segundo plano (comum no celular), a
// renovação pode atrasar — o keepalive em js/admin.js cobre esse caso.
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
