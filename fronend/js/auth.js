
(function() {
    const TOKEN_KEY = 'auth_token';
    const USER_KEY = 'auth_user';
    const API_BASE = 'http://localhost:7071/api';

    window.Auth = {
        getToken() {
            return localStorage.getItem(TOKEN_KEY);
        },

        getUser() {
            try {
                return JSON.parse(localStorage.getItem(USER_KEY));
            } catch (_) {
                return null;
            }
        },

        isLoggedIn() {
            return !!this.getToken();
        },

        async logout() {
            try {
                await fetch(`${API_BASE}/Auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (_) {}
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = './index.html';
        },

        async login(username, password) {
            const resp = await fetch(`${API_BASE}/Auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!resp.ok) {
                const body = await resp.json().catch(() => ({}));
                throw new Error(body.message || 'Sai tên đăng nhập hoặc mật khẩu!');
            }
            const data = await resp.json();
            localStorage.setItem(TOKEN_KEY, data.token);
            if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            return data;
        },

        requireAuth() {
            if (!this.isLoggedIn()) {
                window.location.href = './index.html';
                return false;
            }
            return true;
        }
    };


    if (window.location.pathname.includes('dashboard.html') ||
        window.location.pathname.includes('accounts.html') ||
        window.location.pathname.includes('analytics.html') ||
        window.location.pathname.includes('categories.html') ||
        window.location.pathname.includes('customers.html') ||
        window.location.pathname.includes('menu.html') ||
        window.location.pathname.includes('orders.html') ||
        window.location.pathname.includes('settings.html') ||
        window.location.pathname.includes('table-management.html') ||
        window.location.pathname.includes('tables.html')) {
        Auth.requireAuth();
    }


    document.addEventListener('DOMContentLoaded', function() {
        var form = document.getElementById('loginForm');
        if (!form) return;
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            var u = document.getElementById('loginUsername').value.trim();
            var p = document.getElementById('loginPassword').value.trim();
            var err = document.getElementById('loginError');
            var btn = form.querySelector('button[type=submit]');

            if (!u || !p) {
                if (err) { err.textContent = 'Vui lòng nhập đầy đủ thông tin!'; err.classList.remove('d-none'); }
                return;
            }

            if (btn) { btn.disabled = true; btn.textContent = 'Đang đăng nhập...'; }
            if (err) err.classList.add('d-none');

            try {
                await Auth.login(u, p);
                window.location.href = './dashboard.html';
            } catch (ex) {
                if (err) { err.textContent = ex.message; err.classList.remove('d-none'); }
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
            }
        });
    });
})();
