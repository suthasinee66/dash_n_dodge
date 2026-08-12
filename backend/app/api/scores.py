from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from ..schemas.score import ScoreSubmit, ScoreResponse
from ..services.score_service import ScoreService
from ..db.database import get_db

router = APIRouter(prefix="/api/scores", tags=["scores"])

@router.post("", response_model=ScoreResponse)
def submit_score(score_data: ScoreSubmit, db: Session = Depends(get_db)):
    try:
        return ScoreService.submit_score(score_data, db)
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
