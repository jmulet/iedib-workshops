/**
 * ibgsap.js
 * Sistema declarativo GSAP + ScrollTrigger para Moodle
 *
 * DEPENDENCIAS (cargar antes de este script):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
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
 *
 * USO CANVAS (secuencia de imágenes scrubbeada por scroll):
 *   <div
 *     data-gsap-canvas
 *     data-gsap-canvas-src="frames/frame_{i}.webp"
 *     data-gsap-canvas-frames="60"
 *     data-gsap-canvas-pad="4"
 *     data-gsap-canvas-ratio="16/9"
 *     data-gsap-canvas-scrub="0.8"
 *     data-gsap-canvas-fade="true"
 *     data-gsap-canvas-fade-frames="4"
 *     data-gsap-canvas-start="top top"
 *     data-gsap-canvas-end="+=300%"
 *     data-gsap-canvas-markers="false"
 *   ></div>
 *
 *   Atributos data-gsap-canvas-*:
 *     src          — patrón de ruta con {i} como placeholder del índice (requerido)
 *     frames       — número total de frames (requerido)
 *     pad          — ceros de relleno del índice, ej: pad="4" → 0001 (default: 0)
 *     ratio        — relación de aspecto, ej: "16/9", "4/3" (default: "16/9")
 *     scrub        — suavizado GSAP scrub en segundos (default: 0.5)
 *     fade         — "true" activa crossfade tenue entre frames (default: "false")
 *     fade-frames  — intensidad del fade: cuántos frames dura la transición (default: 3)
 *     start        — ScrollTrigger start (default: "top top")
 *     end          — duración del pin, ej: "+=300%" (default: "+=300%")
 *     markers      — "true" muestra marcadores ScrollTrigger (default: "false")
 *
 *   Nota: el pin lo gestiona siempre ScrollTrigger (compatible con Moodle).
 *   No usar position:sticky ni height en el wrapper.
 */

