/**
 * AllinBand — Closing motion
 * The wordmark grows out of the grass as the page reaches its end.
 * Desktop with a fine pointer: tied to scroll, plus pointer depth per layer.
 * Touch: one reveal when the wordmark comes into view, no continuous parallax.
 * Reduced motion: the head script never adds `.motion`, so nothing runs.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  var closing = document.querySelector(".closing");
  if (!closing || !root.classList.contains("motion")) return;

  var wordmark = closing.querySelector(".closing__wordmark");
  var depthQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 48rem)");

  // rise: fraction of the wordmark height it starts below its resting place
  // sink: px the grass starts above its resting place, so it first covers the word
  var layers = [
    { el: closing.querySelector(".closing__landscape"), reach: 6, lift: 90 },
    { el: wordmark, reach: 14, rise: 0.32 },
    { el: closing.querySelector(".closing__grass-mid"), reach: 26, sink: 36 },
    { el: closing.querySelector(".closing__grass-near"), reach: 44, sink: 84 },
  ].filter(function (layer) {
    return layer.el;
  });

  var target = { x: 0, y: 0 };
  var current = { x: 0, y: 0 };
  var inView = false;
  var frame = 0;

  // 0 until the wordmark enters the viewport, 1 at the very end of the page
  function progress() {
    var rect = closing.getBoundingClientRect();
    var remaining = rect.bottom - window.innerHeight;
    var span = Math.min(closing.offsetHeight - wordmark.offsetTop, window.innerHeight * 0.8);
    return 1 - Math.min(Math.max(remaining / span, 0), 1);
  }

  function ease(t) {
    return t * t * (3 - 2 * t);
  }

  function render() {
    frame = 0;
    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;

    var left = 1 - ease(progress());
    var wordHeight = wordmark.offsetHeight;

    layers.forEach(function (layer) {
      var x = -current.x * layer.reach;
      var y = -current.y * layer.reach * 0.5;
      if (layer.rise) y += left * layer.rise * wordHeight;
      if (layer.sink) y -= left * layer.sink;
      if (layer.lift) y -= left * layer.lift;
      layer.el.style.transform = "translate3d(" + x.toFixed(2) + "px, " + y.toFixed(2) + "px, 0)";
    });

    var settling =
      Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001;
    if (settling) request();
  }

  function request() {
    if (!frame && inView) frame = window.requestAnimationFrame(render);
  }

  function onPointer(event) {
    target.x = (event.clientX / window.innerWidth) * 2 - 1;
    target.y = (event.clientY / window.innerHeight) * 2 - 1;
    request();
  }

  function onLeave() {
    target.x = 0;
    target.y = 0;
    request();
  }

  var depthObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
          if (inView) request();
        })
      : null;

  // Touch: a single reveal, driven by CSS
  var revealObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          function (entries) {
            if (entries[0].isIntersecting) {
              closing.classList.add("closing--in");
              revealObserver.disconnect();
            }
          },
          { threshold: 0.35 }
        )
      : null;

  function enableDepth() {
    closing.classList.add("closing--depth");
    window.addEventListener("pointermove", onPointer, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    if (depthObserver) depthObserver.observe(closing);
    else inView = true;
    request();
  }

  function disableDepth() {
    closing.classList.remove("closing--depth");
    window.removeEventListener("pointermove", onPointer);
    root.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("scroll", request);
    window.removeEventListener("resize", request);
    if (depthObserver) depthObserver.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    inView = false;
    target.x = target.y = current.x = current.y = 0;
    layers.forEach(function (layer) {
      layer.el.style.transform = "";
    });
  }

  function sync() {
    if (depthQuery.matches) {
      enableDepth();
    } else {
      disableDepth();
      if (revealObserver) revealObserver.observe(wordmark);
      else closing.classList.add("closing--in");
    }
  }

  if (depthQuery.addEventListener) depthQuery.addEventListener("change", sync);
  sync();
})();
