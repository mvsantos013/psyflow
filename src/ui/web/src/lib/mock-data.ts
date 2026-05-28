// Dados mockados para simular o backend do dashboard do psicólogo

export interface Paciente {
  id: string;
  nome: string;
  email: string;
  idade: number;
  inicioTratamento: string;
  status: "ativo" | "inativo" | "alta";
  ultimaSessao: string;
  proximaSessao: string;
  proximaSessaoHora?: string;
  humorMedio: number;
  diarioCount: number;
  foto?: string;
}

export interface Sessao {
  id: string;
  pacienteId: string;
  data: string;
  tipo: "presencial" | "remota";
  duracao: number;
  resumo: string;
  insights: string[];
  humorInicio: number;
  humorFim: number;
  temTranscricao: boolean;
  transcricao?: string;
  conclusoesIA?: {
    tcc?: string;
    psicanalise?: string;
    sistemica?: string;
    humanista?: string;
  };
}

export interface RegistroHumor {
  data: string;
  valor: number;
  fonte: "paciente" | "profissional";
}

export interface Prontuario {
  paciente: Paciente;
  sessoes: Sessao[];
  registrosHumor: RegistroHumor[];
  diagnosticos: string[];
  observacoes: string;
  resumoGeral?: {
    sintese: string;
    temasRecorrentes: string[];
    evolucaoGeral: string;
    pontosAtencao: string[];
  };
}

export interface TarefaPrescrita {
  id: string;
  pacienteId: string;
  titulo: string;
  descricao: string;
  tipo: "exercicio" | "audio" | "diario" | "habito";
  status: "pendente" | "concluida" | "aprovada";
  dataPrescricao: string;
  dataConclusao?: string;
}

export interface ExercicioTemplate {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TarefaPrescrita["tipo"];
}

export const mockPacientes: Paciente[] = [
  {
    id: "p1",
    nome: "Ana Carolina Mendes",
    email: "ana.mendes@email.com",
    idade: 34,
    inicioTratamento: "2025-01-15",
    status: "ativo",
    ultimaSessao: "2025-05-20",
    proximaSessao: "2025-05-27",
    proximaSessaoHora: "14:00",
    humorMedio: 6.2,
    diarioCount: 47,
    foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana",
  },
  {
    id: "p2",
    nome: "Ricardo Oliveira",
    email: "ricardo.oliveira@email.com",
    idade: 28,
    inicioTratamento: "2025-02-10",
    status: "ativo",
    ultimaSessao: "2025-05-21",
    proximaSessao: "2025-05-24",
    proximaSessaoHora: "10:00",
    humorMedio: 5.8,
    diarioCount: 32,
    foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo",
  },
  {
    id: "p3",
    nome: "Marina Santos",
    email: "marina.santos@email.com",
    idade: 41,
    inicioTratamento: "2024-11-03",
    status: "ativo",
    ultimaSessao: "2025-05-19",
    proximaSessao: "2025-05-26",
    proximaSessaoHora: "16:30",
    humorMedio: 7.1,
    diarioCount: 89,
    foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marina",
  },
  {
    id: "p4",
    nome: "Felipe Costa",
    email: "felipe.costa@email.com",
    idade: 23,
    inicioTratamento: "2025-03-05",
    status: "ativo",
    ultimaSessao: "2025-05-22",
    proximaSessao: "2025-05-29",
    proximaSessaoHora: "09:00",
    humorMedio: 4.5,
    diarioCount: 18,
    foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felipe",
  },
  {
    id: "p5",
    nome: "Juliana Almeida",
    email: "juliana.almeida@email.com",
    idade: 36,
    inicioTratamento: "2024-08-20",
    status: "alta",
    ultimaSessao: "2025-04-15",
    proximaSessao: "",
    humorMedio: 8.3,
    diarioCount: 120,
    foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Juliana",
  },
  {
    id: "p6",
    nome: "Bruno Ferreira",
    email: "bruno.ferreira@email.com",
    idade: 31,
    inicioTratamento: "2025-04-12",
    status: "inativo",
    ultimaSessao: "2025-04-30",
    proximaSessao: "",
    humorMedio: 5.0,
    diarioCount: 8,
    foto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bruno",
  },
];

