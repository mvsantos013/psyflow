import { Link } from "@tanstack/react-router";
import { Search, Filter, ChevronRight, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCreatePaciente, usePacientes } from "@/hooks/use-pacientes";
import { formatDataCurta } from "@/lib/utils";

type NovoPacienteFormState = {
  nome: string;
  email: string;
  dataNascimento: string;
  inicioTratamento: string;
};

function emptyFormState(): NovoPacienteFormState {
  return {
    nome: "",
    email: "",
    dataNascimento: "",
    inicioTratamento: "",
  };
}

export function PacientesList() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<NovoPacienteFormState>(emptyFormState());
  const { data: pacientes = [], isLoading } = usePacientes();
  const createPaciente = useCreatePaciente();

  const filtrados = pacientes.filter((p) => {
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.email.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const getHumorIcon = (valor: number) => {
    if (valor >= 7) return <TrendingUp className="h-4 w-4 text-chart-2" />;
    if (valor <= 4) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  function resetForm() {
    setFormState(emptyFormState());
  }

  function closeForm() {
    setFormOpen(false);
    resetForm();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = formState.nome.trim();
    const email = formState.email.trim();
    const birthDate = formState.dataNascimento;
    const treatmentStartDate = formState.inicioTratamento;

    if (!name || !email || !birthDate || !treatmentStartDate) {
      toast.error("Preencha nome, e-mail, data de nascimento e início do tratamento.");
      return;
    }

    createPaciente.mutate(
      {
        name,
        email,
        birthDate,
        treatmentStartDate,
      },
      {
        onSuccess: () => {
          toast.success("Paciente cadastrado com sucesso.");
          closeForm();
        },
        onError: () => {
          toast.error("Não foi possível cadastrar o paciente.");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus pacientes e acompanhe o progresso de cada um.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="self-start">
          <Plus className="h-4 w-4" />
          Novo paciente
        </Button>
      </div>

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Carregando pacientes...</p>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Carregando pacientes...</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="grid gap-3">
        {filtrados.map((p) => (
          <Link
            key={p.id}
            to="/dashboard/pacientes/$id"
            params={{ id: p.id }}
            className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
          >
            <img
              src={p.foto}
              alt={p.nome}
              className="h-12 w-12 rounded-full bg-muted object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{p.nome}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.idade} anos · {p.email}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Humor médio</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {getHumorIcon(p.humorMedio)}
                  <span className="font-medium text-foreground">{p.humorMedio.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Registros</p>
                <p className="font-medium text-foreground mt-0.5">{p.diarioCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Última sessão</p>
                <p className="font-medium text-foreground mt-0.5">
                  {formatDataCurta(p.ultimaSessao)}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
        {filtrados.length === 0 && (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
          </div>
        )}
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setFormOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo paciente</DialogTitle>
            <DialogDescription>
              Cadastre um novo paciente para iniciar o acompanhamento clínico.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="paciente-nome">Nome</Label>
              <Input
                id="paciente-nome"
                value={formState.nome}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, nome: event.target.value }))
                }
                placeholder="Ana Souza"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paciente-email">E-mail</Label>
              <Input
                id="paciente-email"
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="ana@example.com"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paciente-data-nascimento">Data de nascimento</Label>
                <Input
                  id="paciente-data-nascimento"
                  type="date"
                  value={formState.dataNascimento}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, dataNascimento: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paciente-inicio">Início do tratamento</Label>
                <Input
                  id="paciente-inicio"
                  type="date"
                  value={formState.inicioTratamento}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      inicioTratamento: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPaciente.isPending}>
                {createPaciente.isPending ? "Cadastrando..." : "Cadastrar paciente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
