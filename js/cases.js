window.HemoCases = (() => {
  async function initList(){
    const root = HemoApp.q('#casesGrid'); if (!root) return;
    root.innerHTML = HemoApp.loading('Carregando casos...');
    const cases = await HemoApp.loadCases('published');
    root.innerHTML = cases.length ? `<div class="case-directory">${cases.map(HemoApp.caseCard).join('')}</div>` : HemoApp.empty('Nenhum caso publicado.');
  }
  async function loadLinked(caseId){
    if (!caseId || !HemoSupabase.isConfigured()) return [];
    const { data, error } = await HemoSupabase.client
      .from('case_images')
      .select('image_id, images(*, image_categories(name))')
      .eq('case_id', caseId);
    if (error) { console.warn(error); return []; }
    const imgs = (data || []).map(x => x.images).filter(Boolean);
    return HemoApp.normalizeImages(imgs);
  }
  async function initDetail(){
    const root = HemoApp.q('#caseDetail'); if (!root) return;
    root.innerHTML = HemoApp.loading('Carregando caso...');
    const c = await HemoApp.getCase(HemoApp.params().get('id'));
    if (!c) { root.innerHTML = HemoApp.empty('Caso não encontrado.'); return; }
    const images = await loadLinked(c.id);
    root.innerHTML = `<article class="hemo-card case-detail-card"><div class="flex flex-wrap gap-2">${HemoApp.badge(c.status)}<span class="hemo-badge bg-blue-50 text-blue-700">${c.code || '-'}</span><span class="hemo-badge bg-slate-100 text-slate-600">${c.difficulty_level || '-'}</span></div><h1>${c.title}</h1><dl class="case-facts">${[['Faixa etária',c.patient_age_range],['Sexo',c.patient_sex],['Material',c.material],['Hipótese',c.hypothesis]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b || '-'}</dd></div>`).join('')}</dl><section class="legal-prose"><h2>Resumo clínico anonimizado</h2><p>${c.clinical_summary || '-'}</p><h2>Principais achados</h2><p>${c.main_findings || '-'}</p><h2>Aviso</h2><p>Conteúdo educacional e científico. Não substitui avaliação diagnóstica profissional. Não há dados identificáveis de paciente.</p></section></article><section class="mt-6"><div class="flex items-center justify-between gap-4"><h2 class="text-xl font-black text-[var(--deep)]">Imagens vinculadas</h2><span class="hemo-badge bg-slate-100 text-slate-700">${images.length} imagem(ns)</span></div><div class="mt-4 grid gap-5 md:grid-cols-3">${images.length ? images.map(HemoApp.imageCard).join('') : HemoApp.empty('Nenhuma imagem foi vinculada a este caso pela equipe.')}</div></section>`;
  }
  document.addEventListener('DOMContentLoaded',()=>{initList();initDetail();});
})();
