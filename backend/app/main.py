from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import scores, leaderboard, rooms
from app.db.database import Base, engine

# Create database tables automatically if connection engine is online
try:
    if engine is not None:
        Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[DATABASE STARTUP ERROR] Failed to create tables: {e}")

app = FastAPI(
    title="Dash and Dodge - ขับรถภาษาอะไร API",
    description="Backend API for online leaderboard system",
    version="1.0.0"
)

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(scores.router)
app.include_router(leaderboard.router)
app.include_router(rooms.router)

@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "nhee-lor-taloung-lane-backend",
        "version": "1.0.0"
    }
