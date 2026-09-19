CREATE TABLE public.grocery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  store TEXT NOT NULL DEFAULT 'unset' CHECK (store IN ('costco','fred_meyer','indian_store','unset')),
  needed BOOLEAN NOT NULL DEFAULT false,
  needed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX grocery_items_name_unique ON public.grocery_items (lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_items TO authenticated;
GRANT ALL ON public.grocery_items TO service_role;

ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in family members can view all items"
  ON public.grocery_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in family members can add items"
  ON public.grocery_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Signed-in family members can update items"
  ON public.grocery_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Signed-in family members can delete items"
  ON public.grocery_items FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_grocery_items_updated_at
BEFORE UPDATE ON public.grocery_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.grocery_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items;