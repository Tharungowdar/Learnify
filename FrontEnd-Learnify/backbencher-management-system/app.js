// =====================
// Constants and Globals
// =====================
const API = "http://localhost:8080/api";

// ---- Utility Functions ----
function safeJSONParse(str, defaultValue = null) {
    if (!str) return defaultValue;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn('JSON Parse Error:', e);
        return defaultValue;
    }
}

// ---- Global State ----
let token = localStorage.getItem('jwt_token') || null;
let currentUser = safeJSONParse(localStorage.getItem('current_user'));
let userRole = currentUser?.role || null;

// ---- Auth Header Helper ----
function authHeaders(contentType) {
    const headers = {};
    if (contentType) headers["Content-Type"] = contentType;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

// ---- API Response Helper ----
async function handleApiResponse(response, errorMessage = 'Operation failed') {
    try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || errorMessage);
            return data;
        } else {
            const text = await response.text();
            if (!response.ok) throw new Error(text || errorMessage);
            return text;
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ---- UI Helpers ----
function show(element) {
    if (!element) return;
    element.classList.remove('hidden');
    element.style.opacity = '0';
    element.style.display = 'block';
    setTimeout(() => { element.style.opacity = '1'; }, 10);
}

function hide(element) {
    if (!element) return;
    element.style.opacity = '0';
    setTimeout(() => {
        element.style.display = 'none';
        element.classList.add('hidden');
    }, 300);
}

function showMessage(message, isError = true) {
    const messageDiv = document.getElementById("auth-message");
    if (!messageDiv) return;
    messageDiv.textContent = message;
    messageDiv.className = isError ? 'alert alert-error' : 'alert alert-success';
    show(messageDiv);
    setTimeout(() => { hide(messageDiv); }, 5000);
}

// ---- Authentication ----
async function login(username, password) {
    try {
        const response = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await handleApiResponse(response, 'Login failed');
        
        token = data.token;
        currentUser = {
            username,
            role: data.role || 'USER',
            email: data.email,
            ...data.user
        };
        userRole = currentUser.role;

        localStorage.setItem('jwt_token', token);
        localStorage.setItem('current_user', JSON.stringify(currentUser));

        return true;
    } catch (error) {
        throw error;
    }
}

async function logout() {
    token = null;
    currentUser = null;
    userRole = null;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user');
    initUI();
}

// ---- UI State Management ----
function initUI() {
    const authSection = document.getElementById("auth-section");
    const mainSection = document.getElementById("main-section");
    const logoutBtn = document.getElementById("logout-btn");
    const adminSection = document.getElementById("admin-section");
    const adminTabBtn = document.getElementById("admin-tab-btn");

    if (token && currentUser) {
        hide(authSection);
        show(mainSection);
        show(logoutBtn);
        // Only show admin tab if ADMIN
        if (currentUser.role === 'ADMIN') {
            userRole = 'ADMIN';
            if (adminSection) show(adminSection);
            if (adminTabBtn) adminTabBtn.style.display = "";
        } else {
            userRole = currentUser.role;
            if (adminSection) hide(adminSection);
            if (adminTabBtn) adminTabBtn.style.display = "none";
        }
        loadInitialData();
        updateDashboardUser();
    } else {
        show(authSection);
        hide(mainSection);
        hide(logoutBtn);
        if (adminSection) hide(adminSection);
        if (adminTabBtn) adminTabBtn.style.display = "none";
    }
}

// ---- Data Loading Functions ----
async function loadInitialData() {
    try {
        await Promise.allSettled([
            loadCourses(),
            loadArticles(),
            loadPdfs(),
            populateCourseSelects(),
            updateDashboardStats(),
            updateDashboardRecentCourses()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage('Some data failed to load. Please refresh the page.');
    }
}

async function loadCourses() {
    try {
        const response = await fetch(`${API}/courses`, { headers: authHeaders() });
        const courses = await handleApiResponse(response, 'Failed to load courses');
        
        const list = document.getElementById("courses-list");
        if (!list) return;
        
        list.innerHTML = "";
        courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'item-card';
            courseCard.innerHTML = `
                <h3><i class="fas fa-book"></i> ${course.title}</h3>
                <p>${course.description || 'No description available'}</p>
                <div class="meta">
                    <span>Type: ${course.type}</span>
                    <span>ID: ${course.id}</span>
                    <span>Created: ${course.createdAt ? new Date(course.createdAt).toLocaleDateString() : ''}</span>
                </div>
            `;
            list.appendChild(courseCard);
        });
        // For dashboard stats
        window._coursesData = courses;
    } catch (error) {
        showMessage(error.message);
    }
}

async function populateCourseSelects() {
    try {
        const response = await fetch(`${API}/courses`, { headers: authHeaders() });
        const courses = await handleApiResponse(response, 'Failed to load courses');
        
        ['article-course-id', 'pdf-course-id'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = `<option value="">Select Course</option>`;
                courses.forEach(c => {
                    select.innerHTML += `<option value="${c.id}">${c.title} (${c.type})</option>`;
                });
            }
        });
    } catch (error) {
        // Silently ignore for dropdowns on load
    }
}

