/**
 * AllinBand — Animaciones y Efectos
 * Mundo "Patio encalado": un solo momento autorado
 */

(function () {
  "use strict";

  // ========================================
  // REDUCED MOTION — Centralized check
  // ========================================

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ========================================
  // SCROLL REVEAL ANIMATION
  // ========================================

  if ("IntersectionObserver" in window) {
    var revealElements = document.querySelectorAll(".reveal");

    var revealOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px",
    };

    var revealOnScroll = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    }, revealOptions);

    revealElements.forEach(function (element) {
      revealOnScroll.observe(element);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (element) {
      element.classList.add("active");
    });
  }

  // ========================================
  // STAT COUNTER ANIMATION
  // ========================================

  function animateCounter(element, target, duration) {
    if (prefersReducedMotion) {
      element.textContent = target;
      return;
    }

    duration = duration || 2000;
    var startTime = null;
    var isDecimal = target % 1 !== 0;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = eased * target;

      if (isDecimal) {
        element.textContent = current.toFixed(1);
      } else {
        element.textContent = Math.floor(current);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = isDecimal ? target.toFixed(1) : target;
      }
    }

    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var statValues = document.querySelectorAll(".stat-value [data-count]");

    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var target = parseFloat(entry.target.getAttribute("data-count"));
          animateCounter(entry.target, target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statValues.forEach(function (counter) {
      counterObserver.observe(counter);
    });
  }

  // ========================================
  // HERO PARALLAX — deriva calma amplificada.
  // Back (0.11) + front (0.23, ±160px) sobre scroll, más deriva
  // de puntero (±8/±14px, solo pointer:fine) y flotación idle
  // (±4/±7px, 13s/9s). El contenido acompaña sutil (sube 70px y
  // funde a 0.35 al salir) para dar continuidad al degradado
  // hero → siguiente sección. Todo translate3d+opacity vía un solo
  // rAF vivo solo con hero visible; estático en móvil (≤1023px,
  // a juego con CSS) y con prefers-reduced-motion.
  // Sin front: el back único corre en modo calmo 0.13.
  // ========================================

  var hero = document.querySelector(".hero");
  var heroContent = hero ? hero.querySelector(".hero-content") : null;
  var heroLayers = Array.prototype.slice.call(
    document.querySelectorAll("[data-hero-parallax]")
  );
  var heroVisible = false;
  var heroRafId = 0;
  var mobileQuery = window.matchMedia("(max-width: 1023px)");
  var finePointerQuery = window.matchMedia("(pointer: fine)");

  var PARALLAX_MAX = 160;
  var PARALLAX_SINGLE_SPEED = 0.13;
  var PARALLAX_SPEEDS = {
    back: 0.11,
    front: 0.23,
  };
  var POINTER_MAX = {
    back: 0,
    front: 8,
  };
  var IDLE_AMP = {
    back: 0,
    front: 4,
  };
  var CONTENT_RISE = 70;
  var pointerTarget = { x: 0, y: 0 };
  var pointerCurrent = { x: 0, y: 0 };

  function heroLayerSpeed(layer, dualLayer) {
    var kind = layer.getAttribute("data-hero-parallax") || "back";
    if (!dualLayer) {
      return PARALLAX_SINGLE_SPEED;
    }
    return PARALLAX_SPEEDS[kind] || PARALLAX_SINGLE_SPEED;
  }

  function heroLayerPointerMax(layer, dualLayer) {
    if (!dualLayer) {
      return POINTER_MAX.back;
    }
    var kind = layer.getAttribute("data-hero-parallax") || "back";
    return POINTER_MAX[kind] || POINTER_MAX.back;
  }

  function heroLayerIdleAmp(layer, dualLayer) {
    if (!dualLayer) {
      return IDLE_AMP.back;
    }
    var kind = layer.getAttribute("data-hero-parallax") || "back";
    return IDLE_AMP[kind] || IDLE_AMP.back;
  }

  function parallaxEnabled() {
    return (
      hero &&
      heroLayers.length > 0 &&
      !prefersReducedMotion &&
      !mobileQuery.matches &&
      "requestAnimationFrame" in window
    );
  }

  function pointerEnabled() {
    return (
      parallaxEnabled() &&
      "matchMedia" in window &&
      finePointerQuery.matches
    );
  }

  function resetHeroPhoto() {
    heroLayers.forEach(function (layer) {
      layer.style.transform = "";
      layer.style.willChange = "";
    });
    if (heroContent) {
      heroContent.style.transform = "";
      heroContent.style.opacity = "";
      heroContent.style.willChange = "";
    }
    pointerTarget.x = 0;
    pointerTarget.y = 0;
    pointerCurrent.x = 0;
    pointerCurrent.y = 0;
  }

  function stopHeroLoop() {
    if (heroRafId) {
      window.cancelAnimationFrame(heroRafId);
      heroRafId = 0;
    }
    heroLayers.forEach(function (layer) {
      layer.style.willChange = "";
    });
    if (heroContent) {
      heroContent.style.willChange = "";
    }
  }

  function tickHeroParallax(timestamp) {
    heroRafId = 0;
    if (!parallaxEnabled() || !heroVisible) {
      return;
    }
    // Deriva calma: fracción del desplazamiento del hero + puntero
    // suavizado (lerp 0.08) + flotación idle senoidal. El tope
    // ±160px no expone bordes (la capa mide 124% de alto).
    var rect = hero.getBoundingClientRect();
    // Fallback en vivo: si el front falló (404) y se auto-removió vía
    // onerror, o aún no cargó, el back único corre en modo calmo 0.13.
    var activeLayers = heroLayers.filter(function (layer) {
      if (!layer.isConnected) {
        return false;
      }
      if (layer.complete && layer.naturalWidth === 0) {
        return false;
      }
      return true;
    });
    if (activeLayers.length === 0) {
      return;
    }
    var dualLayer = activeLayers.length > 1;
    var usePointer = pointerEnabled();
    if (usePointer) {
      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.08;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.08;
    } else {
      pointerCurrent.x = 0;
      pointerCurrent.y = 0;
    }
    var t = (timestamp || 0) / 1000;
    activeLayers.forEach(function (layer) {
      var kind = layer.getAttribute("data-hero-parallax") || "back";
      var speed = heroLayerSpeed(layer, dualLayer);
      var scrollOffset = Math.max(
        -PARALLAX_MAX,
        Math.min(PARALLAX_MAX, -rect.top * speed)
      );
      var pMax = usePointer ? heroLayerPointerMax(layer, dualLayer) : 0;
      var amp = heroLayerIdleAmp(layer, dualLayer);
      var period = kind === "front" ? 9 : 13;
      var phase = kind === "front" ? 1.7 : 0;
      var idleX = Math.cos((t * 2 * Math.PI) / period + phase) * amp;
      var idleY = Math.sin((t * 2 * Math.PI) / period + phase) * amp;
      var tx = pointerCurrent.x * pMax + idleX;
      var ty = scrollOffset + pointerCurrent.y * pMax + idleY;
      layer.style.willChange = "transform";
      layer.style.transform =
        "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0)";
    });
    if (heroContent) {
      var progress = Math.max(
        0,
        Math.min(1, -rect.top / Math.max(rect.height, 1))
      );
      var contentTy = (-progress * CONTENT_RISE).toFixed(1);
      heroContent.style.willChange = "transform, opacity";
      heroContent.style.transform = "translate3d(0," + contentTy + "px,0)";
      heroContent.style.opacity = (1 - progress * 0.65).toFixed(3);
    }
    heroRafId = window.requestAnimationFrame(tickHeroParallax);
  }

  function startHeroLoop() {
    if (heroRafId || !parallaxEnabled() || !heroVisible) {
      return;
    }
    heroRafId = window.requestAnimationFrame(tickHeroParallax);
  }

  function queueHeroParallax() {
    startHeroLoop();
  }

  if (hero && heroLayers.length > 0 && "IntersectionObserver" in window) {
    var heroObserver = new IntersectionObserver(
      function (entries) {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) {
          startHeroLoop();
        } else {
          stopHeroLoop();
        }
      },
      { threshold: 0 }
    );
    heroObserver.observe(hero);
    window.addEventListener("scroll", startHeroLoop, { passive: true });
    hero.addEventListener(
      "pointermove",
      function (event) {
        if (!pointerEnabled()) {
          return;
        }
        var rect = hero.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) {
          return;
        }
        pointerTarget.x =
          ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointerTarget.y =
          ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        startHeroLoop();
      },
      { passive: true }
    );
    hero.addEventListener(
      "pointerleave",
      function () {
        pointerTarget.x = 0;
        pointerTarget.y = 0;
      },
      { passive: true }
    );
    window.addEventListener("resize", function () {
      if (!parallaxEnabled()) {
        stopHeroLoop();
        resetHeroPhoto();
      } else {
        startHeroLoop();
      }
    });
    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", function () {
        stopHeroLoop();
        resetHeroPhoto();
        startHeroLoop();
      });
    }
    if (typeof finePointerQuery.addEventListener === "function") {
      finePointerQuery.addEventListener("change", function () {
        pointerTarget.x = 0;
        pointerTarget.y = 0;
      });
    }
  }

  // ========================================
  // REDUCED MOTION — Activate reveals immediately
  // ========================================

  if (prefersReducedMotion) {
    document.querySelectorAll(".reveal").forEach(function (element) {
      element.classList.add("active");
    });

    document.querySelectorAll(".stat-value [data-count]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var isDecimal = target % 1 !== 0;
      el.textContent = isDecimal ? target.toFixed(1) : target;
    });
  }

  console.log("AllinBand animations initialized");
})();
