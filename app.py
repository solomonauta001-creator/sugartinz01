import os
import random
import string
import csv
import io
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory, session, Response
from werkzeug.utils import secure_filename
from database import init_db, get_db, hash_password

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = "pink-pulse-job-tracking-secret-key-super-secure"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'rtf'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

# Initialize database on startup
init_db()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_tracking_code():
    chars = ''.join(random.choices(string.digits, k=4))
    suffix = ''.join(random.choices(string.ascii_uppercase, k=2))
    return f"APP-PINK-{chars}{suffix}"

def is_admin_authenticated():
    return session.get("is_admin", False)

# ----------------- PAGE ROUTES -----------------
@app.route('/')
def index():
    return render_template('index.html')

# ----------------- PUBLIC JOB BOARD APIS -----------------
@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    search = request.args.get('search', '').strip()
    department = request.args.get('department', '').strip()
    work_type = request.args.get('work_type', '').strip()
    status_filter = request.args.get('status', '').strip()
    is_admin = is_admin_authenticated()

    conn = get_db()
    cursor = conn.cursor()

    query = '''
        SELECT j.*, 
               (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicant_count
        FROM jobs j
        WHERE 1=1
    '''
    params = []

    # If not admin, only show active jobs by default
    if not is_admin:
        query += " AND j.status = 'Active'"
    elif status_filter:
        query += " AND j.status = ?"
        params.append(status_filter)

    if search:
        query += " AND (j.title LIKE ? OR j.description LIKE ? OR j.skills LIKE ? OR j.location LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    if department and department != 'All':
        query += " AND j.department = ?"
        params.append(department)

    if work_type and work_type != 'All':
        query += " AND j.work_type = ?"
        params.append(work_type)

    query += " ORDER BY j.created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    jobs = [dict(row) for row in rows]
    conn.close()

    return jsonify({"success": True, "jobs": jobs, "count": len(jobs)})

