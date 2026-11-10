import { Boxes, PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { api, useProducts, useSave, useStock } from '../lib/api'
import { d, n, today } from '../lib/format'
import { Badge, Button, Card, CardHeader, Empty, Field, Input, Modal, PageHeader, Select, Spinner, cx } from '../components/ui'

export default function Stock() {
  const { data: products, isLoading } = useProducts()
  const { data: moves = [] } = useStock()
  const [open, setOpen] = useState<number | null>(null)
  const inStock = (products ?? []).filter((p) => p.stock !== 0 || moves.some((m) => m.product_id === p.id))

  return (
    <>
      <PageHeader title="Raktár" subtitle="Szerkészlet — a permetezések automatikusan levonják a felhasznált mennyiséget" actions={<Button icon={<PackagePlus className="size-4" />} onClick={() => setOpen(0)}>Bevételezés</Button>} />
      {isLoading ? <Spinner /> : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Készlet" icon={<Boxes className="size-5" />} />
            {!inStock.length ? <Empty icon={<Boxes />} title="Üres a raktár" /> : (
              <ul className="divide-y divide-line">
                {inStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone={p.stock < 0 ? 'red' : p.stock <= 1 ? 'amber' : 'green'}>{n(p.stock)} {p.unit}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => setOpen(p.id)} aria-label="Bevételezés"><PackagePlus className="size-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader title="Mozgások" subtitle="Utolsó 500 tétel" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs text-muted"><tr className="text-left"><th className="px-5 py-2">Dátum</th><th className="px-3 py-2">Szer</th><th className="px-3 py-2">Jogcím</th><th className="px-5 py-2 text-right">Mennyiség</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {moves.map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-2 whitespace-nowrap">{d(m.date)}</td>
                      <td className="px-3 py-2">{m.product_name}</td>
                      <td className="px-3 py-2 text-muted">{m.note}</td>
                      <td className={cx('px-5 py-2 text-right tabular-nums font-medium', m.quantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-leaf-700 dark:text-leaf-200')}>{m.quantity > 0 ? '+' : ''}{n(m.quantity, 3)} {m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      <StockModal productId={open} onClose={() => setOpen(null)} />
    </>
  )
}

function StockModal({ productId, onClose }: { productId: number | null; onClose: () => void }) {
  const { data: products = [] } = useProducts()
  const [f, setF] = useState({ product_id: 0, quantity: '', date: today(), note: 'Vásárlás' })
  const [prev, setPrev] = useState<number | null>(null)
  if (productId !== prev) {
    setPrev(productId)
    setF((x) => ({ ...x, product_id: productId ?? 0, quantity: '' }))
  }
  const save = useSave((b: typeof f) => api('/stock', { method: 'POST', json: { ...b, quantity: Number(b.quantity) } }))
  const unit = products.find((p) => p.id === f.product_id)?.unit
  return (
    <Modal open={productId !== null} onClose={onClose} title="Bevételezés / korrekció"
      footer={<><Button variant="secondary" onClick={onClose}>Mégse</Button><Button loading={save.isPending} disabled={!f.product_id || !f.quantity} onClick={() => save.mutate(f, { onSuccess: onClose })}>Rögzítés</Button></>}>
      <div className="grid gap-4">
        <Field label="Szer"><Select value={f.product_id || ''} onChange={(e) => setF({ ...f, product_id: Number(e.target.value) })}><option value="">Válasszon…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Mennyiség${unit ? ` (${unit})` : ''}`} hint="Negatív érték: kivét / selejtezés"><Input type="number" step="0.001" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></Field>
          <Field label="Dátum"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <Field label="Jogcím"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        {save.error && <p className="text-sm text-red-600">{save.error.message}</p>}
      </div>
    </Modal>
  )
}
