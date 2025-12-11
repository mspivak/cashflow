import os
import uuid
import traceback
from datetime import date, datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from httpx import AsyncClient
from jose import jwt
from itsdangerous import URLSafeTimedSerializer
import libsql_client

DATABASE_URL = os.getenv("DATABASE_URL", "")
DATABASE_AUTH_TOKEN = os.getenv("DATABASE_AUTH_TOKEN", "")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
APP_URL = os.getenv("APP_URL")
if not APP_URL:
    raise RuntimeError("APP_URL environment variable is required")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30

state_serializer = URLSafeTimedSerializer(JWT_SECRET_KEY)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")
if not DATABASE_AUTH_TOKEN and not DATABASE_URL.startswith("file:"):
    raise RuntimeError("DATABASE_AUTH_TOKEN environment variable is required for remote databases")

_db_client = libsql_client.create_client_sync(
    url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN or None
)

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
            return [
                Row(self._last_result.columns, row) for row in self._last_result.rows
            ]
        return self._cursor.fetchall()

    def commit(self):
        if not self.is_turso:
            self.conn.commit()

    def close(self):
        if not self.is_turso:
            self.conn.close()


def get_db():
    global _db_initialized
    wrapper = DBWrapper(_db_client, is_turso=True)
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

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            avatar_url TEXT,
            provider TEXT NOT NULL,
            provider_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(provider, provider_id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cashflows (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            owner_id TEXT NOT NULL REFERENCES users(id),
            share_id TEXT UNIQUE,
            is_public INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cashflow_members (
            id TEXT PRIMARY KEY,
            cashflow_id TEXT NOT NULL REFERENCES cashflows(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK(role IN ('owner', 'editor', 'viewer')),
            invited_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(cashflow_id, user_id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            cashflow_id TEXT NOT NULL REFERENCES cashflows(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            icon TEXT,
            color TEXT,
            UNIQUE(cashflow_id, name, type)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY,
            cashflow_id TEXT NOT NULL REFERENCES cashflows(id) ON DELETE CASCADE,
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
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            month_year TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            cashflow_id TEXT NOT NULL REFERENCES cashflows(id) ON DELETE CASCADE,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (cashflow_id, key)
        )
    """
    )

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


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    provider: str
    created_at: str


class CashflowBase(BaseModel):
    name: str
    description: Optional[str] = None


class CashflowCreate(CashflowBase):
    pass


class CashflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CashflowResponse(CashflowBase):
    id: str
    owner_id: str
    role: str
    share_id: Optional[str]
    is_public: bool
    created_at: str
    updated_at: str


class CashflowShareSettings(BaseModel):
    is_public: bool


class CashflowMemberBase(BaseModel):
    email: str
    role: str


class CashflowMemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    role: str
    invited_at: str


class MemberRoleUpdate(BaseModel):
    role: str


app = FastAPI(title="Cashflow Tracker API")


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            return JSONResponse(
                status_code=422,
                content={
                    "detail": f"{type(exc).__name__}: {str(exc)}",
                    "traceback": tb_str,
                },
            )


app.add_middleware(ErrorHandlerMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_jwt_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> Optional[str]:
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    return payload["sub"]


def get_current_user(request: Request) -> Optional[str]:
    token = request.cookies.get("session_token")
    if not token:
        return None
    return verify_jwt_token(token)


def require_auth(request: Request) -> str:
    user_id = get_current_user(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


def get_user_by_id(user_id: str, conn=None):
    should_close = conn is None
    if conn is None:
        conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, name, avatar_url, provider, created_at FROM users WHERE id = ?",
        (user_id,),
    )
    row = cursor.fetchone()
    if should_close:
        conn.close()
    if not row:
        return None
    return dict(row)


def get_or_create_user(
    email: str,
    name: Optional[str],
    avatar_url: Optional[str],
    provider: str,
    provider_id: str,
):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, email, name, avatar_url, provider, created_at FROM users WHERE provider = ? AND provider_id = ?",
        (provider, provider_id),
    )
    row = cursor.fetchone()

    if row:
        user = dict(row)
        conn.close()
        return user, False

    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(
            status_code=400, detail="Email already registered with different provider"
        )

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    cursor.execute(
        "INSERT INTO users (id, email, name, avatar_url, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, email, name, avatar_url, provider, provider_id, now),
    )
    conn.commit()

    user = {
        "id": user_id,
        "email": email,
        "name": name,
        "avatar_url": avatar_url,
        "provider": provider,
        "created_at": now,
    }
    conn.close()
    return user, True


def create_default_cashflow(user_id: str, user_name: Optional[str]):
    conn = get_db()
    cursor = conn.cursor()

    cashflow_id = str(uuid.uuid4())
    share_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    name = f"{user_name}'s Budget" if user_name else "My Budget"

    cursor.execute(
        "INSERT INTO cashflows (id, name, description, owner_id, share_id, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
        (cashflow_id, name, None, user_id, share_id, now, now),
    )

    member_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO cashflow_members (id, cashflow_id, user_id, role, invited_at) VALUES (?, ?, ?, 'owner', ?)",
        (member_id, cashflow_id, user_id, now),
    )

    for cat in DEFAULT_CATEGORIES:
        cursor.execute(
            "INSERT INTO categories (id, cashflow_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                cashflow_id,
                cat["name"],
                cat["type"],
                cat["icon"],
                cat["color"],
            ),
        )

    cursor.execute(
        "INSERT INTO settings (cashflow_id, key, value) VALUES (?, 'starting_balance', '0')",
        (cashflow_id,),
    )

    conn.commit()
    conn.close()
    return cashflow_id


def check_cashflow_access(
    user_id: str, cashflow_id: str, required_roles: List[str] = None
):
    if required_roles is None:
        required_roles = ["owner", "editor", "viewer"]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role FROM cashflow_members WHERE cashflow_id = ? AND user_id = ?",
        (cashflow_id, user_id),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=403, detail="Access denied to this cashflow")

    if row["role"] not in required_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return row["role"]


@app.get("/api/auth/login/{provider}")
async def auth_login(provider: str):
    if provider == "google":
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=400, detail="Google OAuth not configured")
        state = state_serializer.dumps({"provider": "google"})
        redirect_uri = f"{APP_URL}/api/auth/callback/google"
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + "&".join(
            f"{k}={v}" for k, v in params.items()
        )
        return RedirectResponse(url=url)
    elif provider == "github":
        if not GITHUB_CLIENT_ID:
            raise HTTPException(status_code=400, detail="GitHub OAuth not configured")
        state = state_serializer.dumps({"provider": "github"})
        redirect_uri = f"{APP_URL}/api/auth/callback/github"
        params = {
            "client_id": GITHUB_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "user:email",
            "state": state,
        }
        url = "https://github.com/login/oauth/authorize?" + "&".join(
            f"{k}={v}" for k, v in params.items()
        )
        return RedirectResponse(url=url)
    else:
        raise HTTPException(status_code=400, detail="Invalid provider")


@app.get("/api/auth/callback/{provider}")
async def auth_callback(provider: str, code: str, state: str):
    try:
        state_data = state_serializer.loads(state, max_age=600)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    if state_data["provider"] != provider:
        raise HTTPException(status_code=400, detail="State provider mismatch")

    redirect_uri = f"{APP_URL}/api/auth/callback/{provider}"

    async with AsyncClient() as http_client:
        if provider == "google":
            token_resp = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            token_data = token_resp.json()
            if "error" in token_data:
                raise HTTPException(status_code=400, detail=token_data["error_description"])
            access_token = token_data["access_token"]

            user_resp = await http_client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_info = user_resp.json()
            email = user_info["email"]
            name = user_info.get("name")
            avatar_url = user_info.get("picture")
            provider_id = user_info["id"]

        elif provider == "github":
            token_resp = await http_client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            token_data = token_resp.json()
            if "error" in token_data:
                raise HTTPException(status_code=400, detail=token_data["error_description"])
            access_token = token_data["access_token"]

            headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
            user_resp = await http_client.get("https://api.github.com/user", headers=headers)
            user_data = user_resp.json()
            email = user_data.get("email")
            if not email:
                emails_resp = await http_client.get("https://api.github.com/user/emails", headers=headers)
                emails = emails_resp.json()
                primary = next((e for e in emails if e["primary"]), emails[0] if emails else None)
                email = primary["email"] if primary else None
            if not email:
                raise HTTPException(status_code=400, detail="Could not get email from GitHub")
            name = user_data.get("name") or user_data.get("login")
            avatar_url = user_data.get("avatar_url")
            provider_id = str(user_data["id"])
        else:
            raise HTTPException(status_code=400, detail="Invalid provider")

    user, is_new = get_or_create_user(email, name, avatar_url, provider, provider_id)

    if is_new:
        create_default_cashflow(user["id"], user.get("name"))

    jwt_token = create_jwt_token(user["id"])

    response = RedirectResponse(url=APP_URL, status_code=302)
    is_secure = APP_URL.startswith("https://")
    response.set_cookie(
        key="session_token",
        value=jwt_token,
        httponly=True,
        secure=is_secure,
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        samesite="lax",
        path="/",
    )
    return response


@app.post("/api/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}


@app.get("/api/auth/me")
def auth_me(request: Request):
    user_id = get_current_user(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@app.get("/api/cashflows")
def list_cashflows(request: Request):
    user_id = require_auth(request)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT c.id, c.name, c.description, c.owner_id, c.share_id, c.is_public, c.created_at, c.updated_at, cm.role
           FROM cashflows c
           JOIN cashflow_members cm ON c.id = cm.cashflow_id
           WHERE cm.user_id = ?
           ORDER BY c.name""",
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    return [{**dict(row), "is_public": bool(row["is_public"])} for row in rows]


@app.post("/api/cashflows", status_code=201)
def create_cashflow(cashflow: CashflowCreate, request: Request):
    user_id = require_auth(request)

    conn = get_db()
    cursor = conn.cursor()

    cashflow_id = str(uuid.uuid4())
    share_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute(
        "INSERT INTO cashflows (id, name, description, owner_id, share_id, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
        (cashflow_id, cashflow.name, cashflow.description, user_id, share_id, now, now),
    )

    member_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO cashflow_members (id, cashflow_id, user_id, role, invited_at) VALUES (?, ?, ?, 'owner', ?)",
        (member_id, cashflow_id, user_id, now),
    )

    for cat in DEFAULT_CATEGORIES:
        cursor.execute(
            "INSERT INTO categories (id, cashflow_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                cashflow_id,
                cat["name"],
                cat["type"],
                cat["icon"],
                cat["color"],
            ),
        )

    cursor.execute(
        "INSERT INTO settings (cashflow_id, key, value) VALUES (?, 'starting_balance', '0')",
        (cashflow_id,),
    )

    conn.commit()
    conn.close()

    return {
        "id": cashflow_id,
        "name": cashflow.name,
        "description": cashflow.description,
        "owner_id": user_id,
        "role": "owner",
        "share_id": share_id,
        "is_public": False,
        "created_at": now,
        "updated_at": now,
    }


@app.get("/api/cashflows/{cashflow_id}")
def get_cashflow(cashflow_id: str, request: Request):
    user_id = require_auth(request)
    role = check_cashflow_access(user_id, cashflow_id)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, description, owner_id, share_id, is_public, created_at, updated_at FROM cashflows WHERE id = ?",
        (cashflow_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Cashflow not found")

    result = dict(row)
    result["role"] = role
    result["is_public"] = bool(result["is_public"])
    return result


@app.put("/api/cashflows/{cashflow_id}")
def update_cashflow(cashflow_id: str, cashflow: CashflowUpdate, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    updates = []
    params = []
    data = cashflow.model_dump(exclude_unset=True)

    for key, value in data.items():
        updates.append(f"{key} = ?")
        params.append(value)

    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(cashflow_id)

        cursor.execute(
            f"UPDATE cashflows SET {', '.join(updates)} WHERE id = ?", params
        )
        conn.commit()

    cursor.execute(
        "SELECT id, name, description, owner_id, share_id, is_public, created_at, updated_at FROM cashflows WHERE id = ?",
        (cashflow_id,),
    )
    row = cursor.fetchone()
    conn.close()

    result = dict(row)
    result["role"] = "owner"
    result["is_public"] = bool(result["is_public"])
    return result


@app.delete("/api/cashflows/{cashflow_id}", status_code=204)
def delete_cashflow(cashflow_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner"])

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM settings WHERE cashflow_id = ?", (cashflow_id,))
    cursor.execute(
        "DELETE FROM entries WHERE plan_id IN (SELECT id FROM plans WHERE cashflow_id = ?)",
        (cashflow_id,),
    )
    cursor.execute("DELETE FROM plans WHERE cashflow_id = ?", (cashflow_id,))
    cursor.execute("DELETE FROM categories WHERE cashflow_id = ?", (cashflow_id,))
    cursor.execute("DELETE FROM cashflow_members WHERE cashflow_id = ?", (cashflow_id,))
    cursor.execute("DELETE FROM cashflows WHERE id = ?", (cashflow_id,))

    conn.commit()
    conn.close()


@app.get("/api/cashflows/{cashflow_id}/members")
def list_cashflow_members(cashflow_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT cm.id, cm.user_id, u.email, u.name, u.avatar_url, cm.role, cm.invited_at
           FROM cashflow_members cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.cashflow_id = ?
           ORDER BY cm.role, u.name""",
        (cashflow_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


@app.post("/api/cashflows/{cashflow_id}/members", status_code=201)
def invite_member(cashflow_id: str, member: CashflowMemberBase, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner"])

    if member.role not in ["editor", "viewer"]:
        raise HTTPException(
            status_code=400, detail="Invalid role. Must be 'editor' or 'viewer'"
        )

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, name, avatar_url FROM users WHERE email = ?", (member.email,)
    )
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        raise HTTPException(
            status_code=404, detail="User not found. They must sign up first."
        )

    target_user_id = user_row["id"]

    cursor.execute(
        "SELECT id FROM cashflow_members WHERE cashflow_id = ? AND user_id = ?",
        (cashflow_id, target_user_id),
    )
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="User is already a member")

    member_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute(
        "INSERT INTO cashflow_members (id, cashflow_id, user_id, role, invited_at) VALUES (?, ?, ?, ?, ?)",
        (member_id, cashflow_id, target_user_id, member.role, now),
    )
    conn.commit()
    conn.close()

    return {
        "id": member_id,
        "user_id": target_user_id,
        "email": member.email,
        "name": user_row["name"],
        "avatar_url": user_row["avatar_url"],
        "role": member.role,
        "invited_at": now,
    }


@app.put("/api/cashflows/{cashflow_id}/members/{member_user_id}")
def update_member_role(
    cashflow_id: str,
    member_user_id: str,
    role_update: MemberRoleUpdate,
    request: Request,
):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner"])

    if role_update.role not in ["editor", "viewer"]:
        raise HTTPException(
            status_code=400, detail="Invalid role. Must be 'editor' or 'viewer'"
        )

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT role FROM cashflow_members WHERE cashflow_id = ? AND user_id = ?",
        (cashflow_id, member_user_id),
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Member not found")

    if row["role"] == "owner":
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot change owner's role")

    cursor.execute(
        "UPDATE cashflow_members SET role = ? WHERE cashflow_id = ? AND user_id = ?",
        (role_update.role, cashflow_id, member_user_id),
    )
    conn.commit()
    conn.close()

    return {"message": "Role updated"}


@app.delete("/api/cashflows/{cashflow_id}/members/{member_user_id}", status_code=204)
def remove_member(cashflow_id: str, member_user_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner"])

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT role FROM cashflow_members WHERE cashflow_id = ? AND user_id = ?",
        (cashflow_id, member_user_id),
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Member not found")

    if row["role"] == "owner":
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot remove owner")

    cursor.execute(
        "DELETE FROM cashflow_members WHERE cashflow_id = ? AND user_id = ?",
        (cashflow_id, member_user_id),
    )
    conn.commit()
    conn.close()


@app.get("/api/cashflows/{cashflow_id}/categories")
def list_categories(cashflow_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, cashflow_id, name, type, icon, color FROM categories WHERE cashflow_id = ? ORDER BY type, name",
        (cashflow_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/cashflows/{cashflow_id}/categories", status_code=201)
def create_category(cashflow_id: str, category: CategoryBase, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()
    cat_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO categories (id, cashflow_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)",
        (
            cat_id,
            cashflow_id,
            category.name,
            category.type,
            category.icon,
            category.color,
        ),
    )
    conn.commit()
    conn.close()
    return {"id": cat_id, "cashflow_id": cashflow_id, **category.model_dump()}


def get_plan_by_id(plan_id: str, conn=None):
    should_close = conn is None
    if conn is None:
        conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT p.id, p.cashflow_id, p.category_id, p.name, p.expected_amount, p.frequency,
           p.expected_day, p.start_month, p.end_month, p.status, p.notes,
           p.created_at, p.updated_at,
           c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
           FROM plans p JOIN categories c ON p.category_id = c.id
           WHERE p.id = ?""",
        (plan_id,),
    )
    row = cursor.fetchone()
    if should_close:
        conn.close()
    if not row:
        return None

    return {
        "id": row["id"],
        "cashflow_id": row["cashflow_id"],
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


@app.get("/api/cashflows/{cashflow_id}/plans")
def list_plans(
    cashflow_id: str,
    request: Request,
    status: Optional[str] = None,
    category_id: Optional[str] = None,
):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id)

    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT p.id, p.cashflow_id, p.category_id, p.name, p.expected_amount, p.frequency,
               p.expected_day, p.start_month, p.end_month, p.status, p.notes,
               p.created_at, p.updated_at,
               c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
        FROM plans p
        JOIN categories c ON p.category_id = c.id
        WHERE p.cashflow_id = ?
    """
    params = [cashflow_id]

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
        plans.append(
            {
                "id": row["id"],
                "cashflow_id": row["cashflow_id"],
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
        )

    return plans


@app.post("/api/cashflows/{cashflow_id}/plans", status_code=201)
def create_plan(cashflow_id: str, plan: PlanCreate, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()
    plan_id = str(uuid.uuid4())
    now = date.today().isoformat()

    cursor.execute(
        """INSERT INTO plans (id, cashflow_id, category_id, name, expected_amount, frequency,
           expected_day, start_month, end_month, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)""",
        (
            plan_id,
            cashflow_id,
            plan.category_id,
            plan.name,
            plan.expected_amount,
            plan.frequency,
            plan.expected_day,
            plan.start_month,
            plan.end_month,
            plan.notes,
            now,
            now,
        ),
    )
    conn.commit()
    result = get_plan_by_id(plan_id, conn)
    conn.close()
    return result


@app.get("/api/cashflows/{cashflow_id}/plans/{plan_id}")
def get_plan(cashflow_id: str, plan_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id)

    plan = get_plan_by_id(plan_id)
    if not plan or plan["cashflow_id"] != cashflow_id:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@app.put("/api/cashflows/{cashflow_id}/plans/{plan_id}")
def update_plan(cashflow_id: str, plan_id: str, plan: PlanUpdate, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()
    now = date.today().isoformat()

    cursor.execute(
        "SELECT id FROM plans WHERE id = ? AND cashflow_id = ?", (plan_id, cashflow_id)
    )
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

        cursor.execute(f"UPDATE plans SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    result = get_plan_by_id(plan_id, conn)
    conn.close()
    return result


@app.delete("/api/cashflows/{cashflow_id}/plans/{plan_id}", status_code=204)
def delete_plan(cashflow_id: str, plan_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM plans WHERE id = ? AND cashflow_id = ?", (plan_id, cashflow_id)
    )
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
           p.id as p_id, p.cashflow_id, p.category_id, p.name as plan_name, p.expected_amount,
           p.frequency, p.expected_day, p.start_month, p.end_month, p.status as plan_status,
           p.notes as plan_notes, p.created_at as plan_created_at, p.updated_at as plan_updated_at,
           c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
           FROM entries e
           JOIN plans p ON e.plan_id = p.id
           JOIN categories c ON p.category_id = c.id
           WHERE e.id = ?""",
        (entry_id,),
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
        "cashflow_id": row["cashflow_id"],
        "plan": {
            "id": row["p_id"],
            "cashflow_id": row["cashflow_id"],
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


@app.get("/api/cashflows/{cashflow_id}/entries")
def list_entries(
    cashflow_id: str,
    request: Request,
    from_month: Optional[str] = None,
    to_month: Optional[str] = None,
    plan_id: Optional[str] = None,
):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id)

    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT e.id, e.plan_id, e.month_year, e.amount, e.date, e.notes, e.created_at,
               p.id as p_id, p.cashflow_id, p.category_id, p.name as plan_name, p.expected_amount,
               p.frequency, p.expected_day, p.start_month, p.end_month, p.status as plan_status,
               p.notes as plan_notes, p.created_at as plan_created_at, p.updated_at as plan_updated_at,
               c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
        FROM entries e
        JOIN plans p ON e.plan_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.cashflow_id = ?
    """
    params = [cashflow_id]

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
        entries.append(
            {
                "id": row["id"],
                "plan_id": row["plan_id"],
                "month_year": row["month_year"],
                "amount": row["amount"],
                "date": row["date"],
                "notes": row["notes"],
                "created_at": row["created_at"],
                "plan": {
                    "id": row["p_id"],
                    "cashflow_id": row["cashflow_id"],
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
        )

    return entries


@app.post("/api/cashflows/{cashflow_id}/entries", status_code=201)
def create_entry(cashflow_id: str, entry: EntryCreate, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()
    entry_id = str(uuid.uuid4())
    now = date.today().isoformat()

    cursor.execute(
        "SELECT id, frequency FROM plans WHERE id = ? AND cashflow_id = ?",
        (entry.plan_id, cashflow_id),
    )
    plan_row = cursor.fetchone()
    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    cursor.execute(
        """INSERT INTO entries (id, plan_id, month_year, amount, date, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            entry_id,
            entry.plan_id,
            entry.month_year,
            entry.amount,
            entry.date,
            entry.notes,
            now,
        ),
    )

    if plan_row["frequency"] == "one-time":
        cursor.execute(
            "UPDATE plans SET status = 'completed', updated_at = ? WHERE id = ?",
            (now, entry.plan_id),
        )

    conn.commit()
    result = get_entry_by_id(entry_id, conn)
    conn.close()
    return result


@app.get("/api/cashflows/{cashflow_id}/entries/{entry_id}")
def get_entry(cashflow_id: str, entry_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id)

    entry = get_entry_by_id(entry_id)
    if not entry or entry["cashflow_id"] != cashflow_id:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@app.put("/api/cashflows/{cashflow_id}/entries/{entry_id}")
def update_entry(cashflow_id: str, entry_id: str, entry: EntryUpdate, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """SELECT e.id FROM entries e
           JOIN plans p ON e.plan_id = p.id
           WHERE e.id = ? AND p.cashflow_id = ?""",
        (entry_id, cashflow_id),
    )
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
        cursor.execute(f"UPDATE entries SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    result = get_entry_by_id(entry_id, conn)
    conn.close()
    return result


@app.delete("/api/cashflows/{cashflow_id}/entries/{entry_id}", status_code=204)
def delete_entry(cashflow_id: str, entry_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT e.id FROM entries e
           JOIN plans p ON e.plan_id = p.id
           WHERE e.id = ? AND p.cashflow_id = ?""",
        (entry_id, cashflow_id),
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    cursor.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()


@app.get("/api/cashflows/{cashflow_id}/settings")
def list_settings(cashflow_id: str, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT key, value FROM settings WHERE cashflow_id = ?", (cashflow_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.put("/api/cashflows/{cashflow_id}/settings/{key}")
def update_setting(cashflow_id: str, key: str, setting: dict, request: Request):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner", "editor"])

    conn = get_db()
    cursor = conn.cursor()
    value = setting["value"]

    cursor.execute(
        "SELECT key FROM settings WHERE cashflow_id = ? AND key = ?", (cashflow_id, key)
    )
    if cursor.fetchone():
        cursor.execute(
            "UPDATE settings SET value = ? WHERE cashflow_id = ? AND key = ?",
            (value, cashflow_id, key),
        )
    else:
        cursor.execute(
            "INSERT INTO settings (cashflow_id, key, value) VALUES (?, ?, ?)",
            (cashflow_id, key, value),
        )

    conn.commit()
    conn.close()
    return {"key": key, "value": value}


@app.put("/api/cashflows/{cashflow_id}/share")
def update_share_settings(
    cashflow_id: str, settings: CashflowShareSettings, request: Request
):
    user_id = require_auth(request)
    check_cashflow_access(user_id, cashflow_id, ["owner"])

    conn = get_db()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    cursor.execute(
        "UPDATE cashflows SET is_public = ?, updated_at = ? WHERE id = ?",
        (1 if settings.is_public else 0, now, cashflow_id),
    )
    conn.commit()

    cursor.execute(
        "SELECT id, name, description, owner_id, share_id, is_public, created_at, updated_at FROM cashflows WHERE id = ?",
        (cashflow_id,),
    )
    row = cursor.fetchone()
    conn.close()

    result = dict(row)
    result["role"] = "owner"
    result["is_public"] = bool(result["is_public"])
    return result


def get_public_cashflow(share_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, description, owner_id, share_id, is_public, created_at, updated_at FROM cashflows WHERE share_id = ?",
        (share_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Cashflow not found")

    if not row["is_public"]:
        raise HTTPException(status_code=404, detail="Cashflow not found")

    return dict(row)


@app.get("/api/public/{share_id}")
def get_public_cashflow_details(share_id: str):
    cashflow = get_public_cashflow(share_id)
    return {
        "id": cashflow["id"],
        "name": cashflow["name"],
        "description": cashflow["description"],
        "share_id": cashflow["share_id"],
        "is_public": bool(cashflow["is_public"]),
        "created_at": cashflow["created_at"],
        "updated_at": cashflow["updated_at"],
    }


@app.get("/api/public/{share_id}/categories")
def list_public_categories(share_id: str):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, cashflow_id, name, type, icon, color FROM categories WHERE cashflow_id = ? ORDER BY type, name",
        (cashflow_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/public/{share_id}/categories", status_code=201)
def create_public_category(share_id: str, category: CategoryBase):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    cat_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO categories (id, cashflow_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)",
        (
            cat_id,
            cashflow_id,
            category.name,
            category.type,
            category.icon,
            category.color,
        ),
    )
    conn.commit()
    conn.close()
    return {"id": cat_id, "cashflow_id": cashflow_id, **category.model_dump()}


@app.get("/api/public/{share_id}/plans")
def list_public_plans(
    share_id: str, status: Optional[str] = None, category_id: Optional[str] = None
):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT p.id, p.cashflow_id, p.category_id, p.name, p.expected_amount, p.frequency,
               p.expected_day, p.start_month, p.end_month, p.status, p.notes,
               p.created_at, p.updated_at,
               c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
        FROM plans p
        JOIN categories c ON p.category_id = c.id
        WHERE p.cashflow_id = ?
    """
    params = [cashflow_id]

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
        plans.append(
            {
                "id": row["id"],
                "cashflow_id": row["cashflow_id"],
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
        )

    return plans


@app.post("/api/public/{share_id}/plans", status_code=201)
def create_public_plan(share_id: str, plan: PlanCreate):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    plan_id = str(uuid.uuid4())
    now = date.today().isoformat()

    cursor.execute(
        """INSERT INTO plans (id, cashflow_id, category_id, name, expected_amount, frequency,
           expected_day, start_month, end_month, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)""",
        (
            plan_id,
            cashflow_id,
            plan.category_id,
            plan.name,
            plan.expected_amount,
            plan.frequency,
            plan.expected_day,
            plan.start_month,
            plan.end_month,
            plan.notes,
            now,
            now,
        ),
    )
    conn.commit()
    result = get_plan_by_id(plan_id, conn)
    conn.close()
    return result


@app.put("/api/public/{share_id}/plans/{plan_id}")
def update_public_plan(share_id: str, plan_id: str, plan: PlanUpdate):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    now = date.today().isoformat()

    cursor.execute(
        "SELECT id FROM plans WHERE id = ? AND cashflow_id = ?", (plan_id, cashflow_id)
    )
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

        cursor.execute(f"UPDATE plans SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    result = get_plan_by_id(plan_id, conn)
    conn.close()
    return result


@app.delete("/api/public/{share_id}/plans/{plan_id}", status_code=204)
def delete_public_plan(share_id: str, plan_id: str):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM plans WHERE id = ? AND cashflow_id = ?", (plan_id, cashflow_id)
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    cursor.execute("DELETE FROM entries WHERE plan_id = ?", (plan_id,))
    cursor.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
    conn.commit()
    conn.close()


@app.get("/api/public/{share_id}/entries")
def list_public_entries(
    share_id: str,
    from_month: Optional[str] = None,
    to_month: Optional[str] = None,
    plan_id: Optional[str] = None,
):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT e.id, e.plan_id, e.month_year, e.amount, e.date, e.notes, e.created_at,
               p.id as p_id, p.cashflow_id, p.category_id, p.name as plan_name, p.expected_amount,
               p.frequency, p.expected_day, p.start_month, p.end_month, p.status as plan_status,
               p.notes as plan_notes, p.created_at as plan_created_at, p.updated_at as plan_updated_at,
               c.id as cat_id, c.name as cat_name, c.type as cat_type, c.icon as cat_icon, c.color as cat_color
        FROM entries e
        JOIN plans p ON e.plan_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.cashflow_id = ?
    """
    params = [cashflow_id]

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
        entries.append(
            {
                "id": row["id"],
                "plan_id": row["plan_id"],
                "month_year": row["month_year"],
                "amount": row["amount"],
                "date": row["date"],
                "notes": row["notes"],
                "created_at": row["created_at"],
                "plan": {
                    "id": row["p_id"],
                    "cashflow_id": row["cashflow_id"],
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
        )

    return entries


@app.post("/api/public/{share_id}/entries", status_code=201)
def create_public_entry(share_id: str, entry: EntryCreate):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    entry_id = str(uuid.uuid4())
    now = date.today().isoformat()

    cursor.execute(
        "SELECT id, frequency FROM plans WHERE id = ? AND cashflow_id = ?",
        (entry.plan_id, cashflow_id),
    )
    plan_row = cursor.fetchone()
    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    cursor.execute(
        """INSERT INTO entries (id, plan_id, month_year, amount, date, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            entry_id,
            entry.plan_id,
            entry.month_year,
            entry.amount,
            entry.date,
            entry.notes,
            now,
        ),
    )

    if plan_row["frequency"] == "one-time":
        cursor.execute(
            "UPDATE plans SET status = 'completed', updated_at = ? WHERE id = ?",
            (now, entry.plan_id),
        )

    conn.commit()
    result = get_entry_by_id(entry_id, conn)
    conn.close()
    return result


@app.put("/api/public/{share_id}/entries/{entry_id}")
def update_public_entry(share_id: str, entry_id: str, entry: EntryUpdate):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """SELECT e.id FROM entries e
           JOIN plans p ON e.plan_id = p.id
           WHERE e.id = ? AND p.cashflow_id = ?""",
        (entry_id, cashflow_id),
    )
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
        cursor.execute(f"UPDATE entries SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    result = get_entry_by_id(entry_id, conn)
    conn.close()
    return result


@app.delete("/api/public/{share_id}/entries/{entry_id}", status_code=204)
def delete_public_entry(share_id: str, entry_id: str):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT e.id FROM entries e
           JOIN plans p ON e.plan_id = p.id
           WHERE e.id = ? AND p.cashflow_id = ?""",
        (entry_id, cashflow_id),
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    cursor.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()


@app.get("/api/public/{share_id}/settings")
def list_public_settings(share_id: str):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT key, value FROM settings WHERE cashflow_id = ?", (cashflow_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.put("/api/public/{share_id}/settings/{key}")
def update_public_setting(share_id: str, key: str, setting: dict):
    cashflow = get_public_cashflow(share_id)
    cashflow_id = cashflow["id"]

    conn = get_db()
    cursor = conn.cursor()
    value = setting["value"]

    cursor.execute(
        "SELECT key FROM settings WHERE cashflow_id = ? AND key = ?", (cashflow_id, key)
    )
    if cursor.fetchone():
        cursor.execute(
            "UPDATE settings SET value = ? WHERE cashflow_id = ? AND key = ?",
            (value, cashflow_id, key),
        )
    else:
        cursor.execute(
            "INSERT INTO settings (cashflow_id, key, value) VALUES (?, ?, ?)",
            (cashflow_id, key, value),
        )

    conn.commit()
    conn.close()
    return {"key": key, "value": value}


class CashflowImportCategory(BaseModel):
    id: str
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None


class CashflowImportPlan(BaseModel):
    id: str
    category_id: str
    name: str
    expected_amount: float
    frequency: str
    expected_day: Optional[int] = None
    start_month: str
    end_month: Optional[str] = None
    status: str
    notes: Optional[str] = None


class CashflowImportEntry(BaseModel):
    id: str
    plan_id: str
    month_year: str
    amount: float
    date: Optional[str] = None
    notes: Optional[str] = None


class CashflowImportSetting(BaseModel):
    key: str
    value: str


class CashflowImport(BaseModel):
    name: str
    description: Optional[str] = None
    categories: List[CashflowImportCategory]
    plans: List[CashflowImportPlan]
    entries: List[CashflowImportEntry]
    settings: List[CashflowImportSetting]


@app.post("/api/cashflows/import", status_code=201)
def import_cashflow(data: CashflowImport, request: Request):
    user_id = require_auth(request)

    conn = get_db()
    cursor = conn.cursor()

    cashflow_id = str(uuid.uuid4())
    share_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute(
        "INSERT INTO cashflows (id, name, description, owner_id, share_id, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
        (cashflow_id, data.name, data.description, user_id, share_id, now, now),
    )

    member_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO cashflow_members (id, cashflow_id, user_id, role, invited_at) VALUES (?, ?, ?, 'owner', ?)",
        (member_id, cashflow_id, user_id, now),
    )

    category_id_map = {}
    for cat in data.categories:
        new_cat_id = str(uuid.uuid4())
        category_id_map[cat.id] = new_cat_id
        cursor.execute(
            "INSERT INTO categories (id, cashflow_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)",
            (new_cat_id, cashflow_id, cat.name, cat.type, cat.icon, cat.color),
        )

    plan_id_map = {}
    for plan in data.plans:
        new_plan_id = str(uuid.uuid4())
        plan_id_map[plan.id] = new_plan_id
        new_category_id = category_id_map[plan.category_id]
        cursor.execute(
            """INSERT INTO plans (id, cashflow_id, category_id, name, expected_amount, frequency,
               expected_day, start_month, end_month, status, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                new_plan_id,
                cashflow_id,
                new_category_id,
                plan.name,
                plan.expected_amount,
                plan.frequency,
                plan.expected_day,
                plan.start_month,
                plan.end_month,
                plan.status,
                plan.notes,
                now,
                now,
            ),
        )

    for entry in data.entries:
        new_entry_id = str(uuid.uuid4())
        new_plan_id = plan_id_map[entry.plan_id]
        cursor.execute(
            """INSERT INTO entries (id, plan_id, month_year, amount, date, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                new_entry_id,
                new_plan_id,
                entry.month_year,
                entry.amount,
                entry.date,
                entry.notes,
                now,
            ),
        )

    for setting in data.settings:
        cursor.execute(
            "INSERT INTO settings (cashflow_id, key, value) VALUES (?, ?, ?)",
            (cashflow_id, setting.key, setting.value),
        )

    conn.commit()
    conn.close()

    return {
        "id": cashflow_id,
        "name": data.name,
        "description": data.description,
        "owner_id": user_id,
        "role": "owner",
        "share_id": share_id,
        "is_public": False,
        "created_at": now,
        "updated_at": now,
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/debug/turso")
async def debug_turso():
    url = DATABASE_URL.replace("libsql://", "https://")
    headers = {"Authorization": f"Bearer {DATABASE_AUTH_TOKEN}"}
    body = {
        "requests": [
            {"type": "execute", "stmt": {"sql": "SELECT 1"}},
            {"type": "close"}
        ]
    }
    async with AsyncClient() as client:
        resp = await client.post(f"{url}/v2/pipeline", json=body, headers=headers)
        return {"status": resp.status_code, "body": resp.json()}
