CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_household_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT household_id FROM public.household_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "Members view their household" ON public.households FOR SELECT TO authenticated
  USING (id = public.my_household_id());
CREATE POLICY "Members view fellow members" ON public.household_members FOR SELECT TO authenticated
  USING (household_id = public.my_household_id());
CREATE POLICY "Users can leave their household" ON public.household_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_household(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE hid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM household_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Already in a household';
  END IF;
  INSERT INTO households (name, created_by) VALUES (coalesce(nullif(trim(_name), ''), 'Our Family'), auth.uid()) RETURNING id INTO hid;
  INSERT INTO household_members (household_id, user_id) VALUES (hid, auth.uid());
  RETURN hid;
END $$;

CREATE OR REPLACE FUNCTION public.join_household(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE hid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM household_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Already in a household';
  END IF;
  SELECT id INTO hid FROM households WHERE invite_code = upper(trim(_code));
  IF hid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO household_members (household_id, user_id) VALUES (hid, auth.uid());
  RETURN hid;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_household(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_household(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(text) TO authenticated;

-- Existing data: put all current users and items into one family household
ALTER TABLE public.grocery_items ADD COLUMN household_id uuid REFERENCES public.households(id) ON DELETE CASCADE;
DO $$
DECLARE hid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.grocery_items) OR EXISTS (SELECT 1 FROM auth.users) THEN
    INSERT INTO public.households (name) VALUES ('Our Family') RETURNING id INTO hid;
    INSERT INTO public.household_members (household_id, user_id) SELECT hid, id FROM auth.users;
    UPDATE public.grocery_items SET household_id = hid;
  END IF;
END $$;
ALTER TABLE public.grocery_items ALTER COLUMN household_id SET DEFAULT public.my_household_id();
ALTER TABLE public.grocery_items ALTER COLUMN household_id SET NOT NULL;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='grocery_items' AND indexdef ILIKE '%lower(name)%' LOOP
    EXECUTE format('DROP INDEX public.%I', r.indexname);
  END LOOP;
END $$;
CREATE UNIQUE INDEX grocery_items_household_name_key ON public.grocery_items (household_id, lower(name));

DROP POLICY "Signed-in family members can add items" ON public.grocery_items;
DROP POLICY "Signed-in family members can delete items" ON public.grocery_items;
DROP POLICY "Signed-in family members can update items" ON public.grocery_items;
DROP POLICY "Signed-in family members can view all items" ON public.grocery_items;
CREATE POLICY "Household members view items" ON public.grocery_items FOR SELECT TO authenticated USING (household_id = public.my_household_id());
CREATE POLICY "Household members add items" ON public.grocery_items FOR INSERT TO authenticated WITH CHECK (household_id = public.my_household_id());
CREATE POLICY "Household members update items" ON public.grocery_items FOR UPDATE TO authenticated USING (household_id = public.my_household_id()) WITH CHECK (household_id = public.my_household_id());
CREATE POLICY "Household members delete items" ON public.grocery_items FOR DELETE TO authenticated USING (household_id = public.my_household_id());