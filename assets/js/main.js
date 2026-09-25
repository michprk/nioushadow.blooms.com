/* ==========================================================================
   Nioushadow Blooms — interactions (toutes les pages)
   ========================================================================== */

/* -- Réglages ---------------------------------------------------------------
   FORM_ENDPOINT : laisser vide pour envoyer la demande via WhatsApp.
   Pour recevoir les demandes par e-mail, créer un formulaire gratuit sur
   https://formspree.io et coller son adresse ici, par ex.
   'https://formspree.io/f/abcdwxyz'
   -------------------------------------------------------------------------- */
const FORM_ENDPOINT = '';
const WHATSAPP_NUMBER = '32477735659';
const PHONE_DISPLAY = '+32 477 73 56 59';

/* Anti-spam */
const MIN_FILL_TIME = 3000;     // un humain met plus de 3 s à remplir le formulaire
const RESUBMIT_DELAY = 60000;   // une demande par minute au maximum
const MAX_LINKS = 1;            // liens autorisés dans le message

/* Cookies : le choix du visiteur est redemandé après 6 mois */
const CONSENT_KEY = 'nb-consent';
const CONSENT_MAX_AGE = 1000 * 60 * 60 * 24 * 182;

(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* stockage bloqué */ } },
  };

  /* ------------------------------------------------------------------------
     Photos : fondu à l’arrivée ; si le fichier manque, l’illustration reste
     ------------------------------------------------------------------------ */
  function watchPhoto(img) {
    const ready = () => img.classList.add('is-ready');
    const fail = () => img.remove();
    if (img.complete) {
      if (img.naturalWidth > 0) ready(); else fail();
    } else {
      img.addEventListener('load', ready, { once: true });
      img.addEventListener('error', fail, { once: true });
    }
  }
  $$('.ph img').forEach(watchPhoto);

  /* ------------------------------------------------------------------------
     Découpage du texte : lettres (logotype) et mots (titres)
     ------------------------------------------------------------------------ */
  function splitLetters(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            // Un mot = un bloc insécable, pour ne jamais couper « Blooms » en deux
            const word = document.createElement('span');
            word.className = 'wd';
            Array.from(part).forEach((char) => {
              const span = document.createElement('span');
              span.className = 'ch';
              span.style.setProperty('--i', i++);
              span.textContent = char;
              word.appendChild(span);
            });
            frag.appendChild(word);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add('is-split');
  }

  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = 'w';
            const inner = document.createElement('span');
            inner.style.setProperty('--wi', i++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  }

  $$('[data-letters]').forEach(splitLetters);
  $$('[data-split]').forEach(splitWords);

  /* Les lettres du logotype sautillent au passage de la souris */
  if (finePointer && !reduceMotion) {
    $$('.wordmark .ch').forEach((ch) => {
      ch.addEventListener('mouseenter', () => {
        if (ch.classList.contains('hop')) return;
        ch.classList.add('hop');
        ch.addEventListener('animationend', () => ch.classList.remove('hop'), { once: true });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Ouverture : on attend les polices pour éviter un saut de mise en page
     ------------------------------------------------------------------------ */
  const start = () => document.body.classList.add('is-loaded');
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))])
      .then(() => requestAnimationFrame(start));
  } else {
    start();
  }

  /* ------------------------------------------------------------------------
     Révélations au défilement
     ------------------------------------------------------------------------ */
  $$('.gallery__item').forEach((item, i) => item.style.setProperty('--gi', i));
  const revealables = $$('[data-reveal], [data-split]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------------------
     Moteur de défilement : navigation, barre de lecture, logotype,
     et « vent » dans les plantes selon la vitesse du défilement
     ------------------------------------------------------------------------ */
  const nav = $('[data-nav]');
  const hero = $('.hero');
  const heroMarks = $$('.hero .wordmark');
  const navFlower = $('.nav .logo__flower');
  const swayers = $$('.sway');
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  let menuOpen = false;
  let lastY = window.scrollY;
  let lastT = performance.now();
  let lastScrollAt = 0;
  let velocity = 0;   // pixels par image, lissé (partagé avec le bandeau de mots)
  let wind = 0;
  let scrollRaf = null;

  function scrollFrame(now) {
    const y = window.scrollY;
    const dt = Math.max(8, now - lastT);
    const dy = y - lastY;
    velocity += ((dy / dt) * 16 - velocity) * 0.25;

    if (nav) {
      nav.classList.toggle('is-scrolled', y > 40);
      if (!menuOpen) {
        if (y > 320 && dy > 2) nav.classList.add('is-hidden');
        else if (dy < -2 || y < 320) nav.classList.remove('is-hidden');
      }
    }

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;

    if (!reduceMotion) {
      if (hero && y < hero.offsetHeight + 200) {
        const drift = Math.min(y * 0.12, 120);
        if (heroMarks[0]) heroMarks[0].style.setProperty('--drift', `${-drift}px`);
        if (heroMarks[1]) heroMarks[1].style.setProperty('--drift', `${drift * 0.8}px`);
      }
      if (navFlower) navFlower.style.rotate = `${(y * 0.25) % 360}deg`;

      wind += (clamp(-velocity * 0.45, -8, 8) - wind) * 0.12;
      const w = `rotate(${wind.toFixed(2)}deg)`;
      swayers.forEach((el) => { el.style.transform = w; });
    }

    lastY = y;
    lastT = now;
    const idle = now - lastScrollAt > 180;
    if (idle) velocity *= 0.8;
    if (!idle || Math.abs(wind) > 0.03 || Math.abs(velocity) > 0.05) {
      scrollRaf = requestAnimationFrame(scrollFrame);
    } else {
      velocity = 0;
      scrollRaf = null;
    }
  }

  window.addEventListener('scroll', () => {
    lastScrollAt = performance.now();
    if (!scrollRaf) {
      lastT = lastScrollAt;
      scrollRaf = requestAnimationFrame(scrollFrame);
    }
  }, { passive: true });
  scrollRaf = requestAnimationFrame(scrollFrame);

  /* Hero : chaque objet bouge à sa profondeur, selon la souris */
  if (hero && finePointer && !reduceMotion) {
    let mx = 0, my = 0, tx = 0, ty = 0, raf = null;
    const loop = () => {
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;
      hero.style.setProperty('--mx', mx.toFixed(3));
      hero.style.setProperty('--my', my.toFixed(3));
      raf = Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002 ? requestAnimationFrame(loop) : null;
    };
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    hero.addEventListener('mouseleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    });
  }

  /* Lien actif : navigation principale et sommaire des pages légales */
  function spyOn(links) {
    if (!('IntersectionObserver' in window) || !links.length) return;
    const byId = new Map();
    links.forEach((a) => {
      const hash = a.getAttribute('href').split('#')[1];
      if (hash) byId.set(hash, a);
    });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((a) => a.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'true');
        } else if (link.getAttribute('aria-current')) {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }
  spyOn($$('.nav__links a[href^="#"]'));
  spyOn($$('.legal__toc a'));

  /* ------------------------------------------------------------------------
     Menu mobile
     ------------------------------------------------------------------------ */
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');

  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.querySelector('.sr-only').textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
    document.body.style.overflow = open ? 'hidden' : '';
    nav.classList.remove('is-hidden');
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    } else {
      menu.classList.remove('is-open');
      const done = () => { if (!menuOpen) menu.hidden = true; };
      if (reduceMotion) done(); else setTimeout(done, 700);
    }
    updateDock();
  }

  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!menuOpen));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', () => { if (menuOpen && window.innerWidth > 900) setMenu(false); });
  }

  /* ------------------------------------------------------------------------
     LE CTA : aimanté, pétales au clic, et toujours un seul visible
     ------------------------------------------------------------------------ */
  const ctas = $$('[data-cta]');
  const dock = $('[data-cta-dock]');
  const dockState = { origin: true, contact: false, footer: false, cookies: false };

  function updateDock() {
    if (!dock) return;
    const show = !dockState.origin && !dockState.contact && !dockState.footer && !dockState.cookies && !menuOpen;
    dock.classList.toggle('is-visible', show);
    dock.inert = !show;
  }

  if (dock && 'IntersectionObserver' in window) {
    const watch = (el, key, margin = '0px') => {
      if (!el) return;
      new IntersectionObserver(([entry]) => {
        dockState[key] = entry.isIntersecting;
        updateDock();
      }, { rootMargin: margin }).observe(el);
    };
    watch($('[data-cta-origin]'), 'origin');
    watch($('#contact'), 'contact', '0px 0px -30% 0px');
    watch($('.footer'), 'footer');
  }

  const petalColors = ['var(--lavender)', 'var(--olive)', 'var(--cream)', 'var(--lavender)'];
  function burst(x, y) {
    if (reduceMotion || !Element.prototype.animate) return;
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      p.style.background = petalColors[i % petalColors.length];
      document.body.appendChild(p);
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const dist = 50 + Math.random() * 70;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 30;
      const spin = (Math.random() - 0.5) * 540;
      p.animate([
        { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(.4)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy}px) rotate(${spin / 2}deg) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${x + dx * 1.15}px, ${y + dy + 70}px) rotate(${spin}deg) scale(.9)`, opacity: 0 },
      ], { duration: 1000 + Math.random() * 400, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => p.remove();
    }
  }

  ctas.forEach((cta) => {
    if (finePointer && !reduceMotion) {
      cta.addEventListener('mousemove', (e) => {
        const r = cta.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.18;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
        cta.style.setProperty('--tx', `${clamp(x, -10, 10).toFixed(1)}px`);
        cta.style.setProperty('--ty', `${clamp(y, -8, 8).toFixed(1)}px`);
      });
      cta.addEventListener('mouseleave', () => {
        cta.style.setProperty('--tx', '0px');
        cta.style.setProperty('--ty', '0px');
      });
    }
    cta.addEventListener('click', (e) => {
      const r = cta.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      burst(x, y);
    });
  });

  /* ------------------------------------------------------------------------
     Bandeau de mots : défile tout seul, plus vite quand on fait défiler
     ------------------------------------------------------------------------ */
  const marquee = $('[data-marquee]');
  if (marquee && !reduceMotion) {
    const track = $('.marquee__track', marquee);
    const group = $('.marquee__group', marquee);
    track.appendChild(group.cloneNode(true));
    const flowers = $$('.marquee__flower', marquee);
    let x = 0, dir = 1, raf = null, width = group.getBoundingClientRect().width;
    const measure = () => { width = group.getBoundingClientRect().width; };
    window.addEventListener('resize', measure);
    if (document.fonts) document.fonts.ready.then(measure);

    const loop = () => {
      if (Math.abs(velocity) > 0.3) dir = velocity > 0 ? 1 : -1;
      x -= dir * (0.6 + Math.min(Math.abs(velocity) * 0.9, 24));
      if (x <= -width) x += width;
      if (x > 0) x -= width;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      const spin = `${((-x / width) * 360).toFixed(1)}deg`;
      flowers.forEach((f) => f.style.setProperty('--spin', spin));
      raf = requestAnimationFrame(loop);
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !raf) raf = requestAnimationFrame(loop);
      if (!entry.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
    }).observe(marquee);
  }

  /* ------------------------------------------------------------------------
     Formulaire : validation, anti-spam, envoi
     ------------------------------------------------------------------------ */
  const form = $('[data-form]');
  const success = $('[data-success]');
  const occasionLabel = $('[data-occasion-label]');
  const messageField = $('[data-message]');

  const MESSAGES = {
    nom: {
      valueMissing: 'Merci d’indiquer votre nom.',
      tooShort: 'Votre nom semble un peu court.',
      customError: 'Merci de ne pas mettre de lien dans votre nom.',
    },
    email: {
      valueMissing: 'Merci d’indiquer votre e-mail, pour que nous puissions vous répondre.',
      typeMismatch: 'Cet e-mail ne semble pas valide (exemple : vous@exemple.be).',
      patternMismatch: 'Cet e-mail ne semble pas valide (exemple : vous@exemple.be).',
    },
    date: {
      rangeUnderflow: 'Nous avons besoin d’au moins 24 h : choisissez une date à partir de demain.',
      rangeOverflow: 'Cette date est un peu lointaine : écrivez-nous directement, nous en parlerons.',
      badInput: 'Cette date n’est pas valide.',
    },
    message: {
      tooLong: '1000 caractères maximum.',
      customError: `Merci de limiter les liens dans votre message (${MAX_LINKS} maximum).`,
    },
    consentement: {
      valueMissing: 'Merci de cocher cette case pour que nous puissions vous répondre.',
    },
  };

  function setOccasion(value) {
    if (!form) return;
    const radio = form.querySelector(`input[name="occasion"][value="${value}"]`);
    if (radio && !radio.checked) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function validateField(input) {
    const field = input.closest('.field');
    if (!field) return true;
    const value = input.value.trim();
    input.setCustomValidity('');
    if (input.name === 'nom' && /https?:|www\.|[<>]/i.test(value)) input.setCustomValidity('lien');
    if (input.name === 'message') {
      const links = (value.match(/https?:\/\/|www\./gi) || []).length;
      if (links > MAX_LINKS) input.setCustomValidity('liens');
    }
    if (input.name === 'nom' && input.value && value.length < 2) input.setCustomValidity('court');

    const ok = input.checkValidity();
    const error = $('[data-error]', field);
    if (!ok) {
      const texts = MESSAGES[input.name] || {};
      let text = input.validationMessage;
      if (input.validity.customError && input.name === 'nom' && value.length < 2) text = texts.tooShort;
      else {
        const order = ['valueMissing', 'typeMismatch', 'patternMismatch', 'tooShort', 'tooLong',
          'rangeUnderflow', 'rangeOverflow', 'badInput', 'customError'];
        const key = order.find((k) => input.validity[k] && texts[k]);
        if (key) text = texts[key];
      }
      if (error) error.textContent = text;
    } else if (error) {
      error.textContent = '';
    }
    field.classList.toggle('is-invalid', !ok);
    input.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  if (form) {
    const status = $('[data-form-status]', form);
    const alertBox = $('[data-form-alert]', form);
    const submitBtn = $('.form__submit', form);
    const counter = $('[data-count]', form);
    const fields = $$('input[name]:not([type="radio"]):not([name="_gotcha"]), textarea', form);
    let startedAt = 0;

    const showAlert = (text) => {
      alertBox.textContent = text;
      alertBox.hidden = !text;
    };

    // Date : de demain à deux ans (commandes 24 h à l’avance)
    const dateInput = $('[data-date]', form);
    if (dateInput) {
      const pad = (n) => String(n).padStart(2, '0');
      const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const min = new Date(); min.setDate(min.getDate() + 1);
      const max = new Date(); max.setFullYear(max.getFullYear() + 2);
      dateInput.min = iso(min);
      dateInput.max = iso(max);
    }

    // Compteur de caractères
    if (messageField && counter) {
      const limit = Number(messageField.getAttribute('maxlength')) || 1000;
      const update = () => {
        const n = messageField.value.length;
        counter.textContent = `${n} / ${limit}`;
        counter.classList.toggle('is-near', n > limit * 0.9);
      };
      messageField.addEventListener('input', update);
      update();
    }

    // Le chronomètre anti-robot démarre à la première interaction
    form.addEventListener('focusin', () => { if (!startedAt) startedAt = Date.now(); });
    form.addEventListener('input', () => { if (!startedAt) startedAt = Date.now(); });

    form.addEventListener('change', (e) => {
      if (e.target.name === 'consentement') validateField(e.target);
      if (e.target.name !== 'occasion' || !occasionLabel) return;
      occasionLabel.classList.add('is-swapping');
      setTimeout(() => {
        occasionLabel.textContent = e.target.value;
        occasionLabel.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 200);
    });

    // Validation douce : au départ du champ, puis en direct une fois l’erreur affichée
    fields.forEach((input) => {
      input.addEventListener('blur', () => { if (input.type !== 'checkbox' && input.value) validateField(input); });
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('is-invalid')) validateField(input);
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAlert('');

      const invalid = fields.filter((input) => !validateField(input));
      if (invalid.length) {
        status.textContent = invalid.length === 1
          ? 'Un champ est à corriger.'
          : `${invalid.length} champs sont à corriger.`;
        invalid[0].focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form));

      // Anti-spam 1 : le champ piège a été rempli → robot, on fait semblant
      if (data._gotcha) { showSuccess('sent', data.occasion, ''); return; }
      delete data._gotcha;

      // Anti-spam 2 : envoyé trop vite après l’arrivée
      if (!startedAt || Date.now() - startedAt < MIN_FILL_TIME) {
        showAlert('Un instant… relisez votre message, puis envoyez-le à nouveau.');
        startedAt = startedAt || Date.now();
        return;
      }

      // Anti-spam 3 : une demande par minute
      const last = Number(store.get('nb-last-submit')) || 0;
      if (Date.now() - last < RESUBMIT_DELAY) {
        showAlert('Votre demande vient d’être envoyée. Patientez une minute avant d’en envoyer une autre.');
        return;
      }

      const text = [
        'Bonjour Nioushadow Blooms,',
        `Demande : ${data.occasion}`,
        `Nom : ${data.nom.trim()}`,
        `E-mail : ${data.email.trim()}`,
        data.date ? `Date souhaitée : ${new Date(`${data.date}T12:00`).toLocaleDateString('fr-BE')}` : '',
        data.message ? `\n${data.message.trim()}` : '',
      ].filter(Boolean).join('\n');
      const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

      let mode = 'whatsapp';
      if (FORM_ENDPOINT) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-sending');
        try {
          const res = await fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, _subject: `Nouvelle demande · ${data.occasion}` }),
          });
          if (!res.ok) throw new Error(String(res.status));
          mode = 'sent';
        } catch (err) {
          mode = 'whatsapp';
        }
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-sending');
      } else {
        window.open(waHref, '_blank', 'noopener');
      }

      store.set('nb-last-submit', String(Date.now()));
      showSuccess(mode, data.occasion, waHref);
    });
  }

  function showSuccess(mode, occasion, waHref) {
    const title = $('[data-success-title]', success);
    const text = $('[data-success-text]', success);
    const wa = $('[data-success-wa]', success);
    if (mode === 'sent') {
      title.textContent = 'Merci, c’est bien reçu.';
      text.textContent = `Nous revenons vers vous très vite avec une proposition pour votre demande « ${occasion} ».`;
      wa.hidden = true;
    } else {
      title.textContent = 'Votre message est prêt.';
      text.textContent = `Votre demande « ${occasion} » a été préparée dans WhatsApp : il ne reste qu’à l’envoyer. Vous pouvez aussi nous appeler au ${PHONE_DISPLAY}.`;
      wa.href = waHref;
      wa.hidden = false;
    }
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  const resetBtn = $('[data-reset]');
  if (resetBtn && form) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      if (occasionLabel) occasionLabel.textContent = 'Bouquet';
      $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
      $$('[data-error]', form).forEach((p) => { p.textContent = ''; });
      if (messageField) messageField.dispatchEvent(new Event('input'));
      success.hidden = true;
      form.hidden = false;
      $('input[name="occasion"]:checked', form).focus();
    });
  }

  /* Clic sur une création → formulaire pré-rempli */
  $$('[data-occasion]').forEach((row) => {
    row.addEventListener('click', () => {
      if (row.getAttribute('href') === '#contact') setOccasion(row.dataset.occasion);
    });
  });

  /* ------------------------------------------------------------------------
     Abonnement : choix du rythme
     ------------------------------------------------------------------------ */
  const rhythmNote = $('[data-rhythm-note]');
  $$('input[name="rythme"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!rhythmNote) return;
      rhythmNote.classList.add('is-swapping');
      setTimeout(() => {
        rhythmNote.textContent = input.dataset.note;
        rhythmNote.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 220);
    });
  });
  const aboCta = $('[data-abo-cta]');
  if (aboCta) {
    aboCta.addEventListener('click', () => {
      setOccasion('Abonnement');
      const rhythm = $('input[name="rythme"]:checked');
      if (rhythm && messageField && !messageField.value.trim()) {
        messageField.value = `Abonnement floral — ${rhythm.value.toLowerCase()}.\nLieu de livraison : `;
        messageField.dispatchEvent(new Event('input'));
      }
    });
  }

  /* ------------------------------------------------------------------------
     Créations : aperçu qui suit le curseur
     ------------------------------------------------------------------------ */
  const preview = $('[data-preview]');
  const rows = $$('.index__row');
  if (preview && finePointer && rows.length) {
    const frame = $('.preview__frame', preview);
    const items = rows.map((row) => {
      const ph = $('.index__thumb .ph', row).cloneNode(true);
      ph.style.setProperty('--ratio', '4 / 5');
      const img = $('img', ph);
      if (img) { img.removeAttribute('loading'); watchPhoto(img); }
      frame.appendChild(ph);
      return ph;
    });

    let x = 0, y = 0, tx = 0, ty = 0, raf = null, visible = false;
    const loop = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      const tilt = clamp((tx - x) * 0.04, -8, 8);
      preview.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
      raf = visible || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : null;
    };

    rows.forEach((row, i) => {
      row.addEventListener('mouseenter', (e) => {
        if (!visible) { x = tx = e.clientX; y = ty = e.clientY; }
        visible = true;
        preview.classList.add('is-on');
        items.forEach((ph, j) => ph.classList.toggle('is-current', j === i));
        if (!raf) raf = requestAnimationFrame(loop);
      });
      row.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
    });
    $('[data-index]').addEventListener('mouseleave', () => {
      visible = false;
      preview.classList.remove('is-on');
    });
    window.addEventListener('scroll', () => {
      if (visible) { visible = false; preview.classList.remove('is-on'); }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     Carnet : galerie glissable, avec profondeur dans les cadres
     ------------------------------------------------------------------------ */
  const track = $('[data-gallery-track]');
  if (track) {
    const bar = $('[data-gallery-progress]');
    const items = $$('.gallery__item', track);
    const step = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 32;
      return items[0] ? items[0].getBoundingClientRect().width + gap : 320;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = track.clientWidth / track.scrollWidth;
      const p = max > 0 ? ratio + (1 - ratio) * (track.scrollLeft / max) : 1;
      if (bar) bar.style.setProperty('--p', p.toFixed(3));
      if (reduceMotion) return;
      const mid = window.innerWidth / 2;
      items.forEach((item) => {
        const r = item.getBoundingClientRect();
        const offset = (r.left + r.width / 2 - mid) / window.innerWidth;
        const ph = $('.ph', item);
        if (ph) ph.style.setProperty('--px', `${(offset * -26).toFixed(1)}px`);
      });
    };
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    update();

    const by = (dir) => track.scrollBy({ left: dir * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
    $('[data-gallery-prev]').addEventListener('click', () => by(-1));
    $('[data-gallery-next]').addEventListener('click', () => by(1));

    // Glisser à la souris
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false;
      startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
    });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); by(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); by(-1); }
    });
  }

  /* ------------------------------------------------------------------------
     Cookies : bannière de consentement (refuser = aussi simple qu’accepter)
     Aucun outil de mesure n’est installé pour l’instant : loadAnalytics()
     est l’endroit où en ajouter un, qui ne se chargera qu’avec l’accord.
     ------------------------------------------------------------------------ */
  function loadAnalytics() {
    /* Exemple (Plausible, sans cookie) :
       const s = document.createElement('script');
       s.defer = true;
       s.dataset.domain = 'nioushadow-blooms.com';
       s.src = 'https://plausible.io/js/script.js';
       document.head.appendChild(s);
       (penser à autoriser ce domaine dans la CSP de .htaccess) */
  }

  function readConsent() {
    try {
      const c = JSON.parse(store.get(CONSENT_KEY));
      if (c && Date.now() - c.date < CONSENT_MAX_AGE) return c;
    } catch (e) { /* valeur illisible */ }
    return null;
  }

  let banner = null;
  function buildBanner() {
    banner = document.createElement('section');
    banner.className = 'cookies';
    banner.setAttribute('aria-labelledby', 'cookies-title');
    banner.hidden = true;
    banner.innerHTML = `
      <div class="cookies__head">
        <svg class="cookies__flower" aria-hidden="true"><use href="#flower"/></svg>
        <h2 class="cookies__title" id="cookies-title">Un mot sur les cookies</h2>
      </div>
      <p class="cookies__text">Ce site n’utilise aucun cookie publicitaire. Avec votre accord, une mesure d’audience anonyme nous aiderait à l’améliorer. <a class="inline-link" href="confidentialite.html#cookies">En savoir plus</a></p>
      <div class="cookies__prefs" hidden data-cookie-prefs>
        <label class="switch is-locked">
          <input type="checkbox" checked disabled>
          <span class="switch__ui" aria-hidden="true"></span>
          <span><strong>Nécessaires</strong> — mémoriser votre choix. Toujours actifs.</span>
        </label>
        <label class="switch">
          <input type="checkbox" data-cookie-analytics>
          <span class="switch__ui" aria-hidden="true"></span>
          <span><strong>Mesure d’audience</strong> — statistiques de visite anonymes.</span>
        </label>
      </div>
      <div class="cookies__actions">
        <button type="button" class="btn btn--ghost" data-cookie="refuse">Tout refuser</button>
        <button type="button" class="btn btn--ghost" data-cookie="accept">Tout accepter</button>
      </div>
      <button type="button" class="linkbtn cookies__custom" data-cookie="custom">Personnaliser</button>`;
    document.body.appendChild(banner);

    const prefs = $('[data-cookie-prefs]', banner);
    const analytics = $('[data-cookie-analytics]', banner);
    const customBtn = $('[data-cookie="custom"]', banner);

    banner.addEventListener('click', (e) => {
      const action = e.target.closest('[data-cookie]');
      if (!action) return;
      const kind = action.dataset.cookie;
      if (kind === 'custom') {
        if (prefs.hidden) {
          prefs.hidden = false;
          action.textContent = 'Enregistrer';
          analytics.focus();
          return;
        }
        saveConsent(analytics.checked);
      } else {
        saveConsent(kind === 'accept');
      }
    });

    banner.openPrefs = () => {
      const c = readConsent();
      analytics.checked = Boolean(c && c.analytics);
      prefs.hidden = false;
      customBtn.textContent = 'Enregistrer';
    };
  }

  function openBanner(withPrefs) {
    if (!banner) buildBanner();
    if (withPrefs) banner.openPrefs();
    banner.hidden = false;
    dockState.cookies = true;
    updateDock();
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-open')));
    if (withPrefs) setTimeout(() => $('[data-cookie-analytics]', banner).focus(), 50);
  }

  function closeBanner() {
    banner.classList.remove('is-open');
    setTimeout(() => {
      banner.hidden = true;
      dockState.cookies = false;
      updateDock();
    }, reduceMotion ? 0 : 700);
  }

  function saveConsent(analytics) {
    const consent = { analytics, date: Date.now(), v: 1 };
    store.set(CONSENT_KEY, JSON.stringify(consent));
    if (analytics) loadAnalytics();
    closeBanner();
  }

  const consent = readConsent();
  if (consent) {
    if (consent.analytics) loadAnalytics();
  } else {
    setTimeout(() => openBanner(false), reduceMotion ? 0 : 1800);
  }
  $$('[data-cookie-settings]').forEach((btn) => btn.addEventListener('click', () => openBanner(true)));

  /* Espace client : si une session est ouverte, les liens mènent à « Mon espace » */
  const session = (() => {
    try {
      const key = Object.keys(localStorage).find((k) => /^sb-.+-auth-token$/.test(k));
      return key ? JSON.parse(localStorage.getItem(key)) : null;
    } catch (e) { return null; }
  })();
  const loggedIn = Boolean(session);
  if (session && session.user && form) {
    const meta = session.user.user_metadata || {};
    const name = $('#f-name', form);
    const email = $('#f-email', form);
    if (name && !name.value && meta.name) name.value = meta.name;
    if (email && !email.value && session.user.email) email.value = session.user.email;
  }
  if (loggedIn) {
    $$('[data-account-link]').forEach((a) => {
      a.setAttribute('href', a.getAttribute('href').replace('connexion.html', 'compte.html'));
      if (a.hasAttribute('aria-label')) a.setAttribute('aria-label', 'Mon espace client');
      const label = $('[data-account-label]', a);
      if (label) label.textContent = 'Mon espace';
    });
  }

  /* Année du pied de page */
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  root.classList.add('js-ready');
})();
