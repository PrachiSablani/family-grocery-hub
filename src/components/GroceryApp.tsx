import { useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings,
  ShoppingBasket,
  Sparkles,
  Store,
  Trash2,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Household } from "@/lib/household";
import {
  UNSET_STORE,
  useGroceryItems,
  useGroceryMutations,
  useStores,
  type GroceryItem,
  type StoreColor,
  type StoreKey,
  type StoreOption,
} from "@/lib/grocery";
import { StoresDialog } from "@/components/StoresDialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function QuickAdd({
  placeholder,
  cta,
  onAdd,
  pending,
  options,
}: {
  placeholder: string;
  cta: string;
  onAdd: (raw: string, store: StoreKey) => void;
  pending: boolean;
  options: StoreOption[];
}) {
  const [raw, setRaw] = useState("");
  const [store, setStore] = useState<StoreKey>("unset");
  const value = options.some((o) => o.key === store) ? store : "unset";

  return (
    <form
      className="rounded-lg border-2 border-foreground bg-card p-3 shadow-[5px_5px_0_var(--color-sun)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!raw.trim()) return;
        onAdd(raw, value);
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
        <Select value={value} onValueChange={setStore}>
          <SelectTrigger className="h-11 flex-1 rounded-md border-2 border-foreground bg-background font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="h-11 px-5" disabled={pending}>
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

const pillStyles: Record<StoreColor, string> = {
  red: "border-costco bg-costco-soft text-costco",
  green: "border-fred bg-fred-soft text-fred",
  orange: "border-indian bg-indian-soft text-indian",
  blue: "border-blue bg-blue-soft text-blue",
  pink: "border-pink bg-pink-soft text-pink",
  purple: "border-unset bg-unset-soft text-unset",
};

function StorePill({ store }: { store: StoreOption }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase ${pillStyles[store.color]}`}>
      <Store className="size-3" />
      {store.label}
    </span>
  );
}

const storeSectionStyles: Record<StoreColor, string> = {
  red: "border-costco bg-costco-soft shadow-[5px_5px_0_var(--color-costco)]",
  green: "border-fred bg-fred-soft shadow-[5px_5px_0_var(--color-fred)]",
  orange: "border-indian bg-indian-soft shadow-[5px_5px_0_var(--color-indian)]",
  blue: "border-blue bg-blue-soft shadow-[5px_5px_0_var(--color-blue)]",
  pink: "border-pink bg-pink-soft shadow-[5px_5px_0_var(--color-pink)]",
  purple: "border-unset bg-unset-soft shadow-[5px_5px_0_var(--color-unset)]",
};

const storeHeadingStyles: Record<StoreColor, string> = {
  red: "text-costco",
  green: "text-fred",
  orange: "text-indian",
  blue: "text-blue",
  pink: "text-pink",
  purple: "text-unset",
};

export function GroceryApp({ session, household }: { session: Session; household: Household }) {
  const { data: items = [], isLoading } = useGroceryItems();
  const { addItems, setNeeded, updateItem, deleteItem } = useGroceryMutations(items);
  const { data: stores = [], options: STORES } = useStores();
  const [storesOpen, setStoresOpen] = useState(false);
  const optionFor = (key: StoreKey) => STORES.find((s) => s.key === key) ?? UNSET_STORE;

  const [tab, setTab] = useState("restock");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<"all" | StoreKey>("all");
  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editStore, setEditStore] = useState<StoreKey>("unset");
  const [deleting, setDeleting] = useState<GroceryItem | null>(null);
  const [collapsed, setCollapsed] = useState<Partial<Record<StoreKey, boolean>>>({});

  const toggleCollapsed = (key: StoreKey) =>
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));

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
    () => STORES.map((s) => ({ ...s, items: restock.filter((i) => optionFor(i.store).key === s.key) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restock, STORES],
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
    setEditStore(optionFor(item.store).key);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-20 border-b-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <div className="basket-bop flex size-10 rotate-[-3deg] items-center justify-center rounded-md border-2 border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_var(--color-foreground)]">
            <ShoppingBasket className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl leading-tight font-extrabold">Groceries Hub!</h1>
            <p className="truncate text-xs text-muted-foreground">{household.name} · {session.user.email}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Family and account menu">
                <Settings className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2 py-2">
                <p className="text-xs font-bold text-muted-foreground">Family invite code</p>
                <p className="font-display text-2xl font-extrabold tracking-[0.2em]">{household.invite_code}</p>
                <p className="text-xs text-muted-foreground">Share it so family can join {household.name}.</p>
              </div>
              <DropdownMenuItem
                onClick={() => {
                  void navigator.clipboard.writeText(household.invite_code);
                  toast.success("Invite code copied");
                }}
                className="h-11 cursor-pointer text-sm font-bold"
              >
                <Copy className="size-4" /> Copy invite code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStoresOpen(true)} className="h-11 cursor-pointer text-sm font-bold">
                <Store className="size-4" /> Manage stores
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="h-11 cursor-pointer text-sm font-bold">
                <LogOut className="size-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-14 w-full rounded-lg border-2 border-foreground bg-secondary p-1 shadow-[4px_4px_0_var(--color-foreground)]">
            <TabsTrigger value="restock" className="h-11 flex-1 rounded-md text-sm font-extrabold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Get next time {restock.length > 0 && `(${restock.length})`}
            </TabsTrigger>
            <TabsTrigger value="master" className="h-11 flex-1 rounded-md text-sm font-extrabold data-[state=active]:bg-pop data-[state=active]:text-pop-foreground">
              Master list
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restock" className="mt-4 space-y-4">
            <QuickAdd
              placeholder="Running out of…"
              cta="Add"
              pending={addItems.isPending}
              options={STORES}
              onAdd={(raw, store) => handleAdd(raw, store, true)}
            />

            {isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : restock.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-foreground bg-accent/30 px-6 py-12 text-center">
                <Sparkles className="mx-auto mb-3 size-7 text-primary" />
                <p className="font-display text-xl font-extrabold">Nothing to buy!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add what's running out and it'll show up here, grouped by store.
                </p>
              </div>
            ) : (
              grouped
                .filter((g) => g.items.length > 0)
                .map((group) => (
                  <section key={group.key}>
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(group.key)}
                      aria-expanded={!collapsed[group.key]}
                      className="mb-2 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left"
                    >
                      <h2 className={`flex items-center gap-2 font-display text-lg font-extrabold ${storeHeadingStyles[group.color]}`}>
                        <Store className="size-5" /> {group.label}
                        <span className="rounded-full bg-card px-2 py-0.5 text-xs text-foreground">{group.items.length}</span>
                      </h2>
                      <ChevronDown
                        className={`ml-auto size-5 transition-transform ${storeHeadingStyles[group.color]} ${collapsed[group.key] ? "-rotate-90" : ""}`}
                      />
                    </button>
                    <ul className={`divide-y-2 divide-border overflow-hidden rounded-lg border-2 ${storeSectionStyles[group.color]} ${collapsed[group.key] ? "hidden" : ""}`}>
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
                            className="h-11 px-4"
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
              options={STORES}
              onAdd={(raw, store) => handleAdd(raw, store, false)}
            />

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items"
                  className="h-11 rounded-md border-2 border-foreground bg-card pl-9"
                />
              </div>
              <Select
                value={storeFilter}
                onValueChange={(v) => setStoreFilter(v as "all" | StoreKey)}
              >
                <SelectTrigger className="h-11 w-[9.5rem] rounded-md border-2 border-foreground bg-card font-semibold">
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
              <div className="rounded-lg border-2 border-dashed border-foreground bg-pop/10 px-6 py-12 text-center">
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
              <ul className="divide-y-2 divide-border overflow-hidden rounded-lg border-2 border-foreground bg-card shadow-[5px_5px_0_var(--color-pop)]">
                {masterFiltered.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 p-2 pl-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base">{item.name}</p>
                      <div className="mt-1">
                        <StorePill store={optionFor(item.store)} />
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
                        className="h-11 px-4"
                        onClick={() => setNeeded.mutate({ id: item.id, needed: false })}
                      >
                        <Undo2 className="size-4" />
                        On list
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-11 px-4"
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

      <StoresDialog open={storesOpen} onOpenChange={setStoresOpen} stores={stores} />

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
