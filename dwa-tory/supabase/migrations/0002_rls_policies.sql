-- Dwa Tory — polityki RLS (Etap 2 planu backendu).
--
-- Zasada: użytkownik widzi swoje dane oraz dane osoby, z którą jest
-- sparowany, i nic więcej. Krytyczne: cel z visible_to_partner = false NIE
-- może wrócić z zapytania partnera — to egzekwowane tutaj, w klauzuli
-- USING, nie w kliencie (spec §7, "Luka do domknięcia: widoczność celu").
--
-- Parowanie kont (INSERT do pairs/pair_members, UPDATE invite_codes) idzie
-- przez funkcję SECURITY DEFINER redeem_invite_code() dodaną w Etapie 4 —
-- tutaj celowo brak polityk pozwalających klientowi robić to bezpośrednio,
-- bo wymaga to sprawdzeń (ważność kodu, brak istniejącej pary), których nie
-- da się bezpiecznie wyrazić samym RLS na pojedynczej tabeli.

-- ---------------------------------------------------------------------
-- Funkcje pomocnicze — SECURITY DEFINER, więc bezpiecznie omijają RLS
-- pair_members od środka (zwracają tylko pojedynczy uuid, nie surowe wiersze).
-- search_path ustawiony jawnie — standardowe zabezpieczenie funkcji
-- SECURITY DEFINER w Postgresie przed podmianą search_path.
-- ---------------------------------------------------------------------

create function public.current_pair_id() returns uuid
language sql stable security definer set search_path = public as $$
  select pair_id from public.pair_members where user_id = auth.uid();
$$;

create function public.current_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select pm2.user_id
  from public.pair_members pm1
  join public.pair_members pm2 on pm2.pair_id = pm1.pair_id and pm2.user_id <> pm1.user_id
  where pm1.user_id = auth.uid();
$$;

comment on function public.current_pair_id() is 'ID pary bieżącego użytkownika, albo NULL gdy niesparowany.';
comment on function public.current_partner_id() is 'ID partnera bieżącego użytkownika, albo NULL gdy niesparowany.';

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

create policy profiles_select_self_or_partner on public.profiles for select
  to authenticated
  using (id = auth.uid() or id = public.current_partner_id());

-- Wiersz zakłada się przy pierwszym logowaniu (Etap 3, klient po magic
-- linku), nie triggerem na auth.users — spec nie wymaga name/color od razu,
-- onboarding.jsx i tak je zbiera zanim profil jest w pełni użyteczny.
create policy profiles_insert_self on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- pairs / pair_members
-- ---------------------------------------------------------------------

create policy pairs_select_member on public.pairs for select
  to authenticated
  using (id = public.current_pair_id());

-- Rozłączenie = DELETE przez dowolnego członka pary (decyzja: zwalnia oboje
-- do ponownego parowania). Kaskadowo usuwa oba wiersze w pair_members.
create policy pairs_delete_member on public.pairs for delete
  to authenticated
  using (id = public.current_pair_id());

create policy pair_members_select_self_or_partner on public.pair_members for select
  to authenticated
  using (user_id = auth.uid() or user_id = public.current_partner_id());

-- ---------------------------------------------------------------------
-- invite_codes
-- ---------------------------------------------------------------------

create policy invite_codes_select_own on public.invite_codes for select
  to authenticated
  using (created_by = auth.uid());

-- Nie można wygenerować kodu, gdy już się jest w parze — zamiast cichej
-- pomyłki, INSERT po prostu się nie uda.
create policy invite_codes_insert_own on public.invite_codes for insert
  to authenticated
  with check (created_by = auth.uid() and public.current_pair_id() is null);

-- Anulowanie własnego, jeszcze niewykorzystanego kodu.
create policy invite_codes_delete_own_unused on public.invite_codes for delete
  to authenticated
  using (created_by = auth.uid() and used_by is null);

-- ---------------------------------------------------------------------
-- goals — tu egzekwowana jest luka z visible_to_partner
-- ---------------------------------------------------------------------

create policy goals_select_own_or_visible_partner on public.goals for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (owner_id = public.current_partner_id() and visible_to_partner)
  );

create policy goals_insert_own on public.goals for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy goals_update_own on public.goals for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy goals_delete_own on public.goals for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- milestones — widoczność dziedziczona z celu nadrzędnego
-- ---------------------------------------------------------------------

create policy milestones_select_via_goal on public.milestones for select
  to authenticated
  using (
    exists (
      select 1 from public.goals g
      where g.id = milestones.goal_id
        and (g.owner_id = auth.uid() or (g.owner_id = public.current_partner_id() and g.visible_to_partner))
    )
  );

create policy milestones_insert_via_own_goal on public.milestones for insert
  to authenticated
  with check (exists (select 1 from public.goals g where g.id = milestones.goal_id and g.owner_id = auth.uid()));

create policy milestones_update_via_own_goal on public.milestones for update
  to authenticated
  using (exists (select 1 from public.goals g where g.id = milestones.goal_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.goals g where g.id = milestones.goal_id and g.owner_id = auth.uid()));

create policy milestones_delete_via_own_goal on public.milestones for delete
  to authenticated
  using (exists (select 1 from public.goals g where g.id = milestones.goal_id and g.owner_id = auth.uid()));

-- ---------------------------------------------------------------------
-- instances — historia dni; widoczność = własne ALBO (partnera I cel widoczny)
-- ---------------------------------------------------------------------

create policy instances_select_own_or_visible_partner on public.instances for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (
      owner_id = public.current_partner_id()
      and exists (select 1 from public.goals g where g.id = instances.goal_id and g.visible_to_partner)
    )
  );

create policy instances_insert_own on public.instances for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy instances_update_own on public.instances for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy instances_delete_own on public.instances for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- notifications — wspólny feed pary; odpowiada tylko odbiorca (nie autor)
-- ---------------------------------------------------------------------

create policy notifications_select_pair on public.notifications for select
  to authenticated
  using (pair_id = public.current_pair_id());

create policy notifications_insert_own_action on public.notifications for insert
  to authenticated
  with check (actor_id = auth.uid() and pair_id = public.current_pair_id());

create policy notifications_update_reply_by_recipient on public.notifications for update
  to authenticated
  using (pair_id = public.current_pair_id() and actor_id <> auth.uid())
  with check (pair_id = public.current_pair_id() and actor_id <> auth.uid());
