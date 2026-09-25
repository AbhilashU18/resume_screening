from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from pydantic import BaseModel
import os
import shutil
import json

from app.database.connection import engine, Base, get_db
from app.models.models import JobDescription, Resume
from app.schemas.schemas import JobDescriptionCreate, JobDescriptionResponse, ResumeResponse
from app.ml.parser import parse_resume, extract_skills
from app.ml.matcher import matcher

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Resume Screening System")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static uploads directory so files can be viewed directly
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Resume Screening System"}

# ========================
# Job Endpoints
# ========================
class JobCreateSchema(BaseModel):
    title: str
    company: Optional[str] = ""
    description: str
    required_skills: Union[List[str], str]
    min_experience: Optional[Union[int, str]] = 0

@app.post("/job-description/")
@app.post("/job-description")
def create_job(job: JobCreateSchema, db: Session = Depends(get_db)):
    if isinstance(job.required_skills, str):
        skills_str = ",".join([s.strip() for s in job.required_skills.split(",") if s.strip()])
    else:
        skills_str = ",".join([s.strip() for s in job.required_skills if s.strip()])

    db_job = JobDescription(
        title=job.title.strip(),
        description=f"{job.company.strip() + ' - ' if job.company else ''}{job.description.strip()}",
        required_skills=skills_str
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return {
        "id": db_job.id,
        "title": db_job.title,
        "description": db_job.description,
        "required_skills": db_job.required_skills,
        "created_at": db_job.created_at.isoformat() if db_job.created_at else ""
    }

@app.get("/job-descriptions/")
@app.get("/job-descriptions")
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "required_skills": j.required_skills,
            "created_at": j.created_at.isoformat() if j.created_at else ""
        } for j in jobs
    ]

@app.delete("/job-descriptions/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # Delete associated resumes
    db.query(Resume).filter(Resume.job_id == job_id).delete()
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}


# ========================
# Resume Endpoints (File Upload & Manual Text)
# ========================
class ManualResumeCreate(BaseModel):
    candidate_name: str
    candidate_email: Optional[str] = ""
    candidate_phone: Optional[str] = ""
    skills: Optional[str] = ""
    resume_text: str
    job_id: Optional[int] = None

