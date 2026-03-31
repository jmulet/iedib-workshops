/**
 * IBParallax API 
 * Un potenciador puramente declarativo para secciones Hero con efectos de paralaje (Mouse + Scroll).
 * (c) Josep Mulet Pol (2026)
 * 
 * --- DOCUMENTACIÓN DE ATRIBUTOS (Declarativo) ---
 * 
 * En el CONTENEDOR principal [data-snptd="parallax"]:
 *  - data-snptd="parallax"        : Identificador para auto-activación.
  *  - data-scroll-depth="300"      : Intensidad del efecto de scroll (Default: 300).
 *  - data-parallax-start="0"     : % del viewport desde el tope para el punto de reposo (factor 0).
 *  - data-parallax-end="100"         : % del viewport desde el tope para el desplazamiento máximo (factor 1).
 *  - data-parallax-clamp="true"   : Si es "true" (default), mantiene los límites 0 y 1 fuera del rango definido.
 *  - data-parallax-mode="both"    : Modo de interacción: "both", "mouse", "scroll" (Default: "both").
 *  - data-parallax-multiplier="140": Sensibilidad al movimiento del ratón (Default: 140).
 *  - data-parallax-transition="0.1s": Suavidad del movimiento (CSS transition duration) (Default: "0.1s").
 *  - data-parallax-direction="both": Restricción de ejes: "both", "x", "y" (Default: "both").
 *  - data-parallax-from="center"     : Referencia del container: "top", "center", "bottom" (Default: "top").
 * 
 * En las CAPAS (Layers) hijas [data-depth]:
 *  - data-depth="0.1"             : Factor de profundidad (positivo/negativo para dirección).
 *  - data-parallax-layer           : Alternativa a data-depth. Identifica la capa sin desplazamiento propio.
 *                                   Permite usar zoom/fade/offset sin movimiento de parallax.
 *  - data-parallax-zoom="1.2,1.0": Escala inicial y final. Ex: "1.2,1" zoom-out; "1,1.2" zoom-in.
 *                                  Valor único: "1.2" applica el mismo zoom en ambos extremos (estático).
 *  - data-parallax-fade="out"     : Opacidad. Valores: "in" (0→1), "out" (1→0), "in-out" (0→1→0),
 *                                  o "start,end" para control preciso. Ex: "0.2,1".
 *  - data-parallax-offset="x,y"   : Desplazamiento adicional en px al completar la animación.
 *                                  Se aplica como delta proporcional al scrollFactor.
 *                                  Ex: "0,50" sube 50px extra al llegar al final.
 * 
 * --- EJEMPLOS ---
 * 
 * Ejemplo 1 (Básico con texto):
 * <div data-snptd="parallax" style="position:relative; height:300px; overflow:hidden;">
 *    <div data-depth="0.2" style="top:20%; left:10%;">CAPA FONDO</div>
 *    <div data-depth="0.5" style="top:50%; left:30%;">CAPA FRENTE</div>
 * </div>
 * 
 * Ejemplo 2 (Imágenes PNG capas):
 * <div data-snptd="parallax" data-parallax-mode="scroll" style="height:300px;">
 *    <img src="bg.png" data-depth="0.05" style="width:110%;">
 *    <img src="mg.png" data-depth="0.2" style="width:110%;">
 *    <img src="fg.png" data-depth="0.4" style="width:110%;">
 * </div>
 */
