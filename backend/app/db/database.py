import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load .env file from backend root or workspace root
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dotenv_path = os.path.join(backend_dir, ".env")
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(os.path.dirname(backend_dir), ".env")
load_dotenv(dotenv_path=dotenv_path)

# Load database URL from environment variables, fallback to local default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/nhee_lor")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Attempt database engine creation with a 3 second connect timeout to handle connection errors cleanly
try:
    # Check if we are running sqlite for tests or postgresql
    connect_args = {}
    if "postgresql" in DATABASE_URL:
        connect_args = {"connect_timeout": 3}
    elif "sqlite" in DATABASE_URL:
        connect_args = {"check_same_thread": False}

    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    print(f"[DATABASE ERROR] Failed to create database engine: {e}")
    engine = None
    SessionLocal = None

Base = declarative_base()

# FastAPI dependency to inject database session.
# If database is offline, yields None.
def get_db():
    if SessionLocal is None:
        yield None
        return
        
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
