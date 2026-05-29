window.HemoLGPD = (() => {
  function init() {
    const form = HemoApp.q('#lgpdRequestForm'); if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = { requester_name: fd.get('requester_name'), requester_email: fd.get('requester_email'), request_type: fd.get('request_type'), related_image_id: fd.get('related_image_id') || null, related_case_id: fd.get('related_case_id') || null, description: fd.get('description'), status:'open' };
      try { if (HemoSupabase.isConfigured()) { const { error } = await HemoSupabase.client.from('lgpd_requests').insert(payload); if (error) throw error; } form.reset(); HemoApp.toast('Solicitação LGPD registrada.'); } catch(err){ HemoApp.toast(HemoSupabase.errorMessage(err),'error'); }
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
