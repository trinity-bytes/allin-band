/**
 * AllinBand — JavaScript Principal
 * Lógica general de navegación y comportamiento
 */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function prefersReducedMotion() {
    return reducedMotion.matches;
  }

  var navbar = document.getElementById("navbar");
  var navToggle = document.getElementById("navToggle");
  var navMenu = document.getElementById("navMenu");
  var indicator = document.querySelector(".navbar-indicator");
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".navbar-link[data-section]")
  );
  var sections = Array.prototype.slice.call(
    document.querySelectorAll("section[id]")
  );
  var backToTopButton = document.getElementById("backToTop");

  // ========================================
  // MENÚ MÓVIL — cápsula + hoja de vidrio
  // ========================================

  var FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function menuIsOpen() {
    return navToggle.getAttribute("aria-expanded") === "true";
  }

  function setMenu(open) {
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute(
      "aria-label",
      open ? "Cerrar menú de navegación" : "Abrir menú de navegación"
    );
    navMenu.classList.toggle("is-open", open);
  }

  function closeMenu(returnFocus) {
    if (!menuIsOpen()) return;
    setMenu(false);
    if (returnFocus) navToggle.focus();
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var opening = !menuIsOpen();
      setMenu(opening);

      if (opening) {
        var first = navMenu.querySelector(FOCUSABLE);
        if (first) first.focus();
      }
    });

    // Un enlace elegido cierra la hoja
    navMenu.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu(false);
    });

    // Escape devuelve el foco al botón que abrió
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu(true);
    });

    // Un click fuera la cierra sin robar el foco
    document.addEventListener("pointerdown", function (event) {
      if (!menuIsOpen()) return;
      if (!event.target.closest(".navbar-capsule")) closeMenu(false);
    });

    // El foco no se escapa de la hoja abierta
    navMenu.addEventListener("keydown", function (event) {
      if (event.key !== "Tab" || !menuIsOpen()) return;

      var items = Array.prototype.slice.call(
        navMenu.querySelectorAll(FOCUSABLE)
      );
      if (items.length === 0) return;

      var first = items[0];
      var last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        navToggle.focus();
      }
    });

    // Volver a desktop con la hoja abierta la deja consistente
    var desktopQuery = window.matchMedia("(min-width: 900px)");
    var onDesktop = function (event) {
      if (event.matches) closeMenu(false);
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", onDesktop);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(onDesktop);
    }
  }

  // ========================================
  // SMOOTH SCROLL — respeta reduced-motion y
  // lleva el foco al destino (el teclado no se pierde)
  // ========================================

  function navbarOffset() {
    return navbar ? navbar.getBoundingClientRect().height + 12 : 0;
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (event) {
      var targetId = this.getAttribute("href");

      if (targetId === "#") {
        event.preventDefault();
        return;
      }

      var target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();

      var top =
        target.getBoundingClientRect().top + window.scrollY - navbarOffset();

      window.scrollTo({
        top: Math.max(top, 0),
        behavior: prefersReducedMotion() ? "instant" : "smooth",
      });

      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    });
  });

  // ========================================
  // SCROLL — un solo listener, un solo rAF.
  // Se leen medidas cacheadas y se escribe una vez:
  // sin lecturas de layout dentro del scroll.
  // ========================================

  var sectionBounds = [];
  var linkBounds = [];
  var scrollTicking = false;
  var lastActiveSection = null;
  var lastCondensed = null;
  var lastBackToTop = null;

  function measure() {
    sectionBounds = sections.map(function (section) {
      var rect = section.getBoundingClientRect();
      return {
        id: section.getAttribute("id"),
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY,
      };
    });

    if (!indicator || navLinks.length === 0) return;

    var navRect = navMenu.getBoundingClientRect();
    linkBounds = navLinks.map(function (link) {
      var rect = link.getBoundingClientRect();
      return {
        section: link.getAttribute("data-section"),
        x: rect.left - navRect.left,
        width: rect.width,
      };
    });
  }

  function render() {
    scrollTicking = false;

    var scrollY = window.scrollY;
    var probe = scrollY + navbarOffset() + 80;

    // --- Cápsula asentada ---
    var condensed = scrollY > 24;
    if (condensed !== lastCondensed) {
      lastCondensed = condensed;
      if (navbar) navbar.classList.toggle("is-condensed", condensed);
    }

    // --- Sección activa ---
    var current = null;
    for (var i = 0; i < sectionBounds.length; i++) {
      if (probe >= sectionBounds[i].top && probe < sectionBounds[i].bottom) {
        current = sectionBounds[i].id;
      }
    }

    if (current !== lastActiveSection) {
      lastActiveSection = current;

      var match = null;
      navLinks.forEach(function (link, index) {
        var isActive = link.getAttribute("data-section") === current;
        link.classList.toggle("active", isActive);
        if (isActive) match = linkBounds[index];
      });

      if (indicator) {
        if (match && match.width > 0) {
          indicator.style.setProperty("--nav-ind-x", match.x + "px");
          indicator.style.setProperty("--nav-ind-scale", match.width / 100);
          indicator.classList.add("visible");
        } else {
          indicator.classList.remove("visible");
        }
      }
    }

    // --- Volver arriba ---
    if (backToTopButton) {
      var showTop = scrollY > 300;
      if (showTop !== lastBackToTop) {
        lastBackToTop = showTop;
        backToTopButton.style.display = showTop ? "inline-flex" : "none";
      }
    }
  }

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(render);
  }

  function remeasure() {
    measure();
    lastActiveSection = null;
    render();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", remeasure);
  window.addEventListener("load", remeasure);
  remeasure();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remeasure);
  }

  if (backToTopButton) {
    backToTopButton.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "instant" : "smooth",
      });
    });
  }

  // ========================================
  // FAQ ACCORDION
  // ========================================
  var faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach(function (item) {
    var question = item.querySelector(".faq-question");

    question.addEventListener("click", function () {
      var isActive = item.classList.contains("active");

      // Cerrar todos los items
      faqItems.forEach(function (otherItem) {
        otherItem.classList.remove("active");
        otherItem
          .querySelector(".faq-question")
          .setAttribute("aria-expanded", "false");
      });

      // Toggle el item clickeado
      if (!isActive) {
        item.classList.add("active");
        question.setAttribute("aria-expanded", "true");
      }
    });
  });

  // ========================================
  // CONSOLE LOG (DESARROLLO)
  // ========================================
  console.log("✅ AllinBand - JavaScript cargado correctamente");
  console.log("🏥 Vivessence © 2025");
})();
