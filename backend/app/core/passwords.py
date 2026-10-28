"""Password policy shared by sign-up, adding team members, resets and password changes.

A password is accepted only if it is long, mixes character types, and is not built
from a common word or from the user's own name or email. The same rules are shown
live in the sign-up form (frontend/src/lib/passwordRules.js) so users see them as
they type; the server is the one that enforces them.
"""

import re

MIN_LENGTH = 10
MAX_LENGTH = 128

# Words people commonly build passwords from. A password whose letters, with digits
# and symbols removed, are exactly one of these is rejected ("Password@123" -> "password").
COMMON_WORDS = {
    "password", "passw", "pass", "qwerty", "qwertyuiop", "asdf", "asdfgh", "zxcvbn", "abc", "abcd",
    "admin", "administrator", "welcome", "letmein", "login", "user", "test", "guest", "master",
    "iloveyou", "love", "monkey", "dragon", "sunshine", "princess", "football", "cricket",
    "baseball", "shadow", "superman", "batman", "trustno", "hello", "secret", "freedom",
    "pakistan", "karachi", "lahore", "islamabad", "allah", "bismillah", "mashallah",
    "pulse", "catering", "caterers", "events", "event", "wedding", "company", "demo", "changeme",
}

_SEQUENCES = ("0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm")


def _has_sequence(text: str, length: int = 4) -> bool:
    lowered = text.lower()
    for seq in _SEQUENCES:
        for i in range(len(seq) - length + 1):
            chunk = seq[i : i + length]
            if chunk in lowered or chunk[::-1] in lowered:
                return True
    return False


def password_problems(password: str, *, email: str | None = None, full_name: str | None = None) -> list[str]:
    """Return a list of reasons the password is not acceptable (empty when it is)."""
    problems: list[str] = []
    if len(password) < MIN_LENGTH:
        problems.append(f"Use at least {MIN_LENGTH} characters.")
    if len(password) > MAX_LENGTH:
        problems.append(f"Use at most {MAX_LENGTH} characters.")
    if password != password.strip():
        problems.append("Do not start or end the password with a space.")
    if not re.search(r"[a-z]", password):
        problems.append("Add a lowercase letter.")
    if not re.search(r"[A-Z]", password):
        problems.append("Add an uppercase letter.")
    if not re.search(r"\d", password):
        problems.append("Add a number.")
    if not re.search(r"[^A-Za-z0-9]", password):
        problems.append("Add a symbol such as ! @ # $ %.")
    if re.search(r"(.)\1\1\1", password.lower()):
        problems.append("Do not repeat the same character four times in a row.")
    if _has_sequence(password):
        problems.append('Avoid sequences such as "1234" or "abcd".')

    letters = re.sub(r"[^a-z]", "", password.lower())
    if letters in COMMON_WORDS:
        problems.append("This password is built from a common word. Choose something less predictable.")

    lowered = password.lower()
    personal: list[str] = []
    if email:
        personal.append(email.split("@")[0].lower())
    if full_name:
        personal.extend(part.lower() for part in full_name.split())
    if any(len(part) >= 3 and part in lowered for part in personal):
        problems.append("Do not use your name or email in the password.")
    return problems


def ensure_strong(password: str, *, email: str | None = None, full_name: str | None = None) -> str:
    """Raise ValueError with a readable message if the password breaks the policy."""
    problems = password_problems(password, email=email, full_name=full_name)
    if problems:
        raise ValueError("Password is not strong enough. " + " ".join(problems))
    return password