// ---- Group Articles by Course ----
function groupArticlesByCourse(articles, courses) {
    const courseMap = {};
    courses.forEach(c => {
        courseMap[c.id] = c;
    });
    // Group articles by courseId
    const grouped = {};
    articles.forEach(article => {
        const courseId = article.course?.id || 'none';
        if (!grouped[courseId]) grouped[courseId] = [];
        grouped[courseId].push(article);
    });
    return { grouped, courseMap };
}

// ---- Articles Tab: Grouped Rendering ----
function renderGroupedArticles() {
    const articles = window._articlesData || [];
    const courses = window._coursesData || [];
    const { grouped, courseMap } = groupArticlesByCourse(articles, courses);

    const groupedList = document.getElementById("articles-grouped-list");
    if (!groupedList) return;
    groupedList.innerHTML = "";

    // Show all courses with articles, plus 'No Course' group if any.
    Object.keys(grouped).forEach(courseId => {
        const course = courseMap[courseId];
        const groupDiv = document.createElement('div');
        groupDiv.className = 'course-group';

        groupDiv.innerHTML = `
            <div class="course-group-title">
                <i class="fas fa-book"></i> 
                ${course ? `${course.title} (${course.type})` : 'Unassigned / No Course'}
            </div>
            <div class="course-articles-list"></div>
        `;

        const listDiv = groupDiv.querySelector('.course-articles-list');
        grouped[courseId].forEach(a => {
            const articleCard = document.createElement('div');
            articleCard.className = 'item-card article-card';
            articleCard.style.cursor = 'pointer';
            articleCard.innerHTML = `
                <h3><i class="fas fa-file-alt"></i> ${a.title}</h3>
                <p>${a.content.length > 100 ? a.content.substring(0, 100) + '...' : a.content}</p>
                <div class="meta">
                    <span>Course: ${a.course?.id || 'N/A'}</span>
                    <span>ID: ${a.id}</span>
                    <span>By: ${a.author?.username || 'N/A'}</span>
                </div>
            `;
            articleCard.addEventListener('click', () => showArticleModal(a));
            listDiv.appendChild(articleCard);
        });

        groupedList.appendChild(groupDiv);
    });
}

// ---- Articles Loader (overrides default) ----
async function loadArticles() {
    try {
        const response = await fetch(`${API}/articles`, { headers: authHeaders() });
        const articles = await handleApiResponse(response, 'Failed to load articles');
        window._articlesData = articles;
        renderGroupedArticles();
    } catch (error) {
        showMessage(error.message);
    }
}

