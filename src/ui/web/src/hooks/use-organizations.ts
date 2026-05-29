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

async function fetchOrganizations(): Promise<Organization[]> {
  const res = await apiFetch("/api/admin/organizations");
  if (!res.ok) throw new Error("Falha ao buscar organizações");
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

export function useOrganizations() {
  return useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: fetchOrganizations,
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
    mutationFn: ({ organizationId, payload }: { organizationId: string; payload: OrganizationUpdateInput }) =>
      updateOrganization(organizationId, payload),
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