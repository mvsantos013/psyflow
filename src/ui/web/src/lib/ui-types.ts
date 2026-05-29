export type PatientStatus = "ativo" | "inativo" | "alta";
export type SessionType = "presencial" | "remota";
export type TaskType = "exercicio" | "audio" | "diario" | "habito";
export type TaskStatus = "pendente" | "concluida" | "aprovada";
export type MoodSource = "paciente" | "profissional";

export type ConclusoesIA = {
  tcc?: string;
  psicanalise?: string;
  sistemica?: string;
  humanista?: string;
};

export type ResumoGeral = {
  sintese: string;
  temasRecorrentes: string[];
  evolucaoGeral: string;
  pontosAtencao: string[];
};

export type Paciente = {
  id: string;
  nome: string;
  email: string;
  idade: number;
  inicioTratamento: string;
  status: PatientStatus;
  ultimaSessao: string;
  proximaSessao: string;
  proximaSessaoHora?: string;
  humorMedio: number;
  diarioCount: number;
  foto?: string;
};

export type Sessao = {
  id: string;
  pacienteId: string;
  data: string;
  tipo: SessionType;
  duracao: number;
  resumo: string;
  insights: string[];
  humorInicio: number;
  humorFim: number;
  temTranscricao: boolean;
  transcricao?: string;
  audioS3Key?: string;
  transcriptionS3Key?: string;
  conclusoesIA?: ConclusoesIA;
};

export type RegistroHumor = {
  data: string;
  valor: number;
  fonte: MoodSource;
};

export type Prontuario = {
  paciente: Paciente;
  sessoes: Sessao[];
  registrosHumor: RegistroHumor[];
  diagnosticos: string[];
  observacoes: string;
  resumoGeral?: ResumoGeral | null;
};

export type TarefaPrescrita = {
  id: string;
  pacienteId: string;
  titulo: string;
  descricao: string;
  tipo: TaskType;
  status: TaskStatus;
  dataPrescricao: string;
  dataConclusao?: string;
};

export type ExercicioTemplate = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TaskType;
};

export type AgendaEntry = {
  diaOffset: number;
  hora: number;
  pacienteId: string;
  tipo: SessionType;
};

export type TranscricaoResult = {
  resumo: string;
  insights: string[];
  tarefas: string[];
  transcricao?: string;
};