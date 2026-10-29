// M2 · QR Inventory — owner: Amna Arslan
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { PageHeader, Tabs } from '../../components/ui/index.js'
import { Icon } from '../../layout/icons.jsx'
import { useApi } from '../../lib/useApi.js'
import { EventsTab } from './EventsTab.jsx'
import { PredictTab } from './PredictTab.jsx'
import { ScanTab } from './ScanTab.jsx'
import { useEventChoices } from './shared.jsx'
import { StockTab } from './StockTab.jsx'
import { PHOTOS } from '../../components/EventPhotos.jsx'

function AlertsStrip({ alerts }) {
  if (!alerts?.length) return null
  return (
    <div className="mb-6 rounded-panel bg-saffron-50 px-5 py-4 ring-1 ring-inset ring-saffron-200">
      <p className="flex items-center gap-2 text-sm font-semibold text-saffron-900">
        <Icon name="alert" className="h-4 w-4" />
        {alerts.length === 1 ? '1 thing needs attention' : `${alerts.length} things need attention`}
      </p>
      <ul className="mt-1.5 space-y-0.5 text-sm text-saffron-900">
        {alerts.slice(0, 5).map((a, i) => (
          <li key={i}>
            {a.booking_id ? (
              <Link to={`/inventory?tab=events&booking=${a.booking_id}`} className="underline-offset-2 hover:underline">
                {a.message}
              </Link>
            ) : (
              a.message
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function InventoryPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'stock'
  const bookingId = params.get('booking') || ''
  const items = useApi('/inventory/items')
  const alerts = useApi('/inventory/alerts')
  const { events } = useEventChoices()
  const canEdit = ['owner', 'manager'].includes(user.role)

  const go = (next) => setParams((p) => ({ ...Object.fromEntries(p), ...next }), { replace: true })
  const setBookingId = (id) => go({ booking: id })
  const refresh = () => {
    items.reload()
    alerts.reload()
  }

  return (
    <>
      <PageHeader
        context="M2 · Inventory"
        photos={[PHOTOS.tableDay, PHOTOS.glassesTable, PHOTOS.hallTables]}
        title="Inventory"
        description="Crockery, cutlery and equipment with QR labels. Scan items out to an event and back in, and see what is still missing."
      />
      <AlertsStrip alerts={alerts.data} />
      <Tabs
        value={tab}
        onChange={(id) => go({ tab: id })}
        tabs={[
          { id: 'stock', label: 'Stock', icon: 'box', count: items.data?.length },
          { id: 'scan', label: 'Scan', icon: 'scan' },
          { id: 'events', label: 'Out & returned', icon: 'history' },
          { id: 'predict', label: 'AI predictor', icon: 'sparkle' },
        ]}
      />
      {tab === 'stock' && <StockTab items={items.data} setItems={items.setData} error={items.error} canEdit={canEdit} />}
      {tab === 'scan' && <ScanTab items={items.data} events={events} bookingId={bookingId} setBookingId={setBookingId} onRecorded={refresh} />}
      {tab === 'events' && <EventsTab events={events} bookingId={bookingId} setBookingId={setBookingId} canEdit={canEdit} onChanged={refresh} />}
      {tab === 'predict' && <PredictTab events={events} bookingId={bookingId} setBookingId={setBookingId} />}
    </>
  )
}
