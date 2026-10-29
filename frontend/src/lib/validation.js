// Field rules used by every form. Each "kind" says what a field may contain and how to
// explain a wrong entry. The server checks again; these rules give instant feedback.

const LETTER = /\p{L}/u

function digitsIn(value) {
  return (value.match(/\d/g) || []).length
}

const RULES = {
  personName: {
    live: (v) => (/\d/.test(v) ? 'A name cannot contain numbers.' : /[^\p{L}\s.'-]/u.test(v) ? 'Use letters only in a name.' : null),
    check: (v) => (v.trim().length < 2 || !LETTER.test(v) ? 'Enter a full name using letters, e.g. Sara Ahmed.' : null),
  },
  companyName: {
    live: (v) => (/[^\p{L}\d\s.,&'()/-]/u.test(v) ? 'Use letters, numbers and simple punctuation only.' : null),
    check: (v) => (v.trim().length < 2 || !LETTER.test(v) ? 'Enter the company name in letters, e.g. Royal Caterers.' : null),
  },
  place: {
    live: (v) => (/\d/.test(v) ? 'A city name cannot contain numbers.' : /[^\p{L}\s.'-]/u.test(v) ? 'Use letters only.' : null),
    check: (v) => (v.trim().length < 2 ? 'Enter a city name, e.g. Lahore.' : null),
  },
  title: {
    live: (v) => (/\d/.test(v) ? 'A job title cannot contain numbers.' : /[^\p{L}\s.&/,'-]/u.test(v) ? 'Use letters only.' : null),
    check: (v) => (v.trim().length < 2 ? 'Enter a job title, e.g. Head waiter.' : null),
  },
  email: {
    live: (v) => (/\s/.test(v.trim()) ? 'An email address has no spaces.' : null),
    check: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter an email like name@company.com.'),
  },
  phone: {
    live: (v) => (/[^\d\s+()-]/.test(v) ? 'A phone number can only have digits, spaces, + and -.' : null),
    check: (v) => {
      const t = v.trim()
      const n = digitsIn(t)
      if (/[^\d\s+()-]/.test(t)) return 'A phone number can only have digits, spaces, + and -.'
      if (t.startsWith('+') ? n < 8 || n > 15 : !(t.startsWith('0') && n >= 10 && n <= 12)) {
        return 'Enter a mobile number like 0300 1234567 or +971 50 123 4567.'
      }
      return null
    },
  },
  identifier: {
    live: () => null,
    check: (v) => {
      const t = v.trim()
      if (t.includes('@')) return RULES.email.check(t) && 'Enter a valid email, e.g. name@company.com.'
      if (/[a-z]/i.test(t)) return 'Enter your email address or your mobile number.'
      return RULES.phone.check(t) && 'Enter a mobile number like 0300 1234567, or your email.'
    },
  },
  count: {
    live: (v) => (/[^\d]/.test(v) ? 'Use whole numbers only, e.g. 250.' : null),
    check: (v) => (/^\d+$/.test(v.trim()) && Number(v) > 0 ? null : 'Enter a whole number above 0, e.g. 250.'),
  },
  countZero: {
    live: (v) => (/[^\d]/.test(v) ? 'Use whole numbers only.' : null),
    check: (v) => (/^\d+$/.test(v.trim()) ? null : 'Enter a whole number, e.g. 50.'),
  },
  money: {
    live: (v) => (/[^\d.]/.test(v) ? 'Enter the amount in numbers only, without commas or Rs.' : null),
    check: (v) => (/^\d+(\.\d{1,2})?$/.test(v.trim()) ? null : 'Enter an amount in numbers, e.g. 150000.'),
  },
  unit: {
    live: (v) => (/\d/.test(v) ? 'A unit is a word, e.g. pcs or sets.' : null),
    check: (v) => (LETTER.test(v) ? null : 'Enter a unit, e.g. pcs, sets or kg.'),
  },
  words: {
    live: () => null,
    check: (v) => (v.trim().length >= 2 && LETTER.test(v) ? null : 'Enter at least two letters.'),
  },
  futureDate: {
    live: () => null,
    check: (v) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Pick a date from the calendar.'
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return new Date(`${v}T00:00:00`) < today ? 'This date is in the past. Pick today or a later date.' : null
    },
  },
  date: {
    live: () => null,
    check: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Pick a date from the calendar.'),
  },
  time: {
    live: () => null,
    check: (v) => (/^\d{2}:\d{2}/.test(v) ? null : 'Pick a time, e.g. 7:30 pm.'),
  },
}

// The message to show for a value, or null when it is fine.
export function fieldProblem(kind, value, { required = false, el = null } = {}) {
  const v = value == null ? '' : String(value)
  if (el?.validity?.badInput) return 'This field takes numbers only.'
  if (!v.trim()) return required ? 'This field is required.' : null
  const rule = RULES[kind]
  return rule ? rule.check(v) || null : null
}

// A problem worth showing while the person is still typing (a wrong character).
export function liveProblem(kind, value) {
  const rule = RULES[kind]
  return rule && value ? rule.live(String(value)) : null
}

// Checks every rule-bearing field inside `root` (a form or dialog). Fields with a
// problem are marked so they show their message. Returns the problems, first first.
export function checkFields(root) {
  if (!root) return []
  const problems = []
  root.querySelectorAll('[data-kind], [data-required="true"]').forEach((el) => {
    if (el.disabled || el.offsetParent === null) return
    const message = fieldProblem(el.dataset.kind, el.value, { required: el.dataset.required === 'true', el })
    el.dispatchEvent(new CustomEvent('pulse:check'))
    if (message) problems.push({ el, label: el.dataset.label || 'A field', message })
  })
  return problems
}
