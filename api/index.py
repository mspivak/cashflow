import os
import uuid
from datetime import date
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import libsql_experimental as libsql

# Database connection
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

def get_db():
    """Get database connection."""
    if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
        return libsql.connect(TURSO_DATABASE_URL, auth_token=TURSO_AUTH_TOKEN)
    else:
        # Fallback to local SQLite for development
        return libsql.connect("file:local.db")


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


def init_db():
    """Initialize database tables and seed data."""
    conn = get_db()

    # Create tables
    conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            icon TEXT,
            color TEXT
        )
    """)

    conn.execute("""
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

    conn.execute("""
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

    conn.execute("""
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

    conn.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    # Seed default categories if empty
    result = conn.execute("SELECT COUNT(*) FROM categories")
    count = result.fetchone()[0]
    if count == 0:
        for cat in DEFAULT_CATEGORIES:
            conn.execute(
                "INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)",
                [str(uuid.uuid4()), cat["name"], cat["type"], cat["icon"], cat["color"]]
            )

    # Seed default setting if not exists
    result = conn.execute("SELECT COUNT(*) FROM settings WHERE key = 'starting_balance'")
    if result.fetchone()[0] == 0:
        conn.execute("INSERT INTO settings (key, value) VALUES ('starting_balance', '0')")

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
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Cashflow Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper to convert row to dict
def row_to_dict(row, columns):
    return dict(zip(columns, row))


# Categories endpoints
@app.get("/api/categories")
def list_categories():
    conn = get_db()
    result = conn.execute("SELECT id, name, type, icon, color FROM categories ORDER BY type, name")
    columns = ["id", "name", "type", "icon", "color"]
    return [row_to_dict(row, columns) for row in result.fetchall()]


@app.post("/api/categories", status_code=201)
def create_category(category: CategoryBase):
    conn = get_db()
    cat_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)",
        [cat_id, category.name, category.type, category.icon, category.color]
    )
    conn.commit()
    return {"id": cat_id, **category.model_dump()}


# Entries endpoints
@app.get("/api/entries")
def list_entries(from_month: Optional[str] = None, to_month: Optional[str] = None):
    conn = get_db()

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

    result = conn.execute(query, params)
    rows = result.fetchall()

    entries = []
    for row in rows:
        entry = {
            "id": row[0],
            "category_id": row[1],
            "recurring_id": row[2],
            "name": row[3],
            "month_year": row[4],
            "expected_amount": row[5],
            "expected_date": row[6],
            "actual_amount": row[7],
            "actual_date": row[8],
            "has_milestones": bool(row[9]),
            "notes": row[10],
            "created_at": row[11],
            "updated_at": row[12],
            "category": {
                "id": row[13],
                "name": row[14],
                "type": row[15],
                "icon": row[16],
                "color": row[17],
            },
            "milestones": []
        }

        # Get milestones if entry has them
        if entry["has_milestones"]:
            ms_result = conn.execute(
                "SELECT id, entry_id, name, expected_amount, expected_date, actual_amount, actual_date, sort_order, created_at FROM milestones WHERE entry_id = ? ORDER BY sort_order",
                [entry["id"]]
            )
            for ms_row in ms_result.fetchall():
                entry["milestones"].append({
                    "id": ms_row[0],
                    "entry_id": ms_row[1],
                    "name": ms_row[2],
                    "expected_amount": ms_row[3],
                    "expected_date": ms_row[4],
                    "actual_amount": ms_row[5],
                    "actual_date": ms_row[6],
                    "sort_order": ms_row[7],
                    "created_at": ms_row[8],
                })

        entries.append(entry)

    return entries


