from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.db.models import Destination
from app.api import auth, destinations, recommendations, trips, admin, locations
from seed_data import seed_database, ensure_nationwide_destinations

# Create tables
Base.metadata.create_all(bind=engine)

# Safe SQLite column migration for new model fields
with engine.connect() as conn:
    try:
        from sqlalchemy import text
        res = conn.execute(text("PRAGMA table_info(travel_plans);")).fetchall()
        cols = {row[1] for row in res}
        if "start_date" not in cols:
            conn.execute(text("ALTER TABLE travel_plans ADD COLUMN start_date VARCHAR(50);"))
        if "end_date" not in cols:
            conn.execute(text("ALTER TABLE travel_plans ADD COLUMN end_date VARCHAR(50);"))
        if "status" not in cols:
            conn.execute(text("ALTER TABLE travel_plans ADD COLUMN status VARCHAR(30) DEFAULT 'SAVED';"))
        conn.commit()
    except Exception as e:
        print(f"Migration note: {e}")

# Auto seed if empty
db = SessionLocal()
if db.query(Destination).count() == 0:
    db.close()
    seed_database()
    db = SessionLocal()
ensure_nationwide_destinations(db)
db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="S.A.F.A.R. AI-Powered Predictive Tourism Planning and Personalized Travel Optimization System API"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(destinations.router, prefix=settings.API_V1_STR)
app.include_router(recommendations.router, prefix=settings.API_V1_STR)
app.include_router(trips.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(locations.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "tagline": "Know where to go. Know when to go. Know how to make the most of it."
    }
