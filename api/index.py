import os
import uuid
import sqlite3
from datetime import date
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Database connection
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

# Local SQLite fallback path
LOCAL_DB_PATH = "/tmp/cashflow.db"

# Import libsql_client for Turso (required in production)
if TURSO_DATABASE_URL:
    import libsql_client

_db_initialized = False


class Row(dict):
    """Dict subclass that also supports index-based access like sqlite3.Row."""

    def __init__(self, columns, values):
        super().__init__(zip(columns, values))
        self._values = list(values)

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)


class DBWrapper:
    """Wrapper to provide consistent interface for both sqlite3 and libsql."""

    def __init__(self, conn, is_turso=False):
        self.conn = conn
        self.is_turso = is_turso
        self._cursor = None

    def cursor(self):
        if self.is_turso:
            return self
        return self.conn.cursor()

    def execute(self, sql, params=None):
        if self.is_turso:
            # libsql uses ? placeholders like sqlite, so we're good
            if params:
                result = self.conn.execute(sql, params)
            else:
                result = self.conn.execute(sql)
            self._last_result = result
            return self
        else:
            if self._cursor is None:
                self._cursor = self.conn.cursor()
            if params:
                self._cursor.execute(sql, params)
            else:
                self._cursor.execute(sql)
            return self._cursor

    def fetchone(self):
        if self.is_turso:
            rows = self._last_result.rows
            if rows:
                return Row(self._last_result.columns, rows[0])
            return None
        return self._cursor.fetchone()

    def fetchall(self):
        if self.is_turso:
            return [Row(self._last_result.columns, row) for row in self._last_result.rows]
        return self._cursor.fetchall()

    def commit(self):
        if not self.is_turso:
            self.conn.commit()

    def close(self):
        if not self.is_turso:
            self.conn.close()


def get_db():
    """Get database connection (Turso in production, SQLite for local dev)."""
    global _db_initialized

    if TURSO_DATABASE_URL:
        # Production: use Turso (fail loudly if misconfigured)
        if not TURSO_AUTH_TOKEN:
            raise RuntimeError("TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set")
        client = libsql_client.create_client_sync(
            url=TURSO_DATABASE_URL,
            auth_token=TURSO_AUTH_TOKEN
        )
        wrapper = DBWrapper(client, is_turso=True)
        if not _db_initialized:
            init_db_tables(wrapper)
            _db_initialized = True
        return wrapper
    else:
        # Local development only
        conn = sqlite3.connect(LOCAL_DB_PATH)
        conn.row_factory = sqlite3.Row
        wrapper = DBWrapper(conn, is_turso=False)
        if not _db_initialized:
            init_db_tables(wrapper)
            _db_initialized = True
        return wrapper


# Default categories to seed
DEFAULT_CATEGORIES = [
    {"name": "Salary", "type": "income", "icon": "💼", "color": "#22c55e"},
    {"name": "Freelance", "type": "income", "icon": "💻", "color": "#10b981"},
    {"name": "Rental", "type": "income", "icon": "🏠", "color": "#14b8a6"},
    {"name": "Other Income", "type": "income", "icon": "💰", "color": "#06b6d4"},
    {"name": "Housing", "type": "expense", "icon": "🏡", "color": "#ef4444"},
    {"name": "Utilities", "type": "expense", "icon": "⚡", "color": "#f97316"},
    {"name": "Groceries", "type": "expense", "icon": "🛒", "color": "#f59e0b"},
    {"name": "Transport", "type": "expense", "icon": "🚗", "color": "#eab308"},
    {"name": "Subscriptions", "type": "expense", "icon": "📺", "color": "#84cc16"},
    {"name": "Other Expense", "type": "expense", "icon": "💸", "color": "#64748b"},
]


