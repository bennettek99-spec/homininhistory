/* Shared site behaviour: theme, nav/footer injection, scroll reveal, progress */
(function(){
  const LOGO = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 27c2.2-1 3.4-3.2 3.4-6.2 0-3.4-1.8-5.2-1.8-8.4C5.6 8 9 5 13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M13 5c3.3 0 5.2 2.1 5.2 5 0 2.4-1.4 3.7-1.4 6 0 2.1 1.3 3.2 1.3 5.6 0 3-1.9 5.4-4.6 5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="22.5" cy="9.5" r="3.2" stroke="currentColor" stroke-width="2"/>
    <path d="M25 12.5l3.4 3.4M21 21l4-2.6 3 3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const SUN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const MOON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function buildNav(active){
    const links = [["index.html","Timeline"],["migration.html","Migrations"],["proteins.html","Molecules"],["blog/index.html","Articles"],["#about","About"]];
    const nav = document.createElement('header');
    nav.className='nav';
    nav.innerHTML = `<div class="wrap nav-in">
      <a class="brand" href="index.html">${LOGO}<span>The Long Walk</span></a>
      <nav class="nav-links">
        ${links.map(([h,t])=>`<a href="${h}" class="${active===h?'active':''}">${t}</a>`).join('')}
        <button class="icon-btn" data-theme-toggle aria-label="Toggle theme"></button>
      </nav></div>`;
    document.body.prepend(nav);
    const prog=document.createElement('div');prog.className='scroll-prog';document.body.prepend(prog);
  }
  function buildFooter(){
    const f=document.createElement('footer');f.className='site-foot';f.id='about';
    f.innerHTML=`<div class="wrap">
      <div>
        <a class="brand" href="index.html">${LOGO}<span>The Long Walk</span></a>
        <p style="margin-top:.7rem">An interactive journey through human evolution and the genomic record of where our species travelled. Built as a science-communication project — species accounts from museum and primary sources; migration analysis computed from the Allen Ancient DNA Resource (AADR v66.p1).</p>
      </div>
      <p>Reconstruction portraits are interpretive illustrations.<br>Data &middot; AADR / Harvard Dataverse &middot; doi:10.7910/DVN/FFIDCW<br>&copy; ${new Date().getFullYear()} — for education & research.</p>
    </div>`;
    document.body.appendChild(f);
  }
  function theme(){
    const r=document.documentElement;
    let d=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
    r.setAttribute('data-theme',d);
    const btn=document.querySelector('[data-theme-toggle]');
    const paint=()=>{btn.innerHTML=d==='dark'?SUN:MOON;};
    paint();
    btn&&btn.addEventListener('click',()=>{d=d==='dark'?'light':'dark';r.setAttribute('data-theme',d);paint();
      window.dispatchEvent(new CustomEvent('themechange',{detail:d}));});
  }
  function reveal(){
    const els=document.querySelectorAll('.reveal');
    if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('in'));return;}
    const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
    els.forEach(e=>io.observe(e));
  }
  function progress(){
    const bar=document.querySelector('.scroll-prog');
    const on=()=>{const h=document.documentElement;const s=h.scrollTop/(h.scrollHeight-h.clientHeight||1);bar.style.width=(s*100)+'%';};
    document.addEventListener('scroll',on,{passive:true});on();
  }
  window.SITE={init(active){buildNav(active);buildFooter();theme();reveal();progress();}};
})();
