/**
 * PROJECTS & MONEY MANAGEMENT MODULE
 * Extends the Ultimate Dashboard with project and payment tracking
 */

(function() {
    'use strict';

    // Wait for main app to load
    if (typeof Modules === 'undefined') {
        console.warn('Modules not loaded, retrying...');
        setTimeout(arguments.callee, 100);
        return;
    }

    // ═══════════════════════════════════════════════════════════
    // PROJECTS MODULE
    // ═══════════════════════════════════════════════════════════

    Modules.renderProjects = async function() {
        var container = this.container();
        DOM.clear(container);

        var header = DOM.el('div', { className: 'page-header' }, [
            DOM.el('div', {}, [
                DOM.el('h1', { className: 'page-title' }, 'Projects'),
                DOM.el('p', { className: 'page-subtitle' }, 'Alle Kundenprojekte und Dokumentationen')
            ]),
            DOM.el('div', { className: 'page-actions' }, [
                DOM.el('button', { className: 'btn btn-ghost', onclick: function() { Modules.loadProjects(); } }, '🔄 Refresh'),
                DOM.el('button', { className: 'btn btn-secondary', onclick: function() { Modules.importDealsAsProjects(); } }, '📥 Deals importieren'),
                DOM.el('button', { className: 'btn btn-primary', onclick: function() { UltimateApp.showNewProjectModal(); } }, '+ Neues Projekt')
            ])
        ]);
        container.appendChild(header);

        // Project Type Filter
        var filterBar = DOM.el('div', { className: 'filter-bar', style: 'margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;' }, [
            DOM.el('button', { className: 'btn btn-sm active', dataset: { filter: 'all' }, onclick: function() { Modules.filterProjects('all'); } }, 'Alle'),
            DOM.el('button', { className: 'btn btn-sm', dataset: { filter: 'construction' }, onclick: function() { Modules.filterProjects('construction'); } }, '🏗️ Bauprojekte'),
            DOM.el('button', { className: 'btn btn-sm', dataset: { filter: 'consulting' }, onclick: function() { Modules.filterProjects('consulting'); } }, '💼 Beratung'),
            DOM.el('button', { className: 'btn btn-sm', dataset: { filter: 'software_demo' }, onclick: function() { Modules.filterProjects('software_demo'); } }, '💻 Software'),
            DOM.el('button', { className: 'btn btn-sm', dataset: { filter: 'investor_materials' }, onclick: function() { Modules.filterProjects('investor_materials'); } }, '📊 Investor')
        ]);
        container.appendChild(filterBar);

        // Project Stats
        var statsGrid = DOM.el('div', { className: 'kpi-grid', id: 'project-stats', style: 'margin-bottom: 1.5rem;' });
        container.appendChild(statsGrid);

        // Projects Grid
        var projectsGrid = DOM.el('div', { id: 'projects-list', style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;' });
        container.appendChild(projectsGrid);

        this.loadProjects();
    };

    Modules.loadProjects = async function(filter) {
        filter = filter || 'all';
        var statsGrid = document.getElementById('project-stats');
        var projectsList = document.getElementById('projects-list');

        // Build API endpoint - use v1 prefix
        var endpoint = '/api/v1/projects';
        var params = [];
        if (filter !== 'all') params.push('project_type=' + filter);
        if (params.length > 0) endpoint += '?' + params.join('&');

        var data = null;
        try {
            data = await API.get(endpoint);
        } catch (e) {
            console.error('Failed to load projects:', e);
        }

        // Ensure we have the right structure
        if (!data || !Array.isArray(data.projects)) {
            data = { projects: [], total: 0 };
        }

        // Filter if needed
        if (filter !== 'all') {
            data.projects = data.projects.filter(function(p) { return p.project_type === filter; });
        }

        // Stats
        if (statsGrid) {
            DOM.clear(statsGrid);
            var activeCount = data.projects.filter(function(p) { return p.status === 'active'; }).length;
            var totalBudget = data.projects.reduce(function(sum, p) { return sum + (p.total_budget || 0); }, 0);
            var totalDocs = data.projects.reduce(function(sum, p) { return sum + (p.documents_count || 0); }, 0);

            var stats = [
                { label: 'Aktive Projekte', value: activeCount, icon: '📁', type: 'primary' },
                { label: 'Gesamtbudget', value: formatCurrency(totalBudget), icon: '💰', type: 'success' },
                { label: 'Dokumente', value: totalDocs, icon: '📄', type: 'info' },
                { label: 'Gesamt Projekte', value: data.projects.length, icon: '📊', type: 'warning' }
            ];

            stats.forEach(function(stat) {
                statsGrid.appendChild(DOM.el('div', { className: 'kpi-card ' + stat.type + ' animate-slide-up' }, [
                    DOM.el('div', { className: 'kpi-header' }, [
                        DOM.el('span', { className: 'kpi-label' }, stat.label),
                        DOM.el('span', { className: 'kpi-icon' }, stat.icon)
                    ]),
                    DOM.el('div', { className: 'kpi-value' }, String(stat.value))
                ]));
            });
        }

        // Project Cards
        if (projectsList) {
            DOM.clear(projectsList);
            if (data.projects.length === 0) {
                projectsList.appendChild(DOM.el('div', { className: 'empty-state' }, [
                    DOM.el('div', { className: 'empty-state-icon' }, '📁'),
                    DOM.el('div', { className: 'empty-state-title' }, 'Keine Projekte'),
                    DOM.el('div', { className: 'empty-state-text' }, 'Erstelle dein erstes Projekt.')
                ]));
                return;
            }

            var typeIcons = { construction: '🏗️', consulting: '💼', software_demo: '💻', investor_materials: '📊', retainer: '🔄', other: '📁' };
            var statusColors = { draft: 'var(--text-muted)', active: 'var(--success)', on_hold: 'var(--warning)', completed: 'var(--info)', cancelled: 'var(--error)' };

            data.projects.forEach(function(project) {
                var card = DOM.el('div', { className: 'card project-card animate-slide-up', style: 'cursor: pointer;', onclick: function() { UltimateApp.showProjectDetail(project.id); } }, [
                    DOM.el('div', { className: 'card-body' }, [
                        DOM.el('div', { style: 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;' }, [
                            DOM.el('div', {}, [
                                DOM.el('span', { style: 'font-size: 1.5rem; margin-right: 0.5rem;' }, typeIcons[project.project_type] || '📁'),
                                DOM.el('span', { className: 'badge', style: 'background: ' + (statusColors[project.status] || 'var(--text-muted)') + '; color: white; font-size: 0.7rem;' }, (project.status || 'draft').toUpperCase())
                            ]),
                            DOM.el('span', { style: 'color: var(--text-muted); font-size: 0.8rem;' }, '#' + project.id)
                        ]),
                        DOM.el('h3', { style: 'margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text-primary);' }, project.name),
                        DOM.el('p', { style: 'margin: 0 0 1rem 0; color: var(--text-secondary); font-size: 0.9rem;' }, project.customer_name || '-'),
                        project.total_budget > 0 ? DOM.el('div', { style: 'margin-bottom: 1rem;' }, [
                            DOM.el('span', { style: 'font-size: 1.3rem; font-weight: 700; color: var(--accent-primary);' }, formatCurrency(project.total_budget))
                        ]) : null,
                        DOM.el('div', { style: 'margin-bottom: 0.5rem;' }, [
                            DOM.el('div', { style: 'display: flex; justify-content: space-between; margin-bottom: 0.25rem;' }, [
                                DOM.el('span', { style: 'font-size: 0.8rem; color: var(--text-muted);' }, 'Fortschritt'),
                                DOM.el('span', { style: 'font-size: 0.8rem; font-weight: 600; color: var(--text-primary);' }, (project.progress || 0) + '%')
                            ]),
                            DOM.el('div', { style: 'background: var(--bg-secondary); border-radius: 4px; height: 6px; overflow: hidden;' }, [
                                DOM.el('div', { style: 'height: 100%; background: linear-gradient(90deg, var(--accent-primary), var(--success)); width: ' + (project.progress || 0) + '%;' })
                            ])
                        ]),
                        DOM.el('div', { style: 'display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);' }, [
                            DOM.el('span', { style: 'font-size: 0.8rem; color: var(--text-muted);' }, '📋 ' + (project.milestones_count || 0) + ' Meilensteine'),
                            DOM.el('span', { style: 'font-size: 0.8rem; color: var(--text-muted);' }, '📄 ' + (project.documents_count || 0) + ' Dokumente')
                        ])
                    ])
                ]);
                projectsList.appendChild(card);
            });
        }
    };

    Modules.filterProjects = function(filter) {
        document.querySelectorAll('.filter-bar .btn').forEach(function(btn) {
            btn.classList.remove('active');
            if (btn.dataset && btn.dataset.filter === filter) btn.classList.add('active');
        });
        this.loadProjects(filter);
    };

    Modules.importDealsAsProjects = async function() {
        // Bestätigungsdialog
        if (!confirm('Deals aus den Stages "Won", "Negotiation" und "Proposal" als Projekte importieren?\n\nBereits existierende Projekte werden übersprungen.')) {
            return;
        }

        // Loading-Overlay anzeigen
        var overlay = DOM.el('div', {
            id: 'import-overlay',
            style: 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;'
        }, [
            DOM.el('div', { style: 'background: var(--bg-primary); padding: 2rem; border-radius: 12px; text-align: center; max-width: 400px;' }, [
                DOM.el('div', { style: 'font-size: 2rem; margin-bottom: 1rem;' }, '⏳'),
                DOM.el('div', { style: 'font-size: 1.2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;' }, 'Importiere Deals...'),
                DOM.el('div', { style: 'color: var(--text-muted);', id: 'import-status' }, 'Bitte warten...')
            ])
        ]);
        document.body.appendChild(overlay);

        try {
            var response = await API.post('/api/v1/projects/import-from-deals?stages=won&stages=negotiation&stages=proposal');

            // Overlay entfernen
            document.getElementById('import-overlay').remove();

            if (response && response.success) {
                // Erfolgsmeldung anzeigen
                var message = 'Import abgeschlossen!\n\n';
                message += '✅ Importiert: ' + response.imported_count + ' Projekte\n';
                message += '⏭️ Übersprungen: ' + response.skipped_count + ' (existieren bereits)\n';
                if (response.error_count > 0) {
                    message += '❌ Fehler: ' + response.error_count;
                }

                alert(message);

                // Projekte neu laden
                Modules.loadProjects();
            } else {
                alert('Import fehlgeschlagen: ' + (response ? response.error || 'Unbekannter Fehler' : 'Keine Antwort vom Server'));
            }
        } catch (e) {
            document.getElementById('import-overlay')?.remove();
            console.error('Import error:', e);
            alert('Import fehlgeschlagen: ' + e.message);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // PROJECT DOCUMENTS
    // ═══════════════════════════════════════════════════════════

    Modules.renderProjectDocuments = async function() {
        var container = this.container();
        DOM.clear(container);

        var header = DOM.el('div', { className: 'page-header' }, [
            DOM.el('div', {}, [
                DOM.el('h1', { className: 'page-title' }, 'Projekt-Dokumente'),
                DOM.el('p', { className: 'page-subtitle' }, 'Dokumentation und Präsentationen für Kunden')
            ]),
            DOM.el('div', { className: 'page-actions' }, [
                DOM.el('button', { className: 'btn btn-ghost', onclick: function() { Modules.loadProjectDocuments(); } }, '🔄 Refresh'),
                DOM.el('button', { className: 'btn btn-primary', onclick: function() { UltimateApp.showUploadDocumentModal(); } }, '📤 Upload')
            ])
        ]);
        container.appendChild(header);

        var statsGrid = DOM.el('div', { className: 'kpi-grid', id: 'doc-stats', style: 'margin-bottom: 1.5rem;' });
        container.appendChild(statsGrid);

        var card = DOM.el('div', { className: 'card' }, [
            DOM.el('div', { className: 'card-body', id: 'documents-table' })
        ]);
        container.appendChild(card);

        this.loadProjectDocuments();
    };

    Modules.loadProjectDocuments = async function() {
        var statsGrid = document.getElementById('doc-stats');
        var tableContainer = document.getElementById('documents-table');

        var documents = [];
        try {
            var response = await API.get('/api/v1/projects/all/documents');
            if (response && Array.isArray(response.documents)) {
                documents = response.documents;
            }
        } catch (e) {
            console.error('Failed to load documents:', e);
        }

        if (statsGrid) {
            DOM.clear(statsGrid);
            var stats = [
                { label: 'Dokumente gesamt', value: documents.length, icon: '📄', type: 'primary' },
                { label: 'Aufrufe gesamt', value: documents.reduce(function(s, d) { return s + (d.view_count || 0); }, 0), icon: '👁️', type: 'info' },
                { label: 'Downloads', value: documents.reduce(function(s, d) { return s + (d.download_count || 0); }, 0), icon: '📥', type: 'success' }
            ];

            stats.forEach(function(stat) {
                statsGrid.appendChild(DOM.el('div', { className: 'kpi-card ' + stat.type }, [
                    DOM.el('div', { className: 'kpi-header' }, [
                        DOM.el('span', { className: 'kpi-label' }, stat.label),
                        DOM.el('span', { className: 'kpi-icon' }, stat.icon)
                    ]),
                    DOM.el('div', { className: 'kpi-value' }, String(stat.value))
                ]));
            });
        }

        if (tableContainer) {
            DOM.clear(tableContainer);
            var table = DOM.el('table', { className: 'data-table', style: 'width: 100%;' }, [
                DOM.el('thead', {}, [
                    DOM.el('tr', {}, [
                        DOM.el('th', {}, 'Dokument'),
                        DOM.el('th', {}, 'Projekt'),
                        DOM.el('th', {}, 'Typ'),
                        DOM.el('th', {}, 'Größe'),
                        DOM.el('th', {}, 'Views / Downloads'),
                        DOM.el('th', {}, 'Status'),
                        DOM.el('th', {}, 'Aktionen')
                    ])
                ]),
                DOM.el('tbody', { id: 'docs-tbody' })
            ]);
            tableContainer.appendChild(table);

            var tbody = document.getElementById('docs-tbody');

            if (documents.length === 0) {
                tbody.appendChild(DOM.el('tr', {}, [
                    DOM.el('td', { colSpan: 7, style: 'text-align: center; padding: 2rem; color: var(--text-muted);' }, [
                        DOM.el('div', { style: 'font-size: 2rem; margin-bottom: 0.5rem;' }, '📄'),
                        DOM.el('div', {}, 'Noch keine Dokumente vorhanden'),
                        DOM.el('div', { style: 'font-size: 0.85rem; margin-top: 0.5rem;' }, 'Lade dein erstes Dokument hoch.')
                    ])
                ]));
                return;
            }

            documents.forEach(function(doc) {
                var fileName = doc.file_name || doc.name || 'Dokument';
                var fileSize = doc.file_size ? (doc.file_size / 1000000).toFixed(1) + ' MB' : '-';
                var docStatus = doc.is_shared ? 'shared' : 'draft';

                var row = DOM.el('tr', {}, [
                    DOM.el('td', {}, [
                        DOM.el('div', { style: 'display: flex; align-items: center; gap: 0.5rem;' }, [
                            DOM.el('span', {}, fileName.endsWith('.pdf') ? '📄' : fileName.endsWith('.pptx') ? '📊' : '📁'),
                            DOM.el('span', {}, fileName)
                        ])
                    ]),
                    DOM.el('td', {}, 'Projekt #' + doc.project_id),
                    DOM.el('td', {}, DOM.el('span', { className: 'badge' }, doc.document_type || 'other')),
                    DOM.el('td', {}, fileSize),
                    DOM.el('td', {}, (doc.view_count || 0) + ' / ' + (doc.download_count || 0)),
                    DOM.el('td', {}, DOM.el('span', { className: 'badge', style: 'background: ' + (docStatus === 'shared' ? 'var(--success)' : 'var(--warning)') + '; color: white;' }, docStatus)),
                    DOM.el('td', {}, [
                        DOM.el('button', { className: 'btn btn-sm btn-ghost', title: 'Per Email senden', onclick: function() { UltimateApp.shareDocument(doc.id); } }, '📧'),
                        DOM.el('button', { className: 'btn btn-sm btn-ghost', title: 'Download', onclick: function() { window.open('/api/v1/projects/' + doc.project_id + '/documents/' + doc.id + '/download'); } }, '📥'),
                        DOM.el('button', { className: 'btn btn-sm btn-ghost', title: 'Teilen', onclick: function() { UltimateApp.shareDocumentLink(doc.id); } }, '🔗')
                    ])
                ]);
                tbody.appendChild(row);
            });
        }
    };

    // ═══════════════════════════════════════════════════════════
    // DELIVERABLES
    // ═══════════════════════════════════════════════════════════

    Modules.renderDeliverables = async function() {
        var container = this.container();
        DOM.clear(container);

        container.appendChild(DOM.el('div', { className: 'page-header' }, [
            DOM.el('div', {}, [
                DOM.el('h1', { className: 'page-title' }, 'Deliverables'),
                DOM.el('p', { className: 'page-subtitle' }, 'Alle Lieferungen an Kunden')
            ])
        ]));

        this.renderComingSoon('Deliverables werden bald verfügbar sein.');
    };

    // ═══════════════════════════════════════════════════════════
    // MONEY MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    Modules.renderMoneyManagement = async function() {
        var container = this.container();
        DOM.clear(container);

        var header = DOM.el('div', { className: 'page-header' }, [
            DOM.el('div', {}, [
                DOM.el('h1', { className: 'page-title' }, 'Money Management'),
                DOM.el('p', { className: 'page-subtitle' }, 'Projekt-basierte Abrechnung und Zahlungsübersicht')
            ]),
            DOM.el('div', { className: 'page-actions' }, [
                DOM.el('button', { className: 'btn btn-ghost', onclick: function() { Modules.loadMoneyDashboard(); } }, '🔄 Refresh')
            ])
        ]);
        container.appendChild(header);

        var statsGrid = DOM.el('div', { className: 'kpi-grid', id: 'money-stats', style: 'margin-bottom: 1.5rem;' });
        container.appendChild(statsGrid);

        var twoCol = DOM.el('div', { className: 'grid grid-2', style: 'gap: 1.5rem;' });
        container.appendChild(twoCol);

        twoCol.appendChild(DOM.el('div', { className: 'card' }, [
            DOM.el('div', { className: 'card-header' }, [DOM.el('h3', { className: 'card-title' }, '⏳ Ausstehende Zahlungen')]),
            DOM.el('div', { className: 'card-body', id: 'pending-payments' })
        ]));

        twoCol.appendChild(DOM.el('div', { className: 'card' }, [
            DOM.el('div', { className: 'card-header' }, [DOM.el('h3', { className: 'card-title' }, '✅ Letzte Eingänge')]),
            DOM.el('div', { className: 'card-body', id: 'recent-payments' })
        ]));

        container.appendChild(DOM.el('div', { className: 'card', style: 'margin-top: 1.5rem;' }, [
            DOM.el('div', { className: 'card-header' }, [DOM.el('h3', { className: 'card-title' }, '📅 Zahlungspläne nach Projekt')]),
            DOM.el('div', { className: 'card-body', id: 'payment-schedules' })
        ]));

        this.loadMoneyDashboard();
    };

    Modules.loadMoneyDashboard = async function() {
        var statsGrid = document.getElementById('money-stats');
        var pendingContainer = document.getElementById('pending-payments');
        var recentContainer = document.getElementById('recent-payments');
        var schedulesContainer = document.getElementById('payment-schedules');

        // Fetch real data from API
        var stats = { total_projects: 0, total_budget: 0, payments: {} };
        var pendingPayments = [];
        var projects = [];

        try {
            // Get statistics
            var statsResponse = await API.get('/api/v1/projects/statistics');
            if (statsResponse) stats = statsResponse;

            // Get pending payments (due in next 90 days)
            var paymentsResponse = await API.get('/api/v1/projects/all/payments-due?days=90');
            if (paymentsResponse && Array.isArray(paymentsResponse.payments_due)) {
                pendingPayments = paymentsResponse.payments_due;
            }

            // Get all projects for schedules
            var projectsResponse = await API.get('/api/v1/projects');
            if (projectsResponse && Array.isArray(projectsResponse.projects)) {
                projects = projectsResponse.projects;
            }
        } catch (e) {
            console.error('Failed to load money dashboard:', e);
        }

        // Calculate totals from real data
        var totalPending = pendingPayments.reduce(function(sum, p) { return sum + (p.amount || 0); }, 0);
        var paidPayments = stats.payments && stats.payments.paid ? stats.payments.paid : { count: 0, amount: 0 };
        var overduePayments = stats.payments && stats.payments.overdue ? stats.payments.overdue : { count: 0, amount: 0 };

        var mockData = {
            total_pending: totalPending,
            total_received_month: paidPayments.amount || 0,
            total_overdue: overduePayments.amount || 0,
            projects_with_payments: stats.active_projects || projects.length,
            pending: pendingPayments.map(function(p) {
                return { project: p.name || 'Projekt', milestone: p.name, amount: p.amount, due_date: p.due_date };
            }),
            recent: [],
            schedules: projects.filter(function(p) { return p.total_budget > 0; }).map(function(p) {
                var paid = p.invoiced_amount || 0;
                return {
                    project: p.name,
                    total: p.total_budget,
                    paid: paid,
                    milestones: (p.payment_schedules || []).map(function(ps) {
                        return { name: ps.name, amount: ps.amount, status: ps.status };
                    })
                };
            })
        };

        if (statsGrid) {
            DOM.clear(statsGrid);
            var stats = [
                { label: 'Ausstehend', value: formatCurrency(mockData.total_pending), icon: '⏳', type: 'warning' },
                { label: 'Diesen Monat erhalten', value: formatCurrency(mockData.total_received_month), icon: '💰', type: 'success' },
                { label: 'Überfällig', value: formatCurrency(mockData.total_overdue), icon: '⚠️', type: 'error' },
                { label: 'Aktive Projekte', value: mockData.projects_with_payments, icon: '📁', type: 'info' }
            ];

            stats.forEach(function(stat) {
                statsGrid.appendChild(DOM.el('div', { className: 'kpi-card ' + stat.type + ' animate-slide-up' }, [
                    DOM.el('div', { className: 'kpi-header' }, [
                        DOM.el('span', { className: 'kpi-label' }, stat.label),
                        DOM.el('span', { className: 'kpi-icon' }, stat.icon)
                    ]),
                    DOM.el('div', { className: 'kpi-value' }, stat.value)
                ]));
            });
        }

        if (pendingContainer) {
            DOM.clear(pendingContainer);
            if (mockData.pending.length === 0) {
                pendingContainer.appendChild(DOM.el('div', { style: 'text-align: center; padding: 1.5rem; color: var(--text-muted);' }, [
                    DOM.el('div', { style: 'font-size: 1.5rem; margin-bottom: 0.5rem;' }, '✓'),
                    DOM.el('div', {}, 'Keine ausstehenden Zahlungen')
                ]));
            } else {
                mockData.pending.forEach(function(p) {
                    pendingContainer.appendChild(DOM.el('div', { style: 'display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);' }, [
                        DOM.el('div', {}, [
                            DOM.el('div', { style: 'font-weight: 600; color: var(--text-primary);' }, p.project),
                            DOM.el('div', { style: 'font-size: 0.85rem; color: var(--text-muted);' }, p.milestone)
                        ]),
                        DOM.el('div', { style: 'text-align: right;' }, [
                            DOM.el('div', { style: 'font-weight: 700; color: var(--accent-primary);' }, formatCurrency(p.amount)),
                            DOM.el('div', { style: 'font-size: 0.8rem; color: var(--text-muted);' }, p.due_date ? 'Fällig: ' + formatDate(p.due_date) : '')
                        ])
                    ]));
                });
            }
        }

        if (recentContainer) {
            DOM.clear(recentContainer);
            if (mockData.recent.length === 0) {
                recentContainer.appendChild(DOM.el('div', { style: 'text-align: center; padding: 1.5rem; color: var(--text-muted);' }, [
                    DOM.el('div', { style: 'font-size: 1.5rem; margin-bottom: 0.5rem;' }, '💰'),
                    DOM.el('div', {}, 'Noch keine Zahlungseingänge')
                ]));
            } else {
                mockData.recent.forEach(function(p) {
                    recentContainer.appendChild(DOM.el('div', { style: 'display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);' }, [
                        DOM.el('div', {}, [
                            DOM.el('div', { style: 'font-weight: 600; color: var(--text-primary);' }, p.project),
                            DOM.el('div', { style: 'font-size: 0.85rem; color: var(--text-muted);' }, p.method || '')
                        ]),
                        DOM.el('div', { style: 'text-align: right;' }, [
                            DOM.el('div', { style: 'font-weight: 700; color: var(--success);' }, formatCurrency(p.amount)),
                            DOM.el('div', { style: 'font-size: 0.8rem; color: var(--text-muted);' }, p.paid_at ? formatDate(p.paid_at) : '')
                        ])
                    ]));
                });
            }
        }

        if (schedulesContainer) {
            DOM.clear(schedulesContainer);
            if (mockData.schedules.length === 0) {
                schedulesContainer.appendChild(DOM.el('div', { style: 'text-align: center; padding: 2rem; color: var(--text-muted);' }, [
                    DOM.el('div', { style: 'font-size: 2rem; margin-bottom: 0.5rem;' }, '📅'),
                    DOM.el('div', {}, 'Keine Zahlungspläne vorhanden'),
                    DOM.el('div', { style: 'font-size: 0.85rem; margin-top: 0.5rem;' }, 'Erstelle ein Projekt mit Budget, um Zahlungspläne anzulegen.')
                ]));
            } else {
                mockData.schedules.forEach(function(s) {
                    var pct = s.total > 0 ? Math.round(s.paid / s.total * 100) : 0;
                    schedulesContainer.appendChild(DOM.el('div', { style: 'padding: 1rem; margin-bottom: 1rem; background: var(--bg-secondary); border-radius: 8px;' }, [
                        DOM.el('div', { style: 'display: flex; justify-content: space-between; margin-bottom: 0.75rem;' }, [
                            DOM.el('h4', { style: 'margin: 0; color: var(--text-primary);' }, s.project),
                            DOM.el('span', { style: 'font-weight: 700; color: var(--accent-primary);' }, formatCurrency(s.total))
                        ]),
                        DOM.el('div', { style: 'margin-bottom: 0.5rem;' }, [
                            DOM.el('div', { style: 'display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;' }, [
                                DOM.el('span', {}, 'Bezahlt: ' + formatCurrency(s.paid)),
                                DOM.el('span', {}, pct + '%')
                            ]),
                            DOM.el('div', { style: 'background: var(--bg-tertiary); border-radius: 4px; height: 8px; overflow: hidden;' }, [
                                DOM.el('div', { style: 'height: 100%; background: var(--success); width: ' + pct + '%;' })
                            ])
                        ]),
                        (s.milestones && s.milestones.length > 0) ? DOM.el('div', { style: 'display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;' }, s.milestones.map(function(m) {
                            return DOM.el('span', { className: 'badge', style: 'background: ' + (m.status === 'paid' ? 'var(--success)' : 'var(--bg-tertiary)') + '; color: ' + (m.status === 'paid' ? 'white' : 'var(--text-secondary)') + ';' }, m.name);
                        })) : null
                    ]));
                });
            }
        }
    };

    // ═══════════════════════════════════════════════════════════
    // SUBSCRIPTIONS
    // ═══════════════════════════════════════════════════════════

    Modules.renderSubscriptions = async function() {
        var container = this.container();
        DOM.clear(container);

        var header = DOM.el('div', { className: 'page-header' }, [
            DOM.el('div', {}, [
                DOM.el('h1', { className: 'page-title' }, 'Subscriptions & Retainer'),
                DOM.el('p', { className: 'page-subtitle' }, 'Wiederkehrende Zahlungen verwalten')
            ]),
            DOM.el('div', { className: 'page-actions' }, [
                DOM.el('button', { className: 'btn btn-primary', onclick: function() { UltimateApp.showNewSubscriptionModal(); } }, '+ Neue Subscription')
            ])
        ]);
        container.appendChild(header);

        var statsGrid = DOM.el('div', { className: 'kpi-grid', id: 'sub-stats', style: 'margin-bottom: 1.5rem;' });
        container.appendChild(statsGrid);

        container.appendChild(DOM.el('div', { className: 'card' }, [
            DOM.el('div', { className: 'card-body', id: 'subscriptions-list' })
        ]));

        this.loadSubscriptions();
    };

    Modules.loadSubscriptions = async function() {
        var statsGrid = document.getElementById('sub-stats');
        var listContainer = document.getElementById('subscriptions-list');

        var subscriptions = [];
        try {
            var response = await API.get('/api/v1/projects/all/subscriptions');
            if (response && Array.isArray(response.subscriptions)) {
                subscriptions = response.subscriptions.map(function(s) {
                    return {
                        id: s.id,
                        name: s.name,
                        project: s.project_name || 'Projekt #' + s.project_id,
                        amount: s.amount,
                        frequency: s.frequency,
                        status: s.status,
                        next_billing: s.next_billing_date
                    };
                });
            }
        } catch (e) {
            console.error('Failed to load subscriptions:', e);
        }

        var activeCount = subscriptions.filter(function(s) { return s.status === 'active'; }).length;
        var monthlyRevenue = subscriptions.filter(function(s) { return s.status === 'active'; }).reduce(function(sum, s) { return sum + s.amount; }, 0);

        if (statsGrid) {
            DOM.clear(statsGrid);
            var stats = [
                { label: 'Aktive Subscriptions', value: activeCount, icon: '🔄', type: 'success' },
                { label: 'Monatlicher Umsatz', value: formatCurrency(monthlyRevenue), icon: '💰', type: 'primary' },
                { label: 'Jährlicher Umsatz', value: formatCurrency(monthlyRevenue * 12), icon: '📈', type: 'info' }
            ];

            stats.forEach(function(stat) {
                statsGrid.appendChild(DOM.el('div', { className: 'kpi-card ' + stat.type }, [
                    DOM.el('div', { className: 'kpi-header' }, [
                        DOM.el('span', { className: 'kpi-label' }, stat.label),
                        DOM.el('span', { className: 'kpi-icon' }, stat.icon)
                    ]),
                    DOM.el('div', { className: 'kpi-value' }, String(stat.value))
                ]));
            });
        }

        if (listContainer) {
            DOM.clear(listContainer);

            if (subscriptions.length === 0) {
                listContainer.appendChild(DOM.el('div', { style: 'text-align: center; padding: 2rem; color: var(--text-muted);' }, [
                    DOM.el('div', { style: 'font-size: 2rem; margin-bottom: 0.5rem;' }, '🔄'),
                    DOM.el('div', {}, 'Keine Subscriptions vorhanden'),
                    DOM.el('div', { style: 'font-size: 0.85rem; margin-top: 0.5rem;' }, 'Erstelle deine erste Subscription für wiederkehrende Zahlungen.')
                ]));
                return;
            }

            subscriptions.forEach(function(sub) {
                listContainer.appendChild(DOM.el('div', { style: 'display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 0.75rem; background: var(--bg-secondary); border-radius: 8px;' }, [
                    DOM.el('div', {}, [
                        DOM.el('div', { style: 'font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;' }, sub.name),
                        DOM.el('div', { style: 'font-size: 0.85rem; color: var(--text-muted);' }, sub.project),
                        DOM.el('span', { className: 'badge', style: 'background: ' + (sub.status === 'active' ? 'var(--success)' : 'var(--warning)') + '; color: white; margin-top: 0.5rem;' }, (sub.status || 'pending').toUpperCase())
                    ]),
                    DOM.el('div', { style: 'text-align: right;' }, [
                        DOM.el('div', { style: 'font-size: 1.25rem; font-weight: 700; color: var(--accent-primary);' }, formatCurrency(sub.amount || 0)),
                        DOM.el('div', { style: 'font-size: 0.85rem; color: var(--text-muted);' }, '/' + (sub.frequency || 'monthly')),
                        sub.next_billing ? DOM.el('div', { style: 'font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;' }, 'Nächste: ' + formatDate(sub.next_billing)) : null
                    ])
                ]));
            });
        }
    };

    // Add routes to Router
    if (typeof Router !== 'undefined' && Router.routes) {
        Router.routes['/projects'] = 'renderProjects';
        Router.routes['/projects/documents'] = 'renderProjectDocuments';
        Router.routes['/projects/deliverables'] = 'renderDeliverables';
        Router.routes['/finance/money'] = 'renderMoneyManagement';
        Router.routes['/finance/subscriptions'] = 'renderSubscriptions';
    }

    console.log('Projects & Money Management Module loaded!');
})();
