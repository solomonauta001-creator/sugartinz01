// PinkPulse Job Tracking & ATS Platform JavaScript

let currentAdmin = null;
let currentJobs = [];
let selectedApplicationId = null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    checkAdminAuth();
    loadJobs();

    // Auto-search debounce
    const searchInput = document.getElementById("job-search-input");
    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter") loadJobs();
        });
    }

    const deptFilter = document.getElementById("job-dept-filter");
    if (deptFilter) deptFilter.addEventListener("change", loadJobs);

    const typeFilter = document.getElementById("job-type-filter");
    if (typeFilter) typeFilter.addEventListener("change", loadJobs);
});

// Toast notification helper
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    
    let bg = "bg-pink-600 text-white";
    let icon = "check-circle";
    if (type === "error") {
        bg = "bg-rose-700 text-white";
        icon = "alert-circle";
    } else if (type === "info") {
        bg = "bg-gray-800 text-white";
        icon = "info";
    }

    toast.className = `${bg} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-scaleUp pointer-events-auto transition-all`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Modal management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        lucide.createIcons();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
    }
}

// Navigation Tabs
function switchTab(tabName) {
    const tabs = ["jobs", "track", "admin"];
    tabs.forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`nav-btn-${t}`);
        if (view) view.classList.toggle("hidden", t !== tabName);
        if (btn) btn.classList.toggle("active", t === tabName);
    });

    if (tabName === "jobs") {
        loadJobs();
    } else if (tabName === "admin" && currentAdmin) {
        loadAdminDashboard();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================
// CANDIDATE: JOBS LISTING & FILTERING
// ==========================================
async function loadJobs() {
    const search = document.getElementById("job-search-input")?.value || "";
    const dept = document.getElementById("job-dept-filter")?.value || "All";
    const type = document.getElementById("job-type-filter")?.value || "All";

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (dept !== "All") params.append("department", dept);
    if (type !== "All") params.append("work_type", type);

    const grid = document.getElementById("jobs-grid");
    grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-gray-400">
            <i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin text-pink-600 mb-2"></i>
            <p>Loading open vacancies...</p>
        </div>
    `;
    lucide.createIcons();

    try {
        const res = await fetch(`/api/jobs?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
            currentJobs = data.jobs;
            renderJobsGrid(data.jobs);

            // Update badges
            const countBadge = document.getElementById("jobs-count-badge");
            if (countBadge) countBadge.textContent = `${data.count} position${data.count === 1 ? '' : 's'}`;

            const statActive = document.getElementById("stat-active-jobs");
            if (statActive) statActive.textContent = data.count;
        }
    } catch (err) {
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center text-red-500 text-sm">
                Failed to load job listings. Please refresh the page.
            </div>
        `;
    }
}

function renderJobsGrid(jobs) {
    const grid = document.getElementById("jobs-grid");
    if (!jobs || jobs.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-pink-100 p-8 shadow-sm">
                <div class="w-16 h-16 bg-pink-100 rounded-3xl mx-auto flex items-center justify-center text-pink-500 mb-3">
                    <i data-lucide="search-x" class="w-8 h-8"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800">No matching jobs found</h3>
                <p class="text-xs text-gray-400 mt-1">Try adjusting your keyword, department, or workplace filters.</p>
                <button onclick="resetFilters()" class="mt-4 px-4 py-2 bg-pink-50 text-pink-700 font-bold text-xs rounded-xl hover:bg-pink-100 transition">
                    Reset All Filters
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    grid.innerHTML = jobs.map(job => {
        const skillsArray = job.skills ? job.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
        const salaryText = (job.min_salary && job.max_salary) 
            ? `$${(job.min_salary / 1000).toFixed(0)}k - $${(job.max_salary / 1000).toFixed(0)}k` 
            : (job.min_salary ? `From $${(job.min_salary / 1000).toFixed(0)}k` : "Competitive");

        return `
            <div class="job-card bg-white rounded-3xl p-6 sm:p-7 border border-pink-100 shadow-sm flex flex-col justify-between">
                <div>
                    <!-- Top Tag bar -->
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-1 bg-pink-100 text-pink-700 text-[11px] font-bold rounded-lg uppercase tracking-wide">
                                ${job.department}
                            </span>
                            <span class="px-2.5 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg">
                                ${job.work_type}
                            </span>
                        </div>
                        <span class="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
                            ${salaryText}
                        </span>
                    </div>

                    <!-- Job Title -->
                    <h3 class="text-xl font-extrabold text-gray-900 group-hover:text-pink-600 transition leading-snug">
                        ${job.title}
                    </h3>

                    <!-- Meta info -->
                    <div class="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 font-medium">
                        <span class="flex items-center gap-1">
                            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-pink-500"></i>
                            ${job.location}
                        </span>
                        <span>•</span>
                        <span class="flex items-center gap-1">
                            <i data-lucide="clock" class="w-3.5 h-3.5 text-pink-500"></i>
                            ${job.employment_type}
                        </span>
                        <span>•</span>
                        <span class="flex items-center gap-1">
                            <i data-lucide="user-check" class="w-3.5 h-3.5 text-pink-500"></i>
                            ${job.experience_level}
                        </span>
                    </div>

                    <!-- Short snippet -->
                    <p class="mt-4 text-xs text-gray-600 line-clamp-3 leading-relaxed">
                        ${job.description}
                    </p>

                    <!-- Skills pills -->
                    <div class="flex flex-wrap gap-1.5 mt-4">
                        ${skillsArray.slice(0, 4).map(skill => `
                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-md">
                                ${skill}
                            </span>
                        `).join("")}
                        ${skillsArray.length > 4 ? `
                            <span class="px-2 py-0.5 bg-pink-50 text-pink-600 text-[10px] font-bold rounded-md">
                                +${skillsArray.length - 4} more
                            </span>
                        ` : ''}
                    </div>
                </div>

                <!-- Bottom CTA Buttons -->
                <div class="mt-6 pt-4 border-t border-pink-50 flex items-center justify-between gap-3">
                    <button onclick="viewJobDetail(${job.id})" class="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-pink-600 hover:bg-pink-50 transition flex items-center gap-1.5">
                        <i data-lucide="info" class="w-3.5 h-3.5"></i>
                        Details
                    </button>
                    <button onclick="openApplyModal(${job.id}, '${escapeHtml(job.title)}')" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-600/25 transition flex items-center gap-1.5 transform active:scale-95">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        Apply Now
                    </button>
                </div>
            </div>
        `;
    }).join("");

    lucide.createIcons();
}

function resetFilters() {
    const s = document.getElementById("job-search-input");
    const d = document.getElementById("job-dept-filter");
    const t = document.getElementById("job-type-filter");
    if (s) s.value = "";
    if (d) d.value = "All";
    if (t) t.value = "All";
    loadJobs();
}

// ==========================================
// CANDIDATE: VIEW DETAILS & APPLY
// ==========================================
async function viewJobDetail(jobId) {
    try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        if (!data.success) {
            showToast(data.message, "error");
            return;
        }

        const job = data.job;
        document.getElementById("detail-job-dept").textContent = job.department;
        document.getElementById("detail-job-work-type").textContent = job.work_type;
        document.getElementById("detail-job-title").textContent = job.title;
        document.getElementById("detail-job-location").textContent = job.location;
        document.getElementById("detail-job-employment").textContent = `${job.employment_type} • ${job.experience_level}`;
        
        const salaryText = (job.min_salary && job.max_salary) 
            ? `$${job.min_salary.toLocaleString()} - $${job.max_salary.toLocaleString()} / yr`
            : "Competitive Compensation";
        document.getElementById("detail-job-salary").textContent = salaryText;
        document.getElementById("detail-job-deadline").textContent = job.deadline ? `Deadline: ${job.deadline}` : "Open until filled";

        document.getElementById("detail-job-description").textContent = job.description;
        document.getElementById("detail-job-requirements").textContent = job.requirements || "Standard industry qualifications required.";
        
        const benefitsSec = document.getElementById("detail-job-benefits-section");
        if (job.benefits) {
            benefitsSec.classList.remove("hidden");
            document.getElementById("detail-job-benefits").textContent = job.benefits;
        } else {
            benefitsSec.classList.add("hidden");
        }

        const skillsContainer = document.getElementById("detail-job-skills");
        if (job.skills) {
            const tags = job.skills.split(",").map(s => s.trim()).filter(Boolean);
            skillsContainer.innerHTML = tags.map(t => `
                <span class="px-2.5 py-1 bg-white border border-pink-200 text-pink-700 text-xs font-semibold rounded-lg shadow-sm">
                    ${t}
                </span>
            `).join("");
        } else {
            skillsContainer.innerHTML = `<span class="text-xs text-gray-400">General skillset</span>`;
        }

        const applyBtn = document.getElementById("detail-job-apply-btn");
        applyBtn.onclick = () => {
            closeModal("modal-job-detail");
            openApplyModal(job.id, job.title);
        };

        openModal("modal-job-detail");
    } catch (err) {
        showToast("Failed to fetch job details.", "error");
    }
}

function openApplyModal(jobId, jobTitle) {
    document.getElementById("apply-job-id").value = jobId;
    document.getElementById("apply-modal-job-title").textContent = jobTitle;
    document.getElementById("resume-filename-label").textContent = "Click to upload or drag & drop";
    document.getElementById("apply-job-form").reset();
    openModal("modal-apply");
}

function handleFileSelected(input) {
    const label = document.getElementById("resume-filename-label");
    if (input.files && input.files[0]) {
        label.textContent = `Selected: ${input.files[0].name} (${(input.files[0].size / 1024).toFixed(1)} KB)`;
        label.className = "text-xs font-bold text-pink-600";
    } else {
        label.textContent = "Click to upload or drag & drop";
        label.className = "text-xs font-bold text-gray-700";
    }
}

async function submitJobApplication(e) {
    e.preventDefault();
    const jobId = document.getElementById("apply-job-id").value;
    const form = document.getElementById("apply-job-form");
    const formData = new FormData(form);

    const submitBtn = document.getElementById("btn-submit-application");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Submitting...</span>`;
    submitBtn.disabled = true;
    lucide.createIcons();

    try {
        const res = await fetch(`/api/jobs/${jobId}/apply`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            closeModal("modal-apply");
            document.getElementById("success-tracking-code").textContent = data.tracking_code;
            openModal("modal-success");
            showToast("Application submitted successfully!", "success");
        } else {
            showToast(data.message || "Failed to submit application.", "error");
        }
    } catch (err) {
        showToast("Error connecting to application server.", "error");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        lucide.createIcons();
    }
}

