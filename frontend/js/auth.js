
(function() {
    const TOKEN_KEY = 'auth_token';
    const USER_KEY = 'auth_user';
    const API_BASE = 'http://localhost:7071/api';
    const FV = window.FormValidation;

    function canonicalizeRole(value) {
        return String(value || '')
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/^ROLE_/, '')
            .replace(/[^A-Z0-9]/g, '');
    }

    function decodeBase64Url(value) {
        try {
            const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
            return atob(padded);
        } catch (_) {
            return '';
        }
    }

    function getRoleFromToken(token) {
        try {
            const payloadPart = String(token || '').split('.')[1];
            if (!payloadPart) return '';

            const payload = JSON.parse(decodeBase64Url(payloadPart));
            const rawRoles = Array.isArray(payload?.role)
                ? payload.role
                : Array.isArray(payload?.roles)
                    ? payload.roles
                    : payload?.role
                        ? [payload.role]
                        : payload?.roles
                            ? [payload.roles]
                            : [];

            return rawRoles[0] || '';
        } catch (_) {
            return '';
        }
    }

    function normalizeRole(user) {
        const rawRole = canonicalizeRole(
            user?.role ||
            (user?.roles && user.roles[0]) ||
            getRoleFromToken(localStorage.getItem(TOKEN_KEY)) ||
            'Staff'
        );

        if (rawRole === 'ADMIN' || rawRole === 'QUANTRI' || rawRole === 'QUAN_TRI') return 'Admin';
        if (rawRole === 'MANAGER' || rawRole === 'QUANLY' || rawRole === 'QUAN_LY') return 'Manager';
        if (rawRole === 'STAFF' || rawRole === 'EMPLOYEE' || rawRole === 'NHANVIEN' || rawRole === 'NHAN_VIEN') return 'Staff';

        return rawRole.charAt(0) + rawRole.slice(1).toLowerCase();
    }

    function getDefaultPageByRole(role) {
        return role === 'Staff' ? './orders.html' : './dashboard.html';
    }

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

        getRole() {
            return normalizeRole(this.getUser());
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
            return this.checkPermission();
        },

        checkPermission() {
            const user = this.getUser();
            const role = normalizeRole(user);
            
            const path = window.location.pathname.split('/').pop() || '';
            
            // Map permissions for specific pages
            const permissions = {
                'dashboard.html': ['Admin', 'Manager'],
                'orders.html': ['Admin', 'Manager', 'Staff'],
                'tables.html': ['Admin', 'Manager', 'Staff'],
                'customers.html': ['Admin', 'Manager', 'Staff'],
                'menu.html': ['Admin', 'Manager', 'Staff'],
                'categories.html': ['Admin', 'Manager'],
                'analytics.html': ['Admin', 'Manager'],
                'table-management.html': ['Admin', 'Manager'],
                'accounts.html': ['Admin'],
                'settings.html': ['Admin', 'Staff']
            };

            // Admin always has access to all pages, no need to strictly check if mapping is missed
            if (role === 'Admin') {
                this.applyRoleUI(role);
                return true;
            }

            const allowedRoles = permissions[path];
            if (allowedRoles && !allowedRoles.includes(role)) {
                alert('Bạn không có quyền truy cập trang này!');
                window.location.href = getDefaultPageByRole(role);
                return false;
            }

            this.applyRoleUI(role);
            return true;
        },

        applyRoleUI(role) {
            document.addEventListener('DOMContentLoaded', () => {
                // Setup which links are restricted
                const restrictedLinks = {
                    'dashboard.html': ['Admin', 'Manager'],
                    'accounts.html': ['Admin'],
                    'analytics.html': ['Admin', 'Manager'],
                    'menu.html': ['Admin', 'Manager', 'Staff'],
                    'categories.html': ['Admin', 'Manager'],
                    'settings.html': ['Admin', 'Staff'],
                    'table-management.html': ['Admin', 'Manager']
                };

                document.querySelectorAll('a.nav-link').forEach(link => {
                    const href = link.getAttribute('href');
                    if (!href) return;
                    
                    Object.keys(restrictedLinks).forEach(path => {
                        // Admin overrides all restrictions
                        if (role === 'Admin') return;

                        if (href.includes(path) && !restrictedLinks[path].includes(role)) {
                            link.style.display = 'none';
                        }
                    });
                });

                // Hide specific elements on regular pages if Staff
                if (role === 'Staff') {
                    document.querySelectorAll('.role-restricted').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });
                }
            });
        }
    };


    const protectedPages = [
        'dashboard.html', 'accounts.html', 'analytics.html',
        'categories.html', 'customers.html', 'menu.html',
        'orders.html', 'settings.html', 'table-management.html', 'tables.html'
    ];
    const currentPage = window.location.pathname.split('/').pop();
    if (protectedPages.includes(currentPage)) {
        Auth.requireAuth();
    }


    document.addEventListener('DOMContentLoaded', function() {
        var form = document.getElementById('loginForm');
        var registerForm = document.getElementById('registerForm');
        
        // Setup password visibility toggle
        var togglePasswords = document.querySelectorAll('.toggle-password');
        togglePasswords.forEach(function(togglePassword) {
            togglePassword.addEventListener('click', function() {
                var passwordField = this.previousElementSibling;
                if(passwordField) {
                    var type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordField.setAttribute('type', type);
                    this.textContent = type === 'password' ? 'visibility_off' : 'visibility';
                }
            });
        });

        if (form) {
            FV?.enableInstantClear(form);
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                var usernameField = document.getElementById('loginUsername');
                var passwordField = document.getElementById('loginPassword');
                var u = usernameField.value.trim();
                var p = passwordField.value.trim();
                var err = document.getElementById('loginError');
                var btn = form.querySelector('button[type=submit]');
    
                FV?.clearFormErrors(form);
    
                if (!u) {
                    FV?.setFieldError(usernameField, 'Vui lòng nhập tên đăng nhập.');
                } else {
                    FV?.markFieldValid(usernameField);
                }
    
                if (!p) {
                    FV?.setFieldError(passwordField, 'Vui lòng nhập mật khẩu.');
                } else if (p.length < 6) {
                    FV?.setFieldError(passwordField, 'Mật khẩu phải có ít nhất 6 ký tự.');
                } else {
                    FV?.markFieldValid(passwordField);
                }
    
                if (!u || !p || p.length < 6) {
                    if (err) { err.textContent = 'Vui lòng kiểm tra lại thông tin đăng nhập.'; err.classList.remove('d-none'); }
                    return;
                }
    
                if (btn) { btn.disabled = true; btn.textContent = 'Đang đăng nhập...'; }
                if (err) err.classList.add('d-none');
    
                try {
                    const data = await Auth.login(u, p);
                    const role = normalizeRole(data?.user || Auth.getUser());
                    window.location.href = getDefaultPageByRole(role);
                } catch (ex) {
                    if (err) { err.textContent = ex.message; err.classList.remove('d-none'); }
                } finally {
                    if (btn) { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
                }
            });
        }

        if (registerForm) {
            FV?.enableInstantClear(registerForm);
            registerForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var usernameField = document.getElementById('registerUsername');
                var passwordField = document.getElementById('registerPassword');
                var confirmPasswordField = document.getElementById('registerConfirmPassword');
                var u = usernameField.value.trim();
                var p = passwordField.value.trim();
                var cp = confirmPasswordField.value.trim();
                var err = document.getElementById('registerError');
                var btn = registerForm.querySelector('button[type=submit]');
    
                FV?.clearFormErrors(registerForm);
    
                if (!u) {
                    FV?.setFieldError(usernameField, 'Vui lòng nhập tên đăng nhập.');
                } else {
                    FV?.markFieldValid(usernameField);
                }
    
                if (!p) {
                    FV?.setFieldError(passwordField, 'Vui lòng nhập mật khẩu.');
                } else if (p.length < 6) {
                    FV?.setFieldError(passwordField, 'Mật khẩu phải có ít nhất 6 ký tự.');
                } else {
                    FV?.markFieldValid(passwordField);
                }

                if (!cp) {
                    FV?.setFieldError(confirmPasswordField, 'Vui lòng xác nhận lại mật khẩu.');
                } else if (cp !== p) {
                    FV?.setFieldError(confirmPasswordField, 'Mật khẩu xác nhận không khớp.');
                } else {
                    FV?.markFieldValid(confirmPasswordField);
                }
    
                if (!u || !p || p.length < 6 || !cp || cp !== p) {
                    if (err) { err.textContent = 'Vui lòng kiểm tra lại thông tin đăng ký.'; err.classList.remove('d-none'); }
                    return;
                }
    
                if (btn) { btn.disabled = true; btn.textContent = 'Đang đăng ký...'; }
                if (err) err.classList.add('d-none');
    
                try {
                    // TODO: Implement actual register API call
                    // await Auth.register(u, p);
                    
                    // Giả lập thành công cho tĩnh (nếu chưa có API)
                    if (err) { 
                        err.classList.remove('alert-danger');
                        err.classList.add('alert-success');
                        err.textContent = 'Đăng ký thành công! Đang chuyển qua đăng nhập...'; 
                        err.classList.remove('d-none'); 
                    }
                    setTimeout(() => {
                        var loginModalEl = document.getElementById('loginModal');
                        var registerModalEl = document.getElementById('registerModal');
                        if (loginModalEl && registerModalEl) {
                            var registerModal = bootstrap.Modal.getInstance(registerModalEl);
                            registerModal.hide();
                            var loginModal = new bootstrap.Modal(loginModalEl);
                            loginModal.show();
                        }
                    }, 1500);

                } catch (ex) {
                    if (err) { err.textContent = ex.message; err.classList.remove('d-none'); }
                } finally {
                    if (btn) { btn.disabled = false; btn.textContent = 'Đăng ký'; }
                }
            });
        }
    });
})();
