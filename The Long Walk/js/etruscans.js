/* Etruscan case study: AADR v66.p1 locality aggregates + published time-lens synthesis */
(function(){
  const SITES=[
    {site:"Campiglia dei Foci",detail:"Campiglia dei Foci (Tuscany, Siena)",lat:43.4134,lon:11.0743,n:3,oldest:647,youngest:639,outliers:0},
    {site:"Casenovole",detail:"Casenovole (Tuscany, Grosseto)",lat:43.0333,lon:11.3326,n:12,oldest:446,youngest:281,outliers:2},
    {site:"Chiusi",detail:"Chiusi (Tuscany, Siena)",lat:43.017,lon:11.9484,n:1,oldest:787,youngest:787,outliers:0},
    {site:"La Mattonara",detail:"La Mattonara (Lazio, Civitavecchia)",lat:42.0889,lon:11.7656,n:3,oldest:650,youngest:650,outliers:1},
    {site:"Magliano",detail:"Magliano (Tuscany, Grosseto)",lat:42.5989,lon:11.2931,n:1,oldest:667,youngest:667,outliers:0},
    {site:"Marsiliana d'Albegna",detail:"Marsiliana d'Albegna (Tuscany, Grosseto)",lat:42.5385,lon:11.3336,n:2,oldest:725,youngest:186,outliers:1},
    {site:"Monteriggioni",detail:"Monteriggioni (Tuscany, Siena)",lat:43.3897,lon:11.2245,n:9,oldest:599,youngest:362,outliers:0},
    {site:"Monterozzi necropolis",detail:"Monterozzi necropolis (Lazio, Tarquinia)",lat:42.2542,lon:11.7576,n:11,oldest:642,youngest:78,outliers:2},
    {site:"Poggio Renzo",detail:"Poggio Renzo (Tuscany, Siena)",lat:43.0297,lon:11.9513,n:2,oldest:660,youngest:629,outliers:0},
    {site:"Tarquinia",detail:"Tarquinia (Lazio, Viterbo)",lat:42.25,lon:11.7679,n:17,oldest:315,youngest:10,outliers:0},
    {site:"Tarquinia Civita",detail:"Tarquinia Civita (Lazio, Viterbo)",lat:42.251,lon:11.756,n:5,oldest:980,youngest:796,outliers:1},
    {site:"Veio Grotta Gramiccia",detail:"Veio Grotta Gramiccia (Lazio, Rome)",lat:42.0168,lon:12.1004,n:1,oldest:850,youngest:850,outliers:0},
    {site:"Vetulonia",detail:"Vetulonia (Tuscany, Grosseto)",lat:42.9207,lon:10.9714,n:10,oldest:771,youngest:275,outliers:3},
    {site:"Volterra",detail:"Volterra (Tuscany, Pisa)",lat:43.4158,lon:10.8505,n:1,oldest:122,youngest:122,outliers:0}
  ];
  const ERAS={
    iron:{title:"Genetic similarity across cultural boundaries",copy:"Etruscan-associated groups and neighbouring Latins shared a broadly similar central-Italian ancestry profile. Their linguistic difference was not matched by a large genome-wide divide.",caveat:"What this does not prove: that everyone called “Etruscan” formed one homogeneous biological population.",pos:"0"},
    imperial:{title:"Mediterranean mobility reshaped central Italy",copy:"During the Imperial period, central Italian genomes shifted toward ancestry profiles common in the eastern Mediterranean. Rome's political network was also a demographic network.",caveat:"The pattern reflects movement across an empire; it should not be reduced to a single migration or modern national population.",pos:"1"},
    medieval:{title:"Northern European-related ancestry increased",copy:"By the Early Medieval period, the transect records another shift, with increased ancestry related to northern and central European groups after the western Empire fragmented.",caveat:"Historical labels such as “Lombard” cannot be assigned from ancestry alone; burial context and genomic evidence must be interpreted together.",pos:"2"}
  };
  let map,markers=[];
  function dates(s){return s.oldest===s.youngest?`${s.oldest} BCE`:`${s.oldest}–${s.youngest} BCE`;}
  function selectSite(s,index){
    document.getElementById('site-name').textContent=s.site;
    document.getElementById('site-detail').textContent=s.detail;
    const metrics=document.getElementById('site-metrics');metrics.hidden=false;
    metrics.innerHTML=`<div><b>${s.n}</b><small>individuals</small></div><div><b>${dates(s)}</b><small>approx. midpoint range</small></div><div><b>${s.outliers}</b><small>outlier-labelled</small></div>`;
    document.querySelectorAll('.site-row').forEach((r,i)=>r.classList.toggle('active',i===index));
    if(map&&markers[index]){map.flyTo([s.lat,s.lon],9,{duration:.6});markers[index].openPopup();}
  }
  function buildList(){
    const list=document.getElementById('site-list');
    list.innerHTML=SITES.map((s,i)=>`<button class="site-row" data-site="${i}"><span>${s.site}</span><small>n=${s.n} · ${dates(s)}</small></button>`).join('');
    list.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectSite(SITES[+b.dataset.site],+b.dataset.site)));
  }
  function initMap(){
    const el=document.getElementById('etruscan-map');
    if(!window.L){el.innerHTML='<div style="padding:2rem;color:var(--ink-muted)">Interactive map unavailable; use the complete locality list beside it.</div>';return;}
    map=L.map(el,{scrollWheelZoom:false,minZoom:6,maxZoom:12}).setView([42.75,11.45],7);
    const theme=()=>document.documentElement.getAttribute('data-theme')||'light';let tiles;
    const setTiles=()=>{if(tiles)map.removeLayer(tiles);const dark=theme()==='dark';tiles=L.tileLayer(dark?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png':'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:12,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);tiles.bringToBack();};setTiles();
    SITES.forEach((s,i)=>{
      const marker=L.circleMarker([s.lat,s.lon],{radius:5+Math.sqrt(s.n)*2.2,color:s.outliers?'#b4531f':'#fff',weight:s.outliers?3:1,fillColor:'#2f6f6a',fillOpacity:.84})
        .bindPopup(`<b>${s.site}</b><br><span style="font-size:.78rem">${s.n} individual${s.n===1?'':'s'} · ${dates(s)}${s.outliers?`<br>${s.outliers} outlier-labelled sample${s.outliers===1?'':'s'}`:''}</span>`)
        .on('click',()=>selectSite(s,i)).addTo(map);markers.push(marker);
    });
    map.fitBounds(L.latLngBounds(SITES.map(s=>[s.lat,s.lon])).pad(.13));
    window.addEventListener('themechange',setTiles);
  }
  function initEras(){
    const tabs=[...document.querySelectorAll('[data-era]')];
    tabs.forEach(tab=>tab.addEventListener('click',()=>{
      tabs.forEach(t=>t.setAttribute('aria-selected',String(t===tab)));
      const e=ERAS[tab.dataset.era];
      document.getElementById('era-title').textContent=e.title;
      document.getElementById('era-copy').textContent=e.copy;
      document.getElementById('era-caveat').textContent=e.caveat;
      document.getElementById('era-marker').dataset.pos=e.pos;
    }));
  }
  window.ETRUSCANS={init(){buildList();initMap();initEras();}};
})();
