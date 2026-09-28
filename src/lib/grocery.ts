import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** A store id (uuid) from household_stores, or "unset". */
export type StoreKey = string;

export type GroceryItem = {
  id: string;
  name: string;
  store: StoreKey;
  needed: boolean;
  needed_at: string | null;
  quantity: string;
  created_at: string;
  updated_at: string;
};

export type StoreColor = "red" | "green" | "orange" | "blue" | "pink" | "purple";
export const STORE_COLORS: StoreColor[] = ["red", "green", "orange", "blue", "pink", "purple"];

export type HouseholdStore = { id: string; name: string; color: StoreColor; sort_order: number };
export type StoreOption = { key: StoreKey; label: string; color: StoreColor };

export const UNSET_STORE: StoreOption = { key: "unset", label: "Store not set", color: "purple" };

const STORES_KEY = ["household_stores"];

export function useStores() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: STORES_KEY,
    queryFn: async (): Promise<HouseholdStore[]> => {
      const { data, error } = await supabase
        .from("household_stores")
        .select("id, name, color, sort_order")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as HouseholdStore[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("household_stores_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "household_stores" }, () => {
        queryClient.invalidateQueries({ queryKey: STORES_KEY });
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const options: StoreOption[] = [
    ...(query.data ?? []).map((s) => ({ key: s.id, label: s.name, color: s.color })),
    UNSET_STORE,
  ];
  return { ...query, options };
}

export function useStoreMutations(stores: HouseholdStore[]) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: STORES_KEY });
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };
  const addStore = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: StoreColor }) => {
      const sort = Math.max(0, ...stores.map((s) => s.sort_order)) + 1;
      const { error } = await supabase
        .from("household_stores")
        .insert({ name: name.trim(), color, sort_order: sort });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const updateStore = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: StoreColor }) => {
      const { error } = await supabase
        .from("household_stores")
        .update({ name: name.trim(), color })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const deleteStore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("household_stores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { addStore, updateStore, deleteStore };
}

const UNITS =
  "lbs?|pounds?|oz|ounces?|kg|kgs|g|grams?|gal|gallons?|l|liters?|litres?|ml|qt|quarts?|pt|pints?|dozen|doz|packs?|pkgs?|packages?|bags?|boxes|box|cans?|bottles?|jars?|bunch(?:es)?|heads?|loaf|loaves|cartons?|cups?|pcs?|pieces?|x";
const QTY_RE = new RegExp(`^((?:\\d+(?:[./]\\d+)?|a|an|one|two|three|four|five|six)\\s*(?:(?:${UNITS})\\b\\.?)?)\\s*(?:of\\s+)?(.+)$`, "i");

const titleCase = (s: string) =>
  s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

/** "2 avocados" -> { name: "Avocados", quantity: "2" } */
export function parseEntry(part: string): { name: string; quantity: string } {
  const cleaned = part.trim().replace(/\s+/g, " ");
  const m = cleaned.match(QTY_RE);
  const qty = m?.[1]?.trim() ?? "";
  const rest = m?.[2] ?? "";
  const separated = /\s/.test(cleaned.charAt(qty.length)) || /[a-z.]$/i.test(qty);
  if (qty && rest && separated && (/\d/.test(qty) || /\s/.test(qty))) {
    return { name: titleCase(rest), quantity: qty.replace(/\s*x$/i, "").toLowerCase() };
  }
  return { name: titleCase(cleaned), quantity: "" };
}

export function parseEntries(raw: string): { name: string; quantity: string }[] {
  const seen = new Set<string>();
  const out: { name: string; quantity: string }[] = [];
  for (const part of raw.split(/[,\n]/)) {
    if (!part.trim()) continue;
    const e = parseEntry(part);
    if (!e.name) continue;
    const key = e.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export function parseNames(raw: string): string[] {
  return parseEntries(raw).map((e) => e.name);
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

  // Items are unique per (store, name). With no store picked, reuse any existing item by that name.
  const findByName = (name: string, store: StoreKey) => {
    const same = items.filter((i) => i.name.toLowerCase() === name.toLowerCase());
    if (store === "unset") return same.find((i) => i.needed) ?? same[0];
    return same.find((i) => i.store === store) ?? same.find((i) => i.store === "unset");
  };

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
      const entries = parseEntries(raw);
      if (entries.length === 0) return { added: 0, updated: 0 };
      let added = 0;
      let updated = 0;

      for (const { name, quantity } of entries) {
        const existing = findByName(name, store);
        if (existing) {
          const patch: { needed?: boolean; needed_at?: string | null; store?: StoreKey; quantity?: string } = {};
          if (quantity && existing.quantity !== quantity) patch.quantity = quantity;
          if (needed && !existing.needed) {
            patch.needed = true;
            patch.needed_at = new Date().toISOString();
          }
          if (store !== "unset" && existing.store !== store) patch.store = store;
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
            quantity,
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
    mutationFn: async ({ id, name, store, quantity }: { id: string; name: string; store: StoreKey; quantity?: string }) => {
      const { error } = await supabase
        .from("grocery_items")
        .update({ name: name.trim(), store, ...(quantity !== undefined ? { quantity: quantity.trim() } : {}) })
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
