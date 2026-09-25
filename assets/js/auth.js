/* ==========================================================================
   Nioushadow Blooms — espace client (connexion, compte, mot de passe)

   Fonctionne avec Supabase Auth (gratuit) :
   1. créer un projet sur https://supabase.com (région : Europe, Francfort) ;
   2. Project Settings → API : copier l’« URL » et la clé « anon public » ci-dessous ;
   3. Authentication → URL Configuration : ajouter l’adresse du site
      (ex. https://www.nioushadow-blooms.com) dans « Site URL » et « Redirect URLs ».
   La clé « anon » est prévue pour être publique : la sécurité est gérée par Supabase.
   Tant que ces deux lignes sont vides, les pages affichent « bientôt disponible ».
   ========================================================================== */
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const page = document.body.dataset.auth; // « login » ou « account »
  const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
  const client = configured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
    : null;
  const here = (file) => new URL(file, location.href).href;

  /* Messages d’erreur de Supabase, traduits */
  const ERRORS = [
    ['invalid login credentials', 'E-mail ou mot de passe incorrect.'],
    ['email not confirmed', 'Confirmez d’abord votre adresse : nous vous avons envoyé un e-mail.'],
    ['already registered', 'Un compte existe déjà avec cet e-mail. Connectez-vous, ou réinitialisez votre mot de passe.'],
    ['password should be', 'Le mot de passe doit contenir au moins 8 caractères.'],
    ['should be different', 'Choisissez un mot de passe différent de l’ancien.'],
    ['rate limit', 'Trop de tentatives. Réessayez dans quelques minutes.'],
    ['unable to validate email', 'Cet e-mail ne semble pas valide.'],
    ['failed to fetch', 'Connexion impossible. Vérifiez votre accès à Internet.'],
  ];
  const translate = (error) => {
    const msg = String((error && error.message) || '').toLowerCase();
    const hit = ERRORS.find(([key]) => msg.includes(key));
    return hit ? hit[1] : 'Une erreur est survenue. Réessayez, ou appelez-nous au +32 477 73 56 59.';
  };

  /* ------------------------------------------------------------------------
     Validation des champs (même présentation que le formulaire de commande)
     ------------------------------------------------------------------------ */
  const FIELD_MESSAGES = {
    email: {
      valueMissing: 'Merci d’indiquer votre e-mail.',
      typeMismatch: 'Cet e-mail ne semble pas valide (exemple : vous@exemple.be).',
      patternMismatch: 'Cet e-mail ne semble pas valide (exemple : vous@exemple.be).',
    },
    password: {
      valueMissing: 'Merci d’indiquer votre mot de passe.',
      tooShort: 'Au moins 8 caractères.',
      patternMismatch: 'Au moins 8 caractères, avec une lettre et un chiffre.',
    },
    confirm: { customError: 'Les deux mots de passe ne sont pas identiques.', valueMissing: 'Merci de confirmer le mot de passe.' },
    name: { valueMissing: 'Merci d’indiquer votre prénom.', tooShort: 'Votre prénom semble un peu court.' },
    phone: { patternMismatch: 'Ce numéro ne semble pas valide (exemple : +32 477 12 34 56).' },
    consent: { valueMissing: 'Merci d’accepter les conditions pour créer votre compte.' },
  };

  function validate(input) {
    const field = input.closest('.field');
    if (!field) return true;
    if (input.dataset.match) {
      const other = document.getElementById(input.dataset.match);
      input.setCustomValidity(other && other.value !== input.value ? 'différent' : '');
    }
    const ok = input.checkValidity();
    const error = $('[data-error]', field);
    if (error) {
      const texts = FIELD_MESSAGES[input.dataset.kind || input.name] || {};
      const order = ['valueMissing', 'typeMismatch', 'patternMismatch', 'tooShort', 'customError'];
      const key = order.find((k) => input.validity[k] && texts[k]);
      error.textContent = ok ? '' : (key ? texts[key] : input.validationMessage);
    }
    field.classList.toggle('is-invalid', !ok);
    input.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  function validateForm(form) {
    const inputs = $$('input[name]:not([type="hidden"]):not([name="_gotcha"])', form);
    const invalid = inputs.filter((input) => !validate(input));
    if (invalid.length) invalid[0].focus();
    return invalid.length === 0;
  }

  function wireLiveValidation(form) {
    $$('input[name]:not([name="_gotcha"])', form).forEach((input) => {
      input.addEventListener('blur', () => { if (input.type !== 'checkbox' && input.value) validate(input); });
      input.addEventListener('input', () => {
        if (input.closest('.field') && input.closest('.field').classList.contains('is-invalid')) validate(input);
      });
      input.addEventListener('change', () => { if (input.type === 'checkbox') validate(input); });
    });
  }

  function say(form, text, tone = 'info') {
    const box = $('[data-auth-alert]', form);
    if (!box) return;
    box.textContent = text;
    box.dataset.tone = tone;
    box.hidden = !text;
  }

  function busy(form, on) {
    const btn = $('button[type="submit"]', form);
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('is-sending', on);
  }

  /* Afficher / masquer le mot de passe */
  $$('[data-pw-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('aria-controls'));
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      $('use', btn).setAttribute('href', show ? '#eye-off' : '#eye');
    });
  });

  $$('[data-auth-form]').forEach(wireLiveValidation);

  /* Tant que l’espace client n’est pas branché : on le dit clairement */
  if (!configured) {
    $$('[data-auth-off]').forEach((el) => { el.hidden = false; });
    $$('[data-auth-form] button[type="submit"]').forEach((btn) => { btn.disabled = true; });
    if (page === 'account') location.replace(here('connexion.html'));
  }

  /* ------------------------------------------------------------------------
     Page de connexion : onglets, connexion, création de compte, oubli
     ------------------------------------------------------------------------ */
  if (page === 'login') {
    const tabs = $$('[role="tab"]');
    const views = $$('[data-view]');
    const show = (name) => {
      views.forEach((v) => { v.hidden = v.dataset.view !== name; });
      tabs.forEach((t) => {
        const on = t.dataset.show === name;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      const title = $(`[data-view="${name}"] input`);
      if (title && document.activeElement && document.activeElement.closest('[data-view]')) title.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t.dataset.show));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        show(next.dataset.show);
        next.focus();
      });
    });
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
      show(b.dataset.goto);
      const first = $(`[data-view="${b.dataset.goto}"] input`);
      if (first) first.focus();
    }));
    if (location.hash === '#creer-un-compte') show('signup');

    if (client) {
      client.auth.getSession().then(({ data }) => {
        if (data.session) location.replace(here('compte.html'));
      });
    }

    // Connexion
    const login = $('[data-auth-form="login"]');
    login.addEventListener('submit', async (e) => {
      e.preventDefault();
      say(login, '');
      if (!validateForm(login) || !client) return;
      busy(login, true);
      const { error } = await client.auth.signInWithPassword({
        email: login.email.value.trim(),
        password: login.password.value,
      });
      busy(login, false);
      if (error) { say(login, translate(error), 'error'); return; }
      location.href = here('compte.html');
    });

    // Création de compte (avec les mêmes protections anti-spam que la commande)
    const signup = $('[data-auth-form="signup"]');
    let startedAt = 0;
    signup.addEventListener('focusin', () => { if (!startedAt) startedAt = Date.now(); });
    signup.addEventListener('submit', async (e) => {
      e.preventDefault();
      say(signup, '');
      if (!validateForm(signup) || !client) return;
      if (signup._gotcha.value) return;
      if (!startedAt || Date.now() - startedAt < 3000) {
        say(signup, 'Un instant… vérifiez vos informations, puis validez à nouveau.');
        startedAt = startedAt || Date.now();
        return;
      }
      busy(signup, true);
      const { data, error } = await client.auth.signUp({
        email: signup.email.value.trim(),
        password: signup.password.value,
        options: {
          data: { name: signup.prenom.value.trim() },
          emailRedirectTo: here('compte.html'),
        },
      });
      busy(signup, false);
      if (error) { say(signup, translate(error), 'error'); return; }
      if (data.session) { location.href = here('compte.html'); return; }
      show('sent');
      $('[data-sent-email]').textContent = signup.email.value.trim();
    });

    // Mot de passe oublié
    const reset = $('[data-auth-form="reset"]');
    reset.addEventListener('submit', async (e) => {
      e.preventDefault();
      say(reset, '');
      if (!validateForm(reset) || !client) return;
      busy(reset, true);
      const { error } = await client.auth.resetPasswordForEmail(reset.email.value.trim(), {
        redirectTo: here('compte.html#nouveau-mot-de-passe'),
      });
      busy(reset, false);
      if (error) { say(reset, translate(error), 'error'); return; }
      say(reset, 'C’est envoyé ! Si un compte existe avec cet e-mail, vous recevrez un lien pour choisir un nouveau mot de passe.', 'success');
    });
  }

  /* ------------------------------------------------------------------------
     Page « Mon espace » : profil, mot de passe, déconnexion
     ------------------------------------------------------------------------ */
  if (page === 'account' && client) {
    const profile = $('[data-auth-form="profile"]');
    const password = $('[data-auth-form="password"]');

    const render = (user) => {
      const meta = user.user_metadata || {};
      const first = (meta.name || user.email.split('@')[0]).split(' ')[0];
      $$('[data-user-name]').forEach((el) => { el.textContent = first; });
      $$('[data-user-email]').forEach((el) => { el.textContent = user.email; });
      profile.prenom.value = meta.name || '';
      profile.phone.value = meta.phone || '';
      $('[data-account]').hidden = false;
      $('[data-account-loading]').hidden = true;
    };

    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        say(password, 'Choisissez votre nouveau mot de passe ci-dessous.', 'info');
        password.scrollIntoView({ block: 'center' });
        setTimeout(() => password.password.focus(), 400);
      }
    });

    client.auth.getSession().then(({ data }) => {
      if (!data.session) { location.replace(here('connexion.html')); return; }
      render(data.session.user);
      if (location.hash === '#nouveau-mot-de-passe') password.password.focus();
    });

    profile.addEventListener('submit', async (e) => {
      e.preventDefault();
      say(profile, '');
      if (!validateForm(profile)) return;
      busy(profile, true);
      const { data, error } = await client.auth.updateUser({
        data: { name: profile.prenom.value.trim(), phone: profile.phone.value.trim() },
      });
      busy(profile, false);
      if (error) { say(profile, translate(error), 'error'); return; }
      render(data.user);
      say(profile, 'C’est enregistré.', 'success');
    });

    password.addEventListener('submit', async (e) => {
      e.preventDefault();
      say(password, '');
      if (!validateForm(password)) return;
      busy(password, true);
      const { error } = await client.auth.updateUser({ password: password.password.value });
      busy(password, false);
      if (error) { say(password, translate(error), 'error'); return; }
      password.reset();
      say(password, 'Votre mot de passe a bien été changé.', 'success');
    });

    $('[data-logout]').addEventListener('click', async () => {
      await client.auth.signOut();
      location.replace(here('connexion.html'));
    });
  }
})();
