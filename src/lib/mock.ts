// MINTAADATOK a koncepció közösségi felületeihez (eseményfolyam, cikkek, fórum).
// Kitalált szereplők és szövegek — a valós rendszerben a szoloink.hu háttere adná.

export interface MockUser {
  id: string
  name: string
  initials: string
  color: string
  city: string
  lat?: number
  lng?: number
  about?: string
  contact?: string
  grapes?: string[] // fajtanevek a katalógusból
  since?: string
  online?: boolean
}
export const USERS: MockUser[] = [
  { id: 'kertesz-anna', name: 'Kertész Anna', initials: 'KA', color: '#7c3aed', city: 'Kecskemét', lat: 46.906, lng: 19.691, since: '2022', online: true,
    about: 'Homoki kiskert, 60 tő csemegeszőlő. Főleg rezisztens és magvatlan fajták érdekelnek.', contact: 'Üzenetben vagy a kecskeméti piacon szombatonként',
    grapes: ['Muscat bleu', 'Kodrjanka', 'Velesz', 'Bianca', 'Nero', 'Kismis Lucsisztij', 'Lívia', 'Arkadia'] },
  { id: 'szabo-peter', name: 'Szabó Péter', initials: 'SzP', color: '#0e7490', city: 'Eger', lat: 47.902, lng: 20.377, since: '2021',
    about: 'Borászként kezdtem, ma inkább a régi magyar csemegefajták gyűjtése a hobbim.', grapes: ['Csabagyöngye', 'Pölöskei muskotály', 'Zala gyöngye', 'Kékfrankos', 'Moldova'] },
  { id: 'toth-gabor', name: 'Tóth Gábor', initials: 'TG', color: '#c2410c', city: 'Pécs', lat: 46.072, lng: 18.233, since: '2023', online: true,
    about: 'Mecsek-oldali teraszos kert, kísérletezem a gibberellines kezeléssel.', contact: '+36 30 *** ** 12', grapes: ['Kodrjanka', 'Talizman', 'Arkadia', 'Preobrazsenyije', 'Moldova'] },
  { id: 'nagy-eszter', name: 'Nagy Eszter', initials: 'NE', color: '#be185d', city: 'Győr', lat: 47.687, lng: 17.65, since: '2025',
    about: 'Kezdő vagyok, 30 tőkés kiskertem van, főleg korai csemegefajtákkal.', grapes: ['Csabagyöngye', 'Palatina', 'Lívia'] },
  { id: 'minta-gazda', name: 'Minta Gazda', initials: 'MG', color: '#4b2e83', city: 'Badacsonytomaj', lat: 46.808, lng: 17.508, since: '2024' },
  { id: 'kovacs-ildiko', name: 'Kovács Ildikó', initials: 'KI', color: '#15803d', city: 'Szeged', lat: 46.253, lng: 20.141, since: '2022', online: true,
    about: 'Vesszőcserében mindig benne vagyok, főleg orosz és ukrán nemesítésű fajták.', contact: 'Üzenetben', grapes: ['Velesz', 'Talizman', 'Preobrazsenyije', 'Kismis Lucsisztij', 'Arkadia', 'Moldova', 'Kodrjanka'] },
  { id: 'farkas-bence', name: 'Farkas Bence', initials: 'FB', color: '#b45309', city: 'Tokaj', lat: 48.121, lng: 21.41, since: '2020',
    about: 'Családi pincészet, Furmint és Hárslevelű. A szőlőskertbe csemegének a Királynő került.', grapes: ['Furmint', 'Szőlőskertek királynője muskotály', 'Irsai Olivér'] },
  { id: 'balogh-reka', name: 'Balogh Réka', initials: 'BR', color: '#0369a1', city: 'Debrecen', lat: 47.531, lng: 21.627, since: '2024',
    about: 'Lugas a kertben, permetezés nélkül szeretném megoldani.', grapes: ['Muscat bleu', 'Bianca', 'Nero', 'Izabella'] },
  { id: 'molnar-laszlo', name: 'Molnár László', initials: 'ML', color: '#6d28d9', city: 'Kiskőrös', lat: 46.62, lng: 19.285, since: '2019',
    about: 'Kunsági homok, 2 ha bor- és csemegeszőlő.', contact: 'Hétvégén telefonon', grapes: ['Kunleány', 'Irsai Olivér', 'Kékfrankos', 'Csabagyöngye', 'Pölöskei muskotály'] },
  { id: 'varga-zsofia', name: 'Varga Zsófia', initials: 'VZs', color: '#db2777', city: 'Budapest XXII.', lat: 47.425, lng: 19.03, since: '2025', grapes: ['Lívia', 'Palatina', 'Muscat bleu'] },
  { id: 'horvath-mate', name: 'Horváth Máté', initials: 'HM', color: '#475569', city: 'Szekszárd', lat: 46.35, lng: 18.704, since: '2023', grapes: ['Kékfrankos', 'Cabernet Sauvignon', 'Bianca'] },
  { id: 'papp-gyula', name: 'Papp Gyula', initials: 'PGy', color: '#a16207', city: 'Nyíregyháza', since: '2021', about: 'Helyet nem adtam meg — a listában így is megtalálható vagyok.', grapes: ['Moldova', 'Nero'] },
]
export const ME = USERS[4]
export const userById = (id: string | undefined) => USERS.find((u) => u.id === id)

