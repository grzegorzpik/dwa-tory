-- Dwa Tory — parowanie kont (Etap 4 planu backendu, spec §6 "Łączenie kont").
--
-- Dwie funkcje SECURITY DEFINER:
--   1. redeem_invite_code — wymienia ważny, nieużyty kod na trwałe pairs/
--      pair_members. Wymaga sprawdzeń krzyżowych (obie strony jeszcze
--      nieparowane, kod nie swój własny) niewyrażalnych bezpiecznie samym
--      RLS na pojedynczej tabeli — stąd elevacja uprawnień tylko tutaj.
--   2. my_pairing — status parowania + publiczne dane partnera w jednym
--      zapytaniu (klient woła to przy starcie appki i po każdej zmianie).
--
-- Generowanie kodu i rozłączanie NIE potrzebują nowych funkcji — to zwykłe
-- INSERT do invite_codes / DELETE z pairs, już pokryte politykami z Etapu 2.

create function public.redeem_invite_code(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_creator uuid;
  v_pair_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Musisz być zalogowany.';
  end if;

  select created_by into v_creator
  from public.invite_codes
  where code = p_code and used_by is null and expires_at > now()
  for update;

  if v_creator is null then
    raise exception 'Kod jest nieprawidłowy, wygasł albo został już użyty.';
  end if;

  if v_creator = auth.uid() then
    raise exception 'Nie możesz sparować się sam ze sobą.';
  end if;

  if exists (select 1 from public.pair_members where user_id = auth.uid()) then
    raise exception 'To konto jest już w parze.';
  end if;

  if exists (select 1 from public.pair_members where user_id = v_creator) then
    raise exception 'Osoba, która wygenerowała ten kod, jest już w innej parze.';
  end if;

  insert into public.pairs default values returning id into v_pair_id;
  insert into public.pair_members (user_id, pair_id) values (v_creator, v_pair_id), (auth.uid(), v_pair_id);

  update public.invite_codes set used_by = auth.uid(), used_at = now() where code = p_code;

  return v_pair_id;
end;
$$;

comment on function public.redeem_invite_code(text) is
  'Wymienia ważny, nieużyty kod zaproszenia na trwałe połączenie dwóch kont (spec §6, kroki 2-3).';

create function public.my_pairing()
returns table (
  pair_id uuid,
  partner_id uuid,
  partner_name text,
  partner_initials text,
  partner_color text,
  partner_photo_src text,
  partner_streak integer,
  partner_longest_streak integer,
  partner_cheers integer
)
language sql stable security definer set search_path = public as $$
  select pm.pair_id, p.id, p.name, p.initials, p.color, p.photo_src, p.streak, p.longest_streak, p.cheers
  from public.pair_members pm
  join public.pair_members pm2 on pm2.pair_id = pm.pair_id and pm2.user_id <> pm.user_id
  join public.profiles p on p.id = pm2.user_id
  where pm.user_id = auth.uid();
$$;

comment on function public.my_pairing() is 'Status parowania bieżącego użytkownika + publiczne dane partnera, jedno zapytanie.';
