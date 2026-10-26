// M2 · QR Inventory — owner: Amna Arslan
import { ModulePlaceholder } from '../ModulePlaceholder.jsx'

export function InventoryPage() {
  return (
    <ModulePlaceholder
      code="M2"
      owner="Amna"
      title="Inventory"
      description="Track crockery, cutlery and equipment with QR codes as it goes out to events and comes back."
      features={[
        'Item catalogue with categories, quantities and condition',
        'Printable QR label for every item or batch',
        'Scan out to an event, scan back in, record damage or loss',
        'Low-stock and not-returned alerts',
      ]}
    />
  )
}