/** Minta üzenetváltások az Üzenetek oldalhoz (csak a böngészőben élnek). */
export interface MockMessage { from: 'me' | 'them'; text: string; at: string }
export const CONVERSATIONS: { with: string; unread?: number; messages: MockMessage[] }[] = [
  { with: 'kertesz-anna', unread: 1, messages: [
    { from: 'them', text: 'Szia! Láttam a cserelistádon a Pölöskei muskotályt. Kodrjankát tudnék adni érte, 3 vesszőt.', at: '2026-11-09 18:12' },
    { from: 'me', text: 'Szia Anna! Jó lenne, a metszésnél, február végén tudom szedni. Hány vesszőt kérnél?', at: '2026-11-09 19:40' },
    { from: 'them', text: 'Hármat-hármat cserélhetnénk. Postán vagy személyesen? Márciusban Balatonon leszünk.', at: '2026-11-10 08:05' },
  ] },
  { with: 'kovacs-ildiko', unread: 1, messages: [
    { from: 'them', text: 'Szia! A Velesz nálam idén is szépen beérett augusztus elejére. Ha kell vessző, szólj!', at: '2026-11-08 10:30' },
  ] },
  { with: 'toth-gabor', messages: [
    { from: 'me', text: 'Szia Gábor! Milyen koncentrációval csináltad a gibberellines kezelést a Kodrjankán?', at: '2026-10-28 20:02' },
    { from: 'them', text: 'Virágzás előtt 20 ppm, kötődés után még egyszer 40 ppm. A fórumon le is írtam részletesen.', at: '2026-10-29 07:45' },
  ] },
]

export type EventKind = 'forum' | 'variety' | 'edit' | 'article' | 'spray'
export interface FeedEvent { kind: EventKind; title: string; text: string; user: MockUser; ago: string; to?: string }

export const FEED: FeedEvent[] = [
  { kind: 'forum', title: 'Muscat bleu', text: 'Harmadik éve permetezés nélkül tartom, idén is egészséges maradt a lomb. Érdemes lugasra tenni?', user: USERS[0], ago: '2 órája', to: '/forum/termesztes/1' },
  { kind: 'spray', title: 'Szezonzáró rézes lemosó permetezés', text: 'A permetezési naplóban rögzítve — 3 parcella, 2,75 ha.', user: USERS[4], ago: '5 órája', to: '/permetezes' },
  { kind: 'edit', title: 'Moldova', text: 'Érési idő pontosítva (155–165 nap), két új fotó.', user: USERS[1], ago: '9 órája', to: '/szolo/4' },
  { kind: 'forum', title: 'Kodrjanka magvatlansága', text: 'Gibberellines kezelést próbált már valaki? Milyen dózissal és mikor?', user: USERS[2], ago: 'tegnap', to: '/forum/kerdesek/2' },
  { kind: 'variety', title: 'Új fajta: Palatina', text: 'Felkerült a katalógusba leírással és érési adatokkal.', user: USERS[3], ago: 'tegnap', to: '/szolo/9' },
  { kind: 'article', title: 'Téli metszés csemegeszőlőnél', text: 'Rövid útmutató a csapos és szálvesszős metszéshez kezdőknek.', user: USERS[1], ago: '3 napja', to: '/cikkek/teli-metszes' },
  { kind: 'forum', title: 'Peronoszpóra-előrejelzés', text: 'Idén a júniusi esők után nálunk kétszer is kellett ismételni.', user: USERS[0], ago: '4 napja', to: '/forum/termesztes/3' },
]

