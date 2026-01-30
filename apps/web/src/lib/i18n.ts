// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS COMMAND CENTER - Internationalization (i18n) System
// Supports German (de) and English (en) with German as default
// ═══════════════════════════════════════════════════════════════════════════════

export type Locale = "de" | "en";

export const DEFAULT_LOCALE: Locale = "de";

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS OBJECT
// ═══════════════════════════════════════════════════════════════════════════════

export const translations = {
  de: {
    // ─────────────────────────────────────────────────────────────────────────
    // COMMON UI LABELS & BUTTONS
    // ─────────────────────────────────────────────────────────────────────────
    common: {
      submit: "Absenden",
      cancel: "Abbrechen",
      save: "Speichern",
      delete: "Löschen",
      edit: "Bearbeiten",
      close: "Schließen",
      back: "Zurück",
      next: "Weiter",
      previous: "Vorherige",
      search: "Suchen",
      filter: "Filtern",
      sort: "Sortieren",
      refresh: "Aktualisieren",
      loading: "Lädt...",
      error: "Fehler",
      success: "Erfolgreich",
      warning: "Warnung",
      info: "Information",
      confirm: "Bestätigen",
      yes: "Ja",
      no: "Nein",
      all: "Alle",
      none: "Keine",
      select: "Auswählen",
      selectAll: "Alle auswählen",
      clear: "Leeren",
      reset: "Zurücksetzen",
      apply: "Anwenden",
      create: "Erstellen",
      add: "Hinzufügen",
      remove: "Entfernen",
      update: "Aktualisieren",
      view: "Ansehen",
      download: "Herunterladen",
      upload: "Hochladen",
      export: "Exportieren",
      import: "Importieren",
      print: "Drucken",
      copy: "Kopieren",
      paste: "Einfügen",
      duplicate: "Duplizieren",
      archive: "Archivieren",
      restore: "Wiederherstellen",
      active: "Aktiv",
      inactive: "Inaktiv",
      enabled: "Aktiviert",
      disabled: "Deaktiviert",
      required: "Pflichtfeld",
      optional: "Optional",
      more: "Mehr",
      less: "Weniger",
      showMore: "Mehr anzeigen",
      showLess: "Weniger anzeigen",
      seeAll: "Alle ansehen",
      noResults: "Keine Ergebnisse",
      noData: "Keine Daten verfügbar",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FORM LABELS & VALIDATION
    // ─────────────────────────────────────────────────────────────────────────
    forms: {
      name: "Name",
      firstName: "Vorname",
      lastName: "Nachname",
      email: "E-Mail",
      phone: "Telefon",
      mobile: "Mobiltelefon",
      address: "Adresse",
      street: "Straße",
      city: "Stadt",
      postalCode: "Postleitzahl",
      country: "Land",
      company: "Firma",
      position: "Position",
      department: "Abteilung",
      website: "Webseite",
      notes: "Notizen",
      description: "Beschreibung",
      title: "Titel",
      subject: "Betreff",
      message: "Nachricht",
      date: "Datum",
      time: "Uhrzeit",
      startDate: "Startdatum",
      endDate: "Enddatum",
      dueDate: "Fälligkeitsdatum",
      deadline: "Deadline",
      status: "Status",
      priority: "Priorität",
      type: "Typ",
      category: "Kategorie",
      tags: "Tags",
      assignedTo: "Zugewiesen an",
      createdBy: "Erstellt von",
      createdAt: "Erstellt am",
      updatedAt: "Aktualisiert am",
      password: "Passwort",
      confirmPassword: "Passwort bestätigen",
      currentPassword: "Aktuelles Passwort",
      newPassword: "Neues Passwort",
      validation: {
        required: "Dieses Feld ist erforderlich",
        invalidEmail: "Ungültige E-Mail-Adresse",
        invalidPhone: "Ungültige Telefonnummer",
        minLength: "Mindestens {min} Zeichen erforderlich",
        maxLength: "Maximal {max} Zeichen erlaubt",
        passwordMismatch: "Passwörter stimmen nicht überein",
        invalidFormat: "Ungültiges Format",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD & NAVIGATION
    // ─────────────────────────────────────────────────────────────────────────
    dashboard: {
      title: "COMMAND DECK",
      subtitle: "Systemstatus",
      welcome: "Willkommen",
      overview: "Übersicht",
      stats: "Statistiken",
      activity: "Aktivität",
      recentActivity: "Letzte Aktivitäten",
      quickActions: "Schnellaktionen",
      systemStatus: "Systemstatus",
      operational: "BETRIEBSBEREIT",
      syncing: "SYNCHRONISIERE...",
      liveData: "Live-Daten verbunden",
      modules: "Module",
      moduleStatus: "Modulstatus",
      aiPerformance: "KI-LEISTUNG",
      realTimeMetrics: "Echtzeit-Metriken",
      neuralTerminal: "NEURAL TERMINAL",
      powerModes: "POWER MODI",
      godMode: "GOD MODE",
      ultraInstinct: "ULTRA INSTINCT",
      maximumPower: "Maximale Kraft",
      autonomousMode: "Autonomer Modus",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // METRICS & STATISTICS
    // ─────────────────────────────────────────────────────────────────────────
    metrics: {
      contacts: "Kontakte",
      activeContacts: "Aktive Kontakte",
      conversations: "Konversationen",
      messages: "Nachrichten",
      deals: "Deals",
      openDeals: "Offene Deals",
      closedDeals: "Abgeschlossene Deals",
      revenue: "Umsatz",
      revenueWon: "Umsatz (gewonnen)",
      commission: "Provision",
      totalCommission: "Gesamtprovision",
      pendingCommission: "Ausstehende Provision",
      projects: "Projekte",
      tasks: "Aufgaben",
      completedTasks: "Erledigte Aufgaben",
      pendingTasks: "Offene Aufgaben",
      referrals: "Empfehlungen",
      activeReferrals: "Aktive Empfehlungen",
      successRate: "Erfolgsrate",
      confidence: "Konfidenz",
      handled: "Bearbeitet",
      responses: "Antworten",
      aiResponses: "KI-Antworten",
      escalationRate: "Eskalationsrate",
      averageScore: "Durchschnittspunktzahl",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEAD SCORING
    // ─────────────────────────────────────────────────────────────────────────
    leadScoring: {
      title: "LEAD SCORING",
      subtitle: "KI-gestütztes Lead-Scoring",
      scoringEngine: "Scoring-Engine",
      aiScoringActive: "KI SCORING AKTIV",
      model: "Modell",
      leaderboard: "LEAD RANGLISTE",
      topScoredLeads: "Top bewertete Leads",
      distribution: "SCORE VERTEILUNG",
      byGrade: "Nach Bewertung",
      gradeChanges: "BEWERTUNGSÄNDERUNGEN",
      lastDays: "Letzte {days} Tage",
      scoringWeights: "SCORING GEWICHTUNG",
      configuration: "SCORING KONFIGURATION",
      currentConfig: "Aktuelle Konfiguration",
      editMode: "Bearbeitungsmodus",
      configure: "Konfigurieren",
      recalculateAll: "Alle neu berechnen",
      scoredLeads: "Bewertete Leads",
      avgScore: "Durchschn. Score",
      recentUpgrades: "Letzte Upgrades",
      hotLeads: "Heiße Leads",
      noScoredLeads: "Keine bewerteten Leads gefunden",
      noRecentChanges: "Keine aktuellen Änderungen",
      loadingChanges: "Lade Änderungen...",
      // Grade Labels
      grades: {
        A: "Bewertung A",
        B: "Bewertung B",
        C: "Bewertung C",
        D: "Bewertung D",
      },
      gradeDescriptions: {
        A: "Heißer Lead - Bereit zur Konvertierung",
        B: "Warmer Lead - Hohes Potenzial",
        C: "Kühler Lead - Pflege erforderlich",
        D: "Kalter Lead - Niedrige Priorität",
      },
      gradeRanges: {
        A: "Bewertung A (80-100)",
        B: "Bewertung B (60-79)",
        C: "Bewertung C (40-59)",
        D: "Bewertung D (0-39)",
      },
      gradeLabels: {
        hot: "Heiß",
        warm: "Warm",
        cool: "Kühl",
        cold: "Kalt",
      },
      // Scoring Weights
      weights: {
        engagement: "Engagement Score",
        firmographic: "Firmografischer Score",
        demographic: "Demografische Eignung",
        behavioral: "Verhaltens-Score",
        activity: "Aktivität",
      },
      // Actions
      score: "Score",
      points: "Punkte",
      leads: "Leads",
      totalScored: "Gesamt bewertet",
      adjustWeights: "Gewichte anpassen (muss 100% ergeben)",
      saveWeights: "Gewichte speichern",
      saving: "Speichere...",
      mustBe100: "muss 100% sein",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // BAUHERREN PASS (German Construction VIP Program)
    // ─────────────────────────────────────────────────────────────────────────
    bauherrenPass: {
      title: "BAUHERREN PASS",
      subtitle: "VIP Provisions- & Empfehlungsprogramm",
      powerLevel: "Power Level",
      loadingData: "LADE BAUHERREN DATEN...",
      currentStatus: "Aktueller Status",
      commissionRate: "Provisionssatz",
      power: "Power",
      progressTo: "Fortschritt zu",
      // Stats
      totalVolume: "GESAMTVOLUMEN",
      totalCommission: "GESAMTPROVISION",
      lifetimeEarnings: "Lebenszeitverdienst",
      pendingPayout: "AUSSTEHENDE AUSZAHLUNG",
      activeDeals: "Aktive Deals",
      activeReferrals: "AKTIVE EMPFEHLUNGEN",
      networkMembers: "Netzwerkmitglieder",
      // Sections
      recentDeals: "LETZTE DEALS",
      monthlyPerformance: "MONATLICHE LEISTUNG",
      tierProgression: "TIER PROGRESSION MATRIX",
      // Periods
      period: {
        month: "Monat",
        quarter: "Quartal",
        year: "Jahr",
      },
      // Tier Names (German)
      tiers: {
        bronze: "BRONZE OPERATIVE",
        silver: "SILBER AGENT",
        gold: "GOLD ELITE",
        platinum: "PLATIN COMMANDER",
        diamond: "DIAMANT OVERLORD",
      },
      // Deal Status
      dealStatus: {
        closed: "ABGESCHLOSSEN",
        pending: "AUSSTEHEND",
        processing: "IN BEARBEITUNG",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CRM & CONTACTS
    // ─────────────────────────────────────────────────────────────────────────
    crm: {
      title: "CRM NEXUS",
      contacts: "Kontakte",
      companies: "Firmen",
      deals: "Deals",
      activities: "Aktivitäten",
      pipelines: "Pipelines",
      segments: "Segmente",
      newContact: "Neuer Kontakt",
      newCompany: "Neue Firma",
      newDeal: "Neuer Deal",
      addNote: "Notiz hinzufügen",
      addTask: "Aufgabe hinzufügen",
      addActivity: "Aktivität hinzufügen",
      contactDetails: "Kontaktdetails",
      companyDetails: "Firmendetails",
      dealDetails: "Deal-Details",
      timeline: "Zeitachse",
      interactions: "Interaktionen",
      lastContact: "Letzter Kontakt",
      nextFollowUp: "Nächster Follow-up",
      dealValue: "Deal-Wert",
      probability: "Wahrscheinlichkeit",
      expectedClose: "Erwarteter Abschluss",
      stages: {
        lead: "Lead",
        qualified: "Qualifiziert",
        proposal: "Angebot",
        negotiation: "Verhandlung",
        closed: "Abgeschlossen",
        lost: "Verloren",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // WHATSAPP & MESSAGING
    // ─────────────────────────────────────────────────────────────────────────
    messaging: {
      title: "WHATSAPP CONSOLE",
      conversations: "Konversationen",
      messages: "Nachrichten",
      broadcast: "Broadcast",
      templates: "Vorlagen",
      newMessage: "Neue Nachricht",
      newBroadcast: "Neuer Broadcast",
      sendMessage: "Nachricht senden",
      typeMessage: "Nachricht eingeben...",
      delivered: "Zugestellt",
      read: "Gelesen",
      sent: "Gesendet",
      failed: "Fehlgeschlagen",
      pending: "Ausstehend",
      online: "Online",
      offline: "Offline",
      lastSeen: "Zuletzt gesehen",
      mediaAttachment: "Medienanhang",
      documentAttachment: "Dokumentanhang",
      quickReplies: "Schnellantworten",
      aiAssist: "KI-Assistent",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL TEMPLATES
    // ─────────────────────────────────────────────────────────────────────────
    email: {
      templates: {
        // Welcome Email
        welcome: {
          subject: "Willkommen bei NEXUS COMMAND CENTER",
          greeting: "Hallo {name},",
          body: "Herzlich willkommen bei NEXUS COMMAND CENTER! Wir freuen uns, Sie an Bord zu haben.",
          cta: "Jetzt starten",
          closing: "Mit freundlichen Grüßen,\nDas NEXUS Team",
        },
        // Lead Follow-up
        leadFollowUp: {
          subject: "Vielen Dank für Ihr Interesse",
          greeting: "Sehr geehrte(r) {name},",
          body: "Vielen Dank für Ihr Interesse an unseren Dienstleistungen. Gerne möchten wir Ihnen weitere Informationen zukommen lassen.",
          cta: "Termin vereinbaren",
          closing: "Mit freundlichen Grüßen,\nIhr Ansprechpartner",
        },
        // Deal Won
        dealWon: {
          subject: "Herzlichen Glückwunsch zum Abschluss!",
          greeting: "Liebe(r) {name},",
          body: "Wir freuen uns, Ihnen mitteilen zu können, dass der Deal erfolgreich abgeschlossen wurde.",
          cta: "Details ansehen",
          closing: "Herzliche Grüße,\nDas Team",
        },
        // Appointment Reminder
        appointmentReminder: {
          subject: "Erinnerung: Ihr Termin am {date}",
          greeting: "Hallo {name},",
          body: "Dies ist eine freundliche Erinnerung an Ihren bevorstehenden Termin.",
          details: "Termin: {date} um {time}",
          cta: "Termin bestätigen",
          closing: "Bis bald!",
        },
        // Commission Notification
        commissionNotification: {
          subject: "Neue Provision verfügbar",
          greeting: "Hallo {name},",
          body: "Herzlichen Glückwunsch! Sie haben eine neue Provision verdient.",
          amount: "Betrag: {amount}",
          cta: "Auszahlung anfordern",
          closing: "Weiter so!\nIhr NEXUS Team",
        },
        // Monthly Report
        monthlyReport: {
          subject: "Ihr monatlicher Bericht - {month}",
          greeting: "Hallo {name},",
          body: "Hier ist Ihr monatlicher Leistungsbericht.",
          cta: "Vollständigen Bericht ansehen",
          closing: "Beste Grüße,\nNEXUS Analytics",
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AI AGENTS
    // ─────────────────────────────────────────────────────────────────────────
    ai: {
      title: "NEXUS KI",
      agents: "KI AGENTEN",
      neuralNetworkStatus: "Neural Network Status",
      agent: "Agent",
      status: {
        active: "Aktiv",
        standby: "Bereitschaft",
        processing: "Verarbeitet",
        offline: "Offline",
      },
      roles: {
        whatsappAgent: "WhatsApp Agent",
        scoringEngine: "Scoring Engine",
        commandCenter: "Command Center",
      },
      chat: {
        title: "KI Chat",
        placeholder: "Nachricht eingeben...",
        send: "Senden",
        thinking: "Denkt nach...",
        error: "Fehler bei der Verarbeitung",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CONSTRUCTION / WEST MONEY BAU
    // ─────────────────────────────────────────────────────────────────────────
    construction: {
      title: "WEST MONEY BAU",
      projects: "Projekte",
      milestones: "Meilensteine",
      phases: "Phasen",
      progress: "Fortschritt",
      timeline: "Zeitplan",
      budget: "Budget",
      materials: "Materialien",
      workers: "Arbeiter",
      inspections: "Inspektionen",
      permits: "Genehmigungen",
      documents: "Dokumente",
      photos: "Fotos",
      updates: "Updates",
      siteVisit: "Baustellenbesuch",
      projectStatus: {
        planning: "Planung",
        inProgress: "In Bearbeitung",
        onHold: "Pausiert",
        completed: "Abgeschlossen",
        delayed: "Verzögert",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // NAVIGATION & SIDEBAR
    // ─────────────────────────────────────────────────────────────────────────
    navigation: {
      commandDeck: "Command Deck",
      crm: "CRM Nexus",
      whatsapp: "WhatsApp Console",
      leadScoring: "Lead Scoring",
      bauherrenPass: "Bauherren Pass",
      westMoneyBau: "West Money Bau",
      analytics: "Analytics",
      ai: "NEXUS KI",
      terminal: "Terminal",
      settings: "Einstellungen",
      profile: "Profil",
      logout: "Abmelden",
      help: "Hilfe",
      documentation: "Dokumentation",
      support: "Support",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // TIME & DATE
    // ─────────────────────────────────────────────────────────────────────────
    time: {
      now: "Jetzt",
      today: "Heute",
      yesterday: "Gestern",
      tomorrow: "Morgen",
      thisWeek: "Diese Woche",
      lastWeek: "Letzte Woche",
      nextWeek: "Nächste Woche",
      thisMonth: "Diesen Monat",
      lastMonth: "Letzten Monat",
      nextMonth: "Nächsten Monat",
      thisYear: "Dieses Jahr",
      lastYear: "Letztes Jahr",
      ago: "vor",
      in: "in",
      seconds: "Sekunden",
      minutes: "Minuten",
      hours: "Stunden",
      days: "Tage",
      weeks: "Wochen",
      months: "Monate",
      years: "Jahre",
      justNow: "gerade eben",
      minutesAgo: "vor {count} Minuten",
      hoursAgo: "vor {count} Stunden",
      daysAgo: "vor {count} Tagen",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION
    // ─────────────────────────────────────────────────────────────────────────
    auth: {
      login: "Anmelden",
      logout: "Abmelden",
      register: "Registrieren",
      signIn: "Einloggen",
      signOut: "Ausloggen",
      signUp: "Konto erstellen",
      forgotPassword: "Passwort vergessen?",
      resetPassword: "Passwort zurücksetzen",
      rememberMe: "Angemeldet bleiben",
      welcomeBack: "Willkommen zurück",
      createAccount: "Konto erstellen",
      alreadyHaveAccount: "Bereits ein Konto?",
      dontHaveAccount: "Noch kein Konto?",
      loginSuccess: "Erfolgreich angemeldet",
      loginError: "Anmeldung fehlgeschlagen",
      logoutSuccess: "Erfolgreich abgemeldet",
      sessionExpired: "Sitzung abgelaufen",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────
    notifications: {
      title: "Benachrichtigungen",
      markAllRead: "Alle als gelesen markieren",
      clearAll: "Alle löschen",
      noNotifications: "Keine neuen Benachrichtigungen",
      newMessage: "Neue Nachricht",
      newDeal: "Neuer Deal",
      taskDue: "Aufgabe fällig",
      leadScoreChanged: "Lead-Score geändert",
      systemAlert: "Systemwarnung",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SETTINGS
    // ─────────────────────────────────────────────────────────────────────────
    settings: {
      title: "Einstellungen",
      general: "Allgemein",
      account: "Konto",
      notifications: "Benachrichtigungen",
      security: "Sicherheit",
      privacy: "Datenschutz",
      appearance: "Erscheinungsbild",
      language: "Sprache",
      timezone: "Zeitzone",
      dateFormat: "Datumsformat",
      theme: "Design",
      darkMode: "Dunkelmodus",
      lightMode: "Hellmodus",
      systemDefault: "Systemstandard",
      saveChanges: "Änderungen speichern",
      changesSaved: "Änderungen gespeichert",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    errors: {
      generic: "Ein Fehler ist aufgetreten",
      notFound: "Nicht gefunden",
      unauthorized: "Nicht autorisiert",
      forbidden: "Zugriff verweigert",
      serverError: "Serverfehler",
      networkError: "Netzwerkfehler",
      timeout: "Zeitüberschreitung",
      invalidData: "Ungültige Daten",
      tryAgain: "Bitte versuchen Sie es erneut",
      contactSupport: "Bitte kontaktieren Sie den Support",
    },
  },

  en: {
    // ─────────────────────────────────────────────────────────────────────────
    // COMMON UI LABELS & BUTTONS
    // ─────────────────────────────────────────────────────────────────────────
    common: {
      submit: "Submit",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      back: "Back",
      next: "Next",
      previous: "Previous",
      search: "Search",
      filter: "Filter",
      sort: "Sort",
      refresh: "Refresh",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      warning: "Warning",
      info: "Information",
      confirm: "Confirm",
      yes: "Yes",
      no: "No",
      all: "All",
      none: "None",
      select: "Select",
      selectAll: "Select All",
      clear: "Clear",
      reset: "Reset",
      apply: "Apply",
      create: "Create",
      add: "Add",
      remove: "Remove",
      update: "Update",
      view: "View",
      download: "Download",
      upload: "Upload",
      export: "Export",
      import: "Import",
      print: "Print",
      copy: "Copy",
      paste: "Paste",
      duplicate: "Duplicate",
      archive: "Archive",
      restore: "Restore",
      active: "Active",
      inactive: "Inactive",
      enabled: "Enabled",
      disabled: "Disabled",
      required: "Required",
      optional: "Optional",
      more: "More",
      less: "Less",
      showMore: "Show More",
      showLess: "Show Less",
      seeAll: "See All",
      noResults: "No Results",
      noData: "No Data Available",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FORM LABELS & VALIDATION
    // ─────────────────────────────────────────────────────────────────────────
    forms: {
      name: "Name",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      phone: "Phone",
      mobile: "Mobile",
      address: "Address",
      street: "Street",
      city: "City",
      postalCode: "Postal Code",
      country: "Country",
      company: "Company",
      position: "Position",
      department: "Department",
      website: "Website",
      notes: "Notes",
      description: "Description",
      title: "Title",
      subject: "Subject",
      message: "Message",
      date: "Date",
      time: "Time",
      startDate: "Start Date",
      endDate: "End Date",
      dueDate: "Due Date",
      deadline: "Deadline",
      status: "Status",
      priority: "Priority",
      type: "Type",
      category: "Category",
      tags: "Tags",
      assignedTo: "Assigned To",
      createdBy: "Created By",
      createdAt: "Created At",
      updatedAt: "Updated At",
      password: "Password",
      confirmPassword: "Confirm Password",
      currentPassword: "Current Password",
      newPassword: "New Password",
      validation: {
        required: "This field is required",
        invalidEmail: "Invalid email address",
        invalidPhone: "Invalid phone number",
        minLength: "Minimum {min} characters required",
        maxLength: "Maximum {max} characters allowed",
        passwordMismatch: "Passwords do not match",
        invalidFormat: "Invalid format",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD & NAVIGATION
    // ─────────────────────────────────────────────────────────────────────────
    dashboard: {
      title: "COMMAND DECK",
      subtitle: "System Status",
      welcome: "Welcome",
      overview: "Overview",
      stats: "Statistics",
      activity: "Activity",
      recentActivity: "Recent Activity",
      quickActions: "Quick Actions",
      systemStatus: "System Status",
      operational: "OPERATIONAL",
      syncing: "SYNCING...",
      liveData: "Live Data Connected",
      modules: "Modules",
      moduleStatus: "Module Status",
      aiPerformance: "AI PERFORMANCE",
      realTimeMetrics: "Real-time metrics",
      neuralTerminal: "NEURAL TERMINAL",
      powerModes: "POWER MODES",
      godMode: "GOD MODE",
      ultraInstinct: "ULTRA INSTINCT",
      maximumPower: "Maximum Power",
      autonomousMode: "Autonomous Mode",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // METRICS & STATISTICS
    // ─────────────────────────────────────────────────────────────────────────
    metrics: {
      contacts: "Contacts",
      activeContacts: "Active Contacts",
      conversations: "Conversations",
      messages: "Messages",
      deals: "Deals",
      openDeals: "Open Deals",
      closedDeals: "Closed Deals",
      revenue: "Revenue",
      revenueWon: "Revenue (Won)",
      commission: "Commission",
      totalCommission: "Total Commission",
      pendingCommission: "Pending Commission",
      projects: "Projects",
      tasks: "Tasks",
      completedTasks: "Completed Tasks",
      pendingTasks: "Pending Tasks",
      referrals: "Referrals",
      activeReferrals: "Active Referrals",
      successRate: "Success Rate",
      confidence: "Confidence",
      handled: "Handled",
      responses: "Responses",
      aiResponses: "AI Responses",
      escalationRate: "Escalation Rate",
      averageScore: "Average Score",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEAD SCORING
    // ─────────────────────────────────────────────────────────────────────────
    leadScoring: {
      title: "LEAD SCORING",
      subtitle: "AI-Powered Lead Scoring",
      scoringEngine: "Scoring Engine",
      aiScoringActive: "AI SCORING ACTIVE",
      model: "Model",
      leaderboard: "LEAD LEADERBOARD",
      topScoredLeads: "Top scored leads",
      distribution: "SCORE DISTRIBUTION",
      byGrade: "By grade",
      gradeChanges: "GRADE CHANGES",
      lastDays: "Last {days} days",
      scoringWeights: "SCORING WEIGHTS",
      configuration: "SCORING CONFIGURATION",
      currentConfig: "Current configuration",
      editMode: "Edit Mode",
      configure: "Configure",
      recalculateAll: "Recalculate All",
      scoredLeads: "Scored Leads",
      avgScore: "Avg Score",
      recentUpgrades: "Recent Upgrades",
      hotLeads: "Hot Leads",
      noScoredLeads: "No scored leads found",
      noRecentChanges: "No recent grade changes",
      loadingChanges: "Loading changes...",
      // Grade Labels
      grades: {
        A: "Grade A",
        B: "Grade B",
        C: "Grade C",
        D: "Grade D",
      },
      gradeDescriptions: {
        A: "Hot Lead - Ready to convert",
        B: "Warm Lead - High potential",
        C: "Cool Lead - Needs nurturing",
        D: "Cold Lead - Low priority",
      },
      gradeRanges: {
        A: "Grade A (80-100)",
        B: "Grade B (60-79)",
        C: "Grade C (40-59)",
        D: "Grade D (0-39)",
      },
      gradeLabels: {
        hot: "Hot",
        warm: "Warm",
        cool: "Cool",
        cold: "Cold",
      },
      // Scoring Weights
      weights: {
        engagement: "Engagement Score",
        firmographic: "Firmographic Score",
        demographic: "Demographic Fit",
        behavioral: "Behavioral Score",
        activity: "Activity",
      },
      // Actions
      score: "Score",
      points: "points",
      leads: "leads",
      totalScored: "total scored",
      adjustWeights: "Adjust weights (must total 100%)",
      saveWeights: "Save Weights",
      saving: "Saving...",
      mustBe100: "must be 100%",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // BAUHERREN PASS (German Construction VIP Program)
    // ─────────────────────────────────────────────────────────────────────────
    bauherrenPass: {
      title: "BAUHERREN PASS",
      subtitle: "VIP Commission & Referral Program",
      powerLevel: "Power Level",
      loadingData: "LOADING BAUHERREN DATA...",
      currentStatus: "Current Status",
      commissionRate: "Commission Rate",
      power: "Power",
      progressTo: "Progress to",
      // Stats
      totalVolume: "TOTAL VOLUME",
      totalCommission: "TOTAL COMMISSION",
      lifetimeEarnings: "Lifetime Earnings",
      pendingPayout: "PENDING PAYOUT",
      activeDeals: "Active Deals",
      activeReferrals: "ACTIVE REFERRALS",
      networkMembers: "Network Members",
      // Sections
      recentDeals: "RECENT DEALS",
      monthlyPerformance: "MONTHLY PERFORMANCE",
      tierProgression: "TIER PROGRESSION MATRIX",
      // Periods
      period: {
        month: "Month",
        quarter: "Quarter",
        year: "Year",
      },
      // Tier Names (Keep German names for branding)
      tiers: {
        bronze: "BRONZE OPERATIVE",
        silver: "SILVER AGENT",
        gold: "GOLD ELITE",
        platinum: "PLATINUM COMMANDER",
        diamond: "DIAMOND OVERLORD",
      },
      // Deal Status
      dealStatus: {
        closed: "CLOSED",
        pending: "PENDING",
        processing: "PROCESSING",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CRM & CONTACTS
    // ─────────────────────────────────────────────────────────────────────────
    crm: {
      title: "CRM NEXUS",
      contacts: "Contacts",
      companies: "Companies",
      deals: "Deals",
      activities: "Activities",
      pipelines: "Pipelines",
      segments: "Segments",
      newContact: "New Contact",
      newCompany: "New Company",
      newDeal: "New Deal",
      addNote: "Add Note",
      addTask: "Add Task",
      addActivity: "Add Activity",
      contactDetails: "Contact Details",
      companyDetails: "Company Details",
      dealDetails: "Deal Details",
      timeline: "Timeline",
      interactions: "Interactions",
      lastContact: "Last Contact",
      nextFollowUp: "Next Follow-up",
      dealValue: "Deal Value",
      probability: "Probability",
      expectedClose: "Expected Close",
      stages: {
        lead: "Lead",
        qualified: "Qualified",
        proposal: "Proposal",
        negotiation: "Negotiation",
        closed: "Closed",
        lost: "Lost",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // WHATSAPP & MESSAGING
    // ─────────────────────────────────────────────────────────────────────────
    messaging: {
      title: "WHATSAPP CONSOLE",
      conversations: "Conversations",
      messages: "Messages",
      broadcast: "Broadcast",
      templates: "Templates",
      newMessage: "New Message",
      newBroadcast: "New Broadcast",
      sendMessage: "Send Message",
      typeMessage: "Type a message...",
      delivered: "Delivered",
      read: "Read",
      sent: "Sent",
      failed: "Failed",
      pending: "Pending",
      online: "Online",
      offline: "Offline",
      lastSeen: "Last seen",
      mediaAttachment: "Media Attachment",
      documentAttachment: "Document Attachment",
      quickReplies: "Quick Replies",
      aiAssist: "AI Assist",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL TEMPLATES
    // ─────────────────────────────────────────────────────────────────────────
    email: {
      templates: {
        // Welcome Email
        welcome: {
          subject: "Welcome to NEXUS COMMAND CENTER",
          greeting: "Hello {name},",
          body: "Welcome to NEXUS COMMAND CENTER! We're excited to have you on board.",
          cta: "Get Started",
          closing: "Best regards,\nThe NEXUS Team",
        },
        // Lead Follow-up
        leadFollowUp: {
          subject: "Thank you for your interest",
          greeting: "Dear {name},",
          body: "Thank you for your interest in our services. We would like to provide you with more information.",
          cta: "Schedule a meeting",
          closing: "Best regards,\nYour contact person",
        },
        // Deal Won
        dealWon: {
          subject: "Congratulations on closing the deal!",
          greeting: "Dear {name},",
          body: "We are pleased to inform you that the deal has been successfully closed.",
          cta: "View Details",
          closing: "Kind regards,\nThe Team",
        },
        // Appointment Reminder
        appointmentReminder: {
          subject: "Reminder: Your appointment on {date}",
          greeting: "Hello {name},",
          body: "This is a friendly reminder about your upcoming appointment.",
          details: "Appointment: {date} at {time}",
          cta: "Confirm Appointment",
          closing: "See you soon!",
        },
        // Commission Notification
        commissionNotification: {
          subject: "New commission available",
          greeting: "Hello {name},",
          body: "Congratulations! You have earned a new commission.",
          amount: "Amount: {amount}",
          cta: "Request Payout",
          closing: "Keep up the great work!\nYour NEXUS Team",
        },
        // Monthly Report
        monthlyReport: {
          subject: "Your monthly report - {month}",
          greeting: "Hello {name},",
          body: "Here is your monthly performance report.",
          cta: "View Full Report",
          closing: "Best regards,\nNEXUS Analytics",
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AI AGENTS
    // ─────────────────────────────────────────────────────────────────────────
    ai: {
      title: "NEXUS AI",
      agents: "AI AGENTS",
      neuralNetworkStatus: "Neural Network Status",
      agent: "Agent",
      status: {
        active: "Active",
        standby: "Standby",
        processing: "Processing",
        offline: "Offline",
      },
      roles: {
        whatsappAgent: "WhatsApp Agent",
        scoringEngine: "Scoring Engine",
        commandCenter: "Command Center",
      },
      chat: {
        title: "AI Chat",
        placeholder: "Type a message...",
        send: "Send",
        thinking: "Thinking...",
        error: "Error processing request",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CONSTRUCTION / WEST MONEY BAU
    // ─────────────────────────────────────────────────────────────────────────
    construction: {
      title: "WEST MONEY BAU",
      projects: "Projects",
      milestones: "Milestones",
      phases: "Phases",
      progress: "Progress",
      timeline: "Timeline",
      budget: "Budget",
      materials: "Materials",
      workers: "Workers",
      inspections: "Inspections",
      permits: "Permits",
      documents: "Documents",
      photos: "Photos",
      updates: "Updates",
      siteVisit: "Site Visit",
      projectStatus: {
        planning: "Planning",
        inProgress: "In Progress",
        onHold: "On Hold",
        completed: "Completed",
        delayed: "Delayed",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // NAVIGATION & SIDEBAR
    // ─────────────────────────────────────────────────────────────────────────
    navigation: {
      commandDeck: "Command Deck",
      crm: "CRM Nexus",
      whatsapp: "WhatsApp Console",
      leadScoring: "Lead Scoring",
      bauherrenPass: "Bauherren Pass",
      westMoneyBau: "West Money Bau",
      analytics: "Analytics",
      ai: "NEXUS AI",
      terminal: "Terminal",
      settings: "Settings",
      profile: "Profile",
      logout: "Logout",
      help: "Help",
      documentation: "Documentation",
      support: "Support",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // TIME & DATE
    // ─────────────────────────────────────────────────────────────────────────
    time: {
      now: "Now",
      today: "Today",
      yesterday: "Yesterday",
      tomorrow: "Tomorrow",
      thisWeek: "This Week",
      lastWeek: "Last Week",
      nextWeek: "Next Week",
      thisMonth: "This Month",
      lastMonth: "Last Month",
      nextMonth: "Next Month",
      thisYear: "This Year",
      lastYear: "Last Year",
      ago: "ago",
      in: "in",
      seconds: "seconds",
      minutes: "minutes",
      hours: "hours",
      days: "days",
      weeks: "weeks",
      months: "months",
      years: "years",
      justNow: "just now",
      minutesAgo: "{count} minutes ago",
      hoursAgo: "{count} hours ago",
      daysAgo: "{count} days ago",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION
    // ─────────────────────────────────────────────────────────────────────────
    auth: {
      login: "Login",
      logout: "Logout",
      register: "Register",
      signIn: "Sign In",
      signOut: "Sign Out",
      signUp: "Sign Up",
      forgotPassword: "Forgot Password?",
      resetPassword: "Reset Password",
      rememberMe: "Remember Me",
      welcomeBack: "Welcome Back",
      createAccount: "Create Account",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
      loginSuccess: "Successfully logged in",
      loginError: "Login failed",
      logoutSuccess: "Successfully logged out",
      sessionExpired: "Session expired",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────
    notifications: {
      title: "Notifications",
      markAllRead: "Mark all as read",
      clearAll: "Clear all",
      noNotifications: "No new notifications",
      newMessage: "New message",
      newDeal: "New deal",
      taskDue: "Task due",
      leadScoreChanged: "Lead score changed",
      systemAlert: "System alert",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SETTINGS
    // ─────────────────────────────────────────────────────────────────────────
    settings: {
      title: "Settings",
      general: "General",
      account: "Account",
      notifications: "Notifications",
      security: "Security",
      privacy: "Privacy",
      appearance: "Appearance",
      language: "Language",
      timezone: "Timezone",
      dateFormat: "Date Format",
      theme: "Theme",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
      systemDefault: "System Default",
      saveChanges: "Save Changes",
      changesSaved: "Changes saved",
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    errors: {
      generic: "An error occurred",
      notFound: "Not found",
      unauthorized: "Unauthorized",
      forbidden: "Access denied",
      serverError: "Server error",
      networkError: "Network error",
      timeout: "Request timeout",
      invalidData: "Invalid data",
      tryAgain: "Please try again",
      contactSupport: "Please contact support",
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type Translations = typeof translations;
export type TranslationKeys = keyof typeof translations.de;

// Deep key path type for nested translations
type PathImpl<T, K extends keyof T> = K extends string
  ? T[K] extends Record<string, unknown>
    ? `${K}.${PathImpl<T[K], keyof T[K]>}` | K
    : K
  : never;

type Path<T> = PathImpl<T, keyof T>;

export type TranslationPath = Path<typeof translations.de>;

// ═══════════════════════════════════════════════════════════════════════════════
// LOCALE STORAGE & STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const LOCALE_STORAGE_KEY = "nexus-locale";

/**
 * Get the stored locale from localStorage (client-side only)
 */
export function getStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "de" || stored === "en") {
      return stored;
    }
  } catch {
    // localStorage may not be available
  }

  return DEFAULT_LOCALE;
}

/**
 * Store the locale in localStorage (client-side only)
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage may not be available
  }
}

/**
 * Get browser's preferred locale
 */
export function getBrowserLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const browserLang = navigator.language.split("-")[0];
  return browserLang === "en" ? "en" : "de";
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATION HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a nested translation value by dot-separated path
 */
export function getNestedTranslation(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Replace template variables in a string
 * Example: "Hello {name}" with { name: "John" } becomes "Hello John"
 */
export function interpolate(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/{(\w+)}/g, (_, key) => {
    return variables[key]?.toString() ?? `{${key}}`;
  });
}

/**
 * Create a translation function for a specific locale
 */
export function createTranslator(locale: Locale) {
  const localeTranslations = translations[locale];

  return function t(
    path: string,
    variables?: Record<string, string | number>
  ): string {
    const translation = getNestedTranslation(
      localeTranslations as unknown as Record<string, unknown>,
      path
    );

    if (!translation) {
      // Fallback to default locale
      if (locale !== DEFAULT_LOCALE) {
        const fallback = getNestedTranslation(
          translations[DEFAULT_LOCALE] as unknown as Record<string, unknown>,
          path
        );
        if (fallback) {
          return variables ? interpolate(fallback, variables) : fallback;
        }
      }
      // Return the path itself as fallback
      console.warn(`Missing translation: ${path}`);
      return path;
    }

    return variables ? interpolate(translation, variables) : translation;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK - useTranslation
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from "react";

interface UseTranslationReturn {
  /** Current locale */
  locale: Locale;
  /** Translation function - get translated string by path */
  t: (path: string, variables?: Record<string, string | number>) => string;
  /** Change the current locale */
  setLocale: (locale: Locale) => void;
  /** Check if current locale is the default (German) */
  isDefaultLocale: boolean;
  /** Available locales */
  locales: readonly Locale[];
  /** Locale display names */
  localeNames: Record<Locale, string>;
}

const LOCALES: readonly Locale[] = ["de", "en"] as const;

const LOCALE_NAMES: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
};

/**
 * React hook for internationalization
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, setLocale } = useTranslation();
 *
 *   return (
 *     <div>
 *       <h1>{t("dashboard.title")}</h1>
 *       <p>{t("email.templates.welcome.greeting", { name: "Max" })}</p>
 *       <button onClick={() => setLocale(locale === "de" ? "en" : "de")}>
 *         {t("settings.language")}: {locale.toUpperCase()}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize locale from storage on client side
  useEffect(() => {
    const storedLocale = getStoredLocale();
    setLocaleState(storedLocale);
    setIsHydrated(true);
  }, []);

  // Memoized translation function
  const t = useMemo(() => {
    return createTranslator(locale);
  }, [locale]);

  // Set locale and persist to storage
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);

    // Dispatch custom event for other components to listen
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("locale-change", { detail: { locale: newLocale } })
      );
    }
  }, []);

  // Listen for locale changes from other components/tabs
  useEffect(() => {
    const handleLocaleChange = (event: CustomEvent<{ locale: Locale }>) => {
      setLocaleState(event.detail.locale);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && event.newValue) {
        const newLocale = event.newValue as Locale;
        if (newLocale === "de" || newLocale === "en") {
          setLocaleState(newLocale);
        }
      }
    };

    window.addEventListener("locale-change", handleLocaleChange as EventListener);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("locale-change", handleLocaleChange as EventListener);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return {
    locale,
    t,
    setLocale,
    isDefaultLocale: locale === DEFAULT_LOCALE,
    locales: LOCALES,
    localeNames: LOCALE_NAMES,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a number according to locale
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const localeCode = locale === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(localeCode, options).format(value);
}

/**
 * Format currency according to locale
 */
export function formatCurrency(
  value: number,
  locale: Locale,
  currency: string = "EUR"
): string {
  const localeCode = locale === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(localeCode, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format date according to locale
 */
export function formatDate(
  date: Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const localeCode = locale === "de" ? "de-DE" : "en-US";
  return new Intl.DateTimeFormat(localeCode, options).format(date);
}

/**
 * Format time according to locale
 */
export function formatTime(date: Date, locale: Locale): string {
  const localeCode = locale === "de" ? "de-DE" : "en-US";
  return date.toLocaleTimeString(localeCode);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date,
  locale: Locale
): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const t = createTranslator(locale);

  if (diffSeconds < 60) {
    return t("time.justNow");
  }
  if (diffMinutes < 60) {
    return t("time.minutesAgo", { count: diffMinutes });
  }
  if (diffHours < 24) {
    return t("time.hoursAgo", { count: diffHours });
  }
  return t("time.daysAgo", { count: diffDays });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE SELECTOR COMPONENT DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const languageOptions = [
  { value: "de" as Locale, label: "Deutsch", flag: "🇩🇪" },
  { value: "en" as Locale, label: "English", flag: "🇬🇧" },
] as const;
