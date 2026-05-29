window.HemoImageDetail = (() => {
  async function loadComments(imageId) {
    if (!HemoSupabase.isConfigured()) {
      return [{ comment:'Comentário educacional para discussão morfológica.', profiles:{ full_name:'Curador demo' } }];
    }
    // Não usamos embed profiles(full_name) aqui porque comments.user_id referencia auth.users,
    // não profiles diretamente. Sem FK direta, o PostgREST retorna PGRST200.
    const { data, error } = await HemoSupabase.client
      .from('comments')
      .select('*')
      .eq('image_id', imageId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Erro ao carregar comentários:', error);
      return [];
    }
    return data || [];
  }

  async function addFavorite(imageId) {
    const auth = await HemoAuth.requireAuth();
    if (!HemoSupabase.isConfigured()) return HemoApp.toast('Favorito salvo em modo demonstração.');
    const { error } = await HemoSupabase.client.from('favorites').upsert({ user_id: auth.currentUser.id, image_id: imageId });
    if (error) return HemoApp.toast(error.message, 'error');
    HemoApp.toast('Favorito salvo.');
  }

  async function addComment(imageId, text) {
    const auth = await HemoAuth.requireAuth();
    if (!text.trim()) return;
    if (!HemoSupabase.isConfigured()) return HemoApp.toast('Comentário registrado em modo demonstração.');
    const { error } = await HemoSupabase.client.from('comments').insert({ image_id: imageId, user_id: auth.currentUser.id, comment: text.trim() });
    if (error) return HemoApp.toast(error.message, 'error');
    HemoApp.toast('Comentário registrado.');
    init();
  }

  async function init() {
    const id = HemoApp.params().get('id');
    const root = HemoApp.q('#imageDetail');
    if (!root) return;
    root.innerHTML = HemoApp.loading('Carregando imagem...');

    const img = await HemoApp.getImage(id);
    if (!img) {
      root.innerHTML = HemoApp.empty('Imagem não encontrada ou sem permissão de acesso.');
      return;
    }

    const comments = await loadComments(img.id);
    root.innerHTML = `<div class="grid gap-6 lg:grid-cols-[1fr_.8fr]"><section class="hemo-card overflow-hidden"><div class="micro-pattern min-h-[420px] grid place-items-center">${img.image_url?`<img src="${img.image_url}" class="max-h-[620px] w-full object-contain" alt="${img.title}">`:`<span class="rounded-full bg-white/85 px-4 py-2 font-black text-[var(--wine)]">Imagem microscópica</span>`}</div><div class="p-5 flex flex-wrap gap-2"><button class="hemo-btn hemo-btn-primary" data-fav>Favoritar</button><button class="hemo-btn hemo-btn-secondary" data-copy>Copiar referência</button><button class="hemo-btn hemo-btn-secondary" data-report>Reportar imagem</button></div></section><aside class="hemo-card p-5"><div class="flex flex-wrap gap-2">${HemoApp.badge(img.status)}<span class="hemo-badge bg-slate-100 text-slate-600">${img.category || 'Sem categoria'}</span></div><h1 class="mt-4 text-3xl font-black text-[var(--deep)]">${img.title}</h1><p class="mt-2 text-sm font-bold text-slate-500">${img.code || 'HEM-NOVO'}</p><p class="mt-5 leading-8 text-slate-600">${img.description || ''}</p><dl class="mt-6 grid grid-cols-2 gap-3 text-sm">${[['Material',img.material],['Linhagem',img.lineage],['Achado',img.finding_type],['Coloração',img.staining],['Ampliação',img.magnification],['Diagnóstico',img.diagnosis],['Autor',img.author_name],['Instituição',img.institution],['Aprovação',HemoApp.fmtDate(img.reviewed_at)],['Submissão',HemoApp.fmtDate(img.created_at)]].map(([a,b])=>`<div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs text-slate-400">${a}</dt><dd class="font-black">${b || '-'}</dd></div>`).join('')}</dl><div class="mt-5"><h3 class="font-black">Tags</h3><div class="mt-2 flex flex-wrap gap-2">${(img.tags||[]).map(t=>`<span class="hemo-badge bg-purple-50 text-purple-700">${t}</span>`).join('') || '<span class="text-sm text-slate-500">Sem tags.</span>'}</div></div></aside></div><section class="hemo-card p-5 mt-6"><h2 class="text-xl font-black text-[var(--deep)]">Comentários técnicos</h2><div id="comments" class="mt-4 grid gap-3">${comments.length ? comments.map(c=>`<div class="rounded-xl bg-slate-50 p-3 text-sm"><strong>${c.profiles?.full_name || c.author_name || 'Usuário'}</strong><p class="mt-1 text-slate-600">${c.comment}</p></div>`).join('') : '<p class="text-sm text-slate-500">Nenhum comentário.</p>'}</div><form id="commentForm" class="mt-4 flex flex-col gap-3 md:flex-row"><input class="hemo-input" name="comment" placeholder="Adicionar comentário técnico"><button class="hemo-btn hemo-btn-primary">Comentar</button></form></section><section class="mt-6"><h2 class="text-xl font-black text-[var(--deep)]">Imagens relacionadas</h2><div id="relatedImages" class="mt-4 grid gap-5 md:grid-cols-3"></div></section>`;

    HemoApp.q('[data-fav]')?.addEventListener('click',()=>addFavorite(img.id));
    HemoApp.q('[data-copy]')?.addEventListener('click',()=>{ navigator.clipboard?.writeText(`${img.code || ''} — ${img.title}`); HemoApp.toast('Referência copiada.'); });
    HemoApp.q('[data-report]')?.addEventListener('click',()=>HemoApp.openReport(img.id));
    HemoApp.q('#commentForm')?.addEventListener('submit',e=>{e.preventDefault(); addComment(img.id, e.target.comment.value); e.target.reset();});

    const related = (await HemoApp.loadPublicImages()).filter(x => x.id !== img.id).slice(0,3);
    const relRoot = HemoApp.q('#relatedImages');
    if (relRoot) relRoot.innerHTML = related.length ? related.map(HemoApp.imageCard).join('') : HemoApp.empty('Nenhuma imagem relacionada.');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
