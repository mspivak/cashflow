import os
import uuid
import sqlite3
from datetime import date
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

_raw_turso_url = os.getenv("TURSO_DATABASE_URL", "")
TURSO_DATABASE_URL = _raw_turso_url.replace("libsql://", "https://") if _raw_turso_url else ""
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

LOCAL_DB_PATH = "/tmp/cashflow.db"

libsql_client = None
if TURSO_DATABASE_URL:
    try:
        import libsql_client
    except ImportError:
        TURSO_DATABASE_URL = ""

_db_initialized = False


class Row(dict):
    def __init__(self, columns, values):
        super().__init__(zip(columns, values))
        self._values = list(values)

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)


class DBWrapper:
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
    global _db_initialized

    if TURSO_DATABASE_URL:
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
        conn = sqlite3.connect(LOCAL_DB_PATH)
        conn.row_factory = sqlite3.Row
        wrapper = DBWrapper(conn, is_turso=False)
        if not _db_initialized:
            init_db_tables(wrapper)
            _db_initialized = True
        return wrapper


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
    cursor = conn.cursor()

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
        CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL REFERENCES categories(id),
            name TEXT NOT NULL,
            expected_amount REAL NOT NULL,
            frequency TEXT NOT NULL CHECK(frequency IN ('one-time', 'weekly', 'biweekly', 'monthly')),
            expected_day INTEGER,
            start_month TEXT NOT NULL,
            end_month TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            month_year TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    cursor.execute("SELECT COUNT(*) FROM categories")
    count = cursor.fetchone()[0]
    if count == 0:
        for cat in DEFAULT_CATEGORIES:
            cursor.execute(
                "INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), cat["name"], cat["type"], cat["icon"], cat["color"])
            )

    cursor.execute("SELECT COUNT(*) FROM settings WHERE key = 'starting_balance'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO settings (key, value) VALUES ('starting_balance', '0')")

    conn.commit()


class CategoryBase(BaseModel):
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: str

class PlanBase(BaseModel):
    category_id: str
    name: str
    expected_amount: float
    frequency: str
    expected_day: Optional[int] = None
    start_month: str
    end_month: Optional[str] = None
    notes: Optional[str] = None

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    expected_amount: Optional[float] = None
    frequency: Optional[str] = None
    expected_day: Optional[int] = None
    start_month: Optional[str] = None
    end_month: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class PlanResponse(PlanBase):
    id: str
    status: str
    created_at: str
    updated_at: str
    category: CategoryResponse

class EntryBase(BaseModel):
    plan_id: str
    month_year: str
    amount: float
    date: Optional[str] = None
    notes: Optional[str] = None

class EntryCreate(EntryBase):
    pass

class EntryUpdate(BaseModel):
    amount: Optional[float] = None
    date: Optional[str] = None
    notes: Optional[str] = None

class EntryResponse(EntryBase):
    id: str
    created_at: str
    plan: PlanResponse

class SettingResponse(BaseModel):
    key: str
    value: str