const transcricaoExemplo = `[00:00] Psicóloga: Olá, como você está hoje?
[00:04] Paciente: Tive uma semana difícil. Recebi um feedback do meu chefe que me deixou bem mal.
[00:12] Psicóloga: Pode me contar mais sobre o que aconteceu?
[00:18] Paciente: Ele disse que meu relatório estava confuso. Na hora pensei: "pronto, vão me demitir, sou uma fraude".
[00:35] Psicóloga: Esse pensamento — "sou uma fraude" — apareceu rápido. O que aconteceu no seu corpo?
[00:42] Paciente: Coração acelerou, ficou difícil respirar. Saí da reunião e fui ao banheiro.
[01:05] Psicóloga: Vamos olhar as evidências. O que de concreto seu chefe disse?
[01:14] Paciente: Que precisava reescrever uma seção. Só isso, na verdade.
[01:22] Psicóloga: E o salto até "vão me demitir" — o que sustenta?
[01:31] Paciente: ...nada, agora que falo em voz alta. É o padrão de sempre.
[02:10] Psicóloga: Esse padrão de catastrofizar avaliações é familiar. Lembra de quando começou?`;

export const mockSessoes: Record<string, Sessao[]> = {
  p1: [
    {
      id: "s1",
      pacienteId: "p1",
      data: "2025-05-20",
      tipo: "remota",
      duracao: 50,
      resumo:
        "Sessão focada em ansiedade no trabalho. Paciente relatou aumento da pressão com nova gestão. Explorou pensamentos automáticos de inadequação.",
      insights: [
        `Padrão de catastrofização sobre avaliações`,
        `Gatilho principal: emails do chefe após 18h`,
        `Progresso notável na identificação de pensamentos disfuncionais`,
      ],
      humorInicio: 4,
      humorFim: 6,
      temTranscricao: true,
      transcricao: transcricaoExemplo,
    },
    {
      id: "s2",
      pacienteId: "p1",
      data: "2025-05-13",
      tipo: "presencial",
      duracao: 55,
      resumo:
        "Revisão das técnicas de reestruturação cognitiva. Paciente conseguiu aplicar em situação real com resultados positivos.",
      insights: [
        `Técnica de "evidências a favor e contra" foi bem aplicada`,
        `Redução de 30% na frequência de pensamentos intrusivos`,
      ],
      humorInicio: 5,
      humorFim: 7,
      temTranscricao: false,
    },
    {
      id: "s3",
      pacienteId: "p1",
      data: "2025-05-06",
      tipo: "remota",
      duracao: 50,
      resumo:
        "Discussão sobre relação com a mãe. Reconheceu padrão de busca de aprovação excessiva.",
      insights: [
        `Padrão de "pleaser" identificado desde a infância`,
        `Conexão entre ansiedade e medo de rejeição materializada`,
      ],
      humorInicio: 3,
      humorFim: 5,
      temTranscricao: true,
      transcricao: transcricaoExemplo,
    },
    {
      id: "s7",
      pacienteId: "p1",
      data: "2025-05-25",
      tipo: "presencial",
      duracao: 50,
      resumo:
        "Sessão de acompanhamento. Paciente relata redução significativa nos episódios de ansiedade. Exploramos estratégias para lidar com situações sociais desafiadoras.",
      insights: [
        `Melhora percebida na autorregulação emocional`,
        `Primeira semana sem crise de ansiedade no trabalho`,
      ],
      humorInicio: 6,
      humorFim: 8,
      temTranscricao: false,
    },
  ],
  p2: [
    {
      id: "s4",
      pacienteId: "p2",
      data: "2025-05-21",
      tipo: "remota",
      duracao: 45,
      resumo:
        "Paciente com sintomas depressivos leves. Relatou dificuldade de iniciar atividades e isolamento social.",
      insights: [
        `Ciclo de inatividade -> culpa -> mais inatividade`,
        `Padrão de pensamento "tudo ou nada" predominante`,
      ],
      humorInicio: 3,
      humorFim: 4,
      temTranscricao: true,
      transcricao: transcricaoExemplo,
    },
  ],
  p3: [
    {
      id: "s5",
      pacienteId: "p3",
      data: "2025-05-19",
      tipo: "presencial",
      duracao: 60,
      resumo:
        "Sessão de avaliação de progresso. Paciente demonstra resiliência significativa e boa adesão ao tratamento.",
      insights: [
        `Evolução sustentada ao longo de 6 meses`,
        `Adesão ao diário clínico: 95%`,
        `Sintomas de TOC reduzidos em 40%`,
      ],
      humorInicio: 6,
      humorFim: 8,
      temTranscricao: false,
    },
  ],
  p4: [
    {
      id: "s6",
      pacienteId: "p4",
      data: "2025-05-22",
      tipo: "remota",
      duracao: 50,
      resumo:
        "Primeira sessão focada em transtorno de ansiedade social. Paciente relata pânico em situações de apresentação.",
      insights: [
        `Fobia social com componente de desempenho`,
        `Evasão comportamental como estratégia de coping`,
      ],
      humorInicio: 2,
      humorFim: 3,
      temTranscricao: true,
      transcricao: transcricaoExemplo,
    },
  ],
};

