/**
 * API Configuration
 * When deploying, change API_BASE_URL to your Render backend URL.
 * Example: https://your-app.onrender.com/api
 */
(function () {
    // Try to get from localStorage (user can set it), otherwise default to localhost
    window.API_BASE_URL = localStorage.getItem('api_base_url') || 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:7071/api'
            : 'https://deagun.dpdns.org/api');

    window.HUB_URL = window.API_BASE_URL.replace('/api', '/hubs/realtime');
})();
