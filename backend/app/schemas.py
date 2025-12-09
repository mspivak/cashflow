from datetime import datetime
from typing import Literal, Optional, List
from pydantic import BaseModel, Field


# Category schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1)
    type: Literal["income", "expense"]
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    type: Optional[Literal["income", "expense"]] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: str

    class Config:
        from_attributes = True


# Milestone schemas
class MilestoneBase(BaseModel):
    name: str = Field(..., min_length=1)
    expected_amount: Optional[float] = None
    expected_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    actual_amount: Optional[float] = None
    actual_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    sort_order: int = 0


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    expected_amount: Optional[float] = None
    expected_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    actual_amount: Optional[float] = None
    actual_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    sort_order: Optional[int] = None


class MilestoneResponse(MilestoneBase):
    id: str
    entry_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Entry schemas
class EntryBase(BaseModel):
    category_id: str
    recurring_id: Optional[str] = None
    name: str = Field(..., min_length=1)
    month_year: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    expected_amount: Optional[float] = None
    expected_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    actual_amount: Optional[float] = None
    actual_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    has_milestones: bool = False
    notes: Optional[str] = None


class EntryCreate(EntryBase):
    milestones: Optional[List[MilestoneCreate]] = None


class EntryUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1)
    month_year: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$")
    expected_amount: Optional[float] = None
    expected_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    actual_amount: Optional[float] = None
    actual_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    notes: Optional[str] = None


class EntryConfirm(BaseModel):
    actual_amount: Optional[float] = None  # If None, use expected_amount
    actual_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class EntryResponse(EntryBase):
    id: str
    created_at: datetime
    updated_at: datetime
    category: CategoryResponse
    milestones: List[MilestoneResponse] = []

    class Config:
        from_attributes = True


# Recurring schemas
class RecurringBase(BaseModel):
    category_id: str
    name: str = Field(..., min_length=1)
    expected_amount: float = Field(..., gt=0)
    frequency: Literal["weekly", "biweekly", "monthly"]
    start_month: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    end_month: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$")


class RecurringCreate(RecurringBase):
    pass


class RecurringUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1)
    expected_amount: Optional[float] = Field(None, gt=0)
    frequency: Optional[Literal["weekly", "biweekly", "monthly"]] = None
    start_month: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$")
    end_month: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$")


class RecurringResponse(RecurringBase):
    id: str
    created_at: datetime
    category: CategoryResponse

    class Config:
        from_attributes = True


# Settings schemas
class SettingResponse(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: str
