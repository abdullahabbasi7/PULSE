"""Create a PULSE platform admin: the person who approves new companies.

    python -m scripts.create_platform_admin --email you@example.com --name "Your Name"

You are asked for the password (it is not shown or saved in your shell history). Running it
again for the same email resets that admin's password. In Docker:

    docker compose exec backend python -m scripts.create_platform_admin --email ... --name ...
"""

import argparse
import getpass
import sys

from app.core.platform_admin import create_admin


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Repeat password: "):
        sys.exit("The passwords do not match.")
    try:
        _, created = create_admin(args.email, args.name, password)
    except ValueError as error:
        sys.exit(f"Password is not strong enough. {error}")
    print(("Created" if created else "Updated") + f" platform admin {args.email}. Sign in at /platform.")


if __name__ == "__main__":
    main()
