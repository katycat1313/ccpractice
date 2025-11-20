create function public.decrement_credits(user_id_in uuid)
returns void as $$
begin
  update public.profiles
  set credits = credits - 1
  where id = user_id_in;
end;
$$ language plpgsql security definer;
