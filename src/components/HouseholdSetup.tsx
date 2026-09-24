import { useState } from "react";
import { toast } from "sonner";
import { Home, ShoppingBasket, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRefreshHousehold } from "@/lib/household";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HouseholdSetup() {
  const refresh = useRefreshHousehold();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const { error } = await supabase.rpc("create_household", { _name: name });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Family created!");
    refresh();
  }

  async function join() {
    if (!code.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("join_household", { _code: code });
    setBusy(false);
    if (error) return toast.error(error.message.includes("Invalid") ? "That invite code doesn't match any family." : error.message);
    toast.success("You joined the family!");
    refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="basket-bop flex size-12 rotate-[-3deg] items-center justify-center rounded-md border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_var(--color-foreground)]">
            <ShoppingBasket className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Welcome to Groceries Hub!</h1>
            <p className="text-sm text-muted-foreground">Start a family list or join one.</p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border-2 border-foreground bg-card p-4 shadow-[5px_5px_0_var(--color-sun)]">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
            <UserPlus className="size-5" /> Join your family
          </h2>
          <p className="text-sm text-muted-foreground">Ask a family member for the 6-letter invite code.</p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3"
            maxLength={6}
            className="h-12 text-center font-display text-xl tracking-[0.3em] uppercase"
          />
          <Button className="h-12 w-full text-base" disabled={busy || code.trim().length < 6} onClick={join}>
            Join family
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border-2 border-foreground bg-card p-4 shadow-[5px_5px_0_var(--color-pop)]">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
            <Home className="size-5" /> Start a new family
          </h2>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Family name, e.g. The Sharmas"
            className="h-12 text-base"
          />
          <Button variant="outline" className="h-12 w-full text-base" disabled={busy} onClick={create}>
            Create family
          </Button>
        </div>

        <button type="button" onClick={signOut} className="w-full text-center text-sm font-bold text-muted-foreground underline">
          Log out
        </button>
      </div>
    </div>
  );
}
