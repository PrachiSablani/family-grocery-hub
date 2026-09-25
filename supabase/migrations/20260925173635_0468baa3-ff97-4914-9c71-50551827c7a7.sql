CREATE TABLE public.household_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL DEFAULT public.my_household_id() REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_stores TO authenticated;
GRANT ALL ON public.household_stores TO service_role;
ALTER TABLE public.household_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view stores" ON public.household_stores FOR SELECT TO authenticated USING (household_id = public.my_household_id());
CREATE POLICY "Members add stores" ON public.household_stores FOR INSERT TO authenticated WITH CHECK (household_id = public.my_household_id());
CREATE POLICY "Members update stores" ON public.household_stores FOR UPDATE TO authenticated USING (household_id = public.my_household_id()) WITH CHECK (household_id = public.my_household_id());
CREATE POLICY "Members delete stores" ON public.household_stores FOR DELETE TO authenticated USING (household_id = public.my_household_id());
CREATE UNIQUE INDEX household_stores_name_uniq ON public.household_stores (household_id, lower(name));

DO $$ DECLARE c text; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.grocery_items'::regclass AND contype='c' LOOP
    EXECUTE format('ALTER TABLE public.grocery_items DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- Seed existing households with previous stores and migrate items
DO $$ DECLARE h record; s1 uuid; s2 uuid; s3 uuid; BEGIN
  FOR h IN SELECT id FROM public.households LOOP
    INSERT INTO public.household_stores (household_id,name,color,sort_order) VALUES (h.id,'Costco','red',1) RETURNING id INTO s1;
    INSERT INTO public.household_stores (household_id,name,color,sort_order) VALUES (h.id,'Fred Meyer','green',2) RETURNING id INTO s2;
    INSERT INTO public.household_stores (household_id,name,color,sort_order) VALUES (h.id,'Indian store','orange',3) RETURNING id INTO s3;
    UPDATE public.grocery_items SET store = s1::text WHERE household_id=h.id AND store='costco';
    UPDATE public.grocery_items SET store = s2::text WHERE household_id=h.id AND store='fred_meyer';
    UPDATE public.grocery_items SET store = s3::text WHERE household_id=h.id AND store='indian_store';
  END LOOP;
END $$;

-- When a store is deleted, its items become "Store not set"
CREATE OR REPLACE FUNCTION public.unset_items_for_deleted_store() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE grocery_items SET store='unset' WHERE household_id=OLD.household_id AND store=OLD.id::text;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.unset_items_for_deleted_store() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER household_stores_unset_items AFTER DELETE ON public.household_stores FOR EACH ROW EXECUTE FUNCTION public.unset_items_for_deleted_store();

ALTER TABLE public.household_stores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.household_stores;