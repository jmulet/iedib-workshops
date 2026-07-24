// @require https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js
/**
 * ibgsap.js
 * Sistema declarativo GSAP + ScrollTrigger para Moodle
 *
 * USO BÁSICO (escena animada):
 *   <div data-gsap-scene data-gsap-start="top top" data-gsap-pin="true" data-gsap-scrub="true" data-gsap-end="+=400%">
 *     <h2 class="titulo">Hola</h2>
 *     <template data-gsap-timeline>
 *     [
 *       {"target":".titulo","from":{"opacity":0,"y":50},"to":{"opacity":1,"y":0}}
 *     ]
 *     </template>
 *   </div>
 */

(function () {
  "use strict";

  // ─── Configuració global ───────────────────────────────────────────────────

  var CONFIG = {
    defaults: {
      start: "top 75%",
      end: "bottom 25%",
      scrub: true,
      pin: false,
      markers: false,
      duration: 0.5,
      ease: "power2.out",
      position: ">",
    },
    canvas: {
      ratio: "16/9",
      scrub: 0.5,
      fade: false,
      fadeFrames: 3,
      pad: 0,
      start: "top top",
      end: "+=300%",
      markers: false,
    },
    scrollBadge: {
      text: "Scroll per continuar",
      translations: {
        ca: "Scroll per continuar",
        es: "Haz scroll para continuar",
        en: "Scroll to continue",
        fr: "Scrollez pour continuer",
        de: "Scrollen zum Fortfahren"
      },
      bottom: "5rem",
      background: "rgba(0,0,0,0.65)",
      color: "#fff",
      padding: "0.45em 1.1em",
      borderRadius: "2em",
      fontSize: "0.85rem",
      letterSpacing: "0.03em",
      transition: "opacity 0.35s ease",
      zIndex: "9999",
    },
    debugAttr: "data-gsap-debug",
    errorStyle: "outline: 3px solid red; outline-offset: 4px;",
  };

  // ─── Utilitats ─────────────────────────────────────────────────────────────

  function safeParseJSON(str, context) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error(
        "[gsap-init] JSON inválido en escena:", context, "\n",
        e.message, "\n",
        "JSON recibido:", str
      );
      return null;
    }
  }

  function boolAttr(el, attr) {
    return el.getAttribute(attr) === "true";
  }

  function numAttr(el, attr, fallback) {
    var v = el.getAttribute(attr);
    return v !== null ? parseFloat(v) : fallback;
  }

  function markError(el, msg) {
    el.setAttribute("style", CONFIG.errorStyle);
    el.setAttribute("title", "[gsap-init error] " + msg);
  }

  function normalizeSymbols(val) {
    if (!val || typeof val !== "string") return val;
    return val
      .replace(/\bgeq\b/g, ">=")
      .replace(/\bleq\b/g, "<=")
      .replace(/\bgt\b/g, ">")
      .replace(/\blt\b/g, "<")
      .replace(/\bplus\b/g, "+")
      .replace(/\bminus\b/g, "-")
      .replace(/\band\b/g, "&")
      .replace(/\bor\b/g, "|")
      .replace(/\blt(?=\d)/g, "<")
      .replace(/\bgt(?=\d)/g, ">")
      .replace(/\bplus(?=\d)/g, "+")
      .replace(/\bminus(?=\d)/g, "-");
  }

  // ─── Badge "Scroll per continuar" ──────────────────────────────────────────

  function createScrollBadge() {
    var badgeId = "ibgsap-scroll-hint";
    var existing = document.getElementById(badgeId);
    if (existing) return existing;

    var cfg = CONFIG.scrollBadge;
    var badge = document.createElement("div");
    badge.id = badgeId;
    badge.setAttribute("aria-hidden", "true");

    // Detecció d'idioma
    var htmlLang = document.documentElement.lang || "ca";
    var langCode = htmlLang.split("-")[0].toLowerCase();
    var text = cfg.translations[langCode] || cfg.translations["ca"];
    badge.textContent = "↓ " + text;

    Object.assign(badge.style, {
      position: "fixed",
      bottom: cfg.bottom,
      left: "50%",
      transform: "translateX(-50%)",
      background: cfg.background,
      color: cfg.color,
      padding: cfg.padding,
      borderRadius: cfg.borderRadius,
      fontSize: cfg.fontSize,
      letterSpacing: cfg.letterSpacing,
      pointerEvents: "none",
      zIndex: cfg.zIndex,
      opacity: "0",
      transition: cfg.transition,
    });
    document.body.appendChild(badge);
    return badge;
  }

  // ─── Constructor de timelines ────────────────────────────────────────────────

  function buildTimeline(steps, scope, debug) {
    var tl = gsap.timeline();

    steps.forEach(function (step, i) {

      if (step.subtimeline) {
        if (!Array.isArray(step.subtimeline)) {
          console.warn("[gsap-init] step[" + i + "].subtimeline no es un array", step);
          return;
        }
        var subtl = buildTimeline(step.subtimeline, scope, debug);
        var position = normalizeSymbols(step.position !== undefined ? step.position : CONFIG.defaults.position);
        if (debug) console.log("[gsap-init] subtimeline en posición \"" + position + "\"");
        tl.add(subtl, position);
        return;
      }

      if (!step.target) {
        console.warn("[gsap-init] step[" + i + "] no tiene \"target\"", step);
        return;
      }

      var el;
      if (Array.isArray(step.target)) {
        el = step.target.map(function (sel) {
          return scope.querySelector(normalizeSymbols(sel));
        }).filter(Boolean);
      } else {
        el = scope.querySelector(normalizeSymbols(step.target));
      }

      if (!el || (Array.isArray(el) && el.length === 0)) {
        console.warn("[gsap-init] target \"" + step.target + "\" no encontrado en", scope);
        return;
      }

      var from = step.from || {};
      var to = {};
      var stepTo = step.to || {};
      for (var key in stepTo) { to[key] = stepTo[key]; }

      var position = normalizeSymbols(step.position !== undefined ? step.position : CONFIG.defaults.position);

      to.duration = step.duration !== undefined ? step.duration : CONFIG.defaults.duration;
      to.ease = step.ease !== undefined ? step.ease : CONFIG.defaults.ease;

      if (step.stagger !== undefined) to.stagger = step.stagger;
      if (step.repeat !== undefined) to.repeat = step.repeat;
      if (step.yoyo !== undefined) to.yoyo = step.yoyo;

      if (debug) {
        console.log(
          "[gsap-init] step[" + i + "] target=\"" + step.target + "\"",
          "from:", from, "to:", to, "position:", position
        );
      }

      if (Object.keys(from).length > 0) {
        tl.fromTo(el, from, to, position);
      } else {
        tl.to(el, to, position);
      }
    });

    return tl;
  }

  // ─── Inicialització d'escena (sistema original) ──────────────────────────────

  function initScene(scene) {
    var debug = boolAttr(scene, CONFIG.debugAttr) ||
      scene.closest("[data-gsap-debug='true']") !== null;

    var tmpl = scene.querySelector("[data-gsap-timeline]");

    if (!tmpl) {
      if (debug) console.log("[gsap-init] escena sin timeline:", scene);
    } else {
      if (tmpl.tagName !== "TEMPLATE") {
        tmpl.style.display = "none";
      }
    }

    var rawHTML = tmpl ? (tmpl.tagName === "TEMPLATE" ? tmpl.innerHTML : tmpl.textContent) : "[]";
    var sanitizedJSON = rawHTML.replace(/<br\s*\/?>/gi, " ").replace(/[\r\n]+/g, " ").trim();
    var steps = safeParseJSON(sanitizedJSON, scene);

    if (steps === null) {
      markError(scene, "JSON inválido en <template data-gsap-timeline>");
      return;
    }

    if (!Array.isArray(steps)) {
      markError(scene, "El JSON debe ser un array [ ... ]");
      console.error("[gsap-init] El JSON debe ser un array. Recibido:", steps);
      return;
    }

    var masterTl = buildTimeline(steps, scene, debug);

    var startAttr = scene.getAttribute("data-gsap-start");
    var endAttr = scene.getAttribute("data-gsap-end");

    var stConfig = {
      animation: masterTl,
      trigger: scene,
      start: normalizeSymbols(startAttr !== null ? startAttr : CONFIG.defaults.start),
      end: normalizeSymbols(endAttr !== null ? endAttr : CONFIG.defaults.end),
      scrub: boolAttr(scene, "data-gsap-scrub") || CONFIG.defaults.scrub,
      pin: boolAttr(scene, "data-gsap-pin") || CONFIG.defaults.pin,
      markers: boolAttr(scene, "data-gsap-markers") || debug,
      anticipatePin: 1,
    };

    var scrubVal = scene.getAttribute("data-gsap-scrub");
    if (scrubVal && scrubVal !== "true" && scrubVal !== "false") {
      stConfig.scrub = parseFloat(scrubVal);
    }

    if (debug) console.log("[gsap-init] ScrollTrigger config:", stConfig);

    ScrollTrigger.create(stConfig);
  }

  // ─── Interaccions de pointer (Observer) ──────────────────────────────────────

  function initObserver(container, debug) {
    var observedElements = container.querySelectorAll("[data-gsap-observe-x], [data-gsap-observe-y], [data-gsap-observe-rotation], [data-gsap-observe-opacity], [data-gsap-observe-scale]");
    if (!observedElements.length) return;

    var targets = [];
    observedElements.forEach(function (el) {
      var d = el.dataset;
      var props = {};
      var found = false;
      for (var k in d) {
        if (k.indexOf("gsapObserve") === 0 && k !== "gsapObserve") {
          var prop = k.replace("gsapObserve", "");
          prop = prop.charAt(0).toLowerCase() + prop.slice(1);
          props[prop] = parseFloat(d[k]);
          found = true;
        }
      }
      if (found) {
        var qTo = {};
        for (var p in props) {
          qTo[p] = gsap.quickTo(el, p, { duration: 0.8, ease: "power2" });
        }
        targets.push({ el: el, props: props, qTo: qTo });
      }
    });

    if (!targets.length) return;
    if (debug) console.log("[gsap-init] Inicialitzant Observer per a", container);

    var obsType = container.dataset.gsapObserve || "pointer";
    if (obsType === "true") obsType = "pointer";

    Observer.create({
      target: container,
      type: obsType,
      onMove: function (self) {
        var rect = container.getBoundingClientRect();
        // Posició relativa al centre (-1 a 1)
        var relX = ((self.x - rect.left) / rect.width) * 2 - 1;
        var relY = ((self.y - rect.top) / rect.height) * 2 - 1;

        targets.forEach(function (t) {
          for (var p in t.qTo) {
            var mult = t.props[p];
            var val = 0;
            if (p === "x" || p === "rotation" || p === "skewX") {
              val = relX * mult;
            } else if (p === "y" || p === "skewY") {
              val = relY * mult;
            } else if (p === "opacity") {
              // Simular pèrdua d'opacitat als extrems si el mult és negatiu
              val = 1 + (Math.max(Math.abs(relX), Math.abs(relY)) * mult);
            } else {
              val = (Math.max(Math.abs(relX), Math.abs(relY))) * mult;
            }
            t.qTo[p](val);
          }
        });
      }
    });
  }

  // ─── Inicialització canvas ───────────────────────────────────────────────────

  function initCanvas(wrapper) {
    if (window.matchMedia("print").matches) {
      if (!wrapper.classList.contains("d-print-none")) {
        wrapper.classList.add("d-print-none");
      }
      return;
    }

    var d = wrapper.dataset;
    var srcPattern = d.gsapCanvasSrc;
    var totalFrames = parseInt(d.gsapCanvasFrames);
    var isSprite = (d.gsapCanvasSprite || "false") === "true";
    var spriteCols = parseInt(d.gsapCanvasCols || "1");
    var pad = parseInt(d.gsapCanvasPad !== undefined ? d.gsapCanvasPad : CONFIG.canvas.pad);
    var scrub = parseFloat(d.gsapCanvasScrub !== undefined ? d.gsapCanvasScrub : CONFIG.canvas.scrub);
    var useFade = (d.gsapCanvasFade !== undefined ? d.gsapCanvasFade : String(CONFIG.canvas.fade)) === "true";
    var fadeFrames = parseInt(d.gsapCanvasFadeFrames !== undefined ? d.gsapCanvasFadeFrames : CONFIG.canvas.fadeFrames);
    var start = normalizeSymbols(d.gsapCanvasStart !== undefined ? d.gsapCanvasStart : CONFIG.canvas.start);
    var end = normalizeSymbols(d.gsapCanvasEnd !== undefined ? d.gsapCanvasEnd : CONFIG.canvas.end);
    var markers = (d.gsapCanvasMarkers || "false") === "true";
    var debug = boolAttr(wrapper, CONFIG.debugAttr) ||
      wrapper.closest("[data-gsap-debug='true']") !== null;

    if (!srcPattern) {
      markError(wrapper, "data-gsap-canvas-src es requerido");
      return;
    }
    if (!totalFrames || isNaN(totalFrames)) {
      markError(wrapper, "data-gsap-canvas-frames es requerido");
      return;
    }

    var ratioStr = d.gsapCanvasRatio !== undefined ? d.gsapCanvasRatio : CONFIG.canvas.ratio;
    var ratio = Function("return " + ratioStr)();

    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.overflow = "hidden";

    var canvas = document.createElement("canvas");
    canvas.style.display = "block";
    wrapper.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    var currentFrame = 0;

    var spriteImg = null;
    var frames = isSprite ? null : new Array(totalFrames);
    var loaded = 0;
    var errored = 0;

    function onLoad() {
      loaded++;
      if (loaded + errored === totalFrames) {
        resizeCanvas();
        initScrollTrigger();
      }
    }

    function onError(i) {
      errored++;
      onLoad();
    }

    if (isSprite) {
      spriteImg = new Image();
      spriteImg.src = srcPattern;
      spriteImg.onload = function () {
        loaded = totalFrames;
        resizeCanvas();
        initScrollTrigger();
      };
      spriteImg.onerror = function () {
        markError(wrapper, "Error cargando sprite: " + srcPattern);
      };
    } else {
      for (var i = 0; i < totalFrames; i++) {
        (function (idx) {
          var img = new Image();
          var indexStr = String(idx);
          if (pad > 0) {
            while (indexStr.length < pad) { indexStr = "0" + indexStr; }
          }
          img.src = srcPattern.replace("{i}", indexStr);
          img.onload = onLoad;
          img.onerror = function () { onError(idx); };
          frames[idx] = img;
        })(i);
      }
    }

    function resizeCanvas() {
      var dpr = window.devicePixelRatio || 1;
      var w = wrapper.clientWidth;
      var h = Math.round(w / ratio);

      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      ctx.scale(dpr, dpr);
      drawFrame(currentFrame);
    }

    function drawFrame(frameIndex) {
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.width / dpr;
      var h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);

      if (isSprite) {
        if (!spriteImg || !spriteImg.complete) return;
        var sw = spriteImg.width / spriteCols;
        var rows = Math.ceil(totalFrames / spriteCols);
        var sh = spriteImg.height / rows;

        if (!useFade || totalFrames < 2) {
          var f = Math.max(0, Math.min(totalFrames - 1, Math.round(frameIndex)));
          var row = Math.floor(f / spriteCols);
          var col = f % spriteCols;
          ctx.drawImage(spriteImg, col * sw, row * sh, sw, sh, 0, 0, w, h);
          return;
        }

        var exact = Math.max(0, Math.min(totalFrames - 1, frameIndex));
        var prev = Math.floor(exact);
        var next = Math.min(prev + 1, totalFrames - 1);
        var blend = smoothBlend(exact - prev, fadeFrames / totalFrames);

        if (blend === 0 || prev === next) {
          var r = Math.floor(prev / spriteCols);
          var c = prev % spriteCols;
          ctx.drawImage(spriteImg, c * sw, r * sh, sw, sh, 0, 0, w, h);
        } else {
          var r1 = Math.floor(prev / spriteCols), c1 = prev % spriteCols;
          var r2 = Math.floor(next / spriteCols), c2 = next % spriteCols;

          ctx.globalAlpha = 1;
          ctx.drawImage(spriteImg, c1 * sw, r1 * sh, sw, sh, 0, 0, w, h);
          ctx.globalAlpha = blend;
          ctx.drawImage(spriteImg, c2 * sw, r2 * sh, sw, sh, 0, 0, w, h);
        }
        ctx.globalAlpha = 1;
        return;
      }

      if (!useFade || totalFrames < 2) {
        var f = Math.max(0, Math.min(totalFrames - 1, Math.round(frameIndex)));
        if (frames[f] && frames[f].complete) ctx.drawImage(frames[f], 0, 0, w, h);
        return;
      }

      var exact = Math.max(0, Math.min(totalFrames - 1, frameIndex));
      var prev = Math.floor(exact);
      var next = Math.min(prev + 1, totalFrames - 1);
      var blend = smoothBlend(exact - prev, fadeFrames / totalFrames);

      if (blend === 0 || prev === next) {
        ctx.globalAlpha = 1;
        if (frames[prev] && frames[prev].complete) ctx.drawImage(frames[prev], 0, 0, w, h);
      } else {
        if (frames[prev] && frames[prev].complete) {
          ctx.globalAlpha = 1;
          ctx.drawImage(frames[prev], 0, 0, w, h);
        }
        if (frames[next] && frames[next].complete) {
          ctx.globalAlpha = blend;
          ctx.drawImage(frames[next], 0, 0, w, h);
        }
      }
      ctx.globalAlpha = 1;
    }

    function initScrollTrigger() {
      // ─── Badge "Scroll per continuar" ─────────────────────────────────────
      var badge = createScrollBadge();
      function showBadge() { badge.style.opacity = "1"; }
      function hideBadge() { badge.style.opacity = "0"; }
      // ──────────────────────────────────────────────────────────────────────

      var state = { frame: 0 };
      gsap.to(state, {
        frame: totalFrames - 1,
        ease: "none",
        scrollTrigger: {
          trigger: wrapper,
          start: start,
          end: end,
          scrub: scrub,
          markers: markers,
          pin: true,
          anticipatePin: 1,
          onEnter: showBadge,
          onLeave: hideBadge,
          onEnterBack: showBadge,
          onLeaveBack: hideBadge,
        },
        onUpdate: function () {
          currentFrame = state.frame;
          drawFrame(state.frame);
        }
      });
    }

    window.addEventListener("ibgsap:layout", function () {
      resizeCanvas();
      ScrollTrigger.refresh();
    });
  }

  function smoothBlend(t, threshold) {
    if (threshold <= 0) return t > 0 ? 1 : 0;
    return Math.min(1, t / threshold);
  }

  function initGenericParallax(wrapper) {
    var layers = wrapper.querySelectorAll("[data-gsap-depth]");
    if (layers.length === 0) return;

    var start = normalizeSymbols(wrapper.dataset.gsapStart !== undefined ? wrapper.dataset.gsapStart : "top bottom");
    var end = normalizeSymbols(wrapper.dataset.gsapEnd !== undefined ? wrapper.dataset.gsapEnd : "bottom top");

    var scrub = wrapper.dataset.gsapScrub;
    if (scrub === undefined || scrub === "true") scrub = true;
    else if (scrub === "false") scrub = false;
    else scrub = parseFloat(scrub) || true;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: start,
        end: end,
        scrub: scrub
      }
    });

    layers.forEach(function (layer) {
      var depth = parseFloat(layer.getAttribute("data-gsap-depth")) || 0;
      tl.fromTo(layer, { y: 0 }, {
        y: -300 * depth,
        ease: "none"
      }, 0);
    });
  }

  function init() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("print").matches) return;
    if (document.body && document.body.classList.contains("page-mod-book-print")) return;

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    if (typeof Observer === "undefined" && typeof ScrollTrigger.Observer !== "undefined") {
      window.Observer = ScrollTrigger.Observer;
    }

    gsap.registerPlugin(ScrollTrigger, Observer);

    var refreshAll = function () {
      ScrollTrigger.refresh();
      window.dispatchEvent(new CustomEvent("ibgsap:layout"));
    };

    window.addEventListener("resize", refreshAll);

    var mainContent = document.querySelector('div[role="main"]') || document.body;
    if (window.ResizeObserver) {
      new ResizeObserver(refreshAll).observe(mainContent);
    }

    var genericParallaxes = document.querySelectorAll("[data-gsap-parallax]");
    for (var i = 0; i < genericParallaxes.length; i++) {
      initGenericParallax(genericParallaxes[i]);
    }

    var scenes = document.querySelectorAll("[data-gsap-scene]");
    for (var j = 0; j < scenes.length; j++) {
      var scene = scenes[j];
      scene.style.userSelect = "none";
      scene.style.webkitUserSelect = "none";

      var layers = scene.querySelectorAll(".position-absolute, .position-relative");
      for (var k = 0; k < layers.length; k++) {
        if (layers[k] !== scene) layers[k].style.pointerEvents = "none";
      }

      var interactives = scene.querySelectorAll(
        "img, a, button, .interactive, [class*='-bg'], [class*='-stat'], [class*='-title'], [class*='-label'], [class*='-desc']"
      );
      for (var l = 0; l < interactives.length; l++) {
        interactives[l].style.pointerEvents = "auto";
      }

      initScene(scene);
    }

    var canvases = document.querySelectorAll("[data-gsap-canvas]");
    for (var m = 0; m < canvases.length; m++) {
      initCanvas(canvases[m]);
    }

    var observers = document.querySelectorAll("[data-gsap-observe]");
    for (var n = 0; n < observers.length; n++) {
      initObserver(observers[n], false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();