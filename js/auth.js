window.HemoAuth = (() => {
  let currentUser = null;
  let currentProfile = null;

  const ADMIN_ROLES = ['admin', 'curator', 'privacy_officer'];
  const CACHE_KEY = 'hemo_auth_cache_v1';

  function cacheAuth(user, profile) {
    try {
      if (!user) return localStorage.removeItem(CACHE_KEY);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        id: user.id,
        email: user.email || profile?.email || '',
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email || '',
        institution: profile?.institution || user.user_metadata?.institution || '',
        role: profile?.role || 'user',
        status: profile?.status || 'active',
        cached_at: Date.now()
      }));
    } catch (_) {}
  }

  function cachedProfile() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) { return null; }
  }

  function isDemoMode() {
    return !HemoSupabase.isConfigured();
  }

  function demoProfile() {
    return JSON.parse(localStorage.getItem('hemo_demo_profile') || 'null') || null;
  }

  function makeDemoProfile(email = 'demo@hemoatlas.local') {
    const role = email.includes('curator') ? 'curator' : email.includes('privacy') ? 'privacy_officer' : email.includes('user') ? 'user' : 'admin';
    return {
      id: 'demo-user',
      email,
      full_name: email.split('@')[0],
      institution: 'Instituição Demo',
      role,
      status: 'active'
    };
  }

  async function loadSession() {
    if (isDemoMode()) {
      const demo = demoProfile();
      currentUser = demo;
      currentProfile = demo;
      cacheAuth(demo, demo);
      return { user: currentUser, profile: currentProfile };
    }

    const { data, error } = await HemoSupabase.client.auth.getSession();
    if (error) console.warn('Erro ao obter sessão:', error);

    currentUser = data?.session?.user || null;
    currentProfile = null;

    if (currentUser) {
      const { data: profile, error: profileError } = await HemoSupabase.client
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) console.warn('Erro ao carregar profile:', profileError);

      currentProfile = profile ? { ...profile, email: profile.email || currentUser.email } : {
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.user_metadata?.full_name || currentUser.email,
        institution: currentUser.user_metadata?.institution || '',
        role: 'user',
        status: 'active'
      };
    }

    if (currentUser) cacheAuth(currentUser, currentProfile);
    else cacheAuth(null, null);
    return { user: currentUser, profile: currentProfile };
  }

  async function login(email, password) {
    if (isDemoMode()) {
      const profile = makeDemoProfile(email);
      localStorage.setItem('hemo_demo_profile', JSON.stringify(profile));
      currentUser = profile;
      currentProfile = profile;
      HemoApp.toast('Login demo realizado. Configure o Supabase para autenticação real.');
      setTimeout(() => location.href = 'perfil.html', 300);
      return;
    }

    const { error } = await HemoSupabase.client.auth.signInWithPassword({ email, password });
    if (error) return HemoApp.toast(error.message, 'error');

    await loadSession();
    HemoApp.toast('Login realizado.');
    setTimeout(() => location.href = 'perfil.html', 300);
  }

  async function signup(email, password, fullName = '', institution = '') {
    if (isDemoMode()) return login(email, password);

    const { error } = await HemoSupabase.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, institution } }
    });

    if (error) return HemoApp.toast(error.message, 'error');
    HemoApp.toast('Cadastro criado. Verifique o e-mail se a confirmação estiver ativa.');
  }

  async function logout() {
    if (HemoSupabase.isConfigured()) await HemoSupabase.client.auth.signOut();
    localStorage.removeItem('hemo_demo_profile');
    localStorage.removeItem(CACHE_KEY);
    currentUser = null;
    currentProfile = null;
    HemoApp.toast('Sessão encerrada.');
    setTimeout(() => location.href = 'login.html', 300);
  }

  function hasRole(roles) {
    if (!currentProfile) return false;
    return roles.includes(currentProfile.role);
  }

  async function requireAuth() {
    await loadSession();
    if (!currentUser) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.href = `login.html?next=${next}`;
      throw new Error('Usuário não autenticado');
    }
    return { currentUser, currentProfile };
  }

  async function requireAdmin(roles = ADMIN_ROLES) {
    await loadSession();

    if (!currentUser) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.href = `login.html?next=${next}`;
      throw new Error('Usuário não autenticado');
    }

    if (!hasRole(roles)) {
      document.body.innerHTML = `<main class="hemo-shell py-12"><div class="hemo-card p-8"><h1 class="text-3xl font-black text-[var(--deep)]">Acesso restrito</h1><p class="mt-3 text-slate-600">Esta área exige permissões administrativas. A segurança real está nas policies RLS do Supabase.</p><div class="mt-6 flex gap-3"><a href="index.html" class="hemo-btn hemo-btn-secondary">Voltar ao início</a><a href="login.html" class="hemo-btn hemo-btn-primary">Entrar com outra conta</a></div></div></main>`;
      throw new Error('Acesso restrito');
    }

    return { currentUser, currentProfile };
  }

  async function refreshAuthLabel(el) {
    await loadSession();
    if (!el) return;
    el.textContent = currentUser ? (currentProfile?.full_name || currentUser.email || 'Perfil') : 'Entrar';
    if (currentUser) el.setAttribute('href', 'perfil.html');
    else el.setAttribute('href', 'login.html');
  }

  function isAuthenticated() {
    return Boolean(currentUser);
  }

  function isAdminLike() {
    return Boolean(currentProfile && ADMIN_ROLES.includes(currentProfile.role));
  }

  return {
    loadSession,
    login,
    signup,
    logout,
    requireAuth,
    requireAdmin,
    hasRole,
    refreshAuthLabel,
    isAuthenticated,
    isAdminLike,
    isDemoMode,
    cachedProfile,
    get profile() { return currentProfile; },
    get user() { return currentUser; }
  };
})();
