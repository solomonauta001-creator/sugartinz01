# 🌸 PinkPulse - Job Tracking & ATS Application

A modern, full-stack Job Tracking and Applicant Tracking System (ATS) styled with an elegant, professional **Pink** color aesthetic.

---

## ✨ Features

### 👤 Candidate & Job Seeker Portal
- **Browse Job Openings**: Search and filter by keyword, department (Engineering, Design, Marketing, etc.), and workplace model (Remote, Hybrid, On-site).
- **Comprehensive Job Details**: Clear view of responsibilities, salary ranges, benefits, required skills, and deadlines.
- **Instant Application Submission**: Apply in seconds with resume uploads (PDF, DOCX, TXT), portfolio/LinkedIn links, experience level, and cover note.
- **Unique Tracking Code**: Generates a dedicated tracking code (e.g., `APP-PINK-8921`) upon submission.
- **Application Status Tracker**: Candidates can check the live status of their application at any time with a visual 4-stage pipeline:
  `Applied` ➔ `Reviewing` ➔ `Interview` ➔ `Offered / Decision`.

### 🛡️ Admin & Recruiter ATS Portal
- **Secure Authentication**: Dedicated admin login with instant 1-click autofill for demonstrations.
  - **Username**: `admin`
  - **Password**: `admin123`
- **Post & Manage Vacancies**:
  - Create new job postings with rich metadata (salary ranges, experience level, tags, perks).
  - Edit active openings.
  - Quick 1-click status toggle (`Active` ⟷ `Closed`).
  - Delete vacancies (with automatic cascade).
- **Candidate Pipeline Management**:
  - Filter applicants by specific job, pipeline stage, or search by candidate name/email/code.
  - View full candidate dossiers including contact information, experience, and uploaded resume document.
  - Update candidate stage (`Applied`, `Reviewing`, `Interview`, `Offered`, `Rejected`).
  - Assign candidate ratings (1 to 5 stars).
  - Add internal private recruiter notes.
- **Analytics & Reporting**:
  - Live metrics for Active Openings, Total Candidates, Interview Stage, and Offers.
  - **1-Click CSV Export**: Export complete candidate logs with one click.

---

## 🎨 Design Philosophy
- **Primary Color**: Pink palette (`#ec4899`, `#db2777`, `#be185d`, `#fdf2f8`) accented with rose hues.
- Clean typography (Inter), glassmorphic headers, rounded cards, and smooth micro-interactions.

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+ (Standard Python runtime)

### 2. Run the Application
Open a terminal in this directory and execute:
```bash
py app.py
```
Or with python:
```bash
python app.py
```

### 3. Open in Browser
Visit:
```
http://127.0.0.1:5000
```
- **Candidate View**: Directly explore jobs, submit test applications, or track statuses.
- **Admin View**: Click **Admin Login** in the upper right (or use `admin` / `admin123`) to access the Recruiter Dashboard.

