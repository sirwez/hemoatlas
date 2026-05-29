/* HemoAtlas Supabase config
   Cole aqui suas credenciais públicas. Nunca use SERVICE_ROLE_KEY no frontend. */
window.HEMO_CONFIG = {
  SUPABASE_URL: 'https://sdeypewyberxhfkjsxni.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_uNXnloyWBXmR_3CXYfp_Ow_gRgbK9hw',
  STORAGE_BUCKET: 'hematology-images',
  SIGNED_URL_SECONDS: 3600
};
window.HemoSupabase = (() => {
  const cfg = window.HEMO_CONFIG;
  const configured = cfg.SUPABASE_URL.startsWith('https://') && !cfg.SUPABASE_ANON_KEY.includes('COLE_AQUI');
  const client = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }) : null;
  const isConfigured = () => Boolean(client);
  const errorMessage = (error) => error?.message || 'Erro inesperado no Supabase.';
  async function signedUrl(path, expiresIn = cfg.SIGNED_URL_SECONDS) {
    if (!client || !path) return null;
    const { data, error } = await client.storage.from(cfg.STORAGE_BUCKET).createSignedUrl(path, expiresIn);
    if (error) return null;
    return data?.signedUrl || null;
  }
  async function uploadPrivate(file, userId) {
    if (!client) throw new Error('Supabase não configurado.');
    if (!file) throw new Error('Arquivo não informado.');
    const clean = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
    const path = `${userId}/${Date.now()}-${clean}`;
    const { data, error } = await client.storage.from(cfg.STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data.path;
  }
  return { client, isConfigured, errorMessage, signedUrl, uploadPrivate };
})();