def init_db_tables(conn):
    """Initialize database tables and seed data."""
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            icon TEXT,
            color TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL REFERENCES categories(id),
            recurring_id TEXT,
            name TEXT NOT NULL,
            month_year TEXT NOT NULL,
            expected_amount REAL,
            expected_date TEXT,
            actual_amount REAL,
            actual_date TEXT,
            has_milestones INTEGER DEFAULT 0,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recurring (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL REFERENCES categories(id),
            name TEXT NOT NULL,
            expected_amount REAL NOT NULL,
            frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly')),
            start_month TEXT NOT NULL,
            end_month TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS milestones (
            id TEXT PRIMARY KEY,
            entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            expected_amount REAL,
            expected_date TEXT,
            actual_amount REAL,
            actual_date TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    # Seed default categories if empty
    cursor.execute("SELECT COUNT(*) FROM categories")
    count = cursor.fetchone()[0]
    if count == 0:
        for cat in DEFAULT_CATEGORIES:
            cursor.execute(
                "INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), cat["name"], cat["type"], cat["icon"], cat["color"])
            )

    # Seed default setting if not exists
    cursor.execute("SELECT COUNT(*) FROM settings WHERE key = 'starting_balance'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO settings (key, value) VALUES ('starting_balance', '0')")

    conn.commit()


# Pydantic models
class CategoryBase(BaseModel):
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: str

class EntryBase(BaseModel):
    category_id: str
    recurring_id: Optional[str] = None
    name: str
    month_year: str
    expected_amount: Optional[float] = None
    expected_date: Optional[str] = None
    actual_amount: Optional[float] = None
    actual_date: Optional[str] = None
    has_milestones: bool = False
    notes: Optional[str] = None

class MilestoneBase(BaseModel):
    name: str
    expected_amount: Optional[float] = None
    expected_date: Optional[str] = None
    actual_amount: Optional[float] = None
    actual_date: Optional[str] = None
    sort_order: int = 0

class MilestoneResponse(MilestoneBase):
    id: str
    entry_id: str
    created_at: str

class EntryCreate(EntryBase):
    milestones: Optional[List[MilestoneBase]] = None

class EntryResponse(EntryBase):
    id: str
    created_at: str
    updated_at: str
    category: CategoryResponse
    milestones: List[MilestoneResponse] = []

class RecurringBase(BaseModel):
    category_id: str
    name: str
    expected_amount: float
    frequency: str
    start_month: str
    end_month: Optional[str] = None

class RecurringResponse(RecurringBase):
    id: str
    created_at: str
    category: CategoryResponse

class SettingResponse(BaseModel):
    key: str
    value: str

class EntryConfirm(BaseModel):
    actual_amount: Optional[float] = None
    actual_date: Optional[str] = None


# FastAPI app
app = FastAPI(title="Cashflow Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Categories endpoints
@app.get("/api/categories")
def list_categories():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, type, icon, color FROM categories ORDER BY type, name")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/categories", status_code=201)
def create_category(category: CategoryBase):
    conn = get_db()
    cursor = conn.cursor()
    cat_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)",
        (cat_id, category.name, category.type, category.icon, category.color)
    )
    conn.commit()
    conn.close()
    return {"id": cat_id, **category.model_dump()}


