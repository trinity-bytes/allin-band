/**
 * AllinBand — Vertical sections behavior
 * Scroll reveal for sections 02, 08, 09, 10 and the closing, plus a slight scroll
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
      "#emergencia [data-reveal], #metas[data-reveal], #limites [data-reveal], #preguntas [data-reveal], #proyecto [data-reveal]"
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

  // Limits: the three cards stack, and scrolling lifts the front one away to
  // reveal the next (L27, Figma 74:344). Only when the stage fits the screen;
  // otherwise, like without JS, they stay a plain list
  var limits = document.getElementById("limites");
  var stage = limits && limits.querySelector(".limits__stage");
  var cards = limits ? Array.prototype.slice.call(limits.querySelectorAll(".limit")) : [];
  var phone = window.matchMedia("(max-width: 47.99rem)");
  // Each card first holds still so it can be read, then lifts away (L38)
  var HOLD_PER_CARD = 0.45; // screens of scroll before a card starts to move
  var LIFT_PER_CARD = 0.6; // screens of scroll while it lifts
  var stackFrame = 0;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function layOutStack() {
    stackFrame = 0;
    if (!limits.classList.contains("is-stacked")) return;
    var steps = cards.length - 1;
    var span = limits.offsetHeight - stage.offsetHeight;
    var unit = HOLD_PER_CARD + LIFT_PER_CARD;
    var screens = span > 0 ? clamp(-limits.getBoundingClientRect().top / span, 0, 1) * steps * unit : 0;
    var lifted = Math.min(Math.floor(screens / unit), steps);
    var progress = Math.min(lifted + clamp((screens - lifted * unit - HOLD_PER_CARD) / LIFT_PER_CARD, 0, 1), steps);
    // The list's top padding holds two steps; each card behind is 36 px
    // narrower at 1440 (28 px step), 20 px on a phone (20 px step)
    var step = parseFloat(getComputedStyle(cards[0].parentNode).paddingTop) / 2 || 0;
    var narrow = phone.matches ? step : (step * 36) / 28;
    var shrink = narrow / cards[0].offsetWidth;
    var away = cards[0].offsetHeight + step * 2;

    cards.forEach(function (card, i) {
      var depth = i - progress;
      var y;
      var scale = 1;
      var opacity = 1;
      if (depth >= 0) {
        y = -step * depth;
        scale = 1 - shrink * depth;
      } else {
        y = away * depth;
        opacity = clamp(1 + depth * 1.6, 0, 1);
      }
      card.style.zIndex = String(cards.length - i);
      card.style.transform = "translate3d(0, " + y.toFixed(2) + "px, 0) scale(" + scale.toFixed(4) + ")";
      card.style.opacity = opacity.toFixed(3);
      card.style.setProperty("--content", clamp(1 - depth * 1.5, 0, 1).toFixed(3));
    });
  }

  function requestStack() {
    if (!stackFrame) stackFrame = window.requestAnimationFrame(layOutStack);
  }

  function syncStack() {
    limits.style.setProperty("--lift-span", (HOLD_PER_CARD + LIFT_PER_CARD) * 100 * (cards.length - 1) + "vh");
    limits.classList.add("is-stacked");
    // The stage holds the heading and the stack; on a short screen it would not fit
    // (measured on the copy: the grass layers overflow the stage on purpose)
    var top = stage.getBoundingClientRect().top;
    var bottom = Math.max(
      limits.querySelector(".limits__head").getBoundingClientRect().bottom,
      cards[0].parentNode.getBoundingClientRect().bottom
    );
    var fits = bottom - top <= window.innerHeight + 1;
    if (!fits) {
      limits.classList.remove("is-stacked");
      cards.forEach(function (card) {
        card.removeAttribute("style");
      });
      return;
    }
    layOutStack();
  }

  if (stage && cards.length > 1) {
    syncStack();
    window.addEventListener("scroll", requestStack, { passive: true });
    window.addEventListener("resize", syncStack, { passive: true });
  }

  // Keyboard focus inside a block that has not revealed yet shows it at once
  document.addEventListener("focusin", function (event) {
    var block = event.target.closest && event.target.closest(".is-armed:not(.is-in)");
    if (block) block.classList.add("is-in");
  });
})();
