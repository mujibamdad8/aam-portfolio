/* Mujib Amdad — portfolio v2 interactions (GSAP + ScrollTrigger + Lenis) */
(function () {
  "use strict";
  const AUTO_SHUFFLE = false; /* set true to let the hero cards shuffle on their own */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  /* ---------- clock + year (always) ---------- */
  var clock = $("#clock");
  var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: true });
  function tick() { if (clock) clock.textContent = fmt.format(new Date()); }
  tick(); setInterval(tick, 15000);
  var yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Netlify form: submit in place ---------- */
  var form = $("#cform"), status = $("#status");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.textContent = "Sending...";
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() })
      .then(function (r) { if (!r.ok) throw new Error(); form.reset(); status.textContent = "Thank you! I'll reply within one business day."; })
      .catch(function () { status.innerHTML = 'Could not send. Please email <a href="mailto:mujibamdad8@gmail.com">mujibamdad8@gmail.com</a> instead.'; });
  });

  /* ---------- work page: clicking a project opens its gallery (native <dialog>: Esc + focus handled) ---------- */
  var modal = $(".wk-modal");
  if (modal) {
    var track = $(".wk-track", modal), cur = $(".wk-cur", modal), dragTag = $(".wk-drag", modal);
    var two = function (n) { return (n < 10 ? "0" : "") + n; };
    $$(".wk-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var d = item.dataset;
        track.textContent = "";
        for (var i = 1; i <= +d.count; i++) {
          var img = document.createElement("img");
          img.src = "assets/img/" + d.folder + "/" + d.prefix + "-" + i + ".webp";
          img.alt = d.name + " screenshot " + i;
          img.draggable = false;
          track.appendChild(img);
        }
        $(".wk-title", modal).textContent = d.name;
        $(".wk-tot", modal).textContent = two(+d.count);
        cur.textContent = "01";
        modal.showModal();
        track.scrollLeft = 0;
      });
    });
    $(".wk-close", modal).addEventListener("click", function () { modal.close(); });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.close(); }); /* click on the dimmed backdrop */
    /* counter: the image whose left edge is closest to the track's left edge (last one once scrolled to the end) */
    track.addEventListener("scroll", function () {
      var imgs = $$("img", track), left = track.getBoundingClientRect().left, best = 0, min = Infinity;
      imgs.forEach(function (img, i) {
        var dist = Math.abs(img.getBoundingClientRect().left - left);
        if (dist < min) { min = dist; best = i; }
      });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) best = imgs.length - 1;
      cur.textContent = two(best + 1);
    });
    /* mouse drag to scroll (touch and trackpads scroll natively); the "Drag" tag follows the pointer.
       Momentum: on release the gallery keeps gliding at the drag speed and slows down (friction 0.94 per frame) */
    var down = null, vel = 0, glideId = 0, over = 0;
    var springEase = "cubic-bezier(.34,1.56,.64,1)"; /* overshoots a little past 0 = the bounce */
    /* pulled past an end: spring back from wherever the rubber band is */
    function springBack() {
      var from = track.style.translate;
      track.style.translate = "";
      if (from && !reduce) track.animate([{ translate: from }, { translate: "0px 0px" }], { duration: 600, easing: springEase });
    }
    /* glided into an end: a quick push past it, then spring back */
    function bump(v) {
      if (reduce) return;
      var d = Math.max(-90, Math.min(90, v * 8));
      track.animate([
        { translate: "0px 0px", easing: "ease-out" },
        { translate: d + "px 0px", offset: 0.25, easing: springEase },
        { translate: "0px 0px" }
      ], { duration: 750 });
    }
    function glide() {
      var before = track.scrollLeft;
      track.scrollLeft -= vel;
      vel *= 0.94;
      if (Math.abs(vel) < 0.5) return; /* stopped */
      if (track.scrollLeft === before) { bump(vel); return; } /* hit an end while still moving */
      glideId = requestAnimationFrame(glide);
    }
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(glideId); /* grabbing stops a glide */
      down = { x: e.clientX, s: track.scrollLeft, lastX: e.clientX, lastT: performance.now() };
      vel = 0;
      track.setPointerCapture(e.pointerId);
      track.classList.add("is-drag");
    });
    track.addEventListener("pointermove", function (e) {
      dragTag.style.translate = e.clientX + "px " + e.clientY + "px";
      if (!down) return;
      var now = performance.now(), dt = Math.max(now - down.lastT, 1);
      vel = vel * 0.2 + ((e.clientX - down.lastX) / dt * 16) * 0.8; /* px per frame, smoothed */
      down.lastX = e.clientX; down.lastT = now;
      var want = down.s - (e.clientX - down.x), max = track.scrollWidth - track.clientWidth;
      over = want < 0 ? want : want > max ? want - max : 0;
      track.scrollLeft = want; /* the browser clamps this to the ends */
      track.style.translate = over ? (-over * 0.35) + "px 0px" : ""; /* rubber band: moves at 35% past an end */
    });
    track.addEventListener("pointerup", function () {
      if (!down) return;
      if (performance.now() - down.lastT > 80) vel = 0; /* held still before letting go: no throw */
      down = null;
      track.classList.remove("is-drag");
      if (over) { over = 0; springBack(); return; }
      if (!reduce) glide();
    });
  }

  var reel = $(".reel video");

  if (reduce || !hasGsap) {
    document.documentElement.classList.remove("js");
    if (reel && !reduce) reel.play().catch(function () {});
    return;
  }

  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  /* ---------- smooth scroll ---------- */
  if (typeof window.Lenis !== "undefined") {
    var lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    /* "#id" and "/#id" links: smooth-scroll when the target is on this page, otherwise the browser navigates */
    $$('a[href^="#"], a[href^="/#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href");
        var id = href.slice(href.indexOf("#"));
        var target = id === "#top" ? (hero ? 0 : null) : $(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: id === "#top" ? 0 : -20, duration: 1.4 });
      });
    });

    /* ---------- snap scroll: one wheel gesture = one stop ----------
       stops = the top of every section; sections taller than the screen also get one stop
       per screen height, so their content is never skipped. Touch scrolling stays free. */
    var stops = [];
    function buildStops() {
      var vh = window.innerHeight;
      if (vh < 100) return; /* hidden/minimised tab can report 0: the loop below would never end */
      var max = document.documentElement.scrollHeight - vh;
      var list = [];
      $$("main > section, body > footer").forEach(function (s) {
        var top = s.getBoundingClientRect().top + window.scrollY;
        var end = top + s.offsetHeight - vh;
        for (var y = top; y < end; y += vh) list.push(y);
        list.push(Math.max(top, end));
      });
      stops = list.map(function (y) { return Math.round(Math.min(y, max)); })
        .filter(function (y, i, a) { return a.indexOf(y) === i; })
        .sort(function (a, b) { return a - b; });
    }
    ST.addEventListener("refresh", buildStops);
    buildStops();

    var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }; /* cubic: soft start, soft stop */
    var lastWheel = 0, lastAbs = 0, decaying = false, snapUntil = 0;
    window.addEventListener("wheel", function (e) {
      var galleryOpen = $(".wk-modal[open] .wk-track");
      if (galleryOpen) { /* gallery open: vertical wheel slides the images, the page stays put */
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); galleryOpen.scrollLeft += e.deltaY; }
        e.stopImmediatePropagation();
        return;
      }
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; /* pinch-zoom / sideways: leave alone */
      e.preventDefault();
      e.stopImmediatePropagation(); /* Lenis never sees the wheel; we move the page ourselves */
      var now = Date.now(), abs = Math.abs(e.deltaY);
      /* one gesture fires many wheel events; trackpad inertia keeps firing ever-smaller ones.
         A new gesture = a pause, or a delta that jumps up while the old one was fading out
         (not the ramp-up at the start of a swipe, nor small jitter in the tail). */
      var fresh = now - lastWheel > 150 || (decaying && abs > lastAbs * 2 + 10);
      decaying = fresh ? false : (decaying || abs < lastAbs);
      lastWheel = now; lastAbs = abs;
      /* strictly one stop at a time: anything during a move is ignored, so a section can never be skipped */
      if (!fresh || abs < 1 || now < snapUntil) return;
      var from = window.scrollY;
      var dir = e.deltaY > 0 ? 1 : -1, target = null;
      for (var i = 0; i < stops.length; i++) {
        var s = dir > 0 ? stops[i] : stops[stops.length - 1 - i];
        if (dir > 0 ? s > from + 2 : s < from - 2) { target = s; break; }
      }
      if (target === null) return;
      snapUntil = now + 1000;
      lenis.scrollTo(target, { duration: 1, easing: easeInOut, lock: true, force: true });
    }, { passive: false, capture: true });
  }

  /* ---------- split text into masked words ---------- */
  function split(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map(function (w) {
      return '<span class="w" aria-hidden="true"><span class="wi">' + w + "</span></span>";
    }).join(" ");
    return $$(".wi", el);
  }
  $$("[data-reveal]").forEach(split); /* animated per section, see initSections */

  /* ---------- hero ---------- */
  var hero = $(".hero");
  var cards = $$(".stack img");            /* 0 = top card */
  var rot = [-7, 5, -3, 8, -10, 3];
  var baseRot = function (i) { return rot[i % rot.length]; };
  var mobile = window.matchMedia("(max-width: 760px)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !mobile;
  var heroTl = gsap.timeline({ paused: true });
  gsap.set(cards, { rotation: baseRot, zIndex: function (i) { return cards.length - i; } });

  /* 1) title rises in as one block; header and clock fade in with it */
  function initTitle() {
    heroTl.from(".hero .giant", { autoAlpha: 0, scale: 1.1, yPercent: 15, transformOrigin: "left bottom", duration: 0.9, ease: "power3.out" }, 0)
          .from([".hdr", ".clock"], { autoAlpha: 0, duration: 0.6 }, 0);
  }

  /* 2) cards fly in from below, bottom card first, each settling on its own angle */
  function initCards() {
    heroTl.from(cards, {
      y: "100vh", rotation: function (i) { return baseRot(i) + (i % 2 ? 12 : -12); },
      duration: 1.1, ease: "power4.out", stagger: { each: 0.1, from: "end" }
    }, 0.8);
  }

  /* 3) intro text: masked line reveal on load and on every return to the hero; year wipes in */
  var introEl = $(".hero-intro");
  var logoWord = $(".logo-word"); /* header wordmark: same reveal and exit as the intro, so it only shows in the hero */
  var introST = null;
  /* wrap each visual line in a mask; the full text lives in aria-label so it survives re-splits */
  function splitLines(el) {
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = el.getAttribute("aria-label").split(/\s+/).map(function (w) { return "<span>" + w + "</span>"; }).join(" ");
    var lines = [], top = null;
    $$("span", el).forEach(function (w) {
      if (w.offsetTop !== top) { top = w.offsetTop; lines.push([]); }
      lines[lines.length - 1].push(w.textContent);
    });
    el.innerHTML = lines.map(function (l) {
      return '<span class="line" aria-hidden="true"><span class="line-in">' + l.join(" ") + "</span></span>";
    }).join("");
    return $$(".line-in", el);
  }
  /* same reveal as the page load: each line slides up out of its mask */
  function revealLines(el) {
    gsap.set(el, { autoAlpha: 1, overwrite: true });
    gsap.fromTo($$(".line-in", el), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.08, overwrite: true });
  }
  /* exit: lines slip back behind their masks, out the way the page is scrolling (dir 1 = up, -1 = down) */
  function hideLines(el, dir) {
    gsap.to($$(".line-in", el), { yPercent: -110 * dir, duration: 0.6, ease: "power3.in", stagger: 0.05, overwrite: true });
  }
  /* line breaks depend on width, so re-split when it changes */
  function keepSplit(el, ready) {
    var w = el.offsetWidth, t = null;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (el.offsetWidth === w || !ready()) return;
        w = el.offsetWidth; splitLines(el);
      }, 200);
    });
  }
  function initIntroLines() {
    gsap.set(introEl, { autoAlpha: 0 }); /* shown in startHero once lines are split with final fonts */
    heroTl.fromTo(".hero-year", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power3.inOut" }, 1.6);
    keepSplit(introEl, function () { return heroTl.progress() >= 1; });
    /* leaving the hero fades the intro out; coming back replays the line reveal */
    introST = ST.create({
      trigger: ".hero", start: "top top", end: "35% top",
      onLeave: function () { gsap.to([introEl, logoWord], { autoAlpha: 0, duration: 0.4, ease: "power2.out", overwrite: true }); },
      onEnterBack: function () { revealLines(introEl); revealLines(logoWord); }
    });
  }

  /* every section after the hero: reveal each time it comes in (either direction), exit each time it leaves.
     Animated parts: [data-lines] (masked lines), [data-reveal] (masked words), [data-fade], process bars.
     With snap scroll the exit starts as soon as the section begins to move away (5%), and the reveal
     plays as the next one arrives; on touch (free scroll) the zones are wider. */
  function initSections() {
    var lineEls = $$("[data-lines]");
    lineEls.forEach(function (el) { gsap.set(el, { autoAlpha: 0 }); splitLines(el); keepSplit(el, function () { return true; }); });
    $$("main > section:not(.hero), body > footer").forEach(function (section) {
      var lines = lineEls.filter(function (el) { return section.contains(el); });
      var words = $$("[data-reveal] .wi", section);
      var masks = $$("[data-mask] > *", section); /* line reveal for a block (e.g. the footer logo) */
      var fades = $$("[data-fade]", section);
      var bars = $$(".g-bar", section);
      gsap.set(words, { yPercent: 115 });
      gsap.set(masks, { yPercent: 101 });
      gsap.set(fades, { autoAlpha: 0, y: 24 });
      gsap.set(bars, { scaleX: 0 });
      function show() {
        lines.forEach(revealLines);
        gsap.fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.035, overwrite: true });
        gsap.fromTo(masks, { yPercent: 101 }, { yPercent: 0, duration: 1.2, ease: "power4.out", overwrite: true });
        gsap.to(fades, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.1, delay: 0.25, overwrite: true });
        gsap.to(bars, { scaleX: 1, duration: 1.1, ease: "power4.out", stagger: 0.18, delay: 0.2, overwrite: true });
      }
      function hide(dir) { /* dir 1 = page moving up (scrolled down), -1 = the other way */
        lines.forEach(function (el) { hideLines(el, dir); });
        gsap.to(words, { yPercent: -115 * dir, duration: 0.6, ease: "power3.in", stagger: 0.02, overwrite: true });
        gsap.to(masks, { yPercent: -101 * dir, duration: 0.6, ease: "power3.in", overwrite: true });
        gsap.to(fades, { autoAlpha: 0, y: -24 * dir, duration: 0.5, ease: "power3.in", overwrite: true });
        gsap.to(bars, { scaleX: 0, duration: 0.5, ease: "power3.in", overwrite: true });
      }
      ST.create({
        trigger: section,
        start: mobile ? "top 75%" : "top 5%",
        end: mobile ? "bottom 25%" : "bottom 95%",
        onEnter: show,
        onEnterBack: show,
        onLeave: function () { hide(1); },
        onLeaveBack: function () { hide(-1); }
      });
    });
  }

  /* 4) custom cursor: grows into a "view" bubble over the stack */
  function initCursor() {
    var cursor = $(".cursor");
    if (!cursor || !finePointer) return;
    document.documentElement.classList.add("has-cursor");
    gsap.set(cursor, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    var toX = gsap.quickTo(cursor, "x", { duration: 0.4, ease: "power3" });
    var toY = gsap.quickTo(cursor, "y", { duration: 0.4, ease: "power3" });
    window.addEventListener("mousemove", function (e) { toX(e.clientX); toY(e.clientY); gsap.to(cursor, { autoAlpha: 1, duration: 0.2, overwrite: "auto" }); });
    document.documentElement.addEventListener("mouseleave", function () { gsap.to(cursor, { autoAlpha: 0, duration: 0.2, overwrite: "auto" }); });
    $$(".stack-link").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("is-view"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("is-view"); });
    });
  }

  /* 5) stack tilts toward the mouse; top card moves most */
  function initTilt() {
    if (!finePointer) return;
    var stack = $(".stack");
    hero.addEventListener("mousemove", function (e) {
      if (heroTl.progress() < 1) return;
      var r = stack.getBoundingClientRect();
      var nx = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
      var ny = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
      cards.forEach(function (c, i) {
        var d = 1 - i * 0.15;
        gsap.to(c, { x: nx * 18 * d, y: ny * 12 * d, rotation: baseRot(i) + nx * 4 * d, duration: 0.8, ease: "power3.out", overwrite: "auto" });
      });
    });
    hero.addEventListener("mouseleave", function () {
      gsap.to(cards, { x: 0, y: 0, rotation: baseRot, duration: 0.8, ease: "power3.out", overwrite: "auto" });
    });
  }

  /* 6) scroll: cards fan out at different speeds, title drifts up */
  function initHeroScroll() {
    var k = mobile ? 0.5 : 1;
    var st = { trigger: ".hero", start: "top top", end: "bottom top", scrub: true };
    cards.forEach(function (c, i) {
      gsap.to(c, { yPercent: -(160 - i * 20) * k, ease: "none", scrollTrigger: st });
    });
    /* title and year drift up together; animated separately (not the wrapper) so the year keeps its z-index above the cards */
    var giantEl = $(".hero .giant");
    gsap.to([giantEl, ".hero-year"], {
      y: function () { return -0.2 * giantEl.offsetHeight * k; },
      ease: "none", invalidateOnRefresh: true, scrollTrigger: st
    });
  }

  /* optional auto shuffle (off): the top card drops to the back */
  var order = cards.slice();
  function shuffle() {
    var top = order.shift(); order.push(top);
    gsap.timeline()
      .to(top, { y: "-18%", rotation: "+=" + (Math.random() > 0.5 ? 9 : -9), duration: 0.45, ease: "power2.in" })
      .set(top, { zIndex: 0 })
      .call(function () { order.forEach(function (c, i) { gsap.set(c, { zIndex: order.length - i }); }); })
      .to(top, { y: 0, rotation: rot[Math.floor(Math.random() * rot.length)], duration: 0.7, ease: "power3.out" });
  }
  if (AUTO_SHUFFLE) heroTl.eventCallback("onComplete", function () { setInterval(shuffle, 1700); });

  initCursor();
  if (hero) { /* home page only; other pages (contact) just get the section animations */
    initTitle();
    initCards();
    initIntroLines();
    initTilt();
    initHeroScroll();
  }
  /* start once fonts are in so the text splits into the right lines (cap the wait) */
  var started = false;
  function startHero() {
    if (started) return; started = true;
    if (!hero) { initSections(); return; }
    var lines = splitLines(introEl);
    gsap.set([introEl, logoWord], { autoAlpha: introST.progress < 1 ? 1 : 0 }); /* stay hidden if the page loads already scrolled past the hero */
    heroTl.from([$(".line-in", logoWord)].concat(lines), { yPercent: 110, duration: 0.9, ease: "power4.out", stagger: 0.08 }, 1.4).play();
    initSections();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(startHero);
  setTimeout(startHero, 800);

  /* ---------- marquee (speeds up with scroll velocity) ---------- */
  if ($(".motion")) {
    var tracks = $$(".mq-track").map(function (t, i) {
      return gsap.fromTo(t, { xPercent: i ? -50 : 0 }, { xPercent: i ? 0 : -50, duration: i ? 34 : 26, ease: "none", repeat: -1 });
    });
    ST.create({
      trigger: ".motion", start: "top bottom", end: "bottom top",
      onUpdate: function (self) {
        var boost = 1 + Math.min(Math.abs(self.getVelocity()) / 400, 4);
        tracks.forEach(function (tw) { gsap.to(tw, { timeScale: boost, duration: 0.2, overwrite: true }); gsap.to(tw, { timeScale: 1, duration: 1, delay: 0.25 }); });
      },
      onToggle: function (self) { if (!reel) return; if (self.isActive) reel.play().catch(function () {}); else reel.pause(); }
    });
    gsap.fromTo(".reel", { scale: 0.82 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".motion", start: "top bottom", end: "center center", scrub: true } });
  }

  /* refresh once fonts and images settle */
  window.addEventListener("load", function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();
