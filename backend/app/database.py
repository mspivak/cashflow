import os
from sqlalchemy import create_engine
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


def init_db():
    """Initialize database tables and default settings."""
    from app.models import Item, Setting
    Base.metadata.create_all(bind=engine)

    # Insert default settings if they don't exist
    db = SessionLocal()
    try:
        if not db.query(Setting).filter(Setting.key == "starting_balance").first():
            db.add(Setting(key="starting_balance", value="0"))
        db.commit()
    finally:
        db.close()
