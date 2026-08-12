from pydantic import BaseModel, Field, field_validator
import re

class ScoreSubmit(BaseModel):
    nickname: str = Field(..., min_length=2, max_length=12)
    score: int = Field(..., ge=0, le=10000)

    @field_validator('nickname')
    @classmethod
    def validate_nickname(cls, v: str) -> str:
        # Normalize: trim whitespace and uppercase
        v = v.strip().upper()
        
        # Regular expression: Thai, English uppercase/lowercase, digits, hyphens, and underscores
        if not re.match(r'^[A-Z0-9ก-๙_-]+$', v):
            raise ValueError('Nickname contains invalid characters')
            
        # Profanity checks
        profanity_list = ['FUCK', 'SHIT', 'ASS', 'HELL', 'BITCH', 'เหี้ย', 'ควย', 'สัส', 'เย็ด', 'บ้า', 'หมา']
        if any(word in v for word in profanity_list):
            raise ValueError('Nickname contains inappropriate language')
            
        return v

class ScoreResponse(BaseModel):
    nickname: str
    score: int

class LeaderboardEntry(BaseModel):
    rank: int
    nickname: str
    score: int