app = FastAPI(title="Cashflow Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


def get_plan_by_id(plan_id: str, conn=None):
    should_close = conn is None
    if conn is None:
        conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT p.id, p.category_id, p.name, p.expected_amount, p.frequency,
           p.expected_day, p.start_month, p.end_month, p.status, p.notes,
           p.created_at, p.updated_at,
           c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
           FROM plans p JOIN categories c ON p.category_id = c.id
           WHERE p.id = ?""",
        (plan_id,)
    )
    row = cursor.fetchone()
    if should_close:
        conn.close()
    if not row:
        return None

    return {
        "id": row["id"],
        "category_id": row["category_id"],
        "name": row["name"],
        "expected_amount": row["expected_amount"],
        "frequency": row["frequency"],
        "expected_day": row["expected_day"],
        "start_month": row["start_month"],
        "end_month": row["end_month"],
        "status": row["status"],
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
    }


@app.get("/api/plans")
def list_plans(status: Optional[str] = None, category_id: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT p.id, p.category_id, p.name, p.expected_amount, p.frequency,
               p.expected_day, p.start_month, p.end_month, p.status, p.notes,
               p.created_at, p.updated_at,
               c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
        FROM plans p
        JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    """
    params = []

    if status:
        query += " AND p.status = ?"
        params.append(status)
    if category_id:
        query += " AND p.category_id = ?"
        params.append(category_id)

    query += " ORDER BY p.name"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    plans = []
    for row in rows:
        plans.append({
            "id": row["id"],
            "category_id": row["category_id"],
            "name": row["name"],
            "expected_amount": row["expected_amount"],
            "frequency": row["frequency"],
            "expected_day": row["expected_day"],
            "start_month": row["start_month"],
            "end_month": row["end_month"],
            "status": row["status"],
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
        })

    return plans


@app.post("/api/plans", status_code=201)
def create_plan(plan: PlanCreate):
    conn = get_db()
    cursor = conn.cursor()
    plan_id = str(uuid.uuid4())
    now = date.today().isoformat()

    cursor.execute(
        """INSERT INTO plans (id, category_id, name, expected_amount, frequency,
           expected_day, start_month, end_month, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)""",
        (plan_id, plan.category_id, plan.name, plan.expected_amount, plan.frequency,
         plan.expected_day, plan.start_month, plan.end_month, plan.notes, now, now)
    )
    conn.commit()
    result = get_plan_by_id(plan_id, conn)
    conn.close()
    return result


@app.get("/api/plans/{plan_id}")
def get_plan(plan_id: str):
    plan = get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@app.put("/api/plans/{plan_id}")
def update_plan(plan_id: str, plan: PlanUpdate):
    conn = get_db()
    cursor = conn.cursor()
    now = date.today().isoformat()

    cursor.execute("SELECT id FROM plans WHERE id = ?", (plan_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    updates = []
    params = []
    data = plan.model_dump(exclude_unset=True)

    for key, value in data.items():
        updates.append(f"{key} = ?")
        params.append(value)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(plan_id)

        cursor.execute(
            f"UPDATE plans SET {', '.join(updates)} WHERE id = ?",
            params
        )
        conn.commit()

    result = get_plan_by_id(plan_id, conn)
    conn.close()
    return result


@app.delete("/api/plans/{plan_id}", status_code=204)
def delete_plan(plan_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM plans WHERE id = ?", (plan_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    cursor.execute("DELETE FROM entries WHERE plan_id = ?", (plan_id,))
    cursor.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
    conn.commit()
    conn.close()


def get_entry_by_id(entry_id: str, conn=None):
    should_close = conn is None
    if conn is None:
        conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT e.id, e.plan_id, e.month_year, e.amount, e.date, e.notes, e.created_at,
           p.id as plan_id, p.category_id, p.name as plan_name, p.expected_amount,
           p.frequency, p.expected_day, p.start_month, p.end_month, p.status as plan_status,
           p.notes as plan_notes, p.created_at as plan_created_at, p.updated_at as plan_updated_at,
           c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
           FROM entries e
           JOIN plans p ON e.plan_id = p.id
           JOIN categories c ON p.category_id = c.id
           WHERE e.id = ?""",
        (entry_id,)
    )
    row = cursor.fetchone()
    if should_close:
        conn.close()
    if not row:
        return None

    return {
        "id": row["id"],
        "plan_id": row["plan_id"],
        "month_year": row["month_year"],
        "amount": row["amount"],
        "date": row["date"],
        "notes": row["notes"],
        "created_at": row["created_at"],
        "plan": {
            "id": row["plan_id"],
            "category_id": row["category_id"],
            "name": row["plan_name"],
            "expected_amount": row["expected_amount"],
            "frequency": row["frequency"],
            "expected_day": row["expected_day"],
            "start_month": row["start_month"],
            "end_month": row["end_month"],
            "status": row["plan_status"],
            "notes": row["plan_notes"],
            "created_at": row["plan_created_at"],
            "updated_at": row["plan_updated_at"],
            "category": {
                "id": row["cat_id"],
                "name": row["cat_name"],
                "type": row["cat_type"],
                "icon": row["cat_icon"],
                "color": row["cat_color"],
            },
        },
    }


@app.get("/api/entries")
def list_entries(from_month: Optional[str] = None, to_month: Optional[str] = None, plan_id: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT e.id, e.plan_id, e.month_year, e.amount, e.date, e.notes, e.created_at,
               p.id as p_id, p.category_id, p.name as plan_name, p.expected_amount,
               p.frequency, p.expected_day, p.start_month, p.end_month, p.status as plan_status,
               p.notes as plan_notes, p.created_at as plan_created_at, p.updated_at as plan_updated_at,
               c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
        FROM entries e
        JOIN plans p ON e.plan_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    """
    params = []

    if from_month:
        query += " AND e.month_year >= ?"
        params.append(from_month)
    if to_month:
        query += " AND e.month_year <= ?"
        params.append(to_month)
    if plan_id:
        query += " AND e.plan_id = ?"
        params.append(plan_id)

    query += " ORDER BY e.month_year, e.created_at"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    entries = []
    for row in rows:
        entries.append({
            "id": row["id"],
            "plan_id": row["plan_id"],
            "month_year": row["month_year"],
            "amount": row["amount"],
            "date": row["date"],
            "notes": row["notes"],
            "created_at": row["created_at"],
            "plan": {
                "id": row["p_id"],
                "category_id": row["category_id"],
                "name": row["plan_name"],
                "expected_amount": row["expected_amount"],
                "frequency": row["frequency"],
                "expected_day": row["expected_day"],
                "start_month": row["start_month"],
                "end_month": row["end_month"],
                "status": row["plan_status"],
                "notes": row["plan_notes"],
                "created_at": row["plan_created_at"],
                "updated_at": row["plan_updated_at"],
                "category": {
                    "id": row["cat_id"],
                    "name": row["cat_name"],
                    "type": row["cat_type"],
                    "icon": row["cat_icon"],
                    "color": row["cat_color"],
                },
            },
        })

    return entries


@app.post("/api/entries", status_code=201)
def create_entry(entry: EntryCreate):
    conn = get_db()
    cursor = conn.cursor()
    entry_id = str(uuid.uuid4())
    now = date.today().isoformat()

    cursor.execute("SELECT id, frequency FROM plans WHERE id = ?", (entry.plan_id,))
    plan_row = cursor.fetchone()
    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    cursor.execute(
        """INSERT INTO entries (id, plan_id, month_year, amount, date, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (entry_id, entry.plan_id, entry.month_year, entry.amount, entry.date, entry.notes, now)
    )

    if plan_row["frequency"] == "one-time":
        cursor.execute(
            "UPDATE plans SET status = 'completed', updated_at = ? WHERE id = ?",
            (now, entry.plan_id)
        )

    conn.commit()
    result = get_entry_by_id(entry_id, conn)
    conn.close()
    return result


@app.get("/api/entries/{entry_id}")
def get_entry(entry_id: str):
    entry = get_entry_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@app.put("/api/entries/{entry_id}")
def update_entry(entry_id: str, entry: EntryUpdate):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM entries WHERE id = ?", (entry_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    updates = []
    params = []
    data = entry.model_dump(exclude_unset=True)

    for key, value in data.items():
        updates.append(f"{key} = ?")
        params.append(value)

    if updates:
        params.append(entry_id)
        cursor.execute(
            f"UPDATE entries SET {', '.join(updates)} WHERE id = ?",
            params
        )
        conn.commit()

    result = get_entry_by_id(entry_id, conn)
    conn.close()
    return result


@app.delete("/api/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM entries WHERE id = ?", (entry_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    cursor.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()


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
    value = setting["value"]

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
