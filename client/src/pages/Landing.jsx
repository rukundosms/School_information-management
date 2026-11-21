import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { apiFetch } from '../api/client';

/* =====================================================================
   TRANSLATIONS — EN / RW / FR (complete coverage)
===================================================================== */
const TRANSLATIONS = {
  en: {
    /* ---- NAV ---- */
    nav: { home: 'Home', services: 'Services', blockchain: 'Blockchain', 'ai-ml': 'AI & ML', training: 'Training', resources: 'Resources', contact: 'Contact' },
    register: 'Register', login: 'Login', lang: 'Language',
    themeLight: 'Switch to light', themeDark: 'Switch to dark',

    /* ---- ANNOUNCEMENT ---- */
    announcement: { bold: 'New Blockchain cohort', rest: 'starts Dec 15 · Limited seats ·', cta: 'Enroll now' },

    /* ---- HERO ---- */
    hero: {
      badge: 'Empowering Tech Innovation',
      title1: 'Master', title2: 'Blockchain', title3: 'AI', title4: 'ML',
      subtitle: 'Premier ICT training, software development & motherboard repair — in East Africa.',
      trust1: '✔ 10+ Years Experience', trust2: '✔ Certified Technicians', trust3: '✔ 24/7 Support',
      cta1: 'Start Learning', cta2: 'Free Consultation',
      stories: 'Student Success Stories',
    },

    /* ---- STATS ---- */
    stats: {
      grads: 'Graduates', gradsSub: 'Trained',
      courses: 'Tech Courses', coursesSub: 'Languages',
      iap: 'IAP Students', iapSub: 'Attachment',
      partners: 'Partners', partnersSub: 'Hiring',
    },

    /* ---- QUICK LINKS ---- */
    quickLinks: { services: 'Services', blockchain: 'Blockchain', 'ai-ml': 'AI & ML', resources: 'Resources' },
    partners: 'Trusted by leading organizations',

    /* ---- SERVICES ---- */
    services: {
      tag: 'What We Offer', title: 'Our Services', subtitle: 'End-to-end ICT solutions',
      items: {
        custom: { title: 'Custom Software', desc: 'Enterprise-grade applications' },
        mobile: { title: 'Mobile Apps', desc: 'Cross-platform solutions' },
        cloud: { title: 'Cloud Solutions', desc: 'Cloud architecture & deployment' },
        blockchain: { title: 'Blockchain', desc: 'Web3 & smart contracts' },
        ai: { title: 'AI Solutions', desc: 'Intelligent systems' },
        ml: { title: 'Machine Learning', desc: 'Predictive models' },
      },
    },

    /* ---- BLOCKCHAIN ---- */
    blockchain: {
      tag: 'Web3 & Blockchain', title: 'Blockchain Development',
      card1: { title: 'Blockchain Dev', items: ['Ethereum & EVM', 'Smart Contracts', 'Solidity'] },
      card2: { title: 'DeFi & NFTs', items: ['DeFi', 'NFT Creation', 'Tokenomics'] },
      card3: { title: 'Enterprise', items: ['Hyperledger', 'Corda', 'Supply Chain'] },
    },

    /* ---- AI/ML ---- */
    ai: { title: 'AI & Machine Learning', ml: 'ML', nlp: 'NLP', cv: 'Computer Vision', ds: 'Data Science' },

    /* ---- TRAINING ---- */
    training: {
      title: 'Tech Training Programs',
      enroll: 'Enroll Now',
      fullStack: 'Full Stack', blockchain: 'Blockchain', aiml: 'AI/ML',
    },

    /* ---- IAP ---- */
    iap: {
      title: 'Industrial Attachment Program',
      desc: 'Bridge the gap between academic learning and industry requirements.',
      apply: 'Apply Now',
    },

    /* ---- TECH STACK ---- */
    tech: {
      title: 'Technology Stack',
      frontend: 'Frontend', backend: 'Backend', blockchain: 'Blockchain', aiml: 'AI/ML', database: 'Database',
    },

    /* ---- CAREERS ---- */
    careers: {
      title: 'Careers at FutureKing',
      subtitle: "Be part of East Africa's fastest-growing tech company",
      cta: 'Send Your CV',
    },

    /* ---- RESOURCES ---- */
    resources: {
      title: 'Learning Resources', subtitle: 'Guides for students and teachers',
      forStudents: 'For Students', forTeachers: 'For Teachers',
      searchPlaceholder: 'Search resources...',
      viewGuide: 'View Guide', showLess: 'Show Less',
      noResults: 'No resources found.', all: 'All',
      bookmarkSaved: '🔖 Saved', bookmarkRemoved: 'Removed',
      linkCopied: 'Link copied',
    },

    /* ---- FAQ ---- */
    faq: { title: 'Frequently Asked Questions' },

    /* ---- CONTACT ---- */
    contact: {
      title: 'Contact Us',
      open: 'Open now · Closes 8pm', closed: 'Currently closed',
      address: 'Kigali, Rwanda', clickToCopy: 'click to copy',
      namePlaceholder: 'Your name', emailPlaceholder: 'Your email', messagePlaceholder: 'Message',
      send: 'Send Message', sending: 'Sending...',
      sent: '📩 Message sent!',
      copied: (label) => `${label} copied`,
    },

    /* ---- MODALS ---- */
    loginModal: {
      title: 'Portal Access', username: 'Username', password: 'Password',
      showPassword: 'Show password', submit: 'Admin Login', submitting: 'Logging in...',
      studentPortal: 'Student Portal', teacherPortal: "Teachers' Portal",
    },
    registerModal: {
      title: 'Student Registration',
      firstname: 'First Name *', lastname: 'Last Name *', reg: 'Reg No (Index Number) *',
      level: 'Select Level *', district: 'District *', secter: 'Sector *',
      trade: 'Trade (Desire to Study) *', parentPhone: 'Parent Phone *',
      altPhone: 'Alternative Phone', gender: 'Select Gender *',
      submit: 'Submit Registration', submitting: 'Submitting...',
      success: '✅ Registration successful!',
      failed: 'Registration failed.',
      networkError: 'Network error.',
      levelRequired: 'Please select a level (L3, L4, L5, L6).',
      errorSubmitting: '❌ Error submitting registration.',
    },
    enrollModal: {
      title: (course) => `Enroll in ${course}`,
      subtitle: "We'll call you within 24h.",
      name: 'Full name', phone: 'Phone', email: 'Email (optional)',
      submit: 'Confirm Enrollment', submitting: 'Enrolling...',
      success: (course) => `🎉 Enrolled in ${course}!`,
      required: 'Name and phone are required.',
    },
    consultModal: {
      title: 'Book a Free Consultation',
      subtitle: '30-minute call with our team.',
      whatsapp: 'Chat on WhatsApp',
    },
    enroll: 'Enroll Now',

    /* ---- FOOTER ---- */
    footer: {
      quickLinks: 'Quick Links', contact: 'Contact', newsletter: 'Newsletter',
      subscribe: 'Go', rights: 'All rights reserved.',
      emailPlaceholder: 'Your email',
      subscribed: '✅ Subscribed!', invalidEmail: 'Enter a valid email.',
    },

    /* ---- COOKIE ---- */
    cookies: { message: '🍪 We use cookies to improve your experience.', decline: 'Decline', accept: 'Accept' },

    /* ---- REPAIR SIDEBAR ---- */
    repair: {
      title: 'Repairing Services by FutureKing LTD.',
      hint: 'Hover over any component image to see full size • Click to zoom • Complete motherboard repair',
      footer: 'Precision board-level repair • Genuine diagnostics',
      badgePhone: 'SMARTPHONE', badgeLaptop: 'LAPTOP',
      categories: {
        'power-regulation': 'Power Regulation & Protection',
        'switching-control': 'Switching & Control',
        'ics-logic': 'Integrated Circuits (ICs) & Logic',
        'data-components': 'Data Components',
        'power-time': 'Power & Time Preservation',
        'advanced': 'Advanced Electrical & Signal Components',
        'physical': 'Physical & Material Components',
        'audio-sensors': 'Audio & Specialized Sensor Components',
      },
      components: {
        'capacitors': { name: 'Capacitors (MLCC / Solid Polymer / Electrolytic)', desc: 'Store and release electrical energy. They smooth out voltage fluctuations to prevent crashes.' },
        'resistors': { name: 'Resistors & Inductors (Chokes)', desc: 'Resistors: Limit and control the flow of electrical current. Inductors: Filter high-frequency noise.' },
        'fuse': { name: 'Fuses & Diodes', desc: 'Fuses protect from power surges. Diodes ensure electricity flows in only one direction.' },
        'mosfets': { name: 'MOSFETs', desc: 'Act as high-speed electronic switches. Open and close millions of times per second.' },
        'vrm': { name: 'VRM Chips & Crystal Oscillators', desc: 'VRM controls precise power delivery to processor. Crystal Oscillators generate clock signals.' },
        'bios': { name: 'BIOS / UEFI Chip & Super I/O Chip', desc: 'BIOS stores startup software. Super I/O manages legacy ports and monitoring tools.' },
        'audio-codec': { name: 'Audio Codec IC & Ethernet Controller', desc: 'Audio Codec processes sound. Ethernet Controller manages wired network connection.' },
        'bus': { name: 'Bus Transceivers & Multiplexers', desc: 'Traffic directors for data. Switch data paths when multiple components share same bus line.' },
        'resistor-networks': { name: 'Resistor Networks & Logic Gates', desc: 'Pull data lines to stable voltages. Handle basic AND/OR logic operations.' },
        'tpm': { name: 'EEPROM, CMOS RAM & TPM', desc: 'EEPROM stores firmware. CMOS RAM keeps settings. TPM securely stores cryptographic keys.' },
        'cmos': { name: 'CMOS Battery, RTC & Shunt Resistors', desc: 'CMOS Battery keeps settings. RTC tracks time. Shunt Resistors measure current draw.' },
        'gold-pins': { name: 'Gold Pins, BGA & Headers', desc: 'Gold contact points resist corrosion. BGA mounts processors. Headers allow manual configuration.' },
        'optocouplers': { name: 'Optocouplers', desc: 'Transfer signals using light. Isolate high-voltage sections from sensitive data lines.' },
        'varistors': { name: 'Varistors, Ferrite Beads & Zener Diodes', desc: 'Varistors absorb voltage spikes. Ferrite Beads suppress EMI. Zener Diodes regulate voltage.' },
        'fr4': { name: 'FR-4 Substrate, Vias, Solder Mask & Ground Planes', desc: 'FR-4 is the board backbone. Vias connect layers. Solder Mask prevents oxidation.' },
        'audio-sensors': { name: 'Audio Capacitors, Shielding Cans & Sensors', desc: 'Audio capacitors filter sound. Shielding cans block interference. Sensors detect magnetic fields and temperature.' },
      },
    },
  },

  /* ============ KINYARWANDA ============ */
  rw: {
    nav: { home: 'Ahabanza', services: 'Serivisi', blockchain: 'Blockchain', 'ai-ml': 'AI & ML', training: 'Amahugurwa', resources: 'Ibikoresho', contact: 'Twandikire' },
    register: 'Kwiyandikisha', login: 'Injira', lang: 'Ururimi',
    themeLight: 'Hindura mu mucyo', themeDark: 'Hindura mu mwijima',

    announcement: { bold: 'Itsinda rishya rya Blockchain', rest: 'ritangira ku wa 15 Ukuboza · Imyanya mike ·', cta: 'Iyandikishe ubu' },

    hero: {
      badge: 'Guteza imbere Ikoranabuhanga',
      title1: 'Menya', title2: 'Blockchain', title3: 'AI', title4: 'ML',
      subtitle: "Amahugurwa ya mbere mu bijyanye n'ikoranabuhanga, gutunganya porogaramu no gusana mudasobwa mu Afurika y'Iburasirazuba.",
      trust1: "✔ Uburambe bw'imyaka 10+", trust2: '✔ Abatekinisiye bafite ibyemezo', trust3: '✔ Ubufasha 24/7',
      cta1: 'Tangira Kwiga', cta2: "Ubujyanama Bw'ubuntu",
      stories: "Inkuru z'Itsinda ry'Abanyeshuri",
    },

    stats: {
      grads: 'Abahuguwe', gradsSub: 'Bahuguwe',
      courses: 'Amasomo', coursesSub: 'Indimi',
      iap: 'Abanyeshuri ba IAP', iapSub: 'Imyitozo',
      partners: 'Abafatanyabikorwa', partnersSub: 'Bakira abakozi',
    },

    quickLinks: { services: 'Serivisi', blockchain: 'Blockchain', 'ai-ml': 'AI & ML', resources: 'Ibikoresho' },
    partners: "Twizewe n'imiryango ikomeye",

    services: {
      tag: 'Ibyo dutanga', title: 'Serivisi Zacu', subtitle: "Ibisubizo byuzuye mu by'ikoranabuhanga",
      items: {
        custom: { title: 'Porogaramu Zihariye', desc: "Porogaramu z'urwego rwo hejuru" },
        mobile: { title: 'Porogaramu za Telefone', desc: 'Ibisubizo binyuranye' },
        cloud: { title: "Ibisubizo by'Igicu", desc: "Ubwubatsi n'ishyirwa mu bikorwa by'igicu" },
        blockchain: { title: 'Blockchain', desc: 'Web3 namasezerano yubwenge' },
        ai: { title: 'Ibisubizo bya AI', desc: 'Sisitemu zubwenge' },
        ml: { title: 'Kwiga kw\'Imashini', desc: 'Moderi ziteganya' },
      },
    },

    blockchain: {
      tag: 'Web3 & Blockchain', title: 'Iterambere rya Blockchain',
      card1: { title: 'Iterambere rya Blockchain', items: ['Ethereum & EVM', 'Amasezerano yubwenge', 'Solidity'] },
      card2: { title: 'DeFi & NFTs', items: ['DeFi', 'Gukora NFT', 'Tokenomics'] },
      card3: { title: 'Ubucuruzi', items: ['Hyperledger', 'Corda', 'Urunana rw\'ibicuruzwa'] },
    },

    ai: { title: 'AI & Kwiga kw\'Imashini', ml: 'ML', nlp: 'NLP', cv: 'Kureba kw\'Imashini', ds: "Ubumenyi bw'Amakuru" },

    training: {
      title: "Gahunda z'Amahugurwa",
      enroll: 'Iyandikishe Ubu',
      fullStack: 'Full Stack', blockchain: 'Blockchain', aiml: 'AI/ML',
    },

    iap: {
      title: "Gahunda y'Imyitozo mu Nganda",
      desc: "Huza icyuho kiri hagati y'amahugurwa n'ibisabwa mu nganda.",
      apply: 'Saba Ubu',
    },

    tech: {
      title: "Ibikoresho by'Ikoranabuhanga",
      frontend: 'Imbere', backend: 'Inyuma', blockchain: 'Blockchain', aiml: 'AI/ML', database: 'Ububiko bw\'Amakuru',
    },

    careers: {
      title: 'Akazi muri FutureKing',
      subtitle: "Ba umwe mu bafatanyabikorwa b'ikoranabuhanga rikura vuba mu Afurika y'Iburasirazuba",
      cta: 'Ohereza CV Yawe',
    },

    resources: {
      title: "Ibikoresho byo Kwiga", subtitle: "Ubuyobozi ku banyeshuri n'abarimu",
      forStudents: 'Abanyeshuri', forTeachers: 'Abarimu',
      searchPlaceholder: 'Shakisha ibikoresho...',
      viewGuide: 'Reba Umuyoboro', showLess: 'Erekana Bike',
      noResults: 'Nta bikoresho byabonetse.', all: 'Byose',
      bookmarkSaved: '🔖 Byabitswe', bookmarkRemoved: 'Byakuweho',
      linkCopied: 'Umurongo wakoporowe',
    },

    faq: { title: 'Ibibazo Bikunze Kubazwa' },

    contact: {
      title: 'Twandikire',
      open: 'Irafunguye ubu · Ifunga saa yine', closed: 'Ifunze ubu',
      address: 'Kigali, u Rwanda', clickToCopy: 'kanda ube wandike',
      namePlaceholder: 'Izina ryawe', emailPlaceholder: 'Imeyili yawe', messagePlaceholder: 'Ubutumwa',
      send: 'Ohereza Ubutumwa', sending: 'Kohereza...',
      sent: '📩 Ubutumwa bwoherejwe!',
      copied: (label) => `${label} yakoporowe`,
    },

    loginModal: {
      title: 'Kwinjira muri Portal', username: "Izina ry'umukoresha", password: "Ijambo ry'ibanga",
      showPassword: 'Erekana ijambo ry\'ibanga', submit: 'Kwinjira nka Admin', submitting: 'Kwinjira...',
      studentPortal: 'Portal y\'Abanyeshuri', teacherPortal: 'Portal y\'Abarimu',
    },
    registerModal: {
      title: "Kwiyandikisha kw'Umunyeshuri",
      firstname: 'Izina *', lastname: 'Izina ry\'Umuryango *', reg: 'Nomero y\'iyandikisha *',
      level: 'Hitamo Urwego *', district: 'Akarere *', secter: 'Umurenge *',
      trade: 'Umwuga (Ushaka Kwiga) *', parentPhone: 'Telefone y\'Umubyeyi *',
      altPhone: 'Telefone Indi', gender: 'Hitamo Igitsina *',
      submit: 'Ohereza Kwiyandikisha', submitting: 'Kohereza...',
      success: '✅ Kwiyandikisha byagenze neza!',
      failed: 'Kwiyandikisha byanze.',
      networkError: 'Ikibazo cy\'umuyoboro.',
      levelRequired: 'Hitamo urwego (L3, L4, L5, L6).',
      errorSubmitting: '❌ Ikibazo cyohereza kwiyandikisha.',
    },
    enrollModal: {
      title: (course) => `Kwiyandikisha muri ${course}`,
      subtitle: 'Tuzakuhamagara mu masaha 24.',
      name: 'Amazina yombi', phone: 'Telefone', email: 'Imeyili (bidategetswe)',
      submit: 'Emeza Kwiyandikisha', submitting: 'Kwiyandikisha...',
      success: (course) => `🎉 Wiyandikishije muri ${course}!`,
      required: 'Amazina na telefone birakenewe.',
    },
    consultModal: {
      title: "Saba Ubujyanama Bw'ubuntu",
      subtitle: 'Ikiganiro cy\'iminota 30 n\'itsinda ryacu.',
      whatsapp: 'Vugana natwe kuri WhatsApp',
    },
    enroll: 'Iyandikishe Ubu',

    footer: {
      quickLinks: 'Amahuza yihuse', contact: 'Twandikire', newsletter: 'Amakuru Mashya',
      subscribe: 'Ohereza', rights: 'Uburenganzira bwose burafitwe.',
      emailPlaceholder: 'Imeyili yawe',
      subscribed: '✅ Wiyandikishije!', invalidEmail: 'Andika imeyili yemewe.',
    },

    cookies: { message: '🍪 Dukoresha cookies kunoza uburambe bwawe.', decline: 'Reka', accept: 'Emeza' },

    repair: {
      title: 'Serivisi zo Gusana zitangwa na FutureKing LTD.',
      hint: 'Shyira imbeba ku ifoto y\'igice kugira urebe nini • Kanda kugira wongere • Gusana byuzuye',
      footer: 'Gusana ku rwego rwo hejuru • Isuzuma ry\'ukuri',
      badgePhone: 'TELEFONE', badgeLaptop: 'LAPTOP',
      categories: {
        'power-regulation': 'Kugenzura no Kurinda Ingufu',
        'switching-control': 'Guhindura no Kugenzura',
        'ics-logic': 'Ibice byuzuye (ICs) n\'Ubwenge',
        'data-components': 'Ibice by\'Amakuru',
        'power-time': 'Kubika Ingufu n\'Igihe',
        'advanced': 'Ibice by\'Imbere by\'Amashanyarazi',
        'physical': 'Ibice by\'Umubiri',
        'audio-sensors': 'Ibice by\'Amajwi n\'Ibipimo',
      },
      components: {
        'capacitors': { name: 'Capacitors (MLCC / Solid Polymer / Electrolytic)', desc: 'Bika kandi busohora ingufu z\'amashanyarazi. Bigabanya impinduka z\'umuriro.' },
        'resistors': { name: 'Resistors & Inductors (Chokes)', desc: 'Resistors: Gabanya kandi genzura umuvuduko w\'amashanyarazi. Inductors: Kura amajwi y\'umuvuduko mwinshi.' },
        'fuse': { name: 'Fuses & Diodes', desc: 'Fuses zirinda imivuduko. Diodes zemeza ko amashanyarazi agenda mu cyerekezo kimwe.' },
        'mosfets': { name: 'MOSFETs', desc: 'Zikora nk\'ibikoresho byihuse by\'amashanyarazi. Zifungura kandi zifunga inshuro nyinshi mu isegonda.' },
        'vrm': { name: 'VRM Chips & Crystal Oscillators', desc: 'VRM igenzura itangwa ry\'ingufu mu processor. Crystal Oscillators itanga ibimenyetso by\'igihe.' },
        'bios': { name: 'BIOS / UEFI Chip & Super I/O Chip', desc: 'BIOS ibika porogaramu yo gutangira. Super I/O igenzura ibice bya kera.' },
        'audio-codec': { name: 'Audio Codec IC & Ethernet Controller', desc: 'Audio Codec itunganya amajwi. Ethernet Controller igenzura umurongo w\'itumanaho.' },
        'bus': { name: 'Bus Transceivers & Multiplexers', desc: 'Abayobozi b\'amakuru. Hindura inzira z\'amakuru iyo ibice byinshi bisangiye umurongo.' },
        'resistor-networks': { name: 'Resistor Networks & Logic Gates', desc: 'Shyira imirongo y\'amakuru ku muriro uhamye. Kora ibikorwa bya AND/OR.' },
        'tpm': { name: 'EEPROM, CMOS RAM & TPM', desc: 'EEPROM ibika firmware. CMOS RAM ibika igenamiterere. TPM ibika urufunguzo rw\'ibanga.' },
        'cmos': { name: 'CMOS Battery, RTC & Shunt Resistors', desc: 'CMOS Battery ibika igenamiterere. RTC ikurikirana igihe. Shunt Resistors zipima umuriro.' },
        'gold-pins': { name: 'Gold Pins, BGA & Headers', desc: 'Ahantu h\'inzahabo hirwanya kwangirika. BGA ishyira processors. Headers zituma igenamiterere rikorwa n\'intoki.' },
        'optocouplers': { name: 'Optocouplers', desc: 'Ohereza ibimenyetso ukoresheje urumuri. Tandukanya ibice by\'umuriro munini n\'imirongo y\'amakuru.' },
        'varistors': { name: 'Varistors, Ferrite Beads & Zener Diodes', desc: 'Varistors zikura imivuduko. Ferrite Beads zikura EMI. Zener Diodes zigenzura umuriro.' },
        'fr4': { name: 'FR-4 Substrate, Vias, Solder Mask & Ground Planes', desc: 'FR-4 ni urufatiro rw\'ikibaho. Vias zihuza ibice. Solder Mask irinda kwangirika.' },
        'audio-sensors': { name: 'Audio Capacitors, Shielding Cans & Sensors', desc: 'Audio capacitors zikura amajwi. Shielding cans zirinda imbaraga. Sensors zipima imbaraga za rukuruzi n\'ubushyuhe.' },
      },
    },
  },

  /* ============ FRANÇAIS ============ */
  fr: {
    nav: { home: 'Accueil', services: 'Services', blockchain: 'Blockchain', 'ai-ml': 'IA & ML', training: 'Formation', resources: 'Ressources', contact: 'Contact' },
    register: "S'inscrire", login: 'Connexion', lang: 'Langue',
    themeLight: 'Passer au clair', themeDark: 'Passer au sombre',

    announcement: { bold: 'Nouvelle cohorte Blockchain', rest: 'débute le 15 déc · Places limitées ·', cta: "S'inscrire" },

    hero: {
      badge: "Autonomiser l'innovation technologique",
      title1: 'Maîtrisez', title2: 'Blockchain', title3: 'IA', title4: 'ML',
      subtitle: "Formation TIC, développement logiciel et réparation de cartes mères — en Afrique de l'Est.",
      trust1: "✔ 10+ ans d'expérience", trust2: '✔ Techniciens certifiés', trust3: '✔ Support 24/7',
      cta1: 'Commencer', cta2: 'Consultation gratuite',
      stories: 'Histoires de réussite',
    },

    stats: {
      grads: 'Diplômés', gradsSub: 'Formés',
      courses: 'Cours', coursesSub: 'Langages',
      iap: 'Étudiants IAP', iapSub: 'Stage',
      partners: 'Partenaires', partnersSub: 'Embauchent',
    },

    quickLinks: { services: 'Services', blockchain: 'Blockchain', 'ai-ml': 'IA & ML', resources: 'Ressources' },
    partners: 'Approuvé par des organisations de premier plan',

    services: {
      tag: 'Ce que nous offrons', title: 'Nos services', subtitle: 'Solutions TIC de bout en bout',
      items: {
        custom: { title: 'Logiciels sur mesure', desc: "Applications d'entreprise" },
        mobile: { title: 'Applications mobiles', desc: 'Solutions multiplateformes' },
        cloud: { title: 'Solutions cloud', desc: 'Architecture et déploiement cloud' },
        blockchain: { title: 'Blockchain', desc: 'Web3 et contrats intelligents' },
        ai: { title: 'Solutions IA', desc: 'Systèmes intelligents' },
        ml: { title: 'Apprentissage automatique', desc: 'Modèles prédictifs' },
      },
    },

    blockchain: {
      tag: 'Web3 & Blockchain', title: 'Développement Blockchain',
      card1: { title: 'Dév Blockchain', items: ['Ethereum & EVM', 'Contrats intelligents', 'Solidity'] },
      card2: { title: 'DeFi & NFTs', items: ['DeFi', 'Création NFT', 'Tokenomics'] },
      card3: { title: 'Entreprise', items: ['Hyperledger', 'Corda', 'Chaîne logistique'] },
    },

    ai: { title: 'IA & Apprentissage automatique', ml: 'ML', nlp: 'NLP', cv: 'Vision par ordinateur', ds: 'Science des données' },

    training: {
      title: 'Programmes de formation',
      enroll: "S'inscrire",
      fullStack: 'Full Stack', blockchain: 'Blockchain', aiml: 'IA/ML',
    },

    iap: {
      title: "Programme d'immersion industrielle",
      desc: "Combler le fossé entre l'apprentissage académique et les exigences de l'industrie.",
      apply: 'Postuler',
    },

    tech: {
      title: 'Stack technologique',
      frontend: 'Frontend', backend: 'Backend', blockchain: 'Blockchain', aiml: 'IA/ML', database: 'Base de données',
    },

    careers: {
      title: 'Carrières chez FutureKing',
      subtitle: "Rejoignez l'entreprise technologique à la croissance la plus rapide d'Afrique de l'Est",
      cta: 'Envoyez votre CV',
    },

    resources: {
      title: "Ressources d'apprentissage", subtitle: 'Guides pour étudiants et enseignants',
      forStudents: 'Étudiants', forTeachers: 'Enseignants',
      searchPlaceholder: 'Rechercher des ressources...',
      viewGuide: 'Voir le guide', showLess: 'Voir moins',
      noResults: 'Aucune ressource trouvée.', all: 'Tout',
      bookmarkSaved: '🔖 Sauvegardé', bookmarkRemoved: 'Retiré',
      linkCopied: 'Lien copié',
    },

    faq: { title: 'Questions fréquemment posées' },

    contact: {
      title: 'Contactez-nous',
      open: 'Ouvert maintenant · Ferme à 20h', closed: 'Actuellement fermé',
      address: 'Kigali, Rwanda', clickToCopy: 'cliquez pour copier',
      namePlaceholder: 'Votre nom', emailPlaceholder: 'Votre email', messagePlaceholder: 'Message',
      send: 'Envoyer le message', sending: 'Envoi...',
      sent: '📩 Message envoyé!',
      copied: (label) => `${label} copié`,
    },

    loginModal: {
      title: 'Accès au portail', username: "Nom d'utilisateur", password: 'Mot de passe',
      showPassword: 'Afficher le mot de passe', submit: 'Connexion Admin', submitting: 'Connexion...',
      studentPortal: 'Portail Étudiants', teacherPortal: 'Portail Enseignants',
    },
    registerModal: {
      title: 'Inscription Étudiant',
      firstname: 'Prénom *', lastname: 'Nom *', reg: "N° d'inscription *",
      level: 'Sélectionner le niveau *', district: 'District *', secter: 'Secteur *',
      trade: "Métier (Souhaite étudier) *", parentPhone: 'Téléphone parent *',
      altPhone: 'Téléphone alternatif', gender: 'Sélectionner le genre *',
      submit: "Soumettre l'inscription", submitting: 'Envoi...',
      success: '✅ Inscription réussie!',
      failed: "Échec de l'inscription.",
      networkError: 'Erreur réseau.',
      levelRequired: 'Veuillez sélectionner un niveau (L3, L4, L5, L6).',
      errorSubmitting: "❌ Erreur lors de l'inscription.",
    },
    enrollModal: {
      title: (course) => `S'inscrire à ${course}`,
      subtitle: 'Nous vous appellerons dans les 24h.',
      name: 'Nom complet', phone: 'Téléphone', email: 'Email (optionnel)',
      submit: "Confirmer l'inscription", submitting: 'Inscription...',
      success: (course) => `🎉 Inscrit à ${course}!`,
      required: 'Le nom et le téléphone sont requis.',
    },
    consultModal: {
      title: 'Réserver une consultation gratuite',
      subtitle: 'Appel de 30 minutes avec notre équipe.',
      whatsapp: 'Discuter sur WhatsApp',
    },
    enroll: "S'inscrire",

    footer: {
      quickLinks: 'Liens rapides', contact: 'Contact', newsletter: 'Newsletter',
      subscribe: 'Go', rights: 'Tous droits réservés.',
      emailPlaceholder: 'Votre email',
      subscribed: '✅ Abonné!', invalidEmail: 'Entrez un email valide.',
    },

    cookies: { message: '🍪 Nous utilisons des cookies pour améliorer votre expérience.', decline: 'Refuser', accept: 'Accepter' },

    repair: {
      title: 'Services de réparation par FutureKing LTD.',
      hint: "Survolez l'image d'un composant pour voir la taille réelle • Cliquez pour zoomer • Réparation complète de carte mère",
      footer: 'Réparation de précision au niveau de la carte • Diagnostics authentiques',
      badgePhone: 'TÉLÉPHONE', badgeLaptop: 'ORDINATEUR',
      categories: {
        'power-regulation': 'Régulation et protection',
        'switching-control': 'Commutation et contrôle',
        'ics-logic': 'Circuits intégrés (CI) et logique',
        'data-components': 'Composants de données',
        'power-time': "Conservation de l'alimentation et du temps",
        'advanced': 'Composants électriques avancés',
        'physical': 'Composants physiques',
        'audio-sensors': 'Composants audio et capteurs',
      },
      components: {
        'capacitors': { name: 'Condensateurs (MLCC / Polymère solide / Électrolytique)', desc: "Stockent et libèrent l'énergie électrique. Ils lissent les fluctuations de tension pour éviter les plantages." },
        'resistors': { name: 'Résistances et inductances (selfs)', desc: "Résistances : limitent et contrôlent le flux de courant. Inductances : filtrent le bruit haute fréquence." },
        'fuse': { name: 'Fusibles et diodes', desc: "Les fusibles protègent contre les surtensions. Les diodes assurent que l'électricité circule dans une seule direction." },
        'mosfets': { name: 'MOSFETs', desc: "Agissent comme des interrupteurs électroniques haute vitesse. Ouvrent et ferment des millions de fois par seconde." },
        'vrm': { name: 'Puces VRM et oscillateurs à quartz', desc: "Le VRM contrôle la livraison précise d'énergie au processeur. Les oscillateurs génèrent des signaux d'horloge." },
        'bios': { name: 'Puce BIOS / UEFI et Super I/O', desc: "Le BIOS stocke le logiciel de démarrage. Le Super I/O gère les ports hérités." },
        'audio-codec': { name: 'Codec audio et contrôleur Ethernet', desc: "Le codec audio traite le son. Le contrôleur Ethernet gère la connexion réseau filaire." },
        'bus': { name: 'Bus émetteurs-récepteurs et multiplexeurs', desc: "Directeurs de trafic pour les données. Commutent les chemins de données quand plusieurs composants partagent le même bus." },
        'resistor-networks': { name: 'Réseaux de résistances et portes logiques', desc: "Tirent les lignes de données vers des tensions stables. Gèrent les opérations logiques AND/OR." },
        'tpm': { name: 'EEPROM, RAM CMOS et TPM', desc: "L'EEPROM stocke le firmware. La RAM CMOS conserve les paramètres. Le TPM stocke les clés cryptographiques." },
        'cmos': { name: 'Pile CMOS, RTC et résistances shunt', desc: "La pile CMOS conserve les paramètres. La RTC suit le temps. Les résistances shunt mesurent le courant." },
        'gold-pins': { name: 'Broches dorées, BGA et headers', desc: "Les points de contact dorés résistent à la corrosion. BGA monte les processeurs. Les headers permettent la configuration manuelle." },
        'optocouplers': { name: 'Optocoupleurs', desc: "Transfèrent les signaux par la lumière. Isolent les sections haute tension des lignes de données sensibles." },
        'varistors': { name: 'Varistances, perles de ferrite et diodes Zener', desc: "Les varistances absorbent les pics de tension. Les perles de ferrite suppriment les EMI. Les diodes Zener régulent la tension." },
        'fr4': { name: 'Substrat FR-4, vias, masque de soudure et plans de masse', desc: "Le FR-4 est la colonne vertébrale de la carte. Les vias connectent les couches. Le masque de soudure empêche l'oxydation." },
        'audio-sensors': { name: 'Condensateurs audio, blindages et capteurs', desc: "Les condensateurs audio filtrent le son. Les blindages bloquent les interférences. Les capteurs détectent les champs magnétiques et la température." },
      },
    },
  },
};

