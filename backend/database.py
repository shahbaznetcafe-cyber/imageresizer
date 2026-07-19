import os
import sqlite3
import tempfile
from datetime import date, datetime
from decimal import Decimal

LEGACY_FREE_PHOTO_LIMIT = 50
DEFAULT_PHOTO_LIMIT = int(os.getenv("DEFAULT_PHOTO_LIMIT", "35"))
DEFAULT_LIMIT_REQUEST_EXTRA = 150
DISABLE_USAGE_LIMITS = os.getenv("DISABLE_USAGE_LIMITS", "").lower() in {
    "1",
    "true",
    "yes",
    "on",
}
UNLIMITED_PHOTO_LIMIT = 999999999

DEFAULT_DATABASE_FILE = (
    os.path.join(tempfile.gettempdir(), "school_sessions.db")
    if os.getenv("VERCEL")
    else "school_sessions.db"
)
DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("POSTGRES_URL")
    or os.getenv("SUPABASE_DB_URL")
    or DEFAULT_DATABASE_FILE
)
IS_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))
DATABASE_BACKEND = "supabase_postgres" if IS_POSTGRES else "sqlite"

VALID_SCHOOL_IDENTITY_WHERE = """
COALESCE(NULLIF(TRIM(emis_code), ''), '') <> ''
AND REPLACE(TRIM(emis_code), '0', '') <> ''
AND COALESCE(NULLIF(TRIM(phone_number), ''), '') <> ''
AND REPLACE(TRIM(phone_number), '0', '') <> ''
AND COALESCE(NULLIF(TRIM(school_name), ''), '') <> ''
AND REPLACE(TRIM(school_name), '0', '') <> ''
"""


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

    return connect(DATABASE_URL, row_factory=dict_row, prepare_threshold=None)


def _connect():
    return _connect_postgres() if IS_POSTGRES else _connect_sqlite()


def _column_exists(cursor, table_name: str, column_name: str) -> bool:
    if IS_POSTGRES:
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = %s
            """,
            (table_name, column_name),
        )
        return cursor.fetchone() is not None

    cursor.execute(f"PRAGMA table_info({table_name})")
    return any(row["name"] == column_name for row in cursor.fetchall())


def _ensure_column(cursor, table_name: str, column_name: str, column_type: str) -> None:
    if _column_exists(cursor, table_name, column_name):
        return

    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")


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
                school_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                ip_address TEXT,
                device_limit_id BIGINT,
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
                school_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                ip_address TEXT,
                device_limit_id BIGINT,
                original_name TEXT NOT NULL,
                processed_name TEXT NOT NULL,
                url TEXT NOT NULL,
                size_kb NUMERIC(10, 2) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS feedback_entries (
                id BIGSERIAL PRIMARY KEY,
                session_id BIGINT REFERENCES school_sessions(id) ON DELETE SET NULL,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                school_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                rating INTEGER NOT NULL DEFAULT 0,
                category TEXT,
                message TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS device_limits (
                id BIGSERIAL PRIMARY KEY,
                machine_id TEXT,
                ip_address TEXT,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                school_name TEXT,
                machine_type TEXT,
                photo_limit INTEGER NOT NULL DEFAULT {DEFAULT_PHOTO_LIMIT},
                photos_used INTEGER NOT NULL DEFAULT 0,
                blocked BOOLEAN NOT NULL DEFAULT FALSE,
                block_reason TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS limit_requests (
                id BIGSERIAL PRIMARY KEY,
                session_id BIGINT REFERENCES school_sessions(id) ON DELETE SET NULL,
                device_limit_id BIGINT REFERENCES device_limits(id) ON DELETE SET NULL,
                machine_id TEXT,
                ip_address TEXT,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                school_name TEXT,
                requested_extra INTEGER NOT NULL DEFAULT 150,
                payment_sender_name TEXT,
                payment_sender_phone TEXT,
                payment_transaction_id TEXT,
                message TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                resolved_at TIMESTAMPTZ
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS school_error_events (
                id BIGSERIAL PRIMARY KEY,
                session_id BIGINT REFERENCES school_sessions(id) ON DELETE SET NULL,
                device_limit_id BIGINT REFERENCES device_limits(id) ON DELETE SET NULL,
                emis_code TEXT,
                phone_number TEXT,
                school_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                ip_address TEXT,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'warning',
                message TEXT NOT NULL,
                context TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS problem_reports (
                id BIGSERIAL PRIMARY KEY,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                school_name TEXT NOT NULL,
                reporter_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                ip_address TEXT,
                problem_message TEXT,
                screenshot_name TEXT,
                screenshot_type TEXT,
                screenshot_data_url TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS app_migrations (
                migration_key TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
                school_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                ip_address TEXT,
                device_limit_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_count INTEGER DEFAULT 0
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS feedback_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                school_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                rating INTEGER DEFAULT 0,
                category TEXT,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES school_sessions(id) ON DELETE SET NULL
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
                school_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                ip_address TEXT,
                device_limit_id INTEGER,
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
            f"""
            CREATE TABLE IF NOT EXISTS device_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id TEXT,
                ip_address TEXT,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                school_name TEXT,
                machine_type TEXT,
                photo_limit INTEGER DEFAULT {DEFAULT_PHOTO_LIMIT},
                photos_used INTEGER DEFAULT 0,
                blocked INTEGER DEFAULT 0,
                block_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS limit_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                device_limit_id INTEGER,
                machine_id TEXT,
                ip_address TEXT,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                school_name TEXT,
                requested_extra INTEGER DEFAULT 150,
                payment_sender_name TEXT,
                payment_sender_phone TEXT,
                payment_transaction_id TEXT,
                message TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES school_sessions(id) ON DELETE SET NULL,
                FOREIGN KEY (device_limit_id) REFERENCES device_limits(id) ON DELETE SET NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS school_error_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                device_limit_id INTEGER,
                emis_code TEXT,
                phone_number TEXT,
                school_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                ip_address TEXT,
                event_type TEXT NOT NULL,
                severity TEXT DEFAULT 'warning',
                message TEXT NOT NULL,
                context TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES school_sessions(id) ON DELETE SET NULL,
                FOREIGN KEY (device_limit_id) REFERENCES device_limits(id) ON DELETE SET NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS problem_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emis_code TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                school_name TEXT NOT NULL,
                reporter_name TEXT,
                machine_id TEXT,
                machine_type TEXT,
                ip_address TEXT,
                problem_message TEXT,
                screenshot_name TEXT,
                screenshot_type TEXT,
                screenshot_data_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS app_migrations (
                migration_key TEXT PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

    for table_name in ("school_sessions", "processed_images"):
        _ensure_column(cursor, table_name, "school_name", "TEXT")
        _ensure_column(cursor, table_name, "machine_id", "TEXT")
        _ensure_column(cursor, table_name, "machine_type", "TEXT")
        _ensure_column(cursor, table_name, "ip_address", "TEXT")
        _ensure_column(cursor, table_name, "device_limit_id", "BIGINT" if IS_POSTGRES else "INTEGER")

    for column_name in ("payment_sender_name", "payment_sender_phone", "payment_transaction_id"):
        _ensure_column(cursor, "limit_requests", column_name, "TEXT")

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
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_school_sessions_machine_id
        ON school_sessions(machine_id)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_feedback_entries_created_at
        ON feedback_entries(created_at)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_feedback_entries_emis_code
        ON feedback_entries(emis_code)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_feedback_entries_session_id
        ON feedback_entries(session_id)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_device_limits_machine_id
        ON device_limits(machine_id)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_device_limits_ip_address
        ON device_limits(ip_address)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_limit_requests_status
        ON limit_requests(status)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_school_error_events_created_at
        ON school_error_events(created_at)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_school_error_events_emis_code
        ON school_error_events(emis_code)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_school_error_events_event_type
        ON school_error_events(event_type)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_problem_reports_created_at
        ON problem_reports(created_at)
        """
    )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_problem_reports_emis_code
        ON problem_reports(emis_code)
        """
    )
    _bootstrap_device_limits(cursor)
    _normalize_default_photo_limits(cursor)
    _reject_placeholder_limit_requests(cursor)
    conn.commit()
    conn.close()


