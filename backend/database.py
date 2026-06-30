import os
import sqlite3
import tempfile
from datetime import date, datetime
from decimal import Decimal

DEFAULT_DATABASE_FILE = (
    os.path.join(tempfile.gettempdir(), "school_sessions.db")
    if os.getenv("VERCEL")
    else "school_sessions.db"
)
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_FILE)
IS_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))


def _json_safe(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _row_to_dict(row):
    if not row:
        return None
    if isinstance(row, dict):
        return {key: _json_safe(value) for key, value in row.items()}
    return {key: _json_safe(row[key]) for key in row.keys()}


def _connect_sqlite():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    return conn


def _connect_postgres():
    from psycopg import connect
    from psycopg.rows import dict_row

    return connect(DATABASE_URL, row_factory=dict_row)


def _connect():
    return _connect_postgres() if IS_POSTGRES else _connect_sqlite()


def init_db():
    """Initializes the database schema if it doesn't already exist."""
    conn = _connect()
    cursor = conn.cursor()

    if IS_POSTGRES:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS school_sessions (
                id BIGSERIAL PRIMARY KEY,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                processed_count INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS processed_images (
                id BIGSERIAL PRIMARY KEY,
                session_id BIGINT NOT NULL REFERENCES school_sessions(id) ON DELETE CASCADE,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                original_name TEXT NOT NULL,
                processed_name TEXT NOT NULL,
                url TEXT NOT NULL,
                size_kb NUMERIC(10, 2) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    else:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS school_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_count INTEGER DEFAULT 0
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS processed_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                original_name TEXT NOT NULL,
                processed_name TEXT NOT NULL,
                url TEXT NOT NULL,
                size_kb REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES school_sessions(id)
            )
            """
        )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_processed_images_created_at
        ON processed_images(created_at)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_processed_images_emis_code
        ON processed_images(emis_code)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_processed_images_session_id
        ON processed_images(session_id)
        """
    )
    conn.commit()
    conn.close()


def create_session(emis_code: str, phone_number: str) -> dict:
    """Creates a new session and returns it."""
    conn = _connect()
    cursor = conn.cursor()

    if IS_POSTGRES:
        cursor.execute(
            """
            INSERT INTO school_sessions (emis_code, phone_number)
            VALUES (%s, %s)
            RETURNING id, emis_code, phone_number, created_at, processed_count
            """,
            (emis_code, phone_number),
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            "INSERT INTO school_sessions (emis_code, phone_number) VALUES (?, ?)",
            (emis_code, phone_number),
        )
        session_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, emis_code, phone_number, created_at, processed_count
            FROM school_sessions
            WHERE id = ?
            """,
            (session_id,),
        )
        row = cursor.fetchone()

    conn.commit()
    conn.close()
    return _row_to_dict(row)


def update_processed_count(session_id: int, add_count: int) -> int:
    """Updates the processed count for a given session ID."""
    conn = _connect()
    cursor = conn.cursor()

    if IS_POSTGRES:
        cursor.execute(
            """
            UPDATE school_sessions
            SET processed_count = processed_count + %s
            WHERE id = %s
            RETURNING processed_count
            """,
            (add_count, session_id),
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            "UPDATE school_sessions SET processed_count = processed_count + ? WHERE id = ?",
            (add_count, session_id),
        )
        cursor.execute("SELECT processed_count FROM school_sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()

    conn.commit()
    conn.close()
    return _row_to_dict(row)["processed_count"] if row else 0


def get_session(session_id: int) -> dict:
    """Retrieves session details by ID."""
    conn = _connect()
    cursor = conn.cursor()

    if IS_POSTGRES:
        cursor.execute(
            """
            SELECT id, emis_code, phone_number, created_at, processed_count
            FROM school_sessions
            WHERE id = %s
            """,
            (session_id,),
        )
    else:
        cursor.execute(
            """
            SELECT id, emis_code, phone_number, created_at, processed_count
            FROM school_sessions
            WHERE id = ?
            """,
            (session_id,),
        )

    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def record_processed_images(session: dict, processed_images: list[dict]) -> None:
    """Stores one row per processed image for reporting/history."""
    if not processed_images:
        return

    conn = _connect()
    cursor = conn.cursor()
    sql = (
        """
        INSERT INTO processed_images (
            session_id, emis_code, phone_number, original_name,
            processed_name, url, size_kb
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        if IS_POSTGRES
        else
        """
        INSERT INTO processed_images (
            session_id, emis_code, phone_number, original_name,
            processed_name, url, size_kb
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
    )
    cursor.executemany(
        sql,
        [
            (
                session["id"],
                session["emis_code"],
                session["phone_number"],
                image["original_name"],
                image["processed_name"],
                image["url"],
                image["size_kb"],
            )
            for image in processed_images
        ],
    )
    conn.commit()
    conn.close()


def get_activity_summary(limit: int = 8) -> dict:
    """Returns live landing-page stats without exposing phone numbers."""
    conn = _connect()
    cursor = conn.cursor()
    limit_placeholder = "%s" if IS_POSTGRES else "?"

    cursor.execute("SELECT COUNT(*) AS total_sessions FROM school_sessions")
    total_sessions = _row_to_dict(cursor.fetchone())["total_sessions"]

    cursor.execute("SELECT COUNT(DISTINCT emis_code) AS total_schools FROM school_sessions")
    total_schools = _row_to_dict(cursor.fetchone())["total_schools"]

    cursor.execute("SELECT COALESCE(SUM(processed_count), 0) AS total_images FROM school_sessions")
    total_images = _row_to_dict(cursor.fetchone())["total_images"]

    cursor.execute(
        f"""
        SELECT emis_code, original_name, size_kb, created_at
        FROM processed_images
        ORDER BY created_at DESC, id DESC
        LIMIT {limit_placeholder}
        """,
        (limit,),
    )
    recent_images = [_row_to_dict(row) for row in cursor.fetchall()]

    cursor.execute(
        f"""
        SELECT emis_code, processed_count, created_at
        FROM school_sessions
        ORDER BY created_at DESC, id DESC
        LIMIT {limit_placeholder}
        """,
        (limit,),
    )
    recent_sessions = [_row_to_dict(row) for row in cursor.fetchall()]

    conn.close()
    return {
        "total_sessions": int(total_sessions or 0),
        "total_schools": int(total_schools or 0),
        "total_images": int(total_images or 0),
        "recent_images": recent_images,
        "recent_sessions": recent_sessions,
    }
