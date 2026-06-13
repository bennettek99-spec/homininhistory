/* Renders the deep-time timeline of species cards, grouped into eras. */
function fmtBP(bp){
  if(bp>=1e6) return (bp/1e6).toFixed(bp%1e6===0?0:1)+' Ma';
  if(bp>=1e3) return Math.round(bp/1e3)+' ka';
  return bp+' BP';
}
function brainPct(brainStr){
  // parse first number in cc; scale against modern ~1350
  const m=String(brainStr).match(/(\d{3,4})/);
  const v=m?+m[1]:400;
  return Math.max(10,Math.min(100,Math.round(v/1400*100)));
}
const ERAS=[
  {name:"Late Miocene",span:"7 – 5.3 Ma",max:7000001,min:5300000},
  {name:"Pliocene",span:"5.3 – 2.6 Ma",max:5300000,min:2580000},
  {name:"Early Pleistocene",span:"2.6 – 0.8 Ma",max:2580000,min:770000},
  {name:"Middle Pleistocene",span:"770 – 130 ka",max:770000,min:130000},
  {name:"Late Pleistocene & Holocene",span:"130 ka – today",max:130000,min:-1}
];
function renderTimeline(){
  const root=document.getElementById('timeline-root');
  const sp=[...window.SPECIES].sort((a,b)=>b.start-a.start);
  let html='';
  ERAS.forEach(era=>{
    const inEra=sp.filter(s=>s.start<=era.max&&s.start>era.min);
    if(!inEra.length) return;
    html+=`<div class="era-band reveal"><span class="era-name">${era.name}</span><span class="era-span mono">${era.span}</span></div>`;
    html+='<div class="timeline">';
    inEra.forEach(s=>{
      html+=`<div class="tl-item reveal">
        <div class="tl-date mono">${s.dateLabel}</div>
        <span class="tl-node" style="border-color:${s.accent}"></span>
        <a class="card" href="species.html#${s.id}" style="--card-accent:${s.accent}" aria-label="Open report on ${s.genus} ${s.species}">
          <div class="card-row">
            <div class="card-thumb"><img src="assets/img/${s.img}" alt="Reconstruction of ${s.genus} ${s.species}" loading="lazy"></div>
            <div class="card-body">
              <span class="card-genus">${s.genus} ${s.species}</span>
              <h3>${s.common}</h3>
              <div class="common">${s.meaning}</div>
              <div class="tag">${s.tagline}</div>
              <div class="card-meta">
                <span class="chip">🧠 ${s.brain}</span>
                <span class="chip">📍 ${s.region.split(/[,(]/)[0].trim()}</span>
                <span class="chip">${(function(t){t=s.relation.split('—')[0].trim();return t.length>26?t.slice(0,t.lastIndexOf(' ',26)).trim()+'…':t;})()}</span>
              </div>
              <div class="bw" title="brain size relative to modern human"><span style="width:${brainPct(s.brain)}%"></span></div>
            </div>
          </div>
          <span class="card-go">→</span>
        </a>
      </div>`;
    });
    html+='</div>';
  });
  root.innerHTML=html;
  // re-run reveal observer for the new nodes
  if(window.SITE){document.querySelectorAll('.reveal:not(.in)').forEach(e=>{
    const io=new IntersectionObserver((es)=>{es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});},{threshold:.1});
    io.observe(e);
  });}
}
