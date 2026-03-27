if (window.AOS && typeof window.AOS.init == 'function') {
    AOS.init();
}

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
 *  - data-parallax-mode="both"    : Modo de interacción: "both", "mouse", "scroll" (Default: "both").
 *  - data-parallax-multiplier="140": Sensibilidad al movimiento del ratón (Default: 140).
 *  - data-parallax-transition="0.1s": Suavidad del movimiento (CSS transition duration) (Default: "0.1s").
 *  - data-parallax-direction="both": Restricción de ejes: "both", "x", "y" (Default: "both").
 * 
 * En las CAPAS (Layers) hijas [data-depth]:
 *  - data-depth="0.1"             : Factor de profundidad. 
 *                                   Valores > 0 siguen el movimiento.
 *                                   Valores < 0 invierten el movimiento.
 *                                   Valores mayores incrementan el desplazamiento.
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
 * <div data-snptd="parallax" data-parallax-mode="scroll" style="...">
 *    <img src="bg.png" data-depth="0.05" style="position:absolute; width:110%;">
 *    <img src="mg.png" data-depth="0.2" style="position:absolute; width:110%;">
 *    <img src="fg.png" data-depth="0.4" style="position:absolute; width:110%;">
 * </div>
 */
window.IBParallax = (function () {

    var init = function (container) {
        if (!container) return;

        // --- Configuración via atributos data-* ---
        var scrollDepth = parseInt(container.getAttribute('data-scroll-depth')) || 300;
        var mode = container.getAttribute('data-parallax-mode') || 'both'; // both, mouse, scroll
        var multiplier = parseFloat(container.getAttribute('data-parallax-multiplier')) || 140;
        var transition = container.getAttribute('data-parallax-transition') || '0.1s';
        var direction = container.getAttribute('data-parallax-direction') || 'both'; // both, x, y

        var layers = container.querySelectorAll('[data-depth]');

        // Preparar las capas
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var layerStyle = getComputedStyle(layer);

            if (layerStyle.position === 'static') {
                layer.style.position = 'absolute';
            }

            var transitionValue = 'transform ' + transition + ' ease-out';
            layer.style.transition = transitionValue;
            layer.style.webkitTransition = '-webkit-transform ' + transitionValue;
            layer.style.willChange = 'transform';
        }

        // --- Estado y Lógica ---
        var mouseX = 0, mouseY = 0, scrollFactor = 0;

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

                var transform = 'translate(' + moveX.toFixed(2) + 'px, ' + moveY.toFixed(2) + 'px)';
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
                    updateParallax();
                }
            });
        }

        // Escuchador de Scroll
        if (mode === 'both' || mode === 'scroll') {
            window.addEventListener('scroll', function () {
                var rect = container.getBoundingClientRect();
                var viewportHeight = window.innerHeight;
                if (rect.top < viewportHeight && rect.bottom > 0) {
                    scrollFactor = (rect.top / viewportHeight);
                    updateParallax();
                }
            });
        }

        // Posicionamiento inicial
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