import pymupdf as fitz  # PyMuPDF
import docx
import re
import spacy
import sys

# Load English tokenizer, tagger, parser with fallback to blank model
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = spacy.blank("en")

def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            text += page.get_text()
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_docx(docx_path: str) -> str:
    text = ""
    try:
        doc = docx.Document(docx_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error reading DOCX: {e}")
    return text

def clean_text(text: str) -> str:
    text = re.sub(r'\n+', '\n', text)
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)  # Remove non-ascii
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_email(text: str) -> str:
    email_regex = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    emails = re.findall(email_regex, text)
    return emails[0] if emails else ""

def extract_phone(text: str) -> str:
    phone_regex = r'\(?\b[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b'
    phones = re.findall(phone_regex, text)
    return phones[0] if phones else ""

def extract_skills(text: str, predefined_skills: list = None) -> list:
    if predefined_skills is None:
        predefined_skills = [
            "python", "java", "c++", "c#", "javascript", "react", "node.js",
            "sql", "mysql", "postgresql", "mongodb", "docker", "kubernetes",
            "aws", "azure", "gcp", "machine learning", "deep learning", 
            "nlp", "bert", "tensorflow", "pytorch", "scikit-learn", "fastapi",
            "flask", "django", "html", "css", "git", "linux", "jenkins", "terraform",
            "ansible", "ci/cd", "bash", "rest api", "microservices", "kafka",
            "power bi", "tableau", "excel", "agile", "scrum", "jira"
        ]
    
    text_lower = text.lower()
    found_skills = set()
    
    for skill in predefined_skills:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.add(skill)
            
    return sorted(list(found_skills))

def extract_entities(text: str):
    doc = nlp(text)
    entities = {}
    for ent in doc.ents:
        if ent.label_ not in entities:
            entities[ent.label_] = []
        entities[ent.label_].append(ent.text)
    return entities

def parse_resume(file_path: str) -> dict:
    if file_path.lower().endswith('.pdf'):
        raw_text = extract_text_from_pdf(file_path)
    elif file_path.lower().endswith('.docx'):
        raw_text = extract_text_from_docx(file_path)
    else:
        # Fallback text reading
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                raw_text = f.read()
        except Exception:
            raise ValueError("Unsupported file format. Please upload a PDF or DOCX.")
        
    cleaned_text = clean_text(raw_text)
    email = extract_email(cleaned_text)
    phone = extract_phone(cleaned_text)
    skills = extract_skills(cleaned_text)
    
    return {
        "text": cleaned_text,
        "raw_text": raw_text,
        "email": email,
        "phone": phone,
        "skills": skills
    }
