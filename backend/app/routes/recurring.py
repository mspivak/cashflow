import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Recurring, Category
from app.schemas import RecurringCreate, RecurringUpdate, RecurringResponse

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.get("", response_model=list[RecurringResponse])
def list_recurring(
    category_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all recurring templates."""
    query = db.query(Recurring).options(joinedload(Recurring.category))

    if category_id:
        query = query.filter(Recurring.category_id == category_id)

    return query.order_by(Recurring.name).all()


@router.post("", response_model=RecurringResponse, status_code=201)
def create_recurring(recurring: RecurringCreate, db: Session = Depends(get_db)):
    """Create a new recurring template."""
    # Verify category exists
    category = db.query(Category).filter(Category.id == recurring.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")

    db_recurring = Recurring(
        id=str(uuid.uuid4()),
        category_id=recurring.category_id,
        name=recurring.name,
        expected_amount=recurring.expected_amount,
        frequency=recurring.frequency,
        start_month=recurring.start_month,
        end_month=recurring.end_month,
    )
    db.add(db_recurring)
    db.commit()
    db.refresh(db_recurring)
    return db_recurring


@router.get("/{recurring_id}", response_model=RecurringResponse)
def get_recurring(recurring_id: str, db: Session = Depends(get_db)):
    """Get a single recurring template by ID."""
    recurring = db.query(Recurring).options(
        joinedload(Recurring.category)
    ).filter(Recurring.id == recurring_id).first()
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    return recurring


@router.put("/{recurring_id}", response_model=RecurringResponse)
def update_recurring(recurring_id: str, recurring: RecurringUpdate, db: Session = Depends(get_db)):
    """Update an existing recurring template."""
    db_recurring = db.query(Recurring).options(
        joinedload(Recurring.category)
    ).filter(Recurring.id == recurring_id).first()
    if not db_recurring:
        raise HTTPException(status_code=404, detail="Recurring template not found")

    update_data = recurring.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_recurring, field, value)

    db.commit()
    db.refresh(db_recurring)
    return db_recurring


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring(recurring_id: str, db: Session = Depends(get_db)):
    """Delete a recurring template."""
    db_recurring = db.query(Recurring).filter(Recurring.id == recurring_id).first()
    if not db_recurring:
        raise HTTPException(status_code=404, detail="Recurring template not found")

    db.delete(db_recurring)
    db.commit()
