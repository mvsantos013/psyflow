Dashboard — Visão Geral
Cards de Estatísticas

Quatro cards no topo mostrando: Pacientes Ativos, Sessões Hoje, Tarefas Pendentes e Transcrições IA — cada um com ícone e cor temática.
Próximas Sessões (lista)

Lista com as 6 próximas sessões agendadas, mostrando foto do paciente, nome, tipo (remota com ícone de vídeo / presencial com ícone de local) e horário.
Cada item é clicável e leva direto à página do paciente.
Agenda da Semana (calendário)

Calendário visual estilo grade semanal (Seg–Dom × horários 08h–19h).
Sessões aparecem como blocos coloridos: azul para remota, verde-água para presencial.
Sessões pagas ficam com tom esmeralda e um check (✓) no nome.
Navegação por semana (anterior/próxima) + botão "Hoje".
Legenda indicando os três tipos de bloco.
Atividade Recente

Feed cronológico de eventos da clínica: transcrições geradas, diários atualizados, sessões finalizadas, tarefas concluídas e novos pacientes.
👥 Pacientes — Lista
Busca por nome ou email em tempo real.
Filtro por status: Todos, Ativo, Inativo, Alta.
Cada card de paciente mostra: foto, nome, status (badge colorido), idade, email, humor médio (com ícone de tendência ↗️↘️➡️), quantidade de registros no diário e data da última sessão.
Clicar em qualquer paciente abre seu prontuário completo.
📋 Prontuário do Paciente (página individual)
Acessado ao clicar em um paciente. Tem 4 abas:

1. Visão Geral
Síntese Clínica do Caso com duas sub-abas:
Profissional: campos editáveis (síntese, temas recorrentes, pontos de atenção, evolução geral) salvos no localStorage. Pode preencher, editar e salvar.
Assistente de IA: conteúdo gerado automaticamente pela IA com síntese, temas, evolução e pontos de atenção.
Evolução do Humor: gráfico de área interativo (Recharts) mostrando a variação do humor do paciente ao longo do tempo (escala 0–10).
2. Sessões
Interface mestre-detalhe:

Lado esquerdo — lista de sessões: ordenadas da mais recente para a mais antiga. Cada sessão mostra data, badge de pagamento (verde "Pago" / cinza "Não pago"), tipo (remota/presencial), duração e badge "IA" se tem transcrição.
Lado direito — detalhes da sessão selecionada:
Cabeçalho: data, tipo, duração, variação de humor (início → fim, com delta colorido).
Checkbox de pagamento: marcar/desmarcar sessão como paga. Quando paga, reflete verde no calendário do dashboard.
Resumo da Sessão: sub-abas Profissional (editável, salva no localStorage) e Assistente de IA (texto gerado).
Conclusões da Sessão: sub-abas Profissional (editável) e Assistente de IA (conclusão gerada por IA com seletor de abordagem: TCC, Psicanálise, Sistêmica ou Humanista).
Insights extraídos: tags com padrões identificados pela IA.
Transcrição da Sessão: bloco com scroll mostrando a transcrição completa estilo "[00:00] Psicóloga: ...".
3. Chat (WhatsApp)
Interface de chat estilo WhatsApp embutida.
Header com foto do paciente, nome e status "online".
Histórico de mensagens mockado com bolhas coloridas (verde para o profissional, branco para o paciente).
Status de entrega: ícones de check (✓ enviado, ✓✓ entregue, ✓✓ azul lido).
Ações: botões de ligação e vídeo no header.
Input funcional: digita e envia mensagens (aparecem em tempo real no chat).
4. Tarefas
Lista de tarefas prescritas para o paciente.
Cada tarefa mostra: título, descrição, tipo (exercício/áudio/diário/hábito), data de prescrição e indicador de status por cor (concluída, aprovada, pendente).
🎙️ Transcrição IA (tela independente)
Upload simulado de áudio: seleciona o paciente em um dropdown, clica em "Enviar áudio da sessão" e vê uma animação de upload → processamento → concluído.
Resumo Executivo: texto com o resumo da sessão transcrita.
Insights Chave da IA: lista de pontos importantes extraídos (gatilhos, padrões, progressos).
Prescrição Automatizada de Tarefas: sugestões de tarefas geradas pela IA com checkbox e botão "Aprovar e enviar para paciente".
💰 Controle de Pagamentos
Sistema de pagamento por sessão, persistente em memória (store reativo com useSyncExternalStore).
Marcar sessão como paga no prontuário reflete automaticamente na agenda do dashboard (fica verde com ✓).
Sessões pré-marcadas como pagas nos dados mockados já aparecem verdes.
🧭 Navegação & Layout
Sidebar colapsável com logo "PsyFlow", menu principal (Visão Geral, Pacientes, Transcrição IA) e ferramentas secundárias (Exercícios, Prontuários).
Header com trigger da sidebar e perfil do profissional ("Dra. Psicóloga").
Layout responsivo com scroll interno no conteúdo.
🎨 Design System
Tema escuro/claro suportado via CSS variables (oklch).
Componentes shadcn/ui: tabs, cards, selects, checkboxes, textareas, buttons, inputs, badges, sidebar.
Cores semânticas: primary, chart-1 a chart-5, emerald para pagamentos, muted, accent, etc.
Ícones do Lucide em toda a interface.