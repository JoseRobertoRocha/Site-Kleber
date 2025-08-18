const $  = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => root.querySelectorAll(s);
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

// =========================
// Menu dinâmico (drawer)
// =========================
const html        = document.documentElement;
const menuToggle  = $("#menuToggle");
const navBackdrop = $("#navBackdrop");
const siteNav     = $("#site-nav");
const DESKTOP_BP  = 980;

if (siteNav) {
  siteNav.setAttribute("role", siteNav.getAttribute("role") || "navigation");
  siteNav.setAttribute("tabindex", "-1");
}

let prevScrollY = 0;
let restoreBodyPadding = "";

function lockScroll(){
  const scrollBarW = window.innerWidth - document.documentElement.clientWidth;
  restoreBodyPadding = document.body.style.paddingRight;
  if (scrollBarW > 0) document.body.style.paddingRight = `${scrollBarW}px`;
  prevScrollY = window.scrollY;
  document.body.style.top = `-${prevScrollY}px`;
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
}
function unlockScroll(){
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.paddingRight = restoreBodyPadding || "";
  window.scrollTo(0, prevScrollY || 0);
}
const isMenuOpen = () => html.classList.contains("nav-open");

function openMenu(){
  if (!menuToggle || !siteNav) return;
  html.classList.add("nav-open");
  menuToggle.setAttribute("aria-expanded","true");
  if (navBackdrop) navBackdrop.hidden = false;
  lockScroll();
  siteNav.focus();
}
function closeMenu(){
  if (!menuToggle || !siteNav) return;
  html.classList.remove("nav-open");
  menuToggle.setAttribute("aria-expanded","false");
  if (navBackdrop) navBackdrop.hidden = true;
  unlockScroll();
  menuToggle.focus();
}

// Toggle
on(menuToggle, "click", ()=> isMenuOpen() ? closeMenu() : openMenu());

// Fecha ao clicar no backdrop
on(navBackdrop, "click", closeMenu);

// Fecha ao clicar em qualquer link do menu
$$("#site-nav a").forEach(a => on(a, "click", closeMenu));

// Fecha com ESC
on(document, "keydown", (e)=>{ if (e.key === "Escape" && isMenuOpen()) closeMenu(); });

// Fecha ao redimensionar para desktop (debounce leve)
let resizeT;
on(window, "resize", ()=>{
  clearTimeout(resizeT);
  resizeT = setTimeout(()=>{
    if (window.innerWidth > DESKTOP_BP && isMenuOpen()) closeMenu();
  }, 120);
});

// Fecha ao clicar fora
on(document, "pointerdown", (e)=>{
  if (!isMenuOpen()) return;
  if (siteNav?.contains(e.target)) return;
  if (menuToggle?.contains(e.target)) return;
  closeMenu();
});

// Swipe para fechar (mobile)
let touchStartX = null, touchStartY = null;
on(siteNav, "touchstart", (e)=>{
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
}, {passive:true});
on(siteNav, "touchmove", (e)=>{
  if (touchStartX == null) return;
  const t = e.touches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.abs(dx) > 40 && Math.abs(dy) < 30 && dx > 0) {
    closeMenu();
    touchStartX = touchStartY = null;
  }
}, {passive:true});
on(siteNav, "touchend", ()=>{ touchStartX = touchStartY = null; });

// Focus trap simples no drawer
on(document, "keydown", (e)=>{
  if (!isMenuOpen() || e.key !== "Tab") return;
  const focusables = Array.from(siteNav.querySelectorAll([
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([type='hidden']):not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",")));
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last  = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
});

// =========================
// Footer: ano corrente
// =========================
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// =========================
// Modal (se usar)
// =========================
const modal        = $("#modal");
const modalClose   = $("#modalClose");
const modalContent = $("#modalContent");

function openModal(html){
  if (!modal || !modalContent) return;
  modalContent.innerHTML = html;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  lockScroll();
  modalClose?.focus();
}
function closeModal(){
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  unlockScroll();
}
on(modalClose, "click", closeModal);
on(modal, "click", (e)=>{ if (e.target === modal) closeModal(); });
on(document, "keydown", (e)=>{ if (e.key === "Escape" && modal?.classList.contains("show")) closeModal(); });

// =========================
// WhatsApp CTA (igual ao seu, resumido)
// =========================
(function(){
  const $cta  = document.getElementById('waCta');
  const $wrap = $cta?.closest('.wa-cta');
  const $tip  = $wrap?.querySelector('.wa-tip');
  if (!$cta || !$wrap) return;

  const obs = new IntersectionObserver(([entry])=>{
    if (entry.isIntersecting) { $wrap.classList.add('in-view'); obs.disconnect(); }
  }, { threshold: .35 });
  obs.observe($wrap);

  function ripple(e){
    const rect = $cta.getBoundingClientRect();
    const x = (e.clientX ?? (e.touches?.[0]?.clientX || 0)) - rect.left;
    const y = (e.clientY ?? (e.touches?.[0]?.clientY || 0)) - rect.top;
    const r = document.createElement('span');
    r.className = 'wa-ripple';
    r.style.left = x + 'px';
    r.style.top  = y + 'px';
    $cta.appendChild(r);
    r.addEventListener('animationend', ()=> r.remove());
  }

  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);

  function openWA(){
    const phone = $cta.getAttribute('data-phone') || '5511973367068';
    const text  = ($cta.getAttribute('data-text') || 'Olá, quero falar sobre marketing e conteúdo!').trim();
    const msg   = encodeURIComponent(text);
    const appLink = `whatsapp://send?phone=${phone}&text=${msg}`;
    const webLink = `https://wa.me/${phone}?text=${msg}`;

    if ($tip) { $tip.textContent = 'Abrindo WhatsApp…'; setTimeout(()=> $tip.textContent = '', 2500); }
    if (isMobile) {
      const t = setTimeout(()=> { window.open(webLink, '_blank', 'noopener'); }, 500);
      window.location.href = appLink;
      setTimeout(()=> clearTimeout(t), 1200);
    } else {
      window.open(webLink, '_blank', 'noopener');
    }
  }

  on($cta, "click", (e)=>{ ripple(e); openWA(); });
  on($cta, "touchstart", (e)=>{ ripple(e); }, {passive:true});
  on($cta, "keydown", (e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWA(); } });
})();