export const mockRegistrosHumor: Record<string, RegistroHumor[]> = {
  // p1 — paciente: dias ímpares; profissional: dias pares (datas diferentes)
  p1: [
    { data: "2025-05-01", valor: 5, fonte: "paciente" },
    { data: "2025-05-02", valor: 6, fonte: "profissional" },
    { data: "2025-05-03", valor: 6, fonte: "paciente" },
    { data: "2025-05-05", valor: 5, fonte: "paciente" },
    { data: "2025-05-07", valor: 6, fonte: "paciente" },
    { data: "2025-05-08", valor: 7, fonte: "profissional" },
    { data: "2025-05-09", valor: 7, fonte: "paciente" },
    { data: "2025-05-11", valor: 6, fonte: "paciente" },
    { data: "2025-05-13", valor: 7, fonte: "paciente" },
    { data: "2025-05-14", valor: 7, fonte: "profissional" },
    { data: "2025-05-15", valor: 7, fonte: "paciente" },
    { data: "2025-05-17", valor: 6, fonte: "paciente" },
    { data: "2025-05-19", valor: 7, fonte: "paciente" },
    { data: "2025-05-20", valor: 8, fonte: "profissional" },
    { data: "2025-05-21", valor: 8, fonte: "paciente" },
    { data: "2025-05-23", valor: 8, fonte: "paciente" },
  ],
  // p2 — paciente: dias pares; profissional: dias distintos (não coincidentes)
  p2: [
    { data: "2025-05-02", valor: 3, fonte: "paciente" },
    { data: "2025-05-04", valor: 4, fonte: "paciente" },
    { data: "2025-05-06", valor: 3, fonte: "paciente" },
    { data: "2025-05-07", valor: 4, fonte: "profissional" },
    { data: "2025-05-10", valor: 4, fonte: "paciente" },
    { data: "2025-05-12", valor: 5, fonte: "paciente" },
    { data: "2025-05-15", valor: 5, fonte: "profissional" },
    { data: "2025-05-16", valor: 4, fonte: "paciente" },
    { data: "2025-05-18", valor: 4, fonte: "paciente" },
    { data: "2025-05-21", valor: 6, fonte: "profissional" },
    { data: "2025-05-22", valor: 5, fonte: "paciente" },
  ],
  // p3 — paciente: quase diário; profissional: sessões em dias distintos
  p3: [
    { data: "2025-05-01", valor: 7, fonte: "paciente" },
    { data: "2025-05-02", valor: 8, fonte: "paciente" },
    { data: "2025-05-04", valor: 8, fonte: "paciente" },
    { data: "2025-05-05", valor: 7, fonte: "profissional" },
    { data: "2025-05-06", valor: 9, fonte: "paciente" },
    { data: "2025-05-08", valor: 8, fonte: "paciente" },
    { data: "2025-05-11", valor: 8, fonte: "paciente" },
    { data: "2025-05-12", valor: 8, fonte: "profissional" },
    { data: "2025-05-13", valor: 9, fonte: "paciente" },
    { data: "2025-05-16", valor: 8, fonte: "paciente" },
    { data: "2025-05-18", valor: 8, fonte: "paciente" },
    { data: "2025-05-19", valor: 8, fonte: "profissional" },
    { data: "2025-05-21", valor: 9, fonte: "paciente" },
    { data: "2025-05-23", valor: 9, fonte: "paciente" },
  ],
  // p4 — paciente: a cada 3 dias; profissional: sessões semanais em dias distintos
  p4: [
    { data: "2025-05-10", valor: 3, fonte: "paciente" },
    { data: "2025-05-12", valor: 3, fonte: "profissional" },
    { data: "2025-05-13", valor: 2, fonte: "paciente" },
    { data: "2025-05-16", valor: 3, fonte: "paciente" },
    { data: "2025-05-18", valor: 4, fonte: "profissional" },
    { data: "2025-05-19", valor: 3, fonte: "paciente" },
    { data: "2025-05-22", valor: 4, fonte: "paciente" },
    { data: "2025-05-23", valor: 4, fonte: "profissional" },
  ],
};

