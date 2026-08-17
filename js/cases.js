// Leitura publica dos projetos (usada por principal.html e projetos.html).
// Escrita fica em js/admin.js, exclusiva do painel autenticado.

// Home mostra sempre os 3 projetos publicados mais recentes — automatico,
// sem curadoria manual no painel.
async function fetchFeaturedCases() {
  const { data, error } = await window.sb
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Erro ao carregar projetos em destaque:', error);
    return [];
  }
  return data || [];
}

async function fetchAllCases() {
  const { data, error } = await window.sb
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Erro ao carregar projetos:', error);
    return [];
  }
  return data || [];
}

// x-data usado por projetos.html (lightbox + lista completa de cases).
function casesPage() {
  return {
    zoomImg: null,
    cases: [],

    async init() {
      await this.refresh();
      subscribeToProjectChanges(() => this.refresh());
    },

    async refresh() {
      this.cases = await fetchAllCases();
      this.$nextTick(() => {
        const obs = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('visible');
              obs.unobserve(e.target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
        document.querySelectorAll('#cases-list .reveal').forEach(el => obs.observe(el));
      });
    }
  };
}

// Reexecuta onChange sempre que a tabela projects mudar (insert/update/delete),
// pra pagina publica atualizar sozinha sem precisar de F5. Exige que a
// replicacao Realtime esteja habilitada pra tabela "projects" no Supabase.
function subscribeToProjectChanges(onChange) {
  return window.sb
    .channel('projects-public-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, onChange)
    .subscribe();
}

function caseHasDetail(p) {
  if (!p) return false;
  return Boolean(
    (p.detail_quick_facts && p.detail_quick_facts.length) ||
    (p.detail_paragraphs && p.detail_paragraphs.length) ||
    p.detail_highlight ||
    (p.detail_action_items && p.detail_action_items.length)
  );
}
