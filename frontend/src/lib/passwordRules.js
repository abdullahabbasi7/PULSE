// Mirrors backend/app/core/passwords.py so people see the rules as they type.
// The server enforces them; this only gives instant feedback.
export const MIN_LENGTH = 10

const COMMON_WORDS = new Set([
  'password', 'passw', 'pass', 'qwerty', 'qwertyuiop', 'asdf', 'asdfgh', 'zxcvbn', 'abc', 'abcd', 'admin',
  'administrator', 'welcome', 'letmein', 'login', 'user', 'test', 'guest', 'master', 'iloveyou', 'love', 'monkey',
  'dragon', 'sunshine', 'princess', 'football', 'cricket', 'baseball', 'shadow', 'superman', 'batman', 'trustno',
  'hello', 'secret', 'freedom', 'pakistan', 'karachi', 'lahore', 'islamabad', 'allah', 'bismillah', 'mashallah',
  'pulse', 'catering', 'caterers', 'events', 'event', 'wedding', 'company', 'demo', 'changeme',
])
const SEQUENCES = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']

function hasSequence(text) {
  const lower = text.toLowerCase()
  return SEQUENCES.some((seq) => {
    for (let i = 0; i + 4 <= seq.length; i += 1) {
      const chunk = seq.slice(i, i + 4)
      if (lower.includes(chunk) || lower.includes([...chunk].reverse().join(''))) return true
    }
    return false
  })
}

// Each rule: label shown to the user and a test that returns true when satisfied.
export function passwordChecks(password, { email = '', fullName = '' } = {}) {
  const lower = password.toLowerCase()
  const letters = lower.replace(/[^a-z]/g, '')
  const personal = [email.split('@')[0], ...fullName.split(/\s+/)].map((p) => p.toLowerCase()).filter((p) => p.length >= 3)
  return [
    { label: `At least ${MIN_LENGTH} characters`, ok: password.length >= MIN_LENGTH },
    { label: 'Uppercase and lowercase letters', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'At least one number', ok: /\d/.test(password) },
    { label: 'At least one symbol (! @ # $ %)', ok: /[^A-Za-z0-9]/.test(password) },
    {
      label: 'No common words, sequences or repeats',
      ok: password.length > 0 && !COMMON_WORDS.has(letters) && !hasSequence(password) && !/(.)\1\1\1/.test(lower),
    },
    { label: 'Not your name or email', ok: password.length > 0 && !personal.some((p) => lower.includes(p)) },
  ]
}

export function isStrong(password, context) {
  return passwordChecks(password, context).every((c) => c.ok) && password === password.trim()
}

export function strengthScore(password, context) {
  if (!password) return 0
  const passed = passwordChecks(password, context).filter((c) => c.ok).length
  const lengthBonus = Math.min(2, Math.floor(Math.max(0, password.length - MIN_LENGTH) / 4))
  return Math.min(4, Math.round(((passed + lengthBonus) / 8) * 4))
}