// ---- Dashboard Courses: Click to Show Articles Modal ----
async function updateDashboardRecentCourses() {
    let courses = window._coursesData;
    if (!courses) {
        try {
            const response = await fetch(`${API}/courses`, { headers: authHeaders() });
            courses = await handleApiResponse(response, 'Failed to load courses');
        } catch {
            courses = [];
        }
    }
    const recentList = document.getElementById('recent-courses-list');
    if (recentList) {
        recentList.innerHTML = '';
        courses.slice(-3).reverse().forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'item-card dashboard-course-card';
            courseCard.style.cursor = 'pointer';
            courseCard.innerHTML = `
                <h3><i class="fas fa-book"></i> ${course.title}</h3>
                <p>${course.description || 'No description available'}</p>
                <div class="meta">
                    <span>Type: ${course.type}</span>
                    <span>ID: ${course.id}</span>
                    <span>Created: ${course.createdAt ? new Date(course.createdAt).toLocaleDateString() : ''}</span>
                </div>
            `;
            // Add click to show articles for that course
            courseCard.addEventListener('click', () => showCourseArticlesModal(course));
            recentList.appendChild(courseCard);
        });
    }
}

// ---- Show Course Articles Modal ----
function showCourseArticlesModal(course) {
    // Get all articles for this course
    const articles = (window._articlesData || []).filter(a => a.course?.id === course.id);

    document.getElementById("modal-course-title").innerHTML = `
        <span style="font-size:1.2rem;font-weight:600;color:#1976D2;">
            <i class="fas fa-book" style="margin-right:6px;"></i> ${course.title} (${course.type})
        </span>
    `;
    const modalList = document.getElementById("modal-course-articles-list");
    modalList.innerHTML = "";
    if (articles.length === 0) {
        modalList.innerHTML = "<div style='color:#888;padding:14px;'>No articles for this course.</div>";
    } else {
        articles.forEach(article => {
            const articleCard = document.createElement('div');
            articleCard.className = 'item-card article-card';
            articleCard.style.marginBottom = "10px";
            articleCard.style.cursor = 'pointer';
            articleCard.innerHTML = `
                <h3><i class="fas fa-file-alt"></i> ${article.title}</h3>
                <p>${article.content.length > 100 ? article.content.slice(0, 100) + '...' : article.content}</p>
                <div class="meta">
                    <span>ID: ${article.id}</span>
                    <span>By: ${article.author?.username || 'N/A'}</span>
                </div>
            `;
            articleCard.addEventListener('click', () => showArticleModal(article));
            modalList.appendChild(articleCard);
        });
    }
    const modal = document.getElementById("course-articles-modal");
    modal.classList.add('active');
    modal.classList.remove('hidden');
    modal.style.animation = "modalFadeIn 0.25s";
}
// ---- Hide Course Articles Modal ----
function closeCourseArticlesModal() {
    const modal = document.getElementById("course-articles-modal");
    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.style.animation = "";
}

// ---- Article Modal Logic (Updated UI) ----
function showArticleModal(article) {
    // Set modal content with enhanced HTML and styles
    document.getElementById("modal-article-title").innerHTML = `
        <span style="font-size:1.5rem;font-weight:600;color:#4A90E2;">
            <i class="fas fa-file-alt" style="margin-right:6px;color:#FFA726;"></i>${article.title}
        </span>
    `;

    // Beautiful meta badges
    document.getElementById("modal-article-meta").innerHTML = `
        <div class="meta" style="margin:12px 0 16px;display: flex;flex-wrap:wrap;gap:8px;">
            <span class="badge" style="background:#e3f2fd;color:#1976D2;padding:4px 10px;border-radius:16px;">
                <i class="fas fa-hashtag"></i> ID: ${article.id}
            </span>
            <span class="badge" style="background:#ede7f6;color:#6a1b9a;padding:4px 10px;border-radius:16px;">
                <i class="fas fa-book"></i> Course: ${article.course?.id || 'N/A'}
            </span>
            <span class="badge" style="background:#fff3e0;color:#f57c00;padding:4px 10px;border-radius:16px;">
                <i class="fas fa-user"></i> By: ${article.author?.username || 'N/A'}
            </span>
            <span class="badge" style="background:#e8f5e9;color:#388e3c;padding:4px 10px;border-radius:16px;">
                <i class="fas fa-clock"></i> ${article.createdAt ? new Date(article.createdAt).toLocaleString() : ''}
            </span>
        </div>
    `;

    // Article content with better presentation
    document.getElementById("modal-article-content").innerHTML = `
        <div style="
            background: #fafbfc;
            border-left: 4px solid #42a5f5;
            padding: 18px 20px;
            margin: 10px 0 0;
            border-radius: 8px;
            font-size: 1.08rem;
            color: #263238;
            line-height: 1.7;
            max-height: 350px;
            overflow-y: auto;
            box-shadow: 0 2px 8px 0 rgba(66,165,245,.06);
        ">
            ${article.content.replace(/\n/g, '<br>')}
        </div>
    `;

    // Activate modal with fade-in animation
    const modal = document.getElementById("article-modal");
    modal.classList.add('active');
    modal.classList.remove('hidden');
    modal.style.animation = "modalFadeIn 0.25s";
}