const LangContext = createContext('en');
const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

/* =====================================================================
   REPAIR DATA (keys map to i18n)
===================================================================== */
const REPAIR_CATEGORIES = [
  { id: 'power-regulation', icon: 'fa-bolt', iconColor: 'text-yellow-500', components: [
    { key: 'capacitors', img: '/assets/capacitors.jpg', badges: ['phone', 'laptop'] },
    { key: 'resistors', img: '/assets/resistors.jpg', badges: ['phone', 'laptop'] },
    { key: 'fuse', img: '/assets/fuse.jpg', badges: ['phone', 'laptop'] },
  ]},
  { id: 'switching-control', icon: 'fa-microchip', iconColor: 'text-indigo-500', components: [
    { key: 'mosfets', img: '/assets/MOSFETs.jpg', badges: ['phone', 'laptop'] },
    { key: 'vrm', img: '/assets/VRM.jpg', badges: ['phone', 'laptop'] },
  ]},
  { id: 'ics-logic', icon: 'fa-microchip', iconColor: 'text-slate-600', components: [
    { key: 'bios', img: '/assets/BIOS.jpg', badges: ['phone', 'laptop'] },
    { key: 'audio-codec', img: '/assets/Audio Codec IC.jpg', badges: ['phone', 'laptop'] },
  ]},
  { id: 'data-components', icon: 'fa-database', iconColor: 'text-blue-500', components: [
    { key: 'bus', img: '/assets/Bus_Transceivers_%20Multiplexers.jpg', badges: ['phone', 'laptop'] },
    { key: 'resistor-networks', img: '/assets/Resistor Networks.jpg', badges: ['phone', 'laptop'] },
    { key: 'tpm', img: '/assets/TPM (Trusted Platform Module).jpg', badges: ['phone', 'laptop'] },
  ]},
  { id: 'power-time', icon: 'fa-clock', iconColor: 'text-amber-600', components: [
    { key: 'cmos', img: '/assets/CMOS RAM Chip.jpg', badges: ['phone', 'laptop'] },
    { key: 'gold-pins', img: '/assets/Gold_Pins%20_Pads.jpg', badges: ['phone', 'laptop'] },
  ]},
  { id: 'advanced', icon: 'fa-shield-alt', iconColor: 'text-red-500', components: [
    { key: 'optocouplers', img: '/assets/diode.jpg', badges: ['phone', 'laptop'] },
    { key: 'varistors', img: '', badges: ['phone', 'laptop'] },
  ]},
  { id: 'physical', icon: 'fa-layer-group', iconColor: 'text-gray-500', components: [
    { key: 'fr4', img: '', badges: ['phone', 'laptop'] },
  ]},
  { id: 'audio-sensors', icon: 'fa-headphones', iconColor: 'text-emerald-600', components: [
    { key: 'audio-sensors', img: '', badges: ['phone', 'laptop'] },
  ]},
];

