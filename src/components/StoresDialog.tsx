import { useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Store, Trash2 } from "lucide-react";
import {
  STORE_COLORS,
  useStoreMutations,
  type HouseholdStore,
  type StoreColor,
} from "@/lib/grocery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const colorSwatch: Record<StoreColor, string> = {
  red: "bg-costco",
  green: "bg-fred",
  orange: "bg-indian",
  blue: "bg-blue",
  pink: "bg-pink",
  purple: "bg-unset",
};

function ColorPicker({ value, onChange }: { value: StoreColor; onChange: (c: StoreColor) => void }) {
  return (
    <div className="flex gap-1.5">
      {STORE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`${c} color`}
          onClick={() => onChange(c)}
          className={`flex size-8 items-center justify-center rounded-full border-2 border-foreground ${colorSwatch[c]}`}
        >
          {value === c && <Check className="size-4 text-primary-foreground" />}
        </button>
      ))}
    </div>
  );
}

function StoreRow({ store, all }: { store: HouseholdStore; all: HouseholdStore[] }) {
  const { updateStore, deleteStore } = useStoreMutations(all);
  const [name, setName] = useState(store.name);
  const save = (color: StoreColor = store.color) => {
    if (!name.trim()) return setName(store.name);
    if (name.trim() === store.name && color === store.color) return;
    updateStore.mutate(
      { id: store.id, name, color },
      { onError: () => toast.error("A store with that name already exists.") },
    );
  };
  return (
    <li className="space-y-2 rounded-lg border-2 border-foreground bg-card p-3">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => save()}
          className="h-11 text-base"
          aria-label="Store name"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-destructive"
          onClick={() => {
            if (!confirm(`Delete ${store.name}? Its items move to "Store not set".`)) return;
            deleteStore.mutate(store.id, { onSuccess: () => toast.success(`${store.name} removed`) });
          }}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete {store.name}</span>
        </Button>
      </div>
      <ColorPicker value={store.color} onChange={(c) => save(c)} />
    </li>
  );
}

export function StoresDialog({
  open,
  onOpenChange,
  stores,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stores: HouseholdStore[];
}) {
  const { addStore } = useStoreMutations(stores);
  const [name, setName] = useState("");
  const [color, setColor] = useState<StoreColor>("blue");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Store className="size-5" /> Your stores
          </DialogTitle>
          <DialogDescription>Add the stores your family shops at. Everyone in the family sees them.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-2 rounded-lg border-2 border-foreground bg-secondary p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addStore.mutate(
              { name, color },
              {
                onSuccess: () => {
                  toast.success(`${name.trim()} added`);
                  setName("");
                },
                onError: () => toast.error("A store with that name already exists."),
              },
            );
          }}
        >
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Trader Joe's"
              className="h-11 bg-card text-base"
            />
            <Button type="submit" className="h-11 px-4" disabled={addStore.isPending}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          <ColorPicker value={color} onChange={setColor} />
        </form>

        {stores.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No stores yet — add your first one above.</p>
        ) : (
          <ul className="space-y-2">
            {stores.map((s) => (
              <StoreRow key={s.id} store={s} all={stores} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
