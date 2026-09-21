/**
 * Script de rastreo para las páginas de las terapeutas (Elizabeth, Adriana,
 * etc.). Se incluye así: <script src=".../track.js" data-sitio="elizabeth"></script>
 * Nunca rompe la página si algo falla — todo va en try/catch silencioso.
 */
(function () {
  try {
    var scriptEl = document.currentScript;
    var sitio = scriptEl && scriptEl.getAttribute("data-sitio");
    if (!sitio) return;

    var ENDPOINT = (scriptEl.getAttribute("data-endpoint")) || "https://panel-terapeutas.example.com/api/track";

    var KEY = "pt_session_id";
    var sessionId = sessionStorage.getItem(KEY);
    if (!sessionId) {
      sessionId = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(KEY, sessionId);
    }

    function enviar(tipo, etiqueta) {
      try {
        var payload = JSON.stringify({
          sitioSlug: sitio,
          sessionId: sessionId,
          tipo: tipo,
          etiqueta: etiqueta || null,
          pagina: location.pathname,
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
        } else {
          fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
        }
      } catch (e) { /* nunca romper la pagina por esto */ }
    }

    enviar("vista");

    var hitos = [25, 50, 75, 100];
    var enviados = {};
    function chequearScroll() {
      var alto = document.documentElement.scrollHeight - window.innerHeight;
      if (alto <= 0) return;
      var pct = Math.round((window.scrollY / alto) * 100);
      hitos.forEach(function (h) {
        if (pct >= h && !enviados[h]) {
          enviados[h] = true;
          enviar("scroll_" + h);
        }
      });
    }
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { chequearScroll(); ticking = false; });
    }, { passive: true });

    document.addEventListener("click", function (ev) {
      var el = ev.target.closest(".btn-pkg, .btn-pkg-outline, .btn-pkg-navy");
      if (!el) return;
      enviar("click_compra", (el.textContent || "").trim().slice(0, 60));
    });
  } catch (e) { /* nunca romper la pagina por esto */ }
})();