// Clear animation when closing
function closeArticleModal() {
    const modal = document.getElementById("article-modal");
    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.style.animation = "";
}
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("close-article-modal").addEventListener('click', closeArticleModal);
    document.getElementById("article-modal").addEventListener('click', function(e) {
        if (e.target === this) closeArticleModal();
    });
    // Course articles modal
    document.getElementById("close-course-articles-modal").addEventListener('click', closeCourseArticlesModal);
    document.getElementById("course-articles-modal").addEventListener('click', function(e) {
        if (e.target === this) closeCourseArticlesModal();
    });
});

// ---- Event Listeners ----
document.addEventListener('DOMContentLoaded', () => {
    initUI();

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            const contentElement = document.getElementById(`${tabId}-tab`);
            if (contentElement) {
                contentElement.classList.add('active');
            }
            // If dashboard tab, update stats and welcome
            if (tabId === 'dashboard') {
                updateDashboardStats();
                updateDashboardUser();
                updateDashboardRecentCourses();
            }
            // If articles tab, re-render grouped articles
            if (tabId === 'articles') {
                renderGroupedArticles();
            }
        });
    });

    // Login
    document.getElementById("login-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value.trim();
        try {
            await login(username, password);
            showMessage('Login successful!', false);
            initUI();
        } catch (error) {
            showMessage(error.message || 'Login failed. Please try again.');
        }
    });

    // Register
    document.getElementById("register-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = {
            username: document.getElementById("register-username").value.trim(),
            password: document.getElementById("register-password").value.trim(),
            email: document.getElementById("register-email").value.trim(),
            firstName: document.getElementById("register-firstname").value.trim(),
            lastName: document.getElementById("register-lastname").value.trim()
        };
        try {
            const response = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            await handleApiResponse(response, 'Registration failed');
            showMessage('Registration successful! Please login.', false);
            document.getElementById("register-form").reset();
        } catch (error) {
            showMessage(error.message || 'Registration failed. Please try again.');
        }
    });

    // Logout
    document.getElementById("logout-btn")?.addEventListener("click", logout);

    // Add Course
    document.getElementById("add-course-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!token) {
            showMessage("You must login first.");
            return;
        }
        const title = document.getElementById("course-title").value.trim();
        const type = document.getElementById("course-type").value;
        const description = document.getElementById("course-description").value;
        if (!title) {
            showMessage("Please enter a course title");
            return;
        }
        try {
            const response = await fetch(`${API}/courses`, {
                method: "POST",
                headers: authHeaders("application/json"),
                body: JSON.stringify({ title, type, description })
            });
            await handleApiResponse(response, 'Failed to create course');
            await Promise.all([loadCourses(), populateCourseSelects()]);
            document.getElementById("add-course-form").reset();
            showMessage('Course created successfully!', false);
        } catch (error) {
            showMessage(error.message || 'Failed to create course. Please try again.');
        }
    });

    // Add Article
    document.getElementById("add-article-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!token) {
            showMessage("You must login first.");
            return;
        }
        const title = document.getElementById("article-title").value.trim();
        const content = document.getElementById("article-content").value.trim();
        const courseId = document.getElementById("article-course-id").value;
        if (!title || !content || !courseId) {
            showMessage("Please fill all required fields");
            return;
        }
        try {
            const response = await fetch(`${API}/articles`, {
                method: "POST",
                headers: authHeaders("application/json"),
                body: JSON.stringify({ title, content, courseId })
            });
            await handleApiResponse(response, 'Failed to create article');
            await loadArticles();
            document.getElementById("add-article-form").reset();
            showMessage('Article created successfully!', false);
        } catch (error) {
            showMessage(error.message || 'Failed to create article. Please try again.');
        }
    });

    // Upload PDF
    document.getElementById("upload-pdf-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!token) {
            showMessage("You must login first.");
            return;
        }
        const file = document.getElementById("pdf-file").files[0];
        const courseId = document.getElementById("pdf-course-id").value;
        
        if (!file) {
            showMessage('Please select a PDF file to upload.');
            return;
        }
        if (file.type !== 'application/pdf') {
            showMessage('Only PDF files are allowed.');
            return;
        }
        if (!courseId) {
            showMessage('Please select a course for the PDF.');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("courseId", courseId);
            
            const response = await fetch(`${API}/pdf/upload`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Do NOT set Content-Type header for multipart/form-data
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to upload PDF');
            }
            
            await loadPdfs();
            document.getElementById("upload-pdf-form").reset();
            showMessage('PDF uploaded successfully!', false);
        } catch (error) {
            showMessage(error.message || 'Failed to upload PDF. Please try again.');
        }
    });

    // ---- Admin Buttons ----
    document.getElementById("load-users-btn")?.addEventListener("click", async () => {
        if (!token || currentUser?.role !== 'ADMIN') {
            showMessage("Unauthorized access");
            return;
        }
        await loadAdminUsers();
    });

    document.getElementById("load-reported-btn")?.addEventListener("click", async () => {
        if (!token || currentUser?.role !== 'ADMIN') {
            showMessage("Unauthorized access");
            return;
        }
        await loadReportedContent();
    });
});