function copyTrackingCode() {
    const code = document.getElementById("success-tracking-code").textContent;
    navigator.clipboard.writeText(code);
    showToast("Tracking code copied to clipboard!", "success");
}

function goToTrackerFromSuccess() {
    const code = document.getElementById("success-tracking-code").textContent;
    closeModal("modal-success");
    switchTab("track");
    const input = document.getElementById("track-input");
    if (input) {
        input.value = code;
        handleTrackSubmit(new Event("submit"));
    }
}

// ==========================================
// CANDIDATE: APPLICATION STATUS TRACKER
// ==========================================
async function handleTrackSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById("track-input").value.trim();
    if (!input) {
        showToast("Please enter your tracking code or email.", "error");
        return;
    }

    const container = document.getElementById("track-results-container");
    container.innerHTML = `
        <div class="py-12 text-center text-gray-400">
            <i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin text-pink-600 mb-2"></i>
            <p>Searching application records...</p>
        </div>
    `;
    lucide.createIcons();

    try {
        const res = await fetch(`/api/applications/track/${encodeURIComponent(input)}`);
        const data = await res.json();

        if (!data.success) {
            container.innerHTML = `
                <div class="p-8 bg-white rounded-3xl border border-pink-100 text-center shadow-sm">
                    <div class="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl mx-auto flex items-center justify-center mb-2">
                        <i data-lucide="file-question" class="w-6 h-6"></i>
                    </div>
                    <h4 class="font-bold text-gray-800">No Applications Found</h4>
                    <p class="text-xs text-gray-400 mt-1">${data.message}</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        renderTrackingCards(data.applications);
    } catch (err) {
        container.innerHTML = `
            <div class="p-6 bg-red-50 text-red-600 rounded-2xl text-xs text-center">
                Could not retrieve tracking details. Please verify your query.
            </div>
        `;
    }
}

function renderTrackingCards(apps) {
    const container = document.getElementById("track-results-container");
    const stages = ["Applied", "Reviewing", "Interview", "Offered"];

    container.innerHTML = apps.map(app => {
        let currentStageIdx = stages.indexOf(app.status);
        const isRejected = app.status === "Rejected";

        return `
            <div class="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100 shadow-md">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-50 pb-4">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-mono font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                                ${app.tracking_code}
                            </span>
                            <span class="text-xs text-gray-400 font-medium">${app.created_at}</span>
                        </div>
                        <h3 class="text-xl font-extrabold text-gray-900 mt-1">${app.job_title}</h3>
                        <p class="text-xs text-gray-500">${app.department} • ${app.location} (${app.work_type})</p>
                    </div>
                    <div>
                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadgeClass(app.status)}">
                            ${app.status}
                        </span>
                    </div>
                </div>

                <!-- Visual Step Progress Bar -->
                <div class="mt-6">
                    <div class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Application Progress</div>
                    ${isRejected ? `
                        <div class="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 flex items-center gap-3">
                            <i data-lucide="x-circle" class="w-5 h-5 text-gray-400"></i>
                            <div>
                                <span class="font-bold text-gray-800">Application Closed.</span> Thank you for your interest. While this role is not a match, we encourage you to apply for future openings.
                            </div>
                        </div>
                    ` : `
                        <div class="grid grid-cols-4 gap-2">
                            ${stages.map((stage, idx) => {
                                const isPassed = idx <= currentStageIdx;
                                const isCurrent = idx === currentStageIdx;
                                return `
                                    <div class="text-center">
                                        <div class="h-2 rounded-full mb-2 ${isPassed ? 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-sm' : 'bg-gray-100'}"></div>
                                        <div class="text-[11px] font-bold ${isCurrent ? 'text-pink-600 font-extrabold' : (isPassed ? 'text-gray-700' : 'text-gray-400')}">
                                            ${stage}
                                        </div>
                                    </div>
                                `;
                            }).join("")}
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join("");

    lucide.createIcons();
}

function getStatusBadgeClass(status) {
    switch (status) {
        case "Applied": return "badge-status-applied";
        case "Reviewing": return "badge-status-reviewing";
        case "Interview": return "badge-status-interview";
        case "Offered": return "badge-status-offered";
        case "Rejected": return "badge-status-rejected";
        default: return "bg-gray-100 text-gray-700";
    }
}

// ==========================================
// ADMIN: AUTHENTICATION
// ==========================================
async function checkAdminAuth() {
    try {
        const res = await fetch("/api/admin/check-auth");
        const data = await res.json();
        if (data.authenticated) {
            currentAdmin = data.admin;
            updateAdminAuthUI(true);
        } else {
            currentAdmin = null;
            updateAdminAuthUI(false);
        }
    } catch (err) {
        updateAdminAuthUI(false);
    }
}

function updateAdminAuthUI(isLoggedIn) {
    const authBox = document.getElementById("auth-state-box");
    const loginCard = document.getElementById("admin-login-card");
    const dashContainer = document.getElementById("admin-dashboard-container");

    if (isLoggedIn) {
        authBox.innerHTML = `
            <div class="flex items-center gap-2">
                <button onclick="switchTab('admin')" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-100 text-pink-700 hover:bg-pink-200 transition flex items-center gap-1.5">
                    <i data-lucide="shield" class="w-3.5 h-3.5"></i>
                    <span>Admin: ${currentAdmin?.display_name?.split(" ")[0] || "Recruiter"}</span>
                </button>
            </div>
        `;
        if (loginCard) loginCard.classList.add("hidden");
        if (dashContainer) dashContainer.classList.remove("hidden");
    } else {
        authBox.innerHTML = `
            <button onclick="switchTab('admin')" class="px-4 py-2.5 rounded-xl text-sm font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-600/25 transition flex items-center gap-2">
                <i data-lucide="user" class="w-4 h-4"></i>
                <span>Admin Login</span>
            </button>
        `;
        if (loginCard) loginCard.classList.remove("hidden");
        if (dashContainer) dashContainer.classList.add("hidden");
    }
    lucide.createIcons();
}

function fillDemoAdminCredentials() {
    document.getElementById("admin-username").value = "admin";
    document.getElementById("admin-password").value = "admin123";
    showToast("Filled demo admin credentials!", "info");
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value.trim();

    try {
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            currentAdmin = data.admin;
            updateAdminAuthUI(true);
            loadAdminDashboard();
            showToast("Welcome back, Administrator!", "success");
        } else {
            showToast(data.message || "Invalid credentials.", "error");
        }
    } catch (err) {
        showToast("Login request failed.", "error");
    }
}

async function handleAdminLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    currentAdmin = null;
    updateAdminAuthUI(false);
    showToast("Logged out successfully.", "info");
}

// ==========================================
// ADMIN: DASHBOARD & SUB-TABS
// ==========================================
function switchAdminSubTab(subTab) {
    const isApps = subTab === "apps";
    document.getElementById("admin-subtab-apps").classList.toggle("active", isApps);
    document.getElementById("admin-subtab-jobs").classList.toggle("active", !isApps);

    document.getElementById("admin-subview-apps").classList.toggle("hidden", !isApps);
    document.getElementById("admin-subview-jobs").classList.toggle("hidden", isApps);

    if (isApps) {
        loadAdminApplications();
    } else {
        loadAdminJobs();
    }
}

async function loadAdminDashboard() {
    loadAdminAnalytics();
    loadAdminJobsFilterDropdown();
    loadAdminApplications();
    loadAdminJobs();
}

async function loadAdminAnalytics() {
    try {
        const res = await fetch("/api/admin/analytics");
        const data = await res.json();
        if (data.success) {
            const a = data.analytics;
            document.getElementById("metric-active-jobs").textContent = a.active_jobs;
            document.getElementById("metric-total-apps").textContent = a.total_applications;
            document.getElementById("metric-interviews").textContent = a.status_distribution["Interview"] || 0;
            document.getElementById("metric-offers").textContent = a.status_distribution["Offered"] || 0;
        }
    } catch (err) {
        console.error("Analytics fetch error:", err);
    }
}

async function loadAdminJobsFilterDropdown() {
    try {
        const res = await fetch("/api/jobs");
        const data = await res.json();
        if (data.success) {
            const select = document.getElementById("admin-app-job-filter");
            const currentVal = select.value;
            select.innerHTML = `<option value="all">All Jobs</option>` + data.jobs.map(j => `
                <option value="${j.id}">${j.title}</option>
            `).join("");
            select.value = currentVal || "all";
        }
    } catch (err) {
        console.error("Jobs dropdown error:", err);
    }
}

// ==========================================
// ADMIN: ATS APPLICANT PIPELINE MANAGEMENT
// ==========================================
async function loadAdminApplications() {
    const search = document.getElementById("admin-app-search")?.value || "";
    const jobId = document.getElementById("admin-app-job-filter")?.value || "all";
    const status = document.getElementById("admin-app-status-filter")?.value || "all";

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (jobId !== "all") params.append("job_id", jobId);
    if (status !== "all") params.append("status", status);

    const tbody = document.getElementById("admin-applications-tbody");
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-400"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto text-pink-600 mb-1"></i>Loading pipeline...</td></tr>`;
    lucide.createIcons();

    try {
        const res = await fetch(`/api/admin/applications?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
            document.getElementById("admin-app-count").textContent = data.total;
            renderAdminApplicationsTable(data.applications);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Failed to load applications.</td></tr>`;
    }
}

function renderAdminApplicationsTable(apps) {
    const tbody = document.getElementById("admin-applications-tbody");
    if (!apps || apps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">No candidate applications found for this filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = apps.map(app => {
        const stars = "★".repeat(app.rating || 0) + "☆".repeat(5 - (app.rating || 0));

        return `
            <tr class="hover:bg-pink-50/40 transition">
                <td class="px-4 py-3.5">
                    <div class="font-bold text-gray-900">${app.candidate_name}</div>
                    <div class="text-xs text-gray-400 font-mono">${app.tracking_code} • ${app.candidate_email}</div>
                </td>
                <td class="px-4 py-3.5">
                    <div class="font-semibold text-gray-800">${app.job_title}</div>
                    <div class="text-xs text-pink-600">${app.department}</div>
                </td>
                <td class="px-4 py-3.5 text-xs text-gray-500">
                    ${app.created_at}
                </td>
                <td class="px-4 py-3.5">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusBadgeClass(app.status)}">
                        ${app.status}
                    </span>
                </td>
                <td class="px-4 py-3.5">
                    <span class="text-pink-500 font-mono text-sm">${stars}</span>
                </td>
                <td class="px-4 py-3.5 text-right">
                    <button onclick="openApplicationReviewModal(${app.id})" class="px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold rounded-lg text-xs transition">
                        Review Dossier
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    lucide.createIcons();
}

async function openApplicationReviewModal(appId) {
    selectedApplicationId = appId;
    try {
        const res = await fetch(`/api/admin/applications/${appId}`);
        const data = await res.json();
        if (!data.success) {
            showToast(data.message, "error");
            return;
        }

        const app = data.application;
        document.getElementById("review-candidate-name").textContent = app.candidate_name;
        document.getElementById("review-job-title").textContent = app.job_title;
        document.getElementById("review-job-meta").textContent = `${app.department} • ${app.job_location}`;
        document.getElementById("review-tracking-code").textContent = app.tracking_code;
        document.getElementById("review-applied-date").textContent = `Applied: ${app.created_at}`;
        
        const emailLink = document.getElementById("review-email");
        emailLink.textContent = app.candidate_email;
        emailLink.href = `mailto:${app.candidate_email}`;

        document.getElementById("review-phone").textContent = app.candidate_phone || "Not provided";
        document.getElementById("review-experience").textContent = `${app.experience_years} years`;
        document.getElementById("review-notice").textContent = app.notice_period || "Flexible";

        const linksContainer = document.getElementById("review-links");
        linksContainer.innerHTML = "";
        if (app.linkedin_url) {
            linksContainer.innerHTML += `<a href="${app.linkedin_url}" target="_blank" class="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"><i data-lucide="external-link" class="w-3 h-3"></i> LinkedIn Profile</a>`;
        }
        if (app.portfolio_url) {
            linksContainer.innerHTML += `<a href="${app.portfolio_url}" target="_blank" class="text-xs text-pink-600 font-semibold hover:underline flex items-center gap-1"><i data-lucide="globe" class="w-3 h-3"></i> Portfolio / GitHub</a>`;
        }

        const resumeSec = document.getElementById("review-resume-section");
        if (app.resume_filename) {
            resumeSec.classList.remove("hidden");
            document.getElementById("review-resume-name").textContent = app.resume_filename;
            document.getElementById("review-resume-link").href = `/uploads/${app.resume_filename}`;
        } else {
            resumeSec.classList.add("hidden");
        }

        document.getElementById("review-cover-letter").textContent = app.cover_letter || "No cover letter submitted.";

        // Form controls
        document.getElementById("review-status-select").value = app.status;
        document.getElementById("review-rating-select").value = app.rating || 0;
        document.getElementById("review-notes-input").value = app.recruiter_notes || "";

        openModal("modal-app-review");
    } catch (err) {
        showToast("Failed to load candidate dossier.", "error");
    }
}

async function saveApplicationReview() {
    if (!selectedApplicationId) return;

    const status = document.getElementById("review-status-select").value;
    const rating = document.getElementById("review-rating-select").value;
    const recruiter_notes = document.getElementById("review-notes-input").value;

    try {
        const res = await fetch(`/api/admin/applications/${selectedApplicationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, rating, recruiter_notes })
        });
        const data = await res.json();

        if (data.success) {
            showToast("Candidate status and evaluation updated!", "success");
            closeModal("modal-app-review");
            loadAdminApplications();
            loadAdminAnalytics();
        } else {
            showToast(data.message, "error");
        }
    } catch (err) {
        showToast("Failed to update candidate record.", "error");
    }
}