/* =====================================================================
   CONSTANTS
===================================================================== */
const REGISTER_LEVELS = ['L3', 'L4', 'L5', 'L6'];
const GENDERS = ['Male', 'Female', 'Other'];
const EMPTY_REGISTRATION = { firstname: '', lastname: '', reg: '', level: '', district: '', secter: '', trade: '', parent_phone: '', alt_phone: '', gender: '' };
const NAV_SECTIONS = ['home', 'services', 'blockchain', 'ai-ml', 'training', 'resources', 'contact'];
const FOOTER_LINKS = ['home', 'services', 'training', 'resources', 'iap', 'technologies', 'careers', 'faq', 'contact'];
const NAV_ICONS = { home: 'fa-house', services: 'fa-laptop-code', blockchain: 'fa-cube', 'ai-ml': 'fa-brain', training: 'fa-graduation-cap', resources: 'fa-book-open', contact: 'fa-envelope', iap: 'fa-briefcase', technologies: 'fa-layer-group', careers: 'fa-user-tie', faq: 'fa-circle-question' };

const WHATSAPP_NUMBER = '250788965576';
const PHONE_DISPLAY = '+250 788 965 576';
const EMAIL = 'info@futurekingtech.org';

const TESTIMONIALS = [
  { name: 'Aline Uwase', role: 'Full Stack Developer @ Bank of Kigali', text: "FutureKing's Full Stack program changed my life. I went from zero coding to a junior developer role in 6 months.", avatar: '👩🏾‍💻' },
  { name: 'Eric Nkurunziza', role: 'Blockchain Engineer @ Web3 Startup', text: 'The blockchain course was practical, current, and taught by real engineers. I built my first DApp in week 3.', avatar: '👨🏿‍💻' },
  { name: 'Claudine Mukamana', role: 'Data Analyst @ Irembo', text: 'The ML track gave me the portfolio I needed. My Kaggle projects were the reason I got hired.', avatar: '👩🏾‍🔬' },
  { name: 'Patrick Habimana', role: 'Student, L5 Software Development', text: 'The IAP program connected me with mentors from top companies. Now I intern at a real startup.', avatar: '👨🏾‍🎓' },
];

