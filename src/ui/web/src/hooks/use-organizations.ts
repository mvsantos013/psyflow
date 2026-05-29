import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived" | string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
};

export type OrganizationInput = {
  name: string;
  slug: string;
};

export type OrganizationUpdateInput = Partial<OrganizationInput>;

export type OrganizationUser = {
  username: string;
  userId: string;
  email: string;
  orgId: string | null;
  role: "admin" | "therapist" | "assistant" | string;
  status: "active" | "disabled" | string;
  userStatus: string;
  createdAt: string;
  updatedAt: string;
  membershipStatus?: "active" | "inactive" | string;
};

export type AssignOrganizationUserInput = {
  username: string;
  role: "admin" | "therapist" | "assistant";
};

export type UpdateOrganizationUserRoleInput = {
  role: "admin" | "therapist" | "assistant";
};

async function fetchOrganizations(): Promise<Organization[]> {
  const res = await apiFetch("/api/admin/organizations");
  if (!res.ok) throw new Error("Falha ao buscar organizações");
  return res.json();
}

async function fetchOrganizationById(organizationId: string): Promise<Organization> {
  const res = await apiFetch(`/api/admin/organizations/${organizationId}`);
  if (!res.ok) throw new Error("Falha ao buscar organização");
  return res.json();
}

async function fetchOrganizationUsers(organizationId: string): Promise<OrganizationUser[]> {
  const res = await apiFetch(`/api/admin/organizations/${organizationId}/users`);
  if (!res.ok) throw new Error("Falha ao buscar usuários da organização");
  return res.json();
}

async function createOrganization(payload: OrganizationInput): Promise<Organization> {
  const res = await apiFetch("/api/admin/organizations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao criar organização");
  return res.json();
}

async function updateOrganization(
  organizationId: string,
  payload: OrganizationUpdateInput,
): Promise<Organization> {
  const res = await apiFetch(`/api/admin/organizations/${organizationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao atualizar organização");
  return res.json();
}

async function deleteOrganization(organizationId: string): Promise<Organization> {
  const res = await apiFetch(`/api/admin/organizations/${organizationId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Falha ao excluir organização");
  return res.json();
}

async function assignOrganizationUser(
  organizationId: string,
  payload: AssignOrganizationUserInput,
): Promise<OrganizationUser> {
  const res = await apiFetch(`/api/admin/organizations/${organizationId}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Falha ao associar usuário à organização");
  return res.json();
}

async function updateOrganizationUserRole(
  organizationId: string,
  username: string,
  payload: UpdateOrganizationUserRoleInput,
): Promise<OrganizationUser> {
  const res = await apiFetch(
    `/api/admin/organizations/${organizationId}/users/${encodeURIComponent(username)}/role`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw new Error("Falha ao atualizar o papel do usuário");
  return res.json();
}

async function removeOrganizationUser(
  organizationId: string,
  username: string,
): Promise<OrganizationUser> {
  const res = await apiFetch(
    `/api/admin/organizations/${organizationId}/users/${encodeURIComponent(username)}`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok) throw new Error("Falha ao remover usuário da organização");
  return res.json();
}

export function useOrganizations() {
  return useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: fetchOrganizations,
  });
}

export function useOrganization(organizationId: string) {
  return useQuery({
    queryKey: ["admin", "organizations", organizationId],
    queryFn: () => fetchOrganizationById(organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useOrganizationUsers(organizationId: string) {
  return useQuery({
    queryKey: ["admin", "organizations", organizationId, "users"],
    queryFn: () => fetchOrganizationUsers(organizationId),
    enabled: Boolean(organizationId),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      payload,
    }: {
      organizationId: string;
      payload: OrganizationUpdateInput;
    }) => updateOrganization(organizationId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrganization,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
    },
  });
}

export function useAssignOrganizationUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      payload,
    }: {
      organizationId: string;
      payload: AssignOrganizationUserInput;
    }) => assignOrganizationUser(organizationId, payload),
    onSuccess: async (_, { organizationId }) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "organizations", organizationId, "users"],
      });
    },
  });
}

export function useUpdateOrganizationUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      username,
      payload,
    }: {
      organizationId: string;
      username: string;
      payload: UpdateOrganizationUserRoleInput;
    }) => updateOrganizationUserRole(organizationId, username, payload),
    onSuccess: async (_, { organizationId }) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "organizations", organizationId, "users"],
      });
    },
  });
}

export function useRemoveOrganizationUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ organizationId, username }: { organizationId: string; username: string }) =>
      removeOrganizationUser(organizationId, username),
    onSuccess: async (_, { organizationId }) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "organizations", organizationId, "users"],
      });
    },
  });
}
