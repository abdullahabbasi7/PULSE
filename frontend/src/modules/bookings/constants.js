export const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding (barat)' },
  { value: 'mehndi', label: 'Mehndi' },
  { value: 'walima', label: 'Walima' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'conference', label: 'Conference' },
  { value: 'religious', label: 'Religious gathering' },
  { value: 'other', label: 'Other' },
]
export const EVENT_LABEL = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t.label]))

export const STATUS = {
  inquiry: { label: 'Inquiry', tone: 'neutral' },
  quoted: { label: 'Quoted', tone: 'brand' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
}

// Same rules as the backend; used only to decide which buttons to show.
export const TRANSITIONS = {
  inquiry: ['quoted', 'confirmed', 'cancelled'],
  quoted: ['inquiry', 'confirmed', 'cancelled'],
  confirmed: ['quoted', 'in_progress', 'cancelled'],
  in_progress: ['completed', 'confirmed'],
  completed: ['in_progress'],
  cancelled: ['inquiry'],
}

export const STATUS_ACTION = {
  inquiry: 'Back to inquiry',
  quoted: 'Mark quoted',
  confirmed: 'Confirm booking',
  in_progress: 'Start event',
  completed: 'Mark completed',
  cancelled: 'Cancel booking',
}

export const PROGRESS = [
  { id: 'scheduled', label: 'Scheduled', short: 'Scheduled' },
  { id: 'dispatched', label: 'Team & equipment dispatched', short: 'Dispatched' },
  { id: 'setup', label: 'Setting up at venue', short: 'Setup' },
  { id: 'serving', label: 'Serving guests', short: 'Serving' },
  { id: 'wind_up', label: 'Winding up', short: 'Wind-up' },
  { id: 'done', label: 'Done', short: 'Done' },
]

export const ENTITY_STYLE = {
  DATE: { label: 'Date', cls: 'bg-brand-100 text-brand-800 ring-brand-200' },
  TIME: { label: 'Time', cls: 'bg-sky-100 text-sky-800 ring-sky-200' },
  GUESTS: { label: 'Guests', cls: 'bg-saffron-100 text-saffron-900 ring-saffron-200' },
  VENUE: { label: 'Venue', cls: 'bg-kashi-100 text-kashi-800 ring-kashi-200' },
  DISH: { label: 'Dish', cls: 'bg-rose-100 text-rose-800 ring-rose-200' },
  PHONE: { label: 'Phone', cls: 'bg-ink-100 text-ink-800 ring-ink-200' },
}

export const EDIT_ROLES = ['owner', 'manager']
