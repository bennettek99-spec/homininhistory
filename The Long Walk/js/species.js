/* The Long Walk — species dataset. Dates in years before present (BP).
   Content compiled from Smithsonian Human Origins, Natural History Museum (London),
   Australian Museum, and primary literature. Citations per-species in `sources`. */
window.SPECIES = [
{
  id:"sahelanthropus", genus:"Sahelanthropus", species:"tchadensis",
  common:"Toumaï", meaning:"“Hope of life” (Sahel ape from Chad)",
  era:"Late Miocene", start:7000000, end:6000000, dateLabel:"~7 million years ago",
  brain:"320–380 cc", height:"unknown (~chimp-sized)", region:"Djurab Desert, Chad",
  discovered:"2001 (Brunet team)", relation:"Possible earliest hominin — near the human–chimp split",
  img:"sp_sahelanthropus.jpg", accent:"#7d5a2e",
  tagline:"At the very root of the family tree, an ape that may have already stood up.",
  sections:[
    {h:"Overview", p:[
      "Sahelanthropus tchadensis is the oldest creature widely proposed to sit on the human side of the family tree, living around 7 million years ago — close to the genetic estimate for when our lineage split from chimpanzees. It is known mainly from a single remarkable cranium nicknamed <em>Toumaï</em>, plus jaw fragments and teeth, all from Chad.",
      "Its discovery in central Africa was a shock: almost all other early hominins come from eastern and southern Africa, so Toumaï pushed the geographic and temporal frontier of human origins far back and far west."
    ]},
    {h:"Anatomy & Body", p:[
      "The skull blends ape-like and hominin-like traits — a small, chimp-sized braincase paired with a surprisingly flat face and smaller, less projecting canine teeth than living apes.",
      "The position of the <em>foramen magnum</em> (the hole where the spinal cord exits the skull) sits relatively far forward, which many researchers read as evidence that Toumaï held its head atop an upright spine — a hint of bipedalism. A contested thigh-bone analysis has been used both to support and to question this."
    ]},
    {h:"Brain & Cognition", p:[
      "With a braincase of roughly 320–380 cc, Toumaï's brain was in the range of a modern chimpanzee. There is no evidence of advanced cognition; its importance is anatomical and phylogenetic, not behavioural."
    ]},
    {h:"Behavior & Culture", p:[
      "No tools or cultural remains are associated with Sahelanthropus. It lived in a mosaic of forest, woodland and lake-margin habitats, judging from the fossil animals found alongside it — a setting that complicates the old idea that upright walking evolved purely as a response to open savanna."
    ]},
    {h:"Key Fossils", list:[
      "<strong>TM 266-01-060-1 (“Toumaï”)</strong> — a nearly complete but distorted cranium, the type specimen.",
      "Several lower-jaw pieces and isolated teeth from the same Toros-Menalla region of Chad."
    ]},
    {h:"Relationship to Us", p:[
      "Sahelanthropus may be a direct ancestor, an early hominin side-branch, or even a fossil ape close to the common ancestor — the single distorted skull leaves room for debate. Either way it marks roughly where our story begins."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — Sahelanthropus", url:"https://humanorigins.si.edu/evidence/human-fossils/species/sahelanthropus-tchadensis"},
    {name:"Natural History Museum — human evolution", url:"https://www.nhm.ac.uk/discover/human-evolution.html"}
  ]
},
{
  id:"ardipithecus", genus:"Ardipithecus", species:"ramidus",
  common:"Ardi", meaning:"“Ground/root ape”",
  era:"Pliocene", start:4400000, end:4400000, dateLabel:"~4.4 million years ago",
  brain:"300–350 cc", height:"~120 cm, ~50 kg", region:"Aramis, Middle Awash, Ethiopia",
  discovered:"1994 (described 2009)", relation:"Early hominin; close to or on the line to Australopithecus",
  img:"sp_ardipithecus.jpg", accent:"#6f6233",
  tagline:"A walker in the woods, still keeping one grasping foot in the trees.",
  sections:[
    {h:"Overview", p:[
      "Ardipithecus ramidus is known from one of the most complete early-hominin skeletons ever found — <em>Ardi</em>, a female who lived 4.4 million years ago in what was then a humid woodland in Ethiopia. Her 2009 description rewrote textbook assumptions about how upright walking began.",
      "Ardi shows that early hominins were not simply 'bipedal chimps'. Her anatomy is its own unique mix, suggesting the last common ancestor we shared with chimpanzees looked less chimp-like than once assumed."
    ]},
    {h:"Anatomy & Body", p:[
      "Ardi combined a pelvis modified for upright walking on the ground with a divergent, grasping big toe for climbing in the trees — a true mosaic. Her hands and limb proportions indicate careful palm-walking along branches rather than the knuckle-walking of living African apes.",
      "She stood around 120 cm tall. The reduced canine teeth, similar in males and females, hint at lower levels of aggressive competition than in chimpanzees."
    ]},
    {h:"Brain & Cognition", p:[
      "Brain size remained ape-like, roughly 300–350 cc. As with earlier forms, the significance lies in locomotion and ecology rather than intelligence."
    ]},
    {h:"Behavior & Culture", p:[
      "Ardi lived in woodland alongside monkeys and forest antelope, eating a generalised omnivorous diet of plants, fruit and small animals. No stone tools are associated with Ardipithecus — toolmaking still lay more than a million years in the future."
    ]},
    {h:"Key Fossils", list:[
      "<strong>ARA-VP-6/500 (“Ardi”)</strong> — a partial skeleton including skull, pelvis, hands and feet.",
      "More than 100 specimens from at least 36 individuals recovered from the Middle Awash."
    ]},
    {h:"Relationship to Us", p:[
      "Ardipithecus is widely seen as ancestral to, or very close to, the australopiths that followed — a crucial bridge between the deepest roots of the tree and 'Lucy's' kind."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — Ardipithecus ramidus", url:"https://humanorigins.si.edu/evidence/human-fossils/species/ardipithecus-ramidus"},
    {name:"Australian Museum — Ardipithecus ramidus", url:"https://australian.museum/learn/science/human-evolution/ardipithecus-ramidus/"}
  ]
},
{
  id:"afarensis", genus:"Australopithecus", species:"afarensis",
  common:"Lucy's species", meaning:"“Southern ape from Afar”",
  era:"Pliocene", start:3900000, end:2900000, dateLabel:"3.9 – 2.9 million years ago",
  brain:"380–430 cc", height:"105–150 cm", region:"Eastern Africa (Ethiopia, Tanzania, Kenya)",
  discovered:"1974 (“Lucy”, Johanson)", relation:"Strong candidate ancestor of genus Homo",
  img:"sp_afarensis.jpg", accent:"#9a6a2f",
  tagline:"Confidently bipedal on the ground — and the maker of footprints frozen in ash.",
  sections:[
    {h:"Overview", p:[
      "Australopithecus afarensis is the best-known early hominin, thanks to the 1974 discovery of <em>Lucy</em> — about 40% of a single skeleton — and the haunting <em>Laetoli footprints</em>, a trail of upright tracks pressed into volcanic ash 3.6 million years ago.",
      "For nearly a million years this species thrived across eastern Africa, making it one of the most successful hominins ever and a leading candidate for the ancestor of our own genus."
    ]},
    {h:"Anatomy & Body", p:[
      "From the neck down, A. afarensis was committed to walking upright: a bowl-shaped pelvis, angled thigh bones and arched feet are all hallmarks of bipedalism. Yet curved fingers and toes and long arms reveal that it still climbed trees, probably for food and safe sleep.",
      "It was strongly sexually dimorphic — males up to ~150 cm and females closer to ~105 cm — with an ape-like, forward-projecting face and a brain only modestly larger than a chimpanzee's."
    ]},
    {h:"Brain & Cognition", p:[
      "Brain volume of 380–430 cc is just above the chimpanzee range. Some endocast features hint at a slightly reorganised, slower-developing brain, but cognition was still broadly ape-grade."
    ]},
    {h:"Behavior & Culture", p:[
      "A. afarensis ate a flexible diet of fruits, leaves, seeds and possibly some meat. Cut-marked animal bones from Dikika hint — controversially — that members of this species may have used stone to access meat, though clear stone tools appear only later."
    ]},
    {h:"Key Fossils", list:[
      "<strong>A.L. 288-1 (“Lucy”)</strong> — the iconic partial skeleton from Hadar, Ethiopia.",
      "<strong>The Laetoli footprint trail</strong> (Tanzania) — direct evidence of upright walking.",
      "<strong>DIK-1-1 (“Selam”/“Lucy's child”)</strong> — a remarkable juvenile skeleton."
    ]},
    {h:"Relationship to Us", p:[
      "Most researchers place A. afarensis at or near the base of the lineage that led to <em>Homo</em>, making Lucy something close to a great-great-grandmother of humanity."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — A. afarensis", url:"https://humanorigins.si.edu/evidence/human-fossils/species/australopithecus-afarensis"},
    {name:"Natural History Museum — Lucy", url:"https://www.nhm.ac.uk/discover/lucy-the-australopithecus.html"}
  ]
},
{
  id:"africanus", genus:"Australopithecus", species:"africanus",
  common:"Taung Child's species", meaning:"“Southern ape of Africa”",
  era:"Pliocene–Pleistocene", start:3300000, end:2100000, dateLabel:"3.3 – 2.1 million years ago",
  brain:"~450 cc", height:"115–140 cm", region:"Southern Africa (Sterkfontein, Taung, Makapansgat)",
  discovered:"1924 (“Taung Child”, Dart)", relation:"Southern australopith; possible ancestor or close cousin of Homo",
  img:"sp_africanus.jpg", accent:"#86663a",
  tagline:"The fossil that first convinced the world humanity began in Africa.",
  sections:[
    {h:"Overview", p:[
      "When anatomist Raymond Dart described the <em>Taung Child</em> in 1925, he made the then-radical claim that humanity's cradle was Africa, not Europe or Asia. Australopithecus africanus has anchored southern African palaeoanthropology ever since.",
      "It lived from about 3.3 to 2.1 million years ago and is known from rich cave sites like Sterkfontein, including the famous adult cranium 'Mrs Ples'."
    ]},
    {h:"Anatomy & Body", p:[
      "A. africanus was a gracile australopith — bipedal, with a slightly more rounded braincase and somewhat smaller, more human-like face and teeth than A. afarensis, though still with a projecting jaw.",
      "Like its relatives it retained climbing adaptations in the upper body, and was small-bodied with notable size differences between the sexes."
    ]},
    {h:"Brain & Cognition", p:[
      "At around 450 cc its brain was modestly larger than earlier australopiths. Endocasts suggest a still ape-like organisation, but the trend toward expansion that would define <em>Homo</em> was beginning."
    ]},
    {h:"Behavior & Culture", p:[
      "Dietary studies of tooth chemistry show a broad, variable diet that included tougher, more open-habitat foods. The Taung Child's skull bears puncture marks now attributed to a large bird of prey — a vivid reminder that these small hominins were prey as well as foragers."
    ]},
    {h:"Key Fossils", list:[
      "<strong>Taung 1 (“Taung Child”)</strong> — the juvenile skull and natural brain endocast, the type specimen.",
      "<strong>Sts 5 (“Mrs Ples”)</strong> — a near-complete adult cranium from Sterkfontein.",
      "<strong>Sts 14</strong> — a partial skeleton preserving the pelvis and spine."
    ]},
    {h:"Relationship to Us", p:[
      "A. africanus is variously seen as a direct ancestor of <em>Homo</em>, an ancestor of the robust <em>Paranthropus</em> line, or both — a pivotal but still-debated southern branch."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — A. africanus", url:"https://humanorigins.si.edu/evidence/human-fossils/species/australopithecus-africanus"},
    {name:"Australian Museum — A. africanus", url:"https://australian.museum/learn/science/human-evolution/australopithecus-africanus/"}
  ]
},
{
  id:"paranthropus", genus:"Paranthropus", species:"boisei",
  common:"Nutcracker Man", meaning:"“Beside-human”",
  era:"Pleistocene", start:2300000, end:1200000, dateLabel:"2.3 – 1.2 million years ago",
  brain:"500–550 cc", height:"~120–140 cm", region:"Eastern Africa (Olduvai, Turkana)",
  discovered:"1959 (“Nutcracker Man”, M. Leakey)", relation:"Robust side-branch — an evolutionary cousin, not an ancestor",
  img:"sp_paranthropus.jpg", accent:"#5f5230",
  tagline:"A specialist of the chewing apparatus — and a dead end on the tree.",
  sections:[
    {h:"Overview", p:[
      "Paranthropus boisei is the most extreme of the 'robust' australopiths: a powerful chewing machine that coexisted with early <em>Homo</em> for over a million years in eastern Africa. Mary Leakey's 1959 discovery of 'Nutcracker Man' at Olduvai Gorge helped launch modern field palaeoanthropology.",
      "Far from being primitive, Paranthropus was highly specialised and successful — until it vanished, leaving no descendants."
    ]},
    {h:"Anatomy & Body", p:[
      "Its skull is unmistakable: a wide, dish-shaped face, enormous cheekbones, the largest molars of any hominin, and a bony <em>sagittal crest</em> along the top of the skull anchoring massive chewing muscles.",
      "Below the neck it was a fairly ordinary small-bodied biped. The cranial machinery — not the body — is what sets it apart."
    ]},
    {h:"Brain & Cognition", p:[
      "Brain size of 500–550 cc was a touch larger than the gracile australopiths but well below contemporary <em>Homo</em>. There is no good evidence that Paranthropus made the stone tools found in its time and place."
    ]},
    {h:"Behavior & Culture", p:[
      "Despite the 'Nutcracker' nickname, tooth-wear and isotope studies suggest boisei ate large quantities of <strong>C₄ plants</strong> — grasses and sedges — rather than only hard nuts. Its grinding dentition processed huge volumes of tough, low-quality vegetation."
    ]},
    {h:"Key Fossils", list:[
      "<strong>OH 5 (“Nutcracker Man” / “Zinj”)</strong> — the type cranium from Olduvai Gorge.",
      "<strong>KNM-ER 406</strong> and the <strong>“Black Skull” (KNM-WT 17000, P. aethiopicus)</strong> from Turkana."
    ]},
    {h:"Relationship to Us", p:[
      "Paranthropus is a true evolutionary cousin: it branched off and specialised in parallel with our own genus, then went extinct around 1.2 million years ago. We are not descended from it."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — P. boisei", url:"https://humanorigins.si.edu/evidence/human-fossils/species/paranthropus-boisei"},
    {name:"Natural History Museum — human evolution", url:"https://www.nhm.ac.uk/discover/human-evolution.html"}
  ]
},
{
  id:"habilis", genus:"Homo", species:"habilis",
  common:"Handy Man", meaning:"“Handy / able man”",
  era:"Pleistocene", start:2400000, end:1500000, dateLabel:"2.4 – 1.5 million years ago",
  brain:"510–690 cc", height:"~100–135 cm", region:"Eastern & southern Africa",
  discovered:"1960s (Leakey, Tobias, Napier)", relation:"Early Homo; transitional toward H. erectus",
  img:"sp_habilis.jpg", accent:"#8a5a2c",
  tagline:"The first of our own genus — and, perhaps, the first deliberate toolmaker named for it.",
  sections:[
    {h:"Overview", p:[
      "Homo habilis was named 'handy man' because its fossils were found alongside some of the earliest stone tools. Living from roughly 2.4 to 1.5 million years ago, it marks the contested threshold where palaeontologists begin to recognise our own genus, <em>Homo</em>.",
      "Its mosaic anatomy — and overlap with both australopiths and early <em>Homo erectus</em> — keeps it at the centre of debates about what it even means to be 'Homo'."
    ]},
    {h:"Anatomy & Body", p:[
      "H. habilis had a larger, rounder braincase and a less projecting face than the australopiths, with smaller teeth. But it kept relatively long arms and a small body, retaining some climbing ability.",
      "Its hand bones suggest a capacity for both powerful and precise grips — useful for making and using tools."
    ]},
    {h:"Brain & Cognition", p:[
      "Brain volumes of 510–690 cc represent a clear step up from australopiths. Endocasts hint at expansion in regions associated in modern humans with language, though we cannot know how those areas functioned."
    ]},
    {h:"Behavior & Culture", p:[
      "H. habilis is associated with the <strong>Oldowan</strong> industry — simple but deliberate sharp flakes struck from cores, used to butcher animals and crack bone for marrow. Whether habilis alone made these tools (versus contemporaries) is debated, but the behaviour signals a new reliance on technology."
    ]},
    {h:"Key Fossils", list:[
      "<strong>OH 7</strong> — the type specimen from Olduvai Gorge: jaw, skull fragments and hand bones.",
      "<strong>KNM-ER 1813</strong> — a well-preserved small cranium from Koobi Fora, Kenya."
    ]},
    {h:"Relationship to Us", p:[
      "H. habilis is generally considered an early member of our genus and a plausible ancestor (or close relative of the ancestor) of <em>Homo erectus</em> — and thus of us."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — H. habilis", url:"https://humanorigins.si.edu/evidence/human-fossils/species/homo-habilis"},
    {name:"Australian Museum — Homo habilis", url:"https://australian.museum/learn/science/human-evolution/homo-habilis/"}
  ]
},
{
  id:"erectus", genus:"Homo", species:"erectus",
  common:"Upright Man", meaning:"“Upright man”",
  era:"Pleistocene", start:1900000, end:110000, dateLabel:"1.9 million – ~110,000 years ago",
  brain:"600–1100 cc", height:"~145–185 cm", region:"Africa, then across Asia (Java, China, Caucasus)",
  discovered:"1891 (“Java Man”, Dubois)", relation:"Long-lived ancestor; first hominin to leave Africa",
  img:"sp_erectus.jpg", accent:"#a85a26",
  tagline:"The great pioneer: the first human to walk out of Africa, master fire, and endure for over a million years.",
  sections:[
    {h:"Overview", p:[
      "Homo erectus is arguably the most important species in our story. It was the first hominin with essentially modern body proportions, the first to spread out of Africa across Asia, and one of the longest-lived of all human species — persisting for well over a million years.",
      "From 'Java Man' and 'Peking Man' to Kenya's superbly preserved 'Turkana Boy', erectus fossils span three continents."
    ]},
    {h:"Anatomy & Body", p:[
      "H. erectus had a tall, striding, fully terrestrial body built for endurance walking and running in open landscapes — long legs, short arms, narrow hips. The skull kept archaic features: a long low braincase, a strong continuous brow ridge, and no chin.",
      "Over its vast time span, brain size grew from about 600 cc in early African forms to over 1,000 cc in later populations."
    ]},
    {h:"Brain & Cognition", p:[
      "The expanding brain went hand-in-hand with new behaviours. H. erectus planned ahead, exploited large territories, and cared for individuals who could not fend for themselves — an old, toothless skull from Dmanisi (Georgia) suggests its group helped it survive."
    ]},
    {h:"Behavior & Culture", p:[
      "H. erectus is linked to the <strong>Acheulean</strong> handaxe — a symmetrical, carefully shaped tool that persisted for over a million years. Strong evidence indicates erectus controlled and used <strong>fire</strong>, which cooked food, extended the day, and opened cold new lands.",
      "Cooking may have helped fuel the very brain expansion that defines later humans."
    ]},
    {h:"Key Fossils", list:[
      "<strong>KNM-WT 15000 (“Turkana / Nariokotome Boy”)</strong> — a near-complete juvenile skeleton from Kenya.",
      "<strong>“Java Man” (Trinil)</strong> and <strong>“Peking Man” (Zhoukoudian)</strong> — the classic Asian discoveries.",
      "<strong>The Dmanisi skulls (Georgia)</strong> — the earliest hominins known outside Africa (~1.8 Ma)."
    ]},
    {h:"Relationship to Us", p:[
      "Homo erectus is the trunk from which later large-brained humans grew — almost certainly ancestral, directly or indirectly, to H. heidelbergensis, the Neanderthals, the Denisovans, and us."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — H. erectus", url:"https://humanorigins.si.edu/evidence/human-fossils/species/homo-erectus"},
    {name:"Natural History Museum — Homo erectus", url:"https://www.nhm.ac.uk/discover/homo-erectus-our-ancient-ancestor.html"}
  ]
},
{
  id:"heidelbergensis", genus:"Homo", species:"heidelbergensis",
  common:"Heidelberg Man", meaning:"“Man from Heidelberg”",
  era:"Middle Pleistocene", start:700000, end:200000, dateLabel:"~700,000 – 200,000 years ago",
  brain:"1100–1400 cc", height:"~157–175 cm", region:"Africa, Europe, western Asia",
  discovered:"1907 (Mauer jaw, Germany)", relation:"The pivot — ancestor of Neanderthals, Denisovans and likely H. sapiens",
  img:"sp_heidelbergensis.jpg", accent:"#8f4a22",
  tagline:"The crossroads species — big-brained hunters whose descendants would split into Neanderthals, Denisovans and us.",
  sections:[
    {h:"Overview", p:[
      "Homo heidelbergensis sits at the great fork in the human tree. Many researchers see it as the common ancestral population that, in Africa, gave rise to <em>Homo sapiens</em>, and in Eurasia gave rise to the Neanderthals and Denisovans.",
      "Its brain was nearly modern in size, and the archaeological traces it left — wooden spears, butchered big game, possibly deliberate disposal of the dead — reveal sophisticated planning and cooperation. (Note: the name is used differently by different scientists, and the African and European fossils may eventually be split.)"
    ]},
    {h:"Anatomy & Body", p:[
      "H. heidelbergensis was tall, robust and powerfully built, with a large braincase, a heavy double-arched brow ridge, a broad face and no chin. The body was adapted to a range of climates, from African savanna to glacial Europe."
    ]},
    {h:"Brain & Cognition", p:[
      "Brain volumes of 1,100–1,400 cc overlap the modern human range. Combined with the archaeology, this points to advanced foresight: designing tools for future tasks, coordinating hunts of dangerous prey, and managing fire and shelter."
    ]},
    {h:"Behavior & Culture", p:[
      "The <strong>Schöningen spears</strong> (Germany, ~300,000 years old) are beautifully balanced wooden throwing spears — proof of planning depth and skilled woodworking. At <strong>Boxgrove</strong> (England), heidelbergensis butchered horse and rhino with Acheulean handaxes.",
      "At Spain's <strong>Sima de los Huesos</strong>, dozens of individuals accumulated at the bottom of a deep shaft — possibly the earliest evidence of deliberate treatment of the dead."
    ]},
    {h:"Key Fossils", list:[
      "<strong>The Mauer jaw</strong> (Germany) — the type specimen, found in 1907.",
      "<strong>Sima de los Huesos</strong> (Atapuerca, Spain) — a vast assemblage of Neanderthal-precursor remains.",
      "<strong>Kabwe / “Broken Hill” skull</strong> (Zambia) — a key African specimen (sometimes called H. rhodesiensis)."
    ]},
    {h:"Relationship to Us", p:[
      "If any single species deserves the title 'our immediate ancestor', it is heidelbergensis — the population whose children became the three great human lineages of the late Ice Age."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — H. heidelbergensis", url:"https://humanorigins.si.edu/evidence/human-fossils/species/homo-heidelbergensis"},
    {name:"Natural History Museum — human evolution", url:"https://www.nhm.ac.uk/discover/human-evolution.html"}
  ]
},
{
  id:"naledi", genus:"Homo", species:"naledi",
  common:"Star Man", meaning:"“Star” (from the Rising Star cave)",
  era:"Middle Pleistocene", start:335000, end:236000, dateLabel:"335,000 – 236,000 years ago",
  brain:"465–610 cc", height:"~144 cm, ~40 kg", region:"Rising Star Cave, South Africa",
  discovered:"2013 (described 2015, Berger team)", relation:"Small-brained cousin that lived alongside early H. sapiens",
  img:"sp_naledi.jpg", accent:"#5a6b6b",
  tagline:"A tiny-brained human that survived into our own age — and may have buried its dead in the dark.",
  sections:[
    {h:"Overview", p:[
      "Homo naledi stunned the world twice: first in 2015, when more than 1,500 fossil pieces from at least 15 individuals were recovered from a nearly inaccessible chamber of South Africa's Rising Star cave; then again when it was dated to just 335,000–236,000 years ago — astonishingly recent for so small-brained a species.",
      "It means a chimpanzee-brained human relative was alive at the same time as the earliest <em>Homo sapiens</em>."
    ]},
    {h:"Anatomy & Body", p:[
      "H. naledi is a true mosaic. Its hands, wrists and feet are remarkably human-like and well suited to walking and manipulating objects, while its shoulders, curved fingers and flared pelvis are more primitive and australopith-like. It was small and slender, averaging about 144 cm tall."
    ]},
    {h:"Brain & Cognition", p:[
      "Brain volume was only 465–610 cc — roughly a third of ours — yet endocasts show a humanlike frontal-lobe shape and asymmetry. Its second molars also erupted late, hinting at a slow, humanlike pace of growing up.",
      "The combination of a tiny brain with possibly complex behaviour challenges the assumption that big brains are required for sophisticated culture."
    ]},
    {h:"Behavior & Culture", p:[
      "The site itself is the controversy: the remains lie deep in a chamber reachable only through tight, dark passages, with little sign of natural transport or predators. The discovery team argues for <strong>deliberate body disposal</strong>, and has reported possible engravings and fire use — claims that remain hotly debated and not yet fully accepted."
    ]},
    {h:"Key Fossils", list:[
      "<strong>Dinaledi chamber assemblage</strong> — over 1,500 specimens, one of the richest hominin troves in Africa.",
      "<strong>LES1 (“Neo”)</strong> — a well-preserved skull from the separate Lesedi chamber."
    ]},
    {h:"Relationship to Us", p:[
      "H. naledi is an evolutionary cousin, not an ancestor — a separate small-brained lineage that persisted in southern Africa alongside our own emerging species."
    ]}
  ],
  sources:[
    {name:"Wikipedia — Homo naledi (sourced overview)", url:"https://en.wikipedia.org/wiki/Homo_naledi"},
    {name:"Australian Museum — Homo naledi", url:"https://australian.museum/learn/science/human-evolution/homo-naledi/"},
    {name:"Smithsonian Human Origins — H. naledi", url:"https://humanorigins.si.edu/evidence/human-fossils/species/homo-naledi"}
  ]
},
{
  id:"floresiensis", genus:"Homo", species:"floresiensis",
  common:"The Hobbit", meaning:"“Man from Flores”",
  era:"Late Pleistocene", start:100000, end:50000, dateLabel:"~100,000 – 50,000 years ago",
  brain:"~380–420 cc", height:"~106 cm", region:"Liang Bua cave, Flores, Indonesia",
  discovered:"2003 (Morwood & Soejono team)", relation:"Isolated island cousin — likely a dwarfed descendant of early Homo",
  img:"sp_floresiensis.jpg", accent:"#6b7a3a",
  tagline:"A one-metre-tall human that hunted dwarf elephants on a lost island world.",
  sections:[
    {h:"Overview", p:[
      "Homo floresiensis — quickly nicknamed 'the Hobbit' — is one of the most surprising discoveries in palaeoanthropology. Found in 2003 on the Indonesian island of Flores, this tiny human stood barely a metre tall and had a brain the size of a chimpanzee's, yet survived until perhaps 50,000 years ago.",
      "Its existence shows that the human family was far more diverse, and stranger, than anyone imagined."
    ]},
    {h:"Anatomy & Body", p:[
      "At ~106 cm tall with a brain of only ~400 cc, floresiensis was extraordinarily small. It had relatively large feet, primitive wrist and shoulder anatomy, and no chin. Many researchers attribute its size to <strong>insular dwarfism</strong> — the tendency of large mammals isolated on islands to evolve smaller bodies over generations."
    ]},
    {h:"Brain & Cognition", p:[
      "Despite the tiny brain, floresiensis was associated with stone tools and the hunting of substantial prey — a puzzle that, like Homo naledi, complicates any simple equation of brain size with capability. Endocasts show some reorganisation of the frontal lobe."
    ]},
    {h:"Behavior & Culture", p:[
      "On Flores, floresiensis made stone tools and apparently hunted <strong>dwarf Stegodon</strong> (a small elephant relative) and giant rodents, while avoiding Komodo dragons and giant storks. It inhabited a genuinely lost world of island-dwarfed and island-giant animals."
    ]},
    {h:"Key Fossils", list:[
      "<strong>LB1</strong> — a partial female skeleton with skull, the type specimen, from Liang Bua cave.",
      "Remains of several individuals plus much older, even smaller ancestral fossils from Mata Menge (~700,000 years)."
    ]},
    {h:"Relationship to Us", p:[
      "H. floresiensis is a cousin, not an ancestor — most likely a dwarfed descendant of an early <em>Homo</em> population (possibly H. erectus) that became stranded and miniaturised on Flores. A nearby parallel, <em>Homo luzonensis</em>, was later found in the Philippines."
    ]}
  ],
  sources:[
    {name:"Natural History Museum — Homo floresiensis", url:"https://www.nhm.ac.uk/discover/homo-floresiensis-the-hobbit.html"},
    {name:"Smithsonian Human Origins — H. floresiensis", url:"https://humanorigins.si.edu/evidence/human-fossils/species/homo-floresiensis"}
  ]
},
{
  id:"neanderthalensis", genus:"Homo", species:"neanderthalensis",
  common:"Neanderthals", meaning:"“Man from the Neander Valley”",
  era:"Late Pleistocene", start:430000, end:40000, dateLabel:"~430,000 – 40,000 years ago",
  brain:"1200–1750 cc", height:"~150–175 cm", region:"Europe & western Asia",
  discovered:"1856 (Neander Valley, Germany)", relation:"Closest extinct relatives — and partial ancestors via interbreeding",
  img:"sp_neanderthal.jpg", accent:"#7a5fa0",
  tagline:"Cold-adapted, big-brained and deeply human — our closest kin, and partly inside our own DNA.",
  sections:[
    {h:"Overview", p:[
      "Neanderthals are our closest known relatives, and the first extinct human species ever recognised, from an 1856 discovery in Germany. For hundreds of thousands of years they were the masters of Ice Age Europe and western Asia.",
      "Far from the brutish cliché, Neanderthals were intelligent, skilled and cultured — and the genomes of nearly all living people outside Africa carry a small but real Neanderthal inheritance."
    ]},
    {h:"Anatomy & Body", p:[
      "Neanderthals were stocky and powerfully muscled, with a barrel chest, short limbs and a large projecting midface and nose — a build well suited to conserving heat in glacial climates. Their braincase was long and low but held a brain as large as, or larger than, our own.",
      "Many had pale skin and some had red hair, inferred from ancient DNA."
    ]},
    {h:"Brain & Cognition", p:[
      "With brains of 1,200–1,750 cc, Neanderthals matched or exceeded modern humans in raw volume, though brain <em>shape</em> differed. They planned complex hunts, adapted to extreme environments, and cared for the injured and elderly over long periods."
    ]},
    {h:"Behavior & Culture", p:[
      "Neanderthals made refined <strong>Mousterian</strong> tools, hafted stone points to spears, used fire and birch-bark tar adhesive, wore pigments and feathers, and almost certainly <strong>buried their dead</strong>. Cave markings in Spain dated to before modern humans arrived suggest a capacity for symbolic expression."
    ]},
    {h:"Key Fossils", list:[
      "<strong>Neanderthal 1</strong> (Feldhofer, Germany) — the 1856 type specimen.",
      "<strong>La Chapelle-aux-Saints</strong> (“the Old Man”) — an aged, arthritic individual who was cared for.",
      "<strong>Vindija & Altai genomes</strong> — high-quality ancient DNA that rewrote our shared history."
    ]},
    {h:"Genetics & Legacy", p:[
      "Modern humans and Neanderthals interbred around 50,000–55,000 years ago. Today, most people of non-African descent carry roughly <strong>1–2% Neanderthal DNA</strong>, influencing traits from immunity to skin and hair. Their extinction by ~40,000 years ago likely stemmed from a combination of climate stress, competition, and the demographic fragility of small populations — not a single catastrophe."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — H. neanderthalensis", url:"https://humanorigins.si.edu/evidence/human-fossils/species/homo-neanderthalensis"},
    {name:"Natural History Museum — Neanderthals", url:"https://www.nhm.ac.uk/discover/who-were-the-neanderthals.html"}
  ]
},
{
  id:"denisovans", genus:"Homo", species:"sp. (Denisovan)",
  common:"Denisovans", meaning:"Named for Denisova Cave, Siberia",
  era:"Late Pleistocene", start:200000, end:30000, dateLabel:"~200,000 – 30,000 years ago",
  brain:"unknown (likely large)", height:"unknown", region:"Siberia, Tibet, and across Asia",
  discovered:"2010 (identified from DNA)", relation:"A 'genetic' human species — close cousins and partial ancestors of some living peoples",
  img:"sp_denisovan.jpg", accent:"#4f7f8a",
  tagline:"A whole human species first discovered not from a skull, but from a fingertip's DNA.",
  sections:[
    {h:"Overview", p:[
      "The Denisovans are unique in human palaeontology: they were identified in 2010 not from a recognisable skeleton, but from <strong>DNA extracted from a tiny finger bone</strong> in Siberia's Denisova Cave. The genome revealed a previously unknown sister group to the Neanderthals.",
      "For years they were a 'genome in search of a face'. Newer fossils — especially from the Tibetan Plateau — are slowly giving them one."
    ]},
    {h:"Anatomy & Body", p:[
      "Direct skeletal evidence remains sparse: a finger bone, teeth, a jaw from Tibet (Xiahe), and likely a partial skull from Harbin, China (the 'Dragon Man'). The robust jaw and very large molars suggest a powerfully built archaic human, but a complete picture is still missing — much of our knowledge is genetic rather than anatomical."
    ]},
    {h:"Brain & Cognition", p:[
      "Brain size is not directly known, but given their close kinship with Neanderthals and large-bodied appearance, Denisovans likely had large brains. They occupied a vast range of harsh environments, from Siberian cold to the high, thin air of the Tibetan Plateau."
    ]},
    {h:"Behavior & Culture", p:[
      "Denisovan-layer deposits at Denisova Cave include bone tools and personal ornaments, though it is not always certain which hominin made them given that Neanderthals and modern humans also used the cave. Their adaptation to high altitude is one of the most striking stories in human genetics."
    ]},
    {h:"Genetics & Legacy", p:[
      "Modern humans interbred with Denisovans too. Their DNA survives most strongly in <strong>Oceanian peoples</strong> (Papua New Guineans and Aboriginal Australians carry several percent), and in Tibetans the Denisovan-derived <strong>EPAS1</strong> gene variant enables life at high altitude with low oxygen — a textbook case of adaptive introgression. Recent work suggests some East Asian fossils once called Denisovan may belong to newly proposed groups such as <em>Homo juluensis</em> ('big head'), and the link to the 'Dragon Man' (H. longi) is actively debated."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — Denisovans", url:"https://humanorigins.si.edu/evidence/genetics/denisovans"},
    {name:"Natural History Museum — Denisovans", url:"https://www.nhm.ac.uk/discover/who-were-the-denisovans.html"}
  ]
},
{
  id:"sapiens", genus:"Homo", species:"sapiens",
  common:"Modern Humans — us", meaning:"“Wise man”",
  era:"Late Pleistocene – present", start:300000, end:0, dateLabel:"~300,000 years ago – present",
  brain:"~1300–1400 cc", height:"~150–185 cm", region:"Origin in Africa; now global",
  discovered:"Jebel Irhoud (~315 ka), Omo Kibish, Herto", relation:"The sole surviving human species",
  img:"sp_sapiens.jpg", accent:"#b4531f",
  tagline:"The last human standing — a symbol-making, story-telling, world-spanning ape.",
  sections:[
    {h:"Overview", p:[
      "Homo sapiens — anatomically modern humans — emerged in Africa by at least 300,000 years ago. The ~315,000-year-old fossils from <strong>Jebel Irhoud</strong> in Morocco, alongside finds at Omo Kibish and Herto in Ethiopia, show that our origin was a pan-African, gradual process rather than a single 'Garden of Eden' moment.",
      "We are the only one of all the species on this timeline still alive — but, through interbreeding, we carry fragments of several of the others inside us."
    ]},
    {h:"Anatomy & Body", p:[
      "Modern humans are distinguished by a high, rounded ('globular') braincase, a small flat face tucked beneath the brain, a prominent chin, and a lightly built skeleton. The globular brain shape — not just its size — is one of our defining and most recent features."
    ]},
    {h:"Brain & Cognition", p:[
      "Our brains (~1,350 cc on average — interestingly, slightly smaller than the Neanderthal average) are reorganised for complex language, abstraction, planning and cumulative culture. The capacity to accumulate and transmit knowledge across generations is arguably our true superpower."
    ]},
    {h:"Behavior & Culture", p:[
      "Beginning in Africa, H. sapiens developed pigments, beads, engraved ochre, long-distance exchange, projectile weapons and, later, spectacular cave art. This <strong>symbolic, cumulative culture</strong> let us adapt to virtually every environment on Earth — and, eventually, to leave it.",
      "The deep history of how we then spread across the planet is told in the next chapter of this site: the genomic record of ancient human migration."
    ]},
    {h:"Key Fossils", list:[
      "<strong>Jebel Irhoud</strong> (Morocco, ~315 ka) — the oldest known H. sapiens fossils.",
      "<strong>Omo Kibish & Herto</strong> (Ethiopia) — key early African moderns.",
      "<strong>Cro-Magnon</strong> (France) — early modern Europeans associated with rich Upper Palaeolithic culture."
    ]},
    {h:"Genetics & Legacy", p:[
      "Every living person descends from these African populations. As our ancestors expanded out of Africa from ~70,000 years ago, they met and interbred with Neanderthals and Denisovans — which is why those vanished cousins live on in our DNA. The story of where we went next is reconstructed, genome by genome, in the migration analysis that follows."
    ]}
  ],
  sources:[
    {name:"Smithsonian Human Origins — H. sapiens", url:"https://humanorigins.si.edu/evidence/human-fossils/species/homo-sapiens"},
    {name:"Natural History Museum — origin of our species", url:"https://www.nhm.ac.uk/discover/the-origin-of-our-species.html"}
  ]
}
];
