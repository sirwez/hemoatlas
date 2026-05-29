-- HemoAtlas v6 patch — CRUD de casos, vínculos e edição de submissão
-- Rode após o setup base e patches anteriores. Mantém RLS como camada principal de segurança.

-- case_images: admin/curator pode gerenciar vínculos
alter table public.case_images enable row level security;
drop policy if exists "case_images admin write" on public.case_images;
create policy "case_images admin write" on public.case_images
for all
using (public.is_admin_or_curator())
with check (public.is_admin_or_curator());

-- cases: reforça CRUD completo para admin/curator
drop policy if exists "cases admin all" on public.cases;
create policy "cases admin all" on public.cases
for all
using (public.is_admin_or_curator())
with check (public.is_admin_or_curator());

-- images: permite autor corrigir submissão em pending/revision_required e devolver para pending/private
-- Mantém bloqueio de publication pelo usuário comum.
drop policy if exists "images author limited update" on public.images;
create policy "images author limited update"
on public.images
for update
using (
  author_id = auth.uid()
  and status in ('pending','revision_required')
  and coalesce(privacy_hold,false) = false
)
with check (
  author_id = auth.uid()
  and status = 'pending'
  and visibility = 'private'
  and coalesce(privacy_hold,false) = false
  and lgpd_no_identifiable_data = true
  and lgpd_educational_authorization = true
  and lgpd_source_authorization = true
);

-- Observação:
-- Se seu SQL Editor acusar erro nesta policy por sintaxe, apague manualmente a policy antiga e rode apenas o CREATE POLICY.
