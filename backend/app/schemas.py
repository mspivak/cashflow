from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# Item schemas
class ItemBase(BaseModel):
    name: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    type: Literal["income", "expense", "optional"]
    frequency: Literal["once", "monthly", "biweekly"]
    month_year: str = Field(..., pattern=r"^\d{4}-\d{2}$")  # YYYY-MM format


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[Literal["income", "expense", "optional"]] = None
    frequency: Optional[Literal["once", "monthly", "biweekly"]] = None
    month_year: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}$")


class ItemMove(BaseModel):
    month_year: str = Field(..., pattern=r"^\d{4}-\d{2}$")


class ItemResponse(ItemBase):
    id: str
    created_at: datetime
    updated_at: datetime

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
