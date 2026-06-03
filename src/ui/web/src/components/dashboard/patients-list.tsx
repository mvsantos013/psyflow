import { Link } from "@tanstack/react-router";
import {
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  CalendarDays,
} from "lucide-react";
import { useRef, useState } from "react";
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
import { AppInput } from "@/components/ui/app-input";
import { Label } from "@/components/ui/label";
import { AppSelectContent, AppSelectItem, AppSelectTrigger } from "@/components/ui/app-select";
import { Select, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCreatePaciente, usePacientes } from "@/hooks/use-pacientes";
import { formatDataCurta } from "@/lib/utils";

type NovoPacienteFormState = {
  name: string;
  email: string;
  birthDate: string;
  treatmentStartDate: string;
};

function emptyFormState(): NovoPacienteFormState {
  return {
    name: "",
    email: "",
    birthDate: "",
    treatmentStartDate: "",
  };
}

export function PatientsList() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<NovoPacienteFormState>(emptyFormState());
  const birthDateInputRef = useRef<HTMLInputElement | null>(null);
  const treatmentStartDateInputRef = useRef<HTMLInputElement | null>(null);
  const { data: pacientes = [], isLoading } = usePacientes();
  const createPaciente = useCreatePaciente();

  const filtrados = pacientes.filter((p) => {
    const matchBusca =
      p.name.toLowerCase().includes(busca.toLowerCase()) ||
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

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = formState.name.trim();
    const email = formState.email.trim();
    const birthDate = formState.birthDate;
    const treatmentStartDate = formState.treatmentStartDate;

    if (!name || !email || !birthDate || !treatmentStartDate) {
      toast.error("Preencha nome, e-mail, data de nascimento e inicio do tratamento.");
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
          toast.error("Nao foi possivel cadastrar o paciente.");
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <AppSelectTrigger className="w-full sm:w-40">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </AppSelectTrigger>
          <AppSelectContent>
            <AppSelectItem value="todos">Todos</AppSelectItem>
            <AppSelectItem value="active">Ativo</AppSelectItem>
            <AppSelectItem value="inactive">Inativo</AppSelectItem>
            <AppSelectItem value="discharged">Alta</AppSelectItem>
            <AppSelectItem value="archived">Arquivado</AppSelectItem>
          </AppSelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtrados.map((p) => (
          <Link
            key={p.id}
            to="/pacientes/$id"
            params={{ id: p.id }}
            className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <img
              src={p.avatarUrl || "/images/user-empty.jpg"}
              alt={p.name}
              className="h-12 w-12 rounded-full bg-muted object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.age} anos · {p.email}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Humor medio</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {getHumorIcon(p.averageMood)}
                  <span className="font-medium text-foreground">{p.averageMood.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Registros</p>
                <p className="font-medium text-foreground mt-0.5">{p.journalCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Ultima sessao</p>
                <p className="font-medium text-foreground mt-0.5">
                  {formatDataCurta(p.lastSession)}
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
              Cadastre um novo paciente para iniciar o acompanhamento clinico.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="paciente-nome">Nome</Label>
              <AppInput
                id="paciente-nome"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ana Souza"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paciente-email">E-mail</Label>
              <AppInput
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
                <div className="relative">
                  <AppInput
                    ref={birthDateInputRef}
                    id="paciente-data-nascimento"
                    type="date"
                    value={formState.birthDate}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, birthDate: event.target.value }))
                    }
                    className="cursor-pointer pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted"
                    title="Selecionar data de nascimento"
                    onClick={() => openDatePicker(birthDateInputRef.current)}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paciente-inicio">Inicio do tratamento</Label>
                <div className="relative">
                  <AppInput
                    ref={treatmentStartDateInputRef}
                    id="paciente-inicio"
                    type="date"
                    value={formState.treatmentStartDate}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        treatmentStartDate: event.target.value,
                      }))
                    }
                    className="cursor-pointer pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted"
                    title="Selecionar data de inicio"
                    onClick={() => openDatePicker(treatmentStartDateInputRef.current)}
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </div>
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