export const mockTranscricoes: Record<string, { resumo: string; insights: string[]; tarefas: string[] }> = {
  p1: {
    resumo:
      "Sessão remota de 50 minutos. Ana relatou situação estressante no trabalho — recebeu feedback crítico do chefe e interpretou como sinal de incompetência. Exploramos pensamentos automáticos e crenças subjacentes. Técnica de reestruturação cognitiva aplicada com sucesso.",
    insights: [
      `Gatilho principal: emails após 18h com tom imperativo`,
      `Pensamento automático: "Sou incompetente" → evidências reais não sustentam`,
      `Padrão recorrente de catastrofização sobre avaliações profissionais`,
      `Conexão entre ansiedade atual e experiência de bullying na adolescência`,
      `Redução de 40% na frequência de pensamentos intrusivos em relação à semana anterior`,
    ],
    tarefas: [
      `Registro diário de pensamentos automáticos (mín. 3x/sem)`,
      `Exercício de respiração 4-7-8 antes de conferir emails após 18h`,
      `Meditação guiada 'Ansiedade no Trabalho' — 10 min/dia`,
    ],
  },
  p2: {
    resumo:
      "Sessão remota de 45 minutos. Ricardo relatou dificuldade de iniciar atividades e isolamento social crescente. Exploramos o ciclo inatividade-culpa e identificamos pensamentos do tipo \"tudo ou nada\".",
    insights: [
      `Ciclo de inatividade -> culpa -> mais inatividade bem estabelecido`,
      `Padrão "tudo ou nada" predominante em metas pessoais`,
      `Redução de contato social ligada a medo de julgamento`,
      `Sono fragmentado contribuindo para baixa energia diurna`,
    ],
    tarefas: [
      `Técnica de ativação comportamental: 1 atividade prazerosa/dia`,
      `Diário de sono com horários de deitar e acordar`,
      `Áudio de relaxamento progressivo antes de dormir`,
    ],
  },
  p4: {
    resumo:
      "Primeira sessão remota de 50 minutos. Felipe relata pânico intenso em situações de apresentação e fala em público. Evita reuniões e eventos sociais. Exploramos história de desenvolvimento e primeiros episódios.",
    insights: [
      `Fobia social com componente de desempenho predominante`,
      `Evasão comportamental como principal estratégia de coping`,
      `Expectativa de avaliação negativa antecipando interações sociais`,
      `História de bullying escolar em apresentações orais`,
    ],
    tarefas: [
      `Registro de hierarquia de situações sociais ansiógenas`,
      `Exercício de exposição gradual: iniciar com 1 pessoa conhecida`,
      `Áudio de respiração diafragmática para momentos de pânico`,
    ],
  },
};

