"""Synthetic training data for the inquiry reader.

Each example is a client message in English, Roman Urdu or a mix of both, labelled with
its event type and the character spans of its entities (DATE, TIME, GUESTS, VENUE, DISH).
Messages are assembled from many sentence patterns and vocabularies so the models learn
the structure of real inquiries rather than memorising fixed sentences.

Public datasets of catering inquiries in Roman Urdu do not exist, which is why the data
is generated. As a subscribing company uses PULSE, the messages its staff correct and save
become real labelled examples for retraining (see train.py).
"""

import random
from dataclasses import dataclass, field

EVENT_WORDS = {
    "wedding": ["shadi", "shaadi", "barat", "baraat", "wedding", "nikah", "nikkah", "rukhsati", "shaadi ki taqreeb",
                "wedding reception", "barat ka function", "marriage ceremony"],
    "mehndi": ["mehndi", "mehendi", "mayun", "mayoun", "dholki", "mehndi night", "mehndi ki raat", "rasm-e-hina"],
    "walima": ["walima", "valima", "walima reception", "dawat-e-walima", "walima ka khana"],
    "engagement": ["mangni", "engagement", "ring ceremony", "mangni ki rasm", "engagement party", "rishta pakka ki dawat"],
    "birthday": ["birthday", "birthday party", "salgirah", "bday party", "sweet sixteen", "pehli salgirah", "kids party"],
    "corporate": ["corporate dinner", "office party", "annual dinner", "company event", "product launch",
                  "staff lunch", "farewell party", "team dinner", "client dinner", "annual gala"],
    "conference": ["conference", "seminar", "workshop", "summit", "training session", "symposium", "expo"],
    "religious": ["milad", "mehfil-e-milad", "quran khwani", "dars", "iftar", "iftar party", "niaz", "khatam",
                  "eid milan", "aqiqah"],
    "other": ["get together", "family dinner", "gathering", "reunion", "dinner party", "anniversary", "graduation party",
              "housewarming", "bbq night"],
}

DISHES = [
    "chicken biryani", "mutton biryani", "beef biryani", "mutton qorma", "chicken qorma", "chicken karahi",
    "mutton karahi", "seekh kabab", "chicken tikka", "malai boti", "reshmi kabab", "chapli kabab", "beef pulao",
    "matar pulao", "zarda", "kheer", "firni", "gulab jamun", "gajar ka halwa", "custard", "fruit trifle", "ice cream",
    "kulfi", "naan", "roghni naan", "raita", "salad", "haleem", "nihari", "fish fry", "chicken handi", "daal makhni",
    "aloo gosht", "chana chaat", "dahi bhalle", "soft drinks", "green tea", "kashmiri chai", "BBQ", "chinese rice",
    "chicken manchurian", "pasta", "steak", "grilled chicken", "mashed potatoes", "soup", "hot and sour soup",
    "samosay", "pakoray", "sandwiches", "cake", "brownies", "coffee",
]

VENUE_NAMES = ["Royal", "Grand", "Pearl", "Crystal", "Shalimar", "Margalla", "Emerald", "Golden", "Diamond", "Silver Oak",
               "Gulmohar", "Serena", "Mehran", "Lakeview", "Riviera", "Orchid", "Jasmine", "Noor", "Taj", "Victoria"]
VENUE_KINDS = ["Marquee", "Banquet Hall", "Hall", "Lawn", "Farmhouse", "Hotel", "Club", "Convention Centre", "Garden",
               "Banquet", "Marquee and Lawn"]
AREAS = ["DHA Phase 6", "Bahria Town", "F-7", "G-11", "Gulberg", "Clifton", "Model Town", "Johar Town", "E-11",
         "Saddar", "PWD", "Bani Gala", "Satellite Town", "North Nazimabad", "Gulshan", "Wapda Town", "I-8", "Blue Area"]
HOME_VENUES = ["ghar pe", "humare ghar", "apne ghar", "my house", "our home", "ghar ki chhat pe", "home lawn",
               "dada ji ke ghar", "family home"]

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]
MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAYS_UR = {"Monday": "peer", "Tuesday": "mangal", "Wednesday": "budh", "Thursday": "jumeraat", "Friday": "jumma",
               "Saturday": "hafta", "Sunday": "itwaar"}

