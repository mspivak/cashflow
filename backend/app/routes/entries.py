import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Entry, Milestone, Category
from app.schemas import (
    EntryCreate,
    EntryUpdate,
    EntryConfirm,
    EntryResponse,
    MilestoneCreate,
    MilestoneResponse,
)

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("", response_model=list[EntryResponse])
def list_entries(
    from_month: Optional[str] = None,
    to_month: Optional[str] = None,
    category_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all entries, optionally filtered by month range or category."""
    query = db.query(Entry).options(
        joinedload(Entry.category),
        joinedload(Entry.milestones)
    )

    if from_month:
        query = query.filter(Entry.month_year >= from_month)
    if to_month:
        query = query.filter(Entry.month_year <= to_month)
    if category_id:
        query = query.filter(Entry.category_id == category_id)

    return query.order_by(Entry.month_year, Entry.created_at).all()


@router.post("", response_model=EntryResponse, status_code=201)
def create_entry(entry: EntryCreate, db: Session = Depends(get_db)):
    """Create a new entry with optional milestones."""
    # Verify category exists
    category = db.query(Category).filter(Category.id == entry.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")

    db_entry = Entry(
        id=str(uuid.uuid4()),
        category_id=entry.category_id,
        recurring_id=entry.recurring_id,
        name=entry.name,
        month_year=entry.month_year,
        expected_amount=entry.expected_amount,
        expected_date=entry.expected_date,
        actual_amount=entry.actual_amount,
        actual_date=entry.actual_date,
        has_milestones=1 if entry.milestones else 0,
        notes=entry.notes,
    )
    db.add(db_entry)

    # Add milestones if provided
    if entry.milestones:
        for i, milestone in enumerate(entry.milestones):
            db_milestone = Milestone(
                id=str(uuid.uuid4()),
                entry_id=db_entry.id,
                name=milestone.name,
                expected_amount=milestone.expected_amount,
                expected_date=milestone.expected_date,
                actual_amount=milestone.actual_amount,
                actual_date=milestone.actual_date,
                sort_order=milestone.sort_order or i,
            )
            db.add(db_milestone)

    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.get("/{entry_id}", response_model=EntryResponse)
def get_entry(entry_id: str, db: Session = Depends(get_db)):
    """Get a single entry by ID."""
    entry = db.query(Entry).options(
        joinedload(Entry.category),
        joinedload(Entry.milestones)
    ).filter(Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.put("/{entry_id}", response_model=EntryResponse)
def update_entry(entry_id: str, entry: EntryUpdate, db: Session = Depends(get_db)):
    """Update an existing entry."""
    db_entry = db.query(Entry).options(
        joinedload(Entry.category),
        joinedload(Entry.milestones)
    ).filter(Entry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    update_data = entry.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_entry, field, value)

    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: str, db: Session = Depends(get_db)):
    """Delete an entry and its milestones."""
    db_entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(db_entry)
    db.commit()


@router.post("/{entry_id}/confirm", response_model=EntryResponse)
def confirm_entry(entry_id: str, confirm: EntryConfirm, db: Session = Depends(get_db)):
    """Quickly confirm an entry (set actual = expected if not provided)."""
    db_entry = db.query(Entry).options(
        joinedload(Entry.category),
        joinedload(Entry.milestones)
    ).filter(Entry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db_entry.actual_amount = confirm.actual_amount or db_entry.expected_amount
    db_entry.actual_date = confirm.actual_date or date.today().isoformat()

    db.commit()
    db.refresh(db_entry)
    return db_entry


# Milestone endpoints
@router.post("/{entry_id}/milestones", response_model=MilestoneResponse, status_code=201)
def add_milestone(entry_id: str, milestone: MilestoneCreate, db: Session = Depends(get_db)):
    """Add a milestone to an entry."""
    db_entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db_milestone = Milestone(
        id=str(uuid.uuid4()),
        entry_id=entry_id,
        name=milestone.name,
        expected_amount=milestone.expected_amount,
        expected_date=milestone.expected_date,
        actual_amount=milestone.actual_amount,
        actual_date=milestone.actual_date,
        sort_order=milestone.sort_order,
    )
    db.add(db_milestone)

    # Mark entry as having milestones
    db_entry.has_milestones = 1

    db.commit()
    db.refresh(db_milestone)
    return db_milestone


@router.put("/{entry_id}/milestones/{milestone_id}", response_model=MilestoneResponse)
def update_milestone(
    entry_id: str,
    milestone_id: str,
    milestone: MilestoneCreate,
    db: Session = Depends(get_db)
):
    """Update a milestone."""
    db_milestone = db.query(Milestone).filter(
        Milestone.id == milestone_id,
        Milestone.entry_id == entry_id
    ).first()
    if not db_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    update_data = milestone.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_milestone, field, value)

    db.commit()
    db.refresh(db_milestone)
    return db_milestone


@router.delete("/{entry_id}/milestones/{milestone_id}", status_code=204)
def delete_milestone(entry_id: str, milestone_id: str, db: Session = Depends(get_db)):
    """Delete a milestone."""
    db_milestone = db.query(Milestone).filter(
        Milestone.id == milestone_id,
        Milestone.entry_id == entry_id
    ).first()
    if not db_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    db.delete(db_milestone)
    db.commit()