export const mockTarefas: TarefaPrescrita[] = [
  {
    id: "t1",
    pacienteId: "p1",
    titulo: "Registro de Pensamentos Automáticos",
    descricao: "Anote 3 situações onde identificou pensamentos disfuncionais esta semana",
    tipo: "diario",
    status: "aprovada",
    dataPrescricao: "2025-05-20",
  },
  {
    id: "t2",
    pacienteId: "p1",
    titulo: "Respiração 4-7-8",
    descricao: "Antes de conferir emails após 18h, faça 3 ciclos de respiração",
    tipo: "exercicio",
    status: "pendente",
    dataPrescricao: "2025-05-20",
  },
  {
    id: "t3",
    pacienteId: "p1",
    titulo: "Meditação Guiada — Ansiedade no Trabalho",
    descricao: "Áudio de 10 minutos disponível na Central do Paciente",
    tipo: "audio",
    status: "pendente",
    dataPrescricao: "2025-05-20",
  },
  {
    id: "t4",
    pacienteId: "p2",
    titulo: "Ativação Comportamental Diária",
    descricao: "Realize 1 atividade prazerosa por dia, por menor que pareça",
    tipo: "exercicio",
    status: "pendente",
    dataPrescricao: "2025-05-21",
  },
  {
    id: "t5",
    pacienteId: "p2",
    titulo: "Relaxamento Progressivo",
    descricao: "Áudio de 15 minutos antes de dormir para melhorar qualidade do sono",
    tipo: "audio",
    status: "pendente",
    dataPrescricao: "2025-05-21",
  },
  {
    id: "t6",
    pacienteId: "p4",
    titulo: "Hierarquia de Exposição Social",
    descricao: "Liste e ordene situações sociais da menos à mais ansiógena",
    tipo: "exercicio",
    status: "pendente",
    dataPrescricao: "2025-05-22",
  },
];

export const AGENDA_SESSOES_TEMPLATE: Array<{
  diaOffset: number;
  hora: number;
  pacienteId: string;
  tipo: "remota" | "presencial";
}> = [
  { diaOffset: 0, hora: 9, pacienteId: "p2", tipo: "remota" },
  { diaOffset: 0, hora: 11, pacienteId: "p3", tipo: "presencial" },
  { diaOffset: 0, hora: 15, pacienteId: "p1", tipo: "remota" },
  { diaOffset: 1, hora: 10, pacienteId: "p4", tipo: "remota" },
  { diaOffset: 1, hora: 14, pacienteId: "p2", tipo: "presencial" },
  { diaOffset: 1, hora: 17, pacienteId: "p3", tipo: "remota" },
  { diaOffset: 2, hora: 9, pacienteId: "p1", tipo: "presencial" },
  { diaOffset: 2, hora: 16, pacienteId: "p4", tipo: "remota" },
  { diaOffset: 3, hora: 10, pacienteId: "p3", tipo: "remota" },
  { diaOffset: 3, hora: 14, pacienteId: "p1", tipo: "remota" },
  { diaOffset: 3, hora: 18, pacienteId: "p2", tipo: "presencial" },
  { diaOffset: 4, hora: 11, pacienteId: "p4", tipo: "presencial" },
  { diaOffset: 4, hora: 15, pacienteId: "p2", tipo: "remota" },
  { diaOffset: 4, hora: 17, pacienteId: "p1", tipo: "remota" },
];

export function getPacienteById(id: string): Paciente | undefined {
  return mockPacientes.find((p) => p.id === id);
}