GREETINGS = ["", "Assalam o alaikum, ", "AoA, ", "Salam, ", "Hi, ", "Hello, ", "Dear team, ", "Good evening, ",
             "Assalamualaikum bhai, ", "Hello sir, ", "Hi there! ", "Salam ji, "]
CLOSINGS = ["", " Please share rates.", " Rate bata dein.", " Kitna kharcha ayega?", " Please send a quotation.",
            " Jaldi reply karein.", " Thanks.", " Shukriya.", " Package details bhejein.", " Call me back please.",
            " Is it available?", " Booking karni hai.", " Waiting for your reply."]
RELATIONS = ["meri behn", "mere bhai", "meri beti", "mere bete", "my sister", "my brother", "my daughter", "my son",
             "mere cousin", "my friend", "hamari family", "our company", "meri bhanji", "mere bhatije"]


@dataclass
class Example:
    text: str
    event_type: str
    spans: list[tuple[int, int, str]] = field(default_factory=list)


class _Builder:
    """Concatenates text pieces and records where each entity lands."""

    def __init__(self) -> None:
        self.parts: list[str] = []
        self.length = 0
        self.spans: list[tuple[int, int, str]] = []

    def add(self, text: str, label: str | None = None) -> None:
        if label and text:
            self.spans.append((self.length, self.length + len(text), label))
        self.parts.append(text)
        self.length += len(text)

    def text(self) -> str:
        return "".join(self.parts)


def _date(rng: random.Random) -> str:
    day = rng.randint(1, 28)
    month = rng.randrange(12)
    year = rng.choice([2026, 2027])
    suffix = {1: "st", 2: "nd", 3: "rd", 21: "st", 22: "nd", 23: "rd"}.get(day, "th")
    weekday = rng.choice(WEEKDAYS)
    options = [
        f"{day} {MONTHS[month]}", f"{day} {MONTH_ABBR[month]}", f"{MONTHS[month]} {day}", f"{day}{suffix} {MONTHS[month]}",
        f"{day}{suffix} of {MONTHS[month]}", f"{day}/{month + 1}/{year}", f"{day:02d}-{month + 1:02d}-{year}",
        f"{day}/{month + 1}", f"{day} {MONTHS[month]} {year}", f"{MONTH_ABBR[month]} {day}, {year}",
        "kal", "parson", "tomorrow", "day after tomorrow", f"next {weekday}", f"this {weekday}", f"agle {weekday}",
        f"is {weekday}", f"agle {WEEKDAYS_UR[weekday]}", f"{day} tareekh", f"{day} tarikh", "next week", "agle hafte",
        f"{day} {MONTHS[month].lower()}",
    ]
    return rng.choice(options)


def _time(rng: random.Random) -> str:
    hour = rng.randint(1, 11)
    minute = rng.choice(["", ":30", ":00", ":15"])
    return rng.choice([
        f"{hour}{minute} pm", f"{hour}{minute}pm", f"{hour}{minute} am", f"raat {hour} baje", f"shaam {hour} baje",
        f"dopehar {rng.choice([12, 1, 2, 3])} baje", f"subah {hour} baje",
        f"{hour} baje", f"evening {hour}{minute}", f"{hour}{minute} PM", f"{hour + 12}:00", f"around {hour} pm",
    ])


def _guests(rng: random.Random) -> tuple[str, str]:
    """Returns (number text to tag, word that follows it)."""
    n = rng.choice([rng.randint(2, 50) * 10, rng.randint(1, 30) * 50, rng.randint(1, 10) * 100, rng.randint(25, 120)])
    unit = rng.choice(["guests", "people", "log", "afraad", "bande", "persons", "mehman", "pax", "heads", "logon"])
    style = rng.random()
    if style < 0.12 and n % 100 == 0 and n <= 2000:
        return f"{n // 100} sau", unit
    if style < 0.18 and n % 1000 == 0:
        return f"{n // 1000} hazar", unit
    if style < 0.24 and n >= 1000 and n % 1000 == 0:
        return f"{n // 1000}k", unit
    return f"{n}", unit


def _venue(rng: random.Random) -> str:
    style = rng.random()
    if style < 0.18:
        return rng.choice(HOME_VENUES)
    name = f"{rng.choice(VENUE_NAMES)} {rng.choice(VENUE_KINDS)}"
    if style < 0.55:
        return f"{name}, {rng.choice(AREAS)}"
    if style < 0.7:
        return f"{rng.choice(AREAS)} {rng.choice(['farmhouse', 'community hall', 'club', 'lawn', 'park'])}"
    return name


