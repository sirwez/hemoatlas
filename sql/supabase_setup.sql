-- HemoAtlas Supabase setup
-- Execute no SQL Editor do Supabase. Revise com jurídico e equipe de segurança antes de produção.

create extension if not exists pgcrypto;

-- ========================= ENUM-LIKE CHECKS =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  institution text,
  role text not null default 'user' check (role in ('user','contributor','curator','admin','privacy_officer')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.image_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.image_categories(id),
  created_at timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title text not null,
  description text not null,
  image_path text,
  image_url text,
  material text,
  lineage text,
  finding_type text,
  staining text,
  magnification text,
  diagnosis text,
  category_id uuid references public.image_categories(id),
  author_id uuid references auth.users(id),
  author_name text,
  institution text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','revision_required','privacy_review','archived')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  curator_id uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  rejection_reason text,
  allow_educational_download boolean not null default false,
  lgpd_no_identifiable_data boolean not null default false,
  lgpd_educational_authorization boolean not null default false,
  lgpd_source_authorization boolean not null default false,
  lgpd_metadata_removed boolean not null default false,
  lgpd_reviewed_by_curator boolean not null default false,
  lgpd_review_note text,
  privacy_hold boolean not null default false,
  retention_until date,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_requires_public_checks check (
    status <> 'approved' or (lgpd_no_identifiable_data and lgpd_educational_authorization and lgpd_source_authorization and lgpd_reviewed_by_curator)
  )
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique,
  slug text unique
);

