from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class JobDescriptionCreate(BaseModel):
    title: str
    description: str
    required_skills: List[str]

class JobDescriptionResponse(BaseModel):
    id: int
    title: str
    description: str
    required_skills: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ResumeResponse(BaseModel):
    id: int
    job_id: int
    candidate_name: str
    candidate_email: str
    extracted_skills: str
    overall_score: Optional[float]
    semantic_score: Optional[float]
    skill_score: Optional[float]
    explanation: Optional[str]
    
    class Config:
        from_attributes = True
