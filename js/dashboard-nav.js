/**
 * DASHBOARD NAVIGATION - Shared Menu & Logout Component
 * Include this script in any dashboard for unified navigation
 *
 * Usage: <script src="/js/dashboard-nav.js"></script>
 *
 * Note: All menu items are hardcoded - no user input is used in HTML generation
 */

(function() {
    'use strict';

    const DASHBOARDS = [
        { name: 'HAIKU God Mode', icon: '神', url: '/haiku', category: 'command' },
        { name: 'Genius Agency', icon: '🧠', url: '/genius', category: 'command' },
        { name: 'GOD MODE', icon: '⚡', url: '/god-mode', category: 'command' },
        { name: 'PROPHECY', icon: '🔮', url: '/prophecy', category: 'command' },
        { name: 'HAKAI', icon: '💀', url: '/hakai', category: 'command' },
        { name: 'MAJIN Servers', icon: '👾', url: '/majin', category: 'command' },
        { divider: true, label: 'CRM & Sales' },
        { name: 'CRM Ultra', icon: '📊', url: '/crm', category: 'crm' },
        { name: 'Deals Pipeline', icon: '💰', url: '/deals', category: 'crm' },
        { name: 'Lead Discovery', icon: '🎯', url: '/leads', category: 'crm' },
        { divider: true, label: 'Communication' },
        { name: 'Email Hub', icon: '📧', url: '/email-hub', category: 'comm' },
        { name: 'Email Tracking', icon: '📈', url: '/email-tracking', category: 'comm' },
        { name: 'Kampagnen', icon: '🚀', url: '/kampagnen', category: 'comm' },
        { name: 'WhatsApp', icon: '💬', url: '/whatsapp', category: 'comm' },
        { divider: true, label: 'Business' },
        { name: 'Business Dashboard', icon: '🏢', url: '/business', category: 'biz' },
        { name: 'Cashflow Tracker', icon: '💵', url: '/cashflow', category: 'biz' },
        { name: 'Investoren', icon: '👔', url: '/investoren', category: 'biz' },
        { divider: true, label: 'Portals' },
        { name: 'Bauherren Pass', icon: '🏠', url: '/bauherren-pass', category: 'portal' },
        { name: 'Investor Portal', icon: '🏦', url: '/investor-portal', category: 'portal' },
        { name: 'Customer Portal', icon: '👥', url: '/customer-portal', category: 'portal' },
        { divider: true, label: 'System' },
        { name: 'Enterprise Suite', icon: '🎛️', url: '/suite', category: 'system' },
        { name: 'Dashboard V11', icon: '📱', url: '/dashboard', category: 'system' },
        { name: 'Agents', icon: '🤖', url: '/agents', category: 'system' },
    ];

    // Inject styles
    const styles = `
        .dash-nav-container {
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Rajdhani', 'Inter', -apple-system, sans-serif;
        }
        .dash-nav-user {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 15px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid rgba(139, 92, 246, 0.4);
            border-radius: 25px;
            color: #a78bfa;
            font-size: 14px;
            font-weight: 500;
        }
        .dash-nav-user-avatar {
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #8b5cf6, #a78bfa);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: white;
            font-weight: 700;
        }
        .dash-nav-btn {
            width: 45px;
            height: 45px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        .dash-nav-btn:hover {
            background: rgba(139, 92, 246, 0.3);
            border-color: rgba(139, 92, 246, 0.6);
            transform: scale(1.05);
        }
        .dash-nav-btn.logout:hover {
            background: rgba(239, 68, 68, 0.3);
            border-color: rgba(239, 68, 68, 0.6);
        }
        .dash-nav-menu {
            position: fixed;
            top: 0;
            left: -320px;
            width: 300px;
            height: 100vh;
            background: linear-gradient(180deg, #0a0a12 0%, #1a1a2e 100%);
            border-right: 1px solid rgba(139, 92, 246, 0.3);
            z-index: 999999;
            transition: left 0.3s ease;
            overflow-y: auto;
            box-shadow: 5px 0 30px rgba(0, 0, 0, 0.5);
        }
        .dash-nav-menu.open { left: 0; }
        .dash-nav-menu-header {
            padding: 25px 20px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.1));
            border-bottom: 1px solid rgba(139, 92, 246, 0.3);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .dash-nav-menu-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .dash-nav-menu-title span:first-child { font-size: 28px; }
        .dash-nav-menu-title-text {
            font-size: 18px;
            font-weight: 700;
            background: linear-gradient(135deg, #FFD700, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 1px;
        }
        .dash-nav-menu-close {
            width: 35px;
            height: 35px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .dash-nav-menu-close:hover {
            background: rgba(239, 68, 68, 0.3);
            border-color: rgba(239, 68, 68, 0.5);
        }
        .dash-nav-menu-items { padding: 15px 0; }
        .dash-nav-menu-divider {
            padding: 15px 20px 8px;
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }
        .dash-nav-menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            color: #e2e8f0;
            text-decoration: none;
            transition: all 0.2s ease;
            border-left: 3px solid transparent;
        }
        .dash-nav-menu-item:hover {
            background: rgba(139, 92, 246, 0.15);
            border-left-color: #8b5cf6;
            color: white;
        }
        .dash-nav-menu-item.active {
            background: rgba(139, 92, 246, 0.25);
            border-left-color: #FFD700;
            color: #FFD700;
        }
        .dash-nav-menu-item-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
        }
        .dash-nav-menu-item-name { font-size: 15px; font-weight: 500; }
        .dash-nav-menu-footer {
            position: sticky;
            bottom: 0;
            padding: 20px;
            background: linear-gradient(0deg, #0a0a12 0%, transparent 100%);
            border-top: 1px solid rgba(139, 92, 246, 0.2);
        }
        .dash-nav-logout-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s ease;
        }
        .dash-nav-logout-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(239, 68, 68, 0.4);
        }
        .dash-nav-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(3px);
            z-index: 99998;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        .dash-nav-overlay.open { opacity: 1; visibility: visible; }
        @media (max-width: 768px) {
            .dash-nav-user { display: none; }
            .dash-nav-container { top: 10px; right: 10px; }
        }
    `;

    // Create and inject stylesheet
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Get current user (sanitized - only uses specific fields)
    function getUser() {
        try {
            const userStr = localStorage.getItem('eu_user');
            if (!userStr) return null;
            const user = JSON.parse(userStr);
            return {
                firstName: String(user.firstName || '').slice(0, 50),
                lastName: String(user.lastName || '').slice(0, 50),
                email: String(user.email || '').slice(0, 100)
            };
        } catch (e) {
            return null;
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Create navigation using DOM methods (safe from XSS)
    function createNavigation() {
        const user = getUser();
        const currentPath = window.location.pathname;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'dash-nav-overlay';
        overlay.onclick = closeMenu;

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'dash-nav-menu';

        // Menu header
        const header = document.createElement('div');
        header.className = 'dash-nav-menu-header';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'dash-nav-menu-title';
        const iconSpan = document.createElement('span');
        iconSpan.textContent = '神';
        const textSpan = document.createElement('span');
        textSpan.className = 'dash-nav-menu-title-text';
        textSpan.textContent = 'Enterprise Universe';
        titleDiv.appendChild(iconSpan);
        titleDiv.appendChild(textSpan);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'dash-nav-menu-close';
        closeBtn.textContent = '✕';
        closeBtn.onclick = closeMenu;

        header.appendChild(titleDiv);
        header.appendChild(closeBtn);
        menu.appendChild(header);

        // Menu items
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'dash-nav-menu-items';

        DASHBOARDS.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.className = 'dash-nav-menu-divider';
                divider.textContent = item.label;
                itemsContainer.appendChild(divider);
            } else {
                const link = document.createElement('a');
                link.href = item.url;
                link.className = 'dash-nav-menu-item';
                if (currentPath === item.url || currentPath.startsWith(item.url + '/')) {
                    link.classList.add('active');
                }

                const iconSpan = document.createElement('span');
                iconSpan.className = 'dash-nav-menu-item-icon';
                iconSpan.textContent = item.icon;

                const nameSpan = document.createElement('span');
                nameSpan.className = 'dash-nav-menu-item-name';
                nameSpan.textContent = item.name;

                link.appendChild(iconSpan);
                link.appendChild(nameSpan);
                itemsContainer.appendChild(link);
            }
        });
        menu.appendChild(itemsContainer);

        // Menu footer with logout
        const footer = document.createElement('div');
        footer.className = 'dash-nav-menu-footer';
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'dash-nav-logout-btn';
        logoutBtn.onclick = doLogout;
        const logoutIcon = document.createElement('span');
        logoutIcon.textContent = '🚪';
        logoutBtn.appendChild(logoutIcon);
        logoutBtn.appendChild(document.createTextNode(' Logout'));
        footer.appendChild(logoutBtn);
        menu.appendChild(footer);

        // Create nav container
        const nav = document.createElement('div');
        nav.className = 'dash-nav-container';

        // User info
        if (user) {
            const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || user.email?.[0] || '')).toUpperCase();
            const userDiv = document.createElement('div');
            userDiv.className = 'dash-nav-user';

            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'dash-nav-user-avatar';
            avatarDiv.textContent = initials;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = user.firstName || user.email?.split('@')[0] || 'User';

            userDiv.appendChild(avatarDiv);
            userDiv.appendChild(nameSpan);
            nav.appendChild(userDiv);
        }

        // Menu button
        const menuBtn = document.createElement('button');
        menuBtn.className = 'dash-nav-btn';
        menuBtn.title = 'Menu';
        menuBtn.textContent = '☰';
        menuBtn.onclick = toggleMenu;
        nav.appendChild(menuBtn);

        // Logout button
        const navLogoutBtn = document.createElement('button');
        navLogoutBtn.className = 'dash-nav-btn logout';
        navLogoutBtn.title = 'Logout';
        navLogoutBtn.textContent = '🚪';
        navLogoutBtn.onclick = doLogout;
        nav.appendChild(navLogoutBtn);

        // Add to document
        document.body.appendChild(overlay);
        document.body.appendChild(menu);
        document.body.appendChild(nav);

        // Store references
        window._dashNavMenu = menu;
        window._dashNavOverlay = overlay;
    }

    // Toggle menu
    function toggleMenu() {
        window._dashNavMenu?.classList.toggle('open');
        window._dashNavOverlay?.classList.toggle('open');
    }
    window.dashNavToggle = toggleMenu;

    // Close menu
    function closeMenu() {
        window._dashNavMenu?.classList.remove('open');
        window._dashNavOverlay?.classList.remove('open');
    }
    window.dashNavClose = closeMenu;

    // Logout
    async function doLogout() {
        const token = localStorage.getItem('eu_token');
        if (token) {
            try {
                await fetch('/api/v1/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
            } catch (e) {
                console.warn('[Dashboard Nav] Logout API error:', e.message);
            }
        }
        localStorage.removeItem('eu_token');
        localStorage.removeItem('eu_user');
        window.location.href = '/login';
    }
    window.dashNavLogout = doLogout;

    // Keyboard shortcut (Escape to close menu)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeMenu();
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createNavigation);
    } else {
        createNavigation();
    }
})();
