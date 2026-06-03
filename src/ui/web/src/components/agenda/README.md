# Agenda Module

This folder contains the isolated agenda feature module.

## Current Scope

- Rendered inside dashboard home grid
- Range query over `/api/agenda/events`
- Create-event form with duration, recurrence, optional patient, optional meeting URL
- Patient picker with selectable patient list
- Variable-duration block rendering on week grid
- Drag-and-drop move and resize handles in week timeline
- Event detail modal with:
  - close action (`X`)
  - edit action (pencil)
  - delete action (trash)
  - recurrence scope selector (`single`, `following`, `series`)
- Overlap warning chips on event cards/details
- Optimistic overlap checking while creating/editing
- Week navigation

## Structure

- `dashboard-agenda-grid.tsx`: isolated agenda grid used by dashboard home.

## Data Layer

- Hooks live in `src/hooks/agenda/use-agenda-events.ts`.
- Types live in `src/lib/agenda/types.ts`.
