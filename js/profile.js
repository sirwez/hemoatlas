window.HemoProfile = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let uploads = [];
  async function loadUploads(user){
    if (!HemoSupabase.isConfigured()) return [];
    const { data, error } = await HemoSupabase.client.from('images').select('*, image_categories(name)').eq('author_id', user.id).order('created_at', { ascending:false });
    if (error) { HemoApp.toast(error.message, 'error'); return []; }
    return HemoApp.normalizeImages(data || []);
  }
  async function loadReports(user){
    if (!HemoSupabase.isConfigured()) return [];
    const { data, error } = await HemoSupabase.client.from('reports').select('*').or(`reporter_id.eq.${user.id},reporter_email.eq.${user.email}`).order('created_at', { ascending:false });
    if (error) return [];
    return data || [];
  }
  function uploadItem(i){
    const canEdit = ['revision_required','pending'].includes(i.status) && !i.privacy_hold;
    return `<div class="profile-list-item"><div><strong>${esc(i.code || 'HEM-NOVO')} — ${esc(i.title)}</strong><p>${esc(i.review_note || i.rejection_reason || 'Sem observações da curadoria.')}</p></div><div class="flex flex-wrap gap-2">${HemoApp.badge(i.status)}${canEdit?`<button class="hemo-btn hemo-btn-secondary" onclick="HemoProfile.openEditUpload('${i.id}')">Editar</button>`:''}</div></div>`;
  }
  function reportItem(r){ return `<div class="profile-list-item"><div><strong>${esc(r.reason)}</strong><p>${esc(r.description || '-')}</p><small>${HemoApp.fmtDate(r.created_at)}</small></div>${HemoApp.badge(r.status)}</div>`; }
  function render(p,user,reports){
    const adjustments=uploads.filter(i=>i.status==='revision_required' || i.review_note || i.rejection_reason);
    HemoApp.q('#profileBox').innerHTML = `<section class="profile-layout"><aside class="profile-card hemo-card"><div class="profile-avatar">${esc((p.full_name||user.email||'U')[0]).toUpperCase()}</div><h2>${esc(p.full_name || p.email || user.email || 'Usuário')}</h2><p>${esc(p.email || user.email || '')}</p><div class="mt-4 flex flex-wrap gap-2">${HemoApp.badge(p.role || 'user')}<span class="hemo-badge bg-slate-100 text-slate-600">${esc(p.institution || 'Sem instituição')}</span></div><button class="hemo-btn hemo-btn-danger mt-5" onclick="HemoAuth.logout()">Sair</button></aside><section class="profile-main"><div class="profile-section"><div class="section-title-row"><h3>Meus uploads</h3><span>${uploads.length}</span></div>${uploads.length?uploads.map(uploadItem).join(''):HemoApp.empty('Nenhuma submissão encontrada.')}</div><div class="profile-section"><div class="section-title-row"><h3>Solicitações de ajuste</h3><span>${adjustments.length}</span></div><p class="profile-help">Quando a curadoria solicita correção, você pode editar a submissão. Ao salvar, ela volta para avaliação.</p>${adjustments.length?adjustments.map(uploadItem).join(''):HemoApp.empty('Nenhuma solicitação de ajuste no momento.')}</div><div class="profile-section"><div class="section-title-row"><h3>Meus reports</h3><span>${reports.length}</span></div>${reports.length?reports.map(reportItem).join(''):HemoApp.empty('Nenhum report enviado.')}</div></section></section>`;
  }
  function openEditUpload(id){
    const i = uploads.find(x => x.id === id); if (!i) return;
    HemoApp.q('#editUploadModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div id="editUploadModal" class="modal-backdrop show"><div class="modal-panel max-w-3xl p-5"><div class="flex items-start justify-between gap-4"><div><p class="hemo-label">Correção de submissão</p><h2 class="text-2xl font-black text-[var(--deep)]">${esc(i.code || 'HEM-NOVO')} — ${esc(i.title)}</h2><p class="mt-1 text-sm text-slate-500">Ao salvar, a imagem voltará para curadoria como pendente.</p></div><button class="hemo-btn hemo-btn-secondary" data-close>Fechar</button></div><form id="editUploadForm" class="admin-form-grid mt-5"><input name="title" class="hemo-input full" required value="${esc(i.title)}"><textarea name="description" class="hemo-textarea full" required>${esc(i.description || '')}</textarea><input name="material" class="hemo-input" placeholder="Material" value="${esc(i.material || '')}"><input name="lineage" class="hemo-input" placeholder="Linhagem" value="${esc(i.lineage || '')}"><input name="finding_type" class="hemo-input" placeholder="Tipo de achado" value="${esc(i.finding_type || '')}"><input name="staining" class="hemo-input" placeholder="Coloração" value="${esc(i.staining || '')}"><input name="magnification" class="hemo-input" placeholder="Ampliação" value="${esc(i.magnification || '')}"><input name="diagnosis" class="hemo-input" placeholder="Diagnóstico" value="${esc(i.diagnosis || '')}"><button class="hemo-btn hemo-btn-primary full">Salvar e reenviar para aprovação</button></form></div></div>`);
    const modal=HemoApp.q('#editUploadModal');
    modal.addEventListener('click', e => { if (e.target.matches('[data-close]') || e.target === modal) modal.remove(); });
    HemoApp.q('#editUploadForm').addEventListener('submit', async e => {
      e.preventDefault(); const fd=new FormData(e.target);
      const patch={ title:fd.get('title'), description:fd.get('description'), material:fd.get('material'), lineage:fd.get('lineage'), finding_type:fd.get('finding_type'), staining:fd.get('staining'), magnification:fd.get('magnification'), diagnosis:fd.get('diagnosis'), status:'pending', visibility:'private', privacy_hold:false, review_note:null, rejection_reason:null };
      const { error } = await HemoSupabase.client.from('images').update(patch).eq('id', id);
      if (error) return HemoApp.toast(error.message, 'error');
      HemoApp.toast('Submissão atualizada e reenviada para curadoria.'); modal.remove(); setTimeout(()=>location.reload(),600);
    });
  }
  async function init(){
    const box=HemoApp.q('#profileBox'); if(!box) return; box.innerHTML=HemoApp.loading('Carregando perfil...');
    await HemoAuth.requireAuth(); const p=HemoAuth.profile; const user=HemoAuth.user;
    const [u,r]=await Promise.all([loadUploads(user),loadReports(user)]); uploads=u; render(p,user,r);
  }
  document.addEventListener('DOMContentLoaded', init);
  return { openEditUpload };
})();
