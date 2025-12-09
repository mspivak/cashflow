from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "income" | "expense"
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True)

    entries = relationship("Entry", back_populates="category")
    recurring_items = relationship("Recurring", back_populates="category")

    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="check_category_type"),
    )


class Recurring(Base):
    __tablename__ = "recurring"

    id = Column(String, primary_key=True)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    name = Column(String, nullable=False)
    expected_amount = Column(Float, nullable=False)
    frequency = Column(String, nullable=False)  # "weekly" | "biweekly" | "monthly"
    start_month = Column(String, nullable=False)  # "2025-01"
    end_month = Column(String, nullable=True)  # NULL = ongoing
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="recurring_items")
    entries = relationship("Entry", back_populates="recurring")

    __table_args__ = (
        CheckConstraint("frequency IN ('weekly', 'biweekly', 'monthly')", name="check_recurring_frequency"),
    )


class Entry(Base):
    __tablename__ = "entries"

    id = Column(String, primary_key=True)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    recurring_id = Column(String, ForeignKey("recurring.id"), nullable=True)
    name = Column(String, nullable=False)
    month_year = Column(String, nullable=False)  # "2025-01"
    expected_amount = Column(Float, nullable=True)
    expected_date = Column(String, nullable=True)  # "2025-01-15"
    actual_amount = Column(Float, nullable=True)
    actual_date = Column(String, nullable=True)
    has_milestones = Column(Integer, default=0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="entries")
    recurring = relationship("Recurring", back_populates="entries")
    milestones = relationship("Milestone", back_populates="entry", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_entries_month_year", "month_year"),
        Index("idx_entries_category", "category_id"),
    )


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(String, primary_key=True)
    entry_id = Column(String, ForeignKey("entries.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    expected_amount = Column(Float, nullable=True)
    expected_date = Column(String, nullable=True)
    actual_amount = Column(Float, nullable=True)
    actual_date = Column(String, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    entry = relationship("Entry", back_populates="milestones")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