create table if not exists public.image_tags (
  image_id uuid references public.images(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (image_id, tag_id)
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title text not null,
  patient_age_range text,
  patient_sex text,
  material text,
  clinical_summary text,
  hypothesis text,
  main_findings text,
  difficulty_level text check (difficulty_level in ('básico','intermediário','avançado')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  anonymization_checked boolean not null default false,
  created_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_images (
  case_id uuid references public.cases(id) on delete cascade,
  image_id uuid references public.images(id) on delete cascade,
  primary key (case_id, image_id)
);

create table if not exists public.favorites (
  user_id uuid references auth.users(id) on delete cascade,
  image_id uuid references public.images(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, image_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  image_id uuid references public.images(id) on delete cascade,
  user_id uuid references auth.users(id),
  comment text not null,
  status text not null default 'published' check (status in ('published','hidden','deleted')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  image_id uuid references public.images(id) on delete cascade,
  reviewer_id uuid references auth.users(id),
  decision text check (decision in ('approved','rejected','revision_required','privacy_review')),
  note text,
  checklist_focus boolean default false,
  checklist_staining boolean default false,
  checklist_description boolean default false,
  checklist_no_identifiable_data boolean default false,
  checklist_educational_value boolean default false,
  checklist_category boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  image_id uuid references public.images(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reporter_id uuid references auth.users(id),
  reporter_email text,
  reason text not null check (reason in ('possible_identifiable_data','technical_error','inappropriate_image','copyright','category_error','other')),
  description text,
  status text not null default 'open' check (status in ('open','investigating','resolved','rejected')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lgpd_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text,
  requester_email text not null,
  request_type text not null check (request_type in ('removal','correction','information','opposition','other')),
  related_image_id uuid references public.images(id),
  related_case_id uuid references public.cases(id),
  description text,
  status text not null default 'open' check (status in ('open','investigating','answered','rejected','closed')),
  response_note text,
  responded_by uuid references auth.users(id),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  note text,
  ip_hint text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- ========================= INDEXES =========================
create index if not exists idx_images_public on public.images(status, visibility, privacy_hold, deleted_at);
create index if not exists idx_images_author on public.images(author_id);
create index if not exists idx_images_category on public.images(category_id);
create index if not exists idx_reports_status on public.reports(status, reason);
create index if not exists idx_lgpd_requests_status on public.lgpd_requests(status);
create index if not exists idx_comments_image on public.comments(image_id, status);
create index if not exists idx_profiles_email on public.profiles(email);

-- ========================= FUNCTIONS =========================
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin' and p.status = 'active');
$$;
create or replace function public.is_curator(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role in ('curator','admin') and p.status = 'active');
$$;
create or replace function public.is_privacy_officer(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role in ('privacy_officer','admin') and p.status = 'active');
$$;
create or replace function public.is_admin_or_curator(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin(uid) or public.is_curator(uid);
$$;
create or replace function public.can_access_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin(uid) or public.is_curator(uid) or public.is_privacy_officer(uid);
$$;

create sequence if not exists public.image_code_seq;
create or replace function public.generate_image_code() returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := 'HEM-' || lpad(nextval('public.image_code_seq')::text, 6, '0');
  end if;
  return new;
end; $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, institution, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'institution', 'user')
  on conflict (id) do nothing;
  return new;
end; $$;

create or replace function public.log_privacy_action(p_action text, p_entity_type text, p_entity_id uuid, p_note text default null, p_old jsonb default null, p_new jsonb default null) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.privacy_audit_logs(actor_id, action, entity_type, entity_id, note, old_value, new_value)
  values(auth.uid(), p_action, p_entity_type, p_entity_id, p_note, p_old, p_new);
end; $$;

-- ========================= TRIGGERS =========================
drop trigger if exists trg_profiles_updated on public.profiles; create trigger trg_profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists trg_images_updated on public.images; create trigger trg_images_updated before update on public.images for each row execute function public.touch_updated_at();
drop trigger if exists trg_cases_updated on public.cases; create trigger trg_cases_updated before update on public.cases for each row execute function public.touch_updated_at();
drop trigger if exists trg_reports_updated on public.reports; create trigger trg_reports_updated before update on public.reports for each row execute function public.touch_updated_at();
drop trigger if exists trg_lgpd_updated on public.lgpd_requests; create trigger trg_lgpd_updated before update on public.lgpd_requests for each row execute function public.touch_updated_at();
drop trigger if exists trg_generate_image_code on public.images; create trigger trg_generate_image_code before insert on public.images for each row execute function public.generate_image_code();
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ========================= SEEDS =========================
insert into public.image_categories(name, slug) values
('Eritrócitos','eritrocitos'),('Leucócitos','leucocitos'),('Plaquetas','plaquetas'),('Medula óssea','medula-ossea'),('Hemoparasitos','hemoparasitos'),('Hemopatias malignas','hemopatias-malignas'),('Anemias','anemias')
on conflict (slug) do nothing;
insert into public.tags(name, slug) values
('neutrófilo','neutrofilo'),('linfócito reativo','linfocito-reativo'),('blastos','blastos'),('esquizócitos','esquizocitos'),('drepanócitos','drepanocitos'),('bastonetes de Auer','bastonetes-auer')
on conflict (slug) do nothing;
insert into public.system_settings(key, value) values ('privacy_notice', '{"text":"Conteúdo educacional. Não enviar dados identificáveis."}'::jsonb) on conflict (key) do nothing;

-- ========================= RLS =========================
alter table public.profiles enable row level security;
alter table public.image_categories enable row level security;
alter table public.images enable row level security;
alter table public.tags enable row level security;
alter table public.image_tags enable row level security;
alter table public.cases enable row level security;
alter table public.case_images enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.lgpd_requests enable row level security;
alter table public.privacy_audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- profiles
create policy "profiles own read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles own limited update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles admin update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "profiles admin read all" on public.profiles for select using (public.is_admin());

-- reference tables
create policy "categories public read" on public.image_categories for select using (true);
create policy "categories admin write" on public.image_categories for all using (public.is_admin_or_curator()) with check (public.is_admin_or_curator());
create policy "tags public read" on public.tags for select using (true);
create policy "tags admin write" on public.tags for all using (public.is_admin_or_curator()) with check (public.is_admin_or_curator());
create policy "image_tags public read" on public.image_tags for select using (true);
create policy "image_tags admin write" on public.image_tags for all using (public.is_admin_or_curator()) with check (public.is_admin_or_curator());

-- images
create policy "images public approved read" on public.images for select using (status='approved' and visibility='public' and privacy_hold=false and deleted_at is null);
create policy "images author read own" on public.images for select using (author_id = auth.uid());
create policy "images admin read all" on public.images for select using (public.can_access_admin());
create policy "images authenticated insert pending" on public.images for insert to authenticated with check (author_id = auth.uid() and status='pending' and visibility='private' and privacy_hold=false and lgpd_no_identifiable_data=true and lgpd_educational_authorization=true and lgpd_source_authorization=true);
create policy "images author limited update" on public.images for update using (author_id = auth.uid() and status in ('pending','revision_required')) with check (author_id = auth.uid() and status in ('pending','revision_required') and visibility='private' and privacy_hold=false);
create policy "images curator update" on public.images for update using (public.is_admin_or_curator()) with check (public.is_admin_or_curator());
create policy "images privacy officer hold" on public.images for update using (public.is_privacy_officer()) with check (public.is_privacy_officer());

-- cases
create policy "cases public published read" on public.cases for select using (status='published' and anonymization_checked=true);
create policy "cases admin all" on public.cases for all using (public.is_admin_or_curator()) with check (public.is_admin_or_curator());
create policy "case_images public read" on public.case_images for select using (true);
create policy "case_images admin write" on public.case_images for all using (public.is_admin_or_curator()) with check (public.is_admin_or_curator());

-- favorites
create policy "favorites own all" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- comments
create policy "comments public read on approved images" on public.comments for select using (status='published' and exists (select 1 from public.images i where i.id = image_id and i.status='approved' and i.visibility='public' and i.privacy_hold=false and i.deleted_at is null));
create policy "comments authenticated insert" on public.comments for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.images i where i.id = image_id and i.status='approved' and i.visibility='public' and i.privacy_hold=false));
create policy "comments owner hide" on public.comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "comments admin hide" on public.comments for update using (public.is_admin_or_curator()) with check (public.is_admin_or_curator());

-- reviews
create policy "reviews admin all" on public.reviews for all using (public.is_admin_or_curator()) with check (public.is_admin_or_curator() and reviewer_id = auth.uid());
create policy "reviews author read own image" on public.reviews for select using (exists (select 1 from public.images i where i.id = reviews.image_id and i.author_id = auth.uid()));

-- reports
create policy "reports insert authenticated" on public.reports for insert to authenticated with check (reporter_id = auth.uid() or reporter_id is null);
create policy "reports insert anon with email" on public.reports for insert to anon with check (reporter_email is not null and length(reporter_email) > 5);
create policy "reports own read" on public.reports for select using (reporter_id = auth.uid());
create policy "reports admin read" on public.reports for select using (public.can_access_admin());
create policy "reports admin update" on public.reports for update using (public.can_access_admin()) with check (public.can_access_admin());

-- lgpd requests
create policy "lgpd_requests public insert" on public.lgpd_requests for insert with check (requester_email is not null and length(requester_email) > 5);
create policy "lgpd_requests admin read" on public.lgpd_requests for select using (public.is_admin() or public.is_privacy_officer());
create policy "lgpd_requests admin update" on public.lgpd_requests for update using (public.is_admin() or public.is_privacy_officer()) with check (public.is_admin() or public.is_privacy_officer());

-- audit and settings
create policy "privacy logs admin read" on public.privacy_audit_logs for select using (public.is_admin() or public.is_privacy_officer());
create policy "privacy logs admin insert" on public.privacy_audit_logs for insert with check (public.can_access_admin());
create policy "settings public read" on public.system_settings for select using (true);
create policy "settings admin write" on public.system_settings for all using (public.is_admin()) with check (public.is_admin());

-- ========================= STORAGE =========================
insert into storage.buckets(id, name, public) values ('hematology-images','hematology-images', false) on conflict (id) do update set public=false;

create policy "storage authenticated upload own folder" on storage.objects for insert to authenticated with check (bucket_id='hematology-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage user read own folder" on storage.objects for select to authenticated using (bucket_id='hematology-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage admin read all" on storage.objects for select to authenticated using (bucket_id='hematology-images' and public.can_access_admin());
create policy "storage public read approved paths" on storage.objects for select using (bucket_id='hematology-images' and exists (select 1 from public.images i where i.image_path = storage.objects.name and i.status='approved' and i.visibility='public' and i.privacy_hold=false and i.deleted_at is null));
create policy "storage no common user delete" on storage.objects for delete to authenticated using (bucket_id='hematology-images' and public.is_admin());

-- ========================= FIRST ADMIN =========================
-- Depois de criar seu usuário pelo frontend/Supabase Auth, rode substituindo o email:
-- update public.profiles set role='admin' where id = (select id from auth.users where email='SEU_EMAIL@EXEMPLO.COM');