@app.post("/api/entries", status_code=201)
def create_entry(entry: EntryCreate):
    conn = get_db()
    entry_id = str(uuid.uuid4())
    now = date.today().isoformat()

    conn.execute(
        """INSERT INTO entries (id, category_id, recurring_id, name, month_year,
           expected_amount, expected_date, actual_amount, actual_date, has_milestones, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [entry_id, entry.category_id, entry.recurring_id, entry.name, entry.month_year,
         entry.expected_amount, entry.expected_date, entry.actual_amount, entry.actual_date,
         1 if entry.milestones else 0, entry.notes, now, now]
    )

    # Add milestones
    if entry.milestones:
        for i, ms in enumerate(entry.milestones):
            conn.execute(
                """INSERT INTO milestones (id, entry_id, name, expected_amount, expected_date,
                   actual_amount, actual_date, sort_order, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [str(uuid.uuid4()), entry_id, ms.name, ms.expected_amount, ms.expected_date,
                 ms.actual_amount, ms.actual_date, ms.sort_order or i, now]
            )

    conn.commit()

    # Fetch and return the created entry
    return get_entry_by_id(conn, entry_id)


def get_entry_by_id(conn, entry_id):
    result = conn.execute(
        """SELECT e.id, e.category_id, e.recurring_id, e.name, e.month_year,
           e.expected_amount, e.expected_date, e.actual_amount, e.actual_date,
           e.has_milestones, e.notes, e.created_at, e.updated_at,
           c.id, c.name, c.type, c.icon, c.color
           FROM entries e JOIN categories c ON e.category_id = c.id
           WHERE e.id = ?""",
        [entry_id]
    )
    row = result.fetchone()
    if not row:
        return None

    entry = {
        "id": row[0], "category_id": row[1], "recurring_id": row[2], "name": row[3],
        "month_year": row[4], "expected_amount": row[5], "expected_date": row[6],
        "actual_amount": row[7], "actual_date": row[8], "has_milestones": bool(row[9]),
        "notes": row[10], "created_at": row[11], "updated_at": row[12],
        "category": {"id": row[13], "name": row[14], "type": row[15], "icon": row[16], "color": row[17]},
        "milestones": []
    }

    if entry["has_milestones"]:
        ms_result = conn.execute(
            "SELECT id, entry_id, name, expected_amount, expected_date, actual_amount, actual_date, sort_order, created_at FROM milestones WHERE entry_id = ?",
            [entry_id]
        )
        for ms_row in ms_result.fetchall():
            entry["milestones"].append({
                "id": ms_row[0], "entry_id": ms_row[1], "name": ms_row[2],
                "expected_amount": ms_row[3], "expected_date": ms_row[4],
                "actual_amount": ms_row[5], "actual_date": ms_row[6],
                "sort_order": ms_row[7], "created_at": ms_row[8]
            })

    return entry


@app.get("/api/entries/{entry_id}")
def get_entry(entry_id: str):
    conn = get_db()
    entry = get_entry_by_id(conn, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@app.put("/api/entries/{entry_id}")
def update_entry(entry_id: str, entry: EntryBase):
    conn = get_db()
    now = date.today().isoformat()

    # Check if exists
    result = conn.execute("SELECT id FROM entries WHERE id = ?", [entry_id])
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Entry not found")

    conn.execute(
        """UPDATE entries SET category_id=?, name=?, month_year=?, expected_amount=?,
           expected_date=?, actual_amount=?, actual_date=?, notes=?, updated_at=?
           WHERE id=?""",
        [entry.category_id, entry.name, entry.month_year, entry.expected_amount,
         entry.expected_date, entry.actual_amount, entry.actual_date, entry.notes, now, entry_id]
    )
    conn.commit()

    return get_entry_by_id(conn, entry_id)


@app.delete("/api/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: str):
    conn = get_db()
    result = conn.execute("SELECT id FROM entries WHERE id = ?", [entry_id])
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Entry not found")

    conn.execute("DELETE FROM milestones WHERE entry_id = ?", [entry_id])
    conn.execute("DELETE FROM entries WHERE id = ?", [entry_id])
    conn.commit()


@app.post("/api/entries/{entry_id}/confirm")
def confirm_entry(entry_id: str, confirm: EntryConfirm):
    conn = get_db()

    result = conn.execute("SELECT expected_amount FROM entries WHERE id = ?", [entry_id])
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Entry not found")

    actual_amount = confirm.actual_amount if confirm.actual_amount is not None else row[0]
    actual_date = confirm.actual_date or date.today().isoformat()

    conn.execute(
        "UPDATE entries SET actual_amount=?, actual_date=?, updated_at=? WHERE id=?",
        [actual_amount, actual_date, date.today().isoformat(), entry_id]
    )
    conn.commit()

    return get_entry_by_id(conn, entry_id)


# Recurring endpoints
@app.get("/api/recurring")
def list_recurring():
    conn = get_db()
    result = conn.execute(
        """SELECT r.id, r.category_id, r.name, r.expected_amount, r.frequency,
           r.start_month, r.end_month, r.created_at,
           c.id, c.name, c.type, c.icon, c.color
           FROM recurring r JOIN categories c ON r.category_id = c.id
           ORDER BY r.name"""
    )

    items = []
    for row in result.fetchall():
        items.append({
            "id": row[0], "category_id": row[1], "name": row[2],
            "expected_amount": row[3], "frequency": row[4],
            "start_month": row[5], "end_month": row[6], "created_at": row[7],
            "category": {"id": row[8], "name": row[9], "type": row[10], "icon": row[11], "color": row[12]}
        })
    return items


@app.post("/api/recurring", status_code=201)
def create_recurring(recurring: RecurringBase):
    conn = get_db()
    rec_id = str(uuid.uuid4())
    now = date.today().isoformat()

    conn.execute(
        """INSERT INTO recurring (id, category_id, name, expected_amount, frequency, start_month, end_month, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [rec_id, recurring.category_id, recurring.name, recurring.expected_amount,
         recurring.frequency, recurring.start_month, recurring.end_month, now]
    )
    conn.commit()

    # Fetch with category
    result = conn.execute(
        """SELECT r.id, r.category_id, r.name, r.expected_amount, r.frequency,
           r.start_month, r.end_month, r.created_at,
           c.id, c.name, c.type, c.icon, c.color
           FROM recurring r JOIN categories c ON r.category_id = c.id
           WHERE r.id = ?""",
        [rec_id]
    )
    row = result.fetchone()
    return {
        "id": row[0], "category_id": row[1], "name": row[2],
        "expected_amount": row[3], "frequency": row[4],
        "start_month": row[5], "end_month": row[6], "created_at": row[7],
        "category": {"id": row[8], "name": row[9], "type": row[10], "icon": row[11], "color": row[12]}
    }


@app.delete("/api/recurring/{recurring_id}", status_code=204)
def delete_recurring(recurring_id: str):
    conn = get_db()
    result = conn.execute("SELECT id FROM recurring WHERE id = ?", [recurring_id])
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Recurring not found")

    conn.execute("DELETE FROM recurring WHERE id = ?", [recurring_id])
    conn.commit()


# Settings endpoints
@app.get("/api/settings")
def list_settings():
    conn = get_db()
    result = conn.execute("SELECT key, value FROM settings")
    return [{"key": row[0], "value": row[1]} for row in result.fetchall()]


@app.put("/api/settings/{key}")
def update_setting(key: str, setting: dict):
    conn = get_db()
    value = setting.get("value", "")

    result = conn.execute("SELECT key FROM settings WHERE key = ?", [key])
    if result.fetchone():
        conn.execute("UPDATE settings SET value = ? WHERE key = ?", [value, key])
    else:
        conn.execute("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value])

    conn.commit()
    return {"key": key, "value": value}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
