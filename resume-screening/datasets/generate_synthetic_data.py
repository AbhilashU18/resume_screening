import json
import random

def generate_synthetic_data(num_samples=100):
    skills_pool = [
        "Python", "Java", "C++", "React", "Node.js", "SQL", "Docker", "Kubernetes",
        "AWS", "Machine Learning", "Deep Learning", "NLP", "TensorFlow", "PyTorch", "FastAPI"
    ]
    
    roles = [
        {"title": "Machine Learning Engineer", "desc": "Looking for an ML engineer with experience in Python, TensorFlow, and NLP.", "req_skills": ["Python", "Machine Learning", "TensorFlow", "NLP"]},
        {"title": "Backend Developer", "desc": "We need a strong backend dev proficient in Python, FastAPI, and SQL databases.", "req_skills": ["Python", "FastAPI", "SQL"]},
        {"title": "Frontend Developer", "desc": "Seeking a frontend developer experienced with React, HTML, CSS, and modern JavaScript.", "req_skills": ["React", "JavaScript", "HTML", "CSS"]},
        {"title": "DevOps Engineer", "desc": "DevOps engineer to manage our cloud infrastructure using AWS, Docker, and Kubernetes.", "req_skills": ["AWS", "Docker", "Kubernetes"]}
    ]
    
    dataset = []
    
    for i in range(num_samples):
        # Pick a random role
        role = random.choice(roles)
        
        # Decide if this candidate is a good match (0.0 to 1.0)
        match_quality = random.random()
        
        candidate_skills = []
        if match_quality > 0.7:
            # Good match: gets most required skills + some random ones
            candidate_skills = [s for s in role["req_skills"] if random.random() > 0.2]
        elif match_quality > 0.4:
            # Partial match: gets a few required skills
            candidate_skills = [s for s in role["req_skills"] if random.random() > 0.5]
        else:
            # Poor match: mostly random skills not in req_skills
            candidate_skills = [s for s in role["req_skills"] if random.random() > 0.8]
            
        # Add random noise skills
        num_noise = random.randint(1, 4)
        noise_skills = random.sample(skills_pool, num_noise)
        candidate_skills.extend([s for s in noise_skills if s not in candidate_skills])
        
        resume_text = (
            f"Passionate software professional with experience in {', '.join(candidate_skills)}. "
            "I have worked on multiple projects delivering scalable solutions. "
            "Strong team player and quick learner."
        )
        
        # Approximate a 'true' label score for fine-tuning based on overlap
        overlap = set(candidate_skills).intersection(set(role["req_skills"]))
        skill_score = len(overlap) / len(role["req_skills"]) if role["req_skills"] else 0
        
        dataset.append({
            "resume_id": i + 1,
            "resume_text": resume_text,
            "resume_skills": candidate_skills,
            "job_title": role["title"],
            "job_description": role["desc"],
            "job_req_skills": role["req_skills"],
            "label_score": round(skill_score, 2)
        })
        
    with open("datasets/synthetic_dataset.json", "w") as f:
        json.dump(dataset, f, indent=4)
        
    print(f"Successfully generated {num_samples} synthetic resume-job pairs in datasets/synthetic_dataset.json")

if __name__ == "__main__":
    generate_synthetic_data(500)
