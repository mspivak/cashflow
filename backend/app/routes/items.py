import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, Setting
from app.schemas import (
    ItemCreate,
    ItemUpdate,
    ItemMove,
    ItemResponse,
    SettingResponse,
    SettingUpdate,
)

router = APIRouter()


# Items endpoints
@router.get("/items", response_model=list[ItemResponse])
def list_items(
    from_month: Optional[str] = None,
    to_month: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all items, optionally filtered by month range."""
    query = db.query(Item)

    if from_month:
        query = query.filter(Item.month_year >= from_month)
    if to_month:
        query = query.filter(Item.month_year <= to_month)

    return query.order_by(Item.month_year, Item.created_at).all()


@router.post("/items", response_model=ItemResponse, status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    """Create a new item."""
    db_item = Item(
        id=str(uuid.uuid4()),
        name=item.name,
        amount=item.amount,
        type=item.type,
        frequency=item.frequency,
        month_year=item.month_year,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: str, db: Session = Depends(get_db)):
    """Get a single item by ID."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: str, item: ItemUpdate, db: Session = Depends(get_db)):
    """Update an existing item."""
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = item.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)

    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str, db: Session = Depends(get_db)):
    """Delete an item."""
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(db_item)
    db.commit()


@router.patch("/items/{item_id}/move", response_model=ItemResponse)
def move_item(item_id: str, move: ItemMove, db: Session = Depends(get_db)):
    """Move an item to a different month."""
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    db_item.month_year = move.month_year
    db.commit()
    db.refresh(db_item)
    return db_item


# Settings endpoints
@router.get("/settings", response_model=list[SettingResponse])
def list_settings(db: Session = Depends(get_db)):
    """Get all settings."""
    return db.query(Setting).all()


@router.get("/settings/{key}", response_model=SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    """Get a single setting by key."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.put("/settings/{key}", response_model=SettingResponse)
def update_setting(key: str, setting: SettingUpdate, db: Session = Depends(get_db)):
    """Update a setting value."""
    db_setting = db.query(Setting).filter(Setting.key == key).first()
    if not db_setting:
        # Create if doesn't exist
        db_setting = Setting(key=key, value=setting.value)
        db.add(db_setting)
    else:
        db_setting.value = setting.value

    db.commit()
    db.refresh(db_setting)
    return db_setting