// ---- Admin Users ----
async function loadAdminUsers() {
    try {
        const res = await fetch(`${API}/admin/dashboard`, { headers: authHeaders() });
        const data = await handleApiResponse(res, 'Failed to load users');
        const users = data.users || [];
        const list = document.getElementById("users-list");
        if (!list) return;
        list.innerHTML = "";
        users.forEach(u => {
            const userCard = document.createElement('div');
            userCard.className = 'item-card';
            userCard.innerHTML = `
                <h3><i class="fas fa-user"></i> ${u.username} ${u.role === "ADMIN" ? '<span style="color:#f44336;">(Admin)</span>' : ""}</h3>
                <p>Email: ${u.email}</p>
                <div class="meta">
                    <span>Role: ${u.role}</span>
                    <span>ID: ${u.id}</span>
                </div>
            `;
            list.appendChild(userCard);
        });
    } catch (error) {
        showMessage('Failed to load users. Please try again.');
    }
}

// ---- Admin Reported ----
async function loadReportedContent() {
    try {
        const res = await fetch(`${API}/admin/dashboard`, { headers: authHeaders() });
        const data = await handleApiResponse(res, 'Failed to load reported content');
        const reported = data.reportedContent || [];
        const list = document.getElementById("reported-list");
        if (!list) return;
        list.innerHTML = "";
        reported.forEach(content => {
            const contentCard = document.createElement('div');
            contentCard.className = 'item-card';
            contentCard.innerHTML = `
                <h3><i class="fas fa-flag"></i> ${content.fileName || "Reported Content"}</h3>
                <p>${content.reason || 'Reported for review'}</p>
                <div class="meta">
                    <span>ID: ${content.id}</span>
                    <span>Reported: ${content.reported ? 'Yes' : 'No'}</span>
                    <span>Approved: ${content.approved ? 'Yes' : 'No'}</span>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-success approve-btn" data-id="${content.id}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger reject-btn" data-id="${content.id}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            `;
            list.appendChild(contentCard);
        });

        // Approve/reject
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                try {
                    await fetch(`${API}/admin/content/${id}/approve`, {
                        method: "PUT",
                        headers: authHeaders()
                    });
                    showMessage("Content approved!", false);
                    btn.closest('.item-card').remove();
                } catch {
                    showMessage('Failed to approve content.');
                }
            });
        });
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                try {
                    await fetch(`${API}/admin/content/${id}/reject`, {
                        method: "PUT",
                        headers: authHeaders()
                    });
                    showMessage("Content rejected!", false);
                    btn.closest('.item-card').remove();
                } catch {
                    showMessage('Failed to reject content.');
                }
            });
        });
    } catch (error) {
        showMessage('Failed to load reported content. Please try again.');
    }
}

