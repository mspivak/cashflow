from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.database import init_db
from app.routes.categories import router as categories_router
from app.routes.entries import router as entries_router
from app.routes.recurring import router as recurring_router
from app.routes.settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    init_db()
    yield


app = FastAPI(
    title="Cashflow Tracker API",
    description="Personal cashflow tracking API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(categories_router, prefix="/api")
app.include_router(entries_router, prefix="/api")
app.include_router(recurring_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Lambda handler
handler = Mangum(app, lifespan="off")
