/* ==========================================================================
   Nioushadow Blooms — interactions
   ========================================================================== */

/* -- Réglages du formulaire -------------------------------------------------
   FORM_ENDPOINT : laisser vide pour envoyer la demande via WhatsApp.
   Pour recevoir les demandes par e-mail, créer un formulaire gratuit sur
   https://formspree.io et coller son adresse ici, par ex.
   'https://formspree.io/f/abcdwxyz'
   -------------------------------------------------------------------------- */
const FORM_ENDPOINT = '';
const WHATSAPP_NUMBER = '32477735659';
const PHONE_DISPLAY = '+32 477 73 56 59';

(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

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
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
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
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
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
     Navigation : bordure au défilement, masquée en descendant
     ------------------------------------------------------------------------ */
  const nav = $('[data-nav]');
  const hero = $('.hero');
  const wordmarks = $$('.hero .wordmark');
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;

  function onScroll() {
    const y = window.scrollY;

    nav.classList.toggle('is-scrolled', y > 40);
    if (!menuOpen) {
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > 320) nav.classList.add('is-hidden');
      else if (goingUp || y < 320) nav.classList.remove('is-hidden');
    }
    lastY = y;

    if (!reduceMotion) {
      // Le logotype glisse doucement de part et d’autre
      if (hero && y < hero.offsetHeight + 200) {
        const drift = Math.min(y * 0.12, 120);
        if (wordmarks[0]) wordmarks[0].style.setProperty('--drift', `${-drift}px`);
        if (wordmarks[1]) wordmarks[1].style.setProperty('--drift', `${drift * 0.8}px`);
      }
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* Lien actif dans la navigation */
  const navLinks = $$('.nav__links a');
  if ('IntersectionObserver' in window && navLinks.length) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'true');
        } else if (link.getAttribute('aria-current')) {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

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
      if (reduceMotion) done();
      else setTimeout(done, 700);
    }
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
     Formulaire : occasion, date minimale (24 h), envoi
     ------------------------------------------------------------------------ */
  const form = $('[data-form]');
  const success = $('[data-success]');
  const occasionLabel = $('[data-occasion-label]');
  const messageField = $('[data-message]');

  function setOccasion(value) {
    if (!form) return;
    const radio = form.querySelector(`input[name="occasion"][value="${value}"]`);
    if (radio && !radio.checked) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (form) {
    // Date : au plus tôt demain (commandes 24 h à l’avance)
    const dateInput = $('[data-date]', form);
    if (dateInput) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const pad = (n) => String(n).padStart(2, '0');
      dateInput.min = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    form.addEventListener('change', (e) => {
      if (e.target.name !== 'occasion' || !occasionLabel) return;
      occasionLabel.classList.add('is-swapping');
      setTimeout(() => {
        occasionLabel.textContent = e.target.value;
        occasionLabel.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 200);
    });

    // Validation douce, champ par champ
    const validateField = (input) => {
      const field = input.closest('.field');
      if (!field) return true;
      const ok = input.checkValidity();
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    $$('input[required]', form).forEach((input) => {
      input.addEventListener('blur', () => { if (input.value) validateField(input); });
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('is-invalid')) validateField(input);
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const required = $$('input[required]', form);
      const invalid = required.filter((input) => !validateField(input));
      if (invalid.length) { invalid[0].focus(); return; }

      const data = Object.fromEntries(new FormData(form));
      if (data._gotcha) return; // robot
      delete data._gotcha;

      const text = [
        `Bonjour Nioushadow Blooms,`,
        `Demande : ${data.occasion}`,
        `Nom : ${data.nom}`,
        `E-mail : ${data.email}`,
        data.date ? `Date souhaitée : ${new Date(data.date).toLocaleDateString('fr-BE')}` : '',
        data.message ? `\n${data.message}` : '',
      ].filter(Boolean).join('\n');
      const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

      const submitBtn = $('.form__submit', form);
      let mode = 'whatsapp';

      if (FORM_ENDPOINT) {
        submitBtn.disabled = true;
        try {
          const res = await fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error(String(res.status));
          mode = 'sent';
        } catch (err) {
          mode = 'whatsapp';
        }
        submitBtn.disabled = false;
      } else {
        window.open(waHref, '_blank', 'noopener');
      }

      showSuccess(mode, data.occasion, waHref);
    });
  }

  function showSuccess(mode, occasion, waHref) {
    const title = $('[data-success-title]', success);
    const text = $('[data-success-text]', success);
    const wa = $('[data-success-wa]', success);
    if (mode === 'sent') {
      title.textContent = 'Merci, c’est bien reçu.';
      text.textContent = `Nous revenons vers vous très vite avec une proposition pour votre demande «\u202F${occasion}\u202F».`;
      wa.hidden = true;
    } else {
      title.textContent = 'Votre message est prêt.';
      text.textContent = `Votre demande «\u202F${occasion}\u202F» a été préparée dans WhatsApp\u202F: il ne reste qu’à l’envoyer. Vous pouvez aussi nous appeler au ${PHONE_DISPLAY}.`;
      wa.href = waHref;
      wa.hidden = false;
    }
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  const resetBtn = $('[data-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      if (occasionLabel) occasionLabel.textContent = 'Bouquet';
      $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
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
      if (img) img.removeAttribute('loading');
      frame.appendChild(ph);
      return ph;
    });

    let x = 0, y = 0, tx = 0, ty = 0, raf = null, visible = false;

    const loop = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      const tilt = Math.max(-8, Math.min(8, (tx - x) * 0.04));
      preview.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
      if (visible || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(loop);
      else raf = null;
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
     Carnet : galerie glissable
     ------------------------------------------------------------------------ */
  const track = $('[data-gallery-track]');
  if (track) {
    const progress = $('[data-gallery-progress]');
    const step = () => {
      const item = $('.gallery__item', track);
      const gap = parseFloat(getComputedStyle(track).columnGap) || 32;
      return item ? item.getBoundingClientRect().width + gap : 320;
    };
    const updateProgress = () => {
      const max = track.scrollWidth - track.clientWidth;
      const visibleRatio = track.clientWidth / track.scrollWidth;
      const p = max > 0 ? visibleRatio + (1 - visibleRatio) * (track.scrollLeft / max) : 1;
      if (progress) progress.style.setProperty('--p', p.toFixed(3));
    };
    track.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();

    $('[data-gallery-prev]').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    $('[data-gallery-next]').addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));

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
      if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: 'smooth' }); }
    });
  }

  /* Année du pied de page */
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  root.classList.add('js-ready');
})();
