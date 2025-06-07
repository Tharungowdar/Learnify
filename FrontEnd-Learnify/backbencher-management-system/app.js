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
            updateDashboardRecentCourses(),
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
            // Show articles for this course in the courses tab only
            courseCard.addEventListener('click', () => {
                if (isTabActive('courses')) {
                    showCourseArticlesInCoursesTab(course);
                }
                if (document.getElementById('articles-tab').classList.contains('active')) {
                    renderCourseFilterChips();
                }
            });
            list.appendChild(courseCard);
        });
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

let _articleFilterCourseId = null;

function renderCourseFilterChips() {
    const courses = window._coursesData || [];
    const chipsBar = document.getElementById("course-filter-chips");
    if (!chipsBar) return;
    chipsBar.innerHTML = "";
    // "All" chip
    const allChip = document.createElement("button");
    allChip.className = "chip" + (_articleFilterCourseId ? "" : " active");
    allChip.innerHTML = `<i class="fas fa-globe"></i> All`;
    allChip.onclick = () => {
        _articleFilterCourseId = null;
        document.querySelectorAll(".chip").forEach(b => b.classList.remove('active'));
        allChip.classList.add('active');
        renderArticlesGrid();
        document.getElementById("show-all-articles-btn").style.display = "none";
    };
    chipsBar.appendChild(allChip);
    courses.forEach(course => {
        const chip = document.createElement("button");
        chip.className = "chip" + (_articleFilterCourseId === course.id ? " active" : "");
        chip.innerHTML = `<i class="fas fa-book"></i> ${course.title}`;
        chip.onclick = () => {
            _articleFilterCourseId = course.id;
            document.querySelectorAll(".chip").forEach(b => b.classList.remove('active'));
            chip.classList.add('active');
            renderArticlesGrid();
            document.getElementById("show-all-articles-btn").style.display = "inline-flex";
        };
        chipsBar.appendChild(chip);
    });
}

let _articleSearchTerm = "";

// Render articles filtered by course in Articles tab
function renderArticlesGrid() {
    const articles = window._articlesData || [];
    const grid = document.getElementById("articles-list");
    const articlesCount = document.getElementById("articles-count");
    if (!grid) return;

    let filtered = articles;

    if (_articleFilterCourseId) {
        filtered = filtered.filter(a => a.course && a.course.id === _articleFilterCourseId);
    }
    if (_articleSearchTerm) {
        filtered = filtered.filter(a =>
            (a.title && a.title.toLowerCase().includes(_articleSearchTerm)) ||
            (a.content && a.content.toLowerCase().includes(_articleSearchTerm))
        );
    }

    grid.innerHTML = "";
    if (!filtered.length) {
        grid.innerHTML = "<div style='color:#888;padding:18px;'>No articles found.</div>";
        articlesCount.textContent = "0 articles";
        return;
    }
    articlesCount.textContent = filtered.length + (filtered.length === 1 ? " article" : " articles");
    filtered.forEach(article => {
        const card = document.createElement("div");
        card.className = "article-card-advanced";
        card.innerHTML = `
            <h3><i class="fas fa-file-alt"></i> ${article.title}</h3>
            <div class="article-preview">${article.content.length > 120 ? article.content.slice(0, 120) + '...' : article.content}</div>
            <div class="meta">
                <span><i class="fas fa-hashtag"></i> ID: ${article.id}</span>
                <span><i class="fas fa-book"></i> ${article.course?.title || 'Unassigned'}</span>
                <span><i class="fas fa-user"></i> ${article.author?.username || 'N/A'}</span>
            </div>
        `;
        card.onclick = () => showArticleModal(article);
        grid.appendChild(card);
    });
}

// Show all articles when "Show All" is clicked
document.getElementById("show-all-articles-btn")?.addEventListener("click", () => {
    _articleFilterCourseId = null;
    document.querySelectorAll(".chip").forEach(b => b.classList.remove('active'));
    if (document.querySelector(".chip")) document.querySelector(".chip").classList.add('active');
    renderArticlesGrid();
    document.getElementById("show-all-articles-btn").style.display = "none";
});

// When articles tab is activated, re-render course buttons and articles
function handleArticlesTabActive() {
    renderCourseFilterChips();
    renderArticlesGrid();
    _articleFilterCourseId = null;
    document.getElementById("show-all-articles-btn").style.display = "none";
}

