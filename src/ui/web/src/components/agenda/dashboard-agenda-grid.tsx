import {
  AlignLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppInput } from "@/components/ui/app-input";
import { Label } from "@/components/ui/label";
import { AppSelectContent, AppSelectItem, AppSelectTrigger } from "@/components/ui/app-select";
import { Select, SelectValue } from "@/components/ui/select";
import { AppTextarea } from "@/components/ui/app-textarea";
import {
  useCreateAgendaEvent,
  useDeleteAgendaEvent,
  useUpdateAgendaEvent,
} from "@/hooks/agenda/use-agenda-events";
import type { AgendaEventWarning, RecurrenceApplyScope } from "@/lib/agenda/types";
import type { Patient } from "@/lib/ui-types";
import { startOfWeek } from "@/lib/utils";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const GRID_START_HOUR = 0;
const GRID_END_HOUR = 24;
const GRID_HOUR_HEIGHT = 52;

type GridItem = {
  id: string;
  dayOffset: number;
  patientId?: string;
  title: string;
  description: string;
  locationType: "remote" | "inPerson";
  meetingUrl?: string;
  startAt: string;
  endAt: string;
  eventType?: string;
  recurrenceRuleId?: string;
  occurrenceStartAt?: string;
  warnings?: AgendaEventWarning[];
  overlapCount: number;
  overlapIndex: number;
  top: number;
  height: number;
};

type DragMode = "move" | "resize";

type DragInteraction = {
  eventId: string;
  mode: DragMode;
  originStartMs: number;
  originEndMs: number;
  originDayOffset: number;
  pointerStartX: number;
  pointerStartY: number;
};

function formatDiaMes(d: Date) {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function formatMesAno(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function toLocalDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getMonthGridStart(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  first.setHours(0, 0, 0, 0);
  const mondayBasedWeekDay = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - mondayBasedWeekDay);
  return first;
}

function toIso(value: Date) {
  return value.toISOString();
}

function parseIso(value: string) {
  return new Date(value);
}

function formatHora(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function toMinutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function toDateTimeLocalValue(isoValue: string) {
  const date = new Date(isoValue);
  const pad = (value: number) => value.toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function roundToQuarterHour(minutes: number) {
  return Math.round(minutes / 15) * 15;
}

function intervalsOverlap(aStartIso: string, aEndIso: string, bStartIso: string, bEndIso: string) {
  const aStart = parseIso(aStartIso).getTime();
  const aEnd = parseIso(aEndIso).getTime();
  const bStart = parseIso(bStartIso).getTime();
  const bEnd = parseIso(bEndIso).getTime();
  return aStart < bEnd && bStart < aEnd;
}

function getDayOverlapLayout(
  items: Array<{ id: string; startMinutes: number; endMinutes: number }>,
): Map<string, { overlapCount: number; overlapIndex: number }> {
  const sorted = [...items].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return a.endMinutes - b.endMinutes;
  });

  const result = new Map<string, { overlapCount: number; overlapIndex: number }>();

  for (const item of sorted) {
    const overlapping = sorted.filter(
      (other) =>
        other.id !== item.id &&
        other.startMinutes < item.endMinutes &&
        other.endMinutes > item.startMinutes,
    );

    const group = [item, ...overlapping].sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.endMinutes - b.endMinutes;
    });

    const overlapIndex = group.findIndex((entry) => entry.id === item.id);
    const overlapCount = Math.max(1, group.length);

    result.set(item.id, {
      overlapCount,
      overlapIndex: overlapIndex < 0 ? 0 : overlapIndex,
    });
  }

  return result;
}

