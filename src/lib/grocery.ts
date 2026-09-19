import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StoreKey = "costco" | "fred_meyer" | "indian_store" | "unset";

export type GroceryItem = {
  id: string;
  name: string;
  store: StoreKey;
  needed: boolean;
  needed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const STORES: { key: StoreKey; label: string }[] = [
  { key: "costco", label: "Costco" },
  { key: "fred_meyer", label: "Fred Meyer" },
  { key: "indian_store", label: "Indian store" },
  { key: "unset", label: "Store not set" },
];

export const storeLabel = (key: StoreKey) =>
  STORES.find((s) => s.key === key)?.label ?? "Store not set";

export function parseNames(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

const QUERY_KEY = ["grocery_items"];

export function useGroceryItems() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<GroceryItem[]> => {
      const { data, error } = await supabase
        .from("grocery_items")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GroceryItem[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("grocery_items_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_items" },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useGroceryMutations(items: GroceryItem[]) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const findByName = (name: string) =>
    items.find((i) => i.name.toLowerCase() === name.toLowerCase());

  const addItems = useMutation({
    mutationFn: async ({
      raw,
      store,
      needed,
    }: {
      raw: string;
      store: StoreKey;
      needed: boolean;
    }) => {
      const names = parseNames(raw);
      if (names.length === 0) return { added: 0, updated: 0 };
      let added = 0;
      let updated = 0;

      for (const name of names) {
        const existing = findByName(name);
        if (existing) {
          const patch: Record<string, unknown> = {};
          if (needed && !existing.needed) {
            patch['needed'] = true;
            patch['needed_at'] = new Date().toISOString();
          }
          if (store !== "unset" && existing.store !== store) patch['store'] = store;
          if (Object.keys(patch).length > 0) {
            const { error } = await supabase
              .from("grocery_items")
              .update(patch)
              .eq("id", existing.id);
            if (error) throw error;
            updated += 1;
          }
        } else {
          const { error } = await supabase.from("grocery_items").insert({
            name,
            store,
            needed,
            needed_at: needed ? new Date().toISOString() : null,
          });
          if (error) throw error;
          added += 1;
        }
      }
      return { added, updated };
    },
    onSuccess: invalidate,
  });

  const setNeeded = useMutation({
    mutationFn: async ({ id, needed }: { id: string; needed: boolean }) => {
      const { error } = await supabase
        .from("grocery_items")
        .update({ needed, needed_at: needed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, name, store }: { id: string; name: string; store: StoreKey }) => {
      const { error } = await supabase
        .from("grocery_items")
        .update({ name: name.trim(), store })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grocery_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addItems, setNeeded, updateItem, deleteItem };
}
