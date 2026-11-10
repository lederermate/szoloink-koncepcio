// Cikkek, fórum, súgó — a koncepció közösségi felületei mintaadatokkal.
import { ArrowLeft, BookOpen, Clock, Eye, Heart, Info, MessageSquare, Send, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ARTICLES, FORUM, THREADS } from '../lib/mock'
import { d } from '../lib/format'
import { Badge, Button, Card, CardHeader, Empty, PageHeader, Textarea } from '../components/ui'

const Avatar = ({ u, size = 8 }: { u: { initials: string; color: string }; size?: number }) => (
  <span className="grid shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: u.color, width: size * 4, height: size * 4 }}>{u.initials}</span>
)
const MockNote = () => (
  <p className="mt-6 flex items-center gap-2 text-xs text-muted"><Info className="size-3.5" /> Koncepció — a tartalom mintaadat, a funkció a valós rendszerben a szoloink.hu hátterére épülne.</p>
)

export function Articles() {
  const [first, ...rest] = ARTICLES
  return (
    <>
      <PageHeader title="Cikkek" subtitle="Útmutatók, fajtaismertetők és hírek a közösségtől" />
      <Link to={`/cikkek/${first.slug}`} className="group block mb-6">
        <Card className="overflow-hidden grid md:grid-cols-2">
          <div className="min-h-48 bg-gradient-to-br from-vine-700 to-vine-500 p-6 flex items-end text-white">
            <BookOpen className="size-10 opacity-60" />
          </div>
          <div className="p-6">
            <Badge tone="brand">{first.category}</Badge>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight group-hover:text-vine-700 dark:group-hover:text-vine-300">{first.title}</h2>
            <p className="mt-2 text-muted">{first.excerpt}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted"><Avatar u={first.author} size={6} /> {first.author.name} · {d(first.date)} · {first.minutes} perc</div>
          </div>
        </Card>
      </Link>
      <div className="grid gap-4 sm:grid-cols-2">
        {rest.map((a) => (
          <Link key={a.slug} to={`/cikkek/${a.slug}`} className="group">
            <Card className="p-5 h-full transition group-hover:shadow-md">
              <Badge tone="brand">{a.category}</Badge>
              <h3 className="mt-2 font-semibold text-lg leading-snug group-hover:text-vine-700 dark:group-hover:text-vine-300">{a.title}</h3>
              <p className="mt-1 text-sm text-muted">{a.excerpt}</p>
              <div className="mt-3 text-xs text-muted">{a.author.name} · {d(a.date)} · {a.minutes} perc</div>
            </Card>
          </Link>
        ))}
      </div>
      <MockNote />
    </>
  )
}

export function ArticlePage() {
  const a = ARTICLES.find((x) => x.slug === useParams().slug)
  if (!a) return <Empty icon={<BookOpen />} title="A cikk nem található" />
  return (
    <article className="max-w-2xl mx-auto">
      <Link to="/cikkek" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-6"><ArrowLeft className="size-4" /> Cikkek</Link>
      <Badge tone="brand">{a.category}</Badge>
      <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">{a.title}</h1>
      <div className="mt-4 flex items-center gap-2 text-sm text-muted"><Avatar u={a.author} /> {a.author.name} · {d(a.date)} · <Clock className="size-3.5" /> {a.minutes} perc olvasás</div>
      <p className="mt-6 text-lg text-muted leading-relaxed">{a.excerpt}</p>
      {a.body.map((p, i) => <p key={i} className="mt-4 leading-relaxed text-[16px]">{p}</p>)}
      <MockNote />
    </article>
  )
}

