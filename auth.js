/**
 * AUTH.JS — Autenticación y sincronización en la nube
 * Inmuebles Sist · Firebase Authentication + Cloud Firestore
 */

const Auth = (() => {
  let _auth = null;
  let _db   = null;
  let _user = null;
  let _appInitialized = false;

  const $ = id => document.getElementById(id);

  // ── Pantalla de auth ──
  function showAuthScreen() { $('authScreen').style.display = 'flex'; }
  function hideAuthScreen() { $('authScreen').style.display = 'none'; }

  // ── Tabs ──
  function showTab(tab) {
    clearError();
    const isLogin = tab === 'login';
    $('authTabLogin').classList.toggle('active', isLogin);
    $('authTabSignup').classList.toggle('active', !isLogin);
    $('authSignupExtra').style.display = isLogin ? 'none' : '';
    $('authSubmitBtn').textContent = isLogin ? 'Ingresar' : 'Crear cuenta';
  }

  // ── Errores ──
  function showError(msg) {
    const el = $('authError');
    if (!el) return;
    el.textContent = msg;
    el.style.display = '';
  }
  function clearError() {
    const el = $('authError');
    if (el) el.style.display = 'none';
  }

  function setLoading(on) {
    const btn = $('authSubmitBtn');
    if (!btn) return;
    btn.disabled = on;
    if (!on) {
      const isLogin = $('authTabLogin').classList.contains('active');
      btn.textContent = isLogin ? 'Ingresar' : 'Crear cuenta';
    } else {
      btn.textContent = 'Cargando...';
    }
  }

  // ── Enviar formulario ──
  async function submit() {
    clearError();
    const email    = ($('authEmail').value || '').trim();
    const password = $('authPassword').value || '';
    const isLogin  = $('authTabLogin').classList.contains('active');

    if (!email || !password) { showError('Completá todos los campos.'); return; }

    if (!isLogin) {
      const confirm = $('authPasswordConfirm').value || '';
      if (password.length < 6)  { showError('La contraseña debe tener al menos 6 caracteres.'); return; }
      if (password !== confirm)  { showError('Las contraseñas no coinciden.'); return; }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await _auth.signInWithEmailAndPassword(email, password);
      } else {
        await _auth.createUserWithEmailAndPassword(email, password);
      }
    } catch (err) {
      setLoading(false);
      showError(translateError(err.code));
    }
  }

  function translateError(code) {
    const map = {
      'auth/user-not-found':          'No existe una cuenta con ese email.',
      'auth/wrong-password':          'Contraseña incorrecta.',
      'auth/invalid-credential':      'Email o contraseña incorrectos.',
      'auth/email-already-in-use':    'Ya existe una cuenta con ese email.',
      'auth/invalid-email':           'El email ingresado no es válido.',
      'auth/weak-password':           'La contraseña es muy débil (mínimo 6 caracteres).',
      'auth/too-many-requests':       'Demasiados intentos. Esperá unos minutos e intentá de nuevo.',
      'auth/network-request-failed':  'Sin conexión a internet.',
    };
    return map[code] || `Error al autenticar. Intentá de nuevo. (${code})`;
  }

  // ── Cerrar sesión ──
  async function logout() {
    try {
      localStorage.removeItem('inmuebles_sist_v1');
      await _auth.signOut();
    } catch (e) {
      console.warn('Error al cerrar sesión:', e);
    }
    location.reload();
  }

  // ── Sincronizar datos a la nube ──
  async function syncToCloud() {
    if (!_user || !_db) return;
    const data = JSON.parse(localStorage.getItem('inmuebles_sist_v1') || '{"investments":[]}');
    try {
      await _db.collection('portfolios').doc(_user.uid).set(data);
    } catch (e) {
      console.warn('Error al sincronizar con la nube:', e);
    }
  }

  // ── Cargar datos desde la nube ──
  async function loadFromCloud(uid) {
    try {
      const doc = await _db.collection('portfolios').doc(uid).get();
      if (doc.exists) {
        // Hay datos en la nube → los usamos
        localStorage.setItem('inmuebles_sist_v1', JSON.stringify(doc.data()));
      } else {
        // Usuario nuevo → migrar datos locales si existen
        const local = localStorage.getItem('inmuebles_sist_v1');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.investments && parsed.investments.length > 0) {
            await _db.collection('portfolios').doc(uid).set(parsed);
          }
        }
      }
    } catch (e) {
      console.warn('Error cargando datos de la nube (usando datos locales):', e);
    }
  }

  // ── Actualizar sidebar con info del usuario ──
  function updateSidebarUser(user) {
    const emailEl  = $('sidebarUserEmail');
    const avatarEl = $('sidebarUserAvatar');
    const userInfo = $('sidebarUserInfo');
    const localEl  = $('sidebarLocalMode');
    if (emailEl)  emailEl.textContent  = user.email;
    if (avatarEl) avatarEl.textContent = user.email.charAt(0).toUpperCase();
    if (userInfo) userInfo.style.display = '';
    if (localEl)  localEl.style.display  = 'none';
    // Topbar user info
    const topbarUser  = $('topbarUser');
    const topbarEmail = $('topbarUserEmail');
    if (topbarUser)  topbarUser.style.display  = '';
    if (topbarEmail) topbarEmail.textContent   = user.email;
  }

  // ── Inicializar ──
  function init() {
    // Permitir Enter para enviar el formulario
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && $('authScreen') && $('authScreen').style.display !== 'none') {
        e.preventDefault();
        submit();
      }
    });

    if (!window.FIREBASE_ENABLED) {
      // Sin Firebase → modo local, mostrar app directo
      hideAuthScreen();
      const localEl = $('sidebarLocalMode');
      if (localEl) localEl.style.display = '';
      if (!_appInitialized) { _appInitialized = true; App.init(); }
      return;
    }

    try {
      // Evitar inicializar dos veces si la página se recarga en caliente
      const app = firebase.apps.length
        ? firebase.apps[0]
        : firebase.initializeApp(firebaseConfig);
      _auth = firebase.auth(app);
      _db   = firebase.firestore(app);

      _auth.onAuthStateChanged(async (user) => {
        setLoading(false);
        _user = user;
        if (user) {
          await loadFromCloud(user.uid);
          hideAuthScreen();
          updateSidebarUser(user);
          if (!_appInitialized) { _appInitialized = true; App.init(); }
          else App.showView('resumen');
        } else {
          showAuthScreen();
          showTab('login');
        }
      });
    } catch (e) {
      console.error('Error iniciando Firebase:', e);
      // No ocultar la pantalla de auth — mostrar el error dentro de ella
      showError('No se pudo conectar con Firebase. Verificá tu conexión a internet y recargá la página.');
    }
  }

  return {
    init, submit, showTab, logout, syncToCloud,
    get currentUser() { return _user; },
  };
})();

document.addEventListener('DOMContentLoaded', Auth.init);
