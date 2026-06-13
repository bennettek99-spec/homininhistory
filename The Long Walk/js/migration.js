/* Interactive migration atlas (Leaflet) + stats, driven by migration_data.json */
(function(){
  const REGION_COLORS={
    "Europe":"#3a6b8f","Near East / SW Asia":"#b4531f","Central Asia / Steppe":"#9c7a2e",
    "East Asia":"#6a8f3a","South Asia":"#8f3a6b","SE Asia / Oceania":"#2e9c8a",
    "Americas":"#b58a00","Africa":"#7a3a1f","North Africa":"#c0762e",
    "Siberia / North Asia":"#5a6f8f","Other":"#8a8a8a"
  };
  const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(n>=1e4?0:1)+'k':''+n;
  const bp=v=>v>=1e6?(v/1e6).toFixed(1)+' Ma':v>=1e3?Math.round(v/1e3)+' ka':v+' BP';

  let map, layers={}, DATA;
  const TILE={
    light:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };
  let tileLayer;

  function currentTheme(){return document.documentElement.getAttribute('data-theme')||'light';}

  function bezier(s,d){ // s,d = [lng,lat]; return [[lat,lng],...] curved
    const pts=[]; const mx=(s[0]+d[0])/2, my=(s[1]+d[1])/2;
    const dx=d[0]-s[0], dy=d[1]-s[1];
    const off=0.18; const cx=mx-dy*off, cy=my+dx*off; // control point
    for(let t=0;t<=1;t+=0.05){
      const a=(1-t)*(1-t), b=2*(1-t)*t, c=t*t;
      const x=a*s[0]+b*cx+c*d[0], y=a*s[1]+b*cy+c*d[1];
      pts.push([y,x]);
    }
    return pts;
  }
  function bearing(a,b){return Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;}

  function buildStats(){
    const m=DATA.meta;
    const items=[
      [fmt(m.n_samples),"ancient genomes analysed"],
      [fmt(m.n_clusters_total)+"+","DBSCAN population clusters"],
      [fmt(m.n_flows),"directional flows modelled"],
      [m.ooa_window,"samples in the 70–30 ka window"]
    ];
    document.getElementById('stat-grid').innerHTML=items.map(([n,l])=>
      `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');
  }
  function buildLegend(){
    const regions=Object.entries(REGION_COLORS);
    document.getElementById('legend').innerHTML=
      regions.map(([r,c])=>`<span><i style="background:${c}"></i>${r}</span>`).join('')
      +`<span><i style="background:var(--accent);border-radius:0;width:16px;height:3px"></i>migration flow</span>`;
  }

  function makeLayers(){
    // clusters
    layers.clusters=L.layerGroup();
    DATA.clusters.forEach(c=>{
      const col=REGION_COLORS[c.region]||"#888";
      L.circleMarker([c.lat,c.lon],{
        radius:Math.max(4,Math.sqrt(c.n)*1.5),color:'#fff',weight:.8,
        fillColor:col,fillOpacity:.82
      }).bindPopup(
        `<span class="pp-t">${c.culture}</span>`+
        `<span class="pp-d">${c.region} · median ${bp(c.date)} · n=${c.n}</span><br>`+
        `<span style="font-size:.78rem">Y-hg ${c.y||'—'}<br>mt-hg ${c.mt||'—'}</span>`
      ).addTo(layers.clusters);
    });
    // flows
    layers.flows=L.layerGroup();
    DATA.flows.forEach(f=>{
      const line=bezier(f.s,f.d);
      L.polyline(line,{color:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#b4531f',
        weight:0.8+f.gs*2.4,opacity:.55,lineCap:'round'})
        .bindPopup(`<span class="pp-t">${f.sc} → ${f.dc}</span>`+
          `<span class="pp-d">${bp(f.sd)} → ${bp(f.dd)} · ${f.km.toLocaleString()} km · gen-sim ${f.gs}</span>`)
        .addTo(layers.flows);
      // arrowhead near destination
      const p2=line[line.length-1], p1=line[line.length-3]||line[0];
      const ang=Math.atan2(p2[0]-p1[0],p2[1]-p1[1])*180/Math.PI;
      L.marker(p2,{icon:L.divIcon({className:'',iconSize:[12,12],
        html:`<div style="transform:rotate(${ang}deg);color:var(--accent);font-size:13px;line-height:1">▲</div>`})})
        .addTo(layers.flows);
    });
    // deep samples
    layers.deep=L.layerGroup();
    DATA.deep.forEach(d=>{
      const age=Math.min(46000,Math.max(15000,d.bp));
      const t=(age-15000)/31000; // 0..1
      const col=d.kind==='archaic' ? '#3a3a3a'
        : `rgb(${Math.round(40+t*200)},${Math.round(30+(1-t)*120)},${Math.round(20+(1-t)*30)})`;
      const mk = d.kind==='archaic'
        ? L.marker([d.lat,d.lon],{icon:L.divIcon({className:'',iconSize:[12,12],
            html:`<div style="color:#333;font-size:13px;line-height:1">▲</div>`})})
        : L.circleMarker([d.lat,d.lon],{radius:5,color:'#fff',weight:.8,fillColor:col,fillOpacity:.9});
      mk.bindPopup(`<span class="pp-t">${d.culture}</span><span class="pp-d">${d.region} · ${bp(d.bp)} · ${d.kind}</span>`)
        .addTo(layers.deep);
    });
  }

  function setTile(){
    const url=TILE[currentTheme()];
    if(tileLayer)map.removeLayer(tileLayer);
    tileLayer=L.tileLayer(url,{subdomains:'abcd',maxZoom:8,
      attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
    tileLayer.bringToBack();
  }

  function initMap(){
    map=L.map('map',{worldCopyJump:true,minZoom:1,maxZoom:8,scrollWheelZoom:false})
      .setView([28,40],2);
    map.on('click',()=>map.scrollWheelZoom.enable());
    map.on('mouseout',()=>map.scrollWheelZoom.disable());
    setTile();
    makeLayers();
    layers.clusters.addTo(map);
    layers.flows.addTo(map);
    // toggles
    document.querySelectorAll('.toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const k=btn.dataset.layer;const on=btn.getAttribute('aria-pressed')==='true';
        btn.setAttribute('aria-pressed',String(!on));
        if(on)map.removeLayer(layers[k]); else layers[k].addTo(map);
      });
    });
    window.addEventListener('themechange',()=>{setTile();
      // recolour flows to accent of new theme
      map.removeLayer(layers.flows);makeLayers();
      if(document.querySelector('.toggle[data-layer="flows"]').getAttribute('aria-pressed')==='true')layers.flows.addTo(map);
      if(document.querySelector('.toggle[data-layer="clusters"]').getAttribute('aria-pressed')==='true'){map.removeLayer(layers.clusters);layers.clusters.addTo(map);}
    });
  }

  fetch('js/migration_data.json').then(r=>r.json()).then(d=>{
    DATA=d; buildStats(); buildLegend(); initMap();
  }).catch(e=>{document.getElementById('map').innerHTML='<div style="padding:2rem;text-align:center;color:var(--ink-muted)">Map data unavailable.</div>';console.error(e);});
})();
