-- HemoAtlas v4 patch
-- Rode este patch uma vez no SQL Editor, depois de ter rodado o setup principal.
-- Ele adiciona email público-operacional no profile e permite que autores vejam notas de revisão das próprias imagens.

alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or p.email = '');

create index if not exists idx_profiles_email on public.profiles(email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, institution, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'institution', 'user')
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    institution = coalesce(public.profiles.institution, excluded.institution);
  return new;
end;
$$;

-- Usuário pode ler reviews/notas somente das próprias imagens.
drop policy if exists "reviews author read own image" on public.reviews;
create policy "reviews author read own image"
on public.reviews
for select
using (
  exists (
    select 1
    from public.images i
    where i.id = reviews.image_id
      and i.author_id = auth.uid()
  )
);

-- Opcional: garante que notes de ajuste/rejeição também fiquem na própria imagem.
-- O frontend já lê images.review_note/rejection_reason no perfil.
