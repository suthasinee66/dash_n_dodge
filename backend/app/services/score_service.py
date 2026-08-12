import json
import os
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..schemas.score import ScoreSubmit, LeaderboardEntry
from ..db.models import ScoreModel

# Resolve local fallback file inside backend root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FALLBACK_FILE = os.path.join(BASE_DIR, "scores_fallback.json")

def get_fallback_scores() -> List[dict]:
    if not os.path.exists(FALLBACK_FILE):
        return []
    try:
        with open(FALLBACK_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_fallback_scores(scores: List[dict]) -> None:
    try:
        with open(FALLBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(scores, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

class ScoreService:
    @staticmethod
    def submit_score(score_data: ScoreSubmit, db: Optional[Session] = None) -> dict:
        # 1. Try PostgreSQL database if available
        if db is not None:
            try:
                # Check if nickname already exists
                existing = db.query(ScoreModel).filter(ScoreModel.nickname == score_data.nickname).first()
                if existing:
                    # Update only if the new score is higher
                    if score_data.score > existing.score:
                        existing.score = score_data.score
                        db.commit()
                        db.refresh(existing)
                    return {"nickname": existing.nickname, "score": existing.score}
                else:
                    db_score = ScoreModel(nickname=score_data.nickname, score=score_data.score)
                    db.add(db_score)
                    db.commit()
                    db.refresh(db_score)
                    return {"nickname": db_score.nickname, "score": db_score.score}
            except Exception as db_err:
                print(f"[DATABASE ERROR] Failed to save score to PostgreSQL: {db_err}. Falling back to file.")
                db.rollback()
                # Continue below to save to JSON file fallback

        # 2. Fallback: Save to JSON file
        scores = get_fallback_scores()
        existing_fallback = next((item for item in scores if item["nickname"] == score_data.nickname), None)
        if existing_fallback:
            if score_data.score > existing_fallback["score"]:
                existing_fallback["score"] = score_data.score
        else:
            scores.append({
                "nickname": score_data.nickname,
                "score": score_data.score
            })
        scores.sort(key=lambda x: x["score"], reverse=True)
        save_fallback_scores(scores)
        return {"nickname": score_data.nickname, "score": score_data.score}

    @staticmethod
    def get_leaderboard(limit: int = 10, db: Optional[Session] = None) -> List[LeaderboardEntry]:
        # 1. Try PostgreSQL database if available
        if db is not None:
            try:
                top_scores = db.query(ScoreModel).order_by(desc(ScoreModel.score)).limit(limit).all()
                leaderboard = []
                for rank, item in enumerate(top_scores, 1):
                    leaderboard.append(
                        LeaderboardEntry(
                            rank=rank,
                            nickname=item.nickname,
                            score=item.score
                        )
                    )
                return leaderboard
            except Exception as db_err:
                print(f"[DATABASE ERROR] Failed to fetch leaderboard from PostgreSQL: {db_err}. Falling back to file.")
                # Continue below to read from JSON file fallback

        # 2. Fallback: Read from JSON file
        scores = get_fallback_scores()
        scores.sort(key=lambda x: x["score"], reverse=True)
        top_scores = scores[:limit]

        leaderboard = []
        for rank, entry in enumerate(top_scores, 1):
            leaderboard.append(
                LeaderboardEntry(
                    rank=rank,
                    nickname=entry["nickname"],
                    score=entry["score"]
                )
            )
        return leaderboard
