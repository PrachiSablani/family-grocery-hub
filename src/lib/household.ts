import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Household = { id: string; name: string; invite_code: string };

export const HOUSEHOLD_KEY = ["my_household"];

export function useMyHousehold(userId: string) {
  return useQuery({
    queryKey: [...HOUSEHOLD_KEY, userId],
    queryFn: async (): Promise<Household | null> => {
      const { data: m, error } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!m) return null;
      const { data: h, error: e2 } = await supabase
        .from("households")
        .select("id, name, invite_code")
        .eq("id", m.household_id)
        .single();
      if (e2) throw e2;
      return h as Household;
    },
  });
}

export function useRefreshHousehold() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: HOUSEHOLD_KEY });
    qc.invalidateQueries({ queryKey: ["grocery_items"] });
  };
}
