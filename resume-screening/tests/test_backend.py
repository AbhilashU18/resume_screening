import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to AI Resume Screening System"}

def test_create_job():
    response = client.post(
        "/job-description/",
        json={
            "title": "Data Scientist",
            "description": "Looking for a Data Scientist.",
            "required_skills": ["Python", "Machine Learning", "SQL"]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Data Scientist"
    assert data["required_skills"] == "Python,Machine Learning,SQL"
