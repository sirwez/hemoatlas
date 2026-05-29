window.HemoCatalogo = (() => {
  let state = { q:'', material:'', lineage:'', finding_type:'', diagnosis:'', category:'', page:1, perPage:9, view:'grid', sort:'recent' };
  let images = [];

  function values(key) {
    return [...new Set(images.map(i => i[key]).filter(Boolean))].sort();
  }

  function initFilters() {
    const wrap = HemoApp.q('#filters');
    if (!wrap) return;

    const filterDefs = [
      ['material','Material biológico'],
      ['lineage','Linhagem'],
      ['finding_type','Tipo de achado'],
      ['diagnosis','Diagnóstico associado'],
      ['category','Categoria']
    ];

    wrap.innerHTML = filterDefs.map(([k,l]) => `<label><span class="hemo-label">${l}</span><select class="hemo-select" data-filter="${k}"><option value="">Todos</option>${values(k).map(v=>`<option>${v}</option>`).join('')}</select></label>`).join('') + `<button class="hemo-btn hemo-btn-secondary w-full" data-clear>Limpar filtros</button>`;

    HemoApp.qa('[data-filter]').forEach(el => el.addEventListener('change', e => {
      state[e.target.dataset.filter] = e.target.value;
      state.page = 1;
      render();
    }));

    HemoApp.q('[data-clear]')?.addEventListener('click', () => {
      state = { ...state, q:'', material:'', lineage:'', finding_type:'', diagnosis:'', category:'', page:1 };
      const search = HemoApp.q('#catalogSearch'); if (search) search.value = '';
      HemoApp.qa('[data-filter]').forEach(e => e.value = '');
      render();
    });
  }

  function filtered() {
    let list = [...images];
    const q = state.q.toLowerCase();
    if (q) list = list.filter(i => [i.title,i.description,i.diagnosis,i.category,i.material,i.lineage,i.finding_type,(i.tags||[]).join(' ')].join(' ').toLowerCase().includes(q));
    ['material','lineage','finding_type','diagnosis','category'].forEach(k => { if (state[k]) list = list.filter(i => i[k] === state[k]); });
    if (state.sort === 'title') list.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')));
    else list.sort((a,b)=>new Date(b.created_at || 0)-new Date(a.created_at || 0));
    return list;
  }

  function render() {
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length/state.perPage));
    state.page = Math.min(state.page, totalPages);
    const pageItems = list.slice((state.page-1)*state.perPage, state.page*state.perPage);
    const grid = HemoApp.q('#catalogGrid');
    if (!grid) return;
    grid.className = state.view === 'grid' ? 'grid gap-5 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-4';
    grid.innerHTML = pageItems.length ? pageItems.map(i => HemoApp.imageCard(i)).join('') : HemoApp.empty('Nenhuma imagem aprovada encontrada.');
    const count = HemoApp.q('#catalogCount'); if (count) count.textContent = `${list.length} imagens aprovadas`;
    const pagination = HemoApp.q('#pagination');
    if (pagination) {
      pagination.innerHTML = `<button class="hemo-btn hemo-btn-secondary" ${state.page<=1?'disabled':''} data-prev>Anterior</button><span class="px-4 py-2 text-sm font-bold">Página ${state.page} de ${totalPages}</span><button class="hemo-btn hemo-btn-secondary" ${state.page>=totalPages?'disabled':''} data-next>Próxima</button>`;
      HemoApp.q('[data-prev]')?.addEventListener('click',()=>{state.page--;render();});
      HemoApp.q('[data-next]')?.addEventListener('click',()=>{state.page++;render();});
    }
  }

  async function init() {
    const grid = HemoApp.q('#catalogGrid');
    if (!grid) return;
    grid.innerHTML = HemoApp.loading('Carregando catálogo...');
    images = await HemoApp.loadPublicImages(true);
    initFilters();
    render();
    HemoApp.q('#catalogSearch')?.addEventListener('input',e=>{state.q=e.target.value; state.page=1; render();});
    HemoApp.q('#sortSelect')?.addEventListener('change',e=>{state.sort=e.target.value; render();});
    HemoApp.q('#gridView')?.addEventListener('click',()=>{state.view='grid'; render();});
    HemoApp.q('#listView')?.addEventListener('click',()=>{state.view='list'; render();});
    HemoApp.q('#filterToggle')?.addEventListener('click',()=>HemoApp.q('#filterBody')?.classList.toggle('show'));
  }

  document.addEventListener('DOMContentLoaded', init);
  return { render };
})();
