/**
 * AllinBand — Vertical sections behavior
 * Scroll reveal for sections 02, 08, 09 and 10, plus a slight scroll
 * parallax on the FAQ grass (desktop with a fine pointer). Each [data-reveal] block is
 * armed (hidden by CSS) only here, so without JS nothing is ever hidden,
 * and it reveals once when it enters the viewport.
 * Reduced motion: the head script never adds `.motion`, so nothing runs.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  if (!root.classList.contains("motion") || !("IntersectionObserver" in window)) return;

  var blocks = Array.prototype.slice.call(
    document.querySelectorAll(
      "#emergencia [data-reveal], #metas[data-reveal], #limites [data-reveal], #preguntas [data-reveal]"
    )
  );
  if (!blocks.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        // A fast scroll can jump past a block: once it is above the view, show it too
        var passed = entry.boundingClientRect.bottom < 0;
        if (!entry.isIntersecting && !passed) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
  );

  blocks.forEach(function (block) {
    // Stagger order inside the block: the CSS delay reads --r
    Array.prototype.forEach.call(block.querySelectorAll(".reveal"), function (item, index) {
      item.style.setProperty("--r", String(index));
    });
    block.classList.add("is-armed");
    observer.observe(block);
  });

  // FAQ: the grass in front of the band drifts a little with scroll (L27).
  // Desktop with a fine pointer only, like the closing (S14); static on touch
  var faq = document.getElementById("preguntas");
  var depth = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 48rem)");
  var grass = faq
    ? [
        { el: faq.querySelector(".faq__grass--mid"), reach: 28 },
        { el: faq.querySelector(".faq__grass--near"), reach: 60 },
      ].filter(function (layer) {
        return layer.el;
      })
    : [];
  var grassFrame = 0;
  var faqInView = false;

  function driftGrass() {
    grassFrame = 0;
    var rect = faq.getBoundingClientRect();
    // 0 when the section enters at the bottom, 1 when it leaves at the top
    var t = Math.min(Math.max((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0), 1);
    grass.forEach(function (layer) {
      layer.el.style.transform = depth.matches
        ? "translate3d(0, " + ((0.5 - t) * layer.reach).toFixed(2) + "px, 0)"
        : "";
    });
  }

  function requestDrift() {
    if (!grassFrame && faqInView) grassFrame = window.requestAnimationFrame(driftGrass);
  }

  if (grass.length) {
    new IntersectionObserver(function (entries) {
      faqInView = entries[0].isIntersecting;
      requestDrift();
    }).observe(faq);
    window.addEventListener("scroll", requestDrift, { passive: true });
    window.addEventListener("resize", requestDrift, { passive: true });
  }

  // Keyboard focus inside a block that has not revealed yet shows it at once
  document.addEventListener("focusin", function (event) {
    var block = event.target.closest && event.target.closest(".is-armed:not(.is-in)");
    if (block) block.classList.add("is-in");
  });
})();
