window.HemoUpload = (() => {
  async function init() {
    const form = HemoApp.q('#uploadForm');
    if (!form) return;
    await HemoAuth.requireAuth();

    form.addEventListener('submit', async e => {
      e.preventDefault();

      const session = await HemoAuth.requireAuth();

      if (!session || !session.currentUser || !session.currentUser.id) {
        return HemoApp.toast('Você precisa estar logado para enviar imagens.', 'error');
      }

      const fd = new FormData(form);

      const checks = [
        'lgpd_no_identifiable_data',
        'lgpd_educational_authorization',
        'lgpd_source_authorization',
        'lgpd_metadata_removed'
      ].every(name => fd.get(name));

      if (!checks) {
        return HemoApp.toast('Todas as declarações LGPD obrigatórias precisam ser aceitas.', 'error');
      }

      try {
        let image_path = null;
        const file = fd.get('file');

        if (HemoSupabase.isConfigured() && file && file.size) {
          image_path = await HemoSupabase.uploadPrivate(file, session.currentUser.id);
        }

        const payload = {
          title: fd.get('title'),
          description: fd.get('description'),
          material: fd.get('material'),
          lineage: fd.get('lineage'),
          finding_type: fd.get('finding_type'),
          staining: fd.get('staining'),
          magnification: fd.get('magnification'),
          diagnosis: fd.get('diagnosis'),

          // ESSENCIAL PARA PASSAR NA RLS
          author_id: session.currentUser.id,

          author_name: fd.get('author_name'),
          institution: fd.get('institution'),

          allow_educational_download: fd.get('allow_educational_download') === 'yes',

          lgpd_no_identifiable_data: true,
          lgpd_educational_authorization: true,
          lgpd_source_authorization: true,
          lgpd_metadata_removed: true,

          status: 'pending',
          visibility: 'private',
          privacy_hold: false,

          image_path
        };

        console.log('Payload enviado para images:', payload);

        if (HemoSupabase.isConfigured()) {
          const { error } = await HemoSupabase.client
            .from('images')
            .insert(payload);

          if (error) throw error;
        }

        form.reset();
        HemoApp.q('#uploadSuccess')?.classList.remove('hidden');
        HemoApp.toast('Imagem enviada para curadoria.');
      } catch (err) {
        console.error('Erro ao enviar imagem:', err);
        HemoApp.toast(HemoSupabase.errorMessage(err), 'error');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();