import os
import sqlite3
from datetime import datetime

DATABASE_FILE = os.getenv("DATABASE_URL", "school_sessions.db")

def init_db():
    """Initializes the database schema if it doesn't already exist."""
    conn = sqlite3.connect(DATABASE_FILE)
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
    conn.commit()
    conn.close()

def create_session(emis_code: str, phone_number: str) -> dict:
    """Creates a new session and returns it."""
    conn = sqlite3.connect(DATABASE_FILE)
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
        "id": row[0],
        "emis_code": row[1],
        "phone_number": row[2],
        "created_at": row[3],
        "processed_count": row[4]
    }

def update_processed_count(session_id: int, add_count: int) -> int:
    """Updates the processed count for a given session ID."""
    conn = sqlite3.connect(DATABASE_FILE)
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
    return row[0] if row else 0

def get_session(session_id: int) -> dict:
    """Retrieves session details by ID."""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, emis_code, phone_number, created_at, processed_count FROM school_sessions WHERE id = ?",
        (session_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "id": row[0],
            "emis_code": row[1],
            "phone_number": row[2],
            "created_at": row[3],
            "processed_count": row[4]
        }
    return None
