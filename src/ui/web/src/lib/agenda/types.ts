export type AgendaEventType = "session" | "followup" | "assessment" | "planning" | "admin";

export type AgendaLocationType = "remote" | "inPerson";

export type AgendaEventStatus = "scheduled" | "cancelled";

export type RecurrenceApplyScope = "single" | "following" | "series";

export type AgendaEventWarning = {
  eventId?: string;
  title?: string;
  startAt?: string;
  endAt?: string;
};

export type AgendaEvent = {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  eventType: AgendaEventType;
  locationType: AgendaLocationType;
  patientId?: string;
  meetingUrl?: string;
  status: AgendaEventStatus;
  timezone: string;
  recurrenceRuleId?: string;
  occurrenceStartAt?: string;
  recurrenceExceptionDates?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  warnings?: AgendaEventWarning[];
};

export type AgendaEventsRangeInput = {
  from: string;
  to: string;
  includeCancelled?: boolean;
};

export type CreateAgendaEventInput = {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  eventType: AgendaEventType;
  locationType: AgendaLocationType;
  patientId?: string;
  meetingUrl?: string;
  timezone: string;
  recurrenceRule?: string;
  recurrenceUntil?: string;
};

export type UpdateAgendaEventInput = Partial<CreateAgendaEventInput> & {
  status?: AgendaEventStatus;
};
