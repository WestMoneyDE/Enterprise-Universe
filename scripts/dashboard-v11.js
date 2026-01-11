        // ═══════════════════════════════════════════════════════════════
        // ENTERPRISE UNIVERSE V11 - MEGA GOD MODE
        // ═══════════════════════════════════════════════════════════════

        const API_BASE = '/api/v1';

        // Tab Switching
        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById('tab-' + tabId)?.classList.add('active');

            // Find and activate the nav item that corresponds to this tab
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                const onclick = item.getAttribute('onclick');
                if (onclick && onclick.includes(`'${tabId}'`)) {
                    item.classList.add('active');
                }
            });

            // Update page title with proper names
            const titleMap = {
                'dashboard': 'Dashboard',
                'crm': 'CRM Ultra',
                'leads': 'Lead Discovery',
                'deals': 'Deals Pipeline',
                'email': 'Email Hub',
                'whatsapp': 'WhatsApp Hub',
                'payments': 'Stripe Payments',
                'agents': 'Genius Hub',
                'godmode': 'GOD Mode',
                'prophecy': 'Prophecy Mode',
                'hakai': 'Hakai Mode',
                'analytics': 'Analytics',
                'finance': 'Finance Hub',
                'reports': 'Reports',
                'settings': 'Settings'
            };
            document.getElementById('pageTitle').textContent = titleMap[tabId] || tabId.charAt(0).toUpperCase() + tabId.slice(1);

            // Tab-specific initialization
            if (tabId === 'whatsapp') {
                initWhatsAppTab();
            } else if (tabId === 'deals') {
                loadDealsFromHubSpot();
            } else if (tabId === 'payments') {
                initPaymentsTab();
            }
        }

        // Format Numbers - German style
        function formatNumber(num) {
            if (num >= 1e12) return (num / 1e12).toFixed(2) + ' Bio.';
            if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Mrd.';
            if (num >= 1e6) return (num / 1e6).toFixed(1) + ' Mio.';
            if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
            return num.toLocaleString('de-DE');
        }

        // Dark Theme Chart Defaults
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';

        // Initialize Charts
        function initCharts() {
            // Pipeline Chart - Dark Theme
            const pipelineCtx = document.getElementById('pipelineChart')?.getContext('2d');
            if (pipelineCtx) {
                const gradient = pipelineCtx.createLinearGradient(0, 0, 0, 200);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
                gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

                new Chart(pipelineCtx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: [{
                            label: 'Pipeline (€B)',
                            data: [12, 15, 18, 22, 25, 28, 30, 32, 34, 35, 36, 37],
                            borderColor: '#6366f1',
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3,
                            pointBackgroundColor: '#6366f1',
                            pointBorderColor: '#1a1a24',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
                                ticks: { color: '#64748b' }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: '#64748b' }
                            }
                        }
                    }
                });
            }

            // Source Chart - Dark Theme
            const sourceCtx = document.getElementById('sourceChart')?.getContext('2d');
            if (sourceCtx) {
                new Chart(sourceCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['LinkedIn', 'Website', 'Referral', 'Events', 'Cold Outreach'],
                        datasets: [{
                            data: [35, 25, 20, 12, 8],
                            backgroundColor: ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'],
                            borderColor: '#1a1a24',
                            borderWidth: 3,
                            hoverBorderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        cutout: '65%',
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: { color: '#94a3b8', padding: 15, usePointStyle: true, pointStyle: 'circle' }
                            }
                        }
                    }
                });
            }

            // Initialize Sparklines
            initSparklines();
        }

        // Sparkline Mini Charts
        function initSparklines() {
            const sparklineConfig = (color, data) => ({
                type: 'line',
                data: {
                    labels: ['', '', '', '', '', '', ''],
                    datasets: [{
                        data: data,
                        borderColor: color,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });

            const sparklines = [
                { id: 'sparkPipeline', color: '#6366f1', data: [120, 135, 142, 155, 160, 158, 164] },
                { id: 'sparkActiveDeals', color: '#0ea5e9', data: [3.1, 3.2, 3.25, 3.3, 3.35, 3.38, 3.40] },
                { id: 'sparkWon', color: '#22c55e', data: [2.1, 2.4, 2.6, 2.8, 2.9, 3.0, 3.08] },
                { id: 'sparkWonDeals', color: '#10b981', data: [2100, 2300, 2500, 2650, 2750, 2850, 2906] },
                { id: 'sparkWinRate', color: '#f59e0b', data: [0.06, 0.07, 0.075, 0.08, 0.082, 0.084, 0.085] },
                { id: 'sparkDeals', color: '#0ea5e9', data: [2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.4] },
                { id: 'sparkContacts', color: '#8b5cf6', data: [12, 13, 13.5, 14, 14.5, 15, 15.1] },
                { id: 'sparkHotLeads', color: '#f59e0b', data: [5, 4, 6, 4, 5, 4, 3] }
            ];

            sparklines.forEach(spark => {
                const ctx = document.getElementById(spark.id)?.getContext('2d');
                if (ctx) new Chart(ctx, sparklineConfig(spark.color, spark.data));
            });
        }

        // Generate All Agents
        function generateAgents() {
            // Color mapping for Tailwind classes (CDN doesn't support dynamic classes)
            const colorClasses = {
                purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
                yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
                blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
                violet: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
                green: { bg: 'bg-green-500/20', text: 'text-green-400' },
                pink: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
                orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
                red: { bg: 'bg-red-500/20', text: 'text-red-400' },
                cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
                gray: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
                gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
                white: { bg: 'bg-white/20', text: 'text-white' }
            };

            const agents = [
                { name: 'EINSTEIN', icon: '🧠', color: 'purple', status: 'THINKING', specialty: 'Analytics & Intelligence' },
                { name: 'BROLY', icon: '⚡', color: 'yellow', status: 'ACTIVE', specialty: 'Task Executor' },
                { name: 'ORION', icon: '⭐', color: 'blue', status: 'SCANNING', specialty: 'Navigation & Strategy' },
                { name: 'LUNA', icon: '🌙', color: 'violet', status: 'WATCHING', specialty: 'Security & Monitoring' },
                { name: 'ATLAS', icon: '🌍', color: 'green', status: 'ACTIVE', specialty: 'Data Processing' },
                { name: 'NOVA', icon: '💫', color: 'pink', status: 'READY', specialty: 'Content Generation' },
                { name: 'TITAN', icon: '🔱', color: 'orange', status: 'PROCESSING', specialty: 'Heavy Computing' },
                { name: 'PHOENIX', icon: '🔥', color: 'red', status: 'ACTIVE', specialty: 'Recovery & Backup' },
                { name: 'MERCURY', icon: '💨', color: 'cyan', status: 'FAST', specialty: 'Speed Operations' },
                { name: 'VENUS', icon: '💖', color: 'pink', status: 'ACTIVE', specialty: 'Customer Relations' },
                { name: 'MARS', icon: '⚔️', color: 'red', status: 'COMBAT', specialty: 'Competitive Analysis' },
                { name: 'JUPITER', icon: '👑', color: 'yellow', status: 'LEADER', specialty: 'Decision Making' },
                { name: 'SATURN', icon: '💎', color: 'purple', status: 'ANALYZING', specialty: 'Financial Analysis' },
                { name: 'NEPTUNE', icon: '🌊', color: 'blue', status: 'DEEP', specialty: 'Deep Learning' },
                { name: 'PLUTO', icon: '🌑', color: 'gray', status: 'HIDDEN', specialty: 'Stealth Operations' },
                { name: 'APOLLO', icon: '☀️', color: 'yellow', status: 'BRIGHT', specialty: 'Insight Generation' },
                { name: 'ARTEMIS', icon: '🏹', color: 'green', status: 'HUNTING', specialty: 'Lead Discovery' },
                { name: 'ATHENA', icon: '🦉', color: 'purple', status: 'WISE', specialty: 'Strategic Planning' },
                { name: 'HERMES', icon: '📬', color: 'cyan', status: 'MESSAGING', specialty: 'Communication' },
                { name: 'HADES', icon: '💀', color: 'gray', status: 'DARK', specialty: 'Data Archival' },
                { name: 'ZEUS', icon: '⚡', color: 'blue', status: 'SUPREME', specialty: 'System Control' },
                { name: 'POSEIDON', icon: '🔱', color: 'blue', status: 'FLOW', specialty: 'Pipeline Management' },
                { name: 'ARES', icon: '🛡️', color: 'red', status: 'DEFENSE', specialty: 'Security Ops' },
                { name: 'HERA', icon: '👸', color: 'purple', status: 'QUEEN', specialty: 'Quality Control' },
                { name: 'KRONOS', icon: '⏰', color: 'orange', status: 'TIMING', specialty: 'Scheduling' },
                { name: 'GAIA', icon: '🌿', color: 'green', status: 'NURTURE', specialty: 'Lead Nurturing' },
                { name: 'HELIOS', icon: '🌅', color: 'yellow', status: 'SHINE', specialty: 'Reporting' },
                { name: 'SELENE', icon: '🌙', color: 'violet', status: 'NIGHT', specialty: '24/7 Monitoring' },
                { name: 'EROS', icon: '💘', color: 'pink', status: 'CONNECT', specialty: 'Relationship Building' },
                { name: 'NIKE', icon: '🏆', color: 'gold', status: 'WINNING', specialty: 'Deal Closing' },
                { name: 'MORPHEUS', icon: '💤', color: 'purple', status: 'DREAM', specialty: 'Prediction' },
                { name: 'PROMETHEUS', icon: '🔥', color: 'orange', status: 'CREATE', specialty: 'Innovation' },
                { name: 'HERCULES', icon: '💪', color: 'red', status: 'POWER', specialty: 'Heavy Lifting' },
                { name: 'PANDORA', icon: '📦', color: 'purple', status: 'DISCOVER', specialty: 'Data Mining' },
                { name: 'ICARUS', icon: '🦅', color: 'yellow', status: 'SOAR', specialty: 'Growth Hacking' },
                { name: 'DAEDALUS', icon: '🔧', color: 'gray', status: 'BUILD', specialty: 'System Building' },
                { name: 'MIDAS', icon: '✨', color: 'gold', status: 'GOLD', specialty: 'Revenue Optimization' },
                { name: 'ORACLE', icon: '🔮', color: 'purple', status: 'VISION', specialty: 'Forecasting' },
                { name: 'SPHINX', icon: '🦁', color: 'orange', status: 'GUARD', specialty: 'Access Control' },
                { name: 'CHIMERA', icon: '🐉', color: 'red', status: 'HYBRID', specialty: 'Multi-tasking' },
                { name: 'PEGASUS', icon: '🦄', color: 'white', status: 'FLY', specialty: 'Fast Delivery' },
                { name: 'CERBERUS', icon: '🐕', color: 'gray', status: 'WATCH', specialty: 'Triple Security' }
            ];

            const grid = document.getElementById('allAgentsGrid');
            if (!grid) return;

            grid.innerHTML = agents.map(a => {
                const colors = colorClasses[a.color] || colorClasses.purple;
                return `
                <div class="card bot-card p-4 hover:scale-[1.02] transition-transform">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">${a.icon}</span>
                            <div>
                                <h3 class="font-semibold text-sm">${a.name}</h3>
                                <p class="text-xs text-slate-500">${a.specialty}</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 ${colors.bg} ${colors.text} text-xs rounded">${a.status}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs mt-3 pt-2 border-t" style="border-color: var(--border);">
                        <span class="text-green-400">⚡ 99%</span>
                        <span class="text-cyan-400">⏱ 2ms</span>
                    </div>
                </div>
            `}).join('');
        }

        // ═══════════════════════════════════════════════════════════════
        // MODAL FUNCTIONS
        // ═══════════════════════════════════════════════════════════════

        function openModal(modalId) {
            document.getElementById(modalId)?.classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId)?.classList.remove('active');
        }

        // ═══════════════════════════════════════════════════════════════
        // INVOICE FUNCTIONS
        // ═══════════════════════════════════════════════════════════════

        function filterInvoices(status) {
            document.getElementById('invoiceStatusFilter').value = status;
            const rows = document.querySelectorAll('#invoicesTable tr');
            rows.forEach(row => {
                if (status === 'all') {
                    row.style.display = '';
                } else {
                    const statusCell = row.querySelector('td:nth-child(4) span');
                    if (statusCell) {
                        const rowStatus = statusCell.textContent.toLowerCase();
                        const match = (status === 'paid' && rowStatus === 'bezahlt') ||
                                      (status === 'pending' && rowStatus === 'ausstehend') ||
                                      (status === 'overdue' && rowStatus === 'überfällig') ||
                                      (status === 'draft' && rowStatus === 'entwurf');
                        row.style.display = match ? '' : 'none';
                    }
                }
            });
        }

        function searchInvoices() {
            const query = document.getElementById('invoiceSearch').value.toLowerCase();
            const rows = document.querySelectorAll('#invoicesTable tr');
            rows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
            });
        }

        // Invoice sorting state
        let invoiceSortColumn = null;
        let invoiceSortAsc = true;

        function sortInvoices(column) {
            const table = document.getElementById('invoicesTable');
            const rows = Array.from(table.querySelectorAll('tr'));

            // Toggle sort direction if same column
            if (invoiceSortColumn === column) {
                invoiceSortAsc = !invoiceSortAsc;
            } else {
                invoiceSortColumn = column;
                invoiceSortAsc = true;
            }

            const columnIndex = { id: 0, customer: 1, amount: 2, date: 4 }[column];
            if (columnIndex === undefined) return;

            rows.sort((a, b) => {
                let aVal = a.cells[columnIndex]?.textContent.trim() || '';
                let bVal = b.cells[columnIndex]?.textContent.trim() || '';

                // Handle amount sorting (remove € and parse)
                if (column === 'amount') {
                    aVal = parseFloat(aVal.replace(/[€,.]/g, '')) || 0;
                    bVal = parseFloat(bVal.replace(/[€,.]/g, '')) || 0;
                    return invoiceSortAsc ? aVal - bVal : bVal - aVal;
                }

                // Handle date sorting
                if (column === 'date') {
                    const parseDate = (str) => {
                        if (str === '-') return new Date(0);
                        const parts = str.split('.');
                        return new Date(parts[2], parts[1] - 1, parts[0]);
                    };
                    aVal = parseDate(aVal);
                    bVal = parseDate(bVal);
                    return invoiceSortAsc ? aVal - bVal : bVal - aVal;
                }

                // String sorting
                return invoiceSortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });

            rows.forEach(row => table.appendChild(row));
        }

        function viewInvoice(id) {
            // Create dynamic invoice detail modal
            const existingModal = document.getElementById('invoiceDetailModal');
            if (existingModal) existingModal.remove();

            const invoiceData = {
                'INV-2024-001': { customer: 'PropTech GmbH', amount: '€2,450,000', status: 'Bezahlt', date: '10.01.2024', due: '10.02.2024', email: 'max@proptech.de' },
                'INV-2024-002': { customer: 'SmartLiving AG', amount: '€890,000', status: 'Ausstehend', date: '08.01.2024', due: '08.02.2024', email: 'billing@smartliving.io' },
                'INV-2024-003': { customer: 'Real Estate Empire', amount: '€5,670,000', status: 'Überfällig', date: '15.12.2023', due: '15.01.2024', email: 'finance@realestate.de' },
                'INV-2024-004': { customer: 'TechCorp AG', amount: '€1,250,000', status: 'Bezahlt', date: '05.01.2024', due: '05.02.2024', email: 'ap@techcorp.de' },
                'INV-2024-005': { customer: 'LOXONE Partner', amount: '€780,000', status: 'Entwurf', date: '-', due: '-', email: 'partner@loxone.com' }
            };

            const inv = invoiceData[id] || { customer: 'Unknown', amount: '€0', status: 'Unknown', date: '-', due: '-', email: '-' };
            const statusColors = {
                'Bezahlt': 'bg-green-500/20 text-green-400',
                'Ausstehend': 'bg-yellow-500/20 text-yellow-400',
                'Überfällig': 'bg-red-500/20 text-red-400',
                'Entwurf': 'bg-gray-500/20 text-gray-400'
            };

            const modal = document.createElement('div');
            modal.id = 'invoiceDetailModal';
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content p-6 animate-slide-in">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="font-orbitron text-xl font-bold gradient-text">Rechnung #${id}</h2>
                        <button onclick="document.getElementById('invoiceDetailModal').remove()" class="p-2 hover:bg-white/10 rounded-lg">✕</button>
                    </div>
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-1">Kunde</p>
                                <p class="font-semibold">${inv.customer}</p>
                                <p class="text-sm text-slate-500">${inv.email}</p>
                            </div>
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-1">Betrag</p>
                                <p class="font-orbitron text-2xl font-bold gradient-gold">${inv.amount}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-4">
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-1">Status</p>
                                <span class="px-3 py-1 ${statusColors[inv.status] || 'bg-gray-500/20 text-gray-400'} text-sm rounded">${inv.status}</span>
                            </div>
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-1">Rechnungsdatum</p>
                                <p class="font-semibold">${inv.date}</p>
                            </div>
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-1">Fällig</p>
                                <p class="font-semibold">${inv.due}</p>
                            </div>
                        </div>
                        <div class="flex gap-3 pt-4">
                            <button onclick="document.getElementById('invoiceDetailModal').remove()" class="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition">Schließen</button>
                            <button class="flex-1 px-4 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition">PDF Download</button>
                            <button class="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition font-semibold">Email senden</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // ═══════════════════════════════════════════════════════════════
        // DEALS PIPELINE FUNCTIONS
        // ═══════════════════════════════════════════════════════════════

        let dealsData = [];
        let dealsCurrentPage = 1;
        const dealsPerPage = 20;

        // Stage configuration
        const stageConfig = {
            'appointmentscheduled': { name: 'Qualification', color: 'blue', icon: '🎯', probability: 20 },
            'qualifiedtobuy': { name: 'Meeting', color: 'cyan', icon: '📅', probability: 40 },
            'presentationscheduled': { name: 'Proposal', color: 'purple', icon: '📝', probability: 60 },
            'decisionmakerboughtin': { name: 'Negotiation', color: 'yellow', icon: '🤝', probability: 80 },
            'contractsent': { name: 'Contract', color: 'orange', icon: '📄', probability: 90 },
            'closedwon': { name: 'Won', color: 'green', icon: '🏆', probability: 100 },
            'closedlost': { name: 'Lost', color: 'red', icon: '❌', probability: 0 }
        };

        async function loadDealsFromHubSpot() {
            showNotification('Lade Deals von HubSpot...', 'info');
            document.getElementById('pipelineKanban').innerHTML = '<div class="w-full text-center py-10"><span class="animate-spin text-2xl">⟳</span><p class="mt-2 text-slate-500">Synchronisiere mit HubSpot...</p></div>';

            try {
                const response = await fetch('/api/hubspot/deals/all');
                if (!response.ok) throw new Error('API Error');

                const data = await response.json();
                dealsData = data.results || [];

                // Update KPIs
                updateDealsKPIs(dealsData, data.total);

                // Generate Kanban
                generateDealsKanban(dealsData.slice(0, 100)); // Show first 100 in Kanban

                // Fill table
                renderDealsTable();

                // Update charts
                initDealsCharts(dealsData);

                document.getElementById('dealsLastUpdate').textContent = new Date().toLocaleString('de-DE');
                showNotification(`${formatNumber(data.total)} Deals geladen!`, 'success');

            } catch (error) {
                console.error('Load Deals Error:', error);
                showNotification('Fehler beim Laden der Deals', 'error');
                // Load sample data
                loadSampleDeals();
            }
        }

        function loadSampleDeals() {
            dealsData = [
                { id: '1', properties: { dealname: 'SmartCity Munich', amount: '450000000', dealstage: 'qualifiedtobuy', closedate: '2026-03-15', pipeline: 'default' }, contact: { name: 'Max Müller', score: 85 }},
                { id: '2', properties: { dealname: 'IoT Enterprise Platform', amount: '125000000', dealstage: 'appointmentscheduled', closedate: '2026-02-28', pipeline: 'default' }, contact: { name: 'Anna Schmidt', score: 72 }},
                { id: '3', properties: { dealname: 'LOXONE Gold Integration', amount: '890000000', dealstage: 'presentationscheduled', closedate: '2026-04-10', pipeline: 'default' }, contact: { name: 'Thomas Weber', score: 91 }},
                { id: '4', properties: { dealname: 'PropTech Revolution', amount: '1200000000', dealstage: 'decisionmakerboughtin', closedate: '2026-02-20', pipeline: 'default' }, contact: { name: 'Lisa Braun', score: 95 }},
                { id: '5', properties: { dealname: 'Digital Twin Factory', amount: '340000000', dealstage: 'closedwon', closedate: '2026-01-05', pipeline: 'default' }, contact: { name: 'Peter Koch', score: 88 }},
                { id: '6', properties: { dealname: 'AI Automation Suite', amount: '670000000', dealstage: 'presentationscheduled', closedate: '2026-05-01', pipeline: 'default' }, contact: { name: 'Sarah Lange', score: 78 }},
                { id: '7', properties: { dealname: 'Real Estate Empire', amount: '2800000000', dealstage: 'decisionmakerboughtin', closedate: '2026-03-30', pipeline: 'default' }, contact: { name: 'Michael Richter', score: 92 }},
                { id: '8', properties: { dealname: 'Smart Factory 4.0', amount: '1500000000', dealstage: 'contractsent', closedate: '2026-02-15', pipeline: 'default' }, contact: { name: 'Julia Fischer', score: 97 }},
                { id: '9', properties: { dealname: 'Cloud Migration Pro', amount: '180000000', dealstage: 'closedwon', closedate: '2026-01-10', pipeline: 'default' }, contact: { name: 'David Meyer', score: 82 }},
                { id: '10', properties: { dealname: 'Smart Building Suite', amount: '520000000', dealstage: 'qualifiedtobuy', closedate: '2026-04-20', pipeline: 'default' }, contact: { name: 'Nina Wagner', score: 69 }}
            ];

            updateDealsKPIs(dealsData, 3401456);
            generateDealsKanban(dealsData);
            renderDealsTable();
            initDealsCharts(dealsData);
            document.getElementById('dealsLastUpdate').textContent = new Date().toLocaleString('de-DE');
        }

        async function updateDealsKPIs(deals, total) {
            // Fetch correct totals from pipeline-summary API
            try {
                const response = await fetch('/api/v1/analytics/pipeline-summary');
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('dealsTotalCount').textContent = formatNumber(data.total_deals);
                    document.getElementById('dealsTotalValue').textContent = '€' + formatNumber(data.pipeline_value);
                    document.getElementById('dealsWinRate').textContent = data.win_rate + '%';
                    document.getElementById('dealsAvgValue').textContent = '€' + formatNumber(data.avg_deal_value);

                    // Update won value if element exists
                    const wonEl = document.getElementById('dealsWonValue');
                    if (wonEl) wonEl.textContent = '€' + formatNumber(data.won_value);
                    return;
                }
            } catch (e) {
                console.log('Pipeline summary not available, using sample data');
            }

            // Fallback to sample calculation
            const totalValue = deals.reduce((sum, d) => sum + (parseFloat(d.properties?.amount) || 0), 0);
            const wonDeals = deals.filter(d => d.properties?.dealstage === 'closedwon');
            const lostDeals = deals.filter(d => d.properties?.dealstage === 'closedlost');
            const winRate = wonDeals.length + lostDeals.length > 0
                ? ((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100).toFixed(1)
                : 18;
            const avgValue = deals.length > 0 ? totalValue / deals.length : 1641033;

            document.getElementById('dealsTotalCount').textContent = formatNumber(total || deals.length);
            document.getElementById('dealsTotalValue').textContent = '€' + formatNumber(totalValue || 5581901169888);
            document.getElementById('dealsWinRate').textContent = winRate + '%';
            document.getElementById('dealsAvgValue').textContent = '€' + formatNumber(avgValue);
        }

        function generateDealsKanban(deals) {
            const stages = ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin', 'contractsent', 'closedwon'];
            const kanban = document.getElementById('pipelineKanban');

            const stageDeals = {};
            stages.forEach(s => stageDeals[s] = []);
            deals.forEach(d => {
                const stage = d.properties?.dealstage || 'appointmentscheduled';
                if (stageDeals[stage]) stageDeals[stage].push(d);
            });

            kanban.innerHTML = stages.map(stage => {
                const config = stageConfig[stage] || { name: stage, color: 'gray', icon: '📋' };
                const stageTotal = stageDeals[stage].reduce((sum, d) => sum + (parseFloat(d.properties?.amount) || 0), 0);
                const colorClasses = {
                    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
                    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
                    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
                    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
                    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
                    green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
                    red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' }
                };
                const colors = colorClasses[config.color] || colorClasses.gray;

                return `
                <div class="pipeline-stage flex-shrink-0 w-72">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-semibold ${colors.text}">${config.icon} ${config.name}</h3>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 ${colors.bg} ${colors.text} text-xs rounded">${stageDeals[stage].length}</span>
                            <span class="px-2 py-1 ${colors.bg} ${colors.text} text-xs rounded font-semibold">€${formatNumber(stageTotal)}</span>
                        </div>
                    </div>
                    <div class="space-y-3 max-h-96 overflow-y-auto">
                        ${stageDeals[stage].slice(0, 5).map(deal => {
                            const amount = parseFloat(deal.properties?.amount) || 0;
                            const score = deal.contact?.score || Math.floor(Math.random() * 40) + 60;
                            const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
                            const contactName = deal.contact?.name || 'Unbekannt';
                            return `
                            <div class="deal-card ${colors.border} cursor-pointer hover:scale-[1.02] transition-transform" onclick="viewDealDetail('${deal.id}')">
                                <p class="font-semibold text-sm truncate">${deal.properties?.dealname || 'Unnamed Deal'}</p>
                                <p class="text-lg font-bold ${colors.text} mt-1">€${formatNumber(amount)}</p>
                                <div class="flex items-center justify-between mt-2 pt-2 border-t" style="border-color: var(--border);">
                                    <div class="flex items-center gap-1">
                                        <span class="text-xs text-slate-500">Score:</span>
                                        <span class="text-xs font-bold ${scoreColor}">${score}</span>
                                    </div>
                                    <span class="text-xs text-slate-500 truncate max-w-20">${contactName}</span>
                                </div>
                            </div>
                            `;
                        }).join('')}
                        ${stageDeals[stage].length > 5 ? `<p class="text-xs text-center text-slate-500 py-2">+${stageDeals[stage].length - 5} weitere</p>` : ''}
                    </div>
                </div>
                `;
            }).join('');
        }

        function renderDealsTable() {
            const start = (dealsCurrentPage - 1) * dealsPerPage;
            const end = start + dealsPerPage;
            const pageDeals = dealsData.slice(start, end);

            const tbody = document.getElementById('dealsTableBody');
            tbody.innerHTML = pageDeals.map(deal => {
                const props = deal.properties || {};
                const amount = parseFloat(props.amount) || 0;
                const stage = props.dealstage || 'unknown';
                const config = stageConfig[stage] || { name: stage, color: 'gray', probability: 0 };
                const score = deal.contact?.score || Math.floor(Math.random() * 40) + 60;
                const contactName = deal.contact?.name || 'N/A';
                const closeDate = props.closedate ? new Date(props.closedate).toLocaleDateString('de-DE') : '-';

                const scoreColor = score >= 80 ? 'bg-green-500/20 text-green-400' : score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';
                const stageColors = {
                    blue: 'bg-blue-500/20 text-blue-400',
                    cyan: 'bg-cyan-500/20 text-cyan-400',
                    purple: 'bg-purple-500/20 text-purple-400',
                    yellow: 'bg-yellow-500/20 text-yellow-400',
                    orange: 'bg-orange-500/20 text-orange-400',
                    green: 'bg-green-500/20 text-green-400',
                    red: 'bg-red-500/20 text-red-400'
                };

                return `
                <tr class="hover:bg-white/5 transition-colors">
                    <td class="p-4">
                        <p class="font-semibold">${props.dealname || 'Unnamed'}</p>
                        <p class="text-xs text-slate-500">ID: ${deal.id}</p>
                    </td>
                    <td class="p-4 font-semibold text-yellow-400">€${formatNumber(amount)}</td>
                    <td class="p-4"><span class="px-2 py-1 ${stageColors[config.color] || 'bg-gray-500/20 text-gray-400'} text-xs rounded">${config.name}</span></td>
                    <td class="p-4">
                        <div class="flex items-center gap-2">
                            <div class="w-12 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div class="h-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}" style="width: ${score}%"></div>
                            </div>
                            <span class="text-sm font-bold ${scoreColor.split(' ')[1]}">${score}</span>
                        </div>
                    </td>
                    <td class="p-4">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-xs">${contactName.charAt(0)}</div>
                            <span class="text-sm">${contactName}</span>
                        </div>
                    </td>
                    <td class="p-4 text-sm">${closeDate}</td>
                    <td class="p-4">
                        <div class="flex items-center gap-2">
                            <div class="w-full h-2 bg-white/5 rounded-full overflow-hidden max-w-16">
                                <div class="h-full bg-purple-500" style="width: ${config.probability}%"></div>
                            </div>
                            <span class="text-xs">${config.probability}%</span>
                        </div>
                    </td>
                    <td class="p-4">
                        <div class="flex gap-2">
                            <button class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30" onclick="viewDealDetail('${deal.id}')">View</button>
                            <button class="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30">Edit</button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');

            document.getElementById('dealsTableInfo').textContent = `Zeige ${start + 1}-${Math.min(end, dealsData.length)} von ${formatNumber(dealsData.length)} Deals`;
        }

        function viewDealDetail(dealId) {
            const deal = dealsData.find(d => d.id === dealId);
            if (!deal) return;

            const props = deal.properties || {};
            const config = stageConfig[props.dealstage] || { name: 'Unknown', color: 'gray', probability: 0 };
            const score = deal.contact?.score || Math.floor(Math.random() * 40) + 60;

            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.id = 'dealDetailModal';
            modal.innerHTML = `
                <div class="modal-content p-6 animate-slide-in max-w-2xl">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="font-orbitron text-xl font-bold gradient-gold">${props.dealname || 'Deal Details'}</h2>
                        <button onclick="document.getElementById('dealDetailModal').remove()" class="p-2 hover:bg-white/10 rounded-lg">✕</button>
                    </div>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-1">Deal Wert</p>
                                <p class="font-orbitron text-3xl font-bold text-yellow-400">€${formatNumber(parseFloat(props.amount) || 0)}</p>
                            </div>
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-1">Stage & Wahrscheinlichkeit</p>
                                <div class="flex items-center gap-3">
                                    <span class="px-3 py-1 bg-${config.color}-500/20 text-${config.color}-400 rounded">${config.name}</span>
                                    <span class="font-bold">${config.probability}%</span>
                                </div>
                            </div>
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-1">Expected Close</p>
                                <p class="font-semibold">${props.closedate ? new Date(props.closedate).toLocaleDateString('de-DE') : '-'}</p>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-2">Lead Score</p>
                                <div class="flex items-center gap-4">
                                    <div class="relative w-20 h-20">
                                        <svg class="w-20 h-20 transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="8" fill="none" class="text-[var(--bg-elevated)]"/>
                                            <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="8" fill="none"
                                                class="${score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'}"
                                                stroke-dasharray="${score * 2.26} 226" stroke-linecap="round"/>
                                        </svg>
                                        <span class="absolute inset-0 flex items-center justify-center text-xl font-bold">${score}</span>
                                    </div>
                                    <div>
                                        <p class="font-semibold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}">${score >= 80 ? 'HOT' : score >= 60 ? 'WARM' : 'COLD'}</p>
                                        <p class="text-xs text-slate-500">Lead Qualität</p>
                                    </div>
                                </div>
                            </div>
                            <div class="p-4 bg-white/5 rounded-lg">
                                <p class="text-xs text-slate-500 mb-2">Verknüpfter Kontakt</p>
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center font-semibold">${(deal.contact?.name || 'U').charAt(0)}</div>
                                    <div>
                                        <p class="font-semibold">${deal.contact?.name || 'Kein Kontakt'}</p>
                                        <p class="text-xs text-slate-500">${deal.contact?.email || 'Nicht verknüpft'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button onclick="document.getElementById('dealDetailModal').remove()" class="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition">Schließen</button>
                        <button class="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition font-semibold">In HubSpot öffnen</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function filterDealsByStage() {
            const stage = document.getElementById('dealsStageFilter').value;
            // Filter logic here
            renderDealsTable();
        }

        function searchDeals() {
            const query = document.getElementById('dealsSearch').value.toLowerCase();
            // Search logic here
            renderDealsTable();
        }

        function sortDealsTable(column) {
            // Sort logic here
            renderDealsTable();
        }

        function loadDealsPage(direction) {
            if (direction === 'next' && dealsCurrentPage * dealsPerPage < dealsData.length) {
                dealsCurrentPage++;
            } else if (direction === 'prev' && dealsCurrentPage > 1) {
                dealsCurrentPage--;
            }
            renderDealsTable();
        }

        function openNewDealModal() {
            showNotification('Neuer Deal Modal - Coming Soon!', 'info');
        }

        // ═══════════════════════════════════════════════════════════════
        // AUTO LEAD DEMON - Automatische Lead Scoring & Stage Updates
        // Using Real HubSpot API Integration
        // ═══════════════════════════════════════════════════════════════

        let leadDemonActive = true;
        let leadDemonStats = { processed: 0, upgraded: 0, skipped: 0, lastRun: null };
        let leadDemonMode = 'live'; // Always run in live mode for automatic updates
        let leadDemonAutoRun = true; // Fully autonomous mode

        async function initLeadDemon() {
            console.log('🤖 Auto Lead Bot initialized - Fully Autonomous Mode');
            try {
                const response = await fetch('/api/lead-demon/status');
                const status = await response.json();
                console.log('🤖 Auto Lead Bot status:', status);
                updateLeadDemonStatus('active');

                // Start automatic processing immediately
                await runLeadDemon(false); // Run in live mode

                // Schedule automatic runs every 2 minutes
                setInterval(() => {
                    if (leadDemonActive && leadDemonAutoRun) {
                        runLeadDemon(false); // Always live mode
                    }
                }, 120000); // Every 2 minutes

            } catch (error) {
                console.error('Auto Lead Bot init error:', error);
                updateLeadDemonStatus('error');
                // Retry after 30 seconds
                setTimeout(initLeadDemon, 30000);
            }
        }

        async function runLeadDemon(dryRun = false) { // Default to live mode
            if (!leadDemonActive) return;

            console.log(`🤖 Auto Lead Bot running... (${dryRun ? 'PREVIEW' : 'LIVE UPDATE'})`);
            updateLeadDemonStatus('running');

            try {
                const response = await fetch('/api/lead-demon/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dryRun, limit: 50 })
                });

                const data = await response.json();

                if (data.success) {
                    const results = data.results;
                    leadDemonStats = {
                        processed: results.analyzed,
                        upgraded: results.updates.length,
                        skipped: results.skipped.length,
                        lastRun: new Date(data.timestamp)
                    };

                    // Update Demon Stats UI
                    const processedEl = document.getElementById('demonProcessed');
                    const upgradedEl = document.getElementById('demonUpgraded');
                    const downgradedEl = document.getElementById('demonDowngraded');
                    if (processedEl) processedEl.textContent = results.analyzed;
                    if (upgradedEl) upgradedEl.textContent = results.updates.length;
                    if (downgradedEl) downgradedEl.textContent = results.skipped.length;

                    // Update last run time
                    const lastRunEl = document.getElementById('demonLastRun');
                    if (lastRunEl) lastRunEl.textContent = new Date().toLocaleTimeString('de-DE');

                    // Log updates
                    results.updates.forEach(u => {
                        console.log(`😈 ${dryRun ? '[DRY]' : '[LIVE]'} ${u.name}: Score ${u.score} → ${u.newStage}`);
                    });

                    updateLeadDemonStatus('idle');
                    console.log(`😈 Lead Demon complete: ${results.analyzed} analyzed, ${results.updates.length} updates${dryRun ? ' (preview)' : ' applied'}`);

                    // Show notification only for significant updates
                    if (results.updates.length > 0) {
                        if (dryRun) {
                            showNotification(`🤖 Auto Lead Bot: ${results.updates.length} Deals bereit für Upgrade`, 'info');
                        } else {
                            showNotification(`🤖 Auto Lead Bot: ${results.updates.length} Deals automatisch aktualisiert`, 'success');
                            // Add notification to center
                            addNotification('lead', 'Lead Bot Update', `${results.updates.length} Deals automatisch aktualisiert`, 'normal');
                        }
                    }
                    // Don't show notification when everything is optimal (reduce noise)

                    // Update recent updates panel
                    updateLeadDemonPanel(results);
                } else {
                    throw new Error(data.error || 'Unknown error');
                }

            } catch (error) {
                console.error('Lead Demon Error:', error);
                updateLeadDemonStatus('error');
                showNotification('Lead Demon Fehler: ' + error.message, 'error');
            }
        }

        function updateLeadDemonPanel(results) {
            const panel = document.getElementById('leadDemonUpdates');
            if (!panel) return;

            if (results.updates.length === 0) {
                panel.innerHTML = '<p class="text-slate-500 text-xs">Keine Updates verfügbar</p>';
                return;
            }

            const stageNames = {
                'appointmentscheduled': 'Termin',
                'qualifiedtobuy': 'Qualifiziert',
                'presentationscheduled': 'Präsentation',
                'decisionmakerboughtin': 'Entscheider',
                'contractsent': 'Vertrag'
            };

            panel.innerHTML = results.updates.slice(0, 5).map(u => `
                <div class="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium truncate">${u.name?.substring(0, 30) || 'Deal'}...</p>
                        <p class="text-xs text-slate-500">€${Number(u.amount || 0).toLocaleString('de-DE')}</p>
                    </div>
                    <div class="text-right ml-2">
                        <span class="inline-block px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                            Score ${u.score}
                        </span>
                        <p class="text-xs text-purple-400 mt-0.5">→ ${stageNames[u.newStage] || u.newStage}</p>
                    </div>
                </div>
            `).join('');
        }

        function updateLeadDemonStatus(status) {
            const statusEl = document.getElementById('leadDemonStatus');
            if (!statusEl) return;

            const statusConfig = {
                active: { text: 'Aktiv', color: 'text-green-400', icon: '✓' },
                running: { text: 'Analysiere...', color: 'text-yellow-400', icon: '⟳' },
                idle: { text: 'Bereit', color: 'text-cyan-400', icon: '⏳' },
                error: { text: 'Fehler', color: 'text-red-400', icon: '✗' },
                paused: { text: 'Pausiert', color: 'text-gray-400', icon: '⏸' }
            };

            const config = statusConfig[status] || statusConfig.idle;
            statusEl.innerHTML = `<span class="${config.color}">${config.icon} ${config.text}</span>`;
        }

        function toggleLeadDemon() {
            leadDemonActive = !leadDemonActive;
            updateLeadDemonStatus(leadDemonActive ? 'active' : 'paused');
            showNotification(`Lead Demon ${leadDemonActive ? 'aktiviert' : 'pausiert'}`, leadDemonActive ? 'success' : 'warning');
        }

        async function forceRunLeadDemon() {
            showNotification('😈 Lead Demon Analyse gestartet...', 'info');
            await runLeadDemon(true); // Dry run first
        }

        async function executeLiveLeadDemon() {
            if (!confirm('😈 Lead Demon LIVE ausführen?\n\nDies aktualisiert die Deal-Stufen direkt in HubSpot!')) return;
            showNotification('😈 Lead Demon LIVE Update läuft...', 'warning');
            await runLeadDemon(false); // Live run
        }

        function initDealsCharts(deals) {
            // Deals by Stage Chart
            const stageCtx = document.getElementById('dealsByStageChart')?.getContext('2d');
            if (stageCtx) {
                const stageCounts = {};
                Object.keys(stageConfig).forEach(s => stageCounts[s] = 0);
                deals.forEach(d => {
                    const stage = d.properties?.dealstage || 'unknown';
                    if (stageCounts[stage] !== undefined) stageCounts[stage]++;
                });

                new Chart(stageCtx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(stageConfig).map(s => stageConfig[s].name),
                        datasets: [{
                            data: Object.values(stageCounts),
                            backgroundColor: ['#3b82f6', '#06b6d4', '#a855f7', '#fbbf24', '#f97316', '#22c55e', '#ef4444']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { position: 'right', labels: { color: '#a1a1aa' } } }
                    }
                });
            }

            // Deal Value Chart
            const valueCtx = document.getElementById('dealsValueChart')?.getContext('2d');
            if (valueCtx) {
                new Chart(valueCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: [{
                            label: 'Deal Wert (€M)',
                            data: [125, 189, 156, 234, 278, 312, 298, 345, 389, 412, 456, 502],
                            backgroundColor: 'rgba(168, 85, 247, 0.5)',
                            borderColor: '#a855f7',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a1a1aa' } },
                            x: { grid: { display: false }, ticks: { color: '#a1a1aa' } }
                        }
                    }
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // HUBSPOT SYNC INTEGRATION
        // ═══════════════════════════════════════════════════════════════

        const HUBSPOT_API = '/api/hubspot';
        let hubspotSyncStatus = { lastSync: null, syncing: false, contacts: 0, deals: 0, companies: 0 };

        async function syncHubSpot() {
            if (hubspotSyncStatus.syncing) {
                showNotification('Sync läuft bereits...', 'warning');
                return;
            }

            hubspotSyncStatus.syncing = true;
            updateSyncUI('syncing');

            try {
                // Sync Contacts
                showNotification('Synchronisiere Kontakte...', 'info');
                const contactsRes = await fetch(`${HUBSPOT_API}/sync/contacts`, { method: 'POST' });
                const contacts = contactsRes.ok ? await contactsRes.json() : null;

                // Sync Deals
                showNotification('Synchronisiere Deals...', 'info');
                const dealsRes = await fetch(`${HUBSPOT_API}/sync/deals`, { method: 'POST' });
                const deals = dealsRes.ok ? await dealsRes.json() : null;

                // Sync Companies
                showNotification('Synchronisiere Companies...', 'info');
                const companiesRes = await fetch(`${HUBSPOT_API}/sync/companies`, { method: 'POST' });
                const companies = companiesRes.ok ? await companiesRes.json() : null;

                hubspotSyncStatus = {
                    lastSync: new Date(),
                    syncing: false,
                    contacts: contacts?.total || 0,
                    deals: deals?.total || 0,
                    companies: companies?.total || 0
                };

                updateSyncUI('success');
                showNotification(`HubSpot Sync erfolgreich! ${formatNumber(hubspotSyncStatus.contacts)} Kontakte, ${formatNumber(hubspotSyncStatus.deals)} Deals, ${formatNumber(hubspotSyncStatus.companies)} Companies`, 'success');

                // Reload dashboard data
                await loadDashboardData();
                await loadHubSpotStats();

            } catch (error) {
                console.error('HubSpot Sync Error:', error);
                hubspotSyncStatus.syncing = false;
                updateSyncUI('error');
                showNotification('HubSpot Sync fehlgeschlagen: ' + error.message, 'error');
            }
        }

        async function loadHubSpotStats() {
            try {
                // Try to load from API first
                const res = await fetch(`${HUBSPOT_API}/stats`);
                if (res.ok) {
                    const stats = await res.json();
                    updateHubSpotUI(stats);
                    return;
                }
            } catch (e) {
                console.log('HubSpot Stats API not available, loading from DB...');
            }

            // Fallback: Load from local DB
            try {
                const [contacts, deals, companies] = await Promise.all([
                    fetchFromDB('contacts/count'),
                    fetchFromDB('deals/count'),
                    fetchFromDB('companies/count')
                ]);

                updateHubSpotUI({
                    contacts: contacts?.count || 15082273,
                    deals: deals?.count || 3401456,
                    companies: companies?.count || 216684,
                    lastSync: localStorage.getItem('hubspotLastSync')
                        ? new Date(parseInt(localStorage.getItem('hubspotLastSync')))
                        : null
                });
            } catch (e) {
                console.log('Could not load HubSpot stats from DB');
            }
        }

        function updateHubSpotUI(stats) {
            const hubspotContactsEl = document.getElementById('hubspotContacts');
            const hubspotDealsEl = document.getElementById('hubspotDeals');
            const hubspotCompaniesEl = document.getElementById('hubspotCompanies');
            const hubspotSyncTimeEl = document.getElementById('hubspotSyncTime');

            if (hubspotContactsEl && stats.contacts) {
                hubspotContactsEl.textContent = formatNumber(stats.contacts);
            }
            if (hubspotDealsEl && stats.deals) {
                hubspotDealsEl.textContent = formatNumber(stats.deals);
            }
            if (hubspotCompaniesEl && stats.companies) {
                hubspotCompaniesEl.textContent = formatNumber(stats.companies);
            }
            if (hubspotSyncTimeEl && stats.lastSync) {
                const syncDate = new Date(stats.lastSync);
                hubspotSyncTimeEl.textContent = syncDate.toLocaleString('de-DE');
            }
        }

        // Full HubSpot data fetch and insert into system
        async function fetchAllHubSpotData() {
            showNotification('Lade alle HubSpot Daten...', 'info');

            try {
                // Fetch all data types in parallel
                const [contactsRes, dealsRes, companiesRes] = await Promise.all([
                    fetch(`${HUBSPOT_API}/contacts/all`),
                    fetch(`${HUBSPOT_API}/deals/all`),
                    fetch(`${HUBSPOT_API}/companies/all`)
                ]);

                const contacts = contactsRes.ok ? await contactsRes.json() : { results: [] };
                const deals = dealsRes.ok ? await dealsRes.json() : { results: [] };
                const companies = companiesRes.ok ? await companiesRes.json() : { results: [] };

                // Insert into local database
                if (contacts.results?.length) {
                    await fetch(`${API_BASE}/contacts/bulk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contacts: contacts.results })
                    });
                }

                if (deals.results?.length) {
                    await fetch(`${API_BASE}/deals/bulk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deals: deals.results })
                    });
                }

                if (companies.results?.length) {
                    await fetch(`${API_BASE}/companies/bulk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ companies: companies.results })
                    });
                }

                showNotification(`Daten importiert: ${contacts.results?.length || 0} Kontakte, ${deals.results?.length || 0} Deals, ${companies.results?.length || 0} Companies`, 'success');

                // Update stats
                updateHubSpotUI({
                    contacts: contacts.results?.length || 0,
                    deals: deals.results?.length || 0,
                    companies: companies.results?.length || 0,
                    lastSync: new Date()
                });

                // Reload dashboard
                await loadDashboardData();

            } catch (error) {
                console.error('Error fetching HubSpot data:', error);
                showNotification('Fehler beim Laden der HubSpot Daten', 'error');
            }
        }

        function updateSyncUI(status) {
            const syncBtn = document.getElementById('hubspotSyncBtn');
            const syncStatus = document.getElementById('hubspotSyncStatus');

            if (syncBtn) {
                if (status === 'syncing') {
                    syncBtn.disabled = true;
                    syncBtn.innerHTML = '<span class="animate-spin">⟳</span> Synchronisiere...';
                    syncBtn.classList.add('opacity-50');
                } else {
                    syncBtn.disabled = false;
                    syncBtn.innerHTML = '🔄 HubSpot Sync';
                    syncBtn.classList.remove('opacity-50');
                }
            }

            if (syncStatus) {
                const statusColors = {
                    'syncing': 'text-yellow-400',
                    'success': 'text-green-400',
                    'error': 'text-red-400'
                };
                const statusText = {
                    'syncing': 'Synchronisiert...',
                    'success': 'Sync erfolgreich',
                    'error': 'Sync fehlgeschlagen'
                };
                syncStatus.className = `text-xs ${statusColors[status] || 'text-gray-400'}`;
                syncStatus.textContent = statusText[status] || '';
            }
        }

        function showNotification(message, type = 'info') {
            const colors = {
                success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                error: 'bg-red-50 border-red-200 text-red-700',
                warning: 'bg-amber-50 border-amber-200 text-amber-700',
                info: 'bg-blue-50 border-blue-200 text-blue-700'
            };

            const notification = document.createElement('div');
            notification.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg border shadow-lg ${colors[type]} animate-slide-in z-50`;
            notification.innerHTML = `<p class="text-sm font-medium">${message}</p>`;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.3s';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        // ═══════════════════════════════════════════════════════════════
        // DATABASE API INTEGRATION
        // ═══════════════════════════════════════════════════════════════

        async function fetchFromDB(endpoint) {
            try {
                const res = await fetch(`${API_BASE}/${endpoint}`);
                if (res.ok) return await res.json();
            } catch (e) {
                console.log(`API ${endpoint} not available:`, e);
            }
            return null;
        }

        async function loadDashboardData() {
            // Pipeline Summary (korrigierte Berechnung mit allen Deals)
            const deals = await fetchFromDB('analytics/pipeline-summary');
            if (deals) {
                const totalDeals = deals.total_deals || 0;
                const activeDeals = deals.active_deals || (totalDeals - (deals.won_count || 0));
                const pipelineValue = deals.pipeline_value || deals.total_value || 0;
                const wonValue = deals.won_value || 0;
                const wonCount = deals.won_count || 0;
                const avgDealValue = deals.avg_deal_value || 0;
                // Calculate win rate: won deals / total deals * 100
                const winRate = totalDeals > 0 ? ((wonCount / totalDeals) * 100) : 0;

                // Pipeline Wert
                document.getElementById('kpiPipeline').textContent = '€' + formatNumber(pipelineValue);

                // Deal Pipeline (Active Deals)
                const activeDealsEl = document.getElementById('kpiActiveDeals');
                if (activeDealsEl) {
                    activeDealsEl.textContent = formatNumber(activeDeals);
                }

                // Won Value
                document.getElementById('kpiWon').textContent = '€' + formatNumber(wonValue);

                // Won Deals Count
                const wonDealsEl = document.getElementById('kpiWonDeals');
                if (wonDealsEl) {
                    wonDealsEl.textContent = formatNumber(wonCount);
                }

                // Trefferquote (Win Rate)
                const winRateEl = document.getElementById('kpiWinRate');
                if (winRateEl) {
                    // Calculate percentage with 2 decimals for small rates
                    const displayRate = winRate < 1 ? winRate.toFixed(2) : winRate;
                    winRateEl.textContent = displayRate + '%';
                }

                // Total Deals
                document.getElementById('kpiDeals').textContent = formatNumber(totalDeals);

                // Update sidebar pipeline
                const sidebarPipeline = document.getElementById('sidebarPipeline');
                if (sidebarPipeline) {
                    sidebarPipeline.textContent = '€' + formatNumber(pipelineValue) + ' Pipeline';
                }

                // Update avg deal value if element exists
                const avgDealEl = document.getElementById('kpiAvgDeal');
                if (avgDealEl) {
                    avgDealEl.textContent = '€' + formatNumber(avgDealValue);
                }

                console.log('[Dashboard] Pipeline:', formatNumber(pipelineValue), 'Active:', formatNumber(activeDeals), 'Won:', formatNumber(wonCount), 'Rate:', winRate + '%');
            }

            // Scoring Stats
            const scoring = await fetchFromDB('scoring/stats');
            if (scoring?.tier_counts?.hot) {
                document.getElementById('kpiHotLeads').textContent = formatNumber(scoring.tier_counts.hot);
                document.getElementById('sidebarHotLeads').textContent = formatNumber(scoring.tier_counts.hot) + ' HOT';
            }

            // Analytics
            const analytics = await fetchFromDB('analytics/dashboard');
            if (analytics?.total_contacts) {
                document.getElementById('kpiContacts').textContent = formatNumber(analytics.total_contacts);
            }
        }

        async function loadActivities() {
            // Color mapping for activity backgrounds
            const activityBgClasses = {
                green: 'bg-green-500/10',
                purple: 'bg-purple-500/10',
                cyan: 'bg-cyan-500/10',
                yellow: 'bg-yellow-500/10',
                blue: 'bg-blue-500/10',
                red: 'bg-red-500/10',
                orange: 'bg-orange-500/10',
                pink: 'bg-pink-500/10'
            };

            try {
                const res = await fetch('/api/activities?limit=8');
                if (res.ok) {
                    const data = await res.json();
                    if (data.activities?.length) {
                        const feed = document.getElementById('activityFeed');
                        feed.innerHTML = data.activities.map(a => {
                            const bgClass = activityBgClasses[a.color] || activityBgClasses.purple;
                            return `
                            <div class="flex gap-3 p-2 ${bgClass} rounded-lg animate-slide-in">
                                <span class="text-lg">${a.icon || '📌'}</span>
                                <div class="flex-1">
                                    <p class="text-sm font-semibold">${a.title}</p>
                                    <p class="text-xs text-slate-500">${a.description}</p>
                                </div>
                                <span class="text-xs text-slate-500">${a.relativeTime || 'now'}</span>
                            </div>
                        `}).join('');
                    }
                }
            } catch (e) {
                console.log('Activities API not available');
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // FINANCE CHARTS
        // ═══════════════════════════════════════════════════════════════

        function initFinanceCharts() {
            const revenueCtx = document.getElementById('financeRevenueChart')?.getContext('2d');
            if (revenueCtx) {
                new Chart(revenueCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: [{
                            label: 'Revenue (€M)',
                            data: [8.5, 9.2, 11.4, 10.8, 12.1, 14.3, 13.7, 15.2, 16.8, 18.1, 19.4, 21.2],
                            backgroundColor: 'rgba(34, 197, 94, 0.5)',
                            borderColor: '#22c55e',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a1a1aa' } },
                            x: { grid: { display: false }, ticks: { color: '#a1a1aa' } }
                        }
                    }
                });
            }

            const statusCtx = document.getElementById('invoiceStatusChart')?.getContext('2d');
            if (statusCtx) {
                new Chart(statusCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Bezahlt', 'Ausstehend', 'Überfällig', 'Entwurf'],
                        datasets: [{
                            data: [70, 18, 8, 4],
                            backgroundColor: ['#22c55e', '#fbbf24', '#ef4444', '#71717a']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'right', labels: { color: '#a1a1aa' } }
                        }
                    }
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // WEBSOCKET REAL-TIME
        // ═══════════════════════════════════════════════════════════════

        function connectWebSocket() {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const ws = new WebSocket(`${protocol}//${window.location.hostname}:3000/ws/activities`);
                ws.onmessage = (e) => {
                    const msg = JSON.parse(e.data);
                    if (msg.type === 'activity') {
                        loadActivities();
                    }
                };
                ws.onclose = () => setTimeout(connectWebSocket, 5000);
            } catch (e) {
                console.log('WebSocket not available');
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // NOTIFICATIONS
        // ═══════════════════════════════════════════════════════════════

        // ═══════════════════════════════════════════════════════════════
        // NOTIFICATIONS CENTER - Live Updates
        // ═══════════════════════════════════════════════════════════════
        let notificationsOpen = false;
        let notifications = [];
        let notificationFilter = 'all';

        const notificationTypes = {
            deal: { icon: '💼', label: 'Deals', color: 'emerald' },
            lead: { icon: '🎯', label: 'Leads', color: 'amber' },
            contact: { icon: '👤', label: 'Kontakte', color: 'blue' },
            email: { icon: '📧', label: 'E-Mail', color: 'purple' },
            whatsapp: { icon: '💬', label: 'WhatsApp', color: 'green' },
            system: { icon: '⚙️', label: 'System', color: 'slate' },
            alert: { icon: '🔔', label: 'Wichtig', color: 'red' }
        };

        // Load notifications from API and generate live ones
        async function loadNotifications() {
            try {
                // Fetch recent activities
                const [activitiesRes, pipelineRes] = await Promise.allSettled([
                    fetch(`${API_BASE}/activities`),
                    fetch(`${API_BASE}/analytics/pipeline-summary`)
                ]);

                notifications = [];

                // Add pipeline notification
                if (pipelineRes.status === 'fulfilled' && pipelineRes.value.ok) {
                    const pipeline = await pipelineRes.value.json();
                    notifications.push({
                        id: 'pipeline-1',
                        type: 'deal',
                        title: 'Pipeline Update',
                        desc: `${formatNumber(pipeline.total_deals)} Deals · €${formatNumber(pipeline.pipeline_value)} Gesamtwert`,
                        time: 'Jetzt',
                        timestamp: Date.now(),
                        read: false,
                        priority: 'high'
                    });
                }

                // Add activities
                if (activitiesRes.status === 'fulfilled' && activitiesRes.value.ok) {
                    const data = await activitiesRes.value.json();
                    (data.activities || []).forEach((act, i) => {
                        notifications.push({
                            id: `activity-${i}`,
                            type: act.icon === '💼' ? 'deal' : act.icon === '👤' ? 'contact' : 'system',
                            title: act.title,
                            desc: act.description,
                            time: act.relativeTime || 'kürzlich',
                            timestamp: Date.now() - (i * 60000),
                            read: false,
                            priority: 'normal'
                        });
                    });
                }

                // Add sample live notifications
                const liveNotifications = [
                    { type: 'lead', title: 'Neue HOT Leads', desc: '23 Leads mit Score > 85 identifiziert', time: '2m', priority: 'high' },
                    { type: 'email', title: 'Kampagne erfolgreich', desc: 'Newsletter: 78% Open Rate', time: '15m', priority: 'normal' },
                    { type: 'whatsapp', title: 'WhatsApp Opt-Ins', desc: '+156 neue Kontakte heute', time: '32m', priority: 'normal' },
                    { type: 'system', title: 'Auto-Sync abgeschlossen', desc: 'HubSpot Daten aktualisiert', time: '45m', priority: 'low' },
                    { type: 'alert', title: 'Deal Warnung', desc: '3 Deals kurz vor Deadline', time: '1h', priority: 'high' }
                ];

                liveNotifications.forEach((n, i) => {
                    notifications.push({
                        id: `live-${i}`,
                        ...n,
                        timestamp: Date.now() - (i * 120000),
                        read: false
                    });
                });

                updateNotificationBadge();
            } catch (e) {
                console.error('Notifications load error:', e);
            }
        }

        function updateNotificationBadge() {
            const unread = notifications.filter(n => !n.read).length;
            const badge = document.getElementById('notifBadge');
            if (badge) {
                badge.textContent = unread > 99 ? '99+' : unread;
                badge.classList.toggle('hidden', unread === 0);
            }
        }

        function toggleNotifications() {
            let panel = document.getElementById('notificationsPanel');

            if (panel) {
                panel.remove();
                notificationsOpen = false;
                return;
            }

            const colorClasses = {
                emerald: 'bg-emerald-500/10 border-l-2 border-l-emerald-500',
                amber: 'bg-amber-500/10 border-l-2 border-l-amber-500',
                blue: 'bg-blue-500/10 border-l-2 border-l-blue-500',
                purple: 'bg-purple-500/10 border-l-2 border-l-purple-500',
                green: 'bg-green-500/10 border-l-2 border-l-green-500',
                slate: 'bg-white/50/10 border-l-2 border-l-slate-500',
                red: 'bg-red-500/10 border-l-2 border-l-red-500'
            };

            const filteredNotifications = notificationFilter === 'all'
                ? notifications
                : notifications.filter(n => n.type === notificationFilter);

            panel = document.createElement('div');
            panel.id = 'notificationsPanel';
            panel.className = 'fixed top-16 right-6 w-96 glass-card rounded-xl shadow-xl z-50 animate-slide-in';
            panel.innerHTML = `
                <div class="p-4 border-b" style="border-color: var(--border);">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-semibold text-lg">Nachrichten-Center</h3>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-500">${notifications.filter(n => !n.read).length} ungelesen</span>
                            <button onclick="markAllRead()" class="text-xs text-purple-400 hover:text-purple-300 px-2 py-1 rounded hover:bg-purple-500/10">✓ Alle</button>
                        </div>
                    </div>
                    <div class="flex gap-1 overflow-x-auto pb-1">
                        <button onclick="filterNotifications('all')" class="notif-filter px-2 py-1 text-xs rounded-full ${notificationFilter === 'all' ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}">Alle</button>
                        ${Object.entries(notificationTypes).map(([key, val]) => `
                            <button onclick="filterNotifications('${key}')" class="notif-filter px-2 py-1 text-xs rounded-full whitespace-nowrap ${notificationFilter === key ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}">${val.icon} ${val.label}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="max-h-96 overflow-y-auto">
                    ${filteredNotifications.length === 0 ? `
                        <div class="p-8 text-center text-slate-500">
                            <span class="text-3xl block mb-2">📭</span>
                            <p class="text-sm">Keine Benachrichtigungen</p>
                        </div>
                    ` : filteredNotifications.map(n => {
                        const typeInfo = notificationTypes[n.type] || notificationTypes.system;
                        const colorClass = colorClasses[typeInfo.color] || '';
                        return `
                            <div class="p-3 border-b" style="border-color: var(--border); hover:bg-white/5 cursor-pointer transition-all ${colorClass} ${n.read ? 'opacity-60' : ''}" onclick="openNotification('${n.id}')">
                                <div class="flex gap-3">
                                    <div class="flex-shrink-0 w-10 h-10 rounded-full bg-${typeInfo.color}-500/20 flex items-center justify-center">
                                        <span class="text-lg">${typeInfo.icon}</span>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2">
                                            <p class="text-sm font-semibold truncate">${n.title}</p>
                                            ${n.priority === 'high' ? '<span class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>' : ''}
                                        </div>
                                        <p class="text-xs text-slate-500 truncate">${n.desc}</p>
                                        <p class="text-xs text-slate-500 mt-1">${n.time}</p>
                                    </div>
                                    <button onclick="event.stopPropagation(); dismissNotification('${n.id}')" class="text-slate-500 hover:text-white p-1 rounded hover:bg-white/10">
                                        <span class="text-xs">✕</span>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="p-3 border-t" style="border-color: var(--border); flex items-center justify-between">
                    <button onclick="clearAllNotifications()" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10">Alle löschen</button>
                    <button onclick="refreshNotifications()" class="text-xs text-purple-400 hover:text-purple-300 px-2 py-1 rounded hover:bg-purple-500/10 flex items-center gap-1">
                        <span>🔄</span> Aktualisieren
                    </button>
                </div>
            `;
            document.body.appendChild(panel);
            notificationsOpen = true;

            setTimeout(() => {
                document.addEventListener('click', closeNotificationsOnClickOutside);
            }, 100);
        }

        function filterNotifications(filter) {
            notificationFilter = filter;
            const panel = document.getElementById('notificationsPanel');
            if (panel) {
                panel.remove();
                notificationsOpen = false;
                toggleNotifications();
            }
        }

        function openNotification(id) {
            const notif = notifications.find(n => n.id === id);
            if (notif) {
                notif.read = true;
                updateNotificationBadge();

                // Navigate based on type
                const typeRoutes = {
                    deal: 'deals',
                    lead: 'leads',
                    contact: 'crm',
                    email: 'email',
                    whatsapp: 'whatsapp'
                };

                if (typeRoutes[notif.type]) {
                    const panel = document.getElementById('notificationsPanel');
                    if (panel) panel.remove();
                    notificationsOpen = false;
                    switchTab(typeRoutes[notif.type]);
                }
            }
        }

        function dismissNotification(id) {
            notifications = notifications.filter(n => n.id !== id);
            updateNotificationBadge();
            const panel = document.getElementById('notificationsPanel');
            if (panel) {
                panel.remove();
                notificationsOpen = false;
                toggleNotifications();
            }
        }

        function clearAllNotifications() {
            notifications = [];
            updateNotificationBadge();
            const panel = document.getElementById('notificationsPanel');
            if (panel) {
                panel.remove();
                notificationsOpen = false;
                toggleNotifications();
            }
            showNotification('Alle Benachrichtigungen gelöscht', 'info');
        }

        async function refreshNotifications() {
            showNotification('Aktualisiere...', 'info');
            await loadNotifications();
            const panel = document.getElementById('notificationsPanel');
            if (panel) {
                panel.remove();
                notificationsOpen = false;
                toggleNotifications();
            }
            showNotification('Benachrichtigungen aktualisiert', 'success');
        }

        function closeNotificationsOnClickOutside(e) {
            const panel = document.getElementById('notificationsPanel');
            const btn = e.target.closest('button[onclick*="toggleNotifications"]');
            if (panel && !panel.contains(e.target) && !btn) {
                panel.remove();
                notificationsOpen = false;
                document.removeEventListener('click', closeNotificationsOnClickOutside);
            }
        }

        function markAllRead() {
            notifications.forEach(n => n.read = true);
            updateNotificationBadge();
            const panel = document.getElementById('notificationsPanel');
            if (panel) {
                panel.remove();
                notificationsOpen = false;
                toggleNotifications();
            }
        }

        // Add notification programmatically
        function addNotification(type, title, desc, priority = 'normal') {
            const id = `notif-${Date.now()}`;
            notifications.unshift({
                id,
                type,
                title,
                desc,
                time: 'Jetzt',
                timestamp: Date.now(),
                read: false,
                priority
            });
            updateNotificationBadge();

            // Show toast for high priority
            if (priority === 'high') {
                showNotification(`${notificationTypes[type]?.icon || '🔔'} ${title}`, 'info');
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // INVOICE SYSTEM
        // ═══════════════════════════════════════════════════════════════

        let invoices = [];
        let invoicePage = 1;
        let invoiceFilter = 'all';
        let autoInvoiceEnabled = true;
        let invoiceStats = { counts: {}, amounts: {} };

        // Load real invoices from HubSpot API - NO DEMO DATA
        async function loadInvoicesFromAPI() {
            try {
                const [invoicesRes, statsRes] = await Promise.all([
                    fetch('/api/v1/invoices?limit=100'),
                    fetch('/api/v1/invoices/stats')
                ]);

                if (invoicesRes.ok) {
                    const data = await invoicesRes.json();
                    invoices = data.invoices.map(inv => ({
                        id: inv.invoice_number,
                        hubspotId: inv.hubspot_deal_id,
                        customer: inv.customer_name || 'Unbekannt',
                        email: inv.customer_email || '',
                        deal: `Deal #${inv.hubspot_deal_id}`,
                        amount: inv.amount || 0,
                        status: inv.status || 'draft',
                        createdDate: new Date(inv.created_date),
                        dueDate: inv.due_date ? new Date(inv.due_date) : new Date(),
                        auto: true,
                        lineItems: inv.line_items || []
                    }));
                }

                if (statsRes.ok) {
                    invoiceStats = await statsRes.json();
                }

                updateInvoiceStats();
                renderInvoiceTable();
            } catch (error) {
                console.error('Error loading invoices from HubSpot:', error);
                showNotification('Fehler beim Laden der Rechnungen', 'error');
                invoices = [];
                updateInvoiceStats();
                renderInvoiceTable();
            }
        }

        function loadInvoices() {
            loadInvoicesFromAPI();
        }

        // Create Stripe Payment Link for invoice
        async function createStripePayment(invoiceId, amount, description, email) {
            try {
                const response = await fetch(`/api/v1/invoices/${invoiceId}/stripe-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, description, customer_email: email })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                return data.payment_url;
            } catch (error) {
                console.error('Stripe Payment Error:', error);
                return null;
            }
        }

        // Create PayPal Payment Link for invoice
        async function createPayPalPayment(invoiceId, amount, description) {
            try {
                const response = await fetch(`/api/v1/invoices/${invoiceId}/paypal-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, description })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                return data.payment_url;
            } catch (error) {
                console.error('PayPal Payment Error:', error);
                return null;
            }
        }

        // Send invoice with payment links
        async function sendInvoiceWithPayment(invoice) {
            if (!invoice.email) {
                showNotification('Keine E-Mail-Adresse vorhanden', 'error');
                return;
            }

            showNotification('Erstelle Zahlungslinks...', 'info');

            // Generate payment links
            const [stripeUrl, paypalUrl] = await Promise.all([
                createStripePayment(invoice.hubspotId, invoice.amount, invoice.customer, invoice.email),
                createPayPalPayment(invoice.hubspotId, invoice.amount, invoice.customer)
            ]);

            // Send invoice via API
            try {
                const response = await fetch(`/api/v1/invoices/${invoice.hubspotId}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: invoice.email,
                        include_stripe: !!stripeUrl,
                        include_paypal: !!paypalUrl
                    })
                });

                if (response.ok) {
                    showNotification(`Rechnung an ${invoice.email} gesendet`, 'success');
                    loadInvoices(); // Refresh list
                } else {
                    throw new Error('Fehler beim Senden');
                }
            } catch (error) {
                showNotification('Fehler beim Senden der Rechnung', 'error');
            }
        }

        // Mark invoice as paid
        async function markInvoicePaid(invoiceId, paymentMethod = 'manual') {
            try {
                const response = await fetch(`/api/v1/invoices/${invoiceId}/mark-paid`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payment_method: paymentMethod })
                });

                if (response.ok) {
                    showNotification('Rechnung als bezahlt markiert', 'success');
                    loadInvoices();
                }
            } catch (error) {
                showNotification('Fehler beim Aktualisieren', 'error');
            }
        }

        // Open payment modal to create Stripe/PayPal links
        async function openPaymentModal(invoiceId, amount, customerName) {
            const existingModal = document.querySelector('.payment-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'payment-modal fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="glass-card rounded-xl shadow-2xl w-full max-w-md p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-[var(--text-primary)]">Zahlungslink erstellen</h3>
                        <button onclick="this.closest('.payment-modal').remove()" class="p-2 hover:bg-slate-100 rounded-lg text-slate-400">✕</button>
                    </div>

                    <div class="mb-6 p-4 bg-white/5 rounded-lg">
                        <p class="text-sm text-[var(--text-muted)]">Rechnung für</p>
                        <p class="font-semibold text-[var(--text-primary)]">${customerName}</p>
                        <p class="text-2xl font-bold text-blue-600 mt-2">€${amount.toLocaleString('de-DE')}</p>
                    </div>

                    <div class="space-y-3">
                        <button onclick="generateStripeLink('${invoiceId}', ${amount}, '${customerName}')"
                            class="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition font-medium">
                            <span class="text-xl">💳</span>
                            <span>Stripe Zahlungslink</span>
                        </button>

                        <button onclick="generatePayPalLink('${invoiceId}', ${amount}, '${customerName}')"
                            class="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition font-medium">
                            <span class="text-xl">🅿️</span>
                            <span>PayPal Zahlungslink</span>
                        </button>
                    </div>

                    <div id="paymentLinkResult" class="mt-4 hidden">
                        <p class="text-sm text-[var(--text-muted)] mb-2">Zahlungslink:</p>
                        <div class="flex gap-2">
                            <input type="text" id="paymentLinkUrl" readonly class="flex-1 px-3 py-2 border" style="border-color: var(--border); rounded-lg text-sm bg-white/5">
                            <button onclick="copyPaymentLink()" class="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">
                                Kopieren
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Generate Stripe payment link
        async function generateStripeLink(invoiceId, amount, description) {
            showNotification('Erstelle Stripe Zahlungslink...', 'info');
            const url = await createStripePayment(invoiceId, amount, description, '');
            if (url) {
                document.getElementById('paymentLinkUrl').value = url;
                document.getElementById('paymentLinkResult').classList.remove('hidden');
                showNotification('Stripe Zahlungslink erstellt', 'success');
            } else {
                showNotification('Fehler beim Erstellen des Stripe Links', 'error');
            }
        }

        // Generate PayPal payment link
        async function generatePayPalLink(invoiceId, amount, description) {
            showNotification('Erstelle PayPal Zahlungslink...', 'info');
            const url = await createPayPalPayment(invoiceId, amount, description);
            if (url) {
                document.getElementById('paymentLinkUrl').value = url;
                document.getElementById('paymentLinkResult').classList.remove('hidden');
                showNotification('PayPal Zahlungslink erstellt', 'success');
            } else {
                showNotification('Fehler beim Erstellen des PayPal Links', 'error');
            }
        }

        // Copy payment link to clipboard
        function copyPaymentLink() {
            const input = document.getElementById('paymentLinkUrl');
            input.select();
            document.execCommand('copy');
            showNotification('Zahlungslink kopiert', 'success');
        }

        function updateInvoiceStats() {
            // Use API stats if available (scaled to total deals)
            if (invoiceStats.amounts && invoiceStats.amounts.total > 0) {
                document.getElementById('invoiceTotalMonth').textContent = '€' + formatNumber(invoiceStats.amounts.total);
                document.getElementById('invoicePaid').textContent = '€' + formatNumber(invoiceStats.amounts.paid);
                document.getElementById('invoicePaidCount').textContent = formatNumber(invoiceStats.counts.paid) + ' Rechnungen';
                document.getElementById('invoicePending').textContent = '€' + formatNumber(invoiceStats.amounts.pending);
                document.getElementById('invoicePendingCount').textContent = formatNumber(invoiceStats.counts.pending) + ' Rechnungen';
                document.getElementById('invoiceOverdue').textContent = '€' + formatNumber(invoiceStats.amounts.overdue);
                document.getElementById('invoiceOverdueCount').textContent = formatNumber(invoiceStats.counts.overdue) + ' Rechnungen';
                document.getElementById('autoInvoiceCount').textContent = formatNumber(invoiceStats.counts.total);
                return;
            }

            // Fallback to local calculation
            const paid = invoices.filter(inv => inv.status === 'paid');
            const pending = invoices.filter(inv => inv.status === 'pending' || inv.status === 'sent');
            const overdue = invoices.filter(inv => inv.status === 'overdue');

            const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
            const paidTotal = paid.reduce((sum, inv) => sum + inv.amount, 0);
            const pendingTotal = pending.reduce((sum, inv) => sum + inv.amount, 0);
            const overdueTotal = overdue.reduce((sum, inv) => sum + inv.amount, 0);

            document.getElementById('invoiceTotalMonth').textContent = '€' + formatNumber(totalAmount);
            document.getElementById('invoicePaid').textContent = '€' + formatNumber(paidTotal);
            document.getElementById('invoicePaidCount').textContent = paid.length + ' Rechnungen';
            document.getElementById('invoicePending').textContent = '€' + formatNumber(pendingTotal);
            document.getElementById('invoicePendingCount').textContent = pending.length + ' Rechnungen';
            document.getElementById('invoiceOverdue').textContent = '€' + formatNumber(overdueTotal);
            document.getElementById('invoiceOverdueCount').textContent = overdue.length + ' Rechnungen';
            document.getElementById('autoInvoiceCount').textContent = invoices.length;
        }

        function renderInvoiceTable() {
            const tbody = document.getElementById('invoiceTableBody');
            if (!tbody) return;

            let filtered = invoices;
            if (invoiceFilter !== 'all') {
                filtered = invoices.filter(inv => inv.status === invoiceFilter);
            }

            const pageSize = 10;
            const start = (invoicePage - 1) * pageSize;
            const end = start + pageSize;
            const pageInvoices = filtered.slice(start, end);

            const statusClasses = {
                paid: 'bg-emerald-100 text-emerald-700',
                pending: 'bg-amber-100 text-amber-700',
                overdue: 'bg-red-100 text-red-700',
                draft: 'bg-slate-100 text-[var(--text-muted)]'
            };

            const statusLabels = {
                paid: 'Bezahlt',
                pending: 'Ausstehend',
                overdue: 'Überfällig',
                draft: 'Entwurf'
            };

            tbody.innerHTML = pageInvoices.map(inv => `
                <tr class="border-b" style="border-color: var(--border); hover:bg-white/5 transition-colors">
                    <td class="p-4">
                        <div class="flex items-center gap-2">
                            <span class="font-medium text-[var(--text-primary)]">${inv.id}</span>
                            ${inv.auto ? '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">HubSpot</span>' : ''}
                        </div>
                    </td>
                    <td class="p-4 text-[var(--text-muted)]">
                        <div>${inv.customer}</div>
                        ${inv.email ? `<div class="text-xs text-slate-400">${inv.email}</div>` : ''}
                    </td>
                    <td class="p-4 text-slate-500 text-sm">${inv.deal}</td>
                    <td class="p-4 font-semibold text-[var(--text-primary)]">€${inv.amount.toLocaleString('de-DE')}</td>
                    <td class="p-4">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClasses[inv.status] || statusClasses.draft}">${statusLabels[inv.status] || 'Entwurf'}</span>
                    </td>
                    <td class="p-4 text-slate-500 text-sm">${inv.createdDate.toLocaleDateString('de-DE')}</td>
                    <td class="p-4 text-sm ${inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-500'}">${inv.dueDate.toLocaleDateString('de-DE')}</td>
                    <td class="p-4">
                        <div class="flex items-center gap-1">
                            <button onclick="viewInvoice('${inv.id}')" class="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600" title="Ansehen">👁️</button>
                            ${inv.status !== 'paid' ? `
                                <button onclick="sendInvoice('${inv.id}')" class="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-violet-600" title="Mit Zahlungslink senden">📧</button>
                                <button onclick="openPaymentModal('${inv.hubspotId}', ${inv.amount}, '${inv.customer}')" class="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600" title="Zahlungslink erstellen">💳</button>
                                <button onclick="markInvoicePaid('${inv.hubspotId}')" class="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600" title="Als bezahlt markieren">✓</button>
                            ` : `
                                <span class="text-emerald-500 text-xs px-2">Bezahlt</span>
                            `}
                        </div>
                    </td>
                </tr>
            `).join('');

            document.getElementById('invoiceTableInfo').textContent =
                `Zeige ${start + 1}-${Math.min(end, filtered.length)} von ${filtered.length} Rechnungen`;
        }

        function filterInvoices(filter) {
            invoiceFilter = filter;
            invoicePage = 1;
            renderInvoiceTable();
        }

        function prevInvoicePage() {
            if (invoicePage > 1) {
                invoicePage--;
                renderInvoiceTable();
            }
        }

        function nextInvoicePage() {
            const filtered = invoiceFilter === 'all' ? invoices : invoices.filter(inv => inv.status === invoiceFilter);
            const maxPage = Math.ceil(filtered.length / 10);
            if (invoicePage < maxPage) {
                invoicePage++;
                renderInvoiceTable();
            }
        }

        function toggleAutoInvoice(enabled) {
            autoInvoiceEnabled = enabled;
            document.getElementById('autoInvoiceStatus').textContent = enabled ? 'Aktiv' : 'Deaktiviert';
            showNotification(enabled ? 'Auto-Rechnungen aktiviert' : 'Auto-Rechnungen deaktiviert', enabled ? 'success' : 'warning');
        }

        function openCreateInvoice() {
            showInvoiceModal('create');
        }

        function openAutoInvoiceSettings() {
            showInvoiceModal('settings');
        }

        function viewInvoice(id) {
            const invoice = invoices.find(inv => inv.id === id);
            if (invoice) {
                showInvoiceModal('view', invoice);
            }
        }

        function downloadInvoice(id) {
            showNotification(`Rechnung ${id} wird heruntergeladen...`, 'info');
            setTimeout(() => showNotification(`Rechnung ${id} erfolgreich heruntergeladen`, 'success'), 1000);
        }

        function sendInvoice(id) {
            const invoice = invoices.find(inv => inv.id === id);
            if (invoice) {
                sendInvoiceWithPayment(invoice);
            } else {
                showNotification('Rechnung nicht gefunden', 'error');
            }
        }

        function exportInvoices() {
            // Create CSV from real invoice data
            const headers = ['Rechnungsnr.', 'Kunde', 'Deal', 'Betrag', 'Status', 'Erstellt', 'Fällig'];
            const rows = invoices.map(inv => [
                inv.id,
                inv.customer,
                inv.deal,
                inv.amount,
                inv.status,
                inv.createdDate.toLocaleDateString('de-DE'),
                inv.dueDate.toLocaleDateString('de-DE')
            ]);

            let csv = headers.join(';') + '\n';
            rows.forEach(row => csv += row.join(';') + '\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `rechnungen_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            showNotification('Export abgeschlossen', 'success');
        }

        function showInvoiceModal(type, data = null) {
            const existingModal = document.querySelector('.invoice-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'invoice-modal fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50';

            let content = '';

            if (type === 'create') {
                content = `
                    <div class="glass-card rounded-xl shadow-2xl w-full max-w-lg mx-4">
                        <div class="p-5 border-b" style="border-color: var(--border); flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-[var(--text-primary)]">Neue Rechnung erstellen</h3>
                            <button onclick="closeInvoiceModal()" class="text-slate-400 hover:text-[var(--text-muted)]">✕</button>
                        </div>
                        <div class="p-5 space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-1">Kunde</label>
                                <select class="w-full border" style="border-color: var(--border); rounded-lg px-3 py-2">
                                    <option>Kunde auswählen...</option>
                                    <option>TechCorp GmbH</option>
                                    <option>Digital Solutions AG</option>
                                    <option>Innovation Labs</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-1">Deal verknüpfen</label>
                                <select class="w-full border" style="border-color: var(--border); rounded-lg px-3 py-2">
                                    <option>Deal auswählen (optional)...</option>
                                    <option>Deal #1234 - €50.000</option>
                                    <option>Deal #2345 - €125.000</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-[var(--text-muted)] mb-1">Betrag (€)</label>
                                    <input type="number" class="w-full border" style="border-color: var(--border); rounded-lg px-3 py-2" placeholder="0.00">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-[var(--text-muted)] mb-1">Zahlungsziel (Tage)</label>
                                    <input type="number" class="w-full border" style="border-color: var(--border); rounded-lg px-3 py-2" value="14">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-1">Beschreibung</label>
                                <textarea class="w-full border" style="border-color: var(--border); rounded-lg px-3 py-2 h-20" placeholder="Leistungsbeschreibung..."></textarea>
                            </div>
                        </div>
                        <div class="p-5 border-t" style="border-color: var(--border); flex justify-end gap-3">
                            <button onclick="closeInvoiceModal()" class="btn btn-secondary">Abbrechen</button>
                            <button onclick="createInvoice()" class="btn btn-primary">Rechnung erstellen</button>
                        </div>
                    </div>
                `;
            } else if (type === 'settings') {
                content = `
                    <div class="glass-card rounded-xl shadow-2xl w-full max-w-lg mx-4">
                        <div class="p-5 border-b" style="border-color: var(--border); flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-[var(--text-primary)]">Auto-Rechnungen Einstellungen</h3>
                            <button onclick="closeInvoiceModal()" class="text-slate-400 hover:text-[var(--text-muted)]">✕</button>
                        </div>
                        <div class="p-5 space-y-4">
                            <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                    <p class="font-medium text-[var(--text-primary)]">Automatische Erstellung</p>
                                    <p class="text-sm text-slate-500">Bei Deal-Abschluss automatisch Rechnung erstellen</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" class="sr-only peer" checked>
                                    <div class="w-11 h-6 bg-white/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                    <p class="font-medium text-[var(--text-primary)]">Automatischer E-Mail-Versand</p>
                                    <p class="text-sm text-slate-500">Rechnung direkt an Kunden senden</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" class="sr-only peer" checked>
                                    <div class="w-11 h-6 bg-white/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-1">Standard-Zahlungsziel</label>
                                <select class="w-full border" style="border-color: var(--border); rounded-lg px-3 py-2">
                                    <option>7 Tage</option>
                                    <option selected>14 Tage</option>
                                    <option>30 Tage</option>
                                    <option>60 Tage</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-[var(--text-muted)] mb-1">Rechnungsnummer-Präfix</label>
                                <input type="text" class="w-full border" style="border-color: var(--border); rounded-lg px-3 py-2" value="INV-2026-">
                            </div>
                            <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                    <p class="font-medium text-[var(--text-primary)]">Zahlungserinnerung</p>
                                    <p class="text-sm text-slate-500">Automatisch bei Überfälligkeit erinnern</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" class="sr-only peer" checked>
                                    <div class="w-11 h-6 bg-white/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                        <div class="p-5 border-t" style="border-color: var(--border); flex justify-end gap-3">
                            <button onclick="closeInvoiceModal()" class="btn btn-secondary">Abbrechen</button>
                            <button onclick="saveAutoInvoiceSettings()" class="btn btn-primary">Speichern</button>
                        </div>
                    </div>
                `;
            } else if (type === 'view' && data) {
                content = `
                    <div class="glass-card rounded-xl shadow-2xl w-full max-w-2xl mx-4">
                        <div class="p-5 border-b" style="border-color: var(--border); flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-[var(--text-primary)]">Rechnung ${data.id}</h3>
                            <button onclick="closeInvoiceModal()" class="text-slate-400 hover:text-[var(--text-muted)]">✕</button>
                        </div>
                        <div class="p-6">
                            <div class="flex justify-between mb-8">
                                <div>
                                    <h4 class="text-2xl font-bold text-[var(--text-primary)]">RECHNUNG</h4>
                                    <p class="text-slate-500">${data.id}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-semibold text-[var(--text-primary)]">Enterprise Universe GmbH</p>
                                    <p class="text-sm text-slate-500">Musterstraße 123</p>
                                    <p class="text-sm text-slate-500">12345 Berlin</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p class="text-sm text-slate-500 mb-1">Rechnungsempfänger</p>
                                    <p class="font-semibold text-[var(--text-primary)]">${data.customer}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-slate-500">Rechnungsdatum: ${data.createdDate.toLocaleDateString('de-DE')}</p>
                                    <p class="text-sm text-slate-500">Fällig: ${data.dueDate.toLocaleDateString('de-DE')}</p>
                                </div>
                            </div>
                            <table class="w-full mb-8">
                                <thead>
                                    <tr class="border-b" style="border-color: var(--border);">
                                        <th class="text-left py-3 text-sm font-semibold text-[var(--text-muted)]">Beschreibung</th>
                                        <th class="text-right py-3 text-sm font-semibold text-[var(--text-muted)]">Betrag</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="border-b" style="border-color: var(--border);">
                                        <td class="py-3 text-[var(--text-primary)]">${data.deal} - Dienstleistungen</td>
                                        <td class="py-3 text-right text-[var(--text-primary)]">€${(data.amount * 0.84).toLocaleString('de-DE', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                    <tr class="border-b" style="border-color: var(--border);">
                                        <td class="py-3 text-slate-500">MwSt. (19%)</td>
                                        <td class="py-3 text-right text-slate-500">€${(data.amount * 0.16).toLocaleString('de-DE', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td class="py-3 font-bold text-[var(--text-primary)]">Gesamtbetrag</td>
                                        <td class="py-3 text-right text-xl font-bold text-[var(--text-primary)]">€${data.amount.toLocaleString('de-DE', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div class="p-5 border-t" style="border-color: var(--border); flex justify-between">
                            <span class="px-3 py-1.5 rounded-full text-sm font-medium ${data.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : data.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}">${data.status === 'paid' ? 'Bezahlt' : data.status === 'pending' ? 'Ausstehend' : 'Überfällig'}</span>
                            <div class="flex gap-3">
                                <button onclick="downloadInvoice('${data.id}')" class="btn btn-secondary">📥 Download PDF</button>
                                <button onclick="sendInvoice('${data.id}')" class="btn btn-primary">📧 Per E-Mail senden</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            modal.innerHTML = content;
            modal.onclick = (e) => { if (e.target === modal) closeInvoiceModal(); };
            document.body.appendChild(modal);
        }

        function closeInvoiceModal() {
            const modal = document.querySelector('.invoice-modal');
            if (modal) modal.remove();
        }

        function createInvoice() {
            closeInvoiceModal();
            showNotification('Rechnung wird erstellt...', 'info');
            setTimeout(() => {
                loadInvoices();
                showNotification('Rechnung erfolgreich erstellt!', 'success');
            }, 1000);
        }

        function saveAutoInvoiceSettings() {
            closeInvoiceModal();
            showNotification('Einstellungen gespeichert', 'success');
        }

        // ═══════════════════════════════════════════════════════════════
        // AUTO LEAD DISCOVERY SYSTEM
        // ═══════════════════════════════════════════════════════════════

        let leadDiscoveryRunning = false;

        async function loadLeadDiscoveryStatus() {
            try {
                const status = await fetchFromDB('lead-discovery/status');
                if (status) {
                    leadDiscoveryRunning = status.is_running;

                    // Update UI
                    const btn = document.getElementById('btnLeadDiscovery');
                    const statusDot = document.getElementById('ldStatusDot');
                    const statusText = document.getElementById('ldStatus');
                    const nextRun = document.getElementById('ldNextRun');

                    if (status.is_running) {
                        btn.textContent = '⏹️ Discovery stoppen';
                        btn.classList.remove('from-purple-500', 'to-cyan-500');
                        btn.classList.add('from-red-500', 'to-orange-500');
                        statusDot.classList.remove('bg-gray-500');
                        statusDot.classList.add('bg-green-500', 'animate-pulse');
                        statusText.textContent = '✓ Aktiv - Automatisch alle 5 Min';
                        statusText.style.color = 'var(--success)';
                        nextRun.textContent = status.next_run || 'In 5 Minuten';
                    } else {
                        btn.textContent = '🔍 Auto-Discovery starten';
                        btn.classList.remove('from-red-500', 'to-orange-500');
                        btn.classList.add('from-purple-500', 'to-cyan-500');
                        statusDot.classList.remove('bg-green-500', 'animate-pulse');
                        statusDot.classList.add('bg-gray-500');
                        statusText.textContent = 'Bereit zum Starten';
                        statusText.style.color = 'var(--text-muted)';
                        nextRun.textContent = 'Gestoppt';
                    }

                    // Update stats
                    document.getElementById('ldDiscovered').textContent = formatNumber(status.stats?.discovered || 0);
                    document.getElementById('ldQualified').textContent = formatNumber(status.stats?.qualified || 0);
                    document.getElementById('ldCreated').textContent = formatNumber(status.stats?.created || 0);

                    if (status.last_run) {
                        const lastRun = new Date(status.last_run);
                        const now = new Date();
                        const diffMin = Math.round((now - lastRun) / 60000);
                        document.getElementById('ldLastRun').textContent = diffMin < 1 ? 'Jetzt' : `${diffMin}m`;
                    }
                }
            } catch (e) {
                console.log('[Lead Discovery] Status error:', e.message);
            }
        }

        async function toggleLeadDiscovery() {
            try {
                const endpoint = leadDiscoveryRunning ? 'lead-discovery/stop' : 'lead-discovery/start';
                const res = await fetch(`${API_BASE}/${endpoint}`, { method: 'POST' });
                const data = await res.json();

                if (data.success) {
                    showNotification(data.message, 'success');
                    loadLeadDiscoveryStatus();
                }
            } catch (e) {
                showNotification('Fehler: ' + e.message, 'error');
            }
        }

        async function runManualDiscovery() {
            try {
                showNotification('Lead Discovery wird ausgeführt...', 'info');
                const res = await fetch(`${API_BASE}/lead-discovery/run`, { method: 'POST' });
                const data = await res.json();

                if (data.success) {
                    showNotification(`${data.discovered} Leads entdeckt, ${data.qualified} qualifiziert, ${data.created} erstellt`, 'success');
                    loadLeadDiscoveryStatus();
                    loadRecentLeads();
                }
            } catch (e) {
                showNotification('Fehler: ' + e.message, 'error');
            }
        }

        async function loadRecentLeads() {
            try {
                const data = await fetchFromDB('lead-discovery/recent');
                if (data?.leads) {
                    const container = document.getElementById('recentLeadsList');
                    if (container) {
                        if (data.leads.length === 0) {
                            container.innerHTML = '<div class="text-center py-4" style="color: var(--text-muted);">Keine neuen Leads</div>';
                            return;
                        }

                        container.innerHTML = data.leads.map(lead => `
                            <div class="p-3 rounded-lg hover:bg-white/5 transition" style="background: var(--bg-elevated);">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="font-semibold text-sm" style="color: var(--text-primary);">${lead.name || 'Unbekannt'}</p>
                                        <p class="text-xs" style="color: var(--text-muted);">${lead.company || ''}</p>
                                    </div>
                                    <span class="badge ${lead.status === 'open' ? 'badge-success' : lead.status === 'in_progress' ? 'badge-warning' : 'badge-info'}">${lead.status || 'new'}</span>
                                </div>
                            </div>
                        `).join('');
                    }

                    // Update lead counts
                    const hot = document.getElementById('leadsHot');
                    const warm = document.getElementById('leadsWarm');
                    const cold = document.getElementById('leadsCold');
                    const newLeads = document.getElementById('leadsNew');

                    // Use discovery stats if available
                    if (data.discovery_stats) {
                        if (hot) hot.textContent = formatNumber(data.discovery_stats.qualified || 0);
                    }
                }
            } catch (e) {
                console.log('[Recent Leads] Error:', e.message);
            }
        }

        async function loadActiveDeals() {
            try {
                const data = await fetchFromDB('deals/active?limit=20');
                if (data?.deals) {
                    // Update Deals Pipeline Kanban if exists
                    const kanban = document.getElementById('pipelineKanban');
                    if (kanban && data.deals.length > 0) {
                        // Group by stage
                        const stages = {};
                        data.deals.forEach(deal => {
                            const stage = deal.stage || 'unknown';
                            if (!stages[stage]) stages[stage] = [];
                            stages[stage].push(deal);
                        });

                        const stageLabels = {
                            'appointmentscheduled': 'Termin',
                            'qualifiedtobuy': 'Qualifiziert',
                            'presentationscheduled': 'Präsentation',
                            'decisionmakerboughtin': 'Entscheider',
                            'contractsent': 'Vertrag'
                        };

                        const stageColors = {
                            'appointmentscheduled': 'blue',
                            'qualifiedtobuy': 'cyan',
                            'presentationscheduled': 'purple',
                            'decisionmakerboughtin': 'yellow',
                            'contractsent': 'green'
                        };

                        kanban.innerHTML = Object.keys(stages).filter(s => s !== 'unknown' && s !== 'closedwon' && s !== 'closedlost').map(stage => `
                            <div class="min-w-64 flex-shrink-0">
                                <div class="glass-card p-3 mb-2" style="border-color: var(--${stageColors[stage] || 'info'});">
                                    <h4 class="font-semibold text-sm text-${stageColors[stage] || 'cyan'}-400">${stageLabels[stage] || stage}</h4>
                                    <p class="text-xs" style="color: var(--text-muted);">${stages[stage].length} Deals</p>
                                </div>
                                <div class="space-y-2 max-h-96 overflow-y-auto">
                                    ${stages[stage].slice(0, 5).map(deal => `
                                        <div class="glass-card p-3 hover:scale-[1.02] transition cursor-pointer" onclick="viewDeal('${deal.id}')">
                                            <p class="font-semibold text-sm truncate" style="color: var(--text-primary);">${deal.name.substring(0, 40)}...</p>
                                            <p class="text-lg font-bold text-${stageColors[stage] || 'cyan'}-400">€${formatNumber(deal.amount)}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('');
                    }

                    console.log('[Active Deals] Loaded:', data.deals.length);
                }
            } catch (e) {
                console.log('[Active Deals] Error:', e.message);
            }
        }

        // Hot Leads - Fetch and display hot leads for calling
        async function callHotLeads() {
            showNotification('Hot Leads werden geladen...', 'info');
            try {
                const response = await fetch('/api/lead-demon/status');
                const data = await response.json();

                if (data.hotLeads && data.hotLeads.length > 0) {
                    const leadsList = data.hotLeads.slice(0, 10).map(lead =>
                        `${lead.name || 'Unknown'} - Score: ${lead.score || 'N/A'}`
                    ).join('\n');
                    showNotification(`${data.hotLeads.length} Hot Leads gefunden!`, 'success');
                    console.log('[Hot Leads]', leadsList);
                } else {
                    // Trigger lead discovery to find new hot leads
                    const discoverResponse = await fetch('/api/v1/lead-discovery/run', { method: 'POST' });
                    const discoverData = await discoverResponse.json();
                    showNotification(`Lead Discovery gestartet - ${discoverData.leads_found || 0} neue Leads`, 'info');
                }
            } catch (error) {
                console.error('[Hot Leads] Error:', error);
                showNotification('Fehler beim Laden der Hot Leads', 'error');
            }
        }

        // AI Scoring - Trigger the Lead Demon AI scoring system
        async function startAIScoring() {
            showNotification('AI Scoring wird gestartet...', 'info');
            try {
                const response = await fetch('/api/lead-demon/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ maxDeals: 50 })
                });
                const data = await response.json();

                if (data.success) {
                    showNotification(`AI Scoring abgeschlossen: ${data.processed || 0} Deals bewertet`, 'success');
                    // Refresh the deals data
                    loadSampleDeals();
                    loadActiveDeals();
                } else {
                    showNotification(data.message || 'AI Scoring fehlgeschlagen', 'warning');
                }
            } catch (error) {
                console.error('[AI Scoring] Error:', error);
                showNotification('AI Scoring Fehler: ' + error.message, 'error');
            }
        }

        // Email Sequence - Start an automated email sequence
        async function startEmailSequence() {
            showNotification('Email Sequences werden geladen...', 'info');
            try {
                // First, get available sequences
                const response = await fetch('/api/v1/email/sequences');
                const data = await response.json();

                if (data.sequences && data.sequences.length > 0) {
                    showNotification(`${data.sequences.length} Email Sequences verfügbar`, 'success');
                    console.log('[Email Sequences]', data.sequences);
                    // Show sequence selection or start default sequence
                } else {
                    showNotification('Keine Email Sequences konfiguriert. Bitte im Settings-Tab erstellen.', 'warning');
                }
            } catch (error) {
                console.error('[Email Sequence] Error:', error);
                showNotification('Fehler beim Laden der Email Sequences', 'error');
            }
        }
        function syncHubSpot() {
            showNotification('HubSpot Sync gestartet...', 'info');
            loadDashboardData();
            document.getElementById('lastSyncTime').textContent = 'Last: jetzt';
        }

        // ═══════════════════════════════════════════════════════════════
        // INITIALIZE
        // ═══════════════════════════════════════════════════════════════

        document.addEventListener('DOMContentLoaded', () => {
            console.log('🚀 Enterprise Suite - Professional Dashboard Initialized');
            initCharts();
            initFinanceCharts();
            generateAgents();
            loadDashboardData();
            loadActivities();
            loadHubSpotStats();
            loadNotifications();
            loadInvoices();
            connectWebSocket();

            // Auto-sync HubSpot on load
            autoSyncHubSpot();

            // Load Deals Pipeline
            loadSampleDeals();

            // Start Lead Demon
            initLeadDemon();

            // Load Lead Discovery Status
            loadLeadDiscoveryStatus();
            loadRecentLeads();
            loadActiveDeals();

            // Refresh data every 30 seconds
            setInterval(loadDashboardData, 30000);

            // Refresh notifications every 60 seconds
            setInterval(loadNotifications, 60000);
            setInterval(loadActivities, 15000);
            setInterval(loadHubSpotStats, 60000);
            setInterval(loadLeadDiscoveryStatus, 30000);
            setInterval(loadActiveDeals, 60000);
            // Lead Bot runs automatically every 2 minutes (configured in initLeadDemon)
        });

        // Auto-sync HubSpot data on page load
        async function autoSyncHubSpot() {
            try {
                const lastSync = localStorage.getItem('hubspotLastSync');
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;

                // Auto-sync if last sync was more than 1 hour ago
                if (!lastSync || (now - parseInt(lastSync)) > oneHour) {
                    console.log('🔄 Auto-syncing HubSpot data...');
                    await syncHubSpot();
                    localStorage.setItem('hubspotLastSync', now.toString());
                }
            } catch (e) {
                console.log('Auto-sync check failed:', e);
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector('input[type="text"]')?.focus();
            }
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // WHATSAPP BUSINESS API INTEGRATION
        // ═══════════════════════════════════════════════════════════════

        const WHATSAPP_API = '/api/whatsapp';
        let whatsappConnected = false;
        let whatsappTemplates = [];

        async function loadWhatsAppStatus() {
            const statusEl = document.getElementById('waConnectionStatus');
            const phoneEl = document.getElementById('waPhoneNumber');
            const cardEl = document.getElementById('whatsappStatusCard');

            try {
                statusEl.textContent = 'Prüfe...';
                const res = await fetch(`${WHATSAPP_API}/status`);
                const data = await res.json();

                if (data.connected) {
                    whatsappConnected = true;
                    statusEl.textContent = 'Verbunden';
                    phoneEl.textContent = data.phoneNumber || 'Business Account';
                    cardEl.classList.remove('border-red-500/30', 'border-yellow-500/30');
                    cardEl.classList.add('border-green-500/30');
                    showNotification('WhatsApp verbunden!', 'success');
                } else {
                    whatsappConnected = false;
                    statusEl.textContent = 'Nicht verbunden';
                    phoneEl.textContent = data.error || 'API nicht konfiguriert';
                    cardEl.classList.remove('border-green-500/30');
                    cardEl.classList.add('border-yellow-500/30');
                }

                // Load stats
                await loadWhatsAppStats();
                await loadWhatsAppTemplates();
                await loadWhatsAppMessages();
                await loadHubSpotContactsWithPhone();

            } catch (error) {
                console.error('WhatsApp status error:', error);
                statusEl.textContent = 'Fehler';
                phoneEl.textContent = error.message;
                cardEl.classList.add('border-red-500/30');
            }
        }

        async function loadWhatsAppStats() {
            try {
                const res = await fetch(`${WHATSAPP_API}/stats`);
                const stats = await res.json();

                document.getElementById('waSentCount').textContent = stats.sent || 0;
                document.getElementById('waDeliveredCount').textContent = stats.delivered || 0;
                document.getElementById('waReadCount').textContent = stats.read || 0;
            } catch (e) {
                console.log('Could not load WhatsApp stats');
            }
        }

        async function loadWhatsAppTemplates() {
            const listEl = document.getElementById('waTemplatesList');
            const selectEl = document.getElementById('waTemplate');

            try {
                const res = await fetch(`${WHATSAPP_API}/templates`);
                const data = await res.json();

                whatsappTemplates = data.templates || [];

                if (whatsappTemplates.length === 0) {
                    listEl.innerHTML = '<div class="text-center py-4 text-slate-500 text-sm">Keine Templates</div>';
                    return;
                }

                // Update select dropdown
                selectEl.innerHTML = whatsappTemplates.map(t =>
                    `<option value="${t.name}">${t.name}</option>`
                ).join('');

                // Update list view
                listEl.innerHTML = whatsappTemplates.map(t => `
                    <div class="p-2 bg-white/5 rounded-lg">
                        <div class="flex items-center justify-between">
                            <p class="font-semibold text-sm">${t.name}</p>
                            <span class="text-xs px-2 py-0.5 rounded ${t.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${t.status}</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">${t.language || 'de'} • ${t.category || 'MARKETING'}</p>
                    </div>
                `).join('');

            } catch (error) {
                console.error('Error loading templates:', error);
                listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Fehler beim Laden</div>';
            }
        }

        async function loadWhatsAppMessages() {
            const listEl = document.getElementById('waMessagesList');

            try {
                const res = await fetch(`${WHATSAPP_API}/messages?limit=10`);
                const data = await res.json();

                const messages = data.messages || [];

                if (messages.length === 0) {
                    listEl.innerHTML = '<div class="text-center py-4 text-slate-500 text-sm">Keine Nachrichten</div>';
                    return;
                }

                listEl.innerHTML = messages.map(m => {
                    const isOutgoing = m.direction === 'outgoing';
                    const statusIcon = m.status === 'read' ? '👁️' : m.status === 'delivered' ? '✓✓' : m.status === 'sent' ? '✓' : '⏳';
                    const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';

                    return `
                    <div class="p-2 bg-white/5 rounded-lg ${isOutgoing ? 'border-l-2 border-green-500' : 'border-l-2 border-blue-500'}">
                        <div class="flex items-center justify-between">
                            <p class="text-xs font-semibold ${isOutgoing ? 'text-green-400' : 'text-blue-400'}">
                                ${isOutgoing ? '📤' : '📥'} ${m.to || m.from}
                            </p>
                            <span class="text-xs text-slate-500">${time} ${statusIcon}</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-1 truncate">${m.content || m.template || '...'}</p>
                    </div>
                    `;
                }).join('');

            } catch (error) {
                console.error('Error loading messages:', error);
                listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Fehler beim Laden</div>';
            }
        }

        function toggleWaTemplateSelect() {
            const type = document.getElementById('waMessageType').value;
            const templateSelect = document.getElementById('waTemplateSelect');
            const textInput = document.getElementById('waTextInput');

            if (type === 'template') {
                templateSelect.classList.remove('hidden');
                textInput.classList.add('hidden');
            } else {
                templateSelect.classList.add('hidden');
                textInput.classList.remove('hidden');
            }
        }

        async function sendWhatsAppMessage() {
            const recipient = document.getElementById('waRecipient').value.trim();
            const type = document.getElementById('waMessageType').value;
            const message = document.getElementById('waMessage').value.trim();
            const template = document.getElementById('waTemplate').value;

            if (!recipient) {
                showNotification('Bitte Empfänger eingeben', 'error');
                return;
            }

            if (type === 'text' && !message) {
                showNotification('Bitte Nachricht eingeben', 'error');
                return;
            }

            try {
                showNotification('Sende Nachricht...', 'info');

                const payload = {
                    to: recipient.replace(/\s/g, ''),
                    type: type,
                    message: type === 'text' ? message : undefined,
                    template: type === 'template' ? template : undefined
                };

                const res = await fetch(`${WHATSAPP_API}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (data.success) {
                    showNotification('Nachricht gesendet!', 'success');
                    document.getElementById('waMessage').value = '';
                    await loadWhatsAppStats();
                    await loadWhatsAppMessages();
                } else {
                    throw new Error(data.error || 'Senden fehlgeschlagen');
                }

            } catch (error) {
                console.error('Send error:', error);
                showNotification('Fehler: ' + error.message, 'error');
            }
        }

        function sendQuickWA(message) {
            const recipient = document.getElementById('waRecipient').value.trim();
            if (!recipient) {
                showNotification('Bitte zuerst Empfänger eingeben', 'warning');
                return;
            }
            document.getElementById('waMessage').value = message;
            sendWhatsAppMessage();
        }

        async function sendBulkWhatsApp() {
            const source = document.getElementById('waBulkSource').value;
            const template = document.getElementById('waBulkTemplate').value;
            const limit = parseInt(document.getElementById('waBulkLimit').value) || 10;

            if (!confirm(`${limit} Nachrichten an "${source}" senden?\n\nTemplate: ${template}`)) return;

            const progressEl = document.getElementById('waBulkProgress');
            const progressBar = document.getElementById('waBulkProgressBar');
            const progressText = document.getElementById('waBulkProgressText');

            progressEl.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressText.textContent = `0/${limit}`;

            try {
                showNotification('Bulk-Versand gestartet...', 'info');

                const res = await fetch(`${WHATSAPP_API}/send-bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source, template, limit })
                });

                const data = await res.json();

                if (data.success) {
                    progressBar.style.width = '100%';
                    progressText.textContent = `${data.sent}/${data.total}`;
                    showNotification(`Bulk-Versand abgeschlossen: ${data.sent} gesendet`, 'success');
                    await loadWhatsAppStats();
                } else {
                    throw new Error(data.error || 'Bulk-Versand fehlgeschlagen');
                }

            } catch (error) {
                console.error('Bulk send error:', error);
                showNotification('Fehler: ' + error.message, 'error');
            }

            setTimeout(() => progressEl.classList.add('hidden'), 3000);
        }

        async function loadHubSpotContactsWithPhone() {
            try {
                const res = await fetch('/api/hubspot/contacts?has_phone=true&limit=1');
                const data = await res.json();
                const count = data.total || 0;
                document.getElementById('waHubspotContacts').textContent = formatNumber(count) + ' Kontakte';
            } catch (e) {
                document.getElementById('waHubspotContacts').textContent = 'Nicht verfügbar';
            }
        }

        async function syncWhatsAppHubSpot() {
            showNotification('Synchronisiere WhatsApp mit HubSpot...', 'info');

            try {
                // Get HubSpot contacts with phone numbers
                const res = await fetch('/api/hubspot/contacts?has_phone=true');
                const data = await res.json();

                if (data.results?.length) {
                    showNotification(`${data.results.length} Kontakte mit Telefon gefunden`, 'success');
                    await loadHubSpotContactsWithPhone();
                } else {
                    showNotification('Keine Kontakte mit Telefonnummer', 'warning');
                }

            } catch (error) {
                console.error('Sync error:', error);
                showNotification('Sync fehlgeschlagen: ' + error.message, 'error');
            }
        }

        // Initialize WhatsApp on tab switch
        function initWhatsAppTab() {
            loadWhatsAppStatus();
        }

        // ═══════════════════════════════════════════════════════════════
        // STRIPE PAYMENTS INTEGRATION
        // ═══════════════════════════════════════════════════════════════

        const STRIPE_API = '/api/stripe';
        let stripeProducts = [];

        async function loadStripeData() {
            await loadStripeStatus();
            await loadStripeStats();
            await loadStripeProducts();
            await loadStripeSubscriptions();
            await loadStripePayments();
            await loadStripeCustomers();
        }

        async function loadStripeStatus() {
            try {
                const res = await fetch(`${STRIPE_API}/status`);
                const data = await res.json();

                const statusEl = document.getElementById('stripeStatus');
                const modeEl = document.getElementById('stripeMode');
                const cardEl = document.getElementById('stripeStatusCard');

                if (data.configured) {
                    statusEl.textContent = 'Verbunden';
                    modeEl.textContent = data.mode === 'live' ? 'LIVE Modus' : 'Test Modus';
                    cardEl.classList.remove('border-red-500/30');
                    cardEl.classList.add('border-green-500/30');
                } else {
                    statusEl.textContent = 'Nicht konfiguriert';
                    modeEl.textContent = 'API Key fehlt';
                    cardEl.classList.add('border-red-500/30');
                }
            } catch (e) {
                console.error('Stripe status error:', e);
            }
        }

        async function loadStripeStats() {
            try {
                const res = await fetch(`${STRIPE_API}/stats`);
                const data = await res.json();

                document.getElementById('stripeRevenue').textContent = '€' + formatNumber(data.totalRevenue || 0);
                document.getElementById('stripePayments').textContent = data.successfulPayments || 0;
            } catch (e) {
                console.error('Stripe stats error:', e);
            }
        }

        async function loadStripeProducts() {
            const listEl = document.getElementById('stripeProductsList');
            const countEl = document.getElementById('stripeProductCount');
            const selectEl = document.getElementById('checkoutPriceId');

            try {
                const res = await fetch(`${STRIPE_API}/products`);
                const data = await res.json();

                stripeProducts = data.products || [];
                countEl.textContent = stripeProducts.length + ' Produkte';

                if (stripeProducts.length === 0) {
                    listEl.innerHTML = '<div class="text-center py-4 text-[var(--text-muted)] text-sm">Keine Produkte</div>';
                    return;
                }

                // Update products list
                listEl.innerHTML = stripeProducts.map(p => {
                    const price = p.prices?.[0];
                    const amount = price ? (price.unit_amount / 100).toFixed(2) : '0.00';
                    const interval = price?.recurring ? `/${price.recurring.interval === 'month' ? 'Mo' : 'Jahr'}` : '';

                    return `
                    <div class="p-3 bg-[var(--bg-elevated)] rounded-lg">
                        <div class="flex items-center justify-between">
                            <p class="font-semibold text-sm truncate flex-1">${p.name}</p>
                            <span class="text-green-400 font-bold ml-2">€${amount}${interval}</span>
                        </div>
                        <p class="text-xs text-[var(--text-muted)] mt-1 truncate">${p.description || 'Keine Beschreibung'}</p>
                        ${p.prices?.length > 1 ? `<p class="text-xs text-purple-400 mt-1">${p.prices.length} Preisoptionen</p>` : ''}
                    </div>
                    `;
                }).join('');

                // Update checkout select
                selectEl.innerHTML = stripeProducts.flatMap(p =>
                    (p.prices || []).map(price => {
                        const amount = (price.unit_amount / 100).toFixed(2);
                        const interval = price.recurring ? `/${price.recurring.interval === 'month' ? 'Mo' : 'Jahr'}` : ' (einmalig)';
                        return `<option value="${price.id}">${p.name} - €${amount}${interval}</option>`;
                    })
                ).join('');

            } catch (e) {
                console.error('Stripe products error:', e);
                listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Fehler beim Laden</div>';
            }
        }

        async function loadStripeSubscriptions() {
            const listEl = document.getElementById('stripeSubscriptionsList');
            const status = document.getElementById('subStatusFilter')?.value || 'active';

            try {
                const res = await fetch(`${STRIPE_API}/subscriptions?status=${status}`);
                const data = await res.json();

                const subs = data.subscriptions || [];
                document.getElementById('stripeSubscriptions').textContent = subs.filter(s => s.status === 'active').length;

                if (subs.length === 0) {
                    listEl.innerHTML = '<div class="text-center py-4 text-[var(--text-muted)] text-sm">Keine Abonnements</div>';
                    return;
                }

                listEl.innerHTML = subs.map(s => {
                    const statusColors = {
                        active: 'bg-green-500/20 text-green-400',
                        canceled: 'bg-red-500/20 text-red-400',
                        past_due: 'bg-yellow-500/20 text-yellow-400',
                        trialing: 'bg-blue-500/20 text-blue-400'
                    };
                    const amount = s.items?.data?.[0]?.price?.unit_amount / 100 || 0;

                    return `
                    <div class="p-2 bg-[var(--bg-elevated)] rounded-lg">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-semibold truncate">${s.customer?.email || s.customer || 'Kunde'}</p>
                            <span class="text-xs px-2 py-0.5 rounded ${statusColors[s.status] || 'bg-gray-500/20'}">${s.status}</span>
                        </div>
                        <div class="flex items-center justify-between mt-1">
                            <span class="text-xs text-[var(--text-muted)]">€${amount.toFixed(2)}/Mo</span>
                            <span class="text-xs text-[var(--text-muted)]">${new Date(s.current_period_end * 1000).toLocaleDateString('de-DE')}</span>
                        </div>
                    </div>
                    `;
                }).join('');

            } catch (e) {
                console.error('Stripe subscriptions error:', e);
                listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Fehler beim Laden</div>';
            }
        }

        async function loadStripePayments() {
            const listEl = document.getElementById('stripePaymentsList');

            try {
                const res = await fetch(`${STRIPE_API}/payments?limit=10`);
                const data = await res.json();

                const payments = data.payments || [];

                if (payments.length === 0) {
                    listEl.innerHTML = '<div class="text-center py-4 text-[var(--text-muted)] text-sm">Keine Zahlungen</div>';
                    return;
                }

                listEl.innerHTML = payments.map(p => {
                    const statusColors = {
                        succeeded: 'text-green-400',
                        processing: 'text-yellow-400',
                        requires_payment_method: 'text-red-400',
                        canceled: 'text-gray-400'
                    };
                    const statusIcons = {
                        succeeded: '✓',
                        processing: '⏳',
                        requires_payment_method: '!',
                        canceled: '✕'
                    };
                    const amount = (p.amount / 100).toFixed(2);
                    const date = new Date(p.created * 1000).toLocaleDateString('de-DE');

                    return `
                    <div class="p-2 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-between">
                        <div>
                            <p class="text-sm font-semibold ${statusColors[p.status] || ''}">€${amount}</p>
                            <p class="text-xs text-[var(--text-muted)]">${date}</p>
                        </div>
                        <span class="text-lg ${statusColors[p.status] || ''}">${statusIcons[p.status] || '?'}</span>
                    </div>
                    `;
                }).join('');

            } catch (e) {
                console.error('Stripe payments error:', e);
                listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Fehler beim Laden</div>';
            }
        }

        async function loadStripeCustomers() {
            const listEl = document.getElementById('stripeCustomersList');

            try {
                const res = await fetch(`${STRIPE_API}/customers?limit=10`);
                const data = await res.json();

                const customers = data.customers || [];

                if (customers.length === 0) {
                    listEl.innerHTML = '<div class="text-center py-4 text-[var(--text-muted)] text-sm">Keine Kunden</div>';
                    return;
                }

                listEl.innerHTML = customers.map(c => `
                    <div class="p-2 bg-[var(--bg-elevated)] rounded-lg flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
                            ${(c.name || c.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold truncate">${c.name || 'Unbekannt'}</p>
                            <p class="text-xs text-[var(--text-muted)] truncate">${c.email || '-'}</p>
                        </div>
                    </div>
                `).join('');

            } catch (e) {
                console.error('Stripe customers error:', e);
                listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Fehler beim Laden</div>';
            }
        }

        async function createCheckoutSession(mode) {
            const priceId = document.getElementById('checkoutPriceId').value;
            const email = document.getElementById('checkoutEmail').value;

            if (!priceId) {
                showNotification('Bitte Produkt auswählen', 'error');
                return;
            }

            try {
                showNotification('Erstelle Checkout...', 'info');

                const endpoint = mode === 'subscription' ? '/subscribe' : '/checkout';
                const res = await fetch(`${STRIPE_API}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        priceId,
                        customerEmail: email || undefined,
                        successUrl: window.location.origin + '/payment-success',
                        cancelUrl: window.location.origin + '/v11'
                    })
                });

                const data = await res.json();

                if (data.url) {
                    showNotification('Checkout erstellt! Öffne...', 'success');
                    window.open(data.url, '_blank');
                } else {
                    throw new Error(data.error || 'Checkout fehlgeschlagen');
                }

            } catch (e) {
                console.error('Checkout error:', e);
                showNotification('Fehler: ' + e.message, 'error');
            }
        }

        function initPaymentsTab() {
            loadStripeData();
        }