export function getPacientesAtivos(): Paciente[] {
  return mockPacientes.filter((p) => p.status === "ativo");
}

export function getTranscricao(pacienteId: string) {
  return mockTranscricoes[pacienteId] ?? null;
}

/**
 * Appends a new session to the in-memory store.
 * Data persists until the next full page refresh.
 */
export function addSessao(sessao: Sessao): void {
  if (!mockSessoes[sessao.pacienteId]) {
    mockSessoes[sessao.pacienteId] = [];
  }
  mockSessoes[sessao.pacienteId].unshift(sessao);
}

export function getProntuarioById(id: string): Prontuario | undefined {
  const paciente = getPacienteById(id);
  if (!paciente) return undefined;
  return {
    paciente,
    sessoes: mockSessoes[id] || [],
    registrosHumor: mockRegistrosHumor[id] || [],
    diagnosticos:
      id === "p1"
        ? ["Transtorno de Ansiedade Generalizada"]
        : id === "p2"
        ? ["Depressão Leve"]
        : id === "p3"
        ? ["Transtorno Obsessivo-Compulsivo (em remissão parcial)"]
        : id === "p4"
        ? ["Fobia Social"]
        : ["Em avaliação"],
    observacoes: "",
  };
}

export function getTarefasByPacienteId(id: string): TarefaPrescrita[] {
  return mockTarefas.filter((t) => t.pacienteId === id);
}

export function addTarefa(tarefa: TarefaPrescrita): void {
  mockTarefas.push(tarefa);
}

export const mockExercicios: ExercicioTemplate[] = [
  {
    id: "e1",
    titulo: "Registro de Pensamentos Automáticos",
    descricao: "Anote 3 situações onde identificou pensamentos disfuncionais durante a semana.",
    tipo: "diario",
  },
  {
    id: "e2",
    titulo: "Respiração 4-7-8",
    descricao: "Inspire por 4s, segure por 7s, expire por 8s. Repita 3 ciclos antes de situações ansiosas.",
    tipo: "exercicio",
  },
  {
    id: "e3",
    titulo: "Meditação Guiada — Ans. no Trabalho",
    descricao: "Áudio de 10 minutos disponível na Central do Paciente para redução de ansiedade situacional.",
    tipo: "audio",
  },
  {
    id: "e4",
    titulo: "Ativação Comportamental Diária",
    descricao: "Realize 1 atividade prazerosa por dia, por menor que pareça. Registre como se sentiu.",
    tipo: "exercicio",
  },
  {
    id: "e5",
    titulo: "Diário de Gratidão",
    descricao: "Escreva 3 coisas pelas quais é grato ao final do dia. Prática diária por 2 semanas.",
    tipo: "diario",
  },
  {
    id: "e6",
    titulo: "Relaxamento Muscular Progressivo",
    descricao: "Áudio de 15 minutos com técnica de Jacobson. Indicado antes de dormir.",
    tipo: "audio",
  },
  {
    id: "e7",
    titulo: "Hábito de Movimento Diário",
    descricao: "Caminhe ao menos 20 minutos por dia. Registre no aplicativo ao concluir.",
    tipo: "habito",
  },
];

export function getExercicios(): ExercicioTemplate[] {
  return mockExercicios;
}

export function addExercicio(ex: ExercicioTemplate): void {
  mockExercicios.push(ex);
}

