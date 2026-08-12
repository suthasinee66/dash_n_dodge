from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from ..schemas.score import LeaderboardEntry
from ..services.score_service import ScoreService
from ..db.database import get_db

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

@router.get("", response_model=List[LeaderboardEntry])
def get_leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    try:
        return ScoreService.get_leaderboard(limit=limit, db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
