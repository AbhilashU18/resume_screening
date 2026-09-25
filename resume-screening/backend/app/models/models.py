from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    required_skills = Column(Text) # Stored as comma-separated string
    created_at = Column(DateTime, default=datetime.utcnow)

    resumes = relationship("Resume", back_populates="job")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_descriptions.id"))
    candidate_name = Column(String, index=True)
    candidate_email = Column(String, index=True)
    candidate_phone = Column(String)
    extracted_text = Column(Text)
    extracted_skills = Column(Text) # Comma-separated string
    
    # File details for Exact Resume Preview
    file_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_type = Column(String, nullable=True) # 'pdf', 'docx', 'txt'
    
    overall_score = Column(Float, nullable=True)
    semantic_score = Column(Float, nullable=True)
    skill_score = Column(Float, nullable=True)
    explanation = Column(Text, nullable=True)
    
    # AI Intelligence fields
    ai_summary = Column(Text, nullable=True)
    score_breakdown_json = Column(Text, nullable=True)  # JSON string
    skill_gap_json = Column(Text, nullable=True)  # JSON string
    
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("JobDescription", back_populates="resumes")