const PARTNERS = ['MTN Rwanda', 'Bank of Kigali', 'Irembo', 'Airtel', 'RDB', 'Kigali Innovation City'];

const FAQS = [
  { q: 'Do I need prior programming experience?', a: 'No. Our Beginner tracks start from fundamentals.' },
  { q: 'Are the courses online or in-person?', a: 'Both. In-person in Kigali and live online across East Africa.' },
  { q: 'Do you offer job placement?', a: 'Yes — IAP partners with 50+ companies. 78% hired within 6 months.' },
  { q: 'Can I pay in installments?', a: 'Yes. Flexible payment plans available via WhatsApp.' },
  { q: 'What languages do you teach in?', a: 'English default. Kinyarwanda and French support for beginners.' },
  { q: 'How long does motherboard repair take?', a: 'Most same-day or within 48h. Diagnostic is free.' },
];

const OPEN_HOURS = { 0: { open: null, close: null }, 1: { open: 8, close: 20 }, 2: { open: 8, close: 20 }, 3: { open: 8, close: 20 }, 4: { open: 8, close: 20 }, 5: { open: 8, close: 20 }, 6: { open: 8, close: 18 } };

const STUDENT_RESOURCES = [
  { id: 1, title: 'Blockchain for Beginners', category: 'blockchain', level: 'Beginner', duration: '4 weeks', description: 'Learn the fundamentals of blockchain technology.', content: "Learn blockchain architecture, smart contracts, DApps, and real-world applications." },
  { id: 2, title: 'Master React.js', category: 'reactjs', level: 'Intermediate', duration: '6 weeks', description: 'Comprehensive React.js guide.', content: "React fundamentals, hooks, Redux, and connecting to backend APIs." },
  { id: 3, title: 'Machine Learning Fundamentals', category: 'ml', level: 'Advanced', duration: '8 weeks', description: 'Intro to ML algorithms.', content: "Python basics, Scikit-learn, TensorFlow, Kaggle, capstone project." },
  { id: 4, title: 'Python Programming Mastery', category: 'python', level: 'Beginner', duration: '5 weeks', description: 'Complete Python guide.', content: "Python syntax, OOP, file handling, data science libs." },
  { id: 5, title: 'JavaScript: The Complete Guide', category: 'javascript', level: 'Beginner', duration: '4 weeks', description: 'Master JavaScript.', content: "ES6+, async JS, DOM, API integration." },
  { id: 6, title: 'Database Design and Management', category: 'databases', level: 'Intermediate', duration: '4 weeks', description: 'SQL, NoSQL, optimization.', content: "SQL queries, normalization, indexing, MongoDB." },
];