export const mockResumoGeral: Record<string, Prontuario["resumoGeral"]> = {
  p1: {
    sintese:
      "Paciente com TAG em tratamento há 4 meses, demonstra boa adesão ao processo e capacidade crescente de autoobservação. Padrão central de catastrofização sobre avaliações profissionais, com raízes em vivências de bullying na adolescência. Resposta favorável à reestruturação cognitiva.",
    temasRecorrentes: [
      "Ansiedade no ambiente de trabalho",
      "Relação com figuras de autoridade",
      "Busca de aprovação materna",
      "Pensamentos catastróficos antecipatórios",
    ],
    evolucaoGeral:
      "Melhora consistente do humor médio de 4.8 para 6.2 nos últimos 30 dias. Redução de 40% na frequência de pensamentos intrusivos. Aplica técnicas aprendidas em situações reais.",
    pontosAtencao: [
      "Pico de ansiedade nas noites de domingo",
      "Evita conflitos diretos com gestores",
    ],
  },
  p2: {
    sintese:
      "Episódio depressivo leve com 3 meses de acompanhamento. Ciclo de inatividade-culpa bem estabelecido, com isolamento social progressivo. Boa resposta inicial à ativação comportamental, mas adesão irregular ao diário.",
    temasRecorrentes: [
      "Sensação de inadequação",
      "Comparação social (redes sociais)",
      "Sono fragmentado",
      "Pensamento tudo-ou-nada",
    ],
    evolucaoGeral:
      "Humor médio estável em torno de 4.0. Sem deterioração, mas melhora ainda discreta. Recomenda-se avaliar necessidade de encaminhamento psiquiátrico se quadro persistir.",
    pontosAtencao: [
      "Adesão irregular às tarefas",
      "Verificar ideação passiva em próxima sessão",
    ],
  },
  p3: {
    sintese:
      "Paciente com TOC em remissão parcial após 6 meses. Excelente adesão e capacidade de insight. Em fase de consolidação e prevenção de recaídas.",
    temasRecorrentes: [
      "Rituais de checagem (reduzidos)",
      "Perfeccionismo profissional",
      "Autocompaixão",
    ],
    evolucaoGeral:
      "Humor médio elevado e estável (7.1). Sintomas obsessivos reduzidos em 40%. Candidata a espaçamento de sessões.",
    pontosAtencao: ["Risco de recaída em períodos de estresse agudo"],
  },
  p4: {
    sintese:
      "Início recente de tratamento para fobia social com componente de desempenho. Quadro de evasão comportamental significativo. Em fase de psicoeducação e construção de hierarquia de exposição.",
    temasRecorrentes: [
      "Medo de avaliação negativa",
      "Histórico de bullying escolar",
      "Evasão de situações sociais",
    ],
    evolucaoGeral:
      "Humor médio baixo (4.5). Esperado nesta fase inicial. Vínculo terapêutico bem estabelecido.",
    pontosAtencao: [
      "Início de exposição gradual deve ser cuidadosamente dosado",
      "Avaliar impacto acadêmico atual",
    ],
  },
};

const conclusoesPadrao = {
  tcc: "Sessão evidencia padrão de catastrofização ativado por gatilho situacional. Reestruturação cognitiva aplicada com sucesso na própria sessão — paciente identificou distorção e gerou pensamento alternativo. Reforçar registro de pensamentos e ampliar repertório de evidências.",
  psicanalise:
    "Material associativo aponta para repetição de cena infantil de inadequação diante da figura de autoridade. Transferência paterna ativa na relação com o chefe. Sintoma como retorno do recalcado: o medo da demissão veicula angústia mais antiga de desamparo. Sustentar a escuta da repetição.",
  sistemica:
    "Sintoma cumpre função na dinâmica familiar atual — paciente assume papel de \"a forte\" e suprime vulnerabilidade. Reuniões de trabalho ecoam dinâmica fraterna de competição. Explorar genograma na próxima sessão.",
  humanista:
    "Paciente acessou em sessão um movimento autêntico de autocontato, reconhecendo a discrepância entre autoimagem idealizada e experiência real. Validação incondicional permitiu emergir luto pela própria exigência. Sustentar o ritmo do paciente sem direcionar.",
};

// Enriquece sessões com transcrição + conclusões IA
Object.values(mockSessoes).forEach((sessoes) => {
  sessoes.forEach((s) => {
    if (s.temTranscricao) {
      s.transcricao = transcricaoExemplo;
      s.conclusoesIA = conclusoesPadrao;
    }
  });
});

export function getResumoGeral(id: string) {
  return mockResumoGeral[id];
}
