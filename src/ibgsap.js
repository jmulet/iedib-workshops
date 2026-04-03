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

  // ─── Configuración global ───────────────────────────────────────────────────

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
    debugAttr: "data-gsap-debug",
    errorStyle: "outline: 3px solid red; outline-offset: 4px;",
  };

  // ─── Utilidades ─────────────────────────────────────────────────────────────

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

  // ─── Inicialización de escena (sistema original) ─────────────────────────────

  function initScene(scene) {
    var debug = boolAttr(scene, CONFIG.debugAttr) ||
      scene.closest("[data-gsap-debug='true']") !== null;

    var tmpl = scene.querySelector("[data-gsap-timeline]");

    if (!tmpl) {
      if (debug) console.log("[gsap-init] escena sin timeline:", scene);
    } else {
      // Si usamos pre o code (porque TinyMCE borra <template>), debemos ocultarlos
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

  // ─── Inicialización canvas ───────────────────────────────────────────────────

  function initCanvas(wrapper) {
    var d = wrapper.dataset;
    var srcPattern = d.gsapCanvasSrc;
    var totalFrames = parseInt(d.gsapCanvasFrames);
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

    var frames = new Array(totalFrames);
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

    for (var i = 0; i < totalFrames; i++) {
        (function(idx) {
            var img = new Image();
            var indexStr = String(idx);
            if (pad > 0) {
              while (indexStr.length < pad) { indexStr = "0" + indexStr; }
            }
            img.src = srcPattern.replace("{i}", indexStr);
            img.onload = onLoad;
            img.onerror = function() { onError(idx); };
            frames[idx] = img;
        })(i);
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
          anticipatePin: 1
        },
        onUpdate: function() {
          currentFrame = state.frame;
          drawFrame(state.frame);
        }
      });
    }

    window.addEventListener("ibgsap:layout", function() {
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

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    var refreshAll = function() {
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();