function formatDateTime(value: string | undefined) {
  if (!value) return "-";
  const d = parseIso(value);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCreateSchedule(startLocal: string, endLocal: string) {
  if (!startLocal || !endLocal) return "Adicionar data e horário";
  const start = new Date(startLocal);
  const end = new Date(endLocal);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "Adicionar data e horário";

  const dateLabel = start.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const startTime = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} · ${startTime} - ${endTime}`;
}

function dateTimeLocalFromDate(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function localDatePart(value: string) {
  return value.includes("T") ? value.split("T")[0] : "";
}

function localTimePart(value: string) {
  return value.includes("T") ? value.split("T")[1]?.slice(0, 5) || "" : "";
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function minutesToTime(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, value));
  const h = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const m = (clamped % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

type DashboardAgendaGridProps = {
  weekStart: Date;
  setWeekStart: (value: Date) => void;
  pacientesMap: Map<string, Patient>;
  agendaEvents: Array<{
    id: string;
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    patientId?: string;
    locationType: "remote" | "inPerson";
    meetingUrl?: string;
    eventType?: string;
    recurrenceRuleId?: string;
    occurrenceStartAt?: string;
    warnings?: AgendaEventWarning[];
  }>;
};

type AgendaViewMode = "week" | "month";

export function DashboardAgendaGrid({
  weekStart,
  setWeekStart,
  pacientesMap,
  agendaEvents,
}: DashboardAgendaGridProps) {
  const createMutation = useCreateAgendaEvent();
  const updateMutation = useUpdateAgendaEvent();
  const deleteMutation = useDeleteAgendaEvent();

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStartAt, setCreateStartAt] = useState("");
  const [createEndAt, setCreateEndAt] = useState("");
  const [createEventType, setCreateEventType] = useState<"session" | "personal" | "other">(
    "session",
  );
  const [createLocationType, setCreateLocationType] = useState<"remote" | "inPerson">("remote");
  const [createPatientId, setCreatePatientId] = useState("");
  const [createMeetingUrl, setCreateMeetingUrl] = useState("");
  const [createRecurrenceEnabled, setCreateRecurrenceEnabled] = useState(false);
  const [createRecurrenceFreq, setCreateRecurrenceFreq] = useState<"DAILY" | "WEEKLY" | "MONTHLY">(
    "WEEKLY",
  );
  const [createRecurrenceInterval, setCreateRecurrenceInterval] = useState("1");
  const [createRecurrenceUntil, setCreateRecurrenceUntil] = useState("");
  const [showCreateDescriptionInput, setShowCreateDescriptionInput] = useState(false);
  const [showCreatePatientInput, setShowCreatePatientInput] = useState(false);
  const [createPatientSelectOpen, setCreatePatientSelectOpen] = useState(false);
  const [showCreateDateTimeEditor, setShowCreateDateTimeEditor] = useState(false);

  const [selected, setSelected] = useState<GridItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftStartAt, setDraftStartAt] = useState("");
  const [draftEndAt, setDraftEndAt] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [applyScope, setApplyScope] = useState<RecurrenceApplyScope>("single");
  const [dragInteraction, setDragInteraction] = useState<DragInteraction | null>(null);
  const [isDraggingPointer, setIsDraggingPointer] = useState(false);
  const [optimisticTimesById, setOptimisticTimesById] = useState<
    Record<string, { startAt: string; endAt: string }>
  >({});
  const [viewMode, setViewMode] = useState<AgendaViewMode>("week");

  const dayColumnRefs = useRef<Array<HTMLDivElement | null>>([]);
  const createDateInputRef = useRef<HTMLInputElement | null>(null);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const suppressNextEventOpenRef = useRef(false);

  const pacientesOptions = useMemo(
    () => [...pacientesMap.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [pacientesMap],
  );

  const timeOptions = useMemo(
    () =>
      Array.from({ length: 24 * 4 }, (_, idx) => {
        const totalMinutes = idx * 15;
        const h = Math.floor(totalMinutes / 60)
          .toString()
          .padStart(2, "0");
        const m = (totalMinutes % 60).toString().padStart(2, "0");
        return `${h}:${m}`;
      }),
    [],
  );

  const hours = useMemo(
    () =>
      Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i),
    [],
  );

  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * GRID_HOUR_HEIGHT;

  const diasDaSemana = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const calendarAnchor = useMemo(() => {
    const anchor = new Date(weekStart);
    anchor.setDate(anchor.getDate() + 3);
    return anchor;
  }, [weekStart]);

  const currentMonthStart = useMemo(
    () => new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth(), 1),
    [calendarAnchor],
  );

  const monthGridDays = useMemo(() => {
    const gridStart = getMonthGridStart(currentMonthStart);
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      return day;
    });
  }, [currentMonthStart]);

  const monthEventsByDay = useMemo(() => {
    const grouped = new Map<string, DashboardAgendaGridProps["agendaEvents"]>();
    for (const event of agendaEvents) {
      const optimisticTimes = optimisticTimesById[event.id];
      const startAt = optimisticTimes?.startAt ?? event.startAt;
      const dayKey = toLocalDateKey(parseIso(startAt));
      const existing = grouped.get(dayKey) ?? [];
      grouped.set(dayKey, [...existing, { ...event, startAt }]);
    }

    for (const [key, events] of grouped.entries()) {
      grouped.set(
        key,
        [...events].sort((a, b) => parseIso(a.startAt).getTime() - parseIso(b.startAt).getTime()),
      );
    }

    return grouped;
  }, [agendaEvents, optimisticTimesById]);

  const agendaItems = useMemo(() => {
    const baseItems: GridItem[] = [];
    for (const event of agendaEvents) {
      const optimisticTimes = optimisticTimesById[event.id];
      const effectiveStartAt = optimisticTimes?.startAt ?? event.startAt;
      const effectiveEndAt = optimisticTimes?.endAt ?? event.endAt;
      const start = parseIso(effectiveStartAt);
      const end = parseIso(effectiveEndAt);
      const dayOffset = Math.floor((start.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      if (dayOffset < 0 || dayOffset > 6) continue;

      const startMinutes = toMinutesSinceMidnight(start);
      const endMinutes = Math.max(startMinutes + 15, toMinutesSinceMidnight(end));
      const windowStartMinutes = GRID_START_HOUR * 60;
      const windowEndMinutes = GRID_END_HOUR * 60;
      const clampedStartMinutes = Math.max(startMinutes, windowStartMinutes);
      const clampedEndMinutes = Math.min(endMinutes, windowEndMinutes);
      if (clampedEndMinutes <= clampedStartMinutes) continue;

      const top = ((clampedStartMinutes - windowStartMinutes) / 60) * GRID_HOUR_HEIGHT;
      const height = Math.max(
        28,
        ((clampedEndMinutes - clampedStartMinutes) / 60) * GRID_HOUR_HEIGHT,
      );

      baseItems.push({
        id: event.id,
        dayOffset,
        ...(event.patientId ? { patientId: event.patientId } : {}),
        title: event.title,
        description: event.description || "",
        locationType: event.locationType,
        ...(event.meetingUrl ? { meetingUrl: event.meetingUrl } : {}),
        startAt: effectiveStartAt,
        endAt: effectiveEndAt,
        eventType: event.eventType,
        recurrenceRuleId: event.recurrenceRuleId,
        occurrenceStartAt: event.occurrenceStartAt,
        warnings: event.warnings,
        overlapCount: 1,
        overlapIndex: 0,
        top,
        height,
      });
    }

    return baseItems.map((item) => {
      const dayItems = baseItems
        .filter((candidate) => candidate.dayOffset === item.dayOffset)
        .map((candidate) => ({
          id: candidate.id,
          startMinutes: toMinutesSinceMidnight(parseIso(candidate.startAt)),
          endMinutes: toMinutesSinceMidnight(parseIso(candidate.endAt)),
        }));
      const overlapLayout = getDayOverlapLayout(dayItems);
      const slot = overlapLayout.get(item.id);

      return {
        ...item,
        overlapCount: slot?.overlapCount ?? 1,
        overlapIndex: slot?.overlapIndex ?? 0,
      };
    });
  }, [agendaEvents, optimisticTimesById, weekStart]);

  const agendaByDay = useMemo(() => {
    const grouped = new Map<number, GridItem[]>();
    for (let i = 0; i < 7; i += 1) grouped.set(i, []);
    for (const item of agendaItems) {
      const current = grouped.get(item.dayOffset);
      if (!current) continue;
      current.push(item);
    }
    for (const [day, items] of grouped.entries()) {
      grouped.set(
        day,
        [...items].sort((a, b) => parseIso(a.startAt).getTime() - parseIso(b.startAt).getTime()),
      );
    }
    return grouped;
  }, [agendaItems]);

  const createOverlapWarnings = useMemo(() => {
    if (!createStartAt || !createEndAt) return [] as string[];
    const candidateStart = new Date(createStartAt);
    const candidateEnd = new Date(createEndAt);
    if (Number.isNaN(candidateStart.getTime()) || Number.isNaN(candidateEnd.getTime())) return [];
    if (candidateEnd <= candidateStart) return [];

    const candidateStartIso = candidateStart.toISOString();
    const candidateEndIso = candidateEnd.toISOString();
    return agendaEvents
      .filter((event) =>
        intervalsOverlap(candidateStartIso, candidateEndIso, event.startAt, event.endAt),
      )
      .map((event) => event.title)
      .slice(0, 3);
  }, [agendaEvents, createEndAt, createStartAt]);

  const editOverlapWarnings = useMemo(() => {
    if (!selected || !draftStartAt || !draftEndAt) return [] as string[];
    const candidateStart = new Date(draftStartAt);
    const candidateEnd = new Date(draftEndAt);
    if (Number.isNaN(candidateStart.getTime()) || Number.isNaN(candidateEnd.getTime())) return [];
    if (candidateEnd <= candidateStart) return [];

    const candidateStartIso = candidateStart.toISOString();
    const candidateEndIso = candidateEnd.toISOString();
    return agendaEvents
      .filter(
        (event) =>
          event.id !== selected.id &&
          intervalsOverlap(candidateStartIso, candidateEndIso, event.startAt, event.endAt),
      )
      .map((event) => event.title)
      .slice(0, 3);
  }, [agendaEvents, draftEndAt, draftStartAt, selected]);

  const resolveDayIndexFromPointer = (clientX: number) => {
    const refs = dayColumnRefs.current;
    for (let i = 0; i < refs.length; i += 1) {
      const ref = refs[i];
      if (!ref) continue;
      const rect = ref.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return i;
    }

    const firstRect = refs[0]?.getBoundingClientRect();
    const lastRect = refs[refs.length - 1]?.getBoundingClientRect();
    if (firstRect && clientX < firstRect.left) return 0;
    if (lastRect && clientX > lastRect.right) return refs.length - 1;
    return null;
  };

  useEffect(() => {
    if (!dragInteraction) return;

    const onPointerMove = (event: PointerEvent) => {
      const deltaY = event.clientY - dragInteraction.pointerStartY;
      const deltaX = event.clientX - dragInteraction.pointerStartX;
      if (!isDraggingPointer && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        setIsDraggingPointer(true);
      }

      const minuteDelta = roundToQuarterHour((deltaY / GRID_HOUR_HEIGHT) * 60);
      const dayIndex = resolveDayIndexFromPointer(event.clientX);
      const dayShift =
        dragInteraction.mode === "move" && dayIndex !== null
          ? dayIndex - dragInteraction.originDayOffset
          : 0;

      const baseStart = new Date(dragInteraction.originStartMs);
      baseStart.setDate(baseStart.getDate() + dayShift);
      const movedStartMs = baseStart.getTime() + minuteDelta * 60_000;
      const durationMs = dragInteraction.originEndMs - dragInteraction.originStartMs;

      let nextStartMs = movedStartMs;
      let nextEndMs = movedStartMs + durationMs;

      if (dragInteraction.mode === "resize") {
        nextStartMs = dragInteraction.originStartMs;
        nextEndMs = dragInteraction.originEndMs + minuteDelta * 60_000;
        const minEndMs = dragInteraction.originStartMs + 15 * 60_000;
        if (nextEndMs < minEndMs) nextEndMs = minEndMs;
      }

      setOptimisticTimesById((current) => ({
        ...current,
        [dragInteraction.eventId]: {
          startAt: new Date(nextStartMs).toISOString(),
          endAt: new Date(nextEndMs).toISOString(),
        },
      }));
    };

    const onPointerUp = () => {
      const pending = optimisticTimesById[dragInteraction.eventId];
      const wasDragging = isDraggingPointer;
      if (wasDragging) {
        suppressNextEventOpenRef.current = true;
      }
      setDragInteraction(null);
      setIsDraggingPointer(false);

      if (!pending || !wasDragging) return;

      void updateMutation
        .mutateAsync({
          eventId: dragInteraction.eventId,
          applyScope: "single",
          input: {
            startAt: pending.startAt,
            endAt: pending.endAt,
          },
        })
        .then(() => {
          if (selected?.id === dragInteraction.eventId) {
            setSelected({
              ...selected,
              startAt: pending.startAt,
              endAt: pending.endAt,
            });
            setDraftStartAt(toDateTimeLocalValue(pending.startAt));
            setDraftEndAt(toDateTimeLocalValue(pending.endAt));
          }
          setOptimisticTimesById((current) => {
            const next = { ...current };
            delete next[dragInteraction.eventId];
            return next;
          });
        })
        .catch(() => {
          setOptimisticTimesById((current) => {
            const next = { ...current };
            delete next[dragInteraction.eventId];
            return next;
          });
        });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragInteraction, isDraggingPointer, optimisticTimesById, selected, updateMutation]);

  useEffect(() => {
    if (!showCreatePatientInput) return;
    setCreatePatientSelectOpen(true);
  }, [showCreatePatientInput]);

  const startDrag = (event: ReactPointerEvent, item: GridItem, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    setDragInteraction({
      eventId: item.id,
      mode,
      originStartMs: parseIso(item.startAt).getTime(),
      originEndMs: parseIso(item.endAt).getTime(),
      originDayOffset: item.dayOffset,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
    });
    setIsDraggingPointer(false);
  };

  const onOpen = (item: GridItem) => {
    setSelected(item);
    setDraftTitle(item.title);
    setDraftDescription(item.description);
    setDraftStartAt(toDateTimeLocalValue(item.startAt));
    setDraftEndAt(toDateTimeLocalValue(item.endAt));
    setEditing(false);
    setApplyScope("single");
  };

  const onSave = async () => {
    if (!selected) return;
    if (!draftStartAt || !draftEndAt) return;
    const nextStart = new Date(draftStartAt);
    const nextEnd = new Date(draftEndAt);
    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) return;
    if (nextEnd <= nextStart) return;

    await updateMutation.mutateAsync({
      eventId: selected.id,
      applyScope,
      input: {
        title: draftTitle,
        description: draftDescription,
        startAt: nextStart.toISOString(),
        endAt: nextEnd.toISOString(),
      },
    });
    setSelected({
      ...selected,
      title: draftTitle,
      description: draftDescription,
      startAt: nextStart.toISOString(),
      endAt: nextEnd.toISOString(),
    });
    setEditing(false);
  };

  const onDelete = async () => {
    if (!selected) return;
    await deleteMutation.mutateAsync({
      eventId: selected.id,
      applyScope,
    });
    setDeleteConfirmOpen(false);
    setSelected(null);
  };

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateStartAt("");
    setCreateEndAt("");
    setCreateEventType("session");
    setCreateLocationType("remote");
    setCreatePatientId("");
    setCreateMeetingUrl("");
    setCreateRecurrenceEnabled(false);
    setCreateRecurrenceFreq("WEEKLY");
    setCreateRecurrenceInterval("1");
    setCreateRecurrenceUntil("");
    setShowCreateDescriptionInput(false);
    setShowCreatePatientInput(false);
    setCreatePatientSelectOpen(false);
    setShowCreateDateTimeEditor(false);
  };

  const initializeCreateDateTime = () => {
    const now = new Date();
    const rounded = new Date(now);
    const roundedMinutes = Math.ceil(rounded.getMinutes() / 15) * 15;
    rounded.setMinutes(roundedMinutes, 0, 0);
    const end = new Date(rounded);
    end.setHours(end.getHours() + 1);
    setCreateStartAt(dateTimeLocalFromDate(rounded));
    setCreateEndAt(dateTimeLocalFromDate(end));
  };

  const openCreateDialog = () => {
    resetCreateForm();
    initializeCreateDateTime();
    setCreateOpen(true);
  };

  const getCreateSlotFromPointer = (container: HTMLDivElement, clientY: number) => {
    const rect = container.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const rawMinutes = GRID_START_HOUR * 60 + (relativeY / GRID_HOUR_HEIGHT) * 60;
    const slotMinutes = roundToQuarterHour(rawMinutes);
    const minMinutes = GRID_START_HOUR * 60;
    const maxMinutes = GRID_END_HOUR * 60 - 15;
    const clampedMinutes = Math.max(minMinutes, Math.min(maxMinutes, slotMinutes));
    return { clampedMinutes };
  };

  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    el.scrollTop = 8 * GRID_HOUR_HEIGHT;
  }, [weekStart]);

  const openCreateDialogAtDate = (baseDate: Date, minuteOfDay: number) => {
    resetCreateForm();

    const start = new Date(baseDate);
    start.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    setCreateStartAt(dateTimeLocalFromDate(start));
    setCreateEndAt(dateTimeLocalFromDate(end));
    setCreateOpen(true);
  };

  const openCreateDialogAtSlot = (dayOffset: number, minuteOfDay: number) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayOffset);
    openCreateDialogAtDate(date, minuteOfDay);
  };

  const openCreateDatePicker = () => {
    const input = createDateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const onCreateDateChange = (dateValue: string) => {
    if (!dateValue) return;
    const startTime = localTimePart(createStartAt) || "09:00";
    const endTime = localTimePart(createEndAt) || "10:00";
    setCreateStartAt(`${dateValue}T${startTime}`);
    setCreateEndAt(`${dateValue}T${endTime}`);
  };

  const onCreateStartTimeChange = (timeValue: string) => {
    const dateValue = localDatePart(createStartAt) || localDatePart(createEndAt);
    if (!dateValue) return;
    const currentEnd = localTimePart(createEndAt) || "10:00";
    const nextEnd =
      timeToMinutes(currentEnd) > timeToMinutes(timeValue)
        ? currentEnd
        : minutesToTime(timeToMinutes(timeValue) + 60);
    setCreateStartAt(`${dateValue}T${timeValue}`);
    setCreateEndAt(`${dateValue}T${nextEnd}`);
  };

  const onCreateEndTimeChange = (timeValue: string) => {
    const dateValue = localDatePart(createStartAt) || localDatePart(createEndAt);
    if (!dateValue) return;
    const currentStart = localTimePart(createStartAt) || "09:00";
    if (timeToMinutes(timeValue) <= timeToMinutes(currentStart)) return;
    setCreateEndAt(`${dateValue}T${timeValue}`);
  };

  const onCreateEvent = async () => {
    if (!createTitle.trim()) return;
    if (!createStartAt || !createEndAt) return;

    const recurrenceInterval = Math.max(1, parseInt(createRecurrenceInterval || "1", 10));
    const recurrenceRule = createRecurrenceEnabled
      ? `FREQ=${createRecurrenceFreq};INTERVAL=${recurrenceInterval}`
      : undefined;

    await createMutation.mutateAsync({
      title: createTitle.trim(),
      description: createDescription.trim(),
      startAt: new Date(createStartAt).toISOString(),
      endAt: new Date(createEndAt).toISOString(),
      eventType: createEventType,
      locationType: createLocationType,
      patientId: createPatientId.trim() || undefined,
      meetingUrl: createMeetingUrl.trim() || undefined,
      recurrenceRule,
      recurrenceUntil: createRecurrenceUntil
        ? new Date(createRecurrenceUntil).toISOString()
        : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    setCreateOpen(false);
    resetCreateForm();
  };

  const openEventFromAgenda = (event: DashboardAgendaGridProps["agendaEvents"][number]) => {
    const optimisticTimes = optimisticTimesById[event.id];
    const effectiveStartAt = optimisticTimes?.startAt ?? event.startAt;
    const effectiveEndAt = optimisticTimes?.endAt ?? event.endAt;
    onOpen({
      id: event.id,
      dayOffset: 0,
      ...(event.patientId ? { patientId: event.patientId } : {}),
      title: event.title,
      description: event.description || "",
      locationType: event.locationType,
      ...(event.meetingUrl ? { meetingUrl: event.meetingUrl } : {}),
      startAt: effectiveStartAt,
      endAt: effectiveEndAt,
      eventType: event.eventType,
      recurrenceRuleId: event.recurrenceRuleId,
      occurrenceStartAt: event.occurrenceStartAt,
      warnings: event.warnings,
      overlapCount: 1,
      overlapIndex: 0,
      top: 0,
      height: 0,
    });
  };

  const navigate = (delta: number) => {
    if (viewMode === "month") {
      const next = new Date(calendarAnchor);
      next.setMonth(next.getMonth() + delta);
      setWeekStart(startOfWeek(next));
      return;
    }
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
  };

  const fimSemana = new Date(weekStart);
  fimSemana.setDate(fimSemana.getDate() + 6);

  return (
    <>
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {viewMode === "week" ? "Agenda da Semana" : "Agenda do Mês"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {viewMode === "week"
                ? `${formatDiaMes(weekStart)} - ${formatDiaMes(fimSemana)}`
                : formatMesAno(currentMonthStart)}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as AgendaViewMode)}
            >
              <AppSelectTrigger className="h-8 w-[132px]">
                <SelectValue />
              </AppSelectTrigger>
              <AppSelectContent>
                <AppSelectItem value="week">Semanal</AppSelectItem>
                <AppSelectItem value="month">Mensal</AppSelectItem>
              </AppSelectContent>
            </Select>
            <Button variant="default" size="sm" onClick={openCreateDialog}>
              Novo Evento
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {viewMode === "week" ? (
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-140">
              <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 mb-1">
                <div />
                {diasDaSemana.map((d, i) => {
                  const isHoje = d.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={i}
                      className={`text-center py-2 rounded-md text-xs font-medium ${
                        isHoje ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <div>{DIAS_SEMANA[i]}</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border rounded-md overflow-hidden">
                <div ref={gridScrollRef} className="max-h-156 overflow-y-auto">
                  <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-border">
                    <div className="bg-card relative" style={{ height: `${gridHeight}px` }}>
                      {hours.slice(0, -1).map((hour, i) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 px-1.5 text-[10px] text-muted-foreground"
                          style={{ top: `${i * GRID_HOUR_HEIGHT + 2}px` }}
                        >
                          {formatHora(hour)}
                        </div>
                      ))}
                    </div>

                    {diasDaSemana.map((_, di) => (
                      <div
                        key={di}
                        ref={(ref) => {
                          dayColumnRefs.current[di] = ref;
                        }}
                        className="bg-card relative cursor-default"
                        style={{ height: `${gridHeight}px` }}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest("[data-grid-event='true']")) return;
                          const container = event.currentTarget;
                          const slot = getCreateSlotFromPointer(container, event.clientY);
                          openCreateDialogAtSlot(di, slot.clampedMinutes);
                        }}
                      >
                        {hours.slice(1).map((hour, i) => (
                          <div
                            key={`${di}-${hour}`}
                            className="absolute left-0 right-0 border-t border-dashed border-border/70"
                            style={{ top: `${(i + 1) * GRID_HOUR_HEIGHT}px` }}
                          />
                        ))}

                        {(agendaByDay.get(di) || []).map((item) => {
                          const widthPercent = 100 / item.overlapCount;
                          const leftPercent = item.overlapIndex * widthPercent;
                          const styles =
                            item.locationType === "remote"
                              ? "bg-sky-500/12 border-sky-500/35 hover:bg-sky-500/18 text-sky-900"
                              : "bg-emerald-500/12 border-emerald-500/35 hover:bg-emerald-500/18 text-emerald-900";

                          return (
                            <div
                              key={item.id}
                              data-grid-event="true"
                              role="button"
                              tabIndex={0}
                              className={`group absolute rounded-md border px-1.5 py-1 transition-colors text-left cursor-pointer ${styles}`}
                              style={{
                                top: `${item.top + 2}px`,
                                height: `${item.height - 4}px`,
                                width: `calc(${widthPercent}% - 4px)`,
                                left: `calc(${leftPercent}% + 2px)`,
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (suppressNextEventOpenRef.current) {
                                  suppressNextEventOpenRef.current = false;
                                  return;
                                }
                                onOpen(item);
                              }}
                              onPointerDown={(event) => {
                                const target = event.target as HTMLElement;
                                if (target.closest("[data-resize-handle='true']")) return;
                                startDrag(event, item, "move");
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  onOpen(item);
                                }
                              }}
                            >
                              <p className="text-[10px] font-semibold leading-tight truncate">
                                {item.title}
                              </p>
                              <p className="text-[10px] leading-tight opacity-80 mt-0.5">
                                {formatDateTime(item.startAt).split(" ").slice(-1)[0]} -{" "}
                                {formatDateTime(item.endAt).split(" ").slice(-1)[0]}
                              </p>
                              {item.overlapCount > 1 && (
                                <span className="mt-1 inline-flex rounded-full border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                                  Sobreposição
                                </span>
                              )}
                              <button
                                type="button"
                                data-resize-handle="true"
                                className="absolute inset-x-1 bottom-1 h-1.5 cursor-ns-resize rounded bg-transparent opacity-0"
                                title="Redimensionar"
                                onPointerDown={(event) => startDrag(event, item, "resize")}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-sky-500/30 border border-sky-500/40" />
                  Remota
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/40" />
                  Presencial
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia}
                  className="text-center py-2 rounded-md text-xs font-medium text-muted-foreground"
                >
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthGridDays.map((day) => {
                const dayKey = toLocalDateKey(day);
                const events = monthEventsByDay.get(dayKey) ?? [];
                const outsideMonth = !isSameMonth(day, currentMonthStart);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={dayKey}
                    role="button"
                    tabIndex={0}
                    className={`min-h-28 rounded-md border p-2 text-left cursor-pointer transition-colors ${
                      outsideMonth
                        ? "bg-muted/30 border-border/70"
                        : "bg-card hover:bg-accent/40 border-border"
                    }`}
                    onClick={() => openCreateDialogAtDate(day, 9 * 60)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openCreateDialogAtDate(day, 9 * 60);
                      }
                    }}
                  >
                    <div
                      className={`mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : outsideMonth
                            ? "text-muted-foreground"
                            : "text-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </div>

                    <div className="space-y-1">
                      {events.slice(0, 3).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className={`w-full truncate rounded px-1.5 py-1 text-[10px] font-medium text-left cursor-pointer ${
                            event.locationType === "remote"
                              ? "bg-sky-500/15 text-sky-900"
                              : "bg-emerald-500/15 text-emerald-900"
                          }`}
                          onClick={(eventClick) => {
                            eventClick.stopPropagation();
                            openEventFromAgenda(event);
                          }}
                          title={`${event.title} · ${formatDateTime(event.startAt)}`}
                        >
                          {event.title}
                        </button>
                      ))}
                      {events.length > 3 && (
                        <p className="text-[10px] text-muted-foreground px-1">
                          +{events.length - 3} mais
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-sky-500/30 border border-sky-500/40" />
                Remota
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/40" />
                Presencial
              </span>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (open) return;
          setDeleteConfirmOpen(false);
          setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="pr-24">
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          <div className="absolute right-10 top-4 flex items-center gap-2">
            <button
              type="button"
              title="Editar"
              onClick={() => setEditing((s) => !s)}
              className="rounded-sm mr-3 text-foreground opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Excluir"
              onClick={() => setDeleteConfirmOpen(true)}
              className="rounded-sm mr-3 text-foreground opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {selected && (
            <div className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="grid-event-title">Título</Label>
                    <AppInput
                      id="grid-event-title"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grid-event-description">Descrição</Label>
                    <AppTextarea
                      id="grid-event-description"
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="grid-event-start">Início</Label>
                      <AppInput
                        id="grid-event-start"
                        type="datetime-local"
                        value={draftStartAt}
                        onChange={(e) => setDraftStartAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grid-event-end">Fim</Label>
                      <AppInput
                        id="grid-event-end"
                        type="datetime-local"
                        value={draftEndAt}
                        onChange={(e) => setDraftEndAt(e.target.value)}
                      />
                    </div>
                  </div>
                  {editOverlapWarnings.length > 0 && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                      Possível sobreposição com: {editOverlapWarnings.join(", ")}
                      {editOverlapWarnings.length === 3 ? "..." : ""}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="grid-event-scope">Escopo da recorrência</Label>
                    <Select
                      value={applyScope}
                      onValueChange={(value) => setApplyScope(value as RecurrenceApplyScope)}
                    >
                      <AppSelectTrigger id="grid-event-scope">
                        <SelectValue />
                      </AppSelectTrigger>
                      <AppSelectContent>
                        <AppSelectItem value="single">Somente este evento</AppSelectItem>
                        <AppSelectItem value="following">Este e seguintes</AppSelectItem>
                        <AppSelectItem value="series">Série inteira</AppSelectItem>
                      </AppSelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={onSave} disabled={updateMutation.isPending}>
                      Salvar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Título</p>
                    <p className="text-sm text-foreground">{selected.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                    <p className="text-sm text-foreground">
                      {selected.description || "Sem descrição"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Formato</p>
                      <p className="text-sm text-foreground flex items-center gap-1.5">
                        {selected.locationType === "remote" ? (
                          <>
                            <Video className="h-3.5 w-3.5" /> Remota
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3.5 w-3.5" /> Presencial
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                      <p className="text-sm text-foreground">{selected.eventType || "session"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Início</p>
                      <p className="text-sm text-foreground">{formatDateTime(selected.startAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fim</p>
                      <p className="text-sm text-foreground">{formatDateTime(selected.endAt)}</p>
                    </div>
                  </div>
                  {(selected.overlapCount > 1 || (selected.warnings || []).length > 0) && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground">Alertas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.overlapCount > 1 && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                            Sobreposição no horário
                          </Badge>
                        )}
                        {(selected.warnings || []).map((warning, idx) => (
                          <Badge key={`${selected.id}-warning-${idx}`} variant="outline">
                            {warning.title || "Possível conflito"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.patientId && pacientesMap.get(selected.patientId) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Paciente</p>
                      <Link
                        to="/pacientes/$id"
                        params={{ id: selected.patientId }}
                        className="text-sm text-primary hover:underline"
                      >
                        {pacientesMap.get(selected.patientId)?.name}
                      </Link>
                    </div>
                  )}

                  {selected.meetingUrl && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Link da reunião</p>
                      <a
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        href={selected.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Abrir link
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-b pb-2">
              <AppInput
                id="new-event-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Adicionar título"
                className="h-9 border-0 px-0 text-lg shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="grid grid-cols-[18px_1fr] items-start gap-3">
              <AlignLeft className="mt-2 h-4 w-4 text-muted-foreground" />
              {showCreateDescriptionInput || createDescription ? (
                <AppTextarea
                  id="new-event-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Adicionar descrição"
                  className="min-h-20 border-0 bg-muted/40 shadow-none focus-visible:ring-1"
                />
              ) : (
                <button
                  type="button"
                  className="h-9 w-full cursor-pointer rounded-md px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setShowCreateDescriptionInput(true)}
                >
                  Adicionar descrição
                </button>
              )}
            </div>
            <div className="grid grid-cols-[18px_1fr] items-center gap-3">
              {createLocationType === "remote" ? (
                <Video className="h-4 w-4 text-muted-foreground" />
              ) : (
                <MapPin className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex flex-wrap items-center gap-5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground has-checked:text-primary">
                  <input
                    className="h-4 w-4 cursor-pointer accent-primary"
                    type="radio"
                    name="new-event-location-radio"
                    value="inPerson"
                    checked={createLocationType === "inPerson"}
                    onChange={() => setCreateLocationType("inPerson")}
                  />
                  Presencial
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground has-checked:text-primary">
                  <input
                    className="h-4 w-4 cursor-pointer accent-primary"
                    type="radio"
                    name="new-event-location-radio"
                    value="remote"
                    checked={createLocationType === "remote"}
                    onChange={() => setCreateLocationType("remote")}
                  />
                  Remota
                </label>
              </div>
            </div>
            <div className="grid grid-cols-[18px_1fr] items-start gap-3">
              <CalendarDays className="mt-1.5 h-4 w-4 text-muted-foreground" />
              <div className="space-y-2">
                {!showCreateDateTimeEditor ? (
                  <button
                    type="button"
                    className="cursor-pointer rounded-md px-2 py-1 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    onClick={() => setShowCreateDateTimeEditor(true)}
                  >
                    {formatCreateSchedule(createStartAt, createEndAt)}
                  </button>
                ) : (
                  <div className="space-y-2 rounded-md bg-muted/20 p-3">
                    <div className="grid w-full grid-cols-[1.6fr_1fr_auto_1fr] items-center gap-2">
                      <div className="relative">
                        <AppInput
                          ref={createDateInputRef}
                          type="date"
                          value={localDatePart(createStartAt)}
                          onChange={(e) => onCreateDateChange(e.target.value)}
                          className="h-10 w-full cursor-pointer border-0 bg-muted/70 pr-10 shadow-none hover:bg-muted [&::-webkit-calendar-picker-indicator]:opacity-0"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted"
                          onClick={openCreateDatePicker}
                          title="Selecionar data"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </button>
                      </div>

                      <Select
                        value={localTimePart(createStartAt)}
                        onValueChange={onCreateStartTimeChange}
                      >
                        <AppSelectTrigger>
                          <SelectValue />
                        </AppSelectTrigger>
                        <AppSelectContent>
                          {timeOptions.map((timeOption) => (
                            <AppSelectItem key={`start-${timeOption}`} value={timeOption}>
                              {timeOption}
                            </AppSelectItem>
                          ))}
                        </AppSelectContent>
                      </Select>

                      <span className="text-muted-foreground">-</span>

                      <Select
                        value={localTimePart(createEndAt)}
                        onValueChange={onCreateEndTimeChange}
                      >
                        <AppSelectTrigger>
                          <SelectValue />
                        </AppSelectTrigger>
                        <AppSelectContent>
                          {timeOptions.map((timeOption) => (
                            <AppSelectItem key={`end-${timeOption}`} value={timeOption}>
                              {timeOption}
                            </AppSelectItem>
                          ))}
                        </AppSelectContent>
                      </Select>
                    </div>

                    <Select
                      value={createRecurrenceEnabled ? createRecurrenceFreq : "NONE"}
                      onValueChange={(value) => {
                        if (value === "NONE") {
                          setCreateRecurrenceEnabled(false);
                          return;
                        }
                        setCreateRecurrenceEnabled(true);
                        setCreateRecurrenceFreq(value as "DAILY" | "WEEKLY" | "MONTHLY");
                        setCreateRecurrenceInterval("1");
                      }}
                    >
                      <AppSelectTrigger>
                        <SelectValue />
                      </AppSelectTrigger>
                      <AppSelectContent>
                        <AppSelectItem value="NONE">Não se repete</AppSelectItem>
                        <AppSelectItem value="DAILY">Repete diariamente</AppSelectItem>
                        <AppSelectItem value="WEEKLY">Repete semanalmente</AppSelectItem>
                        <AppSelectItem value="MONTHLY">Repete mensalmente</AppSelectItem>
                      </AppSelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            {createOverlapWarnings.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                Possível sobreposição com: {createOverlapWarnings.join(", ")}
                {createOverlapWarnings.length === 3 ? "..." : ""}
              </div>
            )}
            <div className="grid grid-cols-[18px_1fr] items-center gap-3">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              {showCreatePatientInput || createPatientId ? (
                <Select
                  value={createPatientId || "none"}
                  open={createPatientSelectOpen}
                  onOpenChange={setCreatePatientSelectOpen}
                  onValueChange={(value) => setCreatePatientId(value === "none" ? "" : value)}
                >
                  <AppSelectTrigger id="new-event-patient">
                    <SelectValue placeholder="Sem paciente" />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="none">Sem paciente</AppSelectItem>
                    {pacientesOptions.map((paciente) => (
                      <AppSelectItem key={paciente.id} value={paciente.id}>
                        {paciente.name}
                      </AppSelectItem>
                    ))}
                  </AppSelectContent>
                </Select>
              ) : (
                <button
                  type="button"
                  className="h-9 w-full cursor-pointer rounded-md px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setShowCreatePatientInput(true)}
                >
                  Adicionar paciente
                </button>
              )}
            </div>
            <div className="grid grid-cols-[18px_1fr] items-center gap-3">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <AppInput
                id="new-event-link"
                value={createMeetingUrl}
                onChange={(e) => setCreateMeetingUrl(e.target.value)}
                placeholder="Adicionar link da reunião"
                className="h-10 border-0 bg-muted/70 px-3 shadow-none hover:bg-muted focus-visible:ring-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Evento</Label>
              <div className="flex flex-wrap items-center gap-5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground has-checked:text-primary">
                  <input
                    className="h-4 w-4 cursor-pointer accent-primary"
                    type="radio"
                    name="new-event-type-radio"
                    value="session"
                    checked={createEventType === "session"}
                    onChange={() => setCreateEventType("session")}
                  />
                  Sessão
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground has-checked:text-primary">
                  <input
                    className="h-4 w-4 cursor-pointer accent-primary"
                    type="radio"
                    name="new-event-type-radio"
                    value="personal"
                    checked={createEventType === "personal"}
                    onChange={() => setCreateEventType("personal")}
                  />
                  Pessoal
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground has-checked:text-primary">
                  <input
                    className="h-4 w-4 cursor-pointer accent-primary"
                    type="radio"
                    name="new-event-type-radio"
                    value="other"
                    checked={createEventType === "other"}
                    onChange={() => setCreateEventType("other")}
                  />
                  Outro
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={onCreateEvent} disabled={createMutation.isPending}>
                Criar evento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha o escopo da exclusão para este evento.
            </p>
            <Select
              value={applyScope}
              onValueChange={(value) => setApplyScope(value as RecurrenceApplyScope)}
            >
              <AppSelectTrigger id="grid-event-scope-delete">
                <SelectValue />
              </AppSelectTrigger>
              <AppSelectContent>
                <AppSelectItem value="single">Somente este evento</AppSelectItem>
                <AppSelectItem value="following">Este e seguintes</AppSelectItem>
                <AppSelectItem value="series">Série inteira</AppSelectItem>
              </AppSelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={onDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
