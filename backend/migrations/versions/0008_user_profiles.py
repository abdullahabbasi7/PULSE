"""Profile photo and job title for each user.

Revision ID: 0008_user_profiles
Revises: 0007_platform_approval
Create Date: 2026-10-30

* users.avatar: a small square JPEG (re-encoded by the server, so it carries no
  location or camera data), stored as a data URL. At most about 60 KB.
* users.job_title: what the person does, e.g. "Head chef" or "Operations manager".
"""

from alembic import op

revision = "0008_user_profiles"
down_revision = "0007_platform_approval"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN avatar text CHECK (avatar IS NULL OR length(avatar) <= 120000)")
    op.execute("ALTER TABLE users ADD COLUMN job_title text CHECK (job_title IS NULL OR length(job_title) <= 80)")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN job_title, DROP COLUMN avatar")
