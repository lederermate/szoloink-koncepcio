// MINTAADATOK a koncepció közösségi felületeihez (eseményfolyam, cikkek, fórum).
// Kitalált szereplők és szövegek — a valós rendszerben a szoloink.hu háttere adná.

export interface MockUser { name: string; initials: string; color: string; city: string }
export const USERS: MockUser[] = [
  { name: 'Kertész Anna', initials: 'KA', color: '#7c3aed', city: 'Kecskemét' },
  { name: 'Szabó Péter', initials: 'SzP', color: '#0e7490', city: 'Eger' },
  { name: 'Tóth Gábor', initials: 'TG', color: '#c2410c', city: 'Pécs' },
  { name: 'Nagy Eszter', initials: 'NE', color: '#be185d', city: 'Győr' },
  { name: 'Minta Gazda', initials: 'MG', color: '#4b2e83', city: 'Badacsonytomaj' },
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
