// Dados de contato editaveis pelo painel (aba Configurações). Valores aqui
// sao o fallback usado ate a resposta do Supabase chegar (evita flash vazio).
const DEFAULT_SETTINGS = {
  whatsapp_url: 'https://wa.me/5511973367068',
  instagram_url: 'https://www.instagram.com/omktdokleber/',
  linkedin_url: 'https://www.linkedin.com/in/kleber-s-lago/',
  contact_email: 'klebersimaslago@gmail.com',
};

async function fetchSiteSettings() {
  const { data, error } = await window.sb
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    console.error('Erro ao carregar configurações do site:', error);
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...data };
}

async function submitContactMessage({ name, email, message }) {
  const { error } = await window.sb.from('messages').insert({ name, email, message });
  if (error) throw new Error(error.message);
}

function subscribeToSettingsChanges(onChange) {
  return window.sb
    .channel('site-settings-public-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, onChange)
    .subscribe();
}