const TEACHER_RESOURCES = [
  { id: 1, title: 'Using AI to Create Lesson Plans', category: 'ai', description: 'AI for lesson plans.', content: "ChatGPT, Education Copilot, Curipod, best practices." },
  { id: 2, title: 'Pedagogical Document Preparation', category: 'ai', description: 'AI for syllabi, rubrics.', content: "Syllabi, rubrics, progress reports, study guides." },
  { id: 3, title: 'Personalized Learning with AI', category: 'ai', description: 'Adaptive learning paths.', content: "Intelligent tutoring, adaptive assessment, learning analytics." },
  { id: 4, title: 'Blockchain in Education', category: 'blockchain', description: 'Blockchain for credentials.', content: "Digital diplomas, transcripts, micro-credentials." },
  { id: 5, title: 'Gamification in Programming Education', category: 'reactjs', description: 'Game-based learning.', content: "CodeCombat, Codewars, GitHub Classroom." },
  { id: 6, title: 'Project-Based Learning Framework', category: 'javascript', description: 'Real-world projects.', content: "Discovery, planning, development, testing, deployment, presentation." },
];

/* =====================================================================
   HELPERS
===================================================================== */
function getKigaliNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 2 * 3600 * 1000);
}
function isCurrentlyOpen() {
  const k = getKigaliNow();
  const day = OPEN_HOURS[k.getDay()];
  if (!day || day.open === null) return false;
  return k.getHours() >= day.open && k.getHours() < day.close;
}
function copyToClipboard(text) {
  try { navigator.clipboard?.writeText(text); return true; } catch { return false; }
}

