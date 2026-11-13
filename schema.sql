-- People of Jaipur: run this once in Supabase → SQL Editor → New query → Run.

-- Everything people save (profiles, shops, companies, chat) lives in one table.
-- Each signed-in person has at most one row per collection, and only they can change it.
create table if not exists public.docs (
  collection text not null check (collection in ('profiles','shops','companies','chatlog','meets','rsvps','clubs','clubmembers')),
  id         text not null,
  owner      uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id),
  constraint one_row_per_person check (id = owner::text),
  constraint keep_it_small check (pg_column_size(data) < 60000)
);
alter table public.docs enable row level security;
create policy "Anyone can read the city"  on public.docs for select using (true);
create policy "People add their own rows" on public.docs for insert with check (auth.uid() = owner);
create policy "People edit their own rows" on public.docs for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "People remove their own rows" on public.docs for delete using (auth.uid() = owner);

-- Names and photos from LinkedIn sign-in, so others see who is who.
create table if not exists public.people (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  avatar     text not null default '',
  provider   text not null default '',
  updated_at timestamptz default now()
);
alter table public.people enable row level security;
create policy "Anyone can read names"   on public.people for select using (true);
create policy "People add themselves"   on public.people for insert with check (auth.uid() = id);
create policy "People update themselves" on public.people for update using (auth.uid() = id);

-- Live updates for shops, profiles, companies and chat.
alter publication supabase_realtime add table public.docs;

-- Company logos: a public bucket. Signed-in people can upload only into their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy "Anyone can see logos" on storage.objects for select using (bucket_id = 'logos');
create policy "People upload their own logos" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "People remove their own logos" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Connections: one person asks, the other accepts or declines.
create table if not exists public.connections (
  requester  uuid not null references auth.users(id) on delete cascade,
  addressee  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
alter table public.connections enable row level security;
create policy "See your own connections" on public.connections for select using (auth.uid() in (requester, addressee));
create policy "Ask to connect"           on public.connections for insert with check (auth.uid() = requester and status = 'pending');
create policy "Answer requests to you"   on public.connections for update using (auth.uid() = addressee) with check (auth.uid() = addressee);
create policy "Remove a connection"      on public.connections for delete using (auth.uid() in (requester, addressee));

create or replace function public.are_connected(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.connections c where c.status = 'accepted' and ((c.requester = a and c.addressee = b) or (c.requester = b and c.addressee = a)));
$$;

-- Social links: only you and your accepted connections can read them.
create table if not exists public.socials (
  id         uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  constraint socials_small check (pg_column_size(data) < 4000)
);
alter table public.socials enable row level security;
create policy "You and your connections read links" on public.socials for select using (auth.uid() = id or public.are_connected(auth.uid(), id));
create policy "You add your links"    on public.socials for insert with check (auth.uid() = id);
create policy "You update your links" on public.socials for update using (auth.uid() = id);

-- Direct messages: only between accepted connections, readable only by the two people.
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  sender     uuid not null references auth.users(id) on delete cascade,
  recipient  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_pair on public.messages (sender, recipient, created_at);
alter table public.messages enable row level security;
create policy "Read your own conversations" on public.messages for select using (auth.uid() in (sender, recipient));
create policy "Message your connections"    on public.messages for insert with check (auth.uid() = sender and public.are_connected(sender, recipient));

alter publication supabase_realtime add table public.connections;
alter publication supabase_realtime add table public.messages;
