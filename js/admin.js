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
    main_image_name: '',
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

    tab: 'dashboard',

    projects: [],
    loadingProjects: false,

    formOpen: false,
    editingId: null,
    form: emptyForm(),
    saving: false,
    saveError: '',
    uploadingMain: false,
    uploadingGallery: false,

    messages: [],
    loadingMessages: false,

    settingsForm: { whatsapp_url: '', instagram_url: '', linkedin_url: '', contact_email: '' },
    settingsError: '',
    settingsSaved: false,
    savingSettings: false,
    newPassword: '',
    passwordError: '',
    passwordSaved: false,
    savingPassword: false,

    logs: [],
    sessionExpired: false,

    storageUsedBytes: 0,
    storageLimitBytes: 10 * 1024 * 1024 * 1024,
    loadingStorage: false,
    storageError: '',

    get unreadCount() {
      return this.messages.filter(m => !m.is_read).length;
    },

    get storagePercent() {
      return this.storageLimitBytes ? Math.min((this.storageUsedBytes / this.storageLimitBytes) * 100, 100) : 0;
    },

    get storageUsedLabel() {
      return (this.storageUsedBytes / (1024 ** 3)).toFixed(2) + ' GB';
    },

    get storageLimitLabel() {
      return (this.storageLimitBytes / (1024 ** 3)).toFixed(0) + ' GB';
    },

    log(level, message) {
      this.logs.unshift({ level, message, time: new Date().toLocaleTimeString('pt-BR') });
      if (this.logs.length > 200) this.logs.length = 200;
    },

    // Marca a sessao como expirada quando um erro bate com os padroes que o
    // Supabase/nossas functions usam pra token invalido/vencido — mostra o
    // aviso fixo no topo em vez de deixar cada tela falhar silenciosamente.
    checkAuthError(message) {
      const m = (message || '').toLowerCase();
      if (m.includes('sessão inválida') || m.includes('jwt expired') || m.includes('invalid claim') || m.includes('token de autenticação ausente') || m.includes('session_not_found')) {
        this.sessionExpired = true;
      }
    },

    async init() {
      const { data: { session } } = await window.sb.auth.getSession();
      this.session = session;
      if (this.session) this.loadAll();

      window.sb.auth.onAuthStateChange((_event, session) => {
        const wasLoggedOut = !this.session;
        this.session = session;
        if (this.session && wasLoggedOut) this.loadAll();
      });

      // Renovacao proativa: o timer interno do SDK so roda com a aba em
      // primeiro plano. Checamos a cada 4 min, e de novo assim que a aba
      // volta a ficar visivel (celular costuma suspender o timer em
      // segundo plano, o que fazia a sessao "expirar" bem antes de 1h).
      setInterval(() => this.keepSessionAlive(), 4 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.keepSessionAlive();
      });
    },

    async keepSessionAlive() {
      if (!this.session) return;
      const { data: { session } } = await window.sb.auth.getSession();
      if (!session) return;
      const expiresInSeconds = session.expires_at - Math.floor(Date.now() / 1000);
      if (expiresInSeconds < 10 * 60) {
        const { data, error } = await window.sb.auth.refreshSession();
        if (error) {
          this.log('error', `Falha ao renovar sessão: ${error.message}`);
          return;
        }
        this.session = data.session;
        this.log('info', 'Sessão renovada automaticamente.');
      }
    },

    loadAll() {
      this.loadProjects();
      this.loadMessages();
      this.loadSettings();
      this.loadStorageUsage();
    },

    async loadStorageUsage() {
      this.loadingStorage = true;
      this.storageError = '';
      try {
        const token = await this.getAccessToken();
        if (!token) throw new Error('Sessão sem token de acesso — tente sair e entrar de novo.');
        const res = await fetch('/api/r2-usage', { headers: { Authorization: `Bearer ${token}` } });
        const rawText = await res.text();
        let body = {};
        try { body = JSON.parse(rawText); } catch { /* corpo nao era JSON */ }
        if (!res.ok) throw new Error(body.error || rawText || `HTTP ${res.status}`);
        this.storageUsedBytes = body.usedBytes;
        this.storageLimitBytes = body.limitBytes;
      } catch (err) {
        this.storageError = err.message;
        this.log('error', `Armazenamento: ${err.message}`);
        this.checkAuthError(err.message);
      } finally {
        this.loadingStorage = false;
      }
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
      else this.sessionExpired = false;
    },

    async logout() {
      await window.sb.auth.signOut();
      this.projects = [];
      this.messages = [];
      this.formOpen = false;
      this.tab = 'dashboard';
      this.sessionExpired = false;
    },

    async loadProjects() {
      this.loadingProjects = true;
      const { data, error } = await window.sb
        .from('projects')
        .select('*')
        .order('display_order', { ascending: true });
      this.loadingProjects = false;
      if (error) {
        this.log('error', `Falha ao carregar projetos: ${error.message}`);
        this.checkAuthError(error.message);
        return;
      }
      this.projects = data || [];
    },

    async loadMessages() {
      this.loadingMessages = true;
      const { data, error } = await window.sb
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
      this.loadingMessages = false;
      if (error) {
        this.log('error', `Falha ao carregar mensagens: ${error.message}`);
        this.checkAuthError(error.message);
        return;
      }
      this.messages = data || [];
    },

    async toggleMessageRead(m) {
      const { error } = await window.sb.from('messages').update({ is_read: !m.is_read }).eq('id', m.id);
      if (error) { this.log('error', error.message); return; }
      this.loadMessages();
    },

    async removeMessage(m) {
      if (!confirm(`Excluir mensagem de "${m.name}"?`)) return;
      const { error } = await window.sb.from('messages').delete().eq('id', m.id);
      if (error) { this.log('error', error.message); return; }
      this.log('info', `Mensagem de ${m.name} excluída.`);
      this.loadMessages();
    },

    async updateMessageStatus(m, status) {
      const { error } = await window.sb.from('messages').update({ status }).eq('id', m.id);
      if (error) { this.log('error', error.message); return; }
      this.loadMessages();
    },

    // Se a mensagem trouxe um numero de WhatsApp, abre a conversa direto
    // com esse contato. Sem numero, abre sem destinatario fixo — o admin
    // escolhe o contato na hora, ja com a mensagem de abertura pronta.
    openWhatsApp(m) {
      const text = `Olá ${m.name}! Recebi sua mensagem pelo site sobre "${contactSubjectLabel(m.subject)}":\n\n"${m.message}"\n\nVamos conversar?`;
      const digits = (m.whatsapp || '').replace(/\D/g, '');
      const phone = digits ? (digits.length <= 11 ? `55${digits}` : digits) : '';
      const url = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
    },

    async loadSettings() {
      const { data, error } = await window.sb.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (error) {
        this.log('error', `Falha ao carregar configurações: ${error.message}`);
        return;
      }
      if (data) {
        this.settingsForm = {
          whatsapp_url: data.whatsapp_url || '',
          instagram_url: data.instagram_url || '',
          linkedin_url: data.linkedin_url || '',
          contact_email: data.contact_email || '',
        };
      }
    },

    async saveSettings() {
      this.settingsError = '';
      this.settingsSaved = false;
      this.savingSettings = true;
      const { error } = await window.sb.from('site_settings').update(this.settingsForm).eq('id', 1);
      this.savingSettings = false;
      if (error) {
        this.settingsError = error.message;
        this.log('error', `Falha ao salvar configurações: ${error.message}`);
        return;
      }
      this.settingsSaved = true;
      this.log('info', 'Configurações de contato atualizadas.');
      setTimeout(() => { this.settingsSaved = false; }, 3000);
    },

    async changePassword() {
      this.passwordError = '';
      this.passwordSaved = false;
      if (this.newPassword.length < 6) {
        this.passwordError = 'A senha precisa ter pelo menos 6 caracteres.';
        return;
      }
      this.savingPassword = true;
      const { error } = await window.sb.auth.updateUser({ password: this.newPassword });
      this.savingPassword = false;
      if (error) {
        this.passwordError = error.message;
        this.log('error', `Falha ao trocar senha: ${error.message}`);
        return;
      }
      this.newPassword = '';
      this.passwordSaved = true;
      this.log('info', 'Senha do admin trocada.');
      setTimeout(() => { this.passwordSaved = false; }, 3000);
    },

    openNew() {
      this.editingId = null;
      this.form = emptyForm();
      const minOrder = this.projects.reduce((min, p) => Math.min(min, p.display_order || 0), 0);
      this.form.display_order = minOrder - 1;
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
        main_image_name: p.main_image_url ? 'Imagem atual' : '',
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
      this.log('info', `Pedindo URL de upload para "${file.name}" (${file.type})…`);
      const token = await this.getAccessToken();
      const res = await fetch('/api/r2-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size }),
      });
      if (!res.ok) {
        const rawText = await res.text().catch(() => '');
        let message = rawText;
        try { message = JSON.parse(rawText).error || rawText; } catch { /* corpo nao era JSON */ }
        this.log('error', `/api/r2-upload-url respondeu ${res.status}: ${message || '(sem corpo)'}`);
        this.checkAuthError(message);
        throw new Error(message || 'Falha ao preparar upload');
      }
      const { uploadUrl, publicUrl } = await res.json();
      this.log('info', 'URL de upload recebida, enviando arquivo para o R2…');

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) {
        this.log('error', `Upload PUT ao R2 respondeu ${putRes.status}`);
        throw new Error('Falha ao enviar imagem');
      }

      this.log('info', `Upload concluído: ${publicUrl}`);
      this.loadStorageUsage();
      return publicUrl;
    },

    async uploadMainImage(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.uploadingMain = true;
      try {
        this.form.main_image_url = await this.uploadFile(file);
        this.form.main_image_name = file.name;
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
        this.log('error', `Falha ao salvar projeto "${payload.title}": ${error.message}`);
        this.checkAuthError(error.message);
        return;
      }
      this.log('info', `Projeto "${payload.title}" salvo.`);
      this.formOpen = false;
      this.loadProjects();
    },

    async remove(p) {
      if (!confirm(`Excluir "${p.title}"? Essa ação não pode ser desfeita.`)) return;
      const { error } = await window.sb.from('projects').delete().eq('id', p.id);
      if (error) {
        alert(error.message);
        this.log('error', `Falha ao excluir "${p.title}": ${error.message}`);
        return;
      }
      this.log('info', `Projeto "${p.title}" excluído.`);
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
