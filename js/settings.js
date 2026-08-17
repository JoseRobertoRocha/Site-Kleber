// Dados de contato editaveis pelo painel (aba Configurações). Valores aqui
// sao o fallback usado ate a resposta do Supabase chegar (evita flash vazio).
const DEFAULT_SETTINGS = {
  whatsapp_url: 'https://wa.me/5511973367068',
  instagram_url: 'https://www.instagram.com/omktdokleber/',
  linkedin_url: 'https://www.linkedin.com/in/kleber-s-lago/',
  contact_email: 'klebersimaslago@gmail.com',
};

// Compartilhado entre o formulario publico (principal.html) e o painel
// admin (aba Mensagens), pra rotular subject/status de forma consistente.
const CONTACT_SUBJECTS = [
  { value: 'novo_projeto', label: 'Quero desenvolver um projeto' },
  { value: 'orcamento', label: 'Solicitar orçamento' },
  { value: 'parceria', label: 'Parceria' },
  { value: 'suporte', label: 'Suporte' },
  { value: 'outro_assunto', label: 'Outro assunto' },
];

const MESSAGE_STATUSES = [
  { value: 'nova', label: 'Nova' },
  { value: 'em_atendimento', label: 'Em atendimento' },
  { value: 'respondida', label: 'Respondida' },
  { value: 'arquivada', label: 'Arquivada' },
];

function contactSubjectLabel(value) {
  return CONTACT_SUBJECTS.find(s => s.value === value)?.label || value;
}

function messageStatusLabel(value) {
  return MESSAGE_STATUSES.find(s => s.value === value)?.label || value;
}

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

// honeypot: campo invisivel que só um bot preencheria. Se vier preenchido,
// finge sucesso sem gravar nada — nenhuma pista de que foi filtrado.
async function submitContactMessage({ name, email, subject, message, honeypot }) {
  if (honeypot) return;

  const { error } = await window.sb.from('messages').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject,
    message: message.trim(),
  });
  if (error) throw new Error(error.message);
}

function subscribeToSettingsChanges(onChange) {
  return window.sb
    .channel('site-settings-public-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, onChange)
    .subscribe();
}
