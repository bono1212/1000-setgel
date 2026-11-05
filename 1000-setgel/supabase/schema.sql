-- 1000 СЭТГЭЛ — Supabase схем
-- Supabase → SQL Editor дээр бүтнээр нь нэг удаа ажиллуулна.

create extension if not exists pgcrypto;

-- 1) Бүх хандив (зөвхөн сервер уншина/бичнэ)
create table if not exists public.donations (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  name             text check (char_length(name) <= 40),
  message          text check (char_length(message) <= 60),
  amount           integer not null default 1000 check (amount > 0),
  method           text not null default 'qpay' check (method in ('qpay', 'bank')),
  status           text not null default 'pending' check (status in ('pending', 'paid', 'expired')),
  qpay_invoice_id  text unique,
  qpay_payment_id  text unique,          -- нэг төлбөрийг 2 удаа тоолохоос хамгаална
  paid_at          timestamptz
);
create index if not exists donations_status_idx on public.donations (status, created_at desc);

alter table public.donations enable row level security;
-- Анхаар: donations дээр anon-д ямар ч policy өгөхгүй. Сервер service_role-оор ажиллана.

-- 2) LIVE дэлгэцэнд гарах нийтийн жагсаалт (зөвхөн төлөгдсөн)
create table if not exists public.supporters (
  id           bigint generated always as identity primary key,
  donation_id  uuid not null unique references public.donations(id) on delete cascade,
  name         text not null,
  message      text,
  units        integer not null default 1,   -- хэдэн зүрх (1,000₮ тутамд 1)
  created_at   timestamptz not null default now()
);

alter table public.supporters enable row level security;
drop policy if exists "supporters are public" on public.supporters;
create policy "supporters are public" on public.supporters
  for select to anon, authenticated using (true);

-- 3) Хандив "paid" болох мөчид supporters-д автоматаар нэг мөр нэмнэ
create or replace function public.on_donation_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    insert into public.supporters (donation_id, name, message, units)
    values (
      new.id,
      coalesce(nullif(trim(new.name), ''), 'Нэрээ нууцалсан'),
      nullif(trim(new.message), ''),
      greatest(1, new.amount / 1000)
    )
    on conflict (donation_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists donation_paid on public.donations;
create trigger donation_paid
  after insert or update of status on public.donations
  for each row execute function public.on_donation_paid();

-- 4) Нийт статистик (LIVE дэлгэц дуудна)
create or replace function public.get_stats()
returns table (hearts bigint, supporters bigint)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(units), 0)::bigint, count(*)::bigint from public.supporters;
$$;
grant execute on function public.get_stats() to anon, authenticated;

-- 5) Realtime: supporters хүснэгтийн шинэ мөрийг шууд түгээнэ
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'supporters'
  ) then
    alter publication supabase_realtime add table public.supporters;
  end if;
end $$;