@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job_detail(job_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT j.*, 
               (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicant_count
        FROM jobs j
        WHERE j.id = ?
    ''', (job_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "message": "Job opening not found."}), 404

    return jsonify({"success": True, "job": dict(row)})

# ----------------- CANDIDATE APPLICATION APIS -----------------
@app.route('/api/jobs/<int:job_id>/apply', methods=['POST'])
def apply_job(job_id):
    conn = get_db()
    cursor = conn.cursor()

    # Verify job is active
    cursor.execute("SELECT id, title, status FROM jobs WHERE id = ?", (job_id,))
    job = cursor.fetchone()
    if not job:
        conn.close()
        return jsonify({"success": False, "message": "Target job opening does not exist."}), 404
    if job['status'] != 'Active':
        conn.close()
        return jsonify({"success": False, "message": "This job opening is closed for new applications."}), 400

    name = request.form.get('candidate_name', '').strip()
    email = request.form.get('candidate_email', '').strip()
    phone = request.form.get('candidate_phone', '').strip()
    linkedin = request.form.get('linkedin_url', '').strip()
    portfolio = request.form.get('portfolio_url', '').strip()
    experience_years = request.form.get('experience_years', '0').strip()
    notice_period = request.form.get('notice_period', 'Flexible').strip()
    cover_letter = request.form.get('cover_letter', '').strip()

    if not name or not email:
        conn.close()
        return jsonify({"success": False, "message": "Full Name and Email address are required."}), 400

    # Handle resume upload
    resume_filename = None
    if 'resume' in request.files:
        file = request.files['resume']
        if file and file.filename != '':
            if allowed_file(file.filename):
                clean_name = secure_filename(file.filename)
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                resume_filename = f"{timestamp}_{clean_name}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], resume_filename))
            else:
                conn.close()
                return jsonify({"success": False, "message": "Invalid file type. Allowed: PDF, DOC, DOCX, TXT."}), 400

    tracking_code = generate_tracking_code()

    try:
        exp_int = int(experience_years) if experience_years.isdigit() else 0
    except ValueError:
        exp_int = 0

    cursor.execute('''
        INSERT INTO applications (
            tracking_code, job_id, candidate_name, candidate_email, candidate_phone,
            linkedin_url, portfolio_url, experience_years, notice_period, cover_letter,
            resume_filename, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Applied')
    ''', (
        tracking_code, job_id, name, email, phone,
        linkedin, portfolio, exp_int, notice_period, cover_letter,
        resume_filename
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Application submitted successfully for {job['title']}!",
        "tracking_code": tracking_code,
        "job_title": job['title'],
        "candidate_name": name
    })

@app.route('/api/applications/track/<path:query_val>', methods=['GET'])
def track_application(query_val):
    query_clean = query_val.strip()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT a.id, a.tracking_code, a.candidate_name, a.candidate_email, a.status,
               a.created_at, a.updated_at, j.id as job_id, j.title as job_title,
               j.department, j.location, j.work_type
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.tracking_code = ? OR LOWER(a.candidate_email) = LOWER(?)
        ORDER BY a.created_at DESC
    ''', (query_clean, query_clean))

    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return jsonify({"success": False, "message": "No applications found with that tracking code or email address."}), 404

    results = [dict(row) for row in rows]
    return jsonify({"success": True, "applications": results})

# ----------------- ADMIN AUTHENTICATION APIS -----------------
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admins WHERE username = ?", (username,))
    admin = cursor.fetchone()
    conn.close()

    if admin and admin['password_hash'] == hash_password(password):
        session['is_admin'] = True
        session['admin_id'] = admin['id']
        session['admin_name'] = admin['display_name']
        session['admin_username'] = admin['username']
        return jsonify({
            "success": True,
            "message": "Login successful!",
            "admin": {
                "display_name": admin['display_name'],
                "username": admin['username']
            }
        })
    
    return jsonify({"success": False, "message": "Invalid username or password. (Hint: admin / admin123)"}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully."})

@app.route('/api/admin/check-auth', methods=['GET'])
def check_auth():
    if is_admin_authenticated():
        return jsonify({
            "authenticated": True,
            "admin": {
                "display_name": session.get('admin_name'),
                "username": session.get('admin_username')
            }
        })
    return jsonify({"authenticated": False})

# ----------------- ADMIN JOB MANAGEMENT APIS -----------------
@app.route('/api/admin/jobs', methods=['POST'])
def create_job():
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    department = data.get('department', 'General').strip()
    location = data.get('location', 'Remote').strip()
    work_type = data.get('work_type', 'Remote').strip()
    employment_type = data.get('employment_type', 'Full-time').strip()
    experience_level = data.get('experience_level', 'Mid-Level').strip()
    min_salary = int(data.get('min_salary', 0) or 0)
    max_salary = int(data.get('max_salary', 0) or 0)
    description = data.get('description', '').strip()
    requirements = data.get('requirements', '').strip()
    benefits = data.get('benefits', '').strip()
    skills = data.get('skills', '').strip()
    status = data.get('status', 'Active').strip()
    deadline = data.get('deadline', '').strip()

    if not title or not description:
        return jsonify({"success": False, "message": "Job title and description are required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO jobs (
            title, department, location, work_type, employment_type, experience_level,
            min_salary, max_salary, description, requirements, benefits, skills,
            status, deadline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        title, department, location, work_type, employment_type, experience_level,
        min_salary, max_salary, description, requirements, benefits, skills,
        status, deadline
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "New job opening published successfully!", "job_id": new_id}), 201

@app.route('/api/admin/jobs/<int:job_id>', methods=['PUT'])
def update_job(job_id):
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM jobs WHERE id = ?", (job_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "Job not found."}), 404

    cursor.execute('''
        UPDATE jobs SET
            title = ?,
            department = ?,
            location = ?,
            work_type = ?,
            employment_type = ?,
            experience_level = ?,
            min_salary = ?,
            max_salary = ?,
            description = ?,
            requirements = ?,
            benefits = ?,
            skills = ?,
            status = ?,
            deadline = ?
        WHERE id = ?
    ''', (
        data.get('title', '').strip(),
        data.get('department', '').strip(),
        data.get('location', '').strip(),
        data.get('work_type', 'Remote').strip(),
        data.get('employment_type', 'Full-time').strip(),
        data.get('experience_level', 'Mid-Level').strip(),
        int(data.get('min_salary', 0) or 0),
        int(data.get('max_salary', 0) or 0),
        data.get('description', '').strip(),
        data.get('requirements', '').strip(),
        data.get('benefits', '').strip(),
        data.get('skills', '').strip(),
        data.get('status', 'Active').strip(),
        data.get('deadline', '').strip(),
        job_id
    ))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Job details updated successfully!"})

@app.route('/api/admin/jobs/<int:job_id>/toggle-status', methods=['PATCH'])
def toggle_job_status(job_id):
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM jobs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "message": "Job not found."}), 404

    new_status = 'Closed' if row['status'] == 'Active' else 'Active'
    cursor.execute("UPDATE jobs SET status = ? WHERE id = ?", (new_status, job_id))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "new_status": new_status, "message": f"Job status switched to {new_status}"})