def _normalize_default_photo_limits(cursor) -> None:
    """Moves existing free default quota rows from the old limit to the current limit."""
    if DEFAULT_PHOTO_LIMIT == LEGACY_FREE_PHOTO_LIMIT:
        return

    migration_key = f"default_photo_limit_{DEFAULT_PHOTO_LIMIT}_from_{LEGACY_FREE_PHOTO_LIMIT}"
    if IS_POSTGRES:
        cursor.execute("SELECT 1 FROM app_migrations WHERE migration_key = %s", (migration_key,))
    else:
        cursor.execute("SELECT 1 FROM app_migrations WHERE migration_key = ?", (migration_key,))
    if cursor.fetchone():
        return

    if IS_POSTGRES:
        cursor.execute(
            """
            UPDATE device_limits
            SET photo_limit = %s,
                updated_at = NOW()
            WHERE photo_limit = %s
            """,
            (DEFAULT_PHOTO_LIMIT, LEGACY_FREE_PHOTO_LIMIT),
        )
        cursor.execute(
            "INSERT INTO app_migrations (migration_key) VALUES (%s) ON CONFLICT (migration_key) DO NOTHING",
            (migration_key,),
        )
    else:
        cursor.execute(
            """
            UPDATE device_limits
            SET photo_limit = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE photo_limit = ?
            """,
            (DEFAULT_PHOTO_LIMIT, LEGACY_FREE_PHOTO_LIMIT),
        )
        cursor.execute(
            "INSERT OR IGNORE INTO app_migrations (migration_key) VALUES (?)",
            (migration_key,),
        )