@app.post("/add-resume-manual/")
@app.post("/add-resume-manual")
def add_resume_manual(data: ManualResumeCreate, db: Session = Depends(get_db)):
    extracted_skills_list = extract_skills(data.resume_text)
    user_skills_list = [s.strip().lower() for s in data.skills.split(",") if s.strip()] if data.skills else []
    all_skills = sorted(list(set(user_skills_list + extracted_skills_list)))

    safe_name = "".join(c for c in data.candidate_name if c.isalnum() or c in (' ', '_', '-')).rstrip()
    filename = f"{safe_name.replace(' ', '_').lower()}_resume.txt"
    file_location = os.path.join(UPLOAD_DIR, filename)
    with open(file_location, "w", encoding="utf-8") as f:
        f.write(f"Candidate: {data.candidate_name}\n")
        f.write(f"Email: {data.candidate_email} | Phone: {data.candidate_phone}\n")
        f.write(f"Skills: {', '.join(all_skills)}\n\n")
        f.write("RESUME CONTENT:\n")
        f.write(data.resume_text)

    overall_score = None
    semantic_score = None
    skill_score = None
    explanation = None
    ai_summary = None
    score_breakdown_json = None
    skill_gap_json = None

    if data.job_id:
        job = db.query(JobDescription).filter(JobDescription.id == data.job_id).first()
        if job:
            parsed_data = {
                "text": data.resume_text,
                "email": data.candidate_email,
                "phone": data.candidate_phone,
                "skills": all_skills
            }
            job_data = {
                "title": job.title,
                "description": job.description,
                "required_skills": [s.strip() for s in job.required_skills.split(",") if s.strip()]
            }
            scores = matcher.compute_overall_score(parsed_data, job_data)
            overall_score = scores["overall_score"]
            semantic_score = scores["semantic_score"]
            skill_score = scores["skill_score"]
            explanation = scores["explanation"]
            ai_summary = scores.get("ai_summary", "")
            score_breakdown_json = json.dumps(scores.get("score_breakdown", {}))
            skill_gap_json = json.dumps(scores.get("skill_gap", {}))

    db_resume = Resume(
        job_id=data.job_id,
        candidate_name=data.candidate_name,
        candidate_email=data.candidate_email or "",
        candidate_phone=data.candidate_phone or "",
        extracted_text=data.resume_text,
        extracted_skills=",".join(all_skills),
        file_name=filename,
        file_path=file_location,
        file_type="txt",
        overall_score=overall_score,
        semantic_score=semantic_score,
        skill_score=skill_score,
        explanation=explanation,
        ai_summary=ai_summary,
        score_breakdown_json=score_breakdown_json,
        skill_gap_json=skill_gap_json
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    return {
        "message": "Resume added successfully",
        "id": db_resume.id,
        "candidate_name": db_resume.candidate_name,
        "skills": all_skills,
        "score": overall_score
    }


@app.post("/upload-resume/")
@app.post("/upload-resume")
def upload_and_screen_resume(
    job_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    clean_filename = os.path.basename(file.filename)
    file_location = os.path.join(UPLOAD_DIR, clean_filename)
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    try:
        ext = os.path.splitext(clean_filename)[1].lower().replace('.', '')
        if ext not in ['pdf', 'docx', 'txt']:
            ext = 'pdf' if 'pdf' in file.content_type.lower() else 'docx'

        parsed_data = parse_resume(file_location)
        
        candidate_name = clean_filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title()
        if parsed_data.get("email"):
            email_user = parsed_data["email"].split('@')[0].replace('.', ' ').replace('_', ' ').title()
            if len(email_user) > 2:
                candidate_name = f"{candidate_name} ({email_user})"

        overall_score = None
        semantic_score = None
        skill_score = None
        explanation = None
        ai_summary = None
        score_breakdown_json = None
        skill_gap_json = None
        matched_skills = []
        missing_skills = []
        score_breakdown = {}
        skill_gap = {}

        if job_id:
            job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
            if job:
                job_data = {
                    "title": job.title,
                    "description": job.description,
                    "required_skills": [s.strip() for s in job.required_skills.split(",") if s.strip()]
                }
                scores = matcher.compute_overall_score(parsed_data, job_data)
                overall_score = scores["overall_score"]
                semantic_score = scores["semantic_score"]
                skill_score = scores["skill_score"]
                explanation = scores["explanation"]
                ai_summary = scores.get("ai_summary", "")
                score_breakdown_json = json.dumps(scores.get("score_breakdown", {}))
                skill_gap_json = json.dumps(scores.get("skill_gap", {}))
                matched_skills = scores.get("matched_skills", [])
                missing_skills = scores.get("missing_skills", [])
                score_breakdown = scores.get("score_breakdown", {})
                skill_gap = scores.get("skill_gap", {})

        db_resume = Resume(
            job_id=job_id,
            candidate_name=candidate_name,
            candidate_email=parsed_data.get("email", ""),
            candidate_phone=parsed_data.get("phone", ""),
            extracted_text=parsed_data.get("text", ""),
            extracted_skills=",".join(parsed_data.get("skills", [])),
            file_name=clean_filename,
            file_path=file_location,
            file_type=ext,
            overall_score=overall_score,
            semantic_score=semantic_score,
            skill_score=skill_score,
            explanation=explanation,
            ai_summary=ai_summary,
            score_breakdown_json=score_breakdown_json,
            skill_gap_json=skill_gap_json
        )
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)
        
        return {
            "message": "Resume uploaded and saved successfully",
            "candidate_id": db_resume.id,
            "candidate_name": candidate_name,
            "score": db_resume.overall_score,
            "file_name": clean_filename,
            "file_type": ext,
            "file_url": f"/uploads/{clean_filename}",
            "ai_summary": ai_summary or "",
            "score_breakdown": score_breakdown,
            "skill_gap": skill_gap,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/all-resumes/")
@app.get("/all-resumes")
def get_all_resumes(db: Session = Depends(get_db)):
    resumes = db.query(Resume).order_by(Resume.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "job_id": r.job_id,
            "candidate_name": r.candidate_name,
            "candidate_email": r.candidate_email,
            "candidate_phone": r.candidate_phone,
            "extracted_skills": r.extracted_skills,
            "extracted_text": r.extracted_text[:250] + "..." if len(r.extracted_text or "") > 250 else r.extracted_text,
            "file_name": r.file_name,
            "file_type": r.file_type or "txt",
            "overall_score": r.overall_score,
            "created_at": r.created_at.isoformat() if r.created_at else ""
        }
        for r in resumes
    ]


@app.delete("/resumes/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted successfully"}


# ========================
# AI Matching & Candidate Screening
# ========================
@app.post("/match-job-resumes/{job_id}")
def match_job_resumes(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job Description not found")

    resumes = db.query(Resume).all()
    if not resumes:
        return {"results": [], "message": "No candidate resumes found. Please add or upload resumes first."}

    job_data = {
        "title": job.title,
        "description": job.description,
        "required_skills": [s.strip() for s in job.required_skills.split(",") if s.strip()]
    }

    results = []
    for r in resumes:
        parsed_data = {
            "text": r.extracted_text or "",
            "email": r.candidate_email or "",
            "phone": r.candidate_phone or "",
            "skills": [s.strip() for s in (r.extracted_skills or "").split(",") if s.strip()]
        }

        scores = matcher.compute_overall_score(parsed_data, job_data)

        r.job_id = job_id
        r.overall_score = scores["overall_score"]
        r.semantic_score = scores["semantic_score"]
        r.skill_score = scores["skill_score"]
        r.explanation = scores["explanation"]
        r.ai_summary = scores.get("ai_summary", "")
        r.score_breakdown_json = json.dumps(scores.get("score_breakdown", {}))
        r.skill_gap_json = json.dumps(scores.get("skill_gap", {}))

        results.append({
            "id": r.id,
            "job_id": job_id,
            "candidate_name": r.candidate_name,
            "candidate_email": r.candidate_email,
            "candidate_phone": r.candidate_phone,
            "extracted_skills": r.extracted_skills,
            "extracted_text": r.extracted_text,
            "file_name": r.file_name,
            "file_type": r.file_type or "pdf",
            "file_url": f"/uploads/{r.file_name}" if r.file_name else None,
            "overall_score": scores["overall_score"],
            "semantic_score": scores["semantic_score"],
            "skill_score": scores["skill_score"],
            "explanation": scores["explanation"],
            "ai_summary": scores.get("ai_summary", ""),
            "score_breakdown": scores.get("score_breakdown", {}),
            "skill_gap": scores.get("skill_gap", {}),
        })

    db.commit()
    results.sort(key=lambda x: x["overall_score"], reverse=True)
    return {"results": results, "job_title": job.title}


@app.get("/rank-candidates/{job_id}")
def rank_candidates(job_id: int, db: Session = Depends(get_db)):
    resumes = db.query(Resume).filter(Resume.job_id == job_id).order_by(Resume.overall_score.desc()).all()
    results = []
    for r in resumes:
        file_url = f"/uploads/{r.file_name}" if r.file_name else None
        result = {
            "id": r.id,
            "job_id": r.job_id,
            "candidate_name": r.candidate_name,
            "candidate_email": r.candidate_email,
            "candidate_phone": r.candidate_phone,
            "extracted_skills": r.extracted_skills,
            "extracted_text": r.extracted_text,
            "file_name": r.file_name,
            "file_type": r.file_type or "pdf",
            "file_url": file_url,
            "overall_score": r.overall_score,
            "semantic_score": r.semantic_score,
            "skill_score": r.skill_score,
            "explanation": r.explanation,
            "ai_summary": r.ai_summary or "",
            "score_breakdown": json.loads(r.score_breakdown_json) if r.score_breakdown_json else {},
            "skill_gap": json.loads(r.skill_gap_json) if r.skill_gap_json else {},
        }
        results.append(result)
    return results


@app.get("/screening-report/{resume_id}")
def get_report(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {
        "id": resume.id,
        "job_id": resume.job_id,
        "candidate_name": resume.candidate_name,
        "candidate_email": resume.candidate_email,
        "candidate_phone": resume.candidate_phone,
        "extracted_skills": resume.extracted_skills,
        "extracted_text": resume.extracted_text,
        "file_name": resume.file_name,
        "file_type": resume.file_type or "pdf",
        "file_url": f"/uploads/{resume.file_name}" if resume.file_name else None,
        "overall_score": resume.overall_score,
        "semantic_score": resume.semantic_score,
        "skill_score": resume.skill_score,
        "explanation": resume.explanation,
        "ai_summary": resume.ai_summary or "",
        "score_breakdown": json.loads(resume.score_breakdown_json) if resume.score_breakdown_json else {},
        "skill_gap": json.loads(resume.skill_gap_json) if resume.skill_gap_json else {},
    }

# ========================
# File Preview & Download Endpoints
# ========================
@app.get("/resume-preview/{resume_id}")
def preview_resume_file(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume or not resume.file_path or not os.path.exists(resume.file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on disk")
    
    media_type = "application/pdf"
    if resume.file_name and resume.file_name.lower().endswith(".docx"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif resume.file_name and resume.file_name.lower().endswith(".txt"):
        media_type = "text/plain"

    return FileResponse(
        resume.file_path,
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename={resume.file_name}"}
    )

@app.get("/download-resume/{resume_id}")
def download_resume_file(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume or not resume.file_path or not os.path.exists(resume.file_path):
        raise HTTPException(status_code=404, detail="Resume file not found on disk")
    
    return FileResponse(
        resume.file_path,
        filename=resume.file_name or "resume.pdf",
        headers={"Content-Disposition": f"attachment; filename={resume.file_name}"}
    )

# ========================
# Auto Job Recommendations
# ========================
@app.get("/recommend-jobs/{resume_id}")
def recommend_jobs(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    all_jobs = db.query(JobDescription).all()
    if not all_jobs:
        return {"recommendations": [], "message": "No jobs available"}
    
    jobs_data = [
        {
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "required_skills": [s.strip() for s in j.required_skills.split(",") if s.strip()]
        }
        for j in all_jobs
    ]
    
    resume_skills = [s.strip() for s in (resume.extracted_skills or "").split(",") if s.strip()]
    
    recommendations = matcher.recommend_jobs_for_resume(
        resume.extracted_text or "", resume_skills, jobs_data
    )
    
    return {"recommendations": recommendations, "candidate_name": resume.candidate_name}

# ========================
# Dashboard Stats
# ========================
@app.get("/dashboard-stats/")
@app.get("/dashboard-stats")
def dashboard_stats(db: Session = Depends(get_db)):
    total_jobs = db.query(JobDescription).count()
    total_resumes = db.query(Resume).count()
    
    from sqlalchemy import func
    avg_score = db.query(func.avg(Resume.overall_score)).scalar() or 0
    
    return {
        "total_jobs": total_jobs,
        "total_resumes": total_resumes,
        "avg_score": round(avg_score, 1)
    }
