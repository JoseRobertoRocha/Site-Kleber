// Leitura publica dos projetos (usada por principal.html e projetos.html).
// Escrita fica em js/admin.js, exclusiva do painel autenticado.

async function fetchFeaturedCases() {
  const { data, error } = await window.sb
    .from('projects')
    .select('*')
    .eq('published', true)
    .eq('featured', true)
    .order('display_order', { ascending: true });

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

function caseHasDetail(p) {
  if (!p) return false;
  return Boolean(
    (p.detail_quick_facts && p.detail_quick_facts.length) ||
    (p.detail_paragraphs && p.detail_paragraphs.length) ||
    p.detail_highlight ||
    (p.detail_action_items && p.detail_action_items.length)
  );
}
