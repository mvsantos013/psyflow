import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  AgendaEvent,
  AgendaEventsRangeInput,
  CreateAgendaEventInput,
  RecurrenceApplyScope,
  UpdateAgendaEventInput,
} from "@/lib/agenda/types";

async function fetchAgendaEvents(input: AgendaEventsRangeInput): Promise<AgendaEvent[]> {
  const params = new URLSearchParams({
    from: input.from,
    to: input.to,
    includeCancelled: input.includeCancelled ? "true" : "false",
  });

  const res = await apiFetch(`/api/agenda/events?${params.toString()}`);
  if (!res.ok) throw new Error("Falha ao buscar eventos da agenda");
  const data = await res.json();
  return Array.isArray(data) ? (data as AgendaEvent[]) : [];
}

async function fetchAgendaEventDetail(eventId: string): Promise<AgendaEvent> {
  const res = await apiFetch(`/api/agenda/events/${encodeURIComponent(eventId)}`);
  if (!res.ok) throw new Error("Falha ao buscar detalhes do evento");
  return (await res.json()) as AgendaEvent;
}

async function createAgendaEvent(input: CreateAgendaEventInput): Promise<AgendaEvent> {
  const res = await apiFetch("/api/agenda/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Falha ao criar evento");
  return (await res.json()) as AgendaEvent;
}

async function updateAgendaEvent(
  eventId: string,
  input: UpdateAgendaEventInput,
  applyScope: RecurrenceApplyScope,
): Promise<AgendaEvent> {
  const res = await apiFetch(`/api/agenda/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...input, applyScope }),
  });
  if (!res.ok) throw new Error("Falha ao atualizar evento");
  return (await res.json()) as AgendaEvent;
}

async function deleteAgendaEvent(eventId: string, applyScope: RecurrenceApplyScope): Promise<void> {
  const params = new URLSearchParams({ applyScope });
  const res = await apiFetch(
    `/api/agenda/events/${encodeURIComponent(eventId)}?${params.toString()}`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok) throw new Error("Falha ao excluir evento");
}

export function useAgendaEventsRange(input: AgendaEventsRangeInput) {
  return useQuery({
    queryKey: ["agenda", "events", input.from, input.to, input.includeCancelled],
    queryFn: () => fetchAgendaEvents(input),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useAgendaEventDetail(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["agenda", "event", eventId],
    queryFn: () => fetchAgendaEventDetail(eventId),
    enabled: !!eventId && enabled,
  });
}

export function useCreateAgendaEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgendaEvent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agenda", "events"] });
    },
  });
}

export function useUpdateAgendaEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      input,
      applyScope,
    }: {
      eventId: string;
      input: UpdateAgendaEventInput;
      applyScope: RecurrenceApplyScope;
    }) => updateAgendaEvent(eventId, input, applyScope),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agenda", "events"] });
    },
  });
}

export function useDeleteAgendaEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, applyScope }: { eventId: string; applyScope: RecurrenceApplyScope }) =>
      deleteAgendaEvent(eventId, applyScope),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agenda", "events"] });
    },
  });
}