def _bootstrap_device_limits(cursor) -> None:
    """Creates quota rows for historical machines so old heavy users are limited."""
    if IS_POSTGRES:
        cursor.execute(
            """
            WITH latest_machine AS (
                SELECT DISTINCT ON (machine_id)
                    machine_id,
                    NULLIF(ip_address, '') AS ip_address,
                    emis_code,
                    phone_number,
                    NULLIF(school_name, '') AS school_name,
                    NULLIF(machine_type, '') AS machine_type
                FROM school_sessions
                WHERE COALESCE(machine_id, '') <> ''
                ORDER BY machine_id, created_at DESC, id DESC
            )
            INSERT INTO device_limits (
                machine_id, ip_address, emis_code, phone_number, school_name,
                machine_type, photo_limit, photos_used
            )
            SELECT
                latest_machine.machine_id,
                latest_machine.ip_address,
                latest_machine.emis_code,
                latest_machine.phone_number,
                latest_machine.school_name,
                latest_machine.machine_type,
                %s AS photo_limit,
                COALESCE((
                    SELECT COUNT(*)
                    FROM processed_images pi
                    WHERE NULLIF(pi.machine_id, '') = latest_machine.machine_id
                       OR (
                            latest_machine.ip_address IS NOT NULL
                            AND COALESCE(pi.machine_id, '') = ''
                            AND NULLIF(pi.ip_address, '') = latest_machine.ip_address
                          )
                ), 0) AS photos_used
            FROM latest_machine
            WHERE NOT EXISTS (
                SELECT 1 FROM device_limits d WHERE d.machine_id = latest_machine.machine_id
              )
            """,
            (DEFAULT_PHOTO_LIMIT,),
        )
        return

    cursor.execute(
        """
        WITH ranked AS (
            SELECT
                machine_id,
                NULLIF(ip_address, '') AS ip_address,
                emis_code,
                phone_number,
                NULLIF(school_name, '') AS school_name,
                NULLIF(machine_type, '') AS machine_type,
                ROW_NUMBER() OVER (
                    PARTITION BY machine_id
                    ORDER BY created_at DESC, id DESC
                ) AS row_number
            FROM school_sessions
            WHERE COALESCE(machine_id, '') <> ''
        )
        SELECT
            ranked.machine_id,
            ranked.ip_address,
            ranked.emis_code,
            ranked.phone_number,
            ranked.school_name,
            ranked.machine_type,
            (
                SELECT COUNT(*)
                FROM processed_images pi
                WHERE NULLIF(pi.machine_id, '') = ranked.machine_id
                   OR (
                        ranked.ip_address IS NOT NULL
                        AND COALESCE(pi.machine_id, '') = ''
                        AND NULLIF(pi.ip_address, '') = ranked.ip_address
                      )
            ) AS photos_used
        FROM ranked
        WHERE ranked.row_number = 1
        """
    )
    for row in cursor.fetchall():
        row_data = _row_to_dict(row)
        cursor.execute(
            "SELECT 1 FROM device_limits WHERE machine_id = ? LIMIT 1",
            (row_data["machine_id"],),
        )
        if cursor.fetchone():
            continue
        cursor.execute(
            """
            INSERT INTO device_limits (
                machine_id, ip_address, emis_code, phone_number, school_name,
                machine_type, photo_limit, photos_used
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row_data["machine_id"],
                row_data.get("ip_address") or "",
                row_data["emis_code"],
                row_data["phone_number"],
                row_data.get("school_name") or "",
                row_data.get("machine_type") or "",
                DEFAULT_PHOTO_LIMIT,
                int(row_data.get("photos_used") or 0),
            ),
        )


def _reject_placeholder_limit_requests(cursor) -> None:
    """Keeps invalid placeholder requests out of the pending admin queue."""
    timestamp_sql = "NOW()" if IS_POSTGRES else "CURRENT_TIMESTAMP"
    cursor.execute(
        f"""
        UPDATE limit_requests
        SET status = 'rejected',
            resolved_at = {timestamp_sql},
            message = CASE
                WHEN COALESCE(message, '') = '' THEN 'Auto rejected: missing real EMIS, phone, or school name.'
                ELSE message || ' | Auto rejected: missing real EMIS, phone, or school name.'
            END
        WHERE status = 'pending'
          AND NOT ({VALID_SCHOOL_IDENTITY_WHERE})
        """
    )


def _quota_payload(device: dict | None) -> dict:
    if DISABLE_USAGE_LIMITS:
        photos_used = int(device.get("photos_used") or 0) if device else 0
        return {
            "device_limit_id": device.get("id") if device else None,
            "photo_limit": UNLIMITED_PHOTO_LIMIT,
            "photos_used": photos_used,
            "remaining": UNLIMITED_PHOTO_LIMIT,
            "blocked": False,
            "block_reason": "",
            "unlimited": True,
        }

    if not device:
        return {
            "device_limit_id": None,
            "photo_limit": DEFAULT_PHOTO_LIMIT,
            "photos_used": 0,
            "remaining": DEFAULT_PHOTO_LIMIT,
            "blocked": False,
        }

    photo_limit = int(device.get("photo_limit") or DEFAULT_PHOTO_LIMIT)
    photos_used = int(device.get("photos_used") or 0)
    return {
        "device_limit_id": device.get("id"),
        "photo_limit": photo_limit,
        "photos_used": photos_used,
        "remaining": max(photo_limit - photos_used, 0),
        "blocked": bool(device.get("blocked")),
        "block_reason": device.get("block_reason") or "",
    }


def _sync_device_usage_from_history(cursor, device: dict | None) -> dict | None:
    """Keeps quota usage aligned with rows already tied to this machine/IP."""
    if not device or not device.get("id"):
        return None

    device_id = device["id"]
    machine_id = (device.get("machine_id") or "").strip()
    ip_address = (device.get("ip_address") or "").strip()

    if IS_POSTGRES:
        cursor.execute(
            """
            UPDATE device_limits
            SET photos_used = GREATEST(
                    photos_used,
                    (
                        SELECT COUNT(*)
                        FROM processed_images
                        WHERE device_limit_id = %s
                           OR (NULLIF(machine_id, '') = NULLIF(%s, ''))
                           OR (
                                NULLIF(%s, '') IS NOT NULL
                                AND COALESCE(machine_id, '') = ''
                                AND NULLIF(ip_address, '') = NULLIF(%s, '')
                              )
                    )
                ),
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            """,
            (device_id, machine_id, ip_address, ip_address, device_id),
        )
    else:
        cursor.execute(
            """
            SELECT COUNT(*) AS image_count
            FROM processed_images
            WHERE device_limit_id = ?
               OR (NULLIF(machine_id, '') = NULLIF(?, ''))
               OR (
                    NULLIF(?, '') IS NOT NULL
                    AND COALESCE(machine_id, '') = ''
                    AND NULLIF(ip_address, '') = NULLIF(?, '')
                  )
            """,
            (device_id, machine_id, ip_address, ip_address),
        )
        image_count = int(_row_to_dict(cursor.fetchone())["image_count"] or 0)
        cursor.execute(
            """
            UPDATE device_limits
            SET photos_used = CASE
                    WHEN photos_used < ? THEN ?
                    ELSE photos_used
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (image_count, image_count, device_id),
        )
        cursor.execute(
            """
            SELECT id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            FROM device_limits
            WHERE id = ?
            """,
            (device_id,),
        )

    return _row_to_dict(cursor.fetchone())


def _fetch_device_limits(cursor, machine_id: str = "", ip_address: str = "") -> list[dict]:
    conditions = []
    values = []

    if machine_id:
        conditions.append("machine_id = %s" if IS_POSTGRES else "machine_id = ?")
        values.append(machine_id)
    if ip_address:
        conditions.append("ip_address = %s" if IS_POSTGRES else "ip_address = ?")
        values.append(ip_address)

    if not conditions:
        return []

    cursor.execute(
        f"""
        SELECT id, machine_id, ip_address, emis_code, phone_number, school_name,
            machine_type, photo_limit, photos_used, blocked, block_reason,
            created_at, updated_at
        FROM device_limits
        WHERE {" OR ".join(conditions)}
        ORDER BY updated_at DESC, id DESC
        """,
        tuple(values),
    )
    return [_row_to_dict(row) for row in cursor.fetchall()]


