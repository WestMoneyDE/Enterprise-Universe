// =============================================================================
// GOOGLE CALENDAR INTEGRATION
// Sync events, create appointments, and manage calendars
// =============================================================================

export interface GoogleCalendarConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  calendarId?: string; // Primary calendar if not specified
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: EventAttendee[];
  reminders?: EventReminders;
  conferenceData?: ConferenceData;
  colorId?: string;
  recurrence?: string[];
  status?: "confirmed" | "tentative" | "cancelled";
  visibility?: "default" | "public" | "private" | "confidential";
}

export interface EventDateTime {
  dateTime?: string; // ISO 8601 format
  date?: string; // YYYY-MM-DD for all-day events
  timeZone?: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  optional?: boolean;
  responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
}

export interface EventReminders {
  useDefault: boolean;
  overrides?: Array<{
    method: "email" | "popup";
    minutes: number;
  }>;
}

export interface ConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: { type: "hangoutsMeet" };
  };
  entryPoints?: Array<{
    entryPointType: "video" | "phone" | "sip" | "more";
    uri: string;
    label?: string;
    pin?: string;
  }>;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface FreeBusyInfo {
  calendarId: string;
  busy: Array<{
    start: string;
    end: string;
  }>;
}

export interface GoogleCalendarResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// GOOGLE CALENDAR INTEGRATION CLASS
// =============================================================================

export class GoogleCalendarIntegration {
  private accessToken?: string;
  private refreshToken?: string;
  private clientId?: string;
  private clientSecret?: string;
  private calendarId: string;
  private tokenExpiresAt?: number;

  private readonly API_BASE = "https://www.googleapis.com/calendar/v3";
  private readonly TOKEN_URL = "https://oauth2.googleapis.com/token";

  constructor(config: GoogleCalendarConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
    this.calendarId = config.calendarId || "primary";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════════

  private async ensureAccessToken(): Promise<string> {
    // Check if current token is still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 300000) {
      return this.accessToken;
    }

    // Refresh the token
    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      throw new Error("Google Calendar credentials not configured");
    }