export interface Article { slug: string; title: string; excerpt: string; category: string; author: MockUser; date: string; minutes: number; body: string[] }
export const ARTICLES: Article[] = [
  {
    slug: 'teli-metszes', title: 'Téli metszés csemegeszőlőnél', category: 'Termesztés', author: USERS[1], date: '2026-11-07', minutes: 6,
    excerpt: 'Mikor, mennyit és hogyan? Csapos és szálvesszős metszés lépésről lépésre, kezdőknek.',
    body: [
      'A téli metszéssel a következő évi termés mennyiségét és minőségét határozzuk meg. Csemegeszőlőnél általában kevesebb rügyet hagyunk, mint borszőlőnél, mert a nagy fürtökhöz erős hajtások kellenek.',
      'Fagyveszélyes helyen érdemes a metszést február végére, március elejére halasztani, és a végleges rügyterhelést csak a rügypattanás után beállítani.',
      'A metszés után a sebek és a tőke rézkészítményes lemosó permetezése csökkenti a fertőzési nyomást — ezt a permetezési naplóban is rögzítsük.',
    ],
  },
  {
    slug: 'rezisztens-fajtak', title: 'Rezisztens fajták házikertbe', category: 'Fajták', author: USERS[0], date: '2026-10-21', minutes: 8,
    excerpt: 'Kevesebb permetezés, kevesebb gond: mely fajták valók a vegyszerszegény kertbe?',
    body: [
      'Az interspecifikus (rezisztens) fajták a gombás betegségekkel szemben jóval ellenállóbbak, így házikertben gyakran 2–3 permetezés is elég egy szezonban.',
      'A katalógusban a „rezisztens / interspecifikus” és a „peronoszpóra-toleráns” címkékre szűrve gyorsan összeállítható egy ilyen lista.',
    ],
  },
  {
    slug: 'nebih-szerkereses', title: 'Hogyan keressünk engedélyezett növényvédő szert?', category: 'Növényvédelem', author: USERS[4], date: '2026-11-09', minutes: 4,
    excerpt: 'A NÉBIH engedélykereső adatai most közvetlenül a szeradatbázisban érhetők el.',
    body: [
      'A Szeradatbázis „NÉBIH kereső” fülén a hivatalos engedélykeresőben kereshetünk szernévre, és egy kattintással importálhatjuk a törzskönyvi adatokat.',
      'Az importált szereknél látszik, hogy szőlőben (bor- vagy csemegeszőlőben) engedélyezettek-e, mely károsítók ellen, mennyi az élelmezés-egészségügyi várakozási idő, és elérhetők az engedélyokirat PDF-jei is.',
      'A dózist és a kezelésszámot az engedélyokiratból kell beírni — ezután a permetezési napló minden bejegyzésnél ellenőrzi ezeket.',
    ],
  },
]

export interface ForumCategory { id: string; name: string; description: string; threads: number; last: string; unread: number }
export const FORUM: ForumCategory[] = [
  { id: 'altalanos', name: 'Általános', description: 'Bemutatkozás, kötetlen beszélgetés mindenről, ami szőlő.', threads: 12, last: '2 órája', unread: 3 },
  { id: 'termesztes', name: 'Termesztés és gondozás', description: 'Metszés, növényvédelem, telepítés, szaporítás, gyakorlati tapasztalatok.', threads: 27, last: '5 órája', unread: 6 },
  { id: 'kerdesek', name: 'Kérdések', description: 'Segítségkérés kezdőknek és haladóknak.', threads: 18, last: 'tegnap', unread: 2 },
  { id: 'fajtak', name: 'Fajták', description: 'Tapasztalatok egy-egy fajtáról, összehasonlítások.', threads: 34, last: '3 napja', unread: 0 },
  { id: 'cserebere', name: 'Csere-bere', description: 'Vessző- és oltványcsere a közösségen belül.', threads: 9, last: '1 hete', unread: 0 },
]

export interface ForumPost { user: MockUser; ago: string; text: string; likes: number }
export interface ForumThread { id: number; category: string; title: string; tags: string[]; replies: number; views: number; last: string; posts: ForumPost[] }
export const THREADS: ForumThread[] = [
  {
    id: 1, category: 'termesztes', title: 'Muscat bleu permetezés nélkül?', tags: ['rezisztens', 'növényvédelem'], replies: 4, views: 213, last: '2 órája',
    posts: [
      { user: USERS[0], ago: '2 napja', likes: 5, text: 'Harmadik éve tartom a Muscat bleu-t lugason. Eddig egyszer sem permeteztem, idén is egészséges maradt. Kinek mi a tapasztalata?' },
      { user: USERS[2], ago: '1 napja', likes: 3, text: 'Nálunk csapadékos évben a fürtön megjelent a lisztharmat, egy kénes kezelés rendbe tette. A naplóban 5 nap ÉVI-vel számoltam.' },
      { user: USERS[4], ago: '2 órája', likes: 1, text: 'Érdemes a szeradatbázisban a „csak szőlőre engedélyezett” szűrővel indulni — ott látszik a várakozási idő is.' },
    ],
  },
  {
    id: 2, category: 'kerdesek', title: 'Kodrjanka magvatlansága', tags: ['csemegeszőlő'], replies: 2, views: 98, last: 'tegnap',
    posts: [{ user: USERS[2], ago: 'tegnap', likes: 2, text: 'Gibberellines kezelést próbált már valaki Kodrjankán? Milyen időpontban érdemes?' }],
  },
  {
    id: 3, category: 'termesztes', title: 'Peronoszpóra-előrejelzés 2026', tags: ['növényvédelem'], replies: 11, views: 540, last: '4 napja',
    posts: [{ user: USERS[0], ago: '4 napja', likes: 7, text: 'Idén a júniusi esők után nálunk kétszer is ismételni kellett. Ti milyen időközzel permeteztetek?' }],
  },
  {
    id: 4, category: 'altalanos', title: 'Bemutatkozás – Győr környéki kiskert', tags: [], replies: 6, views: 120, last: '1 hete',
    posts: [{ user: USERS[3], ago: '1 hete', likes: 4, text: 'Sziasztok! 30 tőkés kiskertem van, főleg korai csemegefajtákkal. Örülök, hogy rátaláltam a közösségre.' }],
  },
]