async function deleteCurrentApplication() {
    if (!selectedApplicationId) return;
    if (!confirm("Are you sure you want to permanently delete this application record?")) return;

    try {
        const res = await fetch(`/api/admin/applications/${selectedApplicationId}`, {
            method: "DELETE"
        });
        const data = await res.json();

        if (data.success) {
            showToast("Application removed.", "info");
            closeModal("modal-app-review");
            loadAdminApplications();
            loadAdminAnalytics();
        }
    } catch (err) {
        showToast("Error deleting application.", "error");
    }
}

// ==========================================
// ADMIN: JOB VACANCIES CRUD
// ==========================================
async function loadAdminJobs() {
    const tbody = document.getElementById("admin-jobs-tbody");
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-400"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto text-pink-600 mb-1"></i>Loading vacancies...</td></tr>`;
    lucide.createIcons();

    try {
        const res = await fetch("/api/jobs");
        const data = await res.json();

        if (data.success) {
            renderAdminJobsTable(data.jobs);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Failed to load vacancies.</td></tr>`;
    }
}

function renderAdminJobsTable(jobs) {
    const tbody = document.getElementById("admin-jobs-tbody");
    if (!jobs || jobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">No job openings created yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = jobs.map(job => {
        const salaryText = (job.min_salary && job.max_salary)
            ? `$${(job.min_salary / 1000).toFixed(0)}k - $${(job.max_salary / 1000).toFixed(0)}k`
            : "Competitive";

        const isActive = job.status === "Active";

        return `
            <tr class="hover:bg-pink-50/40 transition">
                <td class="px-4 py-3.5">
                    <div class="font-bold text-gray-900">${job.title}</div>
                    <div class="text-xs text-pink-600 font-medium">${job.department}</div>
                </td>
                <td class="px-4 py-3.5 text-xs text-gray-600">
                    <div>${job.location}</div>
                    <div class="text-gray-400">${job.work_type} • ${job.employment_type}</div>
                </td>
                <td class="px-4 py-3.5 text-xs font-semibold text-gray-800">
                    ${salaryText}
                </td>
                <td class="px-4 py-3.5">
                    <span class="px-2.5 py-1 bg-pink-100 text-pink-700 font-bold text-xs rounded-full">
                        ${job.applicant_count || 0} applied
                    </span>
                </td>
                <td class="px-4 py-3.5">
                    <button onclick="toggleJobStatus(${job.id})" class="px-2.5 py-1 rounded-full text-xs font-bold transition ${isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                        ${job.status}
                    </button>
                </td>
                <td class="px-4 py-3.5 text-right space-x-2">
                    <button onclick="editJob(${job.id})" class="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold">
                        Edit
                    </button>
                    <button onclick="deleteJob(${job.id})" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    lucide.createIcons();
}

function openCreateJobModal() {
    document.getElementById("job-form-modal-title").textContent = "Post New Job Opening";
    document.getElementById("job-form-submit-text").textContent = "Publish Opening";
    document.getElementById("admin-form-job-id").value = "";
    document.getElementById("admin-job-form").reset();
    openModal("modal-job-form");
}

async function editJob(jobId) {
    try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        if (!data.success) return;

        const job = data.job;
        document.getElementById("job-form-modal-title").textContent = "Edit Job Opening";
        document.getElementById("job-form-submit-text").textContent = "Save Changes";
        document.getElementById("admin-form-job-id").value = job.id;

        document.getElementById("admin-form-title").value = job.title;
        document.getElementById("admin-form-department").value = job.department;
        document.getElementById("admin-form-work-type").value = job.work_type;
        document.getElementById("admin-form-employment-type").value = job.employment_type;
        document.getElementById("admin-form-location").value = job.location;
        document.getElementById("admin-form-experience-level").value = job.experience_level;
        document.getElementById("admin-form-min-salary").value = job.min_salary || "";
        document.getElementById("admin-form-max-salary").value = job.max_salary || "";
        document.getElementById("admin-form-deadline").value = job.deadline || "";
        document.getElementById("admin-form-skills").value = job.skills || "";
        document.getElementById("admin-form-description").value = job.description;
        document.getElementById("admin-form-requirements").value = job.requirements || "";
        document.getElementById("admin-form-benefits").value = job.benefits || "";

        const statusRadios = document.getElementsByName("admin-form-status");
        for (let r of statusRadios) {
            r.checked = (r.value === job.status);
        }

        openModal("modal-job-form");
    } catch (err) {
        showToast("Failed to fetch job for edit.", "error");
    }
}

async function handleJobFormSubmit(e) {
    e.preventDefault();
    const jobId = document.getElementById("admin-form-job-id").value;
    const isEdit = Boolean(jobId);

    const title = document.getElementById("admin-form-title").value.trim();
    const department = document.getElementById("admin-form-department").value;
    const work_type = document.getElementById("admin-form-work-type").value;
    const employment_type = document.getElementById("admin-form-employment-type").value;
    const location = document.getElementById("admin-form-location").value.trim();
    const experience_level = document.getElementById("admin-form-experience-level").value;
    const min_salary = document.getElementById("admin-form-min-salary").value;
    const max_salary = document.getElementById("admin-form-max-salary").value;
    const deadline = document.getElementById("admin-form-deadline").value;
    const skills = document.getElementById("admin-form-skills").value.trim();
    const description = document.getElementById("admin-form-description").value.trim();
    const requirements = document.getElementById("admin-form-requirements").value.trim();
    const benefits = document.getElementById("admin-form-benefits").value.trim();

    let status = "Active";
    const statusRadios = document.getElementsByName("admin-form-status");
    for (let r of statusRadios) {
        if (r.checked) status = r.value;
    }

    const payload = {
        title, department, work_type, employment_type, location,
        experience_level, min_salary, max_salary, deadline, skills,
        description, requirements, benefits, status
    };

    const endpoint = isEdit ? `/api/admin/jobs/${jobId}` : "/api/admin/jobs";
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(endpoint, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            showToast(isEdit ? "Job opening updated!" : "New job opening published!", "success");
            closeModal("modal-job-form");
            loadAdminJobs();
            loadAdminJobsFilterDropdown();
            loadJobs();
            loadAdminAnalytics();
        } else {
            showToast(data.message, "error");
        }
    } catch (err) {
        showToast("Error saving job opening.", "error");
    }
}

async function toggleJobStatus(jobId) {
    try {
        const res = await fetch(`/api/admin/jobs/${jobId}/toggle-status`, { method: "PATCH" });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, "info");
            loadAdminJobs();
            loadJobs();
            loadAdminAnalytics();
        }
    } catch (err) {
        showToast("Failed to toggle status.", "error");
    }
}

async function deleteJob(jobId) {
    if (!confirm("Are you sure you want to delete this job opening? All candidate applications associated with this job will also be removed!")) {
        return;
    }

    try {
        const res = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
            showToast("Job opening deleted.", "info");
            loadAdminJobs();
            loadAdminJobsFilterDropdown();
            loadAdminApplications();
            loadJobs();
            loadAdminAnalytics();
        }
    } catch (err) {
        showToast("Error deleting job.", "error");
    }
}

function exportApplicationsCSV() {
    window.location.href = "/api/admin/export-csv";
}

// Utility
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

