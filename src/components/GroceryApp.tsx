import { useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  Check,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShoppingBasket,
  Trash2,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  STORES,
  storeLabel,
  useGroceryItems,
  useGroceryMutations,
  type GroceryItem,
  type StoreKey,
} from "@/lib/grocery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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

function QuickAdd({
  placeholder,
  cta,
  onAdd,
  pending,
}: {
  placeholder: string;
  cta: string;
  onAdd: (raw: string, store: StoreKey) => void;
  pending: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [store, setStore] = useState<StoreKey>("unset");

  return (
    <form
      className="rounded-2xl border border-border bg-card p-3 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!raw.trim()) return;
        onAdd(raw, store);
        setRaw("");
      }}
    >
      <Input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={placeholder}
        className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
      />
      <div className="mt-2 flex gap-2">
        <Select value={store} onValueChange={(v) => setStore(v as StoreKey)}>
          <SelectTrigger className="h-11 flex-1 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STORES.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="h-11 rounded-xl px-5" disabled={pending}>
          <Plus className="size-4" />
          {cta}
        </Button>
      </div>
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        Add several at once, separated by commas: milk, eggs, bread
      </p>
    </form>
  );
}

function StorePill({ store }: { store: StoreKey }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium tracking-wide text-secondary-foreground uppercase">
      {storeLabel(store)}
    </span>
  );
}

export function GroceryApp({ session }: { session: Session }) {
  const { data: items = [], isLoading } = useGroceryItems();
  const { addItems, setNeeded, updateItem, deleteItem } = useGroceryMutations(items);

  const [tab, setTab] = useState("restock");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<"all" | StoreKey>("all");
  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editStore, setEditStore] = useState<StoreKey>("unset");
  const [deleting, setDeleting] = useState<GroceryItem | null>(null);

  const restock = useMemo(() => items.filter((i) => i.needed), [items]);

  const masterFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (storeFilter === "all" || i.store === storeFilter) &&
        (!q || i.name.toLowerCase().includes(q)),
    );
  }, [items, search, storeFilter]);

  const grouped = useMemo(
    () => STORES.map((s) => ({ ...s, items: restock.filter((i) => i.store === s.key) })),
    [restock],
  );

  function handleAdd(raw: string, store: StoreKey, needed: boolean) {
    addItems.mutate(
      { raw, store, needed },
      {
        onSuccess: (res) => {
          const total = res.added + res.updated;
          toast.success(
            needed
              ? `${total} item${total === 1 ? "" : "s"} added to Get next time`
              : `${total} item${total === 1 ? "" : "s"} saved to the master list`,
          );
        },
        onError: () => toast.error("Could not save. Please try again."),
      },
    );
  }

  function openEdit(item: GroceryItem) {
    setEditing(item);
    setEditName(item.name);
    setEditStore(item.store);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShoppingBasket className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg leading-tight font-semibold">Family Groceries</h1>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-11" onClick={signOut}>
            <LogOut className="size-5" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-12 w-full rounded-xl p-1">
            <TabsTrigger value="restock" className="h-10 flex-1 rounded-lg text-sm">
              Get next time {restock.length > 0 && `(${restock.length})`}
            </TabsTrigger>
            <TabsTrigger value="master" className="h-10 flex-1 rounded-lg text-sm">
              Master list
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restock" className="mt-4 space-y-4">
            <QuickAdd
              placeholder="Running out of…"
              cta="Add"
              pending={addItems.isPending}
              onAdd={(raw, store) => handleAdd(raw, store, true)}
            />

            {isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : restock.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                <p className="font-display text-lg font-semibold">Nothing to buy</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add what's running out and it'll show up here, grouped by store.
                </p>
              </div>
            ) : (
              grouped
                .filter((g) => g.items.length > 0)
                .map((group) => (
                  <section key={group.key}>
                    <h2 className="mb-2 px-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      {group.label} · {group.items.length}
                    </h2>
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                      {group.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 p-2 pl-4">
                          <span className="flex-1 truncate text-base">{item.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit {item.name}</span>
                          </Button>
                          <Button
                            className="h-11 rounded-xl px-4"
                            onClick={() =>
                              setNeeded.mutate(
                                { id: item.id, needed: false },
                                {
                                  onSuccess: () =>
                                    toast.success(`${item.name} bought — kept in master list`),
                                },
                              )
                            }
                          >
                            <Check className="size-4" />
                            Bought
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
            )}
          </TabsContent>

          <TabsContent value="master" className="mt-4 space-y-4">
            <QuickAdd
              placeholder="Add an item we buy…"
              cta="Add"
              pending={addItems.isPending}
              onAdd={(raw, store) => handleAdd(raw, store, false)}
            />

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items"
                  className="h-11 rounded-xl pl-9"
                />
              </div>
              <Select
                value={storeFilter}
                onValueChange={(v) => setStoreFilter(v as "all" | StoreKey)}
              >
                <SelectTrigger className="h-11 w-[9.5rem] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stores</SelectItem>
                  {STORES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : masterFiltered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                <p className="font-display text-lg font-semibold">
                  {items.length === 0 ? "Your master list is empty" : "No matches"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {items.length === 0
                    ? "Add the groceries your family buys regularly."
                    : "Try a different search or store filter."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {masterFiltered.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 p-2 pl-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base">{item.name}</p>
                      <div className="mt-1">
                        <StorePill store={item.store} />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit {item.name}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 text-destructive"
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete {item.name}</span>
                    </Button>
                    {item.needed ? (
                      <Button
                        variant="secondary"
                        className="h-11 rounded-xl px-4"
                        onClick={() => setNeeded.mutate({ id: item.id, needed: false })}
                      >
                        <Undo2 className="size-4" />
                        On list
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl px-4"
                        onClick={() =>
                          setNeeded.mutate(
                            { id: item.id, needed: true },
                            {
                              onSuccess: () =>
                                toast.success(`${item.name} added to Get next time`),
                            },
                          )
                        }
                      >
                        Running out
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Edit item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-store">Store</Label>
              <Select value={editStore} onValueChange={(v) => setEditStore(v as StoreKey)}>
                <SelectTrigger id="edit-store" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="h-12 w-full text-base"
              disabled={!editName.trim() || updateItem.isPending}
              onClick={() => {
                if (!editing) return;
                updateItem.mutate(
                  { id: editing.id, name: editName, store: editStore },
                  {
                    onSuccess: () => {
                      setEditing(null);
                      toast.success("Item updated");
                    },
                    onError: () => toast.error("That item name already exists."),
                  },
                );
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete {deleting?.name} permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the master list for everyone in the family.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleting) return;
                deleteItem.mutate(deleting.id, {
                  onSuccess: () => toast.success("Item deleted"),
                });
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
