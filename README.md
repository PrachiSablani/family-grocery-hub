# Family Grocery Hub
A shared family grocery list web app:

CORE CONCEPT — TWO LISTS:
1. Master list: a permanent list of every grocery item the family buys. Items are NEVER removed from this list just because they're out of stock.
2. Get next time (restock list): a temporary list of items currently running out, to buy on the next grocery run.

HOW IT WORKS:
- "Running out of potatoes" → adds potatoes to the restock list. If potatoes aren't in the master list yet, add them there too.
- "Bought the potatoes" → removes potatoes from the restock list, but KEEPS them in the master list.
- Support adding multiple items at once (e.g. comma-separated like "milk, eggs, bread").
- Tapping "bought" on a restock item clears it from restock but keeps it in master.
- From the master list, any item can be marked "running out" to push it to restock.
- Items can be renamed or permanently deleted from the master list.

STORE CATEGORIZATION:
- Every item has a preferred store: Costco, Fred Meyer, or Indian store (plus "Store not set" for unassigned items).
- When adding an item, allow picking which store it's usually bought from.
- The restock list must be GROUPED BY STORE: separate sections for Costco, Fred Meyer, Indian store, and "Store not set".
- Store can be changed when editing an item.
- Master list can be searched by name and filtered by store.

SHARING & BACKEND:
- Multiple family members must see and edit the SAME shared list in real time. Enable Lovable Cloud backend / shared database tables so all users access the shared family list (not isolated per-user copies).
- Simple authentication for non-technical family members (magic link / email auth).

DESIGN & UX:
- Clean, mobile-first layout with generous touch targets.
- Two primary tabs: "Master list" and "Get next time".
- Quick-add input at top of each view.
- Start with an empty list (no sample data).