def get_or_create_device_limit(
    emis_code: str,
    phone_number: str,
    school_name: str = "",
    machine_id: str = "",
    machine_type: str = "",
    ip_address: str = "",
) -> dict:
    """Returns quota details for one machine, with IP as a fallback signal."""
    conn = _connect()
    cursor = conn.cursor()

    machine_id = (machine_id or "").strip()[:120]
    ip_address = (ip_address or "").strip()[:80]
    phone_number = (phone_number or "").strip()

    matches = _fetch_device_limits(cursor, machine_id, ip_address)
    if DISABLE_USAGE_LIMITS:
        chosen = next((item for item in matches if item.get("machine_id") == machine_id and machine_id), None)
        chosen = chosen or next((item for item in matches if item.get("ip_address") == ip_address and ip_address), None)
    else:
        chosen = next((item for item in matches if item.get("machine_id") == machine_id and machine_id), None)
        chosen = chosen or next((item for item in matches if item.get("ip_address") == ip_address and ip_address), None)

    if chosen:
        if IS_POSTGRES:
            cursor.execute(
                """
                UPDATE device_limits
                SET emis_code = %s,
                    phone_number = %s,
                    school_name = COALESCE(NULLIF(%s, ''), school_name),
                    machine_id = COALESCE(NULLIF(%s, ''), machine_id),
                    machine_type = COALESCE(NULLIF(%s, ''), machine_type),
                    ip_address = COALESCE(NULLIF(%s, ''), ip_address),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, machine_id, ip_address, emis_code, phone_number,
                    school_name, machine_type, photo_limit, photos_used, blocked,
                    block_reason, created_at, updated_at
                """,
                (emis_code, phone_number, school_name, machine_id, machine_type, ip_address, chosen["id"]),
            )
            row = cursor.fetchone()
        else:
            cursor.execute(
                """
                UPDATE device_limits
                SET emis_code = ?,
                    phone_number = ?,
                    school_name = COALESCE(NULLIF(?, ''), school_name),
                    machine_id = COALESCE(NULLIF(?, ''), machine_id),
                    machine_type = COALESCE(NULLIF(?, ''), machine_type),
                    ip_address = COALESCE(NULLIF(?, ''), ip_address),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (emis_code, phone_number, school_name, machine_id, machine_type, ip_address, chosen["id"]),
            )
            cursor.execute(
                """
                SELECT id, machine_id, ip_address, emis_code, phone_number,
                    school_name, machine_type, photo_limit, photos_used, blocked,
                    block_reason, created_at, updated_at
                FROM device_limits
                WHERE id = ?
                """,
                (chosen["id"],),
            )
            row = cursor.fetchone()

        conn.commit()
        device = _row_to_dict(row)
        device = _sync_device_usage_from_history(cursor, device) or device
        conn.commit()
        conn.close()
        return {"allowed": True, "device": device, "quota": _quota_payload(device)}

    if IS_POSTGRES:
        cursor.execute(
            """
            INSERT INTO device_limits (
                machine_id, ip_address, emis_code, phone_number, school_name,
                machine_type, photo_limit
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            """,
            (machine_id, ip_address, emis_code, phone_number, school_name, machine_type, DEFAULT_PHOTO_LIMIT),
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            """
            INSERT INTO device_limits (
                machine_id, ip_address, emis_code, phone_number, school_name,
                machine_type, photo_limit
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (machine_id, ip_address, emis_code, phone_number, school_name, machine_type, DEFAULT_PHOTO_LIMIT),
        )
        device_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            FROM device_limits
            WHERE id = ?
            """,
            (device_id,),
        )
        row = cursor.fetchone()

    conn.commit()
    device = _row_to_dict(row)
    device = _sync_device_usage_from_history(cursor, device) or device
    conn.commit()
    conn.close()
    return {"allowed": True, "device": device, "quota": _quota_payload(device)}


def create_session(
    emis_code: str,
    phone_number: str,
    school_name: str = "",
    machine_id: str = "",
    machine_type: str = "",
    ip_address: str = "",
    device_limit_id: int | None = None,
) -> dict:
    """Creates a new session and returns it."""
    conn = _connect()
    cursor = conn.cursor()

    if IS_POSTGRES:
        cursor.execute(
            """
            INSERT INTO school_sessions (
                emis_code, phone_number, school_name, machine_id, machine_type,
                ip_address, device_limit_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, emis_code, phone_number, school_name, machine_id,
                machine_type, ip_address, device_limit_id, created_at, processed_count
            """,
            (emis_code, phone_number, school_name, machine_id, machine_type, ip_address, device_limit_id),
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            """
            INSERT INTO school_sessions (
                emis_code, phone_number, school_name, machine_id, machine_type,
                ip_address, device_limit_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (emis_code, phone_number, school_name, machine_id, machine_type, ip_address, device_limit_id),
        )
        session_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, emis_code, phone_number, school_name, machine_id,
                machine_type, ip_address, device_limit_id, created_at, processed_count
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
            SELECT id, emis_code, phone_number, school_name, machine_id,
                machine_type, ip_address, device_limit_id, created_at, processed_count
            FROM school_sessions
            WHERE id = %s
            """,
            (session_id,),
        )
    else:
        cursor.execute(
            """
            SELECT id, emis_code, phone_number, school_name, machine_id,
                machine_type, ip_address, device_limit_id, created_at, processed_count
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
            session_id, emis_code, phone_number, school_name, machine_id,
            machine_type, ip_address, device_limit_id, original_name,
            processed_name, url, size_kb
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        if IS_POSTGRES
        else
        """
        INSERT INTO processed_images (
            session_id, emis_code, phone_number, school_name, machine_id,
            machine_type, ip_address, device_limit_id, original_name,
            processed_name, url, size_kb
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
    )
    cursor.executemany(
        sql,
        [
            (
                session["id"],
                session["emis_code"],
                session["phone_number"],
                session.get("school_name") or "",
                session.get("machine_id") or "",
                session.get("machine_type") or "",
                session.get("ip_address") or "",
                session.get("device_limit_id"),
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


def get_device_quota(device_limit_id: int | None) -> dict:
    if not device_limit_id:
        return _quota_payload(None)

    conn = _connect()
    cursor = conn.cursor()
    if IS_POSTGRES:
        cursor.execute(
            """
            SELECT id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            FROM device_limits
            WHERE id = %s
            """,
            (device_limit_id,),
        )
    else:
        cursor.execute(
            """
            SELECT id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            FROM device_limits
            WHERE id = ?
            """,
            (device_limit_id,),
        )
    device = _row_to_dict(cursor.fetchone())
    conn.close()
    return _quota_payload(device)


def check_device_quota(session: dict, requested_count: int) -> dict:
    quota = get_device_quota(session.get("device_limit_id"))
    requested_count = int(requested_count or 0)

    if DISABLE_USAGE_LIMITS:
        return {"allowed": True, "quota": quota}

    if quota.get("blocked"):
        return {
            "allowed": False,
            "reason": "blocked",
            "message": quota.get("block_reason") or "This device is blocked. Please contact admin.",
            "quota": quota,
        }

    if requested_count > quota["remaining"]:
        return {
            "allowed": False,
            "reason": "quota_limit",
            "message": (
                f"Free lifetime quota is complete. Limit: {quota['photo_limit']} photos, "
                f"used: {quota['photos_used']} photos."
            ),
            "quota": quota,
        }

    return {"allowed": True, "quota": quota}


def add_device_usage(device_limit_id: int | None, add_count: int) -> dict:
    if not device_limit_id or add_count <= 0:
        return get_device_quota(device_limit_id)

    conn = _connect()
    cursor = conn.cursor()
    if IS_POSTGRES:
        cursor.execute(
            """
            UPDATE device_limits
            SET photos_used = photos_used + %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            """,
            (add_count, device_limit_id),
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            """
            UPDATE device_limits
            SET photos_used = photos_used + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (add_count, device_limit_id),
        )
        cursor.execute(
            """
            SELECT id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            FROM device_limits
            WHERE id = ?
            """,
            (device_limit_id,),
        )
        row = cursor.fetchone()

    conn.commit()
    device = _row_to_dict(row)
    conn.close()
    return _quota_payload(device)


class PendingLimitRequestError(RuntimeError):
    """Raised when a machine already has a request awaiting admin action."""


def create_limit_request(
    session: dict,
    requested_extra: int,
    message: str,
    payment_sender_name: str = "",
    payment_sender_phone: str = "",
    payment_transaction_id: str = "",
) -> dict:
    conn = _connect()
    cursor = conn.cursor()
    requested_extra = max(1, min(int(requested_extra or DEFAULT_LIMIT_REQUEST_EXTRA), 1000))
    clean_message = (message or "").strip()[:1500]
    sender_name = (payment_sender_name or "").strip()[:120]
    sender_phone = "".join(filter(str.isdigit, payment_sender_phone or ""))[:30]
    transaction_id = (payment_transaction_id or "").strip()[:120]

    machine_id = (session.get("machine_id") or "").strip()
    device_limit_id = session.get("device_limit_id")

    # Serialize submissions per machine so duplicate rapid clicks stay one pending request.
    request_lock_key = machine_id or f"device-limit:{device_limit_id or session['id']}"
    if IS_POSTGRES:
        cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (request_lock_key,))
    else:
        cursor.execute("BEGIN IMMEDIATE")

    if machine_id:
        pending_query = "SELECT id FROM limit_requests WHERE machine_id = {placeholder} AND status = 'pending' LIMIT 1"
        pending_params = (machine_id,)
    else:
        pending_query = "SELECT id FROM limit_requests WHERE device_limit_id = {placeholder} AND status = 'pending' LIMIT 1"
        pending_params = (device_limit_id,)

    cursor.execute(pending_query.format(placeholder="%s" if IS_POSTGRES else "?"), pending_params)
    if cursor.fetchone():
        conn.rollback()
        conn.close()
        raise PendingLimitRequestError(
            "A photo limit request for this machine is already pending. Please wait for the admin to approve or delete it."
        )

    if IS_POSTGRES:
        cursor.execute(
            """
            INSERT INTO limit_requests (
                session_id, device_limit_id, machine_id, ip_address, emis_code,
                phone_number, school_name, requested_extra, payment_sender_name,
                payment_sender_phone, payment_transaction_id, message
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, session_id, device_limit_id, machine_id, ip_address,
                emis_code, phone_number, school_name, requested_extra,
                payment_sender_name, payment_sender_phone, payment_transaction_id,
                message, status, created_at, resolved_at
            """,
            (
                session["id"],
                session.get("device_limit_id"),
                session.get("machine_id") or "",
                session.get("ip_address") or "",
                session["emis_code"],
                session["phone_number"],
                session.get("school_name") or "",
                requested_extra,
                sender_name,
                sender_phone,
                transaction_id,
                clean_message,
            ),
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            """
            INSERT INTO limit_requests (
                session_id, device_limit_id, machine_id, ip_address, emis_code,
                phone_number, school_name, requested_extra, payment_sender_name,
                payment_sender_phone, payment_transaction_id, message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["id"],
                session.get("device_limit_id"),
                session.get("machine_id") or "",
                session.get("ip_address") or "",
                session["emis_code"],
                session["phone_number"],
                session.get("school_name") or "",
                requested_extra,
                sender_name,
                sender_phone,
                transaction_id,
                clean_message,
            ),
        )
        request_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, session_id, device_limit_id, machine_id, ip_address,
                emis_code, phone_number, school_name, requested_extra,
                payment_sender_name, payment_sender_phone, payment_transaction_id,
                message, status, created_at, resolved_at
            FROM limit_requests
            WHERE id = ?
            """,
            (request_id,),
        )
        row = cursor.fetchone()

    conn.commit()
    request_row = _row_to_dict(row)
    conn.close()
    return request_row


def update_device_limit(device_limit_id: int, photo_limit: int, request_id: int | None = None) -> dict:
    conn = _connect()
    cursor = conn.cursor()
    photo_limit = max(0, min(int(photo_limit or 0), 100000))

    if IS_POSTGRES:
        cursor.execute(
            """
            UPDATE device_limits
            SET photo_limit = %s,
                blocked = FALSE,
                block_reason = NULL,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            """,
            (photo_limit, device_limit_id),
        )
        row = cursor.fetchone()
        if request_id:
            cursor.execute(
                "UPDATE limit_requests SET status = 'approved', resolved_at = NOW() WHERE id = %s",
                (request_id,),
            )
    else:
        cursor.execute(
            """
            UPDATE device_limits
            SET photo_limit = ?,
                blocked = 0,
                block_reason = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (photo_limit, device_limit_id),
        )
        cursor.execute(
            """
            SELECT id, machine_id, ip_address, emis_code, phone_number,
                school_name, machine_type, photo_limit, photos_used, blocked,
                block_reason, created_at, updated_at
            FROM device_limits
            WHERE id = ?
            """,
            (device_limit_id,),
        )
        row = cursor.fetchone()
        if request_id:
            cursor.execute(
                "UPDATE limit_requests SET status = 'approved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
                (request_id,),
            )

    conn.commit()
    device = _row_to_dict(row)
    conn.close()
    return device


def delete_limit_request(request_id: int) -> bool:
    """Deletes one pending limit request so the machine can submit a fresh one."""
    conn = _connect()
    cursor = conn.cursor()

    if IS_POSTGRES:
        cursor.execute(
            "DELETE FROM limit_requests WHERE id = %s AND status = 'pending' RETURNING id",
            (request_id,),
        )
        deleted = cursor.fetchone() is not None
    else:
        cursor.execute(
            "DELETE FROM limit_requests WHERE id = ? AND status = 'pending'",
            (request_id,),
        )
        deleted = cursor.rowcount > 0

    conn.commit()
    conn.close()
    return deleted


def record_school_error(
    event_type: str,
    message: str,
    session: dict | None = None,
    emis_code: str = "",
    phone_number: str = "",
    school_name: str = "",
    machine_id: str = "",
    machine_type: str = "",
    ip_address: str = "",
    device_limit_id: int | None = None,
    severity: str = "warning",
    context: str = "",
) -> dict:
    """Stores refused/error events separately for admin monitoring."""
    session = session or {}
    event_type_value = (event_type or "unknown_error").strip()[:80]
    severity_value = (severity or "warning").strip()[:20]
    message_value = (message or "Unknown error").strip()[:2000]
    context_value = (context or "").strip()[:2000]

    conn = _connect()
    cursor = conn.cursor()
    values = (
        session.get("id"),
        device_limit_id or session.get("device_limit_id"),
        (emis_code or session.get("emis_code") or "").strip()[:20],
        (phone_number or session.get("phone_number") or "").strip()[:30],
        (school_name or session.get("school_name") or "").strip()[:120],
        (machine_id or session.get("machine_id") or "").strip()[:120],
        (machine_type or session.get("machine_type") or "").strip()[:120],
        (ip_address or session.get("ip_address") or "").strip()[:80],
        event_type_value,
        severity_value,
        message_value,
        context_value,
    )

    if IS_POSTGRES:
        cursor.execute(
            """
            INSERT INTO school_error_events (
                session_id, device_limit_id, emis_code, phone_number, school_name,
                machine_id, machine_type, ip_address, event_type, severity,
                message, context
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, session_id, device_limit_id, emis_code, phone_number,
                school_name, machine_id, machine_type, ip_address, event_type,
                severity, message, context, created_at
            """,
            values,
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            """
            INSERT INTO school_error_events (
                session_id, device_limit_id, emis_code, phone_number, school_name,
                machine_id, machine_type, ip_address, event_type, severity,
                message, context
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            values,
        )
        event_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, session_id, device_limit_id, emis_code, phone_number,
                school_name, machine_id, machine_type, ip_address, event_type,
                severity, message, context, created_at
            FROM school_error_events
            WHERE id = ?
            """,
            (event_id,),
        )
        row = cursor.fetchone()

    conn.commit()
    event = _row_to_dict(row)
    conn.close()
    return event


def record_feedback(session: dict, rating: int, category: str, message: str) -> dict:
    """Stores feedback with the current school's private session details."""
    conn = _connect()
    cursor = conn.cursor()

    rating_value = max(0, min(int(rating or 0), 5))
    category_value = (category or "").strip()[:60]
    message_value = (message or "").strip()[:1500]

    if IS_POSTGRES:
        cursor.execute(
            """
            INSERT INTO feedback_entries (
                session_id, emis_code, phone_number, school_name, machine_id,
                machine_type, rating, category, message
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, session_id, emis_code, phone_number, school_name,
                machine_id, machine_type, rating, category, message, created_at
            """,
            (
                session["id"],
                session["emis_code"],
                session["phone_number"],
                session.get("school_name") or "",
                session.get("machine_id") or "",
                session.get("machine_type") or "",
                rating_value,
                category_value,
                message_value,
            ),
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            """
            INSERT INTO feedback_entries (
                session_id, emis_code, phone_number, school_name, machine_id,
                machine_type, rating, category, message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["id"],
                session["emis_code"],
                session["phone_number"],
                session.get("school_name") or "",
                session.get("machine_id") or "",
                session.get("machine_type") or "",
                rating_value,
                category_value,
                message_value,
            ),
        )
        feedback_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, session_id, emis_code, phone_number, school_name,
                machine_id, machine_type, rating, category, message, created_at
            FROM feedback_entries
            WHERE id = ?
            """,
            (feedback_id,),
        )
        row = cursor.fetchone()

    conn.commit()
    conn.close()
    return _row_to_dict(row)


def record_problem_report(
    emis_code: str,
    phone_number: str,
    school_name: str,
    reporter_name: str = "",
    problem_message: str = "",
    screenshot_name: str = "",
    screenshot_type: str = "",
    screenshot_data_url: str = "",
    machine_id: str = "",
    machine_type: str = "",
    ip_address: str = "",
) -> dict:
    """Stores a school-submitted problem report for admin review."""
    emis_value = "".join(filter(str.isdigit, emis_code or ""))[:20]
    phone_value = "".join(filter(str.isdigit, phone_number or ""))[:30]
    school_value = " ".join((school_name or "").strip().split())[:120]
    reporter_value = " ".join((reporter_name or "").strip().split())[:120]
    message_value = (problem_message or "").strip()[:2000]
    screenshot_name_value = (screenshot_name or "").strip()[:180]
    screenshot_type_value = (screenshot_type or "").strip()[:80]

    conn = _connect()
    cursor = conn.cursor()

    values = (
        emis_value,
        phone_value,
        school_value,
        reporter_value,
        (machine_id or "").strip()[:120],
        (machine_type or "").strip()[:120],
        (ip_address or "").strip()[:80],
        message_value,
        screenshot_name_value,
        screenshot_type_value,
        screenshot_data_url or "",
    )

    if IS_POSTGRES:
        cursor.execute(
            """
            INSERT INTO problem_reports (
                emis_code, phone_number, school_name, reporter_name, machine_id,
                machine_type, ip_address, problem_message, screenshot_name,
                screenshot_type, screenshot_data_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, emis_code, phone_number, school_name, reporter_name,
                machine_id, machine_type, ip_address, problem_message,
                screenshot_name, screenshot_type, screenshot_data_url, created_at
            """,
            values,
        )
        row = cursor.fetchone()
    else:
        cursor.execute(
            """
            INSERT INTO problem_reports (
                emis_code, phone_number, school_name, reporter_name, machine_id,
                machine_type, ip_address, problem_message, screenshot_name,
                screenshot_type, screenshot_data_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            values,
        )
        report_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, emis_code, phone_number, school_name, reporter_name,
                machine_id, machine_type, ip_address, problem_message,
                screenshot_name, screenshot_type, screenshot_data_url, created_at
            FROM problem_reports
            WHERE id = ?
            """,
            (report_id,),
        )
        row = cursor.fetchone()

    conn.commit()
    report = _row_to_dict(row)
    conn.close()
    return report


def get_activity_summary(limit: int = 8) -> dict:
    """Returns live landing-page stats without exposing phone numbers."""
    conn = _connect()
    cursor = conn.cursor()
    limit_placeholder = "%s" if IS_POSTGRES else "?"

    cursor.execute(
        f"SELECT COUNT(*) AS total_sessions FROM school_sessions WHERE {VALID_SCHOOL_IDENTITY_WHERE}"
    )
    total_sessions = _row_to_dict(cursor.fetchone())["total_sessions"]

    cursor.execute(
        f"SELECT COUNT(DISTINCT emis_code) AS total_schools FROM school_sessions WHERE {VALID_SCHOOL_IDENTITY_WHERE}"
    )
    total_schools = _row_to_dict(cursor.fetchone())["total_schools"]

    cursor.execute("SELECT COUNT(*) AS total_images FROM processed_images")
    total_images = _row_to_dict(cursor.fetchone())["total_images"]

    cursor.execute(
        f"""
        SELECT COUNT(DISTINCT machine_id) AS total_machines
        FROM school_sessions
        WHERE COALESCE(machine_id, '') <> ''
          AND {VALID_SCHOOL_IDENTITY_WHERE}
        """
    )
    total_machines = _row_to_dict(cursor.fetchone())["total_machines"]

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
        SELECT
            school_sessions.emis_code,
            COUNT(processed_images.id) AS processed_count,
            school_sessions.created_at
        FROM school_sessions
        LEFT JOIN processed_images
            ON processed_images.session_id = school_sessions.id
        GROUP BY school_sessions.id, school_sessions.emis_code, school_sessions.created_at
        ORDER BY school_sessions.created_at DESC, school_sessions.id DESC
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
        "total_machines": int(total_machines or 0),
        "recent_images": recent_images,
        "recent_sessions": recent_sessions,
    }


def get_admin_records(limit: int = 500) -> dict:
    """Returns private school records grouped by unique EMIS code."""
    conn = _connect()
    cursor = conn.cursor()
    limit_placeholder = "%s" if IS_POSTGRES else "?"

    cursor.execute(
        f"SELECT COUNT(*) AS total_sessions FROM school_sessions WHERE {VALID_SCHOOL_IDENTITY_WHERE}"
    )
    total_sessions = _row_to_dict(cursor.fetchone())["total_sessions"]

    cursor.execute(
        f"SELECT COUNT(DISTINCT emis_code) AS total_schools FROM school_sessions WHERE {VALID_SCHOOL_IDENTITY_WHERE}"
    )
    total_schools = _row_to_dict(cursor.fetchone())["total_schools"]

    cursor.execute("SELECT COUNT(*) AS total_images FROM processed_images")
    total_images = _row_to_dict(cursor.fetchone())["total_images"]

    cursor.execute(
        f"""
        SELECT COUNT(DISTINCT machine_id) AS total_machines
        FROM school_sessions
        WHERE COALESCE(machine_id, '') <> ''
          AND {VALID_SCHOOL_IDENTITY_WHERE}
        """
    )
    total_machines = _row_to_dict(cursor.fetchone())["total_machines"]

    cursor.execute("SELECT COUNT(*) AS total_feedback FROM feedback_entries")
    total_feedback = _row_to_dict(cursor.fetchone())["total_feedback"]

    cursor.execute(
        f"""
        SELECT COUNT(*) AS total_limit_requests
        FROM limit_requests
        WHERE status = 'pending'
          AND {VALID_SCHOOL_IDENTITY_WHERE}
        """
    )
    total_limit_requests = _row_to_dict(cursor.fetchone())["total_limit_requests"]

    cursor.execute("SELECT COUNT(*) AS total_error_events FROM school_error_events")
    total_error_events = _row_to_dict(cursor.fetchone())["total_error_events"]

    cursor.execute("SELECT COUNT(*) AS total_problem_reports FROM problem_reports")
    total_problem_reports = _row_to_dict(cursor.fetchone())["total_problem_reports"]

    cursor.execute(
        f"""
        WITH school_rollup AS (
            SELECT
                emis_code,
                COUNT(*) AS session_count,
                SUM(processed_count) AS session_processed_count,
                COUNT(DISTINCT NULLIF(machine_id, '')) AS machine_count,
                MIN(created_at) AS first_session_at,
                MAX(created_at) AS last_session_at
            FROM school_sessions
            WHERE {VALID_SCHOOL_IDENTITY_WHERE}
            GROUP BY emis_code
        ),
        image_rollup AS (
            SELECT
                emis_code,
                COUNT(*) AS images_recorded,
                COALESCE(SUM(size_kb), 0) AS total_size_kb,
                MAX(created_at) AS last_processed_at
            FROM processed_images
            GROUP BY emis_code
        )
        SELECT
            school_rollup.emis_code,
            (
                SELECT latest.school_name
                FROM school_sessions AS latest
                WHERE latest.emis_code = school_rollup.emis_code
                  AND COALESCE(latest.school_name, '') <> ''
                ORDER BY latest.created_at DESC, latest.id DESC
                LIMIT 1
            ) AS school_name,
            (
                SELECT latest.phone_number
                FROM school_sessions AS latest
                WHERE latest.emis_code = school_rollup.emis_code
                ORDER BY latest.created_at DESC, latest.id DESC
                LIMIT 1
            ) AS phone_number,
            (
                SELECT latest.machine_id
                FROM school_sessions AS latest
                WHERE latest.emis_code = school_rollup.emis_code
                  AND COALESCE(latest.machine_id, '') <> ''
                ORDER BY latest.created_at DESC, latest.id DESC
                LIMIT 1
            ) AS machine_id,
            (
                SELECT latest.machine_type
                FROM school_sessions AS latest
                WHERE latest.emis_code = school_rollup.emis_code
                  AND COALESCE(latest.machine_type, '') <> ''
                ORDER BY latest.created_at DESC, latest.id DESC
                LIMIT 1
            ) AS machine_type,
            school_rollup.session_count,
            school_rollup.machine_count,
            COALESCE(school_rollup.session_processed_count, 0) AS session_processed_count,
            school_rollup.first_session_at,
            school_rollup.last_session_at,
            COALESCE(image_rollup.images_recorded, 0) AS images_recorded,
            COALESCE(image_rollup.total_size_kb, 0) AS total_size_kb,
            image_rollup.last_processed_at
        FROM school_rollup
        LEFT JOIN image_rollup
            ON image_rollup.emis_code = school_rollup.emis_code
        ORDER BY school_rollup.last_session_at DESC, school_rollup.emis_code ASC
        LIMIT {limit_placeholder}
        """,
        (limit,),
    )
    schools = [_row_to_dict(row) for row in cursor.fetchall()]

    cursor.execute(
        f"""
        SELECT id, session_id, emis_code, phone_number, school_name, machine_id,
            machine_type, rating, category, message, created_at
        FROM feedback_entries
        ORDER BY created_at DESC, id DESC
        LIMIT {limit_placeholder}
        """,
        (min(limit, 100),),
    )
    feedback = [_row_to_dict(row) for row in cursor.fetchall()]

    cursor.execute(
        f"""
        SELECT id, machine_id, ip_address, emis_code, phone_number, school_name,
            machine_type, photo_limit, photos_used, blocked, block_reason,
            created_at, updated_at
        FROM device_limits
        ORDER BY updated_at DESC, id DESC
        LIMIT {limit_placeholder}
        """,
        (limit,),
    )
    device_limits = [_row_to_dict(row) for row in cursor.fetchall()]

    cursor.execute(
        f"""
        SELECT id, session_id, device_limit_id, machine_id, ip_address,
            emis_code, phone_number, school_name, requested_extra,
            payment_sender_name, payment_sender_phone, payment_transaction_id,
            message, status, created_at, resolved_at
        FROM limit_requests
        WHERE {VALID_SCHOOL_IDENTITY_WHERE}
        ORDER BY
            CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
            created_at DESC,
            id DESC
        LIMIT {limit_placeholder}
        """,
        (min(limit, 100),),
    )
    limit_requests = [_row_to_dict(row) for row in cursor.fetchall()]

    cursor.execute(
        f"""
        SELECT id, session_id, device_limit_id, emis_code, phone_number,
            school_name, machine_id, machine_type, ip_address, event_type,
            severity, message, context, created_at
        FROM school_error_events
        ORDER BY created_at DESC, id DESC
        LIMIT {limit_placeholder}
        """,
        (min(limit, 150),),
    )
    error_events = [_row_to_dict(row) for row in cursor.fetchall()]

    cursor.execute(
        f"""
        SELECT id, emis_code, phone_number, school_name, reporter_name,
            machine_id, machine_type, ip_address, problem_message,
            screenshot_name, screenshot_type, screenshot_data_url, created_at
        FROM problem_reports
        ORDER BY created_at DESC, id DESC
        LIMIT {limit_placeholder}
        """,
        (min(limit, 150),),
    )
    problem_reports = [_row_to_dict(row) for row in cursor.fetchall()]

    conn.close()
    return {
        "total_sessions": int(total_sessions or 0),
        "total_schools": int(total_schools or 0),
        "total_images": int(total_images or 0),
        "total_machines": int(total_machines or 0),
        "total_feedback": int(total_feedback or 0),
        "total_limit_requests": int(total_limit_requests or 0),
        "total_error_events": int(total_error_events or 0),
        "total_problem_reports": int(total_problem_reports or 0),
        "schools": schools,
        "sessions": schools,
        "feedback": feedback,
        "device_limits": device_limits,
        "limit_requests": limit_requests,
        "error_events": error_events,
        "problem_reports": problem_reports,
    }
