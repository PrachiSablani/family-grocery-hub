REVOKE EXECUTE ON FUNCTION public.my_household_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_household_id() TO authenticated;