def _menu(rng: random.Random, b: _Builder) -> None:
    dishes = rng.sample(DISHES, rng.randint(1, 5))
    joiners = [", ", ", ", " aur ", " and ", ", ", " + "]
    for i, dish in enumerate(dishes):
        if i:
            b.add(rng.choice(joiners) if i < len(dishes) - 1 else rng.choice([" aur ", " and ", ", "]))
        b.add(dish, "DISH")


def _event_phrase(rng: random.Random, event_type: str) -> str:
    return rng.choice(EVENT_WORDS[event_type])


# Each pattern is a list of pieces: plain strings, or slot names in braces.
PATTERNS = [
    "{greet}we need catering for {event} on {date} at {venue} for {guests} {unit}. Menu: {menu}.{close}",
    "{greet}{rel} ki {event} hai {date} ko, {guests} {unit} honge, {venue} mein. Menu mein {menu} chahiye.{close}",
    "{greet}{date} ko {event} hai {venue}. Takreeban {guests} {unit}. {menu} rakhna hai.{close}",
    "{greet}Planning a {event} for around {guests} {unit} on {date}, venue is {venue}. We would like {menu}.{close}",
    "{greet}{event} {date} {time} {venue} {guests} {unit} menu {menu}{close}",
    "{greet}Bhai {date} ko {rel} ka {event} hai, around {guests} {unit}, venue {venue}, {menu} chahiye.{close}",
    "{greet}Can you arrange {event} catering? Date: {date}, time: {time}, guests: {guests}, place: {venue}. Food: {menu}.{close}",
    "{greet}{guests} {unit} ka {event} hai {venue} mein, {date} {time}. Khane mein {menu}.{close}",
    "{greet}I want to book you for {rel}'s {event} on {date}. Expected {guests} {unit} at {venue}. Menu {menu}.{close}",
    "{greet}{event} ka function {date} ko {time} hai. Jagah: {venue}. Mehman {guests}. Menu: {menu}.{close}",
    "{greet}Do you have availability on {date}? It's a {event} at {venue} with {guests} {unit}.{close}",
    "{greet}{event}: {date}, {venue}, {guests} {unit}. {menu} chahiye aur service bhi.{close}",
    "{greet}hamein {date} {time} {event} ke liye khana chahiye, {guests} {unit}, {venue}.{close}",
    "{greet}Need quote for {event}, {guests} {unit}, {date} at {venue}. Items: {menu}.{close}",
    "{greet}{rel} ki {event} {date} ko hai. {venue} book hai. {guests} {unit} ka intezam chahiye with {menu}.{close}",
    "{greet}{event} on {date} {time}. {guests} {unit}. {menu}. Venue {venue}.{close}",
]


def make_example(rng: random.Random) -> Example:
    event_type = rng.choice(list(EVENT_WORDS))
    pattern = rng.choice(PATTERNS)
    b = _Builder()
    guests_text, unit = _guests(rng)
    i = 0
    while i < len(pattern):
        if pattern[i] == "{":
            j = pattern.index("}", i)
            slot = pattern[i + 1 : j]
            if slot == "greet":
                b.add(rng.choice(GREETINGS))
            elif slot == "close":
                b.add(rng.choice(CLOSINGS))
            elif slot == "event":
                b.add(_event_phrase(rng, event_type))
            elif slot == "date":
                b.add(_date(rng), "DATE")
            elif slot == "time":
                b.add(_time(rng), "TIME")
            elif slot == "guests":
                b.add(guests_text, "GUESTS")
            elif slot == "unit":
                b.add(unit)
            elif slot == "venue":
                b.add(_venue(rng), "VENUE")
            elif slot == "menu":
                _menu(rng, b)
            elif slot == "rel":
                b.add(rng.choice(RELATIONS))
            i = j + 1
        else:
            j = pattern.find("{", i)
            j = len(pattern) if j == -1 else j
            b.add(pattern[i:j])
            i = j
    text = b.text()
    # Real messages vary in case; vary it without moving any spans.
    roll = rng.random()
    if roll < 0.15:
        text = text.lower()
    elif roll < 0.2:
        text = text.upper()
    return Example(text=text, event_type=event_type, spans=b.spans)


def generate(n: int, seed: int = 7) -> list[Example]:
    rng = random.Random(seed)
    return [make_example(rng) for _ in range(n)]
