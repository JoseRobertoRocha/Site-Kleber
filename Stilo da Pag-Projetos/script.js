// Lightbox para zoom das imagens
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbClose = document.getElementById('lbClose');

document.querySelectorAll('[data-zoom]').forEach(el=>{
  el.addEventListener('click', ()=>{
    lbImg.src = el.getAttribute('src');
    lb.classList.add('open');
    document.body.style.overflow='hidden';
  });
});

function closeLB(){
  lb.classList.remove('open');
  lbImg.src = '';
  document.body.style.overflow='';
}
lb.addEventListener('click', (e)=>{ if(e.target===lb) closeLB(); });
lbClose.addEventListener('click', closeLB);
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLB(); });