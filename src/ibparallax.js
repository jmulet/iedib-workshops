if (window.AOS && typeof window.AOS.init == 'function') {
    AOS.init();
}

/**
 * IBParallax API
 * Una mini librería para crear secciones hero con efectos de paralaje (Mouse + Scroll).
 * (c) Josep Mulet Pol (2026)
 */
window.IBParallax = (function () {

    var createLayer = function (data) {
        var div = document.createElement('div');
        div.className = 'parallax-layer';
        div.setAttribute('data-depth', data.depth || 0.1);
        div.innerText = data.text;

        var style = {
            position: 'absolute',
            pointerEvents: 'none',
            transition: 'transform 0.1s ease-out',
            fontWeight: '900',
            userSelect: 'none',
            color: data.color || '#818cf8',
            top: data.top || 'auto',
            left: data.left || 'auto',
            right: data.right || 'auto',
            bottom: data.bottom || 'auto',
            fontSize: data.fontSize || '2rem',
            opacity: data.opacity || 0.5,
            willChange: 'transform'
        };

        for (var key in style) {
            if (style.hasOwnProperty(key)) {
                div.style[key] = style[key];
            }
        }

        return div;
    };

    return {
        init: function (containerId, config) {
            var container = document.getElementById(containerId);
            if (!container) return;

            var settings = {
                height: config.height || '350px',
                background: config.background || 'linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 50%, #fae8ff 100%)',
                unit: config.unit || '',
                title: config.title || '',
                description: config.description || '',
                layers: config.layers || [],
                scrollDepth: config.scrollDepth || 500
            };

            container.className = "d-flex align-items-center justify-content-center mb-5";
            container.style.borderRadius = '20px';
            
            var containerStyle = {
                position: 'relative',
                height: settings.height,
                background: settings.background,
                overflow: 'hidden'
            };
            for (var key in containerStyle) {
                if (containerStyle.hasOwnProperty(key)) {
                    container.style[key] = containerStyle[key];
                }
            }

            // Esferas decorativas
            var sphere1 = document.createElement('div');
            var s1Style = {
                position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
                width: '300px', height: '300px', top: '-50px', left: '-50px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(255,255,255,0) 70%)'
            };
            for (var k1 in s1Style) {
                if (s1Style.hasOwnProperty(k1)) sphere1.style[k1] = s1Style[k1];
            }

            var sphere2 = document.createElement('div');
            var s2Style = {
                position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
                width: '400px', height: '400px', bottom: '-100px', right: '-50px',
                background: 'radial-gradient(circle, rgba(192, 132, 252, 0.15) 0%, rgba(255,255,255,0) 70%)'
            };
            for (var k2 in s2Style) {
                if (s2Style.hasOwnProperty(k2)) sphere2.style[k2] = s2Style[k2];
            }

            container.appendChild(sphere1);
            container.appendChild(sphere2);

            for (var i = 0; i < settings.layers.length; i++) {
                container.appendChild(createLayer(settings.layers[i]));
            }

            var contentWrap = document.createElement('div');
            contentWrap.className = "container text-center";
            contentWrap.style.zIndex = "10";
            contentWrap.innerHTML = 
                '<p class="text-uppercase font-weight-bold mb-2" style="letter-spacing: 0.2em; font-size: 0.8rem; color: #6366f1;">' + settings.unit + '</p>' +
                '<h1 class="display-4 font-weight-bold m-0" style="color: #1e1b4b;">' + settings.title + '</h1>' +
                '<div class="mx-auto my-3" style="width: 80px; height: 6px; background: linear-gradient(to right, #6366f1, #a855f7); border-radius: 3px;"></div>' +
                '<p class="lead text-secondary mx-auto" style="max-width: 550px;">' + settings.description + '</p>';
            
            container.appendChild(contentWrap);

            // --- Lógica de Animación Unificada ---
            var mouseX = 0, mouseY = 0;
            var scrollFactor = 0;

            var updateParallax = function () {
                var layers = container.querySelectorAll('.parallax-layer');
                for (var j = 0; j < layers.length; j++) {
                    var layer = layers[j];
                    var depth = parseFloat(layer.getAttribute('data-depth'));

                    // Combinamos el movimiento del ratón con el desplazamiento de scroll
                    var moveX = mouseX * (depth * 140);
                    var moveY = (mouseY * (depth * 140)) + (scrollFactor * (depth * settings.scrollDepth));

                    layer.style.transform = 'translate(' + moveX + 'px, ' + moveY + 'px)';
                    layer.style.webkitTransform = 'translate(' + moveX + 'px, ' + moveY + 'px)';
                }
            };

            // Listener para Mouse
            window.addEventListener('mousemove', function (e) {
                var rect = container.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    mouseX = ((e.clientX - rect.left) / rect.width) - 0.5;
                    mouseY = ((e.clientY - rect.top) / rect.height) - 0.5;
                    updateParallax();
                }
            });

            // Listener para Scroll
            window.addEventListener('scroll', function () {
                var rect = container.getBoundingClientRect();
                var viewportHeight = window.innerHeight;

                // Solo calculamos si el elemento es visible en pantalla
                if (rect.top < viewportHeight && rect.bottom > 0) {
                    // Calculamos cuánto ha cruzado el hero la pantalla (-1 a 1)
                    scrollFactor = (rect.top / viewportHeight);
                    updateParallax();
                }
            });
        }
    };
})();