import os
import uuid
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, declarative_base

# Use EFS mount path in Lambda, local path otherwise
DB_PATH = os.getenv("DB_PATH", "./cashflow.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Default categories to seed
DEFAULT_CATEGORIES = [
    # Income categories
    {"name": "Salary", "type": "income", "icon": "💼", "color": "#22c55e"},
    {"name": "Freelance", "type": "income", "icon": "💻", "color": "#10b981"},
    {"name": "Rental", "type": "income", "icon": "🏠", "color": "#14b8a6"},
    {"name": "Other Income", "type": "income", "icon": "💰", "color": "#06b6d4"},
    # Expense categories
    {"name": "Housing", "type": "expense", "icon": "🏡", "color": "#ef4444"},
    {"name": "Utilities", "type": "expense", "icon": "⚡", "color": "#f97316"},
    {"name": "Groceries", "type": "expense", "icon": "🛒", "color": "#f59e0b"},
    {"name": "Transport", "type": "expense", "icon": "🚗", "color": "#eab308"},
    {"name": "Subscriptions", "type": "expense", "icon": "📺", "color": "#84cc16"},
    {"name": "Other Expense", "type": "expense", "icon": "💸", "color": "#64748b"},
]


def init_db():
    """Initialize database tables, seed defaults, and migrate old data."""
    from app.models import Category, Entry, Recurring, Milestone, Setting

    # Check if old 'items' table exists before creating new schema
    inspector = inspect(engine)
    has_old_items = "items" in inspector.get_table_names()

    # Create all new tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed default categories if none exist
        if db.query(Category).count() == 0:
            for cat_data in DEFAULT_CATEGORIES:
                category = Category(
                    id=str(uuid.uuid4()),
                    name=cat_data["name"],
                    type=cat_data["type"],
                    icon=cat_data["icon"],
                    color=cat_data["color"],
                )
                db.add(category)
            db.commit()

        # Seed default setting if not exists
        if not db.query(Setting).filter(Setting.key == "starting_balance").first():
            db.add(Setting(key="starting_balance", value="0"))
            db.commit()

        # Migrate old items if they exist
        if has_old_items:
            migrate_old_items(db)

    finally:
        db.close()


def migrate_old_items(db):
    """Migrate data from old items table to new entries table."""
    from sqlalchemy import text
    from app.models import Category, Entry

    # Check if migration already happened
    if db.query(Entry).count() > 0:
        return

    # Get category mappings
    income_cat = db.query(Category).filter(Category.name == "Other Income").first()
    expense_cat = db.query(Category).filter(Category.name == "Other Expense").first()

    if not income_cat or not expense_cat:
        return

    # Read old items
    try:
        result = db.execute(text("SELECT * FROM items"))
        old_items = result.fetchall()
    except Exception:
        return

    # Migrate each item
    for item in old_items:
        # Map old type to category
        old_type = item[3] if len(item) > 3 else "expense"  # type column
        category_id = income_cat.id if old_type == "income" else expense_cat.id

        entry = Entry(
            id=str(uuid.uuid4()),
            category_id=category_id,
            name=item[1] if len(item) > 1 else "Migrated Item",  # name column
            month_year=item[5] if len(item) > 5 else "2025-01",  # month_year column
            expected_amount=item[2] if len(item) > 2 else 0,  # amount column
        )
        db.add(entry)

    db.commit()

    # Optionally drop old table (commented out for safety)
    # db.execute(text("DROP TABLE items"))
    # db.commit()
