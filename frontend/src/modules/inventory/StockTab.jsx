import { useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { Alert, Badge, Button, Card, CONTROL, EmptyState, Field, Modal, SelectField, Skeleton, useToast } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { api, errorText } from '../../lib/api.js'
import { formatNumber } from '../../lib/format.js'
import { CATEGORIES, CATEGORY_LABEL, QrImage } from './shared.jsx'

const EMPTY = { name: '', category: 'dinner_plate', unit: 'pcs', total_quantity: '', min_quantity: '', condition_note: '' }

function ItemModal({ item, open, onClose, onSaved }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const current =
    form ||
    (item
      ? { name: item.name, category: item.category, unit: item.unit, total_quantity: String(item.total_quantity), min_quantity: String(item.min_quantity), condition_note: item.condition_note || '' }
      : EMPTY)
  const set = (key) => (e) => setForm({ ...current, [key]: e.target.value })

  function close() {
    setForm(null)
    setError('')
    onClose()
  }

  async function save() {
    setBusy(true)
    setError('')
    const body = {
      name: current.name.trim(),
      category: current.category,
      unit: current.unit.trim() || 'pcs',
      total_quantity: Number(current.total_quantity || 0),
      min_quantity: Number(current.min_quantity || 0),
      condition_note: current.condition_note.trim() || null,
    }
    try {
      const saved = item ? await api(`/inventory/items/${item.id}`, { method: 'PATCH', body }) : await api('/inventory/items', { method: 'POST', body })
      onSaved(saved, !item)
      close()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={item ? 'Edit item' : 'Add item'}
      description={item ? undefined : 'Each item gets its own QR label. Use one item per batch, e.g. "White dinner plates (gold rim)".'}
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button onClick={save} loading={busy}>{item ? 'Save' : 'Add item'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="i_name" label="Name" value={current.name} onChange={set('name')} className="sm:col-span-2" />
        <SelectField id="i_cat" label="Category" options={CATEGORIES} value={current.category} onChange={set('category')} />
        <Field id="i_unit" label="Unit" value={current.unit} onChange={set('unit')} />
        <Field id="i_total" label="Total owned" type="number" min="0" value={current.total_quantity} onChange={set('total_quantity')} />
        <Field id="i_min" label="Alert when available falls below" type="number" min="0" value={current.min_quantity} onChange={set('min_quantity')} />
        <Field id="i_note" label="Condition note" value={current.condition_note} onChange={set('condition_note')} className="sm:col-span-2" />
      </div>
      <div className="mt-4">
        <Alert key={error}>{error}</Alert>
      </div>
    </Modal>
  )
}

function Labels({ items, open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="QR labels"
      description="Print and stick one label on each crate or batch. Scanning a label picks the item instantly."
      size="lg"
      footer={
        <Button onClick={() => window.print()}>
          <Icon name="printer" className="h-4 w-4" />
          Print labels
        </Button>
      }
    >
      <div id="print-labels" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="label-card flex flex-col items-center rounded-xl border border-dashed border-ink-300 p-3 text-center">
            <QrImage value={item.qr_payload} size={132} />
            <p className="mt-2 text-sm font-semibold leading-tight text-ink-900">{item.name}</p>
            <p className="text-xs text-ink-500">{CATEGORY_LABEL[item.category]}</p>
            <p className="mt-0.5 font-mono text-[10px] tracking-wider text-ink-400">{item.qr_token.slice(0, 12)}</p>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export function StockTab({ items, setItems, error, canEdit }) {
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [labels, setLabels] = useState(null)
  const [q, setQ] = useState('')
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (items || []).filter((i) => !needle || `${i.name} ${CATEGORY_LABEL[i.category]}`.toLowerCase().includes(needle))
  }, [items, q])

  const totals = (items || []).reduce((t, i) => ({ owned: t.owned + i.total_quantity, out: t.out + i.out_now }), { owned: 0, out: 0 })

  function saved(item, isNew) {
    setItems((list) => (isNew ? [...list, item] : list.map((i) => (i.id === item.id ? item : i))))
    toast(isNew ? `${item.name} added` : `${item.name} updated`)
  }

  return (
    <div className="animate-page-in">
      <Card
        bodyClassName=""
        title={items ? `${items.length} items · ${formatNumber(totals.owned)} pieces` : 'Stock'}
        description={items ? `${formatNumber(totals.out)} pieces are out at events right now.` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-56">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input type="search" className={`${CONTROL} py-2 pl-9`} placeholder="Search items" aria-label="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={() => setLabels(visible)} disabled={!visible.length}>
              <Icon name="printer" className="h-4 w-4" />
              Labels
            </Button>
            {canEdit && (
              <Button onClick={() => setAdding(true)}>
                <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
                Add item
              </Button>
            )}
          </div>
        }
      >
        <div className="pt-4">
          {error && (
            <div className="px-6 pb-4">
              <Alert>{error}</Alert>
            </div>
          )}
          {!items && !error && (
            <div className="space-y-3 px-6 pb-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {items && items.length === 0 && (
            <div className="p-6">
              <EmptyState title="No items yet" icon="box">Add your crockery, cutlery and equipment, then print a QR label for each batch.</EmptyState>
            </div>
          )}
          {visible.length > 0 && (
            <div className="overflow-x-auto border-t border-ink-100">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Item</th>
                    <th className="px-3 py-3 text-right font-medium">Owned</th>
                    <th className="px-3 py-3 text-right font-medium">Out now</th>
                    <th className="px-3 py-3 font-medium">Available</th>
                    <th className="px-6 py-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {visible.map((item) => {
                    const share = item.total_quantity ? item.available / item.total_quantity : 0
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-ink-50/70">
                        <td className="px-6 py-3">
                          <p className="font-semibold text-ink-900">{item.name}</p>
                          <p className="text-xs text-ink-500">
                            {CATEGORY_LABEL[item.category]}
                            {item.condition_note && ` · ${item.condition_note}`}
                          </p>
                        </td>
                        <td className="tabular px-3 py-3 text-right text-ink-700">{formatNumber(item.total_quantity)}</td>
                        <td className="tabular px-3 py-3 text-right text-ink-700">{item.out_now ? formatNumber(item.out_now) : '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                              <div className={`h-full rounded-full ${item.low_stock ? 'bg-red-500' : 'bg-kashi-500'}`} style={{ width: `${Math.round(share * 100)}%` }} />
                            </div>
                            <span className="tabular font-medium text-ink-900">{formatNumber(item.available)}</span>
                            {item.low_stock && <Badge tone="danger">Low</Badge>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setLabels([item])} aria-label={`QR label for ${item.name}`}>
                            <Icon name="qr" className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`}>
                              <Icon name="edit" className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
      <ItemModal key={editing?.id || 'new'} item={editing} open={Boolean(editing) || adding} onClose={() => (setEditing(null), setAdding(false))} onSaved={saved} />
      <Labels items={labels || []} open={Boolean(labels)} onClose={() => setLabels(null)} />
    </div>
  )
}
