/* Renders one species' full multi-section report from window.SPECIES */
function renderSpecies(){
  const id=(location.hash||'').replace(/^#/,'') || new URLSearchParams(location.search).get('id');
  const list=window.SPECIES;
  let i=list.findIndex(s=>s.id===id);
  if(i<0)i=0;
  const s=list[i];
  document.title=`${s.genus} ${s.species} — The Long Walk`;
  // chronological neighbours (oldest→youngest)
  const chrono=[...list].sort((a,b)=>b.start-a.start);
  const ci=chrono.findIndex(x=>x.id===s.id);
  const older=chrono[ci-1], younger=chrono[ci+1];

  const facts=[
    ["When",s.dateLabel],["Brain size",s.brain],["Height",s.height],
    ["Where",s.region],["Discovered",s.discovered],["Era",s.era]
  ];
  const navItems=s.sections.map((sec,k)=>`<a href="#s${k}">${sec.h}</a>`).join('');
  const body=s.sections.map((sec,k)=>{
    let inner='';
    if(sec.p)inner+=sec.p.map(p=>`<p>${p}</p>`).join('');
    if(sec.list)inner+=`<ul>${sec.list.map(li=>`<li>${li}</li>`).join('')}</ul>`;
    return `<div class="rsec" id="s${k}"><h2>${sec.h}</h2>${inner}</div>`;
  }).join('');
  const sources=`<div class="sources"><h4>Sources & further reading</h4>${
    s.sources.map(src=>`<a href="${src.url}" target="_blank" rel="noopener">${src.name} ↗</a>`).join('')}</div>`;

  const foot=`<div class="wrap sp-foot">
    ${older?`<a href="species.html#${older.id}"><span class="dir">← Older</span><span class="nm">${older.genus} ${older.species}</span></a>`:`<a href="index.html"><span class="dir">←</span><span class="nm">Back to timeline</span></a>`}
    ${younger?`<a class="next" href="species.html#${younger.id}"><span class="dir">Younger →</span><span class="nm">${younger.genus} ${younger.species}</span></a>`:`<a class="next" href="migration.html"><span class="dir">Next chapter →</span><span class="nm">Ancient migrations</span></a>`}
  </div>`;

  document.getElementById('sp-main').innerHTML=`
    <section class="sp-hero" style="--sp-accent:${s.accent}">
      <div class="wrap">
        <div style="padding-top:1.4rem"><a href="index.html" class="mono" style="font-size:.8rem;color:var(--ink-faint)">← The Long Walk timeline</a></div>
        <div class="sp-hero-grid">
          <div class="sp-portrait reveal in"><img src="assets/img/${s.img}" alt="Reconstruction of ${s.genus} ${s.species}"></div>
          <div>
            <div class="sp-genus">${s.genus} ${s.species}</div>
            <h1>${s.common}</h1>
            <div class="sp-common">${s.meaning} &middot; ${s.era}</div>
            <p class="sp-tag">${s.tagline}</p>
            <div class="fact-grid">
              ${facts.map(([k,v])=>`<div class="fact"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="wrap" style="--sp-accent:${s.accent};padding-block:0">
      <div class="report">
        <nav class="report-nav" aria-label="Report sections">${navItems}</nav>
        <div class="report-body">${body}${sources}</div>
      </div>
    </section>
    ${foot}`;

  // section-nav scroll-spy
  const navLinks=[...document.querySelectorAll('.report-nav a')];
  const secs=[...document.querySelectorAll('.rsec')];
  const spy=new IntersectionObserver((es)=>{es.forEach(e=>{
    if(e.isIntersecting){const id=e.target.id;navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+id));}
  });},{rootMargin:'-30% 0px -60% 0px'});
  secs.forEach(x=>spy.observe(x));
  window.scrollTo(0,0);
}