/* =====================================================================
   MAIN COMPONENT
===================================================================== */
export default function Landing() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [regForm, setRegForm] = useState(EMPTY_REGISTRATION);
  const [regLoading, setRegLoading] = useState(false);
  const [regAlert, setRegAlert] = useState({ type: '', message: '' });
  const [repairOpen, setRepairOpen] = useState(true);
  const [preview, setPreview] = useState({ src: '', x: 0, y: 0, visible: false });
  const [lightboxImage, setLightboxImage] = useState(null);
  const [resourcesTab, setResourcesTab] = useState('students');
  const [resourcesCategory, setResourcesCategory] = useState('all');
  const [resourcesSearch, setResourcesSearch] = useState('');
  const [expandedResource, setExpandedResource] = useState(null);
  const [bookmarkedResources, setBookmarkedResources] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackTop, setShowBackTop] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [cookieConsent, setCookieConsent] = useState(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [isOpenNow, setIsOpenNow] = useState(isCurrentlyOpen());
  const [enrollCourse, setEnrollCourse] = useState(null);
  const [enrollForm, setEnrollForm] = useState({ name: '', phone: '', email: '' });
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [counterValues, setCounterValues] = useState({ grads: 0, courses: 0, iap: 0, partners: 0 });
  const [heroStatsAnimated, setHeroStatsAnimated] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const modalRef = useRef(null);
  const registerModalRef = useRef(null);
  const heroStatsRef = useRef(null);
  const langRef = useRef(null);

  const t = TRANSLATIONS[lang];

  /* EFFECTS */
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && FOOTER_LINKS.includes(hash)) setActiveSection(hash);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('fk-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const enabled = stored ? stored === 'dark' : !!prefersDark;
    setDarkMode(enabled);
    if (enabled) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('fk-theme', darkMode ? 'dark' : 'light');
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    const stored = localStorage.getItem('fk-lang');
    if (stored && TRANSLATIONS[stored]) setLang(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem('fk-lang', lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  useEffect(() => {
    const click = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('fk-cookies');
    if (stored === 'accepted' || stored === 'declined') setCookieConsent(stored);
    try {
      const bm = JSON.parse(localStorage.getItem('fk-bookmarks') || '[]');
      if (Array.isArray(bm)) setBookmarkedResources(bm);
    } catch {}
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setScrollProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
      setShowBackTop(h.scrollTop > 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setIsOpenNow(isCurrentlyOpen()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTestimonialIndex((i) => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!heroStatsRef.current) return;
    const targets = { grads: 500, courses: 15, iap: 200, partners: 50 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !heroStatsAnimated) {
          setHeroStatsAnimated(true);
          const start = performance.now();
          const duration = 1400;
          const tick = (now) => {
            const prog = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - prog, 3);
            setCounterValues({
              grads: Math.round(targets.grads * eased),
              courses: Math.round(targets.courses * eased),
              iap: Math.round(targets.iap * eased),
              partners: Math.round(targets.partners * eased),
            });
            if (prog < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.3 });
    observer.observe(heroStatsRef.current);
    return () => observer.disconnect();
  }, [heroStatsAnimated]);

  useEffect(() => {
    const click = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setLoginModalOpen(false);
        setLoginError('');
        setLoginForm({ username: '', password: '' });
      }
    };
    if (loginModalOpen) {
      document.addEventListener('mousedown', click);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.removeEventListener('mousedown', click);
      document.body.style.overflow = 'unset';
    };
  }, [loginModalOpen]);

  useEffect(() => {
    const click = (e) => {
      if (registerModalRef.current && !registerModalRef.current.contains(e.target)) {
        setRegisterModalOpen(false);
        setRegAlert({ type: '', message: '' });
      }
    };
    if (registerModalOpen) {
      document.addEventListener('mousedown', click);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', click);
      if (!loginModalOpen) document.body.style.overflow = 'unset';
    };
  }, [registerModalOpen, loginModalOpen]);

  useEffect(() => {
    const k = (e) => {
      if (e.key !== 'Escape') return;
      setLoginModalOpen(false);
      setRegisterModalOpen(false);
      setEnrollCourse(null);
      setLightboxImage(null);
      setConsultOpen(false);
      setLangOpen(false);
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  /* TOASTS */
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4000);
  }, []);

  /* HANDLERS */
  const showSection = (id) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    window.location.hash = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const response = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
      });
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setLoginModalOpen(false);
        setLoginForm({ username: '', password: '' });
        navigate(response.user?.position === 3 ? '/dod' : '/admin/home');
      } else setLoginError('Invalid credentials.');
    } catch (err) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegChange = (e) => {
    setRegForm({ ...regForm, [e.target.name]: e.target.value });
    if (regAlert.message) setRegAlert({ type: '', message: '' });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.level) {
      setRegAlert({ type: 'error', message: t.registerModal.levelRequired });
      return;
    }
    setRegLoading(true);
    setRegAlert({ type: '', message: '' });
    const fd = new FormData();
    Object.entries(regForm).forEach(([k, v]) => fd.append(k, v));
    try {
      const res = await fetch('register_student.php', { method: 'POST', body: fd });
      const text = await res.text();
      if (text.includes('successfully')) {
        addToast(t.registerModal.success, 'success');
        setRegAlert({ type: 'success', message: t.registerModal.success });
        setRegForm(EMPTY_REGISTRATION);
        setTimeout(() => {
          setRegisterModalOpen(false);
          setRegAlert({ type: '', message: '' });
        }, 2200);
      } else {
        setRegAlert({ type: 'error', message: '❌ ' + text });
        addToast(t.registerModal.failed, 'error');
      }
    } catch {
      setRegAlert({ type: 'error', message: t.registerModal.errorSubmitting });
      addToast(t.registerModal.networkError, 'error');
    } finally {
      setRegLoading(false);
    }
  };

  const openEnroll = (course) => {
    setEnrollCourse(course);
    setEnrollForm({ name: '', phone: '', email: '' });
  };

  const submitEnroll = (e) => {
    e.preventDefault();
    if (!enrollForm.name || !enrollForm.phone) {
      addToast(t.enrollModal.required, 'error');
      return;
    }
    setEnrollLoading(true);
    setTimeout(() => {
      addToast(t.enrollModal.success(enrollCourse), 'success');
      setEnrollCourse(null);
      setEnrollLoading(false);
    }, 800);
  };

  const submitNewsletter = (e) => {
    e.preventDefault();
    if (!newsletterEmail.includes('@')) {
      addToast(t.footer.invalidEmail, 'error');
      return;
    }
    setNewsletterLoading(true);
    setTimeout(() => {
      addToast(t.footer.subscribed, 'success');
      setNewsletterEmail('');
      setNewsletterLoading(false);
    }, 700);
  };

  const submitContact = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      addToast('All fields required.', 'error');
      return;
    }
    setContactLoading(true);
    setTimeout(() => {
      addToast(t.contact.sent, 'success');
      setContactForm({ name: '', email: '', message: '' });
      setContactLoading(false);
    }, 700);
  };

  const handleCookie = (choice) => {
    localStorage.setItem('fk-cookies', choice);
    setCookieConsent(choice);
  };

  const toggleBookmark = (id) => {
    setBookmarkedResources((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('fk-bookmarks', JSON.stringify(next));
      addToast(next.includes(id) ? t.resources.bookmarkSaved : t.resources.bookmarkRemoved, 'success');
      return next;
    });
  };

  const shareResource = async (resource) => {
    try {
      if (navigator.share) await navigator.share({ title: resource.title, text: resource.description });
      else {
        copyToClipboard(`${resource.title} — ${resource.description}`);
        addToast(t.resources.linkCopied, 'success');
      }
    } catch {}
  };

  const handleCopy = (text, label) => {
    copyToClipboard(text);
    addToast(t.contact.copied(label), 'success');
  };

  const onPreviewEnter = (e, src) => {
    if (!src) return;
    setPreview({ src, x: e.clientX, y: e.clientY, visible: true });
  };
  const onPreviewMove = (e) => {
    if (!preview.visible) return;
    setPreview((p) => ({ ...p, x: e.clientX, y: e.clientY }));
  };
  const onPreviewLeave = () => setPreview((p) => ({ ...p, visible: false }));

  const getFilteredResources = () => {
    const resources = resourcesTab === 'students' ? STUDENT_RESOURCES : TEACHER_RESOURCES;
    return resources.filter((r) => {
      const matchCat = resourcesCategory === 'all' || r.category === resourcesCategory;
      const matchSearch = r.title.toLowerCase().includes(resourcesSearch.toLowerCase()) || r.description.toLowerCase().includes(resourcesSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  };

  const Section = ({ id, children }) => (
    <section id={id} className={activeSection === id ? 'block' : 'hidden'}>{children}</section>
  );

  /* RENDER */
  return (
    <LangContext.Provider value={lang}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-4 py-2 rounded z-[9999]">Skip to content</a>

      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent pointer-events-none">
        <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-[width] duration-150" style={{ width: `${scrollProgress}%` }} />
      </div>

      {announcementVisible && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm py-2 px-4 text-center relative z-30">
          <span>🎉 <strong>{t.announcement.bold}</strong> {t.announcement.rest} <button onClick={() => showSection('training')} className="underline font-semibold">{t.announcement.cta}</button></span>
          <button onClick={() => setAnnouncementVisible(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white" aria-label="Dismiss"><i className="fas fa-times"></i></button>
        </div>
      )}

      {/* NAV */}
      <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <button onClick={() => showSection('home')} className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FutureKing</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">Technologies</span>
            </button>

            <div className="hidden md:flex items-center space-x-1">
              {NAV_SECTIONS.map((s) => (
                <button key={s} onClick={() => showSection(s)} className={`relative px-3 py-2 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${activeSection === s ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}>
                  <i className={`fas ${NAV_ICONS[s]} text-xs opacity-70`}></i>
                  {t.nav[s]}
                  <span className={`absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full transition-transform origin-left ${activeSection === s ? 'scale-x-100' : 'scale-x-0'}`} />
                </button>
              ))}

              <div ref={langRef} className="relative ml-2">
                <button onClick={() => setLangOpen((v) => !v)} className="px-2.5 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-1" aria-label={t.lang} aria-haspopup="true" aria-expanded={langOpen}>
                  <i className="fas fa-globe text-sm"></i>
                  <span className="uppercase text-xs font-bold">{lang}</span>
                  <i className={`fas fa-chevron-down text-[9px] transition-transform ${langOpen ? 'rotate-180' : ''}`}></i>
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 py-1.5 z-50">
                    {LANGUAGES.map((l) => (
                      <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 ${lang === l.code ? 'text-blue-600 bg-blue-50 dark:bg-slate-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                        <span>{l.flag}</span><span>{l.label}</span>
                        {lang === l.code && <i className="fas fa-check text-xs ml-auto"></i>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => setDarkMode((v) => !v)} className="ml-1 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Toggle theme" title={darkMode ? t.themeLight : t.themeDark}>
                <i className={`fas fa-${darkMode ? 'sun' : 'moon'}`}></i>
              </button>

              <button onClick={() => setRegisterModalOpen(true)} className="ml-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all text-sm">
                <i className="fas fa-user-plus mr-1"></i>{t.register}
              </button>
              <button onClick={() => setLoginModalOpen(true)} className="ml-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all text-sm">
                <i className="fas fa-sign-in-alt mr-1"></i>{t.login}
              </button>
            </div>

            <div className="md:hidden flex items-center gap-1">
              <button onClick={() => setLangOpen((v) => !v)} className="p-2 rounded-lg text-gray-600 dark:text-gray-300" aria-label={t.lang}>
                <span className="uppercase text-xs font-bold">{lang}</span>
              </button>
              <button onClick={() => setDarkMode((v) => !v)} className="p-2 rounded-lg text-gray-600 dark:text-gray-300" aria-label="Toggle theme">
                <i className={`fas fa-${darkMode ? 'sun' : 'moon'}`}></i>
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg text-gray-600 dark:text-gray-300" aria-label="Toggle menu">
                <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-1">
              {NAV_SECTIONS.map((s) => (
                <button key={s} onClick={() => showSection(s)} className={`flex items-center gap-2 w-full text-left px-4 py-2.5 font-medium rounded-lg ${activeSection === s ? 'text-blue-600 bg-blue-50 dark:bg-slate-800 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  <i className={`fas ${NAV_ICONS[s]} text-xs opacity-70 w-4`}></i>
                  {t.nav[s]}
                </button>
              ))}
              <div className="pt-2 mt-2 border-t dark:border-slate-800">
                <p className="text-[11px] uppercase font-semibold text-gray-400 px-4 mb-1">{t.lang}</p>
                {LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => { setLang(l.code); setMobileMenuOpen(false); }} className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm rounded-lg ${lang === l.code ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    <span>{l.flag}</span>{l.label}
                  </button>
                ))}
              </div>
              <button onClick={() => { setRegisterModalOpen(true); setMobileMenuOpen(false); }} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2 rounded-lg font-semibold mt-3"><i className="fas fa-user-plus mr-2"></i>{t.register}</button>
              <button onClick={() => { setLoginModalOpen(true); setMobileMenuOpen(false); }} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-lg font-semibold"><i className="fas fa-sign-in-alt mr-2"></i>{t.login}</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hover preview */}
      {preview.visible && preview.src && (
        <div className="fixed z-[9999] bg-slate-800 rounded-2xl shadow-2xl p-2.5 border-2 border-orange-500 pointer-events-none" style={{ left: preview.x + 20, top: preview.y + 20 }}>
          <img src={preview.src} alt="preview" className="max-w-[320px] max-h-[320px] object-contain rounded-lg" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
      )}

      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={lightboxImage} alt="zoom" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full text-white text-2xl" onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }} aria-label="Close">×</button>
        </div>
      )}

      {/* LOGIN */}
      {loginModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white"><i className="fas fa-lock text-indigo-500 mr-2"></i>{t.loginModal.title}</h2>
              <button onClick={() => { setLoginModalOpen(false); setLoginError(''); setLoginForm({ username: '', password: '' }); }} className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center" aria-label="Close"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
              {loginError && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{loginError}</div>)}
              <input type="text" placeholder={t.loginModal.username} required value={loginForm.username} onChange={(e) => { setLoginForm({ ...loginForm, username: e.target.value }); if (loginError) setLoginError(''); }} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type={showPassword ? 'text' : 'password'} placeholder={t.loginModal.password} required value={loginForm.password} onChange={(e) => { setLoginForm({ ...loginForm, password: e.target.value }); if (loginError) setLoginError(''); }} className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="w-4 h-4" />{t.loginModal.showPassword}</label>
              <button type="submit" disabled={loginLoading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">{loginLoading ? t.loginModal.submitting : t.loginModal.submit}</button>
            </form>
            <div className="p-6 pt-0 border-t dark:border-slate-700 mt-2">
              <div className="flex justify-between text-sm">
                <Link to="/login/student" className="text-blue-600 hover:underline" onClick={() => setLoginModalOpen(false)}><i className="fas fa-user-graduate mr-1"></i> {t.loginModal.studentPortal}</Link>
                <Link to="/login/teacher" className="text-blue-600 hover:underline" onClick={() => setLoginModalOpen(false)}><i className="fas fa-chalkboard-teacher mr-1"></i> {t.loginModal.teacherPortal}</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER */}
      {registerModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div ref={registerModalRef} className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white"><i className="fas fa-user-plus text-green-500 mr-2"></i>{t.registerModal.title}</h2>
              <button onClick={() => { setRegisterModalOpen(false); setRegAlert({ type: '', message: '' }); }} className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center" aria-label="Close"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-3">
              {regAlert.message && (<div className={`px-4 py-3 rounded-lg text-sm border-l-4 ${regAlert.type === 'success' ? 'bg-green-50 text-green-800 border-green-500' : 'bg-red-50 text-red-800 border-red-500'}`}>{regAlert.message}</div>)}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input name="firstname" placeholder={t.registerModal.firstname} required value={regForm.firstname} onChange={handleRegChange} className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                <input name="lastname" placeholder={t.registerModal.lastname} required value={regForm.lastname} onChange={handleRegChange} className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <input name="reg" placeholder={t.registerModal.reg} required value={regForm.reg} onChange={handleRegChange} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              <select name="level" required value={regForm.level} onChange={handleRegChange} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <option value="">{t.registerModal.level}</option>
                {REGISTER_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input name="district" placeholder={t.registerModal.district} required value={regForm.district} onChange={handleRegChange} className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                <input name="secter" placeholder={t.registerModal.secter} required value={regForm.secter} onChange={handleRegChange} className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <input name="trade" placeholder={t.registerModal.trade} required value={regForm.trade} onChange={handleRegChange} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input name="parent_phone" placeholder={t.registerModal.parentPhone} required value={regForm.parent_phone} onChange={handleRegChange} className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                <input name="alt_phone" placeholder={t.registerModal.altPhone} value={regForm.alt_phone} onChange={handleRegChange} className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <select name="gender" required value={regForm.gender} onChange={handleRegChange} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <option value="">{t.registerModal.gender}</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <button type="submit" disabled={regLoading} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">{regLoading ? t.registerModal.submitting : t.registerModal.submit}</button>
            </form>
          </div>
        </div>
      )}

      {/* ENROLL */}
      {enrollCourse && (
        <ModalShell onClose={() => setEnrollCourse(null)}>
          <h2 className="text-xl font-bold mb-1 dark:text-white">{t.enrollModal.title(enrollCourse)}</h2>
          <p className="text-sm text-gray-500 mb-4">{t.enrollModal.subtitle}</p>
          <form onSubmit={submitEnroll} className="space-y-3">
            <input required placeholder={t.enrollModal.name} value={enrollForm.name} onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <input required placeholder={t.enrollModal.phone} value={enrollForm.phone} onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <input type="email" placeholder={t.enrollModal.email} value={enrollForm.email} onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            <button disabled={enrollLoading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">{enrollLoading ? t.enrollModal.submitting : t.enrollModal.submit}</button>
          </form>
        </ModalShell>
      )}

      {/* CONSULT */}
      {consultOpen && (
        <ModalShell onClose={() => setConsultOpen(false)}>
          <h2 className="text-xl font-bold mb-1 dark:text-white">{t.consultModal.title}</h2>
          <p className="text-sm text-gray-500 mb-4">{t.consultModal.subtitle}</p>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi! I want to book a free consultation.')}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-green-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-green-700"><i className="fab fa-whatsapp mr-2"></i>{t.consultModal.whatsapp}</a>
        </ModalShell>
      )}

      {/* MAIN 2-COL */}
      <div id="main-content" className="flex flex-col lg:flex-row">
        <div className="flex-1 lg:w-[60%] lg:max-w-[60%]">
          <main>
            {/* HOME */}
            <Section id="home">
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 dark:from-blue-800 dark:via-purple-800 dark:to-pink-800">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                  <div className="grid md:grid-cols-2 gap-10 items-center">
                    <div className="text-white">
                      <span className="inline-block px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold mb-5"><i className="fas fa-crown mr-2"></i>{t.hero.badge}</span>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-5 leading-tight">
                        {t.hero.title1} <span className="text-yellow-300">{t.hero.title2}</span>, <span className="text-yellow-300">{t.hero.title3}</span> & <span className="text-yellow-300">{t.hero.title4}</span>
                      </h1>
                      <p className="text-lg text-white/90 mb-5">{t.hero.subtitle}</p>
                      <div className="flex flex-wrap gap-2 mb-5 text-xs sm:text-sm">
                        {[t.hero.trust1, t.hero.trust2, t.hero.trust3].map((label) => (<span key={label} className="px-3 py-1 rounded-full bg-white/15">{label}</span>))}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => showSection('training')} className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all"><i className="fas fa-graduation-cap mr-2"></i>{t.hero.cta1}</button>
                        <button onClick={() => setConsultOpen(true)} className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-xl font-bold hover:bg-white hover:text-purple-600 transition-all"><i className="fas fa-comments mr-2"></i>{t.hero.cta2}</button>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <div className="grid grid-cols-3 gap-3">
                          {[{ icon: 'fab fa-bitcoin', label: 'Blockchain' }, { icon: 'fas fa-brain', label: 'AI' }, { icon: 'fas fa-robot', label: 'ML' }, { icon: 'fab fa-python', label: 'Python' }, { icon: 'fab fa-js', label: 'JavaScript' }, { icon: 'fas fa-database', label: 'SQL' }].map((tech, idx) => (
                            <div key={idx} className="text-center p-3 bg-white/10 rounded-xl"><i className={`${tech.icon} text-2xl text-white mb-1`}></i><p className="text-white text-xs">{tech.label}</p></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-white/20">
                    <div className="max-w-3xl mx-auto text-center text-white">
                      <p className="text-xs uppercase tracking-widest text-white/70 mb-3 font-semibold"><i className="fas fa-quote-left mr-2"></i>{t.hero.stories}</p>
                      <div className="relative min-h-[140px]">
                        {TESTIMONIALS.map((test, i) => (
                          <div key={i} className={`absolute inset-0 transition-opacity duration-500 ${i === testimonialIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="text-3xl mb-1">{test.avatar}</div>
                            <p className="text-base md:text-lg italic mb-2">"{test.text}"</p>
                            <p className="font-bold text-sm">{test.name}</p>
                            <p className="text-xs text-white/70">{test.role}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center gap-2 mt-3">
                        {TESTIMONIALS.map((_, i) => (
                          <button key={i} onClick={() => setTestimonialIndex(i)} className={`h-1.5 rounded-full transition-all ${i === testimonialIndex ? 'bg-yellow-300 w-6' : 'bg-white/40 w-1.5'}`} aria-label={`Testimonial ${i + 1}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={heroStatsRef} className="max-w-7xl mx-auto px-4 -mt-10 relative z-10 mb-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[{ v: counterValues.grads, label: t.stats.grads, sub: t.stats.gradsSub, color: 'text-blue-600' }, { v: counterValues.courses, label: t.stats.courses, sub: t.stats.coursesSub, color: 'text-green-600' }, { v: counterValues.iap, label: t.stats.iap, sub: t.stats.iapSub, color: 'text-purple-600' }, { v: counterValues.partners, label: t.stats.partners, sub: t.stats.partnersSub, color: 'text-orange-600' }].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 text-center">
                      <div className={`text-2xl font-bold mb-1 ${stat.color}`}>{stat.v}+</div>
                      <div className="text-gray-700 dark:text-gray-200 font-medium text-xs">{stat.label}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{stat.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-4 pb-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[{ section: 'services', icon: 'fa-laptop-code' }, { section: 'blockchain', icon: 'fa-bitcoin' }, { section: 'ai-ml', icon: 'fa-brain' }, { section: 'resources', icon: 'fa-book-open' }].map((item, idx) => (
                    <button key={idx} onClick={() => showSection(item.section)} className="bg-white dark:bg-slate-800 p-5 rounded-2xl text-center hover:shadow-xl transition-all hover:-translate-y-1 border dark:border-slate-700">
                      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white text-xl"><i className={`fas ${item.icon}`}></i></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.quickLinks[item.section]}</h3>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 py-8 border-y dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4">
                  <p className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-widest">{t.partners}</p>
                  <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 opacity-70">
                    {PARTNERS.map((p) => (<span key={p} className="text-gray-600 dark:text-gray-300 font-bold">{p}</span>))}
                  </div>
                </div>
              </div>
            </Section>

            {/* SERVICES */}
            <Section id="services">
              <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="text-center mb-10">
                  <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">{t.services.tag}</span>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-2">{t.services.title}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{t.services.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { key: 'custom', icon: 'fa-code', color: 'bg-blue-100 text-blue-600', pills: ['Java', 'Python', 'C#', 'PHP', '.NET Core', 'Spring Boot'] },
                    { key: 'mobile', icon: 'fa-mobile-alt', color: 'bg-green-100 text-green-600', pills: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android'] },
                    { key: 'cloud', icon: 'fa-cloud', color: 'bg-purple-100 text-purple-600', pills: ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes'] },
                    { key: 'blockchain', icon: 'fa-bitcoin', color: 'bg-purple-100 text-purple-600', pills: ['Ethereum', 'Solidity', 'Web3.js', 'Smart Contracts', 'DeFi', 'NFTs'] },
                    { key: 'ai', icon: 'fa-brain', color: 'bg-pink-100 text-pink-600', pills: ['TensorFlow', 'PyTorch', 'Keras', 'NLP', 'Computer Vision', 'LLMs'] },
                    { key: 'ml', icon: 'fa-robot', color: 'bg-green-100 text-green-600', pills: ['Scikit-learn', 'Pandas', 'NumPy', 'XGBoost', 'Deep Learning', 'MLOps'] },
                  ].map((svc, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 border-l-4 border-transparent hover:border-orange-500 transition-all">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-xl ${svc.color}`}><i className={`fas ${svc.icon}`}></i></div>
                      <h3 className="text-lg font-bold mb-1 dark:text-white">{t.services.items[svc.key].title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{t.services.items[svc.key].desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {svc.pills.map((p) => (<span key={p} className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium dark:text-gray-200">{p}</span>))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* BLOCKCHAIN */}
            <Section id="blockchain">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 py-16">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="text-center mb-10">
                    <span className="inline-block px-4 py-1.5 bg-purple-600 text-white rounded-full text-sm font-semibold mb-3"><i className="fab fa-bitcoin mr-2"></i>{t.blockchain.tag}</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t.blockchain.title}</h2>
                  </div>
                  <div className="grid md:grid-cols-3 gap-5">
                    {[{ key: 'card1', icon: 'fa-link', bg: 'bg-purple-600' }, { key: 'card2', icon: 'fa-coins', bg: 'bg-pink-600' }, { key: 'card3', icon: 'fa-building', bg: 'bg-blue-600' }].map((card, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
                        <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-3 text-white text-xl`}><i className={`fas ${card.icon}`}></i></div>
                        <h3 className="text-lg font-bold mb-2 dark:text-white">{t.blockchain[card.key].title}</h3>
                        <ul className="space-y-1">
                          {t.blockchain[card.key].items.map((it) => (<li key={it} className="flex items-center text-sm text-gray-700 dark:text-gray-300"><i className="fas fa-check-circle mr-2 text-purple-600"></i>{it}</li>))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* AI/ML */}
            <Section id="ai-ml">
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 py-16">
                <div className="max-w-7xl mx-auto px-4">
                  <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">{t.ai.title}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[{ icon: 'fa-robot', color: 'text-pink-600', label: t.ai.ml }, { icon: 'fa-language', color: 'text-purple-600', label: t.ai.nlp }, { icon: 'fa-eye', color: 'text-blue-600', label: t.ai.cv }, { icon: 'fa-chart-bar', color: 'text-green-600', label: t.ai.ds }].map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-xl text-center shadow">
                        <i className={`fas ${item.icon} text-2xl ${item.color}`}></i>
                        <p className="mt-1.5 font-bold text-sm dark:text-white">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* TRAINING */}
            <Section id="training">
              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 py-16">
                <div className="max-w-7xl mx-auto px-4">
                  <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">{t.training.title}</h2>
                  <div className="grid md:grid-cols-3 gap-5">
                    {[{ title: t.training.fullStack, price: '$1,299', color: 'bg-blue-600', border: '' }, { title: t.training.blockchain, price: '$1,599', color: 'bg-purple-600', border: 'border-2 border-purple-500' }, { title: t.training.aiml, price: '$1,499', color: 'bg-pink-600', border: '' }].map((course, idx) => (
                      <div key={idx} className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl text-center ${course.border}`}>
                        <h3 className="text-xl font-bold dark:text-white">{course.title}</h3>
                        <p className="text-2xl font-bold mt-3 text-gray-900 dark:text-white">{course.price}</p>
                        <button onClick={() => openEnroll(course.title)} className={`mt-4 ${course.color} text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90`}>{t.training.enroll}</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* IAP */}
            <Section id="iap">
              <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl text-white">
                  <h3 className="text-2xl font-bold mb-2">{t.iap.title}</h3>
                  <p className="mb-4 text-white/90 text-sm">{t.iap.desc}</p>
                  <button onClick={() => setRegisterModalOpen(true)} className="bg-white text-purple-600 px-5 py-2 rounded-lg font-semibold">{t.iap.apply}</button>
                </div>
              </div>
            </Section>

            {/* TECH STACK */}
            <Section id="technologies">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16">
                <div className="max-w-7xl mx-auto px-4">
                  <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">{t.tech.title}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[{ key: 'frontend', color: 'text-blue-400', items: ['React/Next.js', 'Vue.js'] }, { key: 'backend', color: 'text-green-400', items: ['Python/Django', 'Java/Spring'] }, { key: 'blockchain', color: 'text-purple-400', items: ['Ethereum', 'Solidity'] }, { key: 'aiml', color: 'text-pink-400', items: ['TensorFlow', 'PyTorch'] }, { key: 'database', color: 'text-orange-400', items: ['PostgreSQL', 'MongoDB'] }].map((stack, idx) => (
                      <div key={idx} className="bg-gray-800 p-4 rounded-xl">
                        <h3 className={`text-base font-bold mb-1.5 ${stack.color}`}>{t.tech[stack.key]}</h3>
                        <ul className="text-xs text-gray-300 space-y-0.5">{stack.items.map((it) => <li key={it}>• {it}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* CAREERS */}
            <Section id="careers">
              <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">{t.careers.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{t.careers.subtitle}</p>
                <a href={`mailto:${EMAIL}?subject=Career%20Inquiry`} className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold"><i className="fas fa-paper-plane mr-2"></i>{t.careers.cta}</a>
              </div>
            </Section>

            {/* RESOURCES */}
            <Section id="resources">
              <div className="bg-gray-50 dark:bg-slate-900 py-16">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">{t.resources.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t.resources.subtitle}</p>
                  </div>
                  <div className="flex justify-center gap-3 mb-5">
                    <button onClick={() => { setResourcesTab('students'); setResourcesCategory('all'); setResourcesSearch(''); }} className={`px-5 py-2.5 rounded-xl font-semibold text-sm ${resourcesTab === 'students' ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border dark:border-slate-700'}`}><i className="fas fa-users mr-2"></i>{t.resources.forStudents}</button>
                    <button onClick={() => { setResourcesTab('teachers'); setResourcesCategory('all'); setResourcesSearch(''); }} className={`px-5 py-2.5 rounded-xl font-semibold text-sm ${resourcesTab === 'teachers' ? 'bg-purple-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border dark:border-slate-700'}`}><i className="fas fa-chalkboard-teacher mr-2"></i>{t.resources.forTeachers}</button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {[['all', t.resources.all], ['blockchain', 'Blockchain'], ['reactjs', 'React'], ['ml', 'ML'], ['python', 'Python'], ['javascript', 'JS'], ['databases', 'DB'], ['ai', 'AI']].map(([v, l]) => (
                      <button key={v} onClick={() => setResourcesCategory(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${resourcesCategory === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border dark:border-slate-700'}`}>{l}</button>
                    ))}
                  </div>
                  <div className="relative max-w-md mx-auto mb-6">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" placeholder={t.resources.searchPlaceholder} value={resourcesSearch} onChange={(e) => setResourcesSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getFilteredResources().map((resource) => (
                      <div key={resource.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{resource.category.toUpperCase()}</span>
                          {resource.level && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">{resource.level}</span>}
                          {resource.duration && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"><i className="far fa-clock mr-1"></i>{resource.duration}</span>}
                          <button onClick={() => toggleBookmark(resource.id)} className="ml-auto text-sm" aria-label="Bookmark">
                            <i className={`${bookmarkedResources.includes(resource.id) ? 'fas text-yellow-500' : 'far text-gray-400'} fa-bookmark`}></i>
                          </button>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{resource.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{resource.description}</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setExpandedResource(expandedResource === resource.id ? null : resource.id)} className="text-blue-600 font-semibold text-sm flex items-center gap-1">{expandedResource === resource.id ? t.resources.showLess : t.resources.viewGuide}<i className={`fas fa-chevron-${expandedResource === resource.id ? 'up' : 'down'} text-xs`}></i></button>
                          <button onClick={() => shareResource(resource)} className="ml-auto text-gray-500 hover:text-blue-600 text-sm"><i className="fas fa-share-alt"></i></button>
                        </div>
                        {expandedResource === resource.id && (
                          <div className="mt-3 pt-3 border-t dark:border-slate-700">
                            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-sm">{resource.content}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {getFilteredResources().length === 0 && (
                    <div className="text-center py-8"><i className="fas fa-search text-4xl text-gray-300 mb-3"></i><p className="text-gray-500">{t.resources.noResults}</p></div>
                  )}
                </div>
              </div>
            </Section>

            {/* FAQ */}
            <Section id="faq">
              <div className="max-w-3xl mx-auto px-4 py-16">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">{t.faq.title}</h2>
                <div className="space-y-2">
                  {FAQS.map((f, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700">
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex justify-between items-center text-left p-4 font-semibold text-gray-900 dark:text-white text-sm">{f.q}<i className={`fas fa-chevron-${openFaq === i ? 'up' : 'down'} text-xs`}></i></button>
                      {openFaq === i && (<div className="px-4 pb-4 text-gray-700 dark:text-gray-300 text-sm">{f.a}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* CONTACT */}
            <Section id="contact">
              <div className="bg-gray-900 dark:bg-black text-white py-16">
                <div className="max-w-4xl mx-auto px-4">
                  <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">{t.contact.title}</h2>
                  <p className="text-center mb-6">
                    {isOpenNow ? (<span className="inline-flex items-center gap-2 text-green-400 font-semibold text-sm"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>{t.contact.open}</span>) : (<span className="inline-flex items-center gap-2 text-red-400 font-semibold text-sm"><span className="w-2 h-2 bg-red-400 rounded-full"></span>{t.contact.closed}</span>)}
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <button onClick={() => handleCopy(t.contact.address, 'Address')} className="text-center hover:bg-white/5 rounded-xl py-3"><i className="fas fa-map-marker-alt text-2xl text-blue-400 mb-1"></i><p className="text-sm">{t.contact.address}</p><span className="text-[10px] text-gray-500">{t.contact.clickToCopy}</span></button>
                    <button onClick={() => handleCopy(PHONE_DISPLAY, 'Phone')} className="text-center hover:bg-white/5 rounded-xl py-3"><i className="fas fa-phone text-2xl text-green-400 mb-1"></i><p className="text-sm">{PHONE_DISPLAY}</p><span className="text-[10px] text-gray-500">{t.contact.clickToCopy}</span></button>
                    <button onClick={() => handleCopy(EMAIL, 'Email')} className="text-center hover:bg-white/5 rounded-xl py-3"><i className="fas fa-envelope text-2xl text-purple-400 mb-1"></i><p className="text-sm">{EMAIL}</p><span className="text-[10px] text-gray-500">{t.contact.clickToCopy}</span></button>
                  </div>
                  <form onSubmit={submitContact} className="max-w-md mx-auto space-y-2.5">
                    <input required placeholder={t.contact.namePlaceholder} value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="w-full px-4 py-2 bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    <input required type="email" placeholder={t.contact.emailPlaceholder} value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="w-full px-4 py-2 bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    <textarea required rows={4} placeholder={t.contact.messagePlaceholder} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} className="w-full px-4 py-2 bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                    <button disabled={contactLoading} className="w-full bg-blue-600 px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50">{contactLoading ? t.contact.sending : t.contact.send}</button>
                  </form>
                </div>
              </div>
            </Section>
          </main>
        </div>

        {/* REPAIR SIDEBAR — fully translated */}
        <aside className="lg:w-[40%] lg:max-w-[40%] bg-slate-50 dark:bg-slate-900 border-t lg:border-t-0 lg:border-l dark:border-slate-800 border-gray-200">
          <div className="lg:sticky lg:top-20">
            <div className="bg-white dark:bg-slate-800 p-4 border-b dark:border-slate-700 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-base md:text-lg font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent"><i className="fas fa-microchip mr-2"></i>{t.repair.title}</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">{t.repair.hint}</p>
              </div>
              <button onClick={() => setRepairOpen((v) => !v)} className="ml-2 w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0" aria-label="Toggle repair section"><i className={`fas fa-chevron-${repairOpen ? 'up' : 'down'} text-gray-600 dark:text-gray-300 text-xs`}></i></button>
            </div>
            {repairOpen && (
              <div className="p-4 md:p-5 space-y-5 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
                {REPAIR_CATEGORIES.map((cat, ci) => (
                  <div key={cat.id}>
                    <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2"><i className={`fas ${cat.icon} ${cat.iconColor}`}></i>{ci + 1}. {t.repair.categories[cat.id]}</h3>
                    <div className="space-y-2">
                      {cat.components.map((comp, idx) => {
                        const compT = t.repair.components[comp.key];
                        return (
                          <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-2.5 shadow-sm border-l-4 border-transparent hover:border-orange-500 transition-all">
                            <div className="flex items-start gap-2.5">
                              {comp.img ? (
                                <img
                                  src={comp.img}
                                  alt={compT.name}
                                  onMouseEnter={(e) => onPreviewEnter(e, comp.img)}
                                  onMouseMove={onPreviewMove}
                                  onMouseLeave={onPreviewLeave}
                                  onClick={() => setLightboxImage(comp.img)}
                                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="55%" font-size="24" text-anchor="middle" fill="%2394a3b8">?</text></svg>'; }}
                                  className="w-14 h-14 object-contain bg-slate-100 dark:bg-slate-700 rounded-xl p-1 border border-slate-200 dark:border-slate-600 flex-shrink-0 cursor-pointer hover:border-orange-500"
                                />
                              ) : (
                                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0 text-slate-400"><i className="fas fa-microchip"></i></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {comp.badges.map((b) => {
                                    const label = b === 'phone' ? t.repair.badgePhone : t.repair.badgeLaptop;
                                    return (<span key={b} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${b === 'phone' ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500' : 'bg-purple-50 text-purple-700 border-l-2 border-purple-500'}`}>{label}</span>);
                                  })}
                                </div>
                                <strong className="text-orange-700 dark:text-orange-400 block text-xs leading-snug">{compT.name}</strong>
                                <p className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed mt-0.5">{compT.desc}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center text-[11px] text-gray-600 dark:text-amber-200 border border-amber-200 dark:border-amber-900"><i className="fas fa-screwdriver-wrench text-amber-600 mr-1"></i>{t.repair.footer}</div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-400 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h4 className="text-white text-lg font-bold mb-2">FutureKing Technologies</h4>
              <p className="text-sm">{t.hero.subtitle}</p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-2">{t.footer.quickLinks}</h5>
              <ul className="space-y-1 text-sm">
                {FOOTER_LINKS.map((s) => (
                  <li key={s}><button onClick={() => showSection(s)} className="hover:text-white transition">{t.nav[s] || t.services?.items?.[s]?.title || s}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-2">{t.footer.contact}</h5>
              <p className="text-sm">{t.contact.address}<br />{PHONE_DISPLAY}<br />{EMAIL}</p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-2">{t.footer.newsletter}</h5>
              <form onSubmit={submitNewsletter} className="flex">
                <input type="email" required placeholder={t.footer.emailPlaceholder} value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)} className="flex-grow px-3 py-2 bg-gray-800 rounded-l-lg text-sm outline-none" />
                <button disabled={newsletterLoading} className="bg-blue-600 px-4 rounded-r-lg text-white hover:bg-blue-700 disabled:opacity-50">{newsletterLoading ? '...' : t.footer.subscribe}</button>
              </form>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-5 text-center text-xs">
            <p>&copy; {new Date().getFullYear()} FutureKing Technologies. {t.footer.rights}</p>
          </div>
        </div>
      </footer>

      {showBackTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-24 right-6 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg z-40 hover:scale-110 transition" aria-label="Back to top"><i className="fas fa-arrow-up"></i></button>
      )}
      <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello FutureKing!')}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl z-40 flex items-center justify-center text-2xl" aria-label="Chat on WhatsApp"><i className="fab fa-whatsapp"></i></a>

      {!cookieConsent && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-3 z-[55] flex flex-col sm:flex-row items-center gap-2 border-t border-gray-700">
          <p className="flex-1 text-sm">{t.cookies.message}</p>
          <div className="flex gap-2">
            <button onClick={() => handleCookie('declined')} className="px-3 py-1.5 text-sm rounded-lg border border-gray-600">{t.cookies.decline}</button>
            <button onClick={() => handleCookie('accepted')} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 font-semibold">{t.cookies.accept}</button>
          </div>
        </div>
      )}

      <div className="fixed top-24 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-white text-sm flex items-center gap-2 max-w-sm animate-[slideIn_0.3s_ease] ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>{toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </LangContext.Provider>
  );
}

function ModalShell({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Close"><i className="fas fa-times"></i></button>
        {children}
      </div>
    </div>
  );
}