import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = typeof window !== 'undefined' && window.location.hostname
  ? `http://${window.location.hostname}:8000`
  : 'http://127.0.0.1:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  // Data states
  const [stats, setStats] = useState({ total_jobs: 0, total_resumes: 0, avg_score: 0 });
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Add Resume Form
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candSkills, setCandSkills] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeMsg, setResumeMsg] = useState('');
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [resumeInputMode, setResumeInputMode] = useState('upload'); // 'upload' or 'text'

  // Add Job Form
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobSkills, setJobSkills] = useState('');
  const [jobExp, setJobExp] = useState('0');
  const [jobDesc, setJobDesc] = useState('');
  const [jobMsg, setJobMsg] = useState('');
  const [isSavingJob, setIsSavingJob] = useState(false);

  // Match Candidates Form
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [matchMsg, setMatchMsg] = useState('');

  // Modals & Preview
  const [previewResume, setPreviewResume] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [recoCandidateName, setRecoCandidateName] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingDashboard(true);
    try {
      const [jobsRes, resumesRes, statsRes] = await Promise.all([
        axios.get(`${API}/job-descriptions/`),
        axios.get(`${API}/all-resumes/`),
        axios.get(`${API}/dashboard-stats/`)
      ]);
      setJobs(jobsRes.data);
      setResumes(resumesRes.data);
      setStats(statsRes.data);

      if (jobsRes.data.length > 0 && !selectedJobId) {
        setSelectedJobId(jobsRes.data[0].id);
      }
      if (resumesRes.data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(resumesRes.data[0].id);
      }
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API}/job-descriptions/`);
      setJobs(res.data);
      if (res.data.length > 0 && !selectedJobId) setSelectedJobId(res.data[0].id);
    } catch (e) { console.error(e); }
  };

  const fetchResumes = async () => {
    try {
      const res = await axios.get(`${API}/all-resumes/`);
      setResumes(res.data);
      if (res.data.length > 0 && !selectedResumeId) setSelectedResumeId(res.data[0].id);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/dashboard-stats/`);
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  // Quick fill sample templates
  const fillSampleJob = (type) => {
    if (type === 'devops') {
      setJobTitle('DevOps Engineer');
      setJobCompany('MuSigma');
      setJobSkills('Python, Docker, Kubernetes, AWS, CI/CD, Linux, Jenkins');
      setJobExp('0');
      setJobDesc('We are seeking an entry-level / junior DevOps Engineer to build automated CI/CD pipelines, manage Docker containers, deploy Kubernetes clusters, and automate AWS cloud infrastructure using Python and Bash scripting.');
    } else if (type === 'ml') {
      setJobTitle('Machine Learning Engineer');
      setJobCompany('ABC Technologies');
      setJobSkills('Python, PyTorch, TensorFlow, BERT, NLP, SQL, Scikit-learn');
      setJobExp('2');
      setJobDesc('Looking for an ML Engineer with hands-on experience in Natural Language Processing, Transformer architectures (BERT, RoBERTa), and deep learning model training using PyTorch and FastAPI.');
    } else if (type === 'fullstack') {
      setJobTitle('Full Stack Web Developer');
      setJobCompany('TechCorp Global');
      setJobSkills('React, JavaScript, Node.js, Python, SQL, REST API, HTML, CSS');
      setJobExp('1');
      setJobDesc('Responsible for building scalable web applications with React frontend, RESTful backend microservices, and database optimization.');
    }
  };

  // 1. Handle Save Resume
  const handleSaveResume = async (e) => {
    if (e) e.preventDefault();
    setResumeMsg('');
    setIsSavingResume(true);

    try {
      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        if (candName) formData.append('candidate_name', candName);
        if (candEmail) formData.append('email', candEmail);

        const res = await axios.post(`${API}/upload-resume/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResumeMsg(`✅ Resume "${res.data.candidate_name}" uploaded and parsed successfully!`);
      } else {
        if (!resumeText.trim()) {
          setResumeMsg('❌ Please enter resume text or choose a document file.');
          setIsSavingResume(false);
          return;
        }
        await axios.post(`${API}/add-resume-manual/`, {
          candidate_name: candName || 'Candidate',
          candidate_email: candEmail || '',
          candidate_phone: candPhone || '',
          skills: candSkills || '',
          resume_text: resumeText
        });
        setResumeMsg(`✅ Resume for "${candName || 'Candidate'}" saved successfully!`);
      }

      setCandName('');
      setCandEmail('');
      setCandPhone('');
      setCandSkills('');
      setResumeText('');
      setResumeFile(null);
      const fileInp = document.getElementById('fileUploadInput');
      if (fileInp) fileInp.value = '';

      fetchResumes();
      fetchStats();
    } catch (err) {
      setResumeMsg(`❌ Error saving resume: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsSavingResume(false);
    }
  };

  // 2. Handle Save Job
  const handleSaveJob = async (e) => {
    if (e) e.preventDefault();
    setJobMsg('');

    if (!jobTitle.trim()) {
      setJobMsg('❌ Please enter a Job Title.');
      return;
    }
    if (!jobDesc.trim()) {
      setJobMsg('❌ Please enter a Job Description.');
      return;
    }

    setIsSavingJob(true);

    try {
      const skillsArray = (jobSkills || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        title: jobTitle.trim(),
        company: jobCompany.trim(),
        description: jobDesc.trim(),
        required_skills: skillsArray.length > 0 ? skillsArray : ['General Skills'],
        min_experience: parseInt(jobExp) || 0
      };

      const res = await axios.post(`${API}/job-description/`, payload);
      setJobMsg(`✅ Job "${jobTitle}" published successfully!`);
      
      if (res.data?.id) {
        setSelectedJobId(res.data.id);
      }

      // Clear input fields
      setJobTitle('');
      setJobCompany('');
      setJobSkills('');
      setJobExp('0');
      setJobDesc('');

      fetchJobs();
      fetchStats();
    } catch (err) {
      let errorText = err.message;
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorText = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorText = err.response.data.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
        } else {
          errorText = JSON.stringify(err.response.data.detail);
        }
      }
      setJobMsg(`❌ Error saving job: ${errorText}`);
    } finally {
      setIsSavingJob(false);
    }
  };

  // 3. Handle Calculate Match
  const handleCalculateMatch = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setMatchMsg('Please select both a candidate resume and a job description.');
      return;
    }

    setIsCalculating(true);
    setMatchMsg('');
    setMatchResult(null);

    try {
      const res = await axios.post(`${API}/match-job-resumes/${selectedJobId}`);
      const matchedList = res.data.results || [];
      const currentCandidateMatch = matchedList.find(c => c.id === Number(selectedResumeId));

      if (currentCandidateMatch) {
        setMatchResult(currentCandidateMatch);
        setRecentMatches(prev => [
          {
            candidate: currentCandidateMatch.candidate_name,
            job: res.data.job_title || 'Target Job',
            score: currentCandidateMatch.overall_score,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev.slice(0, 4)
        ]);
        setMatchMsg('✅ Match calculated successfully with BERT semantic embeddings!');
      } else {
        setMatchMsg('❌ Could not evaluate match for selected candidate.');
      }
      fetchStats();
    } catch (err) {
      setMatchMsg(`❌ Error calculating match: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  // Delete Resume
  const handleDeleteResume = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    try {
      await axios.delete(`${API}/resumes/${id}`);
      fetchResumes();
      fetchStats();
    } catch (e) { console.error(e); }
  };

  // Delete Job
  const handleDeleteJob = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    try {
      await axios.delete(`${API}/job-descriptions/${id}`);
      fetchJobs();
      fetchStats();
    } catch (e) { console.error(e); }
  };

  // Open Preview Modal
  const handleOpenPreview = async (candidate) => {
    try {
      const res = await axios.get(`${API}/screening-report/${candidate.id}`);
      setPreviewResume(res.data);
    } catch (e) {
      setPreviewResume(candidate);
    }
  };

  // Open Job Recommendations
  const fetchRecommendations = async (resumeId, name) => {
    try {
      const res = await axios.get(`${API}/recommend-jobs/${resumeId}`);
      setRecommendations(res.data.recommendations || []);
      setRecoCandidateName(name);
    } catch (e) { console.error(e); }
  };

  // SVG Score Ring Component with Gradient
  const ScoreRing = ({ score, size = 76 }) => {
    const val = score || 0;
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (val / 100) * circumference;
    const isGreat = val >= 65;
    const isFair = val >= 40 && val < 65;
    
    const strokeColor = isGreat ? '#10b981' : isFair ? '#f59e0b' : '#ef4444';
    const gradientId = `scoreGrad-${size}-${Math.round(val)}`;

    return (
      <div className="score-ring-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="score-ring-svg">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isGreat ? '#34d399' : isFair ? '#fbbf24' : '#f87171'} />
              <stop offset="100%" stopColor={strokeColor} />
            </linearGradient>
          </defs>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(226, 232, 240, 0.7)" strokeWidth="6" />
          <circle
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            className="score-ring-fill"
          />
        </svg>
        <div className="score-ring-text">
          <span className="score-val">{val.toFixed(0)}</span>
          <span className="score-pct">%</span>
        </div>
      </div>
    );
  };

  // Score Bar Component
  const ScoreBar = ({ label, score, icon }) => {
    const val = score || 0;
    const color = val >= 65 ? '#10b981' : val >= 40 ? '#f59e0b' : '#ef4444';
    return (
      <div className="score-bar-row">
        <div className="score-bar-info">
          <span className="score-bar-label">{icon} {label}</span>
          <span className="score-bar-val" style={{ color }}>{val.toFixed(1)}%</span>
        </div>
        <div className="score-bar-track">
          <div className="score-bar-fill" style={{ width: `${Math.min(100, Math.max(0, val))}%`, backgroundColor: color }}></div>
        </div>
      </div>
    );
  };

  const getCandidateInitials = (name) => {
    if (!name) return 'C';
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="app-container">
      {/* Background Decorative Glow Elements */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <div className="app-wrapper">
        
        {/* ========================================================================= */}
        {/* HERO BRAND BANNER */}
        {/* ========================================================================= */}
        <header className="hero-banner">
          <div className="hero-badge">
            <span className="badge-pulse"></span>
            ✨ BERT-Powered AI Semantic Screening Engine
          </div>
          <h1 className="hero-title">
            Resume<span className="hero-accent">AI</span> Matcher
          </h1>
          <p className="hero-subtitle">
            Next-generation talent screening powered by Sentence-BERT embeddings, multi-factor skill analysis, and instant document previews.
          </p>
        </header>

        {/* ========================================================================= */}
        {/* INTERACTIVE SEGMENTED TABS */}
        {/* ========================================================================= */}
        <nav className="tabs-nav">
          <div className="tabs-pills-wrap">
            {[
              { id: 'dashboard', icon: '📊', label: 'Dashboard' },
              { id: 'add-resume', icon: '📄', label: 'Add Resume' },
              { id: 'add-job', icon: '💼', label: 'Add Job' },
              { id: 'match', icon: '🎯', label: 'Match Candidates' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
                {activeTab === tab.id && <span className="tab-indicator"></span>}
              </button>
            ))}
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* TAB 1: RECRUITER DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="glass-card fade-in">
            <div className="card-top-bar">
              <div>
                <h2 className="section-heading">Recruiter Dashboard</h2>
                <p className="section-subheading">Real-time overview of candidate pool, job openings, and AI matching metrics.</p>
              </div>
              <button className="btn-accent-sm" onClick={() => setActiveTab('match')}>
                🚀 Match Candidates Now
              </button>
            </div>

            {/* Glowing Interactive Stat Cards */}
            <div className="stats-grid">
              <div className="stat-card stat-card-purple clickable" onClick={() => setActiveTab('add-resume')} title="Click to Add/View Resumes">
                <div className="stat-icon-wrap">📄</div>
                <div className="stat-meta">
                  <span className="stat-number">{stats.total_resumes}</span>
                  <span className="stat-label">Active Resumes →</span>
                </div>
                <div className="stat-sparkle"></div>
              </div>

              <div className="stat-card stat-card-blue clickable" onClick={() => setActiveTab('add-job')} title="Click to Add/View Jobs">
                <div className="stat-icon-wrap">💼</div>
                <div className="stat-meta">
                  <span className="stat-number">{stats.total_jobs}</span>
                  <span className="stat-label">Job Postings →</span>
                </div>
                <div className="stat-sparkle"></div>
              </div>

              <div className="stat-card stat-card-emerald clickable" onClick={() => setActiveTab('match')} title="Click to Match Candidates">
                <div className="stat-icon-wrap">🎯</div>
                <div className="stat-meta">
                  <span className="stat-number">{stats.avg_score || 0}%</span>
                  <span className="stat-label">Avg Match Score →</span>
                </div>
                <div className="stat-sparkle"></div>
              </div>
            </div>

            {/* Jobs & Candidate Directory Split */}
            <div className="dashboard-content-split">
              {/* Left Column: Job Openings Directory */}
              <div className="dash-col">
                <div className="section-header-row">
                  <h3 className="sub-title">💼 Active Job Postings ({jobs.length})</h3>
                  <button className="btn-link-sm" onClick={() => setActiveTab('add-job')}>+ Add Job</button>
                </div>

                {jobs.length === 0 ? (
                  <div className="empty-box">
                    <span>💼</span>
                    <p>No job postings yet.</p>
                    <button className="btn-outline-sm" onClick={() => setActiveTab('add-job')}>
                      + Create Job Opening
                    </button>
                  </div>
                ) : (
                  <div className="candidate-mini-list">
                    {jobs.map(j => (
                      <div key={j.id} className="candidate-mini-item">
                        <div className="mini-info">
                          <div className="avatar-circle" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>💼</div>
                          <div>
                            <strong>{j.title}</strong>
                            <span className="text-muted text-xs block">
                              {(j.required_skills || '').split(',').slice(0, 3).join(', ')}
                            </span>
                          </div>
                        </div>
                        <div className="mini-actions">
                          <button
                            className="btn-preview-badge"
                            onClick={() => { setSelectedJobId(j.id); setActiveTab('match'); }}
                            title="Screen candidates for this job"
                          >
                            🎯 Screen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Candidate Inventory */}
              <div className="dash-col">
                <div className="section-header-row">
                  <h3 className="sub-title">📋 Candidate Directory ({resumes.length})</h3>
                  <button className="btn-link-sm" onClick={() => setActiveTab('add-resume')}>+ Add Resume</button>
                </div>

                {resumes.length === 0 ? (
                  <div className="empty-box">
                    <span>📂</span>
                    <p>No resumes stored in database.</p>
                    <button className="btn-outline-sm" onClick={() => setActiveTab('add-resume')}>
                      Add Resume
                    </button>
                  </div>
                ) : (
                  <div className="candidate-mini-list">
                    {resumes.slice(0, 5).map(r => (
                      <div key={r.id} className="candidate-mini-item">
                        <div className="mini-info">
                          <div className="avatar-circle">{getCandidateInitials(r.candidate_name)}</div>
                          <div>
                            <strong>{r.candidate_name}</strong>
                            <span className="text-muted text-xs block">{r.candidate_email || 'No email'}</span>
                          </div>
                        </div>
                        <div className="mini-actions">
                          <button className="btn-preview-badge" onClick={() => handleOpenPreview(r)}>
                            👁️ Preview
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ADD RESUME */}
        {/* ========================================================================= */}
        {activeTab === 'add-resume' && (
          <div className="glass-card fade-in">
            <div className="card-top-bar">
              <div>
                <h2 className="section-heading">Add Candidate Resume</h2>
                <p className="section-subheading">Upload a document or paste resume content for instant BERT parsing.</p>
              </div>
              <div className="input-toggle-pills">
                <button
                  className={`toggle-btn ${resumeInputMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setResumeInputMode('upload')}
                >
                  📁 Upload Document
                </button>
                <button
                  className={`toggle-btn ${resumeInputMode === 'text' ? 'active' : ''}`}
                  onClick={() => setResumeInputMode('text')}
                >
                  ✍️ Paste Text
                </button>
              </div>
            </div>

            {resumeMsg && (
              <div className={`alert-banner ${resumeMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                {resumeMsg}
              </div>
            )}

            <form onSubmit={handleSaveResume} className="form-modern">
              <div className="form-grid-2">
                {/* Left Column: Metadata */}
                <div className="form-panel">
                  <div className="input-group">
                    <label className="input-label">
                      <span>👤</span> Candidate Full Name
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. Monesh Kumar / Rahul Sharma"
                      value={candName}
                      onChange={e => setCandName(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      <span>📧</span> Email Address
                    </label>
                    <input
                      type="email"
                      className="input-control"
                      placeholder="candidate@example.com"
                      value={candEmail}
                      onChange={e => setCandEmail(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      <span>📞</span> Phone Number
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="+91 98765 43210"
                      value={candPhone}
                      onChange={e => setCandPhone(e.target.value)}
                    />
                  </div>

                  {resumeInputMode === 'text' && (
                    <div className="input-group">
                      <label className="input-label">
                        <span>🛠️</span> Key Technical Skills
                      </label>
                      <input
                        type="text"
                        className="input-control"
                        placeholder="e.g. Python, Docker, AWS, Kubernetes, CI/CD"
                        value={candSkills}
                        onChange={e => setCandSkills(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Right Column: Upload Zone or Textarea */}
                <div className="form-panel">
                  {resumeInputMode === 'upload' ? (
                    <div className="dropzone-modern">
                      <input
                        type="file"
                        id="fileUploadInput"
                        className="dropzone-file-input"
                        accept=".pdf,.docx,.txt"
                        onChange={e => setResumeFile(e.target.files[0])}
                      />
                      <div className="dropzone-content">
                        <div className="dropzone-icon">📥</div>
                        <h4>{resumeFile ? resumeFile.name : 'Drag & Drop or Click to Browse'}</h4>
                        <p className="text-muted text-xs">Supports PDF, Word DOCX, and TXT files</p>
                        {resumeFile && (
                          <span className="file-ready-tag">
                            ✅ Ready to process ({(resumeFile.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="input-group full-height">
                      <label className="input-label">
                        <span>📝</span> Full Resume Content / Bio
                      </label>
                      <textarea
                        className="input-control textarea-large"
                        placeholder="Paste work experience, projects, skills, education, and career summary here..."
                        value={resumeText}
                        onChange={e => setResumeText(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions-bar">
                <button type="submit" className="btn-gradient" disabled={isSavingResume}>
                  {isSavingResume ? (
                    <>
                      <span className="spinner-sm"></span> Analyzing with BERT...
                    </>
                  ) : (
                    '🚀 Analyze & Save Resume'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ADD JOB */}
        {/* ========================================================================= */}
        {activeTab === 'add-job' && (
          <div className="glass-card fade-in">
            <div className="card-top-bar">
              <div>
                <h2 className="section-heading">Add Job Description</h2>
                <p className="section-subheading">Define role parameters, required technical stack, and responsibilities for AI candidate screening.</p>
              </div>
              <div className="sample-btn-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="text-muted text-xs" style={{ alignSelf: 'center', fontWeight: '600' }}>⚡ Quick Fill:</span>
                <button type="button" className="btn-chip" onClick={() => fillSampleJob('devops')}>DevOps</button>
                <button type="button" className="btn-chip" onClick={() => fillSampleJob('ml')}>ML / AI</button>
                <button type="button" className="btn-chip" onClick={() => fillSampleJob('fullstack')}>Full Stack</button>
              </div>
            </div>

            {jobMsg && (
              <div className={`alert-banner ${jobMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                {jobMsg}
              </div>
            )}

            <form onSubmit={handleSaveJob} className="form-modern">
              <div className="form-grid-2">
                {/* Left Column */}
                <div className="form-panel">
                  <div className="input-group">
                    <label className="input-label">
                      <span>💼</span> Job Title *
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. DevOps Engineer / Machine Learning Engineer"
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      <span>🏢</span> Company / Organization
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. MuSigma / TechCorp Solutions"
                      value={jobCompany}
                      onChange={e => setJobCompany(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      <span>🛠️</span> Required Skills (comma-separated) *
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. Python, Docker, Kubernetes, AWS, CI/CD, Linux"
                      value={jobSkills}
                      onChange={e => setJobSkills(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      <span>⏳</span> Minimum Experience (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-control"
                      placeholder="0"
                      value={jobExp}
                      onChange={e => setJobExp(e.target.value)}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="form-panel">
                  <div className="input-group full-height">
                    <label className="input-label">
                      <span>📋</span> Full Job Description & Requirements *
                    </label>
                    <textarea
                      className="input-control textarea-large"
                      placeholder="Describe the responsibilities, day-to-day work, required qualifications, and technical expectations..."
                      value={jobDesc}
                      onChange={e => setJobDesc(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions-bar">
                <button type="submit" className="btn-gradient" disabled={isSavingJob}>
                  {isSavingJob ? 'Saving Job...' : '✨ Publish Job Description'}
                </button>
              </div>
            </form>

            {/* List of Active Job Postings right on Add Job screen */}
            <div style={{ marginTop: '2.5rem', paddingTop: '1.8rem', borderTop: '1px solid #e2e8f0' }}>
              <div className="section-header-row">
                <h3 className="sub-title">📋 Active Job Openings ({jobs.length})</h3>
                <span className="text-muted text-xs">Ready for screening</span>
              </div>

              {jobs.length === 0 ? (
                <p className="text-muted text-sm" style={{ padding: '0.8rem 0' }}>No jobs created yet. Use the form above to add your first job opening.</p>
              ) : (
                <div className="reco-cards-grid" style={{ marginTop: '1rem' }}>
                  {jobs.map(j => (
                    <div key={j.id} className="reco-item-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: '800' }}>{j.title}</h4>
                          <span className="text-muted text-xs">{j.description?.substring(0, 90)}...</span>
                        </div>
                        <button
                          className="btn-close-circle"
                          style={{ width: '26px', height: '26px', fontSize: '0.9rem' }}
                          onClick={() => handleDeleteJob(j.id)}
                          title="Delete this job"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="reco-skills" style={{ marginTop: '0.8rem' }}>
                        {(j.required_skills || '').split(',').map((s, idx) => s.trim() && (
                          <span key={idx} className="badge-soft">{s.trim()}</span>
                        ))}
                      </div>

                      <button
                        className="btn-accent-sm"
                        style={{ marginTop: '1rem', width: '100%' }}
                        onClick={() => { setSelectedJobId(j.id); setActiveTab('match'); }}
                      >
                        🎯 Match Resumes for this Job →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MATCH CANDIDATES */}
        {/* ========================================================================= */}
        {activeTab === 'match' && (
          <div className="glass-card fade-in">
            <div className="card-top-bar">
              <div>
                <h2 className="section-heading">🎯 AI Candidate Matcher</h2>
                <p className="section-subheading">Select a candidate and target job to calculate multi-factor BERT semantic fit scores and skill gaps.</p>
              </div>
            </div>

            {/* Selection Bar */}
            <div className="matcher-controls-box">
              <div className="matcher-grid">
                <div className="select-wrap">
                  <label className="input-label"><span>👤</span> Select Candidate Resume</label>
                  <select
                    className="select-control"
                    value={selectedResumeId}
                    onChange={e => setSelectedResumeId(e.target.value)}
                  >
                    <option value="" disabled>-- Choose a Candidate --</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.candidate_name}</option>
                    ))}
                  </select>
                </div>

                <div className="select-wrap">
                  <label className="input-label"><span>💼</span> Select Target Job</label>
                  <select
                    className="select-control"
                    value={selectedJobId}
                    onChange={e => setSelectedJobId(e.target.value)}
                  >
                    <option value="" disabled>-- Choose a Job Opening --</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="btn-gradient btn-match-trigger"
                onClick={handleCalculateMatch}
                disabled={isCalculating || !selectedResumeId || !selectedJobId}
              >
                {isCalculating ? (
                  <>
                    <span className="spinner-sm"></span> Computing Embeddings...
                  </>
                ) : (
                  '⚡ Calculate Match'
                )}
              </button>
            </div>

            {matchMsg && (
              <div className={`alert-banner ${matchMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: '1.2rem' }}>
                {matchMsg}
              </div>
            )}

            {/* Match Result Display */}
            {matchResult && (
              <div className="result-display-card fade-in">
                {/* Result Card Header */}
                <div className="result-card-header">
                  <div className="candidate-profile-summary">
                    <div className="candidate-avatar-large">
                      {getCandidateInitials(matchResult.candidate_name)}
                    </div>
                    <div>
                      <h3 className="candidate-title">{matchResult.candidate_name}</h3>
                      <div className="candidate-contacts-row">
                        {matchResult.candidate_email && <span>📧 {matchResult.candidate_email}</span>}
                        {matchResult.candidate_phone && <span>📞 {matchResult.candidate_phone}</span>}
                        {matchResult.file_name && <span className="tag-file">📄 {matchResult.file_name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="score-ring-badge-block">
                    <ScoreRing score={matchResult.overall_score} size={84} />
                    <span className={`fit-pill ${matchResult.overall_score >= 65 ? 'fit-great' : matchResult.overall_score >= 40 ? 'fit-fair' : 'fit-low'}`}>
                      {matchResult.overall_score >= 65 ? '🟢 Great Fit' : matchResult.overall_score >= 40 ? '🟡 Fair Fit' : '🔴 Low Fit'}
                    </span>
                  </div>
                </div>

                {/* AI Summary Highlight Box */}
                {matchResult.ai_summary && (
                  <div className="ai-summary-glow">
                    <div className="ai-summary-header">
                      <span className="ai-spark-icon">🧠</span>
                      <h4>AI Evaluation Summary & Recommendation</h4>
                    </div>
                    <p>{matchResult.ai_summary}</p>
                  </div>
                )}

                {/* Score Breakdown & Skill Gap Grid */}
                <div className="result-insights-grid">
                  {/* Score Breakdown */}
                  {matchResult.score_breakdown && (
                    <div className="insight-panel">
                      <h4 className="insight-title">📊 Multi-Factor Score Breakdown</h4>
                      <div className="bars-stack">
                        <ScoreBar icon="🛠️" label="Skills Overlap" score={matchResult.score_breakdown.skills_score || matchResult.skill_score || 0} />
                        <ScoreBar icon="🧠" label="Semantic Fit" score={matchResult.semantic_score || 0} />
                        <ScoreBar icon="💼" label="Experience Fit" score={matchResult.score_breakdown.experience_score || 0} />
                        <ScoreBar icon="🎓" label="Education Fit" score={matchResult.score_breakdown.education_score || 0} />
                      </div>
                    </div>
                  )}

                  {/* Skill Gap Analysis */}
                  {matchResult.skill_gap && (
                    <div className="insight-panel">
                      <div className="insight-title-row">
                        <h4 className="insight-title">🔍 Skill Gap Analysis</h4>
                        <span className="badge-match-pct">{matchResult.skill_gap.match_percent?.toFixed(0) || 0}% Match</span>
                      </div>
                      
                      <div className="skill-gap-progress-track">
                        <div className="skill-gap-progress-fill" style={{ width: `${matchResult.skill_gap.match_percent || 0}%` }}></div>
                      </div>

                      <div className="skill-tags-group">
                        {matchResult.skill_gap.matched?.length > 0 && (
                          <div className="skill-row">
                            <span className="skill-row-lbl">Matched:</span>
                            <div className="skill-pills-wrap">
                              {matchResult.skill_gap.matched.map((s, i) => (
                                <span key={i} className="skill-pill-green">✅ {s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {matchResult.skill_gap.missing?.length > 0 && (
                          <div className="skill-row">
                            <span className="skill-row-lbl">Missing:</span>
                            <div className="skill-pills-wrap">
                              {matchResult.skill_gap.missing.map((s, i) => (
                                <span key={i} className="skill-pill-red">❌ {s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="result-action-footer">
                  <button className="btn-action-primary" onClick={() => handleOpenPreview(matchResult)}>
                    👁️ View Exact Resume Preview
                  </button>
                  <button className="btn-action-secondary" onClick={() => fetchRecommendations(matchResult.id, matchResult.candidate_name)}>
                    🔄 Recommend Other Jobs
                  </button>
                  <a href={`${API}/download-resume/${matchResult.id}`} download className="btn-action-outline">
                    📥 Download Original File
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 📄 EXACT RESUME PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewResume && (
        <div className="modal-backdrop" onClick={() => setPreviewResume(null)}>
          <div className="modal-box preview-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>📄 Exact Document Preview</h3>
                <p className="text-muted text-xs">
                  Candidate: <strong>{previewResume.candidate_name}</strong> • File: <strong>{previewResume.file_name || 'resume_doc'}</strong>
                </p>
              </div>
              <div className="modal-header-actions">
                <a href={`${API}/download-resume/${previewResume.id}`} download className="btn-action-outline btn-sm">
                  📥 Download
                </a>
                <button className="btn-close-circle" onClick={() => setPreviewResume(null)}>✕</button>
              </div>
            </div>

            <div className="modal-body">
              {previewResume.file_name?.toLowerCase().endsWith('.pdf') ? (
                <div className="iframe-container">
                  <iframe
                    src={`${API}/resume-preview/${previewResume.id}`}
                    title="Exact PDF Preview"
                    className="pdf-iframe-frame"
                  />
                </div>
              ) : (
                <div className="doc-view-wrap">
                  <div className="doc-banner">
                    <div>
                      <strong>{previewResume.candidate_name}</strong> <br />
                      <span className="text-muted text-xs">{previewResume.candidate_email || 'No email'} • {previewResume.candidate_phone || 'No phone'}</span>
                    </div>
                    <span className="badge-soft">{previewResume.file_type?.toUpperCase()}</span>
                  </div>
                  <pre className="doc-pre-text">{previewResume.extracted_text || 'No text content extracted.'}</pre>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <span className="text-muted text-xs">
                {previewResume.overall_score != null ? `Score: ${previewResume.overall_score}%` : 'Document Viewer'}
              </span>
              <button className="btn-secondary-sm" onClick={() => setPreviewResume(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔄 RECOMMENDATIONS MODAL */}
      {/* ========================================================================= */}
      {recommendations && (
        <div className="modal-backdrop" onClick={() => setRecommendations(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>🔄 AI Job Recommendations</h3>
                <p className="text-muted text-xs">Best matching job openings for <strong>{recoCandidateName}</strong></p>
              </div>
              <button className="btn-close-circle" onClick={() => setRecommendations(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="reco-cards-grid">
                {recommendations.map((r, i) => (
                  <div key={i} className="reco-item-card">
                    <div className="reco-top">
                      <ScoreRing score={r.match_score} size={60} />
                      <div>
                        <h4>{r.title}</h4>
                        <span className="text-muted text-xs">Semantic: {r.semantic_score}% | Skills: {r.skill_score}%</span>
                      </div>
                    </div>
                    <div className="reco-skills">
                      {r.matched_skills?.map((s, j) => <span key={j} className="skill-pill-green">✅ {s}</span>)}
                      {r.missing_skills?.map((s, j) => <span key={j} className="skill-pill-red">❌ {s}</span>)}
                    </div>
                  </div>
                ))}
                {recommendations.length === 0 && <p className="text-muted text-center" style={{ padding: '1.5rem 0' }}>No other jobs available to recommend.</p>}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary-sm" onClick={() => setRecommendations(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>ResumeAI • Powered by Google DeepMind BERT & Sentence-Transformers</p>
      </footer>
    </div>
  );
}

export default App;
