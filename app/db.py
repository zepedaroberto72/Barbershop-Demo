from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import BASE_DIR, DATABASE_URL

if DATABASE_URL.startswith("sqlite"):
    # Ensure the DB directory exists (local ./data or a mounted /data volume).
    raw_path = DATABASE_URL.removeprefix("sqlite:///")
    if raw_path:
        Path(raw_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
    else:
        (BASE_DIR / "data").mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Postgres (or other) when DATABASE_URL is set for cloud deploy
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def migrate_schema() -> None:
    """Lightweight additive migrations for existing local SQLite DBs."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    with engine.begin() as conn:
        appt_rows = conn.execute(text("PRAGMA table_info(appointments)")).fetchall()
        if appt_rows:
            appt_cols = {row[1] for row in appt_rows}
            if "job_type" not in appt_cols:
                conn.execute(
                    text(
                        "ALTER TABLE appointments ADD COLUMN job_type VARCHAR(40) "
                        "NOT NULL DEFAULT 'Repair'"
                    )
                )

        cust_rows = conn.execute(text("PRAGMA table_info(customers)")).fetchall()
        if cust_rows:
            cust_cols = {row[1] for row in cust_rows}
            if "email" not in cust_cols:
                conn.execute(text("ALTER TABLE customers ADD COLUMN email VARCHAR(255)"))

        tech_rows = conn.execute(text("PRAGMA table_info(technicians)")).fetchall()
        if tech_rows:
            tech_cols = {row[1] for row in tech_rows}
            if "work_start" not in tech_cols:
                conn.execute(
                    text(
                        "ALTER TABLE technicians ADD COLUMN work_start VARCHAR(5) "
                        "NOT NULL DEFAULT '08:00'"
                    )
                )
            if "work_end" not in tech_cols:
                conn.execute(
                    text(
                        "ALTER TABLE technicians ADD COLUMN work_end VARCHAR(5) "
                        "NOT NULL DEFAULT '18:00'"
                    )
                )
            if "work_days" not in tech_cols:
                conn.execute(
                    text(
                        "ALTER TABLE technicians ADD COLUMN work_days VARCHAR(32) "
                        "NOT NULL DEFAULT '1,2,3,4,5'"
                    )
                )
            if "sort_order" not in tech_cols:
                conn.execute(
                    text(
                        "ALTER TABLE technicians ADD COLUMN sort_order INTEGER "
                        "NOT NULL DEFAULT 0"
                    )
                )
                # Preserve current board order (name) for existing rows.
                rows = conn.execute(
                    text(
                        "SELECT id FROM technicians "
                        "ORDER BY active DESC, name COLLATE NOCASE ASC, id ASC"
                    )
                ).fetchall()
                for i, row in enumerate(rows):
                    conn.execute(
                        text("UPDATE technicians SET sort_order = :ord WHERE id = :id"),
                        {"ord": i, "id": row[0]},
                    )

        block_rows = conn.execute(text("PRAGMA table_info(tech_blocks)")).fetchall()
        if block_rows:
            block_cols = {row[1] for row in block_rows}
            if "start_time" not in block_cols:
                conn.execute(text("ALTER TABLE tech_blocks ADD COLUMN start_time VARCHAR(5)"))
            if "end_time" not in block_cols:
                conn.execute(text("ALTER TABLE tech_blocks ADD COLUMN end_time VARCHAR(5)"))

        user_rows = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        if user_rows:
            user_cols = {row[1] for row in user_rows}
            if "phone" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(40)"))
            if "must_change_password" not in user_cols:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN must_change_password INTEGER "
                        "NOT NULL DEFAULT 0"
                    )
                )
            if "reset_token_hash" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(128)"))
            if "reset_token_expires" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"))
            if "technician_id" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN technician_id INTEGER"))
                # Unique index so each technician links to at most one login.
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_technician_id "
                        "ON users (technician_id)"
                    )
                )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
