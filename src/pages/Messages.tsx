// „Üzenetek” — MINTA. Az elküldött üzenetek csak ebben a böngészőlapban élnek (nincs valódi kézbesítés).
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { ArrowLeft, MessageSquare, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CONVERSATIONS, userById, type MockMessage } from '../lib/mock'
import { Badge, Button, Card, Empty, Input, PageHeader, cx } from '../components/ui'

const when = (at: string) => format(new Date(at.replace(' ', 'T')), 'MMM d. HH:mm', { locale: hu })

export default function Messages() {
  const [sp, setSp] = useSearchParams()
  const [convs, setConvs] = useState(() => CONVERSATIONS.map((c) => ({ ...c, messages: [...c.messages] })))
  const to = sp.get('to')
  // „Üzenet küldése” egy profilról vagy listáról: új beszélgetés nyílik
  if (to && userById(to) && !convs.some((c) => c.with === to) && to !== 'minta-gazda') setConvs([{ with: to, messages: [] }, ...convs])
  const active = convs.find((c) => c.with === to) ?? null
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [active?.messages.length, to])

  const open = (id: string) => {
    setConvs((cs) => cs.map((c) => (c.with === id ? { ...c, unread: 0 } : c)))
    setSp({ to: id }, { replace: true })
  }
  const send = () => {
    if (!text.trim() || !active) return
    const msg: MockMessage = { from: 'me', text: text.trim(), at: format(new Date(), 'yyyy-MM-dd HH:mm') }
    setConvs((cs) => cs.map((c) => (c.with === active.with ? { ...c, messages: [...c.messages, msg] } : c)))
    setText('')
  }

  return (
    <>
      <PageHeader title="Üzenetek" subtitle="Vesszőcsere, tapasztalatcsere gazdák között. (Minta — az üzenetek nem kerülnek elküldésre.)" />
      <Card className="overflow-hidden grid md:grid-cols-[300px_1fr] h-[calc(100dvh-15rem)] min-h-[420px]">
        <ul className={cx('border-r border-line overflow-y-auto', active && 'hidden md:block')}>
          {convs.map((c) => {
            const u = userById(c.with)!
            const last = c.messages.at(-1)
            return (
              <li key={c.with}>
                <button onClick={() => open(c.with)} className={cx('flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2 border-b border-line', active?.with === c.with && 'bg-surface-2')}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: u.color }}>{u.initials}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{u.name}</span>
                      {last && <span className="text-[11px] text-muted shrink-0">{when(last.at)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cx('text-sm truncate flex-1', c.unread ? 'text-fg font-medium' : 'text-muted')}>{last ? `${last.from === 'me' ? 'Te: ' : ''}${last.text}` : 'Új beszélgetés'}</span>
                      {!!c.unread && <Badge tone="brand">{c.unread}</Badge>}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {active ? (
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
              <button className="md:hidden -ml-1 p-1 text-muted" onClick={() => setSp({}, { replace: true })} aria-label="Vissza"><ArrowLeft className="size-5" /></button>
              <Link to={`/gazda/${active.with}`} className="flex items-center gap-3 hover:underline">
                <span className="grid size-9 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: userById(active.with)!.color }}>{userById(active.with)!.initials}</span>
                <span>
                  <span className="block font-medium leading-tight">{userById(active.with)!.name}</span>
                  <span className="block text-xs text-muted">{userById(active.with)!.city}</span>
                </span>
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-surface-2/40">
              {active.messages.length === 0 && <p className="m-auto text-sm text-muted">Írj az első üzenetet!</p>}
              {active.messages.map((m, i) => (
                <div key={i} className={cx('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm', m.from === 'me' ? 'self-end bg-vine-700 text-white rounded-br-md dark:bg-vine-600' : 'self-start bg-surface border border-line rounded-bl-md')}>
                  {m.text}
                  <div className={cx('mt-0.5 text-[10px]', m.from === 'me' ? 'text-white/70' : 'text-muted')}>{when(m.at)}</div>
                </div>
              ))}
              <div ref={end} />
            </div>
            <form className="flex gap-2 p-3 border-t border-line" onSubmit={(e) => { e.preventDefault(); send() }}>
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Üzenet…" />
              <Button type="submit" icon={<Send className="size-4" />} aria-label="Küldés" />
            </form>
          </div>
        ) : (
          <div className="hidden md:grid place-items-center"><Empty icon={<MessageSquare />} title="Válassz beszélgetést" text="Gazdának a profilján vagy a nyilvános listáján keresztül is írhatsz." /></div>
        )}
      </Card>
    </>
  )
}