@app.route('/api/admin/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM applications WHERE job_id = ?", (job_id,))
    cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Job opening and associated applications deleted."})

# ----------------- ADMIN APPLICANT ATS MANAGEMENT -----------------
@app.route('/api/admin/applications', methods=['GET'])
def get_all_applications():
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    job_id = request.args.get('job_id')
    status_filter = request.args.get('status')
    search = request.args.get('search', '').strip()

    conn = get_db()
    cursor = conn.cursor()

    query = '''
        SELECT a.*, j.title as job_title, j.department, j.location as job_location
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE 1=1
    '''
    params = []

    if job_id and job_id != 'all':
        query += " AND a.job_id = ?"
        params.append(job_id)

    if status_filter and status_filter != 'all':
        query += " AND a.status = ?"
        params.append(status_filter)

    if search:
        query += " AND (a.candidate_name LIKE ? OR a.candidate_email LIKE ? OR a.tracking_code LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY a.created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    apps = [dict(row) for row in rows]
    conn.close()

    return jsonify({"success": True, "applications": apps, "total": len(apps)})

@app.route('/api/admin/applications/<int:app_id>', methods=['GET'])
def get_single_application(app_id):
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.*, j.title as job_title, j.department, j.location as job_location
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = ?
    ''', (app_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "message": "Application not found."}), 404

    return jsonify({"success": True, "application": dict(row)})

@app.route('/api/admin/applications/<int:app_id>', methods=['PATCH'])
def update_application(app_id):
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()

    fields = []
    values = []

    if 'status' in data:
        fields.append("status = ?")
        values.append(data['status'])
    if 'recruiter_notes' in data:
        fields.append("recruiter_notes = ?")
        values.append(data['recruiter_notes'])
    if 'rating' in data:
        fields.append("rating = ?")
        values.append(int(data['rating']))

    fields.append("updated_at = CURRENT_TIMESTAMP")
    values.append(app_id)

    if not fields:
        conn.close()
        return jsonify({"success": False, "message": "No update fields provided."}), 400

    query = f"UPDATE applications SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Application status and notes updated!"})

@app.route('/api/admin/applications/<int:app_id>', methods=['DELETE'])
def delete_application(app_id):
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM applications WHERE id = ?", (app_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Application record removed."})

# ----------------- ADMIN ANALYTICS & EXPORT -----------------
@app.route('/api/admin/analytics', methods=['GET'])
def get_analytics():
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM jobs")
    total_jobs = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM jobs WHERE status = 'Active'")
    active_jobs = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM applications")
    total_applications = cursor.fetchone()[0]

    cursor.execute("SELECT status, COUNT(*) as count FROM applications GROUP BY status")
    status_counts = {row['status']: row['count'] for row in cursor.fetchall()}

    cursor.execute('''
        SELECT j.department, COUNT(a.id) as app_count 
        FROM jobs j 
        LEFT JOIN applications a ON j.id = a.job_id 
        GROUP BY j.department
    ''')
    dept_counts = {row['department']: row['app_count'] for row in cursor.fetchall()}

    conn.close()

    return jsonify({
        "success": True,
        "analytics": {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "total_applications": total_applications,
            "status_distribution": status_counts,
            "department_distribution": dept_counts
        }
    })

@app.route('/api/admin/export-csv', methods=['GET'])
def export_csv():
    if not is_admin_authenticated():
        return jsonify({"success": False, "message": "Admin authorization required."}), 403

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.tracking_code, a.candidate_name, a.candidate_email, a.candidate_phone,
               j.title as job_title, j.department, a.status, a.experience_years,
               a.notice_period, a.rating, a.recruiter_notes, a.created_at
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        ORDER BY a.created_at DESC
    ''')
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Tracking Code", "Candidate Name", "Email", "Phone",
        "Job Title", "Department", "Status", "Experience (Years)",
        "Notice Period", "Rating (1-5)", "Recruiter Notes", "Applied At"
    ])

    for r in rows:
        writer.writerow([
            r['tracking_code'], r['candidate_name'], r['candidate_email'], r['candidate_phone'],
            r['job_title'], r['department'], r['status'], r['experience_years'],
            r['notice_period'], r['rating'], r['recruiter_notes'], r['created_at']
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=pinkpulse_applications_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ----------------- RESUME FILE SERVING -----------------
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    print("=" * 60)
    print("  🌸 PinkPulse - Job Tracking & ATS Platform Running 🌸")
    print("  Open browser: http://127.0.0.1:5000")
    print("  Default Admin Login: username 'admin', password 'admin123'")
    print("=" * 60)
    app.run(debug=True, port=5000)