window.IBParallax = (function () {

    var init = function (container) {
        if (!container) return;

        // Soporte para accesibilidad y accesibilidad de movimiento
        var isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var isPrint = window.matchMedia('print').matches;
        if (isReduced || isPrint) {
            return;
        }


        // --- Configuración via atributos data-* ---
        var scrollDepth = parseInt(container.getAttribute('data-scroll-depth')) || 300;
        var mode = container.getAttribute('data-parallax-mode') || 'scroll'; // both, mouse, scroll
        var multiplier = parseFloat(container.getAttribute('data-parallax-multiplier')) || 140;
        var transition = container.getAttribute('data-parallax-transition') || '0.1s';
        var direction = container.getAttribute('data-parallax-direction') || 'y'; // both, x, y
        var start = container.hasAttribute('data-parallax-start') ? parseFloat(container.getAttribute('data-parallax-start')) : 25;
        var end = container.hasAttribute('data-parallax-end') ? parseFloat(container.getAttribute('data-parallax-end')) : 75;
        var clamp = container.getAttribute('data-parallax-clamp') !== 'false'; // Default true for trigger logic
        var from = container.getAttribute('data-parallax-from') || 'center';
        var reverse = container.getAttribute('data-parallax-animdir') === 'revert' || container.getAttribute('data-animdir') === 'revert';

        var layers = container.querySelectorAll('[data-depth], [data-parallax-layer]');

        // Preparar las capas
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];


            // Soporte para ajustes de layout automáticos
            var fit = layer.getAttribute('data-parallax-fit');
            if (fit && fit.indexOf('cover') === 0) {
                var increment = 20; // default
                var parts = fit.split('-');
                if (parts.length > 1) {
                    increment = parseInt(parts[1]) || 20;
                }
                var offset = increment / 2;
                layer.style.top = -offset + '%';
                layer.style.left = -offset + '%';
                layer.style.width = (100 + increment) + '%';
                layer.style.height = (100 + increment) + '%';
                layer.style.objectFit = 'cover';
            } else if (fit === 'center') {
                layer.style.top = '50%';
                layer.style.left = '50%';
                layer.style.transformOrigin = 'center bottom';

                var adjustCenter = function (el) {
                    el.style.marginTop = -(el.offsetHeight / 2) + 'px';
                    el.style.marginLeft = -(el.offsetWidth / 2) + 'px';
                };

                if (layer.tagName === 'IMG' && !layer.complete) {
                    layer.addEventListener('load', function () { adjustCenter(this); });
                } else {
                    adjustCenter(layer);
                }
            }

            var transitionValue = 'transform ' + transition + ' ease-out, opacity ' + transition + ' ease-out';
            layer.style.transition = transitionValue;
            layer.style.webkitTransition = '-webkit-transform ' + transition + ' ease-out, opacity ' + transition + ' ease-out';
        }

        // --- Estado y Lógica ---
        var mouseX = 0, mouseY = 0, scrollFactor = 0;
        var ticking = false;

        var requestTick = function () {
            if (!ticking) {
                window.requestAnimationFrame(function () {
                    updateParallax();
                    ticking = false;
                });
                ticking = true;
            }
        };

        var updateParallax = function () {
            var enableMouse = (mode === 'both' || mode === 'mouse');
            var enableScroll = (mode === 'both' || mode === 'scroll');

            for (var j = 0; j < layers.length; j++) {
                var l = layers[j];
                var depth = parseFloat(l.getAttribute('data-depth')) || 0;
                var moveX = 0, moveY = 0;

                // 1. Aportación del Ratón
                if (enableMouse) {
                    moveX += mouseX * (depth * multiplier);
                    moveY += mouseY * (depth * multiplier);
                }

                // 2. Aportación del Scroll (solo afecta eje Y normalmente, sumado a mouse)
                if (enableScroll) {
                    moveY += scrollFactor * (depth * scrollDepth);
                }

                // 3. Bloqueo de dirección
                if (direction === 'x') moveY = 0;
                if (direction === 'y') moveX = 0;

                // 4. Efectos adicionales de capa
                var sf = Math.max(0, Math.min(1, scrollFactor)); // factor acotado [0..1] para efectos
                var layerReverse = l.getAttribute('data-parallax-animdir') === 'revert' || l.getAttribute('data-animdir') === 'revert';
                if (layerReverse) sf = 1 - sf;

                // Zoom
                var scaleVal = 1;
                var zoomAttr = l.getAttribute('data-parallax-zoom');
                if (zoomAttr) {
                    var zoomParts = zoomAttr.split(',');
                    var zoomStart = parseFloat(zoomParts[0]);
                    var zoomEnd = zoomParts.length > 1 ? parseFloat(zoomParts[1]) : zoomStart;
                    scaleVal = zoomStart + (zoomEnd - zoomStart) * sf;
                }

                // Offset addicional
                var offsetAttr = l.getAttribute('data-parallax-offset');
                if (offsetAttr) {
                    var offParts = offsetAttr.split(',');
                    var oxStart = 0, oyStart = 0, oxEnd = 0, oyEnd = 0;
                    if (offParts.length >= 4) {
                        oxStart = parseFloat(offParts[0]) || 0;
                        oyStart = parseFloat(offParts[1]) || 0;
                        oxEnd = parseFloat(offParts[2]) || 0;
                        oyEnd = parseFloat(offParts[3]) || 0;
                    } else {
                        oxEnd = parseFloat(offParts[0]) || 0;
                        oyEnd = parseFloat(offParts[1]) || 0;
                    }
                    moveX += oxStart + (oxEnd - oxStart) * sf;
                    moveY += oyStart + (oyEnd - oyStart) * sf;
                }

                // Fade
                var fadeAttr = l.getAttribute('data-parallax-fade');
                if (fadeAttr) {
                    var fadeStart, fadeEnd;
                    if (fadeAttr === 'in') { fadeStart = 0; fadeEnd = 1; }
                    else if (fadeAttr === 'out') { fadeStart = 1; fadeEnd = 0; }
                    else if (fadeAttr === 'in-out') {
                        l.style.opacity = sf < 0.5 ? sf * 2 : (1 - sf) * 2;
                        fadeAttr = null; // handled
                    } else {
                        var fp = fadeAttr.split(',');
                        fadeStart = parseFloat(fp[0]);
                        fadeEnd = fp.length > 1 ? parseFloat(fp[1]) : 1;
                    }
                    if (fadeAttr !== null) {
                        l.style.opacity = fadeStart + (fadeEnd - fadeStart) * sf;
                    }
                }

                var transform = 'translate(' + moveX.toFixed(2) + 'px, ' + moveY.toFixed(2) + 'px) scale(' + scaleVal.toFixed(4) + ')';
                l.style.transform = transform;
                l.style.webkitTransform = transform;
            }
        };

        // Escuchador de Ratón
        if (mode === 'both' || mode === 'mouse') {
            window.addEventListener('mousemove', function (e) {
                var rect = container.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    mouseX = ((e.clientX - rect.left) / rect.width) - 0.5;
                    mouseY = ((e.clientY - rect.top) / rect.height) - 0.5;
                    requestTick();
                }
            });
        }

        // Escuchador de Scroll
        if (mode === 'both' || mode === 'scroll') {
            var handleScroll = function () {
                var rect = container.getBoundingClientRect();
                var viewportHeight = window.innerHeight;

                // Solo calculamos si el contenedor está cerca del área visible (2 vh por arriba y 1 vh por debajo)
                if (rect.top < viewportHeight * 2 && rect.bottom > -viewportHeight) {
                    var sPx = viewportHeight * (start / 100);
                    var ePx = viewportHeight * (end / 100);
                    var range = ePx - sPx;

                    var ref = rect.top;
                    if (from === 'center') ref += rect.height / 2;
                    if (from === 'bottom') ref += rect.height;

                    var factor = (Math.abs(range) > 0.001) ? (ref - sPx) / range : 0;

                    if (clamp) {
                        factor = Math.max(0, Math.min(1, factor));
                    }

                    if (reverse) factor = 1 - factor;

                    scrollFactor = factor;
                    requestTick();
                }
            };

            window.addEventListener('scroll', handleScroll);
            // Posicionamiento inicial del factor de scroll
            handleScroll();
        }

        // Renderizado inicial forzado
        updateParallax();
    };

    var bind = function () {
        // Selector principal por atributo declarativo
        var targets = document.querySelectorAll('[data-snptd="parallax"]');
        for (var i = 0; i < targets.length; i++) {
            var t = targets[i];
            if (!t.getAttribute('data-parallax-active')) {
                t.setAttribute('data-parallax-active', '1');
                init(t);
            }
        }
    };

    return {
        init: init,
        bind: bind
    };
})();

// Auto-inicialización global
IBParallax.bind();