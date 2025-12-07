from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, CheckConstraint, Index

from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    month_year = Column(String, nullable=False)  # Format: "2025-01"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense', 'optional')", name="check_type"),
        CheckConstraint("frequency IN ('once', 'monthly', 'biweekly')", name="check_frequency"),
        Index("idx_items_month_year", "month_year"),
        Index("idx_items_type", "type"),
    )


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