    const response = await fetch(this.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    if (!this.accessToken) {
      throw new Error("Failed to obtain access token");
    }
    return this.accessToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<GoogleCalendarResponse<T>> {
    try {
      const token = await this.ensureAccessToken();

      const response = await fetch(`${this.API_BASE}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}`,
        };
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all calendars the user has access to
   */
  async listCalendars(): Promise<GoogleCalendarResponse<CalendarListEntry[]>> {
    const result = await this.makeRequest<{ items: CalendarListEntry[] }>("/users/me/calendarList");

    if (result.success && result.data) {
      return { success: true, data: result.data.items };
    }
    return { success: false, error: result.error };
  }

  /**
   * Get a specific calendar's details
   */
  async getCalendar(calendarId?: string): Promise<GoogleCalendarResponse<CalendarListEntry>> {
    const id = encodeURIComponent(calendarId || this.calendarId);
    return this.makeRequest(`/users/me/calendarList/${id}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List events from a calendar
   */
  async listEvents(options: {
    calendarId?: string;
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: "startTime" | "updated";
    q?: string; // Search query
  } = {}): Promise<GoogleCalendarResponse<CalendarEvent[]>> {
    const calendarId = encodeURIComponent(options.calendarId || this.calendarId);
    const params = new URLSearchParams();

    if (options.timeMin) params.set("timeMin", options.timeMin.toISOString());
    if (options.timeMax) params.set("timeMax", options.timeMax.toISOString());
    if (options.maxResults) params.set("maxResults", String(options.maxResults));
    if (options.singleEvents !== undefined) params.set("singleEvents", String(options.singleEvents));
    if (options.orderBy) params.set("orderBy", options.orderBy);
    if (options.q) params.set("q", options.q);

    const result = await this.makeRequest<{ items: CalendarEvent[] }>(
      `/calendars/${calendarId}/events?${params}`
    );

    if (result.success && result.data) {
      return { success: true, data: result.data.items || [] };
    }
    return { success: false, error: result.error };
  }

  /**
   * Get a specific event
   */
  async getEvent(eventId: string, calendarId?: string): Promise<GoogleCalendarResponse<CalendarEvent>> {
    const calId = encodeURIComponent(calendarId || this.calendarId);
    return this.makeRequest(`/calendars/${calId}/events/${encodeURIComponent(eventId)}`);
  }

  /**
   * Create a new event
   */
  async createEvent(
    event: Omit<CalendarEvent, "id">,
    options: {
      calendarId?: string;
      sendUpdates?: "all" | "externalOnly" | "none";
      conferenceDataVersion?: 0 | 1;
    } = {}
  ): Promise<GoogleCalendarResponse<CalendarEvent>> {
    const calendarId = encodeURIComponent(options.calendarId || this.calendarId);
    const params = new URLSearchParams();

    if (options.sendUpdates) params.set("sendUpdates", options.sendUpdates);
    if (options.conferenceDataVersion !== undefined) {
      params.set("conferenceDataVersion", String(options.conferenceDataVersion));
    }

    const query = params.toString() ? `?${params}` : "";

    return this.makeRequest(`/calendars/${calendarId}/events${query}`, {
      method: "POST",
      body: JSON.stringify(event),
    });
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>,
    options: {
      calendarId?: string;
      sendUpdates?: "all" | "externalOnly" | "none";
    } = {}
  ): Promise<GoogleCalendarResponse<CalendarEvent>> {
    const calendarId = encodeURIComponent(options.calendarId || this.calendarId);
    const params = new URLSearchParams();

    if (options.sendUpdates) params.set("sendUpdates", options.sendUpdates);

    const query = params.toString() ? `?${params}` : "";

    return this.makeRequest(`/calendars/${calendarId}/events/${encodeURIComponent(eventId)}${query}`, {
      method: "PATCH",
      body: JSON.stringify(event),
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    eventId: string,
    options: {
      calendarId?: string;
      sendUpdates?: "all" | "externalOnly" | "none";
    } = {}
  ): Promise<GoogleCalendarResponse<void>> {
    const calendarId = encodeURIComponent(options.calendarId || this.calendarId);
    const params = new URLSearchParams();

    if (options.sendUpdates) params.set("sendUpdates", options.sendUpdates);

    const query = params.toString() ? `?${params}` : "";

    return this.makeRequest(`/calendars/${calendarId}/events/${encodeURIComponent(eventId)}${query}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FREE/BUSY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check free/busy information for calendars
   */
  async getFreeBusy(options: {
    timeMin: Date;
    timeMax: Date;
    calendarIds?: string[];
  }): Promise<GoogleCalendarResponse<FreeBusyInfo[]>> {
    const result = await this.makeRequest<{
      calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
    }>("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin: options.timeMin.toISOString(),
        timeMax: options.timeMax.toISOString(),
        items: (options.calendarIds || [this.calendarId]).map((id) => ({ id })),
      }),
    });

    if (result.success && result.data) {
      const freeBusyInfo: FreeBusyInfo[] = Object.entries(result.data.calendars).map(
        ([calendarId, info]) => ({
          calendarId,
          busy: info.busy,
        })
      );
      return { success: true, data: freeBusyInfo };
    }
    return { success: false, error: result.error };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEXUS-SPECIFIC HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a deal follow-up appointment
   */
  async createDealFollowUp(options: {
    dealName: string;
    contactName: string;
    contactEmail: string;
    startTime: Date;
    durationMinutes?: number;
    notes?: string;
    addMeet?: boolean;
  }): Promise<GoogleCalendarResponse<CalendarEvent>> {
    const endTime = new Date(options.startTime.getTime() + (options.durationMinutes || 30) * 60000);

    const event: Omit<CalendarEvent, "id"> = {
      summary: `Follow-up: ${options.dealName}`,
      description: `Deal follow-up call with ${options.contactName}\n\n${options.notes || ""}`,
      start: {
        dateTime: options.startTime.toISOString(),
        timeZone: "Europe/Berlin",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Europe/Berlin",
      },
      attendees: [
        { email: options.contactEmail, displayName: options.contactName },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    // Add Google Meet if requested
    if (options.addMeet) {
      event.conferenceData = {
        createRequest: {
          requestId: `nexus-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    return this.createEvent(event, {
      sendUpdates: "all",
      conferenceDataVersion: options.addMeet ? 1 : 0,
    });
  }

  /**
   * Create a project milestone event
   */
  async createProjectMilestone(options: {
    projectName: string;
    milestoneName: string;
    date: Date;
    isAllDay?: boolean;
  }): Promise<GoogleCalendarResponse<CalendarEvent>> {
    const event: Omit<CalendarEvent, "id"> = {
      summary: `[${options.projectName}] ${options.milestoneName}`,
      start: options.isAllDay
        ? { date: options.date.toISOString().split("T")[0] }
        : { dateTime: options.date.toISOString(), timeZone: "Europe/Berlin" },
      end: options.isAllDay
        ? { date: options.date.toISOString().split("T")[0] }
        : { dateTime: new Date(options.date.getTime() + 3600000).toISOString(), timeZone: "Europe/Berlin" },
      colorId: "11", // Red for milestones
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 1440 }, // 1 day before
          { method: "popup", minutes: 60 },
        ],
      },
    };

    return this.createEvent(event);
  }

  /**
   * Find next available slot
   */
  async findNextAvailableSlot(options: {
    durationMinutes: number;
    startFrom?: Date;
    maxDaysToSearch?: number;
    workingHoursStart?: number; // Hour in 24h format
    workingHoursEnd?: number;
  }): Promise<GoogleCalendarResponse<{ start: Date; end: Date }>> {
    const startFrom = options.startFrom || new Date();
    const maxDays = options.maxDaysToSearch || 14;
    const workStart = options.workingHoursStart ?? 9;
    const workEnd = options.workingHoursEnd ?? 17;
    const duration = options.durationMinutes;

    const searchEnd = new Date(startFrom.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const freeBusyResult = await this.getFreeBusy({
      timeMin: startFrom,
      timeMax: searchEnd,
    });

    if (!freeBusyResult.success || !freeBusyResult.data) {
      return { success: false, error: freeBusyResult.error || "Failed to fetch free/busy info" };
    }

    const busySlots = freeBusyResult.data[0]?.busy || [];

    // Search day by day
    const currentDate = new Date(startFrom);
    currentDate.setHours(workStart, 0, 0, 0);

    while (currentDate < searchEnd) {
      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(workStart, 0, 0, 0);
        continue;
      }

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(workEnd, 0, 0, 0);

      let slotStart = new Date(currentDate);
      if (slotStart < startFrom) {
        slotStart = new Date(startFrom);
        // Round up to next 15 minutes
        const minutes = slotStart.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 15) * 15;
        slotStart.setMinutes(roundedMinutes, 0, 0);
      }

      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        if (slotEnd > dayEnd) break;

        // Check if this slot overlaps with any busy period
        const isAvailable = !busySlots.some((busy) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (isAvailable) {
          return {
            success: true,
            data: { start: slotStart, end: slotEnd },
          };
        }

        // Move to next 15-minute slot
        slotStart = new Date(slotStart.getTime() + 15 * 60000);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(workStart, 0, 0, 0);
    }

    return { success: false, error: "No available slot found within search period" };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.ensureAccessToken();
      const result = await this.getCalendar();

      if (result.success && result.data) {
        return {
          success: true,
          message: `Connected to calendar: ${result.data.summary}`,
        };
      }

      return {
        success: false,
        message: result.error || "Failed to access calendar",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Set the default calendar
   */
  setCalendar(calendarId: string): void {
    this.calendarId = calendarId;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

let instance: GoogleCalendarIntegration | null = null;

export function getGoogleCalendarIntegration(config?: GoogleCalendarConfig): GoogleCalendarIntegration {
  if (!instance && config) {
    instance = new GoogleCalendarIntegration(config);
  }
  if (!instance) {
    instance = new GoogleCalendarIntegration({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
    });
  }
  return instance;
}

export function resetGoogleCalendarIntegration(): void {
  instance = null;
}
