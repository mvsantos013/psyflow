import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  type Sessao,
  type TarefaPrescrita,
  type ExercicioTemplate,
  mockPacientes,
  getPacienteById,
  getProntuarioById,
  getTarefasByPacienteId,
  getResumoGeral,
  getTranscricao,
  AGENDA_SESSOES_TEMPLATE,
  addSessao,
  addTarefa,
  getExercicios,
  addExercicio,
} from "../lib/mock-data";

const api = new Hono().basePath("/api");

api.use("*", cors());

// ── Pacientes ──────────────────────────────────────────────────────────────

api.get("/patients", (c) => c.json(mockPacientes));

api.get("/patients/:id", (c) => {
  const paciente = getPacienteById(c.req.param("id"));
  if (!paciente) return c.json({ error: "Paciente não encontrado" }, 404);
  return c.json(paciente);
});

api.get("/patients/:id/record", (c) => {
  const id = c.req.param("id");
  const prontuario = getProntuarioById(id);
  if (!prontuario) return c.json({ error: "Prontuário não encontrado" }, 404);
  // Attach resumoGeral so callers need only one request for the full view
  return c.json({ ...prontuario, resumoGeral: getResumoGeral(id) ?? null });
});

api.get("/patients/:id/tasks", (c) =>
  c.json(getTarefasByPacienteId(c.req.param("id")))
);

/** POST /api/patients/:id/tasks — prescribes a task for the patient. */
api.post("/patients/:id/tasks", async (c) => {
  const paciente = getPacienteById(c.req.param("id"));
  if (!paciente) return c.json({ error: "Paciente não encontrado" }, 404);

  const body = await c.req.json<{
    titulo: string;
    descricao: string;
    tipo: TarefaPrescrita["tipo"];
  }>();

  const nova: TarefaPrescrita = {
    id: crypto.randomUUID(),
    pacienteId: paciente.id,
    titulo: body.titulo,
    descricao: body.descricao,
    tipo: body.tipo,
    status: "aprovada",
    dataPrescricao: new Date().toISOString().slice(0, 10),
  };

  addTarefa(nova);
  return c.json(nova, 201);
});

/** POST /api/patients/:id/sessions — creates a new session for the patient. */
api.post("/patients/:id/sessions", async (c) => {
  const paciente = getPacienteById(c.req.param("id"));
  if (!paciente) return c.json({ error: "Paciente não encontrado" }, 404);

  const body = await c.req.json<{
    data: string;
    tipo: "presencial" | "remota";
    duracao: number;
    humorInicio?: number;
    humorFim?: number;
    resumo?: string;
  }>();

  const novaSessao: Sessao = {
    id: crypto.randomUUID(),
    pacienteId: paciente.id,
    data: body.data,
    tipo: body.tipo,
    duracao: body.duracao,
    resumo: body.resumo ?? "",
    insights: [],
    humorInicio: body.humorInicio ?? 5,
    humorFim: body.humorFim ?? 5,
    temTranscricao: false,
  };

  addSessao(novaSessao);
  return c.json(novaSessao, 201);
});

// ── Agenda ─────────────────────────────────────────────────────────────────

api.get("/sessions/agenda", (c) => c.json(AGENDA_SESSOES_TEMPLATE));

// ── Transcrições ───────────────────────────────────────────────────────────

api.get("/patients/:patientId/transcription", (c) => {
  const transcricao = getTranscricao(c.req.param("patientId"));
  if (!transcricao) return c.json({ error: "Transcrição não encontrada" }, 404);
  return c.json(transcricao);
});
// ── Exercícios (biblioteca) ─────────────────────────────────────────────────────────────

api.get("/exercises", (c) => c.json(getExercicios()));

/** POST /api/exercises — adds a new exercise template to the library. */
api.post("/exercises", async (c) => {
  const body = await c.req.json<{
    titulo: string;
    descricao: string;
    tipo: ExercicioTemplate["tipo"];
  }>();

  const novo: ExercicioTemplate = {
    id: crypto.randomUUID(),
    titulo: body.titulo,
    descricao: body.descricao,
    tipo: body.tipo,
  };

  addExercicio(novo);
  return c.json(novo, 201);
});
export { api as apiRouter };