function renderGroupedArticles() {
    const articles = window._articlesData || [];
    const courses = window._coursesData || [];
    const { grouped, courseMap } = groupArticlesByCourse(articles, courses);

    const groupedList = document.getElementById("articles-grouped-list");
    if (!groupedList) return;
    groupedList.innerHTML = "";

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
            articleCard.addEventListener('click', (event) => {
                if (isTabActive('articles')) {
                    showArticleModal(a);
                }
            });
            listDiv.appendChild(articleCard);
        });

        groupedList.appendChild(groupDiv);
    });
}

async function loadArticles() {
    try {
        const response = await fetch(`${API}/articles`, { headers: authHeaders() });
        const articles = await handleApiResponse(response, 'Failed to load articles');
        window._articlesData = articles;
        renderArticlesGrid();
    } catch (error) {
        showMessage(error.message);
    }
}

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
            courseCard.addEventListener('click', () => {
                if (isTabActive('articles')) {
                    showCourseArticlesModal(course);
                }
            });
            recentList.appendChild(courseCard);
        });
    }
}

// Show all articles for a course in the courses tab (not a modal)
function showCourseArticlesInCoursesTab(course) {
    const articles = (window._articlesData || []).filter(a => a.course?.id === course.id);

    const container = document.getElementById("course-articles-in-courses-tab");
    if (!container) return;
    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="section-header" style="margin-top:24px;">
            <h3>
                <i class="fas fa-newspaper"></i> Articles for "${course.title}" (${course.type})
                <button class="btn btn-xs btn-secondary" id="close-course-articles-list" style="float:right;">Close</button>
            </h3>
        </div>
        <div id="course-articles-list-inner"></div>
    `;

    const listDiv = container.querySelector('#course-articles-list-inner');
    if (articles.length === 0) {
        listDiv.innerHTML = "<div style='color:#888;padding:14px;'>No articles for this course.</div>";
    } else {
        articles.forEach(article => {
            const articleCard = document.createElement('div');
            articleCard.className = 'item-card article-card';
            articleCard.style.marginBottom = "10px";
            articleCard.innerHTML = `
                <h3><i class="fas fa-file-alt"></i> ${article.title}</h3>
                <p>${article.content.length > 100 ? article.content.slice(0, 100) + '...' : article.content}</p>
                <div class="meta">
                    <span>ID: ${article.id}</span>
                    <span>By: ${article.author?.username || 'N/A'}</span>
                </div>
            `;
            listDiv.appendChild(articleCard);
        });
    }
    container.querySelector("#close-course-articles-list").onclick = () => {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
}

function isTabActive(tabName) {
    const tabContent = document.getElementById(`${tabName}-tab`);
    return tabContent && tabContent.classList.contains('active');
}

/* ---- Fix for multiple event listeners and duplicate code ---- */
function setupAdminButtons() {
    const adminBtnIds = [
        { id: "load-users-btn", fn: loadAdminUsers },
        { id: "load-courses-btn", fn: loadAllCourses },
        { id: "load-articles-btn", fn: loadAllArticles },
        { id: "load-pdfs-btn", fn: loadAllPdfs },
        { id: "load-projects-btn", fn: loadAllProjects },
        { id: "load-reported-btn", fn: loadReportedContent }
    ];
    adminBtnIds.forEach(({ id, fn }) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = () => {
                if (!token || userRole !== 'ADMIN') return showMessage("Unauthorized access");
                fn();
            };
        }
    });
}

function showCourseArticlesModal(course) {
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
            articleCard.addEventListener('click', () => {
                if (isTabActive('articles')) {
                    showArticleModal(article);
                }
            });
            modalList.appendChild(articleCard);
        });
    }
    const modal = document.getElementById("course-articles-modal");
    modal.classList.add('active');
    modal.classList.remove('hidden');
    modal.style.animation = "modalFadeIn 0.25s";
}

function closeCourseArticlesModal() {
    const modal = document.getElementById("course-articles-modal");
    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.style.animation = "";
}

function showArticleModal(article) {
    document.getElementById("modal-article-title").textContent = article.title;
    document.getElementById("modal-article-meta").innerHTML = `
        <span class="badge"><i class="fas fa-hashtag"></i> ID: ${article.id}</span>
        <span class="badge"><i class="fas fa-book"></i> ${article.course?.title || 'Unassigned'}</span>
        <span class="badge"><i class="fas fa-user"></i> ${article.author?.username || 'N/A'}</span>
        <span class="badge"><i class="fas fa-clock"></i> ${article.createdAt ? new Date(article.createdAt).toLocaleString() : ''}</span>
    `;
    document.getElementById("modal-article-content").innerHTML = article.content.replace(/\n/g, "<br>");
    const modal = document.getElementById("article-modal");
    modal.classList.add('active');
    modal.classList.remove('hidden');
}

function closeArticleModal() {
    const modal = document.getElementById("article-modal");
    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.style.animation = "";
}

function isTabActive(tabName) {
    const tabContent = document.getElementById(`${tabName}-tab`);
    return tabContent && tabContent.classList.contains('active');
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("close-article-modal").addEventListener('click', closeArticleModal);
    document.getElementById("article-modal").addEventListener('click', function (e) {
        if (e.target === this) closeArticleModal();
    });
    document.getElementById("close-course-articles-modal").addEventListener('click', closeCourseArticlesModal);
    document.getElementById("course-articles-modal").addEventListener('click', function (e) {
        if (e.target === this) closeCourseArticlesModal();
    });
});

// ---- Project Ideas Tab Logic ----
async function loadSuggestedProjects(techs) {
    try {
        const response = await fetch(`${API}/projects/suggest`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
            body: JSON.stringify(techs)
        });
        const projects = await handleApiResponse(response, 'Failed to fetch project ideas');
        renderSuggestedProjects(projects, techs);
    } catch (error) {
        showMessage(error.message || 'Failed to fetch project ideas.');
    }
}

function renderSuggestedProjects(projects, userTechs) {
    const list = document.getElementById("suggested-projects-list");
    list.innerHTML = "";
    if (!projects.length) {
        list.innerHTML = "<div style='color:#888;padding:14px;'>No projects found for your technology stack. Try adding more technologies!</div>";
        return;
    }
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'item-card project-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <h3><i class="fas fa-lightbulb"></i> ${project.title}</h3>
            <p>${project.summary || 'No summary'}</p>
            <div class="meta">
                <span>Tech: ${project.technologies.join(', ')}</span>
            </div>
            <button class="btn btn-info btn-sm" style="margin-top:10px;">View Roadmap</button>
        `;
        card.querySelector('button').addEventListener('click', () => showProjectRoadmapModal(project));
        list.appendChild(card);
    });
}

