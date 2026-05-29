# HemoAtlas — GitHub Pages + Supabase + LGPD

Projeto multipágina em HTML, CSS e JavaScript puro para banco de imagens em hematologia. Ele foi criado para rodar no GitHub Pages com Supabase para Auth, PostgreSQL e Storage.

## Arquitetura

- Frontend estático: GitHub Pages.
- Banco, autenticação e storage: Supabase.
- Segurança: Supabase Row Level Security.
- Storage recomendado: bucket privado com signed URLs.
- Sem backend próprio, sem IA e sem processamento pesado de imagens.

## Arquivos principais

- `index.html`: home técnica.
- `catalogo.html`: catálogo público de imagens aprovadas.
- `imagem.html?id=...`: detalhe de imagem.
- `casos.html` e `caso.html?id=...`: casos educacionais.
- `upload.html`: submissão com declarações LGPD.
- `admin.html`: dashboard administrativo.
- `admin-curadoria.html`: curadoria.
- `admin-reports.html`: reports.
- `admin-lgpd.html`: solicitações LGPD e logs.
- `privacidade.html`, `termos.html`, `lgpd.html`: páginas legais.
- `sql/supabase_setup.sql`: tabelas, funções, triggers, RLS e storage policies.

## Configuração Supabase

1. Crie um projeto no Supabase.
2. Vá em Project Settings > API.
3. Copie `Project URL` e `Anon/Public key`.
4. Cole em `js/supabase.js`:

```js
SUPABASE_URL: 'https://seu-projeto.supabase.co',
SUPABASE_ANON_KEY: 'sua-chave-publica'
```

Nunca use `service_role` no frontend.

## Criar tabelas e policies

1. Abra SQL Editor no Supabase.
2. Cole o conteúdo de `sql/supabase_setup.sql`.
3. Execute.
4. Crie um usuário pelo `login.html` ou pelo painel do Supabase.
5. Transforme-o em admin:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

## Storage

O bucket `hematology-images` é criado como privado pelo SQL. O fluxo seguro é:

1. Usuário autenticado envia para `{user_id}/{timestamp}-{filename}`.
2. A imagem fica com `status = pending` e `visibility = private`.
3. Admin/curador revisa em `admin-curadoria.html`.
4. Só imagens `approved`, `public`, sem `privacy_hold` e sem `deleted_at` aparecem publicamente.

## Deploy no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos mantendo a estrutura de pastas.
3. Vá em Settings > Pages.
4. Selecione branch `main` e pasta `/root`.
5. Acesse a URL gerada.

## Checklist LGPD

- [ ] Não receber dados identificáveis de pacientes.
- [ ] Exigir anonimização antes do upload.
- [ ] Remover metadados identificáveis antes do envio.
- [ ] Nenhuma imagem pendente deve ser pública.
- [ ] Toda imagem pública deve ter passado por curadoria.
- [ ] Reports de privacidade devem ocultar imagem até análise.
- [ ] Deve existir canal de solicitação de remoção.
- [ ] Deve existir política de privacidade.
- [ ] Deve existir termo de submissão.
- [ ] Deve existir registro de logs administrativos.
- [ ] Definir controlador, operador e encarregado/DPO.
- [ ] Definir política de retenção.
- [ ] Validar textos e processos com jurídico.

## Aviso jurídico

Esta implementação fornece uma base técnica de privacidade e segurança, mas a conformidade com a LGPD deve ser validada pelo controlador dos dados e por responsável jurídico.

## Patch v5

Depois de copiar os arquivos da versão v5, rode também no SQL Editor:

```sql
-- arquivo: sql/v5_patch.sql
```

O patch adiciona código automático para casos (`CASO-000001`), reforça o CRUD de casos, permite edição de submissões próprias em `pending`/`revision_required` e mantém o vínculo caso-imagem restrito a admin/curator por RLS.

## Atualização v6 — revisão profunda de UI/UX

Esta versão aplica uma revisão de produto focada em interface institucional/acadêmica, espaçamento, consistência visual, mobile-first e fluxos administrativos.

Principais alterações:

- Home sem o card “Privacidade por padrão”, com painel visual mais acadêmico e cards úteis.
- Catálogo com cards mais consistentes, grid melhor e filtros mais compactos.
- Casos públicos redesenhados e detalhe do caso alinhado ao container.
- Página LGPD com organização institucional e menos visual de formulário solto.
- Perfil refeito com resumo de usuário, métricas e edição de submissão em revisão.
- Edição de submissão usando selects compatíveis com o formulário de upload.
- Dashboard administrativo com mais métricas, ações rápidas, pendências e logs.
- Gestão de casos reestruturada: lista primeiro, criar/editar em modal, vincular imagens em modal, excluir e publicar/despublicar.
- Vínculos de caso usam apenas registros reais em `case_images`; a página pública não inventa imagem vinculada.
- Adicionado `sql/v6_patch.sql` para reforçar policies de CRUD de casos, vínculos e edição de submissão pelo autor.

Após substituir os arquivos:

1. Rode `Ctrl + Shift + R` no navegador.
2. Execute `sql/v6_patch.sql` no SQL Editor do Supabase.
3. Teste: criar caso, editar caso, vincular imagem aprovada, abrir caso público, solicitar ajuste em imagem e editar pelo perfil.

