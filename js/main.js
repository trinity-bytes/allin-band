/**
 * AllinBand — Navegación
 * Menú móvil, sección activa y botón flotante.
 */

(function () {
  "use strict";

  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");
  var links = Array.prototype.slice.call(menu.querySelectorAll(".nav__link"));
  var floating = document.getElementById("floatingReply");

  function menuIsOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Cerrar" : "Menú";
    menu.classList.toggle("is-open", open);
  }

  toggle.addEventListener("click", function () {
    setMenu(!menuIsOpen());
  });

  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && menuIsOpen()) {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener("pointerdown", function (event) {
    if (menuIsOpen() && !event.target.closest(".chat-header")) setMenu(false);
  });

  // Sección activa: la que cruza la franja bajo la cabecera
  var linkBySection = {};
  links.forEach(function (link) {
    linkBySection[link.getAttribute("href").slice(1)] = link;
  });

  function setActive(id) {
    links.forEach(function (link) {
      link.removeAttribute("aria-current");
    });
    if (linkBySection[id]) {
      linkBySection[id].setAttribute("aria-current", "true");
    }
  }

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -65% 0px" }
    );

    document.querySelectorAll("main > section[id]").forEach(function (section) {
      spy.observe(section);
    });

    // El botón flotante sobra cuando ya se ve una acción para probar la alerta
    var visible = {};
    var floatWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });
      floating.hidden = Boolean(visible.inicio || visible.proyecto);
    });

    floatWatch.observe(document.getElementById("inicio"));
    floatWatch.observe(document.getElementById("proyecto"));
  }
})();