function showProjectRoadmapModal(project) {
    document.getElementById("modal-project-title").innerHTML = `
        <span style="font-size:1.3rem;font-weight:600;color:#1976D2;">
            <i class="fas fa-lightbulb" style="margin-right:6px;"></i>${project.title}
        </span>
    `;
    document.getElementById("modal-project-summary").innerHTML = `
        <div style="margin:10px 0 15px;color:#444;">${project.summary}</div>
    `;
    document.getElementById("modal-project-technologies").innerHTML = `
        <div style="margin-bottom:8px;"><b>Required Technologies:</b> 
            <span style="color:#388e3c;">${project.technologies.join(', ')}</span>
        </div>
    `;
    document.getElementById("modal-project-extratechs").innerHTML = project.extraTechnologies && project.extraTechnologies.length
        ? `<div style="margin-bottom:8px;"><b>You need to learn:</b> 
            <span style="color:#e53935;">${project.extraTechnologies.join(', ')}</span>
        </div>`
        : `<div style="margin-bottom:8px;color:#388e3c;"><i class="fas fa-check"></i> You know all required technologies!</div>`;
    document.getElementById("modal-project-roadmap").innerHTML = `
        <div style="margin:12px 0;">
            <b>Project Roadmap:</b>
            <ol style="padding-left:22px;margin-top:6px;">
                ${project.roadmap.map(step => `<li style="margin-bottom:6px;">${step}</li>`).join('')}
            </ol>
        </div>
    `;
    // Show modal
    const modal = document.getElementById("project-roadmap-modal");
    modal.classList.add('active');
    modal.classList.remove('hidden');
    modal.style.animation = "modalFadeIn 0.25s";
}
function closeProjectRoadmapModal() {
    const modal = document.getElementById("project-roadmap-modal");
    modal.classList.remove('active');
    modal.classList.add('hidden');
    modal.style.animation = "";
}

