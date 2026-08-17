function emptyForm() {
  return {
    title: '',
    slug: '',
    category: '',
    lead: '',
    description: '',
    case_color: '#FF6B2B',
    tagsInput: '',
    metrics: [],
    main_image_url: null,
    gallery: [],
    external_link_label: '',
    external_link_url: '',
    detail_quick_facts: [],
    detail_paragraphs: [],
    detail_highlight: '',
    detail_action_items: [],
    published: true,
    display_order: 0,
  };
}

function slugify(text) {
  const combiningMarks = new RegExp('[\\u0300-\\u036f]', 'g');
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(combiningMarks, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function adminApp() {
  return {
    session: null,
    loginEmail: '',
    loginPassword: '',
    loginError: '',
    loggingIn: false,

    projects: [],
    loadingProjects: false,

    formOpen: false,
    editingId: null,
    form: emptyForm(),
    saving: false,
    saveError: '',
    uploadingMain: false,
    uploadingGallery: false,

    async init() {
      const { data: { session } } = await window.sb.auth.getSession();
      this.session = session;
      if (this.session) this.loadProjects();

      window.sb.auth.onAuthStateChange((_event, session) => {
        this.session = session;
        if (this.session) this.loadProjects();
      });
    },

    async login() {
      this.loginError = '';
      this.loggingIn = true;
      const { error } = await window.sb.auth.signInWithPassword({
        email: this.loginEmail,
        password: this.loginPassword,
      });
      this.loggingIn = false;
      if (error) this.loginError = 'E-mail ou senha inválidos.';
    },

    async logout() {
      await window.sb.auth.signOut();
      this.projects = [];
      this.formOpen = false;
    },

    async loadProjects() {
      this.loadingProjects = true;
      const { data, error } = await window.sb
        .from('projects')
        .select('*')
        .order('display_order', { ascending: true });
      this.loadingProjects = false;
      if (error) {
        console.error(error);
        return;
      }
      this.projects = data || [];
    },

    openNew() {
      this.editingId = null;
      this.form = emptyForm();
      const maxOrder = this.projects.reduce((max, p) => Math.max(max, p.display_order || 0), 0);
      this.form.display_order = maxOrder + 1;
      this.saveError = '';
      this.formOpen = true;
    },

    openEdit(p) {
      this.editingId = p.id;
      this.form = {
        title: p.title || '',
        slug: p.slug || '',
        category: p.category || '',
        lead: p.lead || '',
        description: p.description || '',
        case_color: p.case_color || '#FF6B2B',
        tagsInput: (p.tags || []).join(', '),
        metrics: JSON.parse(JSON.stringify(p.metrics || [])),
        main_image_url: p.main_image_url || null,
        gallery: JSON.parse(JSON.stringify(p.gallery || [])),
        external_link_label: p.external_link_label || '',
        external_link_url: p.external_link_url || '',
        detail_quick_facts: JSON.parse(JSON.stringify(p.detail_quick_facts || [])),
        detail_paragraphs: JSON.parse(JSON.stringify(p.detail_paragraphs || [])),
        detail_highlight: p.detail_highlight || '',
        detail_action_items: JSON.parse(JSON.stringify(p.detail_action_items || [])),
        published: !!p.published,
        display_order: p.display_order || 0,
      };
      this.saveError = '';
      this.formOpen = true;
    },

    closeForm() {
      this.formOpen = false;
    },

    autoSlug() {
      if (!this.editingId) this.form.slug = slugify(this.form.title);
    },

    async getAccessToken() {
      const { data: { session } } = await window.sb.auth.getSession();
      return session?.access_token;
    },

    async uploadFile(file) {
      const token = await this.getAccessToken();
      const res = await fetch('/api/r2-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Falha ao preparar upload');
      }
      const { uploadUrl, publicUrl } = await res.json();

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('Falha ao enviar imagem');

      return publicUrl;
    },

    async uploadMainImage(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.uploadingMain = true;
      try {
        this.form.main_image_url = await this.uploadFile(file);
      } catch (err) {
        this.saveError = err.message;
      } finally {
        this.uploadingMain = false;
        event.target.value = '';
      }
    },

    async addGalleryImage(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.uploadingGallery = true;
      try {
        const url = await this.uploadFile(file);
        this.form.gallery.push({ url, alt: '' });
      } catch (err) {
        this.saveError = err.message;
      } finally {
        this.uploadingGallery = false;
        event.target.value = '';
      }
    },

    async save() {
      this.saveError = '';
      if (!this.form.title.trim()) {
        this.saveError = 'Título é obrigatório.';
        return;
      }
      const slug = slugify(this.form.slug || this.form.title);
      if (!slug) {
        this.saveError = 'Slug inválido.';
        return;
      }

      const payload = {
        slug,
        title: this.form.title.trim(),
        category: this.form.category.trim(),
        lead: this.form.lead.trim(),
        description: this.form.description.trim(),
        case_color: this.form.case_color,
        tags: this.form.tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        metrics: this.form.metrics
          .filter(m => m.label && m.value !== '' && m.value !== null)
          .map(m => ({ value: Number(m.value), prefix: m.prefix || '', suffix: m.suffix || '', label: m.label })),
        main_image_url: this.form.main_image_url,
        gallery: this.form.gallery.filter(g => g.url),
        external_link_label: this.form.external_link_label.trim() || null,
        external_link_url: this.form.external_link_url.trim() || null,
        detail_quick_facts: this.form.detail_quick_facts.filter(f => f.label || f.value),
        detail_paragraphs: this.form.detail_paragraphs.filter(p => p && p.trim()),
        detail_highlight: this.form.detail_highlight.trim() || null,
        detail_action_items: this.form.detail_action_items.filter(a => a && a.trim()),
        published: this.form.published,
        display_order: Number(this.form.display_order) || 0,
      };

      this.saving = true;
      const query = this.editingId
        ? window.sb.from('projects').update(payload).eq('id', this.editingId)
        : window.sb.from('projects').insert(payload);
      const { error } = await query;
      this.saving = false;

      if (error) {
        this.saveError = error.message;
        return;
      }
      this.formOpen = false;
      this.loadProjects();
    },

    async remove(p) {
      if (!confirm(`Excluir "${p.title}"? Essa ação não pode ser desfeita.`)) return;
      const { error } = await window.sb.from('projects').delete().eq('id', p.id);
      if (error) {
        alert(error.message);
        return;
      }
      this.loadProjects();
    },

    async togglePublished(p) {
      const { error } = await window.sb.from('projects').update({ published: !p.published }).eq('id', p.id);
      if (error) { alert(error.message); return; }
      this.loadProjects();
    },

    async moveUp(idx) {
      if (idx === 0) return;
      await this.swapOrder(this.projects[idx], this.projects[idx - 1]);
    },

    async moveDown(idx) {
      if (idx === this.projects.length - 1) return;
      await this.swapOrder(this.projects[idx], this.projects[idx + 1]);
    },

    async swapOrder(a, b) {
      const [orderA, orderB] = [a.display_order, b.display_order];
      await Promise.all([
        window.sb.from('projects').update({ display_order: orderB }).eq('id', a.id),
        window.sb.from('projects').update({ display_order: orderA }).eq('id', b.id),
      ]);
      this.loadProjects();
    },
  };
}
