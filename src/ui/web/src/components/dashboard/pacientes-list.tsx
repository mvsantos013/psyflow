import { Link } from "@tanstack/react-router";
import {
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePacientes } from "@/hooks/use-pacientes";
import { formatDataCurta } from "@/lib/utils";

export function PacientesList() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const { data: pacientes = [], isLoading } = usePacientes();

  const filtrados = pacientes.filter((p) => {
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.email.toLowerCase().includes(busca.toLowerCase());
    const matchStatus =
      filtroStatus === "todos" || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const getHumorIcon = (valor: number) => {
    if (valor >= 7)
      return <TrendingUp className="h-4 w-4 text-chart-2" />;
    if (valor <= 4)
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pacientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus pacientes e acompanhe o progresso de cada um.
          </p>
        </div>
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
                <p className="text-sm font-semibold text-foreground truncate">
                  {p.nome}
                </p>
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
                  <span className="font-medium text-foreground">
                    {p.humorMedio.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Registros</p>
                <p className="font-medium text-foreground mt-0.5">
                  {p.diarioCount}
                </p>
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
            <p className="text-sm text-muted-foreground">
              Nenhum paciente encontrado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