// ---- Admin Add Project ----
document.getElementById("add-project-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!token || userRole !== 'ADMIN') {
        showMessage("Only admins can add projects.");
        return;
    }
    const title = document.getElementById("project-title").value.trim();
    const summary = document.getElementById("project-summary").value.trim();
    const technologies = document.getElementById("project-technologies").value.split(',').map(t => t.trim()).filter(Boolean);
    const roadmap = document.getElementById("project-roadmap").value.split('\n').map(l => l.trim()).filter(Boolean);
    try {
        const response = await fetch(`${API}/projects`, {
            method: "POST",
            headers: authHeaders("application/json"),
            body: JSON.stringify({ title, summary, technologies, roadmap })
        });
        await handleApiResponse(response, 'Failed to add project');
        showMessage('Project added!', false);
        document.getElementById("add-project-form").reset();

        // --- Trigger project ideas refresh ---
        const techInput = document.getElementById("project-tech-input")?.value.trim() || "";
        const techs = techInput ? techInput.split(',').map(t => t.trim()).filter(Boolean) : [];
        await loadSuggestedProjects(techs);

    } catch (error) {
        showMessage(error.message || 'Failed to add project.');
    }
});

// ---- Admin Import Project from GitHub ----
document.getElementById("import-project-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!token || userRole !== 'ADMIN') {
        showMessage("Only admins can import projects.");
        return;
    }
    const url = document.getElementById("github-url").value.trim();
    try {
        const response = await fetch(`${API}/projects/import`, {
            method: "POST",
            headers: authHeaders("application/json"),
            body: JSON.stringify({ url })
        });
        await handleApiResponse(response, 'Failed to import project');
        showMessage('Project imported from GitHub!', false);
        document.getElementById("import-project-form").reset();

        // --- Trigger project ideas refresh ---
        const techInput = document.getElementById("project-tech-input")?.value.trim() || "";
        const techs = techInput ? techInput.split(',').map(t => t.trim()).filter(Boolean) : [];
        await loadSuggestedProjects(techs);

    } catch (error) {
        showMessage(error.message || 'Failed to import project.');
    }
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
                handleArticlesTabActive();
            }

            if (tab.getAttribute('data-tab') === 'articles') {
                handleArticlesTabActive();
            }

            // If projects tab, refresh with user input
            if (tabId === 'projects') {
                const techInput = document.getElementById("project-tech-input")?.value.trim() || "";
                const techs = techInput ? techInput.split(',').map(t => t.trim()).filter(Boolean) : [];
                loadSuggestedProjects(techs);
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

    // Project Ideas tab: user tech input
    document.getElementById("projects-tab-btn")?.addEventListener('click', () => {
        document.getElementById("project-tech-input").value = "";
        document.getElementById("suggested-projects-list").innerHTML =
            "<div style='color:#888;padding:14px;'>Enter your technologies to get project ideas!</div>";
    });

    // Project tech form
    document.getElementById("project-tech-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const techInput = document.getElementById("project-tech-input").value.trim();
        if (!techInput) {
            showMessage("Please enter at least one technology.");
            return;
        }
        const techs = techInput.split(',').map(t => t.trim()).filter(Boolean);
        await loadSuggestedProjects(techs);
    });

    // Project roadmap modal close
    document.getElementById("close-project-roadmap-modal")?.addEventListener('click', closeProjectRoadmapModal);
    document.getElementById("project-roadmap-modal")?.addEventListener('click', function (e) {
        if (e.target === this) closeProjectRoadmapModal();
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

    document.getElementById("open-add-article-modal").addEventListener("click", () => {
        // Populate courses in select
        const select = document.getElementById("article-course-id");
        select.innerHTML = '<option value="">Select Course</option>';
        (window._coursesData || []).forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.title}</option>`;
        });
        document.getElementById("add-article-modal").classList.add("active");
    });
    document.getElementById("close-add-article-modal").addEventListener("click", () => {
        document.getElementById("add-article-modal").classList.remove("active");
    });
    document.getElementById("add-article-modal").addEventListener("click", function (e) {
        if (e.target === this) this.classList.remove("active");
    });

    document.getElementById("article-search-input").addEventListener("input", function () {
        _articleSearchTerm = this.value.trim().toLowerCase();
        renderArticlesGrid();
    });

    // Close article modal
    document.getElementById("close-article-modal").addEventListener("click", () => {
        document.getElementById("article-modal").classList.remove("active");
    });
    document.getElementById("article-modal").addEventListener("click", function (e) {
        if (e.target === this) this.classList.remove("active");
    });

    // Add Article submit
    document.getElementById("add-article-form").addEventListener("submit", async (e) => {
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
            document.getElementById("add-article-modal").classList.remove("active");
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
    document.getElementById("load-reported-btn")?.addEventListener("click", async () => {
        if (!token || currentUser?.role !== 'ADMIN') {
            showMessage("Unauthorized access");
            return;
        }
        await loadReportedContent();
    });
});

document.getElementById("load-users-btn")?.addEventListener("click", async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
        showMessage("Unauthorized access");
        return;
    }
    await loadAdminUsers();
});

document.getElementById("load-courses-btn")?.addEventListener("click", async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
        showMessage("Unauthorized access");
        return;
    }
    await loadAllCourses();
});

document.getElementById("load-articles-btn")?.addEventListener("click", async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
        showMessage("Unauthorized access");
        return;
    }
    await loadAllArticles();
});

document.getElementById("load-pdfs-btn")?.addEventListener("click", async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
        showMessage("Unauthorized access");
        return;
    }
    await loadAllPdfs();
});

document.getElementById("load-projects-btn")?.addEventListener("click", async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
        showMessage("Unauthorized access");
        return;
    }
    await loadAllProjects();
});

document.getElementById("load-reported-btn")?.addEventListener("click", async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
        showMessage("Unauthorized access");
        return;
    }
    await loadReportedContent();
});


// ---- Admin Users ----
async function loadAdminUsers() {
    try {
        const res = await fetch(`${API}/admin/dashboard`, { headers: authHeaders() });
        const data = await handleApiResponse(res, 'Failed to load users');
        const users = data.users || [];
        renderAdminUsers(users);
    } catch (error) {
        showMessage('Failed to load users. Please try again.');
    }
}

function renderAdminUsers(users) {
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
            <div class="action-buttons">
                <button class="btn btn-danger delete-user-btn" data-id="${u.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        list.appendChild(userCard);
    });

    // Delete user event
    list.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.getAttribute('data-id');
            if (confirm("Are you sure you want to delete this user?")) {
                try {
                    await fetch(`${API}/admin/users/${id}`, {
                        method: "DELETE",
                        headers: authHeaders()
                    });
                    showMessage("User deleted.", false);
                    btn.closest('.item-card').remove();
                } catch {
                    showMessage("Failed to delete user.");
                }
            }
        };
    });
}

// ---- Admin Courses ----


// ---- Admin Articles ----
async function loadAllArticles() {
    try {
        const response = await fetch(`${API}/articles`, {
            method: "GET",
            headers: authHeaders("application/json")
        });
        if (!response.ok) throw new Error("Failed to fetch articles");
        const articles = await response.json();
        const list = document.getElementById("all-articles-list");
        if (!list) return;
        list.innerHTML = "";
        if (!Array.isArray(articles) || !articles.length) {
            list.innerHTML = "<div style='color:#888;padding:14px;'>No articles found.</div>";
            return;
        }
        articles.forEach(article => {
            const card = document.createElement('div');
            card.className = 'item-card article-card';
            card.innerHTML = `
                <h3><i class="fas fa-newspaper"></i> ${article.title}</h3>
                <p>${article.summary || ''}</p>
                <div class="meta">
                    <span>By: ${article.author || 'N/A'}</span>
                </div>
                <button class="admin-delete-btn"><i class="fas fa-trash"></i> Delete</button>
            `;
            card.querySelector('.admin-delete-btn').onclick = function () {
                deleteArticle(article.id, this);
            };
            list.appendChild(card);
        });
    } catch (error) {
        showMessage(error.message || 'Failed to load articles.');
    }
}


// ---- Admin PDFs ----
async function loadAllPdfs() {
    try {
        const response = await fetch(`${API}/pdf`, {
            method: "GET",
            headers: authHeaders("application/json")
        });
        if (!response.ok) throw new Error("Failed to fetch PDFs");
        const pdfs = await response.json();
        const list = document.getElementById("all-pdfs-list");
        if (!list) return;
        list.innerHTML = "";
        if (!Array.isArray(pdfs) || !pdfs.length) {
            list.innerHTML = "<div style='color:#888;padding:14px;'>No PDFs found.</div>";
            return;
        }
        pdfs.forEach(pdf => {
            const courseLabel = pdf.course && pdf.course.title
                ? `${pdf.course.title} (${pdf.course.id})`
                : (pdf.course?.id ? `ID: ${pdf.course.id}` : "N/A");
            const byLabel = pdf.user && pdf.user.username ? pdf.user.username : "N/A";
            const pdfUrl = `${API}/pdf/file/${pdf.id}`;
            const pdfCard = document.createElement('div');
            pdfCard.className = 'item-card pdf-card';
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
                <button class="admin-delete-btn"><i class="fas fa-trash"></i> Delete</button>
            `;
            pdfCard.querySelector('.admin-delete-btn').onclick = function () {
                deletePdf(pdf.id, this);
            };
            pdfCard.onclick = function (e) {
                if (!e.target.classList.contains('admin-delete-btn') && !e.target.closest('.admin-delete-btn')) {
                    window.open(pdfUrl, '_blank');
                }
            };
            list.appendChild(pdfCard);
        });
    } catch (error) {
        showMessage(error.message || 'Failed to load PDFs.');
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

async function loadAllCourses() {
    try {
        const response = await fetch(`${API}/courses`, {
            method: "GET",
            headers: authHeaders()
        });
        if (!response.ok) throw new Error("Failed to load courses");
        const courses = await response.json();
        const list = document.getElementById("all-courses-list");
        if (!list) return;
        list.innerHTML = "";
        if (!Array.isArray(courses) || !courses.length) {
            list.innerHTML = "<div style='color:#888;padding:14px;'>No courses found.</div>";
            return;
        }
        courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'item-card course-card';
            card.innerHTML = `
                <h3><i class="fas fa-book"></i> ${course.title}</h3>
                <p>${course.description || 'No description'}</p>
                <div class="meta">
                    <span>ID: ${course.id}</span>
                    <span>Category: ${course.category || 'N/A'}</span>
                </div>
                <button class="admin-delete-btn"><i class="fas fa-trash"></i> Delete</button>
            `;
            card.querySelector('.admin-delete-btn').onclick = function () {
                deleteCourse(course.id, this);
            };
            list.appendChild(card);
        });
    } catch (error) {
        showMessage(error.message || 'Failed to load courses.');
    }
}

