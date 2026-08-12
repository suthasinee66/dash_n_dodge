from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from .database import Base

class ScoreModel(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(20), nullable=False)
    score = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RoomHistoryModel(Base):
    __tablename__ = "room_history"

    id = Column(Integer, primary_key=True, index=True)
    room_pin = Column(String(10), nullable=False)
    results = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
