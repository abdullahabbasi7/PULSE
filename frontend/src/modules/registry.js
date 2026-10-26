// One entry per FYP module. The dashboard and the module pages read from here.
// `glaze` picks the module's colour family (see tailwind.config.js).
export const MODULES = {
  bookings: {
    code: 'M1',
    path: '/bookings',
    title: 'Bookings & Events',
    owner: 'Abdullah Iftikhar Abbasi',
    glaze: 'brand',
    icon: 'calendar',
    summary: 'Take bookings, see every event on the calendar and follow each one live on the day.',
    ai: {
      name: 'Smart inquiry reader',
      text: 'Paste a WhatsApp inquiry in English or Roman Urdu and the booking form fills itself: date, venue, guests, menu and event type.',
      technique: 'NLP: entity extraction and text classification',
    },
    features: [
      'Client records and booking form (date, venue, guests, menu, package)',
      'Calendar of upcoming events, with clashes for staff and venue flagged',
      'Booking status from inquiry to confirmed, in progress and completed',
      "Live event board for everything happening today",
    ],
  },
  inventory: {
    code: 'M2',
    path: '/inventory',
    title: 'Inventory',
    owner: 'Amna Arslan',
    glaze: 'kashi',
    icon: 'box',
    summary: 'Track crockery, cutlery and equipment with QR codes as it goes out to events and comes back.',
    ai: {
      name: 'Equipment predictor',
      text: 'From guest count, menu and event type, predicts how many plates, glasses and chafing dishes to send.',
      technique: 'Machine learning: regression trained on past events',
    },
    features: [
      'Item catalogue with categories, quantities and condition',
      'Printable QR label for every item or batch',
      'Scan out to an event, scan back in, and record damage or loss',
      'Alerts for low stock and items not returned',
    ],
  },
  attendance: {
    code: 'M3',
    path: '/staff',
    title: 'Staff & Attendance',
    owner: 'Atiqa Jabeen',
    glaze: 'saffron',
    icon: 'badge',
    summary: 'Register staff faces once, then mark attendance by camera at the venue or office.',
    ai: {
      name: 'Face check-in',
      text: 'Recognises a staff member from the webcam and rejects a photo held up to the camera.',
      technique: 'Computer vision: face detection, embeddings and liveness',
    },
    features: [
      'Staff profiles with role, phone and daily wage',
      'Face registration from a few webcam photos',
      'Check-in and check-out by face, linked to the event',
      'Daily attendance sheet and absentee list',
    ],
  },
}

// Full class strings so Tailwind can see them.
export const GLAZE = {
  brand: {
    tile: 'bg-brand-600 text-white',
    soft: 'bg-brand-50 text-brand-700 ring-brand-100',
    text: 'text-brand-700',
    bar: 'bg-brand-500',
    stars: 'stroke-brand-200',
  },
  kashi: {
    tile: 'bg-kashi-500 text-white',
    soft: 'bg-kashi-50 text-kashi-700 ring-kashi-100',
    text: 'text-kashi-700',
    bar: 'bg-kashi-500',
    stars: 'stroke-kashi-200',
  },
  saffron: {
    tile: 'bg-saffron-400 text-white',
    soft: 'bg-saffron-50 text-saffron-800 ring-saffron-100',
    text: 'text-saffron-700',
    bar: 'bg-saffron-400',
    stars: 'stroke-saffron-200',
  },
}
