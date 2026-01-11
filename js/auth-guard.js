/**
 * AUTH GUARD - Dashboard Protection Script
 * Include this script in any dashboard that requires authentication
 *
 * Usage: <script src="/js/auth-guard.js"></script>
 */

(function() {
    'use strict';

    const AUTH_CONFIG = {
        loginUrl: '/login',
        tokenKey: 'eu_token',      // Must match login page
        userKey: 'eu_user',        // Must match login page
        verifyEndpoint: '/api/v1/auth/me',
        skipVerification: false    // Set to true for faster load (less secure)
    };

    /**
     * Check if user is authenticated
     */
    async function checkAuth() {
        const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
        const user = localStorage.getItem(AUTH_CONFIG.userKey);

        // No token = not authenticated
        if (!token) {
            redirectToLogin('No authentication token found');
            return false;
        }

        // Basic JWT format check (header.payload.signature)
        const parts = token.split('.');
        if (parts.length !== 3) {
            clearAuthAndRedirect('Invalid token format');
            return false;
        }

        // Check token expiration from payload
        try {
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);

            if (payload.exp && payload.exp < now) {
                clearAuthAndRedirect('Session expired');
                return false;
            }
        } catch (e) {
            clearAuthAndRedirect('Invalid token');
            return false;
        }

        // Optional: Verify token with server
        if (!AUTH_CONFIG.skipVerification) {
            try {
                const response = await fetch(AUTH_CONFIG.verifyEndpoint, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    clearAuthAndRedirect('Session invalid');
                    return false;
                }
            } catch (e) {
                // Network error - allow access if token looks valid
                console.warn('[Auth Guard] Could not verify token with server:', e.message);
            }
        }

        // User is authenticated
        console.log('[Auth Guard] User authenticated');
        return true;
    }

    /**
     * Redirect to login page
     */
    function redirectToLogin(reason) {
        console.warn('[Auth Guard]', reason, '- Redirecting to login');

        // Store the intended destination for post-login redirect
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== AUTH_CONFIG.loginUrl) {
            sessionStorage.setItem('auth_redirect', currentPath);
        }

        window.location.href = AUTH_CONFIG.loginUrl;
    }

    /**
     * Clear auth data and redirect
     */
    function clearAuthAndRedirect(reason) {
        localStorage.removeItem(AUTH_CONFIG.tokenKey);
        localStorage.removeItem(AUTH_CONFIG.userKey);
        redirectToLogin(reason);
    }

    /**
     * Get current user info
     */
    window.getAuthUser = function() {
        try {
            const userStr = localStorage.getItem(AUTH_CONFIG.userKey);
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    };

    /**
     * Get auth token
     */
    window.getAuthToken = function() {
        return localStorage.getItem(AUTH_CONFIG.tokenKey);
    };

    /**
     * Logout function
     */
    window.logout = async function() {
        const token = localStorage.getItem(AUTH_CONFIG.tokenKey);

        // Call logout API
        if (token) {
            try {
                await fetch('/api/v1/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (e) {
                console.warn('[Auth Guard] Logout API error:', e.message);
            }
        }

        // Clear local storage
        localStorage.removeItem(AUTH_CONFIG.tokenKey);
        localStorage.removeItem(AUTH_CONFIG.userKey);

        // Redirect to login
        window.location.href = AUTH_CONFIG.loginUrl;
    };

    // Run auth check immediately
    checkAuth();
})();
