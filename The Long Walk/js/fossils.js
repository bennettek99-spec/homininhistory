/* Interactive map of major hominin fossil & archaeological sites (Leaflet).
   Each pin links to a related article or species page — an internal-linking hub. */
(function(){
  const CAT={
    early:{c:"#9a6a2f",label:"Early hominins & australopiths"},
    homo:{c:"#b4531f",label:"Homo erectus & early Homo"},
    archaic:{c:"#3a6b8f",label:"Neanderthals & Denisovans"},
    sapiens:{c:"#2f6f6a",label:"Homo sapiens & symbolic sites"}
  };
  // [name, lat, lon, country, age, finds, category, link]
  const SITES=[
    ["Toros-Menalla",16.0,17.3,"Chad","~7 Ma","Sahelanthropus “Toumaï” cranium","early","/species/sahelanthropus-tchadensis"],
    ["Woranso-Mille",11.6,40.5,"Ethiopia","~3.8 Ma","A. anamensis “MRD” skull","early","/blog/australopithecus-afarensis-vs-africanus"],
    ["Hadar",11.13,40.58,"Ethiopia","~3.2 Ma","“Lucy” (A. afarensis)","early","/blog/australopithecus-afarensis-vs-africanus"],
    ["Laetoli",-3.23,35.35,"Tanzania","~3.66 Ma","Bipedal footprint trails","early","/blog/australopithecus-afarensis-vs-africanus"],
    ["Sterkfontein",-26.02,27.73,"South Africa","~3.7–2.1 Ma","“Mrs Ples”, “Little Foot”","early","/blog/homo-naledi-vs-australopithecus"],
    ["Taung",-27.53,24.62,"South Africa","~2.8 Ma","The Taung Child (A. africanus)","early","/species/australopithecus-africanus"],
    ["Malapa",-25.88,27.80,"South Africa","~1.98 Ma","Australopithecus sediba","early","/blog/homo-habilis-vs-homo-erectus"],
    ["Olduvai Gorge",-2.99,35.35,"Tanzania","~1.9 Ma","OH 5, H. habilis, Oldowan tools","homo","/blog/human-evolution-timeline"],
    ["Lake Turkana",3.95,36.20,"Kenya","~1.9–1.5 Ma","Turkana Boy, the “Black Skull”","homo","/blog/human-evolution-timeline"],
    ["Dmanisi",41.33,44.35,"Georgia","~1.8 Ma","Skull 5 — earliest Homo out of Africa","homo","/blog/out-of-africa-theory-explained"],
    ["Trinil",-7.40,111.36,"Indonesia","~1 Ma","“Java Man” — first H. erectus found","homo","/species/homo-erectus"],
    ["Sangiran",-7.45,110.83,"Indonesia","~1.5–0.8 Ma","Many H. erectus fossils","homo","/species/homo-erectus"],
    ["Zhoukoudian",39.68,115.92,"China","~770–400 ka","“Peking Man” (H. erectus)","homo","/blog/out-of-africa-theory-explained"],
    ["Mauer",49.35,8.80,"Germany","~600 ka","H. heidelbergensis type jaw","homo","/blog/homo-heidelbergensis-vs-neanderthals"],
    ["Kabwe (Broken Hill)",-14.46,28.45,"Zambia","~300 ka","H. rhodesiensis cranium","homo","/blog/homo-heidelbergensis-vs-neanderthals"],
    ["Bodo",10.60,40.50,"Ethiopia","~600 ka","Bodo cranium (archaic Homo)","homo","/blog/homo-heidelbergensis-vs-neanderthals"],
    ["Sima de los Huesos",42.35,-3.52,"Spain","~430 ka","28+ early Neanderthals, nuclear DNA","archaic","/blog/sima-de-los-huesos-vs-denisova-cave"],
    ["Denisova Cave",51.40,84.68,"Russia","~200–50 ka","Denisovans & Neanderthals, “Denny”","archaic","/blog/sima-de-los-huesos-vs-denisova-cave"],
    ["Neander Valley",51.23,6.95,"Germany","~40 ka","1856 — first Neanderthal recognised","archaic","/species/homo-neanderthalensis"],
    ["La Chapelle-aux-Saints",44.99,1.73,"France","~50 ka","The “Old Man” Neanderthal burial","archaic","/blog/homo-sapiens-vs-neanderthals"],
    ["Shanidar",36.83,44.22,"Iraq","~65–35 ka","Neanderthal burials & “flower” debate","archaic","/blog/neanderthals-vs-denisovans"],
    ["Xiahe (Baishiya)",35.45,102.57,"China","~160 ka","Denisovan jaw on the Tibetan Plateau","archaic","/blog/denisovan-dna-in-modern-humans"],
    ["Jebel Irhoud",31.86,-8.87,"Morocco","~315 ka","Oldest known H. sapiens","sapiens","/blog/jebel-irhoud-vs-omo-kibish"],
    ["Omo Kibish",5.40,35.90,"Ethiopia","~233 ka","Omo I — early modern human","sapiens","/blog/jebel-irhoud-vs-omo-kibish"],
    ["Herto",10.28,40.55,"Ethiopia","~160 ka","H. sapiens idaltu","sapiens","/blog/archaic-vs-modern-homo-sapiens"],
    ["Rising Star",-26.02,27.71,"South Africa","~335–236 ka","Homo naledi (Dinaledi Chamber)","sapiens","/blog/homo-naledi-vs-australopithecus"],
    ["Liang Bua",-8.52,120.44,"Indonesia","~100–60 ka","H. floresiensis, the “Hobbit”","sapiens","/blog/homo-floresiensis-vs-homo-erectus"],
    ["Callao Cave",17.70,121.82,"Philippines","~67–50 ka","Homo luzonensis","sapiens","/blog/homo-floresiensis-vs-homo-erectus"],
    ["Blombos Cave",-34.42,21.22,"South Africa","~100–70 ka","Engraved ochre & shell beads","sapiens","/blog/venus-figurines"],
    ["Sibudu Cave",-29.52,31.08,"South Africa","~77–38 ka","Bedding, early bow-and-arrow tech","sapiens","/blog/venus-figurines"],
    ["Hohle Fels",48.38,9.76,"Germany","~40 ka","Oldest Venus figurine & flutes","sapiens","/blog/venus-figurines"],
    ["Chauvet",44.39,4.41,"France","~36 ka","Among the oldest cave art","sapiens","/blog/lascaux-vs-chauvet"],
    ["Lascaux",45.05,1.17,"France","~17 ka","Famed Ice-Age cave paintings","sapiens","/blog/lascaux-vs-chauvet"]
  ];

  const TILE={light:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
              dark:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'};
  let map,tileLayer,layers={};
  const theme=()=>document.documentElement.getAttribute('data-theme')||'light';

  function setTile(){
    if(tileLayer)map.removeLayer(tileLayer);
    tileLayer=L.tileLayer(TILE[theme()],{subdomains:'abcd',maxZoom:8,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
    tileLayer.bringToBack();
  }
  function makeLayers(){
    Object.keys(CAT).forEach(k=>layers[k]=L.layerGroup());
    SITES.forEach(s=>{
      const [name,lat,lon,country,age,finds,cat,link]=s;
      const col=CAT[cat].c;
      const rel=link.indexOf('blog/')===0?'Read the article':'Species profile';
      L.circleMarker([lat,lon],{radius:6,color:'#fff',weight:1,fillColor:col,fillOpacity:.9})
        .bindPopup(`<span class="pp-t">${name}</span><span class="pp-d">${country} &middot; ${age}</span>`
          +`<span style="display:block;margin:.15rem 0 .4rem;font-size:.82rem">${finds}</span>`
          +`<a class="pp-link" href="${link}">${rel} &rarr;</a>`)
        .addTo(layers[cat]);
    });
  }
  function buildLegend(){
    document.getElementById('legend').innerHTML=Object.values(CAT)
      .map(v=>`<span><i style="background:${v.c}"></i>${v.label}</span>`).join('');
  }
  function initMap(){
    map=L.map('map',{worldCopyJump:true,minZoom:1,maxZoom:8,scrollWheelZoom:false}).setView([25,25],2);
    map.on('click',()=>map.scrollWheelZoom.enable());
    map.on('mouseout',()=>map.scrollWheelZoom.disable());
    setTile(); makeLayers(); buildLegend();
    Object.keys(layers).forEach(k=>layers[k].addTo(map));
    document.querySelectorAll('.toggle').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const k=btn.dataset.layer, on=btn.getAttribute('aria-pressed')==='true';
        btn.setAttribute('aria-pressed',String(!on));
        if(on)map.removeLayer(layers[k]); else layers[k].addTo(map);
      });
    });
    window.addEventListener('themechange',setTile);
  }
  if(typeof L==='undefined'){document.getElementById('map').innerHTML='<div style="padding:2rem;text-align:center;color:var(--ink-muted)">Map library failed to load.</div>';return;}
  if(document.readyState!=='loading')initMap(); else document.addEventListener('DOMContentLoaded',initMap);
})();
