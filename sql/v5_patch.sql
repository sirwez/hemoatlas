-- HemoAtlas v5 patch
-- Rode depois do setup/v4_patch. Inclui código automático de casos e ajustes para fluxo de edição.

-- 1) Código automático para casos: CASO-000001, CASO-000002...
create sequence if not exists public.case_code_seq;

create or replace function public.generate_case_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := 'CASO-' || lpad(nextval('public.case_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_case_code on public.cases;
create trigger trg_generate_case_code
before insert on public.cases
for each row
execute function public.generate_case_code();

-- 2) Garante que o admin/curador possa apagar caso e seus vínculos via policy existente de FOR ALL.
-- Se você customizou policies e removeu FOR ALL, recrie:
drop policy if exists "cases admin all" on public.cases;
create policy "cases admin all" on public.cases
for all
using (public.is_admin_or_curator())
with check (public.is_admin_or_curator());

-- 3) Permite ao autor editar a própria submissão em pending/revision_required.
-- Ao editar no perfil, o frontend envia status='pending', visibility='private' e privacy_hold=false.
drop policy if exists "images author limited update" on public.images;
create policy "images author limited update" on public.images
for update
to authenticated
using (
  author_id = auth.uid()
  and status in ('pending','revision_required')
  and privacy_hold = false
)
with check (
  author_id = auth.uid()
  and status in ('pending','revision_required')
  and visibility = 'private'
  and privacy_hold = false
);

-- 4) Vínculos caso-imagem continuam só para admin/curator.
drop policy if exists "case_images admin write" on public.case_images;
create policy "case_images admin write" on public.case_images
for all
using (public.is_admin_or_curator())
with check (public.is_admin_or_curator());

-- 5) Verificação útil
select 'v5_patch_applied' as status;
