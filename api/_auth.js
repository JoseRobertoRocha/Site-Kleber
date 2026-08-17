const { createClient } = require('@supabase/supabase-js');

async function requireUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'Token de autenticação ausente', status: 401 };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { error: 'Sessão inválida', status: 401 };

  return { user };
}

module.exports = { requireUser };
