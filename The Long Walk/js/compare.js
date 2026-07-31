/* Species comparator — side-by-side, to-scale. Reuses window.SPECIES (js/species.js). */
(function(){
  // Numeric scale data + a few extra facts, keyed by species id. Display strings
  // (brain/height/region/dateLabel) are pulled live from window.SPECIES so they
  // stay in sync; only the numbers needed for scaling live here.
  const EXTRA = {
    sahelanthropus:{cm:110,est:true,cc:350,mass:"unknown",tools:"None known",fate:"Contested basal hominin"},
    ardipithecus:  {cm:120,cc:325,mass:"~50 kg",tools:"None known",fate:"Side branch or near-ancestor"},
    afarensis:     {cm:140,cc:420,mass:"~30–45 kg",tools:"Cut-marks claimed ~3.4 Ma (debated)",fate:"Leading ancestor of Homo"},
    africanus:     {cm:130,cc:450,mass:"~30–40 kg",tools:"None directly associated",fate:"Gracile southern australopith"},
    habilis:       {cm:120,cc:610,mass:"~30–37 kg",tools:"Oldowan flakes",fate:"Early Homo; ancestry debated"},
    erectus:       {cm:165,cc:950,mass:"~50–65 kg",tools:"Acheulean handaxes; fire",fate:"First global human"},
    paranthropus:  {cm:132,cc:525,mass:"~32–49 kg",tools:"Bone/Oldowan tools (disputed)",fate:"Robust branch; extinct ~1 Ma"},
    heidelbergensis:{cm:170,cc:1250,mass:"~60–90 kg",tools:"Acheulean; wooden spears",fate:"Ancestor of Neanderthals & sapiens"},
    naledi:        {cm:144,cc:510,mass:"~40 kg",tools:"None found with fossils",fate:"Small-brained, surprisingly recent"},
    floresiensis:  {cm:106,cc:420,mass:"~25–30 kg",tools:"Stone tools; hunted dwarf Stegodon",fate:'Island "hobbit"; extinct ~50 ka'},
    neanderthalensis:{cm:164,cc:1410,mass:"~64–82 kg",tools:"Mousterian; fire, burial",fate:"Absorbed ~40 ka; lives on in our DNA"},
    denisovans:    {cm:167,est:true,cc:null,mass:"unknown",tools:"Middle Palaeolithic (inferred)",fate:"Known mainly from DNA"},
    sapiens:       {cm:170,cc:1350,mass:"~50–80 kg",tools:"Full toolkit; symbolic culture",fate:"The only surviving hominin"}
  };
  const SIL = '<svg viewBox="0 0 60 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true">'
    +'<g fill="currentColor"><circle cx="30" cy="14" r="11"/>'
    +'<rect x="22" y="26" width="16" height="58" rx="7"/>'
    +'<rect x="9" y="30" width="8" height="46" rx="4"/><rect x="43" y="30" width="8" height="46" rx="4"/>'
    +'<rect x="22.5" y="80" width="7" height="74" rx="3.5"/><rect x="30.5" y="80" width="7" height="74" rx="3.5"/></g></svg>';

  const SP = (window.SPECIES||[]).reduce((m,s)=>(m[s.id]=s,m),{});
  const IDS = (window.SPECIES||[]).map(s=>s.id);
  const $ = id=>document.getElementById(id);
  const esc = s=>String(s==null?"":s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

  function fullName(s){return `${s.genus} ${s.species}`;}
  function optionList(sel){
    return IDS.map(id=>`<option value="${id}"${id===sel?' selected':''}>${esc(fullName(SP[id]))}${SP[id].common?' — '+esc(SP[id].common):''}</option>`).join('');
  }
  function bp(v){return v>=1e6?(v/1e6).toFixed(1).replace(/\.0$/,'')+' Ma':Math.round(v/1e3)+' ka';}

  function figure(s,x,maxCm){
    const e=EXTRA[s.id]||{}; const cm=e.cm||120;
    const pct=Math.round(cm/maxCm*100); // % of the (responsive) wrapper height; width follows via aspect-ratio
    const img=`assets/img/${s.img}`;
    return `<div class="cmp-fig">
      <img class="cmp-portrait" src="${img}" alt="${esc(fullName(s))} reconstruction">
      <div class="cmp-sil-wrap"><div class="cmp-sil" style="height:${pct}%;color:${s.accent||'var(--accent)'}${e.est?';opacity:.55':''}">${SIL}</div></div>
      <div class="cmp-h">${e.est?'~':''}${cm} cm${e.est?' (est.)':''}</div>
      <div class="cmp-name"><em>${esc(fullName(s))}</em></div>
    </div>`;
  }

  function brainPanel(a,b){
    const ea=EXTRA[a.id]||{},eb=EXTRA[b.id]||{};
    const max=Math.max(ea.cc||0,eb.cc||0)||1400;
    const disc=(s,e)=>{
      if(!e.cc) return `<div class="cmp-brain-item"><div class="cmp-brain-dot cmp-unknown" style="width:60px;height:60px;border-color:${s.accent}">?</div><div class="cmp-cc">brain size unknown</div></div>`;
      const d=Math.round(Math.sqrt(e.cc)/Math.sqrt(max)*150);
      return `<div class="cmp-brain-item"><div class="cmp-brain-dot" style="width:${d}px;height:${d}px;background:${s.accent}"></div><div class="cmp-cc">${esc(s.brain||e.cc+' cc')}</div></div>`;
    };
    return disc(a,ea)+disc(b,eb);
  }

  function timeline(a,b){
    const TMAX=7e6;
    const x=v=>(1-Math.min(v,TMAX)/TMAX)*100;
    const bar=(s)=>{
      const l=x(s.start), r=x(s.end); const w=Math.max(0.8,r-l);
      return `<div class="cmp-tl-row"><span class="cmp-tl-lab"><em>${esc(s.genus[0])}. ${esc(s.species)}</em></span>
        <div class="cmp-tl-track"><div class="cmp-tl-bar" style="left:${l}%;width:${w}%;background:${s.accent}" title="${bp(s.start)} – ${bp(s.end)}"></div></div></div>`;
    };
    const ticks=[7,6,5,4,3,2,1,0].map(m=>`<span style="left:${x(m*1e6)}%">${m===0?'now':m+'Ma'}</span>`).join('');
    return `<div class="cmp-tl">${bar(a)}${bar(b)}<div class="cmp-tl-axis">${ticks}</div></div>`;
  }

  function row(label,va,vb){
    if(!va&&!vb) return '';
    return `<tr><td>${label}</td><td>${esc(va||'—')}</td><td>${esc(vb||'—')}</td></tr>`;
  }
  function table(a,b){
    const ea=EXTRA[a.id]||{},eb=EXTRA[b.id]||{};
    return `<table class="cmp-table"><thead><tr><th>Trait</th><th><em>${esc(fullName(a))}</em></th><th><em>${esc(fullName(b))}</em></th></tr></thead><tbody>
      ${row('Lived',a.dateLabel,b.dateLabel)}
      ${row('Era',a.era,b.era)}
      ${row('Brain size',a.brain,b.brain)}
      ${row('Height',a.height,b.height)}
      ${row('Body mass',ea.mass,eb.mass)}
      ${row('Where',a.region,b.region)}
      ${row('Tools',ea.tools,eb.tools)}
      ${row('Discovered',a.discovered,b.discovered)}
      ${row('Fate / legacy',ea.fate,eb.fate)}
    </tbody></table>`;
  }

  function render(){
    const a=SP[$('selA').value], b=SP[$('selB').value];
    if(!a||!b) return;
    const maxCm=Math.max((EXTRA[a.id]||{}).cm||120,(EXTRA[b.id]||{}).cm||120);
    $('scaleStage').innerHTML=figure(a,0,maxCm)+figure(b,1,maxCm);
    $('brainStage').innerHTML=brainPanel(a,b);
    $('tlStage').innerHTML=timeline(a,b);
    $('tableStage').innerHTML=table(a,b);
    $('links').innerHTML=
      `<a class="btn" href="species/${a.slug}.html">More on ${esc(a.genus)} ${esc(a.species)} →</a>`+
      `<a class="btn ghost" href="species/${b.slug}.html">More on ${esc(b.genus)} ${esc(b.species)} →</a>`;
    // reflect selection in the URL for shareable comparisons
    try{history.replaceState(null,'',`?a=${a.id}&b=${b.id}`);}catch(e){}
  }

  function init(){
    if(!IDS.length){$('scaleStage').innerHTML='<p>Species data unavailable.</p>';return;}
    const q=new URLSearchParams(location.search);
    let a=q.get('a'), b=q.get('b');
    if(!SP[a]) a='afarensis'; if(!SP[b]) b='sapiens';
    $('selA').innerHTML=optionList(a);
    $('selB').innerHTML=optionList(b);
    $('selA').addEventListener('change',render);
    $('selB').addEventListener('change',render);
    $('swapBtn').addEventListener('click',()=>{const t=$('selA').value;$('selA').value=$('selB').value;$('selB').value=t;render();});
    $('randBtn').addEventListener('click',()=>{
      let i=IDS[Math.floor(Math.random()*IDS.length)],j=IDS[Math.floor(Math.random()*IDS.length)];
      while(j===i)j=IDS[Math.floor(Math.random()*IDS.length)];
      $('selA').value=i;$('selB').value=j;render();
    });
    render();
  }
  if(document.readyState!=='loading')init(); else document.addEventListener('DOMContentLoaded',init);
})();
