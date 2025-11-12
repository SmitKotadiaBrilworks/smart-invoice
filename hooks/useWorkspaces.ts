import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Workspace, WorkspaceMember } from "@/types";

export const useWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get workspaces where user is a member
      const { data, error } = await supabase
        .from("workspace_members")
        .select(
          `
          *,
          workspace:workspaces(*)
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []).map((m: any) => m.workspace) as Workspace[];
    },
  });
};

export const useWorkspaceMembers = (workspaceId: string) => {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      // Fetch workspace members
      const { data: members, error: membersError } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [] as WorkspaceMember[];

      // Fetch user profiles for all members
      const userIds = members.map((m) => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, email, name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id -> profile
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // Merge members with their profiles
      return members.map((member) => ({
        id: member.id,
        workspace_id: member.workspace_id,
        user_id: member.user_id,
        role: member.role,
        created_at: member.created_at,
        user: profileMap.get(member.user_id)
          ? {
              id: profileMap.get(member.user_id)!.id,
              email: profileMap.get(member.user_id)!.email,
              name: profileMap.get(member.user_id)!.name || "",
            }
          : undefined,
      })) as WorkspaceMember[];
    },
    enabled: !!workspaceId,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      currency: string;
      timezone: string;
      fiscal_year: number;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: payload.name,
          currency: payload.currency,
          timezone: payload.timezone,
          fiscal_year: payload.fiscal_year,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      return workspace as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};
