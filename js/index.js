function app() {
  return {
    dark: true,
    mm: false,
    sc: false,
    s: 'hero',
    caseOpen: null,
    hireModalOpen: false,
    cases: [],
    settings: { whatsapp_url: '', instagram_url: '', linkedin_url: '', contact_email: '' },
    contactForm: { name: '', email: '', whatsapp: '', subject: 'novo_projeto', message: '', website: '' },
    contactSending: false,
    contactSent: false,
    contactError: '',
    contactSubjects: (typeof CONTACT_SUBJECTS !== 'undefined') ? CONTACT_SUBJECTS : [],
    gx: 50,
    gy: 50,
    formationText: '',
    formationIndex: 0,
    formationChar: 0,
    formationDeleting: false,
    formations: [
      'Comunicação e Marketing - FAAP',
      'Gestão - Fundação Dom Cabral',
      'Mídia - ComSchool'
    ],

    async init() {
      window.addEventListener('scroll', () => {
        this.sc = window.scrollY > 20;
        this.updateSection();
      }, { passive: true });
      this.revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); this.revealObserver.unobserve(e.target); } });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.reveal').forEach(el => this.revealObserver.observe(el));
      document.getElementById('yr').textContent = new Date().getFullYear();
      this.typeFormation();
      this.initCounters();
      this.initBars();

      await this.refreshCases();
      subscribeToProjectChanges(() => this.refreshCases());

      this.settings = await fetchSiteSettings();
      subscribeToSettingsChanges(async () => { this.settings = await fetchSiteSettings(); });
    },

    async refreshCases() {
      this.cases = await fetchFeaturedCases();
      this.$nextTick(() => {
        document.querySelectorAll('.reveal').forEach(el => this.revealObserver.observe(el));
        document.querySelectorAll('.counter').forEach(el => this.counterObserver.observe(el));
      });
    },

    hasDetail(p) {
      return caseHasDetail(p);
    },

    async sendContactMessage() {
      this.contactError = '';
      if (this.contactSending || this.contactSent) return;

      const name = this.contactForm.name.trim();
      const email = this.contactForm.email.trim();
      const whatsapp = this.contactForm.whatsapp.trim();
      const message = this.contactForm.message.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (name.length < 2 || name.length > 100) {
        this.contactError = 'Informe seu nome (2 a 100 caracteres).';
        return;
      }
      if (!emailPattern.test(email)) {
        this.contactError = 'Informe um e-mail válido.';
        return;
      }
      if (whatsapp && whatsapp.replace(/\D/g, '').length < 10) {
        this.contactError = 'Informe um número de WhatsApp válido (com DDD) ou deixe em branco.';
        return;
      }
      if (message.length < 10) {
        this.contactError = 'Conte um pouco mais sobre o que você precisa (mínimo 10 caracteres).';
        return;
      }
      if (message.length > 2000) {
        this.contactError = 'Mensagem muito longa (máximo de 2000 caracteres).';
        return;
      }

      this.contactSending = true;
      try {
        await submitContactMessage({ ...this.contactForm, name, email, whatsapp, message });
        this.contactSent = true;
        this.contactForm = { name: '', email: '', whatsapp: '', subject: 'novo_projeto', message: '', website: '' };
      } catch (err) {
        this.contactError = (err.message && err.message.includes('Aguarde'))
          ? err.message
          : 'Não foi possível enviar. Tente novamente ou chame no WhatsApp.';
      } finally {
        this.contactSending = false;
      }
    },

    typeFormation() {
      const current = this.formations[this.formationIndex];
      this.formationText = current.slice(0, this.formationChar);

      if (!this.formationDeleting && this.formationChar < current.length) {
        this.formationChar++;
        setTimeout(() => this.typeFormation(), 70);
        return;
      }

      if (!this.formationDeleting && this.formationChar === current.length) {
        this.formationDeleting = true;
        setTimeout(() => this.typeFormation(), 1300);
        return;
      }

      if (this.formationDeleting && this.formationChar > 0) {
        this.formationChar--;
        setTimeout(() => this.typeFormation(), 35);
        return;
      }

      this.formationDeleting = false;
      this.formationIndex = (this.formationIndex + 1) % this.formations.length;
      setTimeout(() => this.typeFormation(), 250);
    },

    updateSection() {
      const atBottom = (window.innerHeight + window.scrollY) >= document.body.scrollHeight - 60;
      if (atBottom) { this.s = 'contact'; return; }
      const ids = ['contact', 'certificates', 'about', 'intelligence', 'work', 'services', 'hero'];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 130) { this.s = id; return; }
      }
    },

    // adapts nav link color: transparent header over the dark hero needs
    // light text always; once scrolled past it, the header gets an opaque
    // theme-aware background and the text can follow the theme.
    navLinkClass(id) {
      const active = this.s === id;
      if (!this.sc) {
        return active ? 'text-white on' : 'text-zinc-300 hover:text-white';
      }
      return active
        ? 'text-zinc-900 dark:text-white on'
        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white';
    },

    heroMove(e) {
      const hero = e.currentTarget;
      const rect = hero.getBoundingClientRect();
      this.gx = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      this.gy = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    },

    initCounters() {
      this.counterObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          this.counterObserver.unobserve(entry.target);
          this.animateCounter(entry.target);
        });
      }, { threshold: 0.4 });
      document.querySelectorAll('.counter').forEach(el => this.counterObserver.observe(el));
    },

    animateCounter(el) {
      const rawTarget = el.dataset.target || '0';
      const target = Number.parseFloat(rawTarget);
      const decimals = rawTarget.includes('.') ? rawTarget.split('.')[1].length : 0;
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 1200;
      const start = performance.now();
      const step = now => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    initBars() {
      const els = document.querySelectorAll('.dash-bar-fill');
      if (!els.length) return;
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          const el = entry.target;
          requestAnimationFrame(() => { el.style.width = (el.dataset.width || 0) + '%'; });
        });
      }, { threshold: 0.3 });
      els.forEach(el => io.observe(el));
    }
  }
}
