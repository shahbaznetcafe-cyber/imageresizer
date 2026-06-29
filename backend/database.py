import os
import sqlite3
from datetime import datetime

DATABASE_FILE = os.getenv("DATABASE_URL", "school_sessions.db")


def _connect():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database schema if it doesn't already exist."""
    conn = _connect()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS school_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emis_code TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_count INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
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
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_processed_images_created_at
        ON processed_images(created_at)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_processed_images_emis_code
        ON processed_images(emis_code)
    """)
    conn.commit()
    conn.close()

def create_session(emis_code: str, phone_number: str) -> dict:
    """Creates a new session and returns it."""
    conn = _connect()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO school_sessions (emis_code, phone_number) VALUES (?, ?)",
        (emis_code, phone_number)
    )
    conn.commit()
    session_id = cursor.lastrowid
    
    # Retrieve the newly created session
    cursor.execute(
        "SELECT id, emis_code, phone_number, created_at, processed_count FROM school_sessions WHERE id = ?",
        (session_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    return {
        "id": row["id"],
        "emis_code": row["emis_code"],
        "phone_number": row["phone_number"],
        "created_at": row["created_at"],
        "processed_count": row["processed_count"]
    }

def update_processed_count(session_id: int, add_count: int) -> int:
    """Updates the processed count for a given session ID."""
    conn = _connect()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE school_sessions SET processed_count = processed_count + ? WHERE id = ?",
        (add_count, session_id)
    )
    conn.commit()
    
    # Retrieve the new count
    cursor.execute("SELECT processed_count FROM school_sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    return row["processed_count"] if row else 0

def get_session(session_id: int) -> dict:
    """Retrieves session details by ID."""
    conn = _connect()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, emis_code, phone_number, created_at, processed_count FROM school_sessions WHERE id = ?",
        (session_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "id": row["id"],
            "emis_code": row["emis_code"],
            "phone_number": row["phone_number"],
            "created_at": row["created_at"],
            "processed_count": row["processed_count"]
        }
    return None


def record_processed_images(session: dict, processed_images: list[dict]) -> None:
    """Stores one row per processed image for reporting/history."""
    if not processed_images:
        return

    conn = _connect()
    cursor = conn.cursor()
    cursor.executemany(
        """
        INSERT INTO processed_images (
            session_id, emis_code, phone_number, original_name,
            processed_name, url, size_kb
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
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

    cursor.execute("SELECT COUNT(*) AS total_sessions FROM school_sessions")
    total_sessions = cursor.fetchone()["total_sessions"]

    cursor.execute("SELECT COUNT(DISTINCT emis_code) AS total_schools FROM school_sessions")
    total_schools = cursor.fetchone()["total_schools"]

    cursor.execute("SELECT COALESCE(SUM(processed_count), 0) AS total_images FROM school_sessions")
    total_images = cursor.fetchone()["total_images"]

    cursor.execute(
        """
        SELECT emis_code, original_name, size_kb, created_at
        FROM processed_images
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        """,
        (limit,),
    )
    recent_images = [
        {
            "emis_code": row["emis_code"],
            "original_name": row["original_name"],
            "size_kb": row["size_kb"],
            "created_at": row["created_at"],
        }
        for row in cursor.fetchall()
    ]

    cursor.execute(
        """
        SELECT emis_code, processed_count, created_at
        FROM school_sessions
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        """,
        (limit,),
    )
    recent_sessions = [
        {
            "emis_code": row["emis_code"],
            "processed_count": row["processed_count"],
            "created_at": row["created_at"],
        }
        for row in cursor.fetchall()
    ]

    conn.close()
    return {
        "total_sessions": total_sessions,
        "total_schools": total_schools,
        "total_images": total_images,
        "recent_images": recent_images,
        "recent_sessions": recent_sessions,
    }
