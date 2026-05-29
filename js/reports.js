window.HemoReports = (() => {
  async function createReport(fd) {
    const reason = fd.get('reason');
    const auth = await HemoAuth.loadSession();
    const payload = {
      image_id: fd.get('image_id') || null,
      comment_id: fd.get('comment_id') || null,
      reporter_id: auth.user?.id || null,
      reason,
      description: fd.get('description'),
      reporter_email: auth.user?.email || fd.get('reporter_email') || null,
      status: 'open',
      priority: reason === 'possible_identifiable_data' ? 'high' : 'normal'
    };

    try {
      if (HemoSupabase.isConfigured()) {
        const { error } = await HemoSupabase.client.from('reports').insert(payload);
        if (error) throw error;

        // Usuários comuns não podem alterar imagens diretamente por RLS.
        // Admin/curator/privacy_officer conseguem aplicar privacy_hold no painel de Reports.
        if (reason === 'possible_identifiable_data' && payload.image_id && HemoAuth.isAdminLike()) {
          await HemoSupabase.client
            .from('images')
            .update({ status:'privacy_review', privacy_hold:true, visibility:'private' })
            .eq('id', payload.image_id);
        }
      }
      HemoApp.toast('Report enviado para análise. Se envolver privacidade, a equipe poderá ocultar a imagem preventivamente.');
    } catch (err) {
      HemoApp.toast(HemoSupabase.errorMessage(err), 'error');
    }
  }
  return { createReport };
})();