// Add this function to fetch and render all projects for the admin:
async function loadAllProjects() {
    try {
        const response = await fetch(`${API}/projects`, {
            headers: authHeaders("application/json")
        });
        const projects = await handleApiResponse(response, 'Failed to load projects');
        const list = document.getElementById("all-projects-list");
        if (!list) return;
        list.innerHTML = "";
        if (!projects.length) {
            list.innerHTML = "<div style='color:#888;padding:14px;'>No projects found.</div>";
            return;
        }
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'item-card project-card';
            card.innerHTML = `
                <h3><i class="fas fa-lightbulb"></i> ${project.title}</h3>
                <p>${project.summary || 'No summary'}</p>
                <div class="meta">
                    <span>Tech: ${project.technologies.join(', ')}</span>
                </div>
                <button class="admin-delete-btn"><i class="fas fa-trash"></i> Delete</button>
            `;
            card.querySelector('.admin-delete-btn').onclick = function () {
                deleteProject(project.id, this);
            };
            list.appendChild(card);
        });
    } catch (error) {
        showMessage(error.message || 'Failed to load projects.');
    }
}


async function deleteCourse(id, btn) {
    if (!window.token || window.userRole !== 'ADMIN') return;
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
        await fetch(`${API}/courses/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        showMessage("Course deleted.", false);
        btn.closest('.item-card').remove();
    } catch {
        showMessage("Failed to delete course.");
    }
}

// Delete Article (ADMIN)
async function deleteArticle(id, btn) {
    if (!window.token || window.userRole !== 'ADMIN') return;
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
        await fetch(`${API}/articles/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        showMessage("Article deleted.", false);
        btn.closest('.item-card').remove();
    } catch {
        showMessage("Failed to delete article.");
    }
}

// Delete PDF (ADMIN)
async function deletePdf(id, btn) {
    if (!window.token || window.userRole !== 'ADMIN') return;
    if (!confirm('Are you sure you want to delete this PDF?')) return;
    try {
        await fetch(`${API}/pdf/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        showMessage("PDF deleted.", false);
        btn.closest('.item-card').remove();
    } catch {
        showMessage("Failed to delete PDF.");
    }
}

// Delete Project (ADMIN)
async function deleteProject(id, btn) {
    if (!window.token || window.userRole !== 'ADMIN') return;
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
        await fetch(`${API}/projects/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        showMessage("Project deleted.", false);
        btn.closest('.item-card').remove();
    } catch {
        showMessage("Failed to delete project.");
    }
}