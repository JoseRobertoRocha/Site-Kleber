const yearElement = document.getElementById('yr') || document.getElementById('year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
