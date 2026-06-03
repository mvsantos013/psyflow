import { createFileRoute } from "@tanstack/react-router";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { logout } = useAuth();
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });
  const isAdminRoute = currentPath.startsWith("/admin");

  return (
    <AuthGuard>
      {(session) => {
        const displayName = session.user.name || session.user.email || "Usuário";
        const initials = displayName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("");

        if (isAdminRoute) {
          return <Outlet />;
        }

        return (
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <DashboardSidebar />
              <div className="flex-1 flex flex-col">
                <header className="h-14 flex items-center border-b px-4 bg-card">
                  <SidebarTrigger />
                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-input hover:bg-accent"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {initials || "PF"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="hidden min-w-0 sm:block">
                            <div className="truncate text-sm font-medium text-foreground">
                              {displayName}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {session.user.email || session.user.role}
                            </div>
                          </div>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>
                          <div className="space-y-0.5">
                            <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {session.user.email || "Sem e-mail"}
                            </div>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Perfil: {session.user.role}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            logout();
                            window.location.replace("/login");
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background overflow-auto">
                  <Outlet />
                </main>
              </div>
            </div>
          </SidebarProvider>
        );
      }}
    </AuthGuard>
  );
}