# Entries endpoints
@app.get("/api/entries")
def list_entries(from_month: Optional[str] = None, to_month: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT e.id, e.category_id, e.recurring_id, e.name, e.month_year,
               e.expected_amount, e.expected_date, e.actual_amount, e.actual_date,
               e.has_milestones, e.notes, e.created_at, e.updated_at,
               c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
        FROM entries e
        JOIN categories c ON e.category_id = c.id
        WHERE 1=1
    """
    params = []

    if from_month:
        query += " AND e.month_year >= ?"
        params.append(from_month)
    if to_month:
        query += " AND e.month_year <= ?"
        params.append(to_month)

    query += " ORDER BY e.month_year, e.created_at"

    cursor.execute(query, params)
    rows = cursor.fetchall()

    entries = []
    for row in rows:
        entry = {
            "id": row["id"],
            "category_id": row["category_id"],
            "recurring_id": row["recurring_id"],
            "name": row["name"],
            "month_year": row["month_year"],
            "expected_amount": row["expected_amount"],
            "expected_date": row["expected_date"],
            "actual_amount": row["actual_amount"],
            "actual_date": row["actual_date"],
            "has_milestones": bool(row["has_milestones"]),
            "notes": row["notes"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "category": {
                "id": row["cat_id"],
                "name": row["cat_name"],
                "type": row["cat_type"],
                "icon": row["cat_icon"],
                "color": row["cat_color"],
            },
            "milestones": []
        }

        # Get milestones if entry has them
        if entry["has_milestones"]:
            cursor.execute(
                "SELECT id, entry_id, name, expected_amount, expected_date, actual_amount, actual_date, sort_order, created_at FROM milestones WHERE entry_id = ? ORDER BY sort_order",
                (entry["id"],)
            )
            for ms_row in cursor.fetchall():
                entry["milestones"].append(dict(ms_row))

        entries.append(entry)

    conn.close()
    return entries


@app.post("/api/entries", status_code=201)
def create_entry(entry: EntryCreate):
    conn = get_db()
    cursor = conn.cursor()
    entry_id = str(uuid.uuid4())
    now = date.today().isoformat()

    cursor.execute(
        """INSERT INTO entries (id, category_id, recurring_id, name, month_year,
           expected_amount, expected_date, actual_amount, actual_date, has_milestones, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (entry_id, entry.category_id, entry.recurring_id, entry.name, entry.month_year,
         entry.expected_amount, entry.expected_date, entry.actual_amount, entry.actual_date,
         1 if entry.milestones else 0, entry.notes, now, now)
    )

    # Add milestones
    if entry.milestones:
        for i, ms in enumerate(entry.milestones):
            cursor.execute(
                """INSERT INTO milestones (id, entry_id, name, expected_amount, expected_date,
                   actual_amount, actual_date, sort_order, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), entry_id, ms.name, ms.expected_amount, ms.expected_date,
                 ms.actual_amount, ms.actual_date, ms.sort_order or i, now)
            )

    conn.commit()
    conn.close()

    # Fetch and return the created entry
    return get_entry_by_id(entry_id)


def get_entry_by_id(entry_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT e.id, e.category_id, e.recurring_id, e.name, e.month_year,
           e.expected_amount, e.expected_date, e.actual_amount, e.actual_date,
           e.has_milestones, e.notes, e.created_at, e.updated_at,
           c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
           FROM entries e JOIN categories c ON e.category_id = c.id
           WHERE e.id = ?""",
        (entry_id,)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    entry = {
        "id": row["id"], "category_id": row["category_id"], "recurring_id": row["recurring_id"],
        "name": row["name"], "month_year": row["month_year"], "expected_amount": row["expected_amount"],
        "expected_date": row["expected_date"], "actual_amount": row["actual_amount"],
        "actual_date": row["actual_date"], "has_milestones": bool(row["has_milestones"]),
        "notes": row["notes"], "created_at": row["created_at"], "updated_at": row["updated_at"],
        "category": {"id": row["cat_id"], "name": row["cat_name"], "type": row["cat_type"],
                     "icon": row["cat_icon"], "color": row["cat_color"]},
        "milestones": []
    }

    if entry["has_milestones"]:
        cursor.execute(
            "SELECT id, entry_id, name, expected_amount, expected_date, actual_amount, actual_date, sort_order, created_at FROM milestones WHERE entry_id = ?",
            (entry_id,)
        )
        for ms_row in cursor.fetchall():
            entry["milestones"].append(dict(ms_row))

    conn.close()
    return entry


@app.get("/api/entries/{entry_id}")
def get_entry(entry_id: str):
    entry = get_entry_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@app.put("/api/entries/{entry_id}")
def update_entry(entry_id: str, entry: EntryBase):
    conn = get_db()
    cursor = conn.cursor()
    now = date.today().isoformat()

    # Check if exists
    cursor.execute("SELECT id FROM entries WHERE id = ?", (entry_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    cursor.execute(
        """UPDATE entries SET category_id=?, name=?, month_year=?, expected_amount=?,
           expected_date=?, actual_amount=?, actual_date=?, notes=?, updated_at=?
           WHERE id=?""",
        (entry.category_id, entry.name, entry.month_year, entry.expected_amount,
         entry.expected_date, entry.actual_amount, entry.actual_date, entry.notes, now, entry_id)
    )
    conn.commit()
    conn.close()

    return get_entry_by_id(entry_id)


@app.delete("/api/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM entries WHERE id = ?", (entry_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    cursor.execute("DELETE FROM milestones WHERE entry_id = ?", (entry_id,))
    cursor.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()


@app.post("/api/entries/{entry_id}/confirm")
def confirm_entry(entry_id: str, confirm: EntryConfirm):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT expected_amount FROM entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    actual_amount = confirm.actual_amount if confirm.actual_amount is not None else row["expected_amount"]
    actual_date = confirm.actual_date or date.today().isoformat()

    cursor.execute(
        "UPDATE entries SET actual_amount=?, actual_date=?, updated_at=? WHERE id=?",
        (actual_amount, actual_date, date.today().isoformat(), entry_id)
    )
    conn.commit()
    conn.close()

    return get_entry_by_id(entry_id)


# Recurring endpoints
@app.get("/api/recurring")
def list_recurring():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT r.id, r.category_id, r.name, r.expected_amount, r.frequency,
           r.start_month, r.end_month, r.created_at,
           c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
           FROM recurring r JOIN categories c ON r.category_id = c.id
           ORDER BY r.name"""
    )

    items = []
    for row in cursor.fetchall():
        items.append({
            "id": row["id"], "category_id": row["category_id"], "name": row["name"],
            "expected_amount": row["expected_amount"], "frequency": row["frequency"],
            "start_month": row["start_month"], "end_month": row["end_month"], "created_at": row["created_at"],
            "category": {"id": row["cat_id"], "name": row["cat_name"], "type": row["cat_type"],
                        "icon": row["cat_icon"], "color": row["cat_color"]}
        })
    conn.close()
    return items


@app.post("/api/recurring", status_code=201)
def create_recurring(recurring: RecurringBase):
    conn = get_db()
    cursor = conn.cursor()
    rec_id = str(uuid.uuid4())
    now = date.today().isoformat()

    cursor.execute(
        """INSERT INTO recurring (id, category_id, name, expected_amount, frequency, start_month, end_month, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (rec_id, recurring.category_id, recurring.name, recurring.expected_amount,
         recurring.frequency, recurring.start_month, recurring.end_month, now)
    )
    conn.commit()

    # Fetch with category
    cursor.execute(
        """SELECT r.id, r.category_id, r.name, r.expected_amount, r.frequency,
           r.start_month, r.end_month, r.created_at,
           c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
           FROM recurring r JOIN categories c ON r.category_id = c.id
           WHERE r.id = ?""",
        (rec_id,)
    )
    row = cursor.fetchone()
    conn.close()
    return {
        "id": row["id"], "category_id": row["category_id"], "name": row["name"],
        "expected_amount": row["expected_amount"], "frequency": row["frequency"],
        "start_month": row["start_month"], "end_month": row["end_month"], "created_at": row["created_at"],
        "category": {"id": row["cat_id"], "name": row["cat_name"], "type": row["cat_type"],
                    "icon": row["cat_icon"], "color": row["cat_color"]}
    }


@app.delete("/api/recurring/{recurring_id}", status_code=204)
def delete_recurring(recurring_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM recurring WHERE id = ?", (recurring_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Recurring not found")

    cursor.execute("DELETE FROM recurring WHERE id = ?", (recurring_id,))
    conn.commit()
    conn.close()


# Settings endpoints
@app.get("/api/settings")
def list_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.put("/api/settings/{key}")
def update_setting(key: str, setting: dict):
    conn = get_db()
    cursor = conn.cursor()
    value = setting.get("value", "")

    cursor.execute("SELECT key FROM settings WHERE key = ?", (key,))
    if cursor.fetchone():
        cursor.execute("UPDATE settings SET value = ? WHERE key = ?", (value, key))
    else:
        cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (key, value))

    conn.commit()
    conn.close()
    return {"key": key, "value": value}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
