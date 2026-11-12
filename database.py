import sqlite3
import os
import hashlib
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Create jobs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            department TEXT NOT NULL,
            location TEXT NOT NULL,
            work_type TEXT NOT NULL DEFAULT 'Remote',
            employment_type TEXT NOT NULL DEFAULT 'Full-time',
            experience_level TEXT NOT NULL DEFAULT 'Mid-Level',
            min_salary INTEGER DEFAULT 0,
            max_salary INTEGER DEFAULT 0,
            description TEXT NOT NULL,
            requirements TEXT NOT NULL,
            benefits TEXT,
            skills TEXT,
            status TEXT NOT NULL DEFAULT 'Active',
            deadline TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create applications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_code TEXT UNIQUE NOT NULL,
            job_id INTEGER NOT NULL,
            candidate_name TEXT NOT NULL,
            candidate_email TEXT NOT NULL,
            candidate_phone TEXT,
            linkedin_url TEXT,
            portfolio_url TEXT,
            experience_years INTEGER DEFAULT 0,
            notice_period TEXT,
            cover_letter TEXT,
            resume_filename TEXT,
            status TEXT NOT NULL DEFAULT 'Applied',
            rating INTEGER DEFAULT 0,
            recruiter_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
    ''')

    # Create admin user table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    seed_initial_data(conn)
    conn.close()

def seed_initial_data(conn):
    cursor = conn.cursor()

    # Check if admin exists
    cursor.execute("SELECT COUNT(*) FROM admins")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO admins (username, password_hash, display_name)
            VALUES (?, ?, ?)
        ''', ("admin", hash_password("admin123"), "HR Director (PinkPulse)"))

    # Check if jobs exist
    cursor.execute("SELECT COUNT(*) FROM jobs")
    if cursor.fetchone()[0] == 0:
        sample_jobs = [
            (
                "Senior Frontend Engineer (React/Vue)",
                "Engineering",
                "San Francisco, CA (or Remote)",
                "Hybrid",
                "Full-time",
                "Senior",
                130000,
                165000,
                "We are seeking an exceptional Senior Frontend Engineer to build intuitive, delightful, and highly performant interfaces. You will collaborate closely with product managers and designers to craft our next-generation web products.",
                "- 5+ years of production experience with modern JavaScript/TypeScript and React/Vue\n- Solid understanding of web performance, accessibility (a11y), and responsive design\n- Experience designing scalable UI component systems and design systems\n- Passion for clean animations and pixel-perfect aesthetics",
                "- Comprehensive Health, Dental & Vision insurance\n- 401(k) matching up to 5%\n- Unlimited Paid Time Off (PTO)\n- $2,000 annual learning & equipment stipend\n- Flexible hybrid/remote schedule",
                "React, TypeScript, Tailwind CSS, Next.js, Redux, Webpack",
                "Active",
                (datetime.now() + timedelta(days=25)).strftime("%Y-%m-%d")
            ),
            (
                "Lead UI/UX Product Designer",
                "Design",
                "New York, NY (Remote friendly)",
                "Remote",
                "Full-time",
                "Lead",
                120000,
                150000,
                "Join our design team to champion human-centered experiences. You will lead end-to-end design from research and wireframing to high-fidelity prototyping and design system maintenance.",
                "- 4+ years in product design for web & mobile SaaS applications\n- Mastery of Figma, auto-layout, interactive prototyping, and design tokens\n- Strong portfolio demonstrating problem-solving, micro-interactions, and visual elegance\n- Excellent communication skills to articulate design decisions across cross-functional teams",
                "- Competitive equity grants\n- Remote workspace setup allowance ($1,500)\n- Annual company retreats\n- Wellness stipend & mental health support",
                "Figma, Prototyping, Design Systems, User Research, Wireframing",
                "Active",
                (datetime.now() + timedelta(days=18)).strftime("%Y-%m-%d")
            ),
            (
                "Backend Python/Cloud Architect",
                "Engineering",
                "Austin, TX",
                "Remote",
                "Full-time",
                "Senior",
                140000,
                180000,
                "We are looking for a Backend Cloud Architect to own our core microservices, API architecture, and database infrastructure. You will design robust, distributed services that scale smoothly.",
                "- Strong proficiency in Python, modern web frameworks (FastAPI/Flask/Django)\n- Deep knowledge of relational databases (PostgreSQL/SQLite) and distributed caching (Redis)\n- Experience with Docker, Kubernetes, CI/CD pipelines, and cloud providers (AWS/GCP)\n- Understanding of security standards and automated testing",
                "- Premium healthcare coverage (100% paid for employee)\n- Flexible working hours across US timezones\n- Generous parental leave\n- Home office budget",
                "Python, FastAPI, PostgreSQL, Docker, AWS, Redis, GraphQL",
                "Active",
                (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            ),
            (
                "Growth Marketing Specialist",
                "Marketing",
                "Los Angeles, CA",
                "On-site",
                "Full-time",
                "Mid-Level",
                75000,
                95000,
                "Drive user acquisition, retention, and brand awareness through digital marketing experiments, paid campaigns, and organic content strategies.",
                "- 2-4 years in B2B or B2C growth marketing\n- Hands-on experience with Google Ads, Meta Ads, SEO optimization, and email marketing automation\n- Strong analytical mindset with data-driven experimentation methods\n- Excellent copywriting and creative storytelling skills",
                "- Health & wellness stipend\n- Team lunches and catered events\n- Performance-based quarterly bonuses\n- Commuter benefits",
                "Google Analytics, SEO, Paid Ads, Content Marketing, HubSpot, Email Automation",
                "Active",
                (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
            ),
            (
                "Technical Customer Success Manager",
                "Operations",
                "Chicago, IL",
                "Hybrid",
                "Full-time",
                "Mid-Level",
                70000,
                90000,
                "Bridge the gap between our engineering teams and key business clients. Ensure high adoption, resolve technical questions, and guide clients to achieve high ROI.",
                "- 2+ years of experience in technical support, solutions engineering, or client onboarding\n- Empathy and active listening with crisp verbal and written communication\n- Basic ability to read API responses, query data, and troubleshoot workflows\n- Proven track record of client retention and satisfaction",
                "- Medical, Dental & Vision coverage\n- Stock options\n- Generous PTO and company holidays\n- Continued education reimbursement",
                "Customer Success, API Debugging, Zendesk, Salesforce, Client Onboarding",
                "Active",
                (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d")
            )
        ]

        cursor.executemany('''
            INSERT INTO jobs (
                title, department, location, work_type, employment_type, experience_level,
                min_salary, max_salary, description, requirements, benefits, skills,
                status, deadline
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_jobs)

        # Seed sample applications for demonstration
        cursor.execute("SELECT id FROM jobs LIMIT 3")
        job_ids = [row[0] for row in cursor.fetchall()]

        sample_apps = [
            (
                "APP-PINK-8921",
                job_ids[0],
                "Emma Watson",
                "emma.watson@example.com",
                "+1 (555) 234-5678",
                "https://linkedin.com/in/emma-watson-dev",
                "https://emmawatson.dev",
                6,
                "2 weeks",
                "I am a passionate frontend developer with 6 years of experience building modern web apps with React and TypeScript. I have led component libraries and care deeply about crafting clean, delightful UI experiences.",
                "emma_watson_resume.pdf",
                "Interview",
                5,
                "Strong candidate! Superb portfolio and deep React knowledge. Scheduled technical interview for Thursday."
            ),
            (
                "APP-PINK-4512",
                job_ids[1],
                "Sophia Chen",
                "sophia.chen@example.com",
                "+1 (555) 876-5432",
                "https://linkedin.com/in/sophia-chen-design",
                "https://sophiachen.design",
                5,
                "Immediate",
                "Design is not just what it looks like, it's how it works. I have spent the last 5 years designing enterprise SaaS tools and design systems with Figma.",
                "sophia_chen_cv.pdf",
                "Reviewing",
                4,
                "Impressive case studies in her portfolio. High attention to micro-interactions."
            ),
            (
                "APP-PINK-7183",
                job_ids[2],
                "Liam Vance",
                "liam.vance@example.com",
                "+1 (555) 345-6789",
                "https://linkedin.com/in/liam-vance-cloud",
                "https://github.com/liamvance",
                7,
                "1 month",
                "Experienced backend architect specialized in Python, microservices, and AWS high-availability cloud configurations.",
                "liam_vance_resume.pdf",
                "Offered",
                5,
                "Passed all interview rounds with flying colors. Offer letter dispatched with $165k base."
            ),
            (
                "APP-PINK-3304",
                job_ids[0],
                "Noah Martinez",
                "noah.m@example.com",
                "+1 (555) 901-2345",
                "https://linkedin.com/in/noahmartinez",
                "https://noahmartinez.me",
                3,
                "3 weeks",
                "Excited about the frontend role. I have worked extensively with React, Next.js and Tailwind CSS.",
                "noah_martinez_resume.pdf",
                "Applied",
                3,
                "Good foundation, need to review code samples on GitHub."
            )
        ]

        cursor.executemany('''
            INSERT INTO applications (
                tracking_code, job_id, candidate_name, candidate_email, candidate_phone,
                linkedin_url, portfolio_url, experience_years, notice_period, cover_letter,
                resume_filename, status, rating, recruiter_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_apps)

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")

