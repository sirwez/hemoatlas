window.HemoApp = (() => {
  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => [...root.querySelectorAll(s)];
  const statusLabel = (s) => ({ approved: 'Aprovado', pending: 'Pendente', rejected: 'Fechado/Rejeitado', revision_required: 'Necessita revisão', privacy_review: 'Revisão LGPD', published: 'Publicado', draft: 'Rascunho', archived: 'Arquivado', open: 'Aberto', investigating: 'Investigando', resolved: 'Resolvido', answered: 'Respondida', closed: 'Fechada' }[s] || s || '-');
  const badge = (s) => `<span class="hemo-badge badge-${s || 'draft'}">${statusLabel(s)}</span>`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
  const params = () => new URLSearchParams(location.search);

  const cache = { publicImages: null, allImages: null, curationImages: null, cases: null, reports: null, logs: null, favorites: null, users: null, lgpdRequests: null };

  function toast(message, type = 'ok') {
    const old = q('.toast'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<strong class="${type === 'error' ? 'text-red-700' : 'text-emerald-700'}">${type === 'error' ? 'Atenção' : 'Pronto'}</strong><p class="mt-1 text-sm text-slate-600">${message}</p>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5200);
  }

  function loading(text = 'Carregando dados...') {
    return `<div class="hemo-card p-8 text-center text-slate-500">${text}</div>`;
  }

  function empty(text = 'Nenhum registro encontrado.') {
    return `<div class="hemo-card p-8 text-center text-slate-500">${text}</div>`;
  }

  function setActiveNav() {
    const file = location.pathname.split('/').pop() || 'index.html';
    qa('[data-nav]').forEach(a => {
      const href = a.getAttribute('href');
      if (href === file) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  function initMenu() {
    const btn = q('#mobileMenuBtn'), menu = q('#mobileMenu');
    if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('show'));
  }

  function applyAccessUiSnapshot(snapshot) {
    const user = snapshot;
    const profile = snapshot;
    const file = location.pathname.split('/').pop() || 'index.html';
    const isAdminPage = file.startsWith('admin');
    const isAdmin = Boolean(profile && ['admin', 'curator', 'privacy_officer'].includes(profile.role));

    qa('a[href="upload.html"]').forEach(el => el.classList.toggle('hidden', !user));
    qa('a[href="favoritos.html"]').forEach(el => el.classList.toggle('hidden', !user));
    qa('a[href="admin.html"], a[href="admin-curadoria.html"], a[href="admin-reports.html"], a[href="admin-imagens.html"], a[href="admin-casos.html"], a[href="admin-usuarios.html"], a[href="admin-lgpd.html"]').forEach(el => el.classList.toggle('hidden', !isAdmin));

    qa('a[href="login.html"], a[data-auth-label]').forEach(el => {
      if (user) { el.textContent = profile?.full_name || profile?.email || 'Perfil'; el.setAttribute('href', 'perfil.html'); }
      else { el.textContent = 'Entrar'; el.setAttribute('href', 'login.html'); }
    });
    if (isAdminPage) document.body.classList.add('is-admin-page');
  }

  async function applyAccessUi() {
    const { user, profile } = await HemoAuth.loadSession();
    const file = location.pathname.split('/').pop() || 'index.html';
    const isAdminPage = file.startsWith('admin');
    const isAdmin = Boolean(profile && ['admin', 'curator', 'privacy_officer'].includes(profile.role));

    qa('a[href="upload.html"]').forEach(el => el.classList.toggle('hidden', !user));
    qa('a[href="favoritos.html"]').forEach(el => el.classList.toggle('hidden', !user));
    qa('a[href="admin.html"], a[href="admin-curadoria.html"], a[href="admin-reports.html"], a[href="admin-imagens.html"], a[href="admin-casos.html"], a[href="admin-usuarios.html"], a[href="admin-lgpd.html"]').forEach(el => el.classList.toggle('hidden', !isAdmin));

    const loginLinks = qa('a[href="login.html"], a[data-auth-label]');
    loginLinks.forEach(el => {
      if (user) {
        el.textContent = profile?.full_name || user.email || 'Perfil';
        el.setAttribute('href', 'perfil.html');
      } else {
        el.textContent = 'Entrar';
        el.setAttribute('href', 'login.html');
      }
    });

    const mobileMenu = q('#mobileMenu');
    if (mobileMenu) {
      const loginMobile = mobileMenu.querySelector('a[href="login.html"], a[href="perfil.html"]');
      if (loginMobile) {
        loginMobile.textContent = user ? 'Perfil' : 'Entrar';
        loginMobile.href = user ? 'perfil.html' : 'login.html';
      }
    }

    if (isAdminPage) document.body.classList.add('is-admin-page');
  }

  function reportModalHtml(imageId = '', commentId = '') {
    return `<div id="reportModal" class="modal-backdrop"><div class="modal-panel max-w-xl p-5"><div class="flex items-start justify-between gap-4"><div><h2 class="text-2xl font-black text-[var(--deep)]">Reportar conteúdo</h2><p class="mt-1 text-sm text-slate-500">Use este canal para indicar possível dado identificável, erro técnico ou conteúdo inadequado.</p></div><button class="hemo-btn hemo-btn-secondary" data-close-report>Fechar</button></div><form id="reportForm" class="mt-5 grid gap-4"><input type="hidden" name="image_id" value="${imageId}"><input type="hidden" name="comment_id" value="${commentId}"><label><span class="hemo-label">Motivo</span><select name="reason" required class="hemo-select"><option value="possible_identifiable_data">Possível dado identificável</option><option value="technical_error">Informação técnica incorreta</option><option value="inappropriate_image">Imagem inadequada</option><option value="copyright">Violação de direito autoral</option><option value="category_error">Erro de categoria</option><option value="other">Outro</option></select></label><label><span class="hemo-label">Descrição</span><textarea name="description" required class="hemo-textarea" placeholder="Descreva o problema observado"></textarea></label><label><span class="hemo-label">Email para contato, se não estiver logado</span><input name="reporter_email" type="email" class="hemo-input" placeholder="seu-email@exemplo.com"></label><label class="flex gap-3 text-sm text-slate-600"><input required type="checkbox" class="mt-1"> <span>Declaro que este report foi feito de boa-fé.</span></label><button class="hemo-btn hemo-btn-primary">Enviar report</button></form></div></div>`;
  }

  function openReport(imageId, commentId = '') {
    q('#reportModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', reportModalHtml(imageId, commentId));
    const modal = q('#reportModal');
    modal.classList.add('show');
    modal.addEventListener('click', e => { if (e.target.matches('[data-close-report]') || e.target === modal) modal.remove(); });
    q('#reportForm').addEventListener('submit', async e => { e.preventDefault(); await HemoReports.createReport(new FormData(e.target)); modal.remove(); });
  }

  const mockImages = [
    ['img-001','HEM-000001','Neutrófilo segmentado e linfócitos','Leucócitos','Sangue periférico','Mieloide','Célula normal','May-Grünwald-Giemsa','1000x','Morfologia normal','approved',['neutrófilo','linfócito']],
    ['img-002','HEM-000002','Esferócitos em sangue periférico','Eritrócitos','Sangue periférico','Eritroide','Alteração patológica','Wright-Giemsa','1000x','Anemia hemolítica','approved',['esferócitos','hemólise']],
    ['img-003','HEM-000003','Blastos mieloides com bastonete de Auer','Hemopatias malignas','Medula óssea','Mieloide','Inclusão citoplasmática','May-Grünwald-Giemsa','1000x','Leucemia mieloide aguda','pending',['blastos','Auer']],
    ['img-004','HEM-000004','Plaquetas gigantes','Plaquetas','Sangue periférico','Megacariocítica','Variante morfológica','Panótico rápido','1000x','Trombocitopenia imune','approved',['plaquetas gigantes']],
    ['img-005','HEM-000005','Drepanócitos','Anemias','Sangue periférico','Eritroide','Alteração patológica','Wright-Giemsa','1000x','Doença falciforme','approved',['drepanócitos']],
    ['img-006','HEM-000006','Corpúsculos de Howell-Jolly','Eritrócitos','Sangue periférico','Eritroide','Inclusão citoplasmática','May-Grünwald-Giemsa','1000x','Hipoesplenismo','approved',['Howell-Jolly']],
    ['img-007','HEM-000007','Neutrófilos hipersegmentados','Anemias','Sangue periférico','Mieloide','Alteração patológica','Wright-Giemsa','1000x','Anemia megaloblástica','approved',['hipersegmentação']],
    ['img-008','HEM-000008','Esquizócitos','Eritrócitos','Sangue periférico','Eritroide','Alteração patológica','May-Grünwald-Giemsa','1000x','Microangiopatia trombótica','approved',['esquizócitos']],
    ['img-009','HEM-000009','Plasmócito medular','Medula óssea','Aspirado medular','Linfoide','Célula normal','May-Grünwald-Giemsa','1000x','Mieloma múltiplo','revision_required',['plasmócito']],
    ['img-010','HEM-000010','Granulações tóxicas em neutrófilos','Leucócitos','Sangue periférico','Mieloide','Variante morfológica','Panótico rápido','1000x','Infecção bacteriana','approved',['granulações tóxicas']],
    ['img-011','HEM-000011','Hemoparasitos compatíveis com malária','Hemoparasitos','Sangue periférico','Eritroide','Parasita','Giemsa','1000x','Malária','privacy_review',['hemoparasita']],
    ['img-012','HEM-000012','Linfócito reativo','Leucócitos','Sangue periférico','Linfoide','Variante morfológica','Wright-Giemsa','1000x','Resposta reacional','approved',['linfócito reativo']],
    ['img-013','HEM-000013','Hipocromia e microcitose','Anemias','Sangue periférico','Eritroide','Alteração patológica','Panótico rápido','1000x','Anemia ferropriva','approved',['microcitose','hipocromia']],
    ['img-014','HEM-000014','Blastos linfoides','Hemopatias malignas','Medula óssea','Linfoide','Alteração patológica','May-Grünwald-Giemsa','1000x','Leucemia linfoblástica aguda','pending',['blastos','LLA']],
    ['img-015','HEM-000015','Poiquilocitose acentuada','Eritrócitos','Sangue periférico','Eritroide','Alteração patológica','Wright-Giemsa','1000x','Anemia crônica','rejected',['poiquilocitose']],
    ['img-016','HEM-000016','Megacariócito em aspirado medular','Medula óssea','Aspirado medular','Megacariocítica','Célula normal','May-Grünwald-Giemsa','400x','Morfologia medular','approved',['megacariócito']]
  ].map((r,i)=>({ id:r[0], code:r[1], title:r[2], category:r[3], material:r[4], lineage:r[5], finding_type:r[6], staining:r[7], magnification:r[8], diagnosis:r[9], status:r[10], tags:r[11], visibility: r[10] === 'approved' ? 'public' : 'private', privacy_hold: r[10] === 'privacy_review', description:`Imagem demonstrativa de ${r[2].toLowerCase()} com descrição morfológica educacional, sem dados identificáveis do paciente.`, author_name:'Equipe HemoAtlas', institution:'Banco demonstrativo', created_at:new Date(Date.now()-i*86400000).toISOString(), reviewed_at: r[10] === 'approved' ? new Date(Date.now()-i*80000000).toISOString() : null, image_path:`demo/${r[0]}.jpg`, image_url:null }));

  const mockCases = [
    { id:'case-001', code:'CASO-001', title:'Anemia microcítica hipocrômica', patient_age_range:'Adulto', patient_sex:'Feminino', material:'Sangue periférico', clinical_summary:'Resumo educacional anonimizado com quadro compatível com anemia.', hypothesis:'Anemia ferropriva', main_findings:'Microcitose, hipocromia e anisocitose.', difficulty_level:'básico', status:'published' },
    { id:'case-002', code:'CASO-002', title:'Suspeita de leucemia aguda', patient_age_range:'Adulto', patient_sex:'Masculino', material:'Medula óssea', clinical_summary:'Caso educacional com blastos em material medular.', hypothesis:'Leucemia aguda', main_findings:'Blastos, cromatina imatura e inclusões compatíveis.', difficulty_level:'avançado', status:'published' },
    { id:'case-003', code:'CASO-003', title:'Hemólise com esquizócitos', patient_age_range:'Idoso', patient_sex:'Feminino', material:'Sangue periférico', clinical_summary:'Discussão de hemólise microangiopática em lâmina periférica.', hypothesis:'Microangiopatia trombótica', main_findings:'Esquizócitos e alterações eritrocitárias.', difficulty_level:'intermediário', status:'published' },
    { id:'case-004', code:'CASO-004', title:'Plasmocitose medular', patient_age_range:'Adulto', patient_sex:'Masculino', material:'Aspirado medular', clinical_summary:'Caso educacional com aumento de plasmócitos.', hypothesis:'Mieloma múltiplo', main_findings:'Plasmócitos aumentados e atipias.', difficulty_level:'avançado', status:'draft' },
    { id:'case-005', code:'CASO-005', title:'Anemia megaloblástica', patient_age_range:'Adulto', patient_sex:'Não informado', material:'Sangue periférico', clinical_summary:'Caso com neutrófilos hipersegmentados.', hypothesis:'Anemia megaloblástica', main_findings:'Macrocitose e hipersegmentação.', difficulty_level:'básico', status:'published' },
    { id:'case-006', code:'CASO-006', title:'Hemoparasitose em esfregaço', patient_age_range:'Adulto', patient_sex:'Masculino', material:'Sangue periférico', clinical_summary:'Caso educacional em revisão por possível privacidade.', hypothesis:'Malária', main_findings:'Formas parasitárias intraeritrocitárias.', difficulty_level:'intermediário', status:'archived' }
  ];

  const mockReports = [
    { id:'rep-001', image_id:'img-011', reason:'possible_identifiable_data', description:'Suspeita de etiqueta residual na imagem.', status:'open', priority:'high', created_at:new Date().toISOString() },
    { id:'rep-002', image_id:'img-008', reason:'technical_error', description:'Descrição poderia mencionar diferencial.', status:'investigating', priority:'normal', created_at:new Date().toISOString() },
    { id:'rep-003', image_id:'img-015', reason:'inappropriate_image', description:'Imagem desfocada.', status:'resolved', priority:'normal', created_at:new Date().toISOString() },
    { id:'rep-004', image_id:'img-002', reason:'category_error', description:'Rever categoria.', status:'open', priority:'normal', created_at:new Date().toISOString() },
    { id:'rep-005', image_id:'img-012', reason:'copyright', description:'Verificar origem.', status:'rejected', priority:'normal', created_at:new Date().toISOString() }
  ];

  const mockLogs = [
    {action:'image_uploaded',entity_type:'images',note:'Submissão demo registrada',created_at:new Date().toISOString()},
    {action:'image_approved',entity_type:'images',note:'Aprovação demo',created_at:new Date().toISOString()},
    {action:'report_created',entity_type:'reports',note:'Report demo aberto',created_at:new Date().toISOString()},
    {action:'privacy_hold_enabled',entity_type:'images',note:'Imagem ocultada preventivamente',created_at:new Date().toISOString()},
    {action:'role_updated',entity_type:'profiles',note:'Role ajustada em ambiente demo',created_at:new Date().toISOString()}
  ];

  function isDemo() { return !HemoSupabase.isConfigured(); }

  async function signedImageUrl(img) {
    if (!img || img.image_url) return img?.image_url || null;
    if (!HemoSupabase.isConfigured() || !img.image_path) return null;
    return await HemoSupabase.signedUrl(img.image_path);
  }

  async function normalizeImages(rows = []) {
    return Promise.all((rows || []).map(async row => ({
      ...row,
      category: row.category || row.image_categories?.name || 'Sem categoria',
      tags: Array.isArray(row.tags) ? row.tags : [],
      image_url: await signedImageUrl(row)
    })));
  }

  async function loadPublicImages(force = false) {
    if (!force && cache.publicImages) return cache.publicImages;
    if (isDemo()) {
      cache.publicImages = mockImages.filter(i => i.status === 'approved' && i.visibility === 'public' && !i.privacy_hold);
      return cache.publicImages;
    }
    const { data, error } = await HemoSupabase.client
      .from('images')
      .select('*, image_categories(name)')
      .eq('status', 'approved')
      .eq('visibility', 'public')
      .eq('privacy_hold', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) { toast(error.message, 'error'); cache.publicImages = []; return []; }
    cache.publicImages = await normalizeImages(data || []);
    return cache.publicImages;
  }

  async function loadAllImages(force = false) {
    if (!force && cache.allImages) return cache.allImages;
    if (isDemo()) { cache.allImages = [...mockImages]; return cache.allImages; }
    const { data, error } = await HemoSupabase.client
      .from('images')
      .select('*, image_categories(name)')
      .order('created_at', { ascending: false });
    if (error) { toast(error.message, 'error'); cache.allImages = []; return []; }
    cache.allImages = await normalizeImages(data || []);
    return cache.allImages;
  }

  async function loadCurationImages(force = false) {
    if (!force && cache.curationImages) return cache.curationImages;
    if (isDemo()) { cache.curationImages = mockImages.filter(i => ['pending','revision_required','privacy_review'].includes(i.status)); return cache.curationImages; }
    const { data, error } = await HemoSupabase.client
      .from('images')
      .select('*, image_categories(name)')
      .in('status', ['pending','revision_required','privacy_review'])
      .order('created_at', { ascending: false });
    if (error) { toast(error.message, 'error'); cache.curationImages = []; return []; }
    cache.curationImages = await normalizeImages(data || []);
    return cache.curationImages;
  }

  async function loadImage(id) {
    if (!id) return null;
    if (isDemo()) return mockImages.find(i => i.id === id) || null;
    const { data, error } = await HemoSupabase.client
      .from('images')
      .select('*, image_categories(name)')
      .eq('id', id)
      .maybeSingle();
    if (error) { toast(error.message, 'error'); return null; }
    const arr = await normalizeImages(data ? [data] : []);
    return arr[0] || null;
  }

  async function loadCases(status = 'published') {
    if (isDemo()) return mockCases.filter(c => !status || c.status === status);
    let query = HemoSupabase.client.from('cases').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) { toast(error.message, 'error'); return []; }
    return data || [];
  }

  async function loadCase(id) {
    if (isDemo()) return mockCases.find(c => c.id === id) || mockCases.find(c => c.status === 'published') || null;
    const { data, error } = await HemoSupabase.client.from('cases').select('*').eq('id', id).maybeSingle();
    if (error) { toast(error.message, 'error'); return null; }
    return data;
  }

  async function loadReports() {
    if (isDemo()) return mockReports;
    const { data, error } = await HemoSupabase.client.from('reports').select('*').order('created_at', { ascending: false });
    if (error) { toast(error.message, 'error'); return []; }
    return data || [];
  }

  async function loadLogs() {
    if (isDemo()) return mockLogs;
    const { data, error } = await HemoSupabase.client.from('privacy_audit_logs').select('*').order('created_at', { ascending: false }).limit(30);
    if (error) return [];
    return data || [];
  }

  async function loadLGPDRequests() {
    if (isDemo()) return [{ id:'lgpd-001', request_type:'removal', requester_email:'solicitante@exemplo.com', status:'open', created_at:new Date().toISOString() }];
    const { data, error } = await HemoSupabase.client.from('lgpd_requests').select('*').order('created_at', { ascending: false });
    if (error) { toast(error.message, 'error'); return []; }
    return data || [];
  }

  async function loadUsers(force = false) {
    if (!force && cache.users) return cache.users;
    if (isDemo()) return [
      { full_name:'Ana Curadora', role:'curator', institution:'Lab Escola' },
      { full_name:'Bruno Admin', role:'admin', institution:'HemoAtlas' },
      { full_name:'Carla Privacidade', role:'privacy_officer', institution:'Jurídico' },
      { full_name:'Diego Usuário', role:'user', institution:'Universidade' }
    ];
    const { data, error } = await HemoSupabase.client.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { toast(error.message, 'error'); cache.users = []; return []; }
    cache.users = data || [];
    return cache.users;
  }

  function publicImages() { return cache.publicImages || (isDemo() ? mockImages.filter(i => i.status === 'approved' && i.visibility === 'public' && !i.privacy_hold) : []); }

  function imageCard(i) {
    const src = i.image_url ? `<img src="${i.image_url}" class="w-full h-full object-cover" alt="${i.title}">` : '';
    const isHidden = i.status !== 'approved' || i.privacy_hold;
    return `<article class="image-card-pro hemo-card overflow-hidden ${isHidden ? 'is-muted' : ''}"><a href="imagem.html?id=${i.id}" class="image-thumb micro-pattern">${src}<span class="image-code">${i.code || 'HEM-NOVO'}</span></a><div class="image-card-body"><div class="flex flex-wrap gap-2 mb-3">${badge(i.status)}<span class="hemo-badge bg-slate-100 text-slate-600">${i.category || 'Sem categoria'}</span></div><h3>${i.title}</h3><p>${i.description || ''}</p><dl>${[['Material',i.material],['Coloração',i.staining],['Ampliação',i.magnification],['Diagnóstico',i.diagnosis]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b || '-'}</dd></div>`).join('')}</dl><div class="mt-4 flex gap-2"><a class="hemo-btn hemo-btn-primary flex-1" href="imagem.html?id=${i.id}">Detalhes</a><button class="hemo-btn hemo-btn-secondary" onclick="HemoApp.openReport('${i.id}')">Reportar</button></div></div></article>`;
  }

  function caseCard(c) {
    return `<article class="case-card-pro hemo-card"><div class="case-card-head"><span class="hemo-badge bg-blue-50 text-blue-700">${c.code || 'Caso'}</span>${badge(c.status)}</div><h3>${c.title}</h3><p class="case-meta">${c.patient_age_range || '-'} · ${c.patient_sex || '-'} · ${c.material || '-'}</p><div class="case-summary"><p><strong>Hipótese:</strong> ${c.hypothesis || '-'}</p><p><strong>Achados:</strong> ${c.main_findings || '-'}</p></div><a href="caso.html?id=${c.id}" class="hemo-btn hemo-btn-secondary w-full">Ver caso</a></article>`;
  }

  async function getImage(id) { return await loadImage(id); }
  async function getCase(id) { return await loadCase(id); }

  async function initHome() {
    await HemoAuth.loadSession();
    const statsRoot = q('#homeStats');
    const imagesRoot = q('#homeImages');
    if (!statsRoot && !imagesRoot) return;

    if (imagesRoot) imagesRoot.innerHTML = loading('Carregando imagens aprovadas...');

    const [publicImgs, cases] = await Promise.all([loadPublicImages(true), loadCases('published')]);
    const categoryCount = new Set(publicImgs.map(i => i.category).filter(Boolean)).size;

    if (statsRoot) {
      const stats = [
        ['Imagens aprovadas', publicImgs.length, 'catalogo.html'],
        ['Casos publicados', cases.length, 'casos.html'],
        ['Categorias públicas', categoryCount, 'catalogo.html']
      ];
      statsRoot.className = 'grid gap-4 md:grid-cols-3';
      statsRoot.innerHTML = stats.map(s => `<a class='home-stat-link' href='${s[2]}'><div class='hemo-card p-5'><strong class='text-3xl font-black text-[var(--wine)]'>${s[1]}</strong><p class='text-sm text-slate-500'>${s[0]}</p></div></a>`).join('');
    }

    if (imagesRoot) renderHomeImages(publicImgs, 1);
  }

  function renderHomeImages(imgs, page = 1) {
    const root = q('#homeImages');
    if (!root) return;
    const perPage = 3;
    const totalPages = Math.max(1, Math.ceil(imgs.length / perPage));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const slice = imgs.slice((safePage - 1) * perPage, safePage * perPage);
    root.innerHTML = slice.length ? slice.map(imageCard).join('') : empty('Nenhuma imagem aprovada encontrada.');
    let pager = q('#homeImagesPagination');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'homeImagesPagination';
      pager.className = 'mt-4 flex flex-wrap items-center gap-2';
      root.parentElement?.appendChild(pager);
    }
    pager.innerHTML = totalPages > 1 ? `<button class="hemo-btn hemo-btn-secondary" ${safePage <= 1 ? 'disabled' : ''} data-home-prev>Anterior</button><span class="px-3 py-2 text-sm font-bold">Página ${safePage} de ${totalPages}</span><button class="hemo-btn hemo-btn-secondary" ${safePage >= totalPages ? 'disabled' : ''} data-home-next>Próxima</button>` : '';
    q('[data-home-prev]')?.addEventListener('click', () => renderHomeImages(imgs, safePage - 1));
    q('[data-home-next]')?.addEventListener('click', () => renderHomeImages(imgs, safePage + 1));
  }

  async function initCommon() {
    setActiveNav();
    initMenu();
    applyAccessUiSnapshot(HemoAuth.cachedProfile?.());
    await applyAccessUi();
  }

  document.addEventListener('DOMContentLoaded', initCommon);

  return {
    q, qa, toast, params, badge, statusLabel, fmtDate, openReport, loading, empty,
    mockImages, mockCases, mockReports, mockLogs,
    publicImages, imageCard, caseCard, getImage, getCase,
    loadPublicImages, loadAllImages, loadCurationImages, loadCases, loadCase, loadReports, loadLogs, loadLGPDRequests, loadUsers,
    initHome, normalizeImages, applyAccessUiSnapshot
  };
})();
