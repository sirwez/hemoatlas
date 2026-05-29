// HemoAtlas v6 — UI/UX polishing layer
(function(){
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const safe = v => v || '-';
  const statusLabel = s => HemoApp.statusLabel ? HemoApp.statusLabel(s) : s;

  function imageCard(i){
    const src = i.image_url ? `<img src="${esc(i.image_url)}" class="w-full h-full object-cover" alt="${esc(i.title)}">` : '';
    const isHidden = i.status !== 'approved' || i.privacy_hold;
    return `<article class="image-card-pro hemo-card overflow-hidden ${isHidden ? 'is-muted' : ''}">
      <a href="imagem.html?id=${esc(i.id)}" class="image-thumb micro-pattern" aria-label="Abrir ${esc(i.title)}">${src}<span class="image-code">${esc(i.code || 'HEM-NOVO')}</span></a>
      <div class="image-card-body">
        <div class="flex flex-wrap gap-2 mb-3">${HemoApp.badge(i.status)}<span class="hemo-badge bg-slate-100 text-slate-600">${esc(i.category || 'Sem categoria')}</span></div>
        <h3 class="line-clamp-2">${esc(i.title)}</h3>
        <p>${esc(i.description || 'Imagem hematológica revisada para fins educacionais.')}</p>
        <dl>${[['Material',i.material],['Coloração',i.staining],['Ampliação',i.magnification],['Diagnóstico',i.diagnosis]].map(([a,b])=>`<div><dt>${a}</dt><dd>${esc(safe(b))}</dd></div>`).join('')}</dl>
        <div class="mt-4 grid grid-cols-2 gap-2"><a class="hemo-btn hemo-btn-primary" href="imagem.html?id=${esc(i.id)}">Detalhes</a><button class="hemo-btn hemo-btn-secondary" onclick="HemoApp.openReport('${esc(i.id)}')">Reportar</button></div>
      </div>
    </article>`;
  }

  function caseCard(c){
    const imgCount = c.image_count ?? c.images_count ?? c.linked_count ?? 0;
    return `<article class="case-card-pro hemo-card">
      <div class="case-card-head"><span class="hemo-badge bg-blue-50 text-blue-700">${esc(c.code || 'Caso')}</span>${HemoApp.badge(c.status)}</div>
      <h3 class="line-clamp-2">${esc(c.title)}</h3>
      <p class="case-meta">${esc(c.patient_age_range || '-')} · ${esc(c.patient_sex || '-')} · ${esc(c.material || '-')}</p>
      <div class="case-summary"><p><strong>Hipótese:</strong> ${esc(c.hypothesis || '-')}</p><p><strong>Achados:</strong> ${esc(c.main_findings || '-')}</p></div>
      <div class="case-card-footer"><span>${imgCount} imagem(ns) vinculada(s)</span><a href="caso.html?id=${esc(c.id)}" class="hemo-btn hemo-btn-secondary">Ver caso</a></div>
    </article>`;
  }

  async function initHome(){
    await HemoAuth.loadSession();
    const statsRoot = HemoApp.q('#homeStats');
    const imagesRoot = HemoApp.q('#homeImages');
    if (!statsRoot && !imagesRoot) return;
    if (imagesRoot) imagesRoot.innerHTML = HemoApp.loading('Carregando imagens aprovadas...');
    const [publicImgs, cases] = await Promise.all([HemoApp.loadPublicImages(true), HemoApp.loadCases('published')]);
    const categoryCount = new Set(publicImgs.map(i => i.category).filter(Boolean)).size;
    if (statsRoot) {
      const stats = [
        ['Imagens aprovadas', publicImgs.length, 'catalogo.html', 'Coleção pública revisada'],
        ['Casos publicados', cases.length, 'casos.html', 'Discussões educacionais'],
        ['Categorias públicas', categoryCount, 'catalogo.html', 'Organização morfológica']
      ];
      statsRoot.className = 'home-stats-grid';
      statsRoot.innerHTML = stats.map(s => `<a class='home-stat-link' href='${s[2]}'><div class='hemo-card home-stat-card'><span>${esc(s[0])}</span><strong>${s[1]}</strong><p>${esc(s[3])}</p></div></a>`).join('');
    }
    if (imagesRoot) renderHomeImages(publicImgs, 1);
  }

  function renderHomeImages(imgs, page = 1){
    const root = HemoApp.q('#homeImages'); if(!root) return;
    const perPage = 3, totalPages = Math.max(1, Math.ceil(imgs.length/perPage));
    const safePage = Math.min(Math.max(page,1), totalPages);
    const slice = imgs.slice((safePage-1)*perPage, safePage*perPage);
    root.className = slice.length === 1 ? 'home-single-image' : 'mt-4 image-grid-polished';
    root.innerHTML = slice.length ? slice.map(imageCard).join('') : HemoApp.empty('Nenhuma imagem aprovada encontrada.');
    let pager = HemoApp.q('#homeImagesPagination');
    if(!pager){ pager=document.createElement('div'); pager.id='homeImagesPagination'; pager.className='mt-5 flex flex-wrap items-center gap-2'; root.parentElement?.appendChild(pager); }
    pager.innerHTML = totalPages > 1 ? `<button class="hemo-btn hemo-btn-secondary" ${safePage<=1?'disabled':''} data-home-prev>Anterior</button><span class="px-3 py-2 text-sm font-bold">Página ${safePage} de ${totalPages}</span><button class="hemo-btn hemo-btn-secondary" ${safePage>=totalPages?'disabled':''} data-home-next>Próxima</button>` : '';
    HemoApp.q('[data-home-prev]')?.addEventListener('click',()=>renderHomeImages(imgs,safePage-1));
    HemoApp.q('[data-home-next]')?.addEventListener('click',()=>renderHomeImages(imgs,safePage+1));
  }

  HemoApp.imageCard = imageCard;
  HemoApp.caseCard = caseCard;
  HemoApp.initHome = initHome;
})();
