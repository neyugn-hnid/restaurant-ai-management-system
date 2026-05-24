(function() {
    function ensureValidationStyles() {
        if (document.getElementById('global-form-validation-styles')) return;

        const style = document.createElement('style');
        style.id = 'global-form-validation-styles';
        style.textContent = `
            .is-invalid {
                border-color: #dc3545 !important;
                box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.12) !important;
            }

            .is-invalid:focus {
                border-color: #dc3545 !important;
                box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.18) !important;
            }

            .invalid-feedback[data-validation-feedback] {
                display: none;
                color: #dc3545 !important;
                font-size: 0.875rem;
                margin-top: 0.35rem;
            }
        `;
        document.head.appendChild(style);
    }

    function disableNativeValidation() {
        document.querySelectorAll('form').forEach(form => {
            form.setAttribute('novalidate', 'novalidate');
            form.noValidate = true;
        });

        document.querySelectorAll('[required]').forEach(field => {
            field.removeAttribute('required');
        });
    }

    function clearModalValidationState(modalElement) {
        if (!modalElement) return;
        modalElement.querySelectorAll('form').forEach(form => clearFormErrors(form));
        modalElement.querySelectorAll('input, select, textarea').forEach(field => clearFieldError(field));
    }

    ensureValidationStyles();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', disableNativeValidation, { once: true });
    } else {
        disableNativeValidation();
    }

    document.addEventListener('hidden.bs.modal', (event) => {
        clearModalValidationState(event.target);
    });

    document.addEventListener('show.bs.modal', (event) => {
        clearModalValidationState(event.target);
    });

    function normalizeWhitespace(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function validateVietnamesePhone(value) {
        return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(String(value || '').replace(/\s+/g, ''));
    }

    function validateEmail(value) {
        if (!value) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
    }

    function validateUsername(value) {
        return /^[a-zA-Z0-9._-]{4,30}$/.test(String(value || '').trim());
    }

    function ensureFeedbackElement(field) {
        if (!field || !field.parentElement) return null;
        let feedback = field.parentElement.querySelector('[data-validation-feedback]');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback d-block text-danger small mt-1';
            feedback.setAttribute('data-validation-feedback', 'true');
            field.insertAdjacentElement('afterend', feedback);
        }
        return feedback;
    }

    function setFieldError(field, message) {
        if (!field) return false;
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
        field.setAttribute('aria-invalid', 'true');
        const feedback = ensureFeedbackElement(field);
        if (feedback) {
            feedback.textContent = message;
            feedback.style.display = 'block';
            feedback.style.color = '#dc3545';
        }
        return false;
    }

    function clearFieldError(field) {
        if (!field) return true;
        field.classList.remove('is-invalid');
        field.classList.remove('is-valid');
        field.removeAttribute('aria-invalid');
        const feedback = ensureFeedbackElement(field);
        if (feedback) {
            feedback.textContent = '';
            feedback.style.display = 'none';
        }
        return true;
    }

    function markFieldValid(field) {
        clearFieldError(field);
        return true;
    }

    function clearFormErrors(form) {
        if (!form) return;
        form.querySelectorAll('.is-invalid, .is-valid').forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
        });
        form.querySelectorAll('[data-validation-feedback]').forEach(feedback => {
            feedback.textContent = '';
            feedback.style.display = 'none';
        });
    }

    function bindFieldValidation(field, validator) {
        if (!field || typeof validator !== 'function') return;
        const handler = () => validator();
        field.addEventListener('input', handler);
        field.addEventListener('change', handler);
        field.addEventListener('blur', handler);
    }

    function enableInstantClear(form) {
        if (!form || form.dataset.validationInstantClearBound === 'true') return;

        const clearHandler = (event) => {
            const field = event.target;
            if (!(field instanceof HTMLElement)) return;
            if (!field.matches('input, select, textarea')) return;
            clearFieldError(field);
        };

        form.addEventListener('input', clearHandler);
        form.addEventListener('change', clearHandler);
        form.dataset.validationInstantClearBound = 'true';
    }

    window.FormValidation = {
        normalizeWhitespace,
        validateVietnamesePhone,
        validateEmail,
        validateUsername,
        setFieldError,
        clearFieldError,
        markFieldValid,
        clearFormErrors,
        bindFieldValidation,
        enableInstantClear,
        clearModalValidationState
    };
})();
