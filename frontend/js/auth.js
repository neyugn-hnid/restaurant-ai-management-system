(function() {
    const _setItem = localStorage.setItem.bind(localStorage);
    const ALLOWED = ['auth_token', 'auth_user', 'bistro_customer_cart'];
    localStorage.setItem = function(key, value) {
        if (ALLOWED.includes(key)) {
            return _setItem(key, value);
        }
    };
})();
(function() {
    const loader = document.createElement('div');
    loader.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#f2f0eb;display:flex;align-items:center;justify-content:center;transition:opacity 0.4s ease,visibility 0.4s ease;';
    const spinner = document.createElement('div');
    spinner.style.cssText = 'width:44px;height:44px;border:4px solid #edebe9;border-top-color:#00754A;border-radius:50%;animation:spin 0.7s linear infinite;';
    loader.appendChild(spinner);
    const style = document.createElement('style');
    style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    (document.head || document.documentElement).appendChild(style);
    document.documentElement.style.overflow = 'hidden';
    const appendLoader = () => { if (document.body) { document.body.prepend(loader); console.log('Page loader attached'); } };
    if (document.body) appendLoader();
    else document.addEventListener('DOMContentLoaded', appendLoader);
    function hideLoader() {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        document.documentElement.style.overflow = '';
        setTimeout(() => loader.remove(), 500);
    }
    window.addEventListener('load', () => setTimeout(hideLoader, 200));
    setTimeout(hideLoader, 4000);
})();
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
        if (rawRole === 'CUSTOMER' || rawRole === 'KHACH' || rawRole === 'KHACHHANG' || rawRole === 'KHACH_HANG') return 'Customer';
        return rawRole.charAt(0) + rawRole.slice(1).toLowerCase();
    }
    function getDefaultPageByRole(role) {
        if (role === 'Customer') return './index.html';
        return role === 'Staff' ? './orders.html' : './dashboard.html';
    }
    function isCustomerPage() {
        var path = window.location.pathname.split('/').pop() || '';
        return ['index.html', 'customer-menu.html', 'restaurant-map.html', ''].includes(path);
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
        async register(fullName, email, username, password, confirmPassword) {
            const resp = await fetch(`${API_BASE}/Auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, username: username || email, password, confirmPassword, role: 'Customer' })
            });
            if (!resp.ok) {
                const body = await resp.json().catch(() => ({}));
                throw new Error(body.message || body.title || 'Đăng ký thất bại!');
            }
            return await resp.json();
        },
        requireAuth() {
            if (!this.isLoggedIn()) {
                window.location.href = './index.html';
                return false;
            }
            var role = this.getRole();
            if (role === 'Customer') {
                window.location.href = './index.html';
                return false;
            }
            return this.checkPermission();
        },
        checkPermission() {
            const user = this.getUser();
            const role = normalizeRole(user);
            const path = window.location.pathname.split('/').pop() || '';
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
                        if (role === 'Admin') return;
                        if (href.includes(path) && !restrictedLinks[path].includes(role)) {
                            link.style.display = 'none';
                        }
                    });
                });
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
        document.addEventListener('click', function(e) {
            var target = e.target.closest('.toggle-password');
            if(target) {
                var wrapper = target.closest('.login-input-wrapper');
                if(wrapper) {
                    var passwordField = wrapper.querySelector('input');
                    if(passwordField) {
                        var type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                        passwordField.setAttribute('type', type);
                        target.textContent = type === 'password' ? 'visibility_off' : 'visibility';
                    }
                }
            }
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
                var fullNameField = document.getElementById('registerFullName');
                var emailField = document.getElementById('registerEmail');
                var usernameField = document.getElementById('registerUsername');
                var passwordField = document.getElementById('registerPassword');
                var confirmPasswordField = document.getElementById('registerConfirmPassword');
                var fn = (fullNameField?.value || '').trim();
                var em = (emailField?.value || '').trim();
                var u = (usernameField?.value || '').trim();
                var p = passwordField.value.trim();
                var cp = confirmPasswordField.value.trim();
                var err = document.getElementById('registerError');
                var btn = registerForm.querySelector('button[type=submit]');
                FV?.clearFormErrors(registerForm);
                var hasError = false;
                if (!fn) {
                    if (fullNameField) FV?.setFieldError(fullNameField, 'Vui lòng nhập họ tên.');
                    hasError = true;
                }
                if (!em) {
                    if (emailField) FV?.setFieldError(emailField, 'Vui lòng nhập email.');
                    hasError = true;
                } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(em)) {
                    if (emailField) FV?.setFieldError(emailField, 'Email phải là Gmail hợp lệ.');
                    hasError = true;
                }
                if (!p) {
                    FV?.setFieldError(passwordField, 'Vui lòng nhập mật khẩu.');
                    hasError = true;
                } else if (p.length < 9) {
                    FV?.setFieldError(passwordField, 'Mật khẩu phải có ít nhất 9 ký tự.');
                    hasError = true;
                }
                if (!cp) {
                    FV?.setFieldError(confirmPasswordField, 'Vui lòng xác nhận mật khẩu.');
                    hasError = true;
                } else if (cp !== p) {
                    FV?.setFieldError(confirmPasswordField, 'Mật khẩu xác nhận không khớp.');
                    hasError = true;
                }
                if (hasError) {
                    if (err) { err.textContent = 'Vui lòng kiểm tra lại thông tin đăng ký.'; err.classList.remove('d-none'); }
                    return;
                }
                if (btn) { btn.disabled = true; btn.textContent = 'Đang đăng ký...'; }
                if (err) err.classList.add('d-none');
                try {
                    await Auth.register(fn, em, u || em, p, cp);
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
        function updateNavUserUI() {
            var loginBtn = document.getElementById('navLoginBtn');
            var userDropdown = document.getElementById('navUserDropdown');
            var userNameEl = document.getElementById('navDropdownUser');
            var dropdownMenu = document.getElementById('navDropdownMenu');
            if (!userDropdown) return;
            var adminLink = document.getElementById('navAdminPageBtn');
            if (!adminLink && dropdownMenu) {
                adminLink = document.createElement('a');
                adminLink.id = 'navAdminPageBtn';
                adminLink.className = 'nav-dropdown-item';
                adminLink.href = './dashboard.html';
                adminLink.textContent = 'Trang quản trị';
                adminLink.style.color = 'var(--color-house-green, #00754A)';
                var logoutBtn = document.getElementById('navLogoutBtn');
                if (logoutBtn) {
                    dropdownMenu.insertBefore(adminLink, logoutBtn);
                } else {
                    dropdownMenu.appendChild(adminLink);
                }
            }
            if (Auth.isLoggedIn()) {
                var user = Auth.getUser();
                var name = user?.fullName || user?.username || user?.email || 'Người dùng';
                var role = Auth.getRole();
                if (loginBtn) loginBtn.style.display = 'none';
                userDropdown.style.display = 'block';
                if (userNameEl) userNameEl.textContent = name;
                if (adminLink) {
                    adminLink.href = getDefaultPageByRole(role);
                    adminLink.style.display = role === 'Customer' ? 'none' : 'block';
                }
            } else {
                if (loginBtn) loginBtn.style.display = '';
                userDropdown.style.display = 'none';
                if (adminLink) adminLink.style.display = 'none';
            }
        }
        var avatarBtn = document.getElementById('navAvatarBtn');
        if (avatarBtn) {
            avatarBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var dd = document.getElementById('navUserDropdown');
                if (dd) dd.classList.toggle('open');
            });
        }
        var logoutBtn = document.getElementById('navLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                Auth.logout();
            });
        }
        document.addEventListener('click', function(e) {
            var dd = document.getElementById('navUserDropdown');
            if (dd && !dd.contains(e.target)) {
                dd.classList.remove('open');
            }
        });
        updateNavUserUI();
        window.addEventListener('storage', function(e) {
            if (e.key === 'auth_token') updateNavUserUI();
        });
    });
})();