(function () {
  "use strict";

  // ─── Configuración global ───────────────────────────────────────────────────

  const CONFIG = {
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
    debugAttr: "data-gsap-debug",
    errorStyle: "outline: 3px solid red; outline-offset: 4px;",
  };

  // ─── Utilidades ─────────────────────────────────────────────────────────────

  function safeParseJSON(str, context) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error(
        `[gsap-init] JSON inválido en escena:`, context, "\n",
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
    const v = el.getAttribute(attr);
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

  // ─── Constructor de timelines ────────────────────────────────────────────────

  function buildTimeline(steps, scope, debug) {
    const tl = gsap.timeline();

    steps.forEach((step, i) => {

      if (step.subtimeline) {
        if (!Array.isArray(step.subtimeline)) {
          console.warn(`[gsap-init] step[${i}].subtimeline no es un array`, step);
          return;
        }
        const subtl = buildTimeline(step.subtimeline, scope, debug);
        const position = normalizeSymbols(step.position ?? CONFIG.defaults.position);
        if (debug) console.log(`[gsap-init] subtimeline en posición "${position}"`);
        tl.add(subtl, position);
        return;
      }

      if (!step.target) {
        console.warn(`[gsap-init] step[${i}] no tiene "target"`, step);
        return;
      }

      let el;
      if (Array.isArray(step.target)) {
        el = step.target.map(sel => scope.querySelector(normalizeSymbols(sel))).filter(Boolean);
      } else {
        el = scope.querySelector(normalizeSymbols(step.target));
      }

      if (!el || (Array.isArray(el) && el.length === 0)) {
        console.warn(`[gsap-init] target "${step.target}" no encontrado en`, scope);
        return;
      }

      const from = step.from ?? {};
      const to = { ...(step.to ?? {}) };
      const position = normalizeSymbols(step.position ?? CONFIG.defaults.position);

      to.duration = step.duration ?? CONFIG.defaults.duration;
      to.ease = step.ease ?? CONFIG.defaults.ease;

      if (step.stagger !== undefined) to.stagger = step.stagger;
      if (step.repeat !== undefined) to.repeat = step.repeat;
      if (step.yoyo !== undefined) to.yoyo = step.yoyo;

      if (debug) {
        console.log(
          `[gsap-init] step[${i}] target="${step.target}"`,
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

  // ─── Inicialización de escena (sistema original) ─────────────────────────────

  function initScene(scene) {
    const debug = boolAttr(scene, CONFIG.debugAttr) ||
      scene.closest("[data-gsap-debug='true']") !== null;

    const tmpl = scene.querySelector(":scope > template[data-gsap-timeline]");

    if (!tmpl) {
      if (debug) console.log("[gsap-init] escena sin template:", scene);
    }

    // Parsear JSON (limpiar saltos de línea y etiquetas <br> para evitar errores de parseo)
    const rawJSON = tmpl ? tmpl.innerHTML.replace(/<br\s*\/?>/gi, " ").replace(/[\r\n]+/g, " ").trim() : "[]";
    const steps = safeParseJSON(rawJSON, scene);

    if (steps === null) {
      markError(scene, "JSON inválido en <template data-gsap-timeline>");
      return;
    }

    if (!Array.isArray(steps)) {
      markError(scene, "El JSON debe ser un array [ ... ]");
      console.error("[gsap-init] El JSON debe ser un array. Recibido:", steps);
      return;
    }

    const masterTl = buildTimeline(steps, scene, debug);

    const stConfig = {
      animation: masterTl,
      trigger: scene,
      start: normalizeSymbols(scene.getAttribute("data-gsap-start") ?? CONFIG.defaults.start),
      end: normalizeSymbols(scene.getAttribute("data-gsap-end") ?? CONFIG.defaults.end),
      scrub: boolAttr(scene, "data-gsap-scrub") || CONFIG.defaults.scrub,
      pin: boolAttr(scene, "data-gsap-pin") || CONFIG.defaults.pin,
      markers: boolAttr(scene, "data-gsap-markers") || debug,
      anticipatePin: 1,
    };

    if (stConfig.pin) {
      //stConfig.pinType = "transform";
    }

    const scrubVal = scene.getAttribute("data-gsap-scrub");
    if (scrubVal && scrubVal !== "true" && scrubVal !== "false") {
      stConfig.scrub = parseFloat(scrubVal);
    }

    if (debug) console.log("[gsap-init] ScrollTrigger config:", stConfig);

    ScrollTrigger.create(stConfig);
  }

  // ─── Inicialización canvas ───────────────────────────────────────────────────

  /**
   * Inicializa un wrapper data-gsap-canvas:
   * - Construye el canvas dentro del wrapper
   * - Precarga las imágenes
   * - Crea el ScrollTrigger con pin (compatible Moodle, sin sticky)
   * - Gestiona responsive + devicePixelRatio
   * - Soporta fade tenue opcional entre frames contiguos
   *
   * @param {Element} wrapper
   */
  function initCanvas(wrapper) {

    const d = wrapper.dataset;

    // — Leer atributos —
    const srcPattern = d.gsapCanvasSrc;
    const totalFrames = parseInt(d.gsapCanvasFrames);
    const pad = parseInt(d.gsapCanvasPad ?? CONFIG.canvas.pad);
    const scrub = parseFloat(d.gsapCanvasScrub ?? CONFIG.canvas.scrub);
    const useFade = (d.gsapCanvasFade ?? String(CONFIG.canvas.fade)) === "true";
    const fadeFrames = parseInt(d.gsapCanvasFadeFrames ?? CONFIG.canvas.fadeFrames);
    const start = normalizeSymbols(d.gsapCanvasStart ?? CONFIG.canvas.start);
    const end = normalizeSymbols(d.gsapCanvasEnd ?? CONFIG.canvas.end);
    const markers = (d.gsapCanvasMarkers ?? "false") === "true";
    const debug = boolAttr(wrapper, CONFIG.debugAttr) ||
      wrapper.closest("[data-gsap-debug='true']") !== null;

    // — Validaciones mínimas —
    if (!srcPattern) {
      markError(wrapper, "data-gsap-canvas-src es requerido");
      console.error("[gsap-init][canvas] Falta data-gsap-canvas-src en", wrapper);
      return;
    }
    if (!totalFrames || isNaN(totalFrames)) {
      markError(wrapper, "data-gsap-canvas-frames es requerido y debe ser un número");
      console.error("[gsap-init][canvas] Falta data-gsap-canvas-frames en", wrapper);
      return;
    }

    // — Ratio —
    const ratioStr = d.gsapCanvasRatio ?? CONFIG.canvas.ratio;
    const ratio = Function("return " + ratioStr)(); // ej: "16/9" → 1.777

    // — Construir canvas dentro del wrapper —
    // El pin lo hace ScrollTrigger (no sticky, compatible con Moodle)
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.overflow = "hidden";

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    wrapper.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    let currentFrame = 0;

    // — Precargar imágenes —
    const frames = new Array(totalFrames);
    let loaded = 0;
    let errored = 0;

    function onLoad() {
      loaded++;
      if (loaded + errored === totalFrames) {
        if (debug) console.log(`[gsap-init][canvas] ${loaded} frames cargados, ${errored} errores`);
        resizeCanvas();
        initScrollTrigger();
      }
    }

    function onError(i) {
      errored++;
      console.warn(`[gsap-init][canvas] Error cargando frame ${i}: ${frames[i].src}`);
      onLoad();
    }

    for (let i = 0; i < totalFrames; i++) {
      const img = new Image();
      const index = pad > 0 ? String(i).padStart(pad, "0") : String(i);
      img.src = srcPattern.replace("{i}", index);
      img.onload = onLoad;
      img.onerror = () => onError(i);
      frames[i] = img;
    }

    // — Responsive —
    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const w = wrapper.clientWidth;
      const h = Math.round(w / ratio);

      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      ctx.scale(dpr, dpr);
      drawFrame(currentFrame);
    }

    // — Dibujo —
    function drawFrame(frameIndex) {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);

      if (!useFade || totalFrames < 2) {
        const f = clampRound(frameIndex, totalFrames);
        if (frames[f]?.complete) ctx.drawImage(frames[f], 0, 0, w, h);
        return;
      }

      // Crossfade tenue entre frame actual y siguiente
      const exact = Math.max(0, Math.min(totalFrames - 1, frameIndex));
      const prev = Math.floor(exact);
      const next = Math.min(prev + 1, totalFrames - 1);
      const blend = smoothBlend(exact - prev, fadeFrames / totalFrames);

      if (blend === 0 || prev === next) {
        ctx.globalAlpha = 1;
        if (frames[prev]?.complete) ctx.drawImage(frames[prev], 0, 0, w, h);
      } else {
        // Para evitar 'saltos' de intensidad o transparencia, dibujamos siempre
        // el frame base al 100% y superponemos el siguiente con opacidad variable.
        if (frames[prev]?.complete) {
          ctx.globalAlpha = 1;
          ctx.drawImage(frames[prev], 0, 0, w, h);
        }
        if (frames[next]?.complete) {
          ctx.globalAlpha = blend;
          ctx.drawImage(frames[next], 0, 0, w, h);
        }
      }
      ctx.globalAlpha = 1;
    }

    // — ScrollTrigger con pin (sin sticky) —
    function initScrollTrigger() {
      const state = { frame: 0 };

      gsap.to(state, {
        frame: totalFrames - 1,
        ease: "none",
        scrollTrigger: {
          trigger: wrapper,
          start,
          end,
          scrub,
          markers,
          pin: true,
          // pinType: "transform",  // evita saltos en contenedores Moodle
          anticipatePin: 1,
        },
        onUpdate() {
          currentFrame = state.frame;
          drawFrame(state.frame);
        },
      });

      if (debug) {
        console.log("[gsap-init][canvas] ScrollTrigger iniciado", {
          src: srcPattern, totalFrames, ratio: ratioStr,
          scrub, useFade, fadeFrames, start, end,
        });
      }
    }

    // — Resize —
    window.addEventListener("resize", () => {
      resizeCanvas();
      ScrollTrigger.refresh();
    });
  }

  // ─── Helpers canvas ──────────────────────────────────────────────────────────

  function clampRound(val, total) {
    return Math.max(0, Math.min(total - 1, Math.round(val)));
  }

  /**
   * Suaviza el blend del fade para evitar parpadeo en scrubs rápidos.
   * threshold controla qué fracción del rango 0→1 dura la transición.
   */
  function smoothBlend(t, threshold) {
    if (threshold <= 0) return t > 0 ? 1 : 0;
    return Math.min(1, t / threshold);
  }

  function initGenericParallax(wrapper) {
    const layers = wrapper.querySelectorAll("[data-gsap-depth]");
    if (layers.length === 0) return;

    // Configuración básica para parallax genérico
    const start = normalizeSymbols(wrapper.dataset.gsapStart ?? "top bottom");
    const end = normalizeSymbols(wrapper.dataset.gsapEnd ?? "bottom top");

    // Parseo robusto de scrub
    let scrub = wrapper.dataset.gsapScrub;
    if (scrub === undefined || scrub === "true") scrub = true;
    else if (scrub === "false") scrub = false;
    else scrub = parseFloat(scrub) || true;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: start,
        end: end,
        scrub: scrub
      }
    });

    layers.forEach(layer => {
      const depth = parseFloat(layer.getAttribute("data-gsap-depth")) || 0;
      // Multiplicador más fuerte (200px) para que el efecto sea visible
      // Usamos fromTo para asegurar que el punto de partida es el diseño original
      tl.fromTo(layer, { y: 0 }, {
        y: -300 * depth,
        ease: "none"
      }, 0);
    });

    if (boolAttr(wrapper, CONFIG.debugAttr)) {
      console.log(`[gsap-init][parallax] Inicializado con ${layers.length} capas`, { start, end, scrub });
    }
  }

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  function init() {
    // 1. Accesibilidad y Modo Impresión
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      console.info("[gsap-init] Animaciones desactivadas por preferencia del usuario (reduced motion).");
      return;
    }
    if (window.matchMedia("print").matches) return;

    if (typeof gsap === "undefined") {
      console.error("[gsap-init] GSAP no está cargado.");
      return;
    }
    if (typeof ScrollTrigger === "undefined") {
      console.error("[gsap-init] ScrollTrigger no está cargado.");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    window.addEventListener("resize", () => {
      ScrollTrigger.refresh();
    });

    // — Parallax Genérico (data-gsap-parallax) —
    const genericParallaxes = document.querySelectorAll("[data-gsap-parallax]");
    genericParallaxes.forEach(initGenericParallax);

    // — Escenas normales —
    const scenes = document.querySelectorAll("[data-gsap-scene]");

    if (scenes.length === 0 && document.querySelectorAll("[data-gsap-canvas]").length === 0 && genericParallaxes.length === 0) {
      console.warn("[gsap-init] No se encontraron elementos [data-gsap-scene], [data-gsap-canvas] ni [data-gsap-parallax].");
      return;
    }

    scenes.forEach(scene => {
      scene.style.userSelect = "none";
      scene.style.webkitUserSelect = "none";

      const layers = scene.querySelectorAll(".position-absolute, .position-relative");
      layers.forEach(ly => {
        if (ly === scene) return;
        ly.style.pointerEvents = "none";
      });

      const interactives = scene.querySelectorAll(
        "img, a, button, .interactive, [class*='-bg'], [class*='-stat'], [class*='-title'], [class*='-label'], [class*='-desc']"
      );
      interactives.forEach(it => { it.style.pointerEvents = "auto"; });

      initScene(scene);
    });

    // — Canvas —
    const canvases = document.querySelectorAll("[data-gsap-canvas]");
    canvases.forEach(initCanvas);

    console.info(
      `[gsap-init] ${scenes.length} escena(s), ${canvases.length} canvas y ${genericParallaxes.length} parallax genérico(s) inicializado(s).`
    );
  }

  // Esperar DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();