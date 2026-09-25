from sentence_transformers import SentenceTransformer, util
import torch
import re

class MatchingEngine:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        
    def get_embedding(self, text: str):
        return self.model.encode(text, convert_to_tensor=True)
        
    def calculate_semantic_similarity(self, resume_text: str, jd_text: str) -> float:
        resume_emb = self.get_embedding(resume_text)
        jd_emb = self.get_embedding(jd_text)
        cosine_scores = util.cos_sim(resume_emb, jd_emb)
        score = cosine_scores.item() * 100
        return max(0, min(100, score))

    def calculate_skill_match(self, candidate_skills: list, required_skills: list) -> dict:
        cand_set = set([s.lower().strip() for s in candidate_skills])
        req_set = set([s.lower().strip() for s in required_skills])
        
        if not req_set:
            return {"score": 100, "matched": list(cand_set), "missing": []}
            
        matched_skills = req_set.intersection(cand_set)
        missing_skills = req_set.difference(cand_set)
        
        score = (len(matched_skills) / len(req_set)) * 100
        
        return {
            "score": round(score, 2),
            "matched": sorted(list(matched_skills)),
            "missing": sorted(list(missing_skills))
        }

    def _compute_category_similarity(self, text1: str, text2: str) -> float:
        """Compute semantic similarity between two text segments."""
        if not text1.strip() or not text2.strip():
            return 0.0
        emb1 = self.get_embedding(text1)
        emb2 = self.get_embedding(text2)
        score = util.cos_sim(emb1, emb2).item() * 100
        return round(max(0, min(100, score)), 2)

    def compute_score_breakdown(self, resume_data: dict, job_data: dict) -> dict:
        """
        Break the score into 3 categories:
        - Skills Match: keyword overlap of required vs candidate skills
        - Experience Match: semantic similarity of experience-related text
        - Education Match: semantic similarity of education-related text
        """
        resume_text = resume_data["text"]

        # 1. Skills Match (already computed by keyword overlap)
        skill_analysis = self.calculate_skill_match(resume_data["skills"], job_data["required_skills"])
        skills_score = skill_analysis["score"]

        # 2. Experience Match - extract experience sentences and compare
        exp_keywords = ['experience', 'worked', 'intern', 'years', 'project', 'developed',
                        'built', 'managed', 'led', 'company', 'organization', 'deployed']
        exp_sentences = [s.strip() for s in resume_text.split('.') 
                         if any(kw in s.lower() for kw in exp_keywords)]
        exp_text = '. '.join(exp_sentences[:10]) if exp_sentences else resume_text[:300]
        exp_query = f"Professional work experience for {job_data.get('title', 'the role')}"
        experience_score = self._compute_category_similarity(exp_query, exp_text)

        # 3. Education Match - extract education sentences and compare
        edu_keywords = ['b.tech', 'btech', 'bachelor', 'master', 'm.tech', 'mba', 'phd',
                        'degree', 'university', 'college', 'cgpa', 'gpa', 'graduated',
                        'computer science', 'engineering', 'bca', 'mca', 'bsc', 'msc']
        edu_sentences = [s.strip() for s in resume_text.split('.')
                         if any(kw in s.lower() for kw in edu_keywords)]
        edu_text = '. '.join(edu_sentences[:5]) if edu_sentences else resume_text[:200]
        edu_query = f"Education qualification for {job_data.get('title', 'the role')}"
        education_score = self._compute_category_similarity(edu_query, edu_text)

        return {
            "skills_score": skills_score,
            "experience_score": experience_score,
            "education_score": education_score
        }

    def generate_ai_summary(self, candidate_name: str, job_title: str, overall_score: float,
                           skill_analysis: dict, score_breakdown: dict, resume_text: str) -> str:
        """
        Generate an intelligent AI summary explaining why a candidate fits or doesn't.
        """
        # Detect experience years from resume
        exp_years = 0
        patterns = [r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)',
                     r'experience\s*(?:of)?\s*(\d+)\+?\s*(?:years?|yrs?)']
        for pattern in patterns:
            matches = re.findall(pattern, resume_text.lower())
            for m in matches:
                y = int(m)
                if y <= 40:
                    exp_years = max(exp_years, y)

        # Determine fit level
        if overall_score >= 65:
            fit = "strong"
            emoji = "🟢"
        elif overall_score >= 40:
            fit = "moderate"
            emoji = "🟡"
        else:
            fit = "low"
            emoji = "🔴"

        parts = []

        # Opening
        if fit == "strong":
            parts.append(f"{emoji} {candidate_name} is a strong match for the {job_title} position with an overall score of {overall_score:.1f}%.")
        elif fit == "moderate":
            parts.append(f"{emoji} {candidate_name} shows moderate alignment with the {job_title} role, scoring {overall_score:.1f}%.")
        else:
            parts.append(f"{emoji} {candidate_name} has limited alignment with the {job_title} position ({overall_score:.1f}% match).")

        # Skills
        matched = skill_analysis.get("matched", [])
        missing = skill_analysis.get("missing", [])
        total_req = len(matched) + len(missing)
        if matched:
            parts.append(f"✅ Possesses {len(matched)}/{total_req} required skills: {', '.join(matched[:6])}.")
        if missing:
            parts.append(f"❌ Missing skills: {', '.join(missing[:6])}.")

        # Score breakdown insight
        bd = score_breakdown
        scores_map = {"skills": bd["skills_score"], "experience": bd["experience_score"], "education": bd["education_score"]}
        best = max(scores_map, key=scores_map.get)
        worst = min(scores_map, key=scores_map.get)
        if best != worst:
            parts.append(f"📊 Strongest in {best} ({scores_map[best]:.0f}%), needs improvement in {worst} ({scores_map[worst]:.0f}%).")

        # Experience
        if exp_years > 0:
            parts.append(f"💼 Has approximately {exp_years} year(s) of experience.")
        else:
            parts.append("💼 Appears to be a fresher/entry-level candidate.")

        # Extra skills
        extra = [s for s in (resume_data_skills if 'resume_data_skills' in dir() else []) if s.lower() not in [m.lower() for m in matched]]

        # Recommendation
        if fit == "strong":
            parts.append("👉 Recommendation: Proceed to interview round.")
        elif fit == "moderate":
            parts.append("👉 Recommendation: Consider for screening call to assess skill gaps.")
        else:
            parts.append("👉 Recommendation: May not be the best fit for this specific role.")

        return ' '.join(parts)

    def compute_overall_score(self, resume_data: dict, job_data: dict) -> dict:
        """
        Calculates the overall match score with full AI analysis.
        Returns overall score, breakdown, skill gap, and AI summary.
        """
        # 1. Semantic Similarity
        semantic_score = self.calculate_semantic_similarity(resume_data["text"], job_data["description"])
        
        # 2. Skill Match
        skill_analysis = self.calculate_skill_match(resume_data["skills"], job_data["required_skills"])
        skill_score = skill_analysis["score"]
        
        # 3. Score Breakdown
        score_breakdown = self.compute_score_breakdown(resume_data, job_data)
        
        # Overall Score (weighted)
        overall_score = (semantic_score * 0.5) + (skill_score * 0.5)
        
        # 4. AI Summary
        ai_summary = self.generate_ai_summary(
            resume_data.get("email", "Candidate"),
            job_data.get("title", "the role"),
            overall_score, skill_analysis, score_breakdown,
            resume_data["text"]
        )
        
        # Legacy explanation for backward compatibility
        explanation = (
            f"The candidate achieved an overall match score of {overall_score:.1f}%. "
            f"This is based on a semantic alignment of {semantic_score:.1f}% with the job description, "
            f"and a skill match of {skill_score:.1f}%. "
            f"They possess {len(skill_analysis['matched'])} out of {len(job_data['required_skills'])} required skills."
        )
        
        return {
            "overall_score": round(overall_score, 2),
            "semantic_score": round(semantic_score, 2),
            "skill_score": round(skill_score, 2),
            "matched_skills": skill_analysis["matched"],
            "missing_skills": skill_analysis["missing"],
            "explanation": explanation,
            # NEW: AI Intelligence features
            "score_breakdown": score_breakdown,
            "ai_summary": ai_summary,
            "skill_gap": {
                "matched": skill_analysis["matched"],
                "missing": skill_analysis["missing"],
                "match_percent": skill_analysis["score"]
            }
        }

    def recommend_jobs_for_resume(self, resume_text: str, resume_skills: list, jobs: list) -> list:
        """
        Auto Job Recommendations: Given a resume, rank all available jobs by fit.
        """
        if not resume_text or not jobs:
            return []

        results = []
        for job in jobs:
            # Semantic similarity
            sem_score = self.calculate_semantic_similarity(resume_text, job["description"])
            # Skill overlap
            skill_result = self.calculate_skill_match(resume_skills, job.get("required_skills", []))
            # Combined score
            combined = (sem_score * 0.5) + (skill_result["score"] * 0.5)

            results.append({
                "job_id": job["id"],
                "title": job["title"],
                "required_skills": ",".join(job.get("required_skills", [])),
                "match_score": round(combined, 2),
                "semantic_score": round(sem_score, 2),
                "skill_score": round(skill_result["score"], 2),
                "matched_skills": skill_result["matched"],
                "missing_skills": skill_result["missing"]
            })

        results.sort(key=lambda x: x["match_score"], reverse=True)
        return results

# Singleton instance
matcher = MatchingEngine()
