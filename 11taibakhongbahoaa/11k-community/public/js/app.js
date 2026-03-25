// Global State
let currentUser = JSON.parse(localStorage.getItem('user')) || null;

// (Removed Profile Cache override to allow dynamic avatar/name updates)

// VIP UI Update
function updateGlobalUI() {
    // Hidden login anchor in footer / secret place
    const authSect = document.getElementById('auth-section');
    if (authSect && currentUser && currentUser.role === 'Admin') {
        authSect.innerHTML = `
            <div class="flex items-center space-x-3 bg-orange-50 px-3 py-1.5 rounded-full border border-primary/20 cursor-pointer hover:bg-orange-100 transition-colors" onclick="logout()">
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="hidden sm:block">
                    <p class="text-[11px] font-black text-primary uppercase tracking-wider">Ban Quản Trị</p>
                    <p class="text-[10px] text-gray-500 font-bold -mt-0.5">Click để đăng xuất</p>
                </div>
            </div>
        `;
    }

    // Toggle admin-only panels
    document.querySelectorAll('.admin-only').forEach(el => {
        if (currentUser && currentUser.role === 'Admin') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

function logout() {
    if(confirm('Đăng xuất khỏi tài khoản Quản Trị?')) {
        localStorage.removeItem('user');
        currentUser = null;
        window.location.reload();
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '<i class="fas fa-check-circle text-primary"></i>' : '<i class="fas fa-exclamation-circle text-red-500"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        if(toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

// Skeletons
function getSkeletonHTML() {
    return `
        <div class="glass-card rounded-2xl p-5 mb-6">
            <div class="flex items-center gap-3 mb-4">
                <div class="skeleton w-12 h-12 rounded-full"></div>
                <div class="flex-1 space-y-2">
                    <div class="skeleton h-4 w-1/3"></div>
                    <div class="skeleton h-3 w-1/4"></div>
                </div>
            </div>
            <div class="space-y-2 mb-4">
                <div class="skeleton h-4 w-full"></div>
                <div class="skeleton h-4 w-5/6"></div>
                <div class="skeleton h-4 w-4/6"></div>
            </div>
            <div class="skeleton h-48 w-full rounded-xl"></div>
        </div>
    `;
}

// API Tools
async function apiGet(endpoint) {
    const res = await fetch(`/api/${endpoint}`);
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Format Time
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `Vừa xong`;
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
}

// Insert Bottom Nav on mobile
function insertBottomNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navHTML = `
        <div class="bottom-nav">
            <a href="index.html" class="${currentPage === 'index.html' ? 'active' : ''}"><i class="fas fa-home"></i> Feed</a>
            <a href="documents.html" class="${currentPage === 'documents.html' ? 'active' : ''}"><i class="fas fa-book"></i> Tài liệu</a>
            <a href="honors.html" class="${currentPage === 'honors.html' ? 'active' : ''}"><i class="fas fa-crown"></i> Bảng vàng</a>
            <a href="members.html" class="${currentPage.includes('mem') ? 'active' : ''}"><i class="fas fa-users"></i> Lớp</a>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', navHTML);
}

document.addEventListener('DOMContentLoaded', () => {
    updateGlobalUI();
    insertBottomNav();
});
