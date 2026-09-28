DROP INDEX IF EXISTS public.grocery_items_household_name_key;
CREATE UNIQUE INDEX grocery_items_household_store_name_key ON public.grocery_items (household_id, store, lower(name));