export function Forum() {
  return (
    <>
      <PageHeader title="Fórum" subtitle="Beszélgetések, tapasztalatok és fotók a közösségtől" actions={<Button icon={<MessageSquare className="size-4" />} disabled>Új téma</Button>} />
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {FORUM.map((c) => (
            <li key={c.id}>
              <Link to={`/forum/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-vine-100 text-vine-700 dark:bg-vine-900/60 dark:text-vine-300"><MessageSquare className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-2">{c.name} {c.unread > 0 && <Badge tone="brand">{c.unread} új</Badge>}</div>
                  <p className="text-sm text-muted truncate">{c.description}</p>
                </div>
                <div className="hidden sm:block text-right text-xs text-muted">
                  <div><b className="text-fg">{c.threads}</b> téma</div>
                  <div>utolsó: {c.last}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <MockNote />
    </>
  )
}

export function ForumCategory() {
  const { cat } = useParams()
  const c = FORUM.find((x) => x.id === cat)
  const threads = THREADS.filter((t) => t.category === cat)
  if (!c) return <Empty icon={<MessageSquare />} title="Nincs ilyen kategória" />
  return (
    <>
      <Link to="/forum" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4"><ArrowLeft className="size-4" /> Fórum</Link>
      <PageHeader title={c.name} subtitle={c.description} />
      <Card className="overflow-hidden">
        {!threads.length ? <Empty icon={<MessageSquare />} title="Ebben a mintában nincs téma" /> : (
          <ul className="divide-y divide-line">
            {threads.map((t) => (
              <li key={t.id}>
                <Link to={`/forum/${c.id}/${t.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2">
                  <Avatar u={t.posts[0].user} size={9} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1">{t.tags.map((x) => <Badge key={x}>{x}</Badge>)}</div>
                  </div>
                  <div className="text-right text-xs text-muted shrink-0">
                    <div className="flex items-center gap-2 justify-end"><MessageSquare className="size-3" />{t.replies}<Eye className="size-3 ml-1" />{t.views}</div>
                    <div>{t.last}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <MockNote />
    </>
  )
}

export function ForumThread() {
  const { cat, id } = useParams()
  const t = THREADS.find((x) => String(x.id) === id)
  if (!t) return <Empty icon={<MessageSquare />} title="A téma nem található" />
  return (
    <div className="max-w-3xl">
      <Link to={`/forum/${cat}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-4"><ArrowLeft className="size-4" /> {FORUM.find((c) => c.id === cat)?.name}</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <div className="mt-2 flex flex-wrap gap-1 mb-5">{t.tags.map((x) => <Badge key={x} tone="brand">{x}</Badge>)}</div>
      <div className="flex flex-col gap-3">
        {t.posts.map((p, i) => (
          <Card key={i} className="p-4 sm:p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <Avatar u={p.user} />
              <div className="text-sm"><b>{p.user.name}</b> <span className="text-muted">· {p.user.city} · {p.ago}</span></div>
            </div>
            <p className="leading-relaxed">{p.text}</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Heart className="size-3.5" /> {p.likes}</div>
          </Card>
        ))}
        <Card className="p-4">
          <Textarea placeholder="Válasz írása… (a koncepcióban kikapcsolva)" disabled />
          <div className="mt-2 flex justify-end"><Button size="sm" icon={<Send className="size-3.5" />} disabled>Küldés</Button></div>
        </Card>
      </div>
      <MockNote />
    </div>
  )
}

export function Help() {
  const real = [
    ['Permetezési napló', 'Rögzítés, élő növényvédelmi ellenőrzés (szőlő-engedély, károsító, dózis, kezelésszám, ÉVI, készlet, képesítés), nyomtatható napló.'],
    ['Szeradatbázis + NÉBIH', 'Élő keresés és import a NÉBIH Engedélykeresőből: engedélyszám, érvényesség, kultúrák, károsítók, ÉVI, öko, PDF engedélyokiratok.'],
    ['Fajtakatalógus', 'Elírástűrő (cirill-tűrő) keresés, címke- és érésszűrők, A–Z lista, fajtaadatlap érési sávval, új fajta felvétele / szerkesztése.'],
    ['Fajta ↔ növényvédelem', 'A fajtaadatlap „Növényvédelem” fülén: a bor/csemege kultúrára engedélyezett szerek, és a várható érés alapján a legkésőbbi permetezési dátum.'],
    ['Kertem', 'Parcellák fajtával, ÉVI/MVI-állapot, munkanapló, szüret, raktár.'],
  ]
  const mock = ['Bejelentkezés, profil, gazdák listája', 'Fórum (olvasható mintatémák)', 'Cikkek (mintacikkek)', 'Eseményfolyam', 'Fajta-verziótörténet', 'Fotók (helyettük generált fürt-illusztráció)']
  return (
    <div className="max-w-3xl">
      <PageHeader title="Segítség — a koncepcióról" subtitle="Modernizált felület-javaslat a szoloink.hu-hoz, permetezési naplóval és NÉBIH-integrációval" />
      <Card className="mb-6">
        <CardHeader title="Működő funkciók" icon={<Sparkles className="size-5" />} />
        <ul className="px-5 pb-5 flex flex-col gap-3">
          {real.map(([t, x]) => <li key={t}><div className="font-medium">{t}</div><div className="text-sm text-muted">{x}</div></li>)}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Csak mintaként (statikus adatok)" icon={<Info className="size-5" />} />
        <ul className="px-5 pb-5 flex flex-wrap gap-2">{mock.map((m) => <li key={m}><Badge>{m}</Badge></li>)}</ul>
      </Card>
    </div>
  )
}
