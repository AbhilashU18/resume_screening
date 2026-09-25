# AI-Based Resume Screening and Job Matching System

## Overview
This is a full-stack real-world application that uses Natural Language Processing (NLP) and Sentence-BERT (SBERT) to automate resume screening and match candidates with job descriptions.

## Features
- **Semantic Matching**: Uses HuggingFace `all-MiniLM-L6-v2` to understand context, avoiding keyword stuffing.
- **Skill Extraction**: Uses spaCy for NER to extract tech skills.
- **Explainable AI (XAI)**: Generates a clear report on why a candidate was ranked.
- **Unbiased Scoring**: Ranks solely based on semantic similarity and technical skills overlap.

## Tech Stack
- **Frontend**: React.js, Vite
- **Backend**: FastAPI, SQLAlchemy
- **Database**: PostgreSQL
- **ML/AI**: PyTorch, Sentence-Transformers, spaCy
- **Document Processing**: PyMuPDF, python-docx

## How to Run (Using Docker)
1. Ensure Docker and Docker Compose are installed.
2. Run `docker-compose up --build`
3. Backend API will be available at `http://localhost:8000/docs`
4. Frontend Dashboard will be available at `http://localhost:3000`

## How to Test
```bash
# In the backend directory
pip install -r requirements.txt
pytest ../tests/
```

## Generate Synthetic Dataset
```bash
python datasets/generate_synthetic_data.py
```
