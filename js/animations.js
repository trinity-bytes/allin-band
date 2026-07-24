/**
 * AllinBand — Animaciones y Efectos
 * Dark Premium Health Tech
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
