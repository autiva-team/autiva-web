# Movimiento de la interfaz

Se revisó React Bits y se seleccionaron los patrones que acompañan al diseño Liquid Glass de Autiva. Los colores, fondos de ondas, tamaños y distribución oficiales se conservan. Los efectos no requieren descargar dependencias nuevas ni recursos externos.

| Patrón de referencia | Integración en Autiva |
| --- | --- |
| [Blur Text](https://reactbits.dev/text-animations/blur-text) | Títulos principales: enfoque breve por palabras, con un nombre accesible completo para lectores de pantalla |
| [Shiny Text](https://reactbits.dev/text-animations/shiny-text) | Un solo recorrido de brillo azul en etiquetas secundarias |
| [Spotlight Card](https://reactbits.dev/components/spotlight-card) | Luz suave que sigue el puntero en tarjetas y controles de vidrio, únicamente con ratón |
| [Star Border](https://reactbits.dev/animations/star-border) | Borde luminoso de las acciones principales al pasar el puntero o dar foco con el teclado |
| [Click Spark](https://reactbits.dev/animations/click-spark) | Adaptación a una onda pequeña al pulsar botones, sin partículas persistentes |
| [Fade Content](https://reactbits.dev/animations/fade-content) | Entrada breve de paneles al aparecer en pantalla, sin ocultar datos mientras se cargan |
| [Iridescence](https://reactbits.dev/backgrounds/iridescence) | Inspiración para un reflejo ambiental sobre las ondas existentes; se implementa con CSS, sin shaders WebGL |

La implementación es propia y utiliza CSS, IntersectionObserver y Web Animations API. No incorpora ni distribuye el código fuente de React Bits. Las referencias identifican los patrones visuales estudiados.

Los componentes viven en `src/components/motion/` y los estilos en `src/styles/motion.css`. Una única capa delega los eventos de puntero; no se crean listeners por tarjeta ni un bucle de animación JavaScript permanente. El observador registra únicamente nodos nuevos y deja de observar cada panel tras su primera entrada.

Con `prefers-reduced-motion: reduce` se omiten las animaciones, las ondas de pulsación y el seguimiento del puntero. Al ocultar la pestaña se pausan los efectos CSS y se cancelan las animaciones temporales. Los campos, importes, botones deshabilitados y estados de envío conservan su comportamiento.
# Fotos del dispositivo y cursor

La edición de vehículo permite seleccionar JPG, PNG, WebP o AVIF de hasta 15 MB, muestra una vista previa y reduce el lado mayor a 1440 px antes de persistir en IndexedDB. Las fotos se aíslan por cuenta, sobreviven a la recarga y conservan su asociación cuando se sincroniza el ID del vehículo. La API actual solo acepta `fotoUrl` (500 caracteres), por lo que los archivos se conservan en este dispositivo; no se envían datos base64 como URL ni se inventa un endpoint de subida.

El cursor añade una estela azul inspirada en [Blob Cursor](https://reactbits.dev/animations/blob-cursor) y ocho destellos en los controles inspirados en [Click Spark](https://reactbits.dev/animations/click-spark). Es una adaptación propia con Web Animations, sin dependencias adicionales. Genera como máximo una gota cada 32 ms y la elimina a los 550 ms; no ejecuta un bucle JavaScript en reposo. Conserva el cursor nativo, no intercepta clics y oculta el halo en campos de texto, dispositivos táctiles y movimiento reducido.