// ---- Dashboard Stats ----
async function updateDashboardStats() {
    // Use previously fetched data if available, or fetch
    let courses = window._coursesData, articles = window._articlesData, pdfs = window._pdfsData;
    try {
        if (!courses) {
            const response = await fetch(`${API}/courses`, { headers: authHeaders() });
            courses = await handleApiResponse(response, 'Failed to load courses');
        }
        if (!articles) {
            const response = await fetch(`${API}/articles`, { headers: authHeaders() });
            articles = await handleApiResponse(response, 'Failed to load articles');
        }
        if (!pdfs) {
            const response = await fetch(`${API}/pdf`, { headers: authHeaders() });
            pdfs = await handleApiResponse(response, 'Failed to load PDFs');
        }
    } catch {
        // Ignore errors here, just don't update stats
    }
    document.getElementById('stat-courses').textContent = courses ? courses.length : '0';
    document.getElementById('stat-articles').textContent = articles ? articles.length : '0';
    // Demo values for assignments/certificates, replace with real API if available
    if (document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = '2';
    if (document.getElementById('stat-certificates')) document.getElementById('stat-certificates').textContent = '1';
}

function updateDashboardUser() {
    if (!currentUser) return;
    const usernameEl = document.getElementById('welcome-username');
    if (usernameEl) {
        usernameEl.textContent = `Welcome back, ${currentUser.username || 'User'}!`;
    }
    // Optionally update the welcome message with more info if available
}

// ---- PDFs Loader ----
async function loadPdfs() {
    if (!token) return;
    try {
        const response = await fetch(`${API}/pdf`, { headers: authHeaders() });
        const pdfs = await handleApiResponse(response, 'Failed to load PDFs');
        const list = document.getElementById("pdfs-list");
        if (!list) return;
        list.innerHTML = "";
        pdfs.forEach(pdf => {
            const courseLabel = pdf.course && pdf.course.title
                ? `${pdf.course.title} (${pdf.course.id})`
                : (pdf.course?.id ? `ID: ${pdf.course.id}` : "N/A");
            const byLabel = pdf.user && pdf.user.username ? pdf.user.username : "N/A";
            // PDF file endpoint
            const pdfUrl = `${API}/pdf/file/${pdf.id}`;
            const pdfCard = document.createElement('div');
            pdfCard.className = 'item-card pdf-card';
            pdfCard.style.cursor = 'pointer';
            pdfCard.innerHTML = `
                <h3>
                    <i class="fas fa-file-pdf"></i>
                    <span style="color:#f44336;text-decoration:underline;">${pdf.fileName}</span>
                </h3>
                <p>${pdf.extractedText ? pdf.extractedText.substring(0, 100) + '...' : ''}</p>
                <div class="meta">
                    <span>Course: ${courseLabel}</span>
                    <span>ID: ${pdf.id}</span>
                    <span>By: ${byLabel}</span>
                </div>
            `;
            pdfCard.addEventListener('click', () => {
                window.open(pdfUrl, '_blank'); // Open the PDF in a new tab
            });
            list.appendChild(pdfCard);
        });
        // For dashboard stats
        window._pdfsData = pdfs;
    } catch (error) {
        showMessage(error.message);
    }
}