import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type Organization,
  type OrganizationInput,
  useCreateOrganization,
  useDeleteOrganization,
  useOrganizations,
  useUpdateOrganization,
} from "@/hooks/use-organizations";

export const Route = createFileRoute("/dashboard/admin")({
  component: AdminControlPage,
});

type FormMode = "create" | "edit";

type OrganizationFormState = OrganizationInput;

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function statusLabel(status: Organization["status"]) {
  return status === "archived" ? "Arquivada" : "Ativa";
}

function statusVariant(status: Organization["status"]) {
  return status === "archived" ? "outline" : "secondary";
}

function emptyFormState(): OrganizationFormState {
  return { name: "", slug: "" };
}

function AdminControlPage() {
  const { data: organizations = [], isLoading, isError } = useOrganizations();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [formState, setFormState] = useState<OrganizationFormState>(emptyFormState());

  const activeOrganizations = organizations.filter(
    (organization) => organization.status !== "archived",
  );
  const archivedOrganizations = organizations.filter(
    (organization) => organization.status === "archived",
  );

  function openCreateDialog() {
    setFormMode("create");
    setEditingOrganization(null);
    setFormState(emptyFormState());
    setFormOpen(true);
  }

  function openEditDialog(organization: Organization) {
    setFormMode("edit");
    setEditingOrganization(organization);
    setFormState({
      name: organization.name,
      slug: organization.slug,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingOrganization(null);
    setFormState(emptyFormState());
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name: formState.name.trim(),
      slug: formState.slug.trim(),
    };

    if (!payload.name || !payload.slug) {
      toast.error("Informe nome e slug da organização.");
      return;
    }

    if (formMode === "create") {
      createOrganization.mutate(payload, {
        onSuccess: () => {
          toast.success("Organização criada com sucesso.");
          closeForm();
        },
        onError: () => {
          toast.error("Não foi possível criar a organização.");
        },
      });
      return;
    }

    if (!editingOrganization) return;

    updateOrganization.mutate(
      {
        organizationId: editingOrganization.id,
        payload,
      },
      {
        onSuccess: () => {
          toast.success("Organização atualizada com sucesso.");
          closeForm();
        },
        onError: () => {
          toast.error("Não foi possível atualizar a organização.");
        },
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteOrganization.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Organização arquivada com sucesso.");
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error("Não foi possível arquivar a organização.");
      },
    });
  }

  const isSaving = createOrganization.isPending || updateOrganization.isPending;

  return (
    <AuthGuard
      requiredRole="super_admin"
      forbiddenFallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Acesso restrito</CardTitle>
              <CardDescription>
                Somente usuários com perfil super_admin podem acessar o Admin Control.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
                Voltar para o dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      }
    >
      {() => (
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AdminSidebar />

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-14 items-center border-b bg-card px-4">
                <SidebarTrigger />
                <div className="ml-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Admin Control</div>
                    <div className="text-xs text-muted-foreground">
                      Gerencie organizações da plataforma
                    </div>
                  </div>
                </div>
              </header>

              <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        Organizações
                      </h1>
                      <p className="text-sm text-muted-foreground max-w-2xl">
                        Liste, crie, edite e arquive organizações da plataforma.
                      </p>
                    </div>

                    <Button onClick={openCreateDialog} className="self-start">
                      <Plus className="h-4 w-4" />
                      Nova organização
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total</CardDescription>
                        <CardTitle className="text-3xl">{organizations.length}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Organizações cadastradas no sistema.
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Ativas</CardDescription>
                        <CardTitle className="text-3xl">{activeOrganizations.length}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Organizações disponíveis para uso.
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Arquivadas</CardDescription>
                        <CardTitle className="text-3xl">{archivedOrganizations.length}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Registros mantidos para histórico.
                      </CardContent>
                    </Card>
                  </div>

              <Card>
                <CardHeader>
                  <CardTitle>Lista de organizações</CardTitle>
                  <CardDescription>
                    Os dados são carregados diretamente da API administrativa.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                      Carregando organizações...
                    </div>
                  ) : isError ? (
                    <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-destructive">
                      Não foi possível carregar as organizações.
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                      Nenhuma organização encontrada.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Atualizada em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {organizations.map((organization) => (
                          <TableRow key={organization.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium text-foreground">
                                    {organization.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    ID: {organization.id}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{organization.slug}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(organization.status)}>
                                {statusLabel(organization.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDateTime(organization.updatedAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(organization)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteTarget(organization)}
                                  disabled={deleteOrganization.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Arquivar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
                </div>
              </main>
            </div>
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
            <DialogTitle>
              {formMode === "create" ? "Nova organização" : "Editar organização"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Crie uma nova organização com nome e slug únicos."
                : "Atualize os dados básicos da organização selecionada."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="organization-name">Nome</Label>
              <Input
                id="organization-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Clínica Aurora"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization-slug">Slug</Label>
              <Input
                id="organization-slug"
                value={formState.slug}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, slug: event.target.value }))
                }
                placeholder="clinica-aurora"
              />
              <p className="text-xs text-muted-foreground">
                Use letras minúsculas, números e hífens.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Salvando..."
                  : formMode === "create"
                    ? "Criar organização"
                    : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar organização</AlertDialogTitle>
            <AlertDialogDescription>
              A organização {deleteTarget?.name ?? "selecionada"} será marcada como arquivada. Você
              poderá restaurá-la depois pela API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrganization.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteOrganization.isPending}>
              {deleteOrganization.isPending ? "Arquivando..." : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </SidebarProvider>
      )}
    </AuthGuard>
  );
}
