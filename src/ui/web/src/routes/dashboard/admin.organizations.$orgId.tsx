import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  type OrganizationUser,
  useAssignOrganizationUser,
  useOrganization,
  useOrganizationUsers,
  useRemoveOrganizationUser,
  useUpdateOrganizationUserRole,
} from "@/hooks/use-organizations";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useLoadingCrossfade } from "@/hooks/use-loading-crossfade";

export const Route = createFileRoute("/dashboard/admin/organizations/$orgId")({
  component: OrganizationDetailsPage,
});

type AssignFormState = {
  username: string;
  role: "admin" | "therapist" | "assistant";
};

const emptyAssignForm: AssignFormState = {
  username: "",
  role: "therapist",
};

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "therapist") return "Terapeuta";
  if (role === "assistant") return "Assistente";
  return role;
}

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "admin") return "default";
  if (role === "therapist") return "secondary";
  return "outline";
}

function membershipLabel(user: OrganizationUser) {
  return user.membershipStatus === "inactive" ? "Removido" : "Ativo";
}

function statusLabel(user: OrganizationUser) {
  if (user.status === "disabled") return "Desabilitado";
  return membershipLabel(user);
}

function OrganizationDetailsPage() {
  const { orgId } = Route.useParams();
  const {
    data: organization,
    isLoading: loadingOrganization,
    isError: errorOrganization,
  } = useOrganization(orgId);
  const {
    data: users = [],
    isLoading: loadingUsers,
    isError: errorUsers,
  } = useOrganizationUsers(orgId);

  const assignUser = useAssignOrganizationUser();
  const updateRole = useUpdateOrganizationUserRole();
  const removeUser = useRemoveOrganizationUser();

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignFormState>(emptyAssignForm);
  const [roleDialogUser, setRoleDialogUser] = useState<OrganizationUser | null>(null);
  const [roleSelection, setRoleSelection] = useState<"admin" | "therapist" | "assistant">(
    "therapist",
  );
  const [removeTarget, setRemoveTarget] = useState<OrganizationUser | null>(null);

  const activeUsers = useMemo(
    () => users.filter((user) => user.membershipStatus !== "inactive" && user.orgId === orgId),
    [users, orgId],
  );
  const loadingScreen = loadingOrganization || loadingUsers;
  const { showSkeleton, contentVisible, durationMs } = useLoadingCrossfade(loadingScreen, {
    durationMs: 150,
  });

  function resetAssignForm() {
    setAssignForm(emptyAssignForm);
  }

  function onAssignSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = assignForm.username.trim();
    if (!username) {
      toast.error("Informe o username ou e-mail do usuário.");
      return;
    }

    assignUser.mutate(
      {
        organizationId: orgId,
        payload: {
          username,
          role: assignForm.role,
        },
      },
      {
        onSuccess: () => {
          toast.success("Usuário associado com sucesso.");
          setAssignOpen(false);
          resetAssignForm();
        },
        onError: () => {
          toast.error("Não foi possível associar o usuário.");
        },
      },
    );
  }

  function onConfirmRoleUpdate() {
    if (!roleDialogUser) return;

    updateRole.mutate(
      {
        organizationId: orgId,
        username: roleDialogUser.username,
        payload: {
          role: roleSelection,
        },
      },
      {
        onSuccess: () => {
          toast.success("Papel do usuário atualizado.");
          setRoleDialogUser(null);
        },
        onError: () => {
          toast.error("Não foi possível atualizar o papel do usuário.");
        },
      },
    );
  }

  function onConfirmRemove() {
    if (!removeTarget) return;

    removeUser.mutate(
      {
        organizationId: orgId,
        username: removeTarget.username,
      },
      {
        onSuccess: () => {
          toast.success("Usuário removido da organização.");
          setRemoveTarget(null);
        },
        onError: () => {
          toast.error("Não foi possível remover o usuário da organização.");
        },
      },
    );
  }

  return (
    <AuthGuard>
      {() => (
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AdminSidebar />

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-14 items-center border-b bg-card px-4">
                <SidebarTrigger />
                <div className="ml-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Detalhes da organização
                    </div>
                    <div className="text-xs text-muted-foreground">Usuários e papéis</div>
                  </div>
                </div>
              </header>

              <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <Link
                        to="/admin"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para organizações
                      </Link>
                      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        {organization?.name ?? "Organização"}
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Gerencie os usuários associados a esta organização.
                      </p>
                    </div>

                    <Button
                      onClick={() => setAssignOpen(true)}
                      className="self-start"
                      disabled={assignUser.isPending || loadingOrganization || errorOrganization}
                    >
                      <UserPlus className="h-4 w-4" />
                      Associar usuário
                    </Button>
                  </div>

                  <div className="relative min-h-40">
                    <div
                      className={`absolute inset-0 z-10 grid gap-4 transition-opacity duration-300 md:grid-cols-3 ${
                        showSkeleton ? "opacity-100" : "pointer-events-none opacity-0"
                      }`}
                    >
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader className="pb-2">
                            <div className="h-4 w-20 rounded bg-muted" />
                            <div className="mt-2 h-6 w-28 rounded bg-muted" />
                          </CardHeader>
                        </Card>
                      ))}
                    </div>

                    <div
                      className="grid gap-4 md:grid-cols-3"
                      style={{
                        opacity: contentVisible ? 1 : 0,
                        transition: `opacity ${durationMs}ms ease`,
                      }}
                    >
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Slug</CardDescription>
                          <CardTitle className="text-lg">{organization?.slug ?? "-"}</CardTitle>
                        </CardHeader>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Status</CardDescription>
                          <CardTitle className="text-lg">
                            {organization?.status === "archived" ? "Arquivada" : "Ativa"}
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Usuários ativos</CardDescription>
                          <CardTitle className="text-3xl">{activeUsers.length}</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Usuários da organização</CardTitle>
                      <CardDescription>
                        Associe usuários existentes, altere papéis e remova vínculos com a
                        organização.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative min-h-48">
                        <div
                          className={`absolute inset-0 z-10 transition-opacity duration-300 ${
                            showSkeleton ? "opacity-100" : "pointer-events-none opacity-0"
                          }`}
                        >
                          <div className="space-y-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div
                                key={i}
                                className="h-11 rounded-md border bg-muted/40 animate-pulse"
                              />
                            ))}
                          </div>
                        </div>

                        <div
                          style={{
                            opacity: contentVisible ? 1 : 0,
                            transition: `opacity ${durationMs}ms ease`,
                          }}
                        >
                          {errorUsers ? (
                            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-destructive">
                              Não foi possível carregar os usuários.
                            </div>
                          ) : users.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                              Nenhum usuário associado a esta organização.
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Usuário</TableHead>
                                  <TableHead>Papel</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {users.map((user) => (
                                  <TableRow key={user.username}>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium text-foreground">
                                          {user.email || user.username}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {user.username}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={roleBadgeVariant(user.role)}>
                                        {roleLabel(user.role)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          user.status === "disabled" ? "outline" : "secondary"
                                        }
                                      >
                                        {statusLabel(user)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="inline-flex items-center gap-2">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8"
                                          aria-label={`Alterar papel de ${user.email || user.username}`}
                                          title="Alterar papel"
                                          onClick={() => {
                                            setRoleDialogUser(user);
                                            setRoleSelection(
                                              user.role === "admin" || user.role === "assistant"
                                                ? user.role
                                                : "therapist",
                                            );
                                          }}
                                          disabled={updateRole.isPending}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8 text-destructive hover:text-destructive"
                                          aria-label={`Remover ${user.email || user.username} da organização`}
                                          title="Remover usuário"
                                          onClick={() => setRemoveTarget(user)}
                                          disabled={removeUser.isPending}
                                        >
                                          <UserMinus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </main>
            </div>
          </div>

          <Dialog
            open={assignOpen}
            onOpenChange={(open) => {
              if (!open) {
                setAssignOpen(false);
                resetAssignForm();
              } else {
                setAssignOpen(true);
              }
            }}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Associar usuário</DialogTitle>
                <DialogDescription>
                  Informe o username (ou e-mail, se for o username do Cognito) e o papel global do
                  usuário.
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={onAssignSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="assign-username">Username</Label>
                  <AppInput
                    id="assign-username"
                    value={assignForm.username}
                    onChange={(event) =>
                      setAssignForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    placeholder="usuario@dominio.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assign-role">Papel</Label>
                  <Select
                    value={assignForm.role}
                    onValueChange={(value) =>
                      setAssignForm((current) => ({
                        ...current,
                        role: value as AssignFormState["role"],
                      }))
                    }
                  >
                    <AppSelectTrigger id="assign-role">
                      <SelectValue placeholder="Selecione um papel" />
                    </AppSelectTrigger>
                    <AppSelectContent>
                      <AppSelectItem value="admin">Admin</AppSelectItem>
                      <AppSelectItem value="therapist">Terapeuta</AppSelectItem>
                      <AppSelectItem value="assistant">Assistente</AppSelectItem>
                    </AppSelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAssignOpen(false);
                      resetAssignForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={assignUser.isPending}>
                    {assignUser.isPending ? "Associando..." : "Associar usuário"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(roleDialogUser)}
            onOpenChange={(open) => {
              if (!open) setRoleDialogUser(null);
            }}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Atualizar papel</DialogTitle>
                <DialogDescription>
                  Defina o novo papel global para{" "}
                  {roleDialogUser?.email || roleDialogUser?.username}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="user-role">Papel</Label>
                <Select
                  value={roleSelection}
                  onValueChange={(value) => setRoleSelection(value as typeof roleSelection)}
                >
                  <AppSelectTrigger id="user-role">
                    <SelectValue placeholder="Selecione um papel" />
                  </AppSelectTrigger>
                  <AppSelectContent>
                    <AppSelectItem value="admin">Admin</AppSelectItem>
                    <AppSelectItem value="therapist">Terapeuta</AppSelectItem>
                    <AppSelectItem value="assistant">Assistente</AppSelectItem>
                  </AppSelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRoleDialogUser(null)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={onConfirmRoleUpdate} disabled={updateRole.isPending}>
                  {updateRole.isPending ? "Salvando..." : "Salvar papel"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={Boolean(removeTarget)}
            onOpenChange={(open) => !open && setRemoveTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover usuário da organização?</AlertDialogTitle>
                <AlertDialogDescription>
                  O usuário continuará existindo, mas ficará sem vínculo com esta organização.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirmRemove} disabled={removeUser.isPending}>
                  {removeUser.isPending ? "Removendo..." : "Remover usuário"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SidebarProvider>
      )}
    </AuthGuard>
  );
}
