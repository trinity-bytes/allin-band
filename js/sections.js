/**
 * AllinBand — Vertical sections behavior
 * Scroll reveal for sections 02, 08, 09 and 10. Each [data-reveal] block is
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

  // Keyboard focus inside a block that has not revealed yet shows it at once
  document.addEventListener("focusin", function (event) {
    var block = event.target.closest && event.target.closest(".is-armed:not(.is-in)");
    if (block) block.classList.add("is-in");
  });
})();
