/**
 * AllinBand — Hero motion
 * 1. Staged entrance once the landscape and band are decoded (capped wait).
 * 2. Depth on desktop with a fine pointer: layers drift with scroll and
 *    lean toward the pointer, each by its own depth. Touch stays static.
 * Reduced motion: the head script never adds `.motion`, so nothing runs.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  var hero = document.querySelector(".hero");
  if (!hero || !root.classList.contains("motion")) return;

  /* 1. Entrance */
  function decoded(selector) {
    var img = hero.querySelector(selector);
    if (!img || !img.decode) return Promise.resolve();
    return img.decode().catch(function () {});
  }

  var waitCap = new Promise(function (resolve) {
    window.setTimeout(resolve, 1200);
  });

  Promise.race([
    Promise.all([decoded(".hero__landscape img"), decoded(".hero__band img")]),
    waitCap,
  ]).then(function () {
    window.requestAnimationFrame(function () {
      hero.classList.add("hero--play");
    });
  });

  /* 2. Depth: desktop with hover and a fine pointer only */
  var depthQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 48rem)");

  // Per layer: scroll drift (fraction of scroll) and pointer reach (px)
  var layers = [
    { el: hero.querySelector(".hero__landscape"), scroll: 0.35, reach: 8 },
    { el: hero.querySelector(".hero__title"), scroll: 0.22, reach: 14 },
    { el: hero.querySelector(".hero__band"), scroll: 0.1, reach: 26, center: true, tilt: true },
    { el: hero.querySelector(".hero__callouts"), scroll: 0.1, reach: 26, center: true },
    { el: hero.querySelector(".hero__grass-mid"), scroll: -0.02, reach: 36 },
    { el: hero.querySelector(".hero__grass-near"), scroll: -0.12, reach: 52 },
  ].filter(function (layer) {
    return layer.el;
  });

  var target = { x: 0, y: 0 };
  var current = { x: 0, y: 0 };
  var inView = true;
  var frame = 0;

  function render() {
    frame = 0;
    // Ease toward the pointer so the scene lags a little behind it
    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;

    var scrolled = Math.min(window.scrollY, hero.offsetHeight);

    layers.forEach(function (layer) {
      var x = -current.x * layer.reach;
      var y = -current.y * layer.reach * 0.6 + scrolled * layer.scroll;
      var transform = "";
      if (layer.center) transform += "translateX(-50%) ";
      transform += "translate3d(" + x.toFixed(2) + "px, " + y.toFixed(2) + "px, 0)";
      if (layer.tilt) {
        transform +=
          " perspective(1400px) rotateY(" + (current.x * 7).toFixed(2) + "deg)" +
          " rotateX(" + (-current.y * 4).toFixed(2) + "deg)";
      }
      layer.el.style.transform = transform;
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

  var observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
          if (inView) request();
        })
      : null;

  function enable() {
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", request, { passive: true });
    if (observer) observer.observe(hero);
    request();
  }

  function disable() {
    window.removeEventListener("pointermove", onPointer);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("scroll", request);
    if (observer) observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    target.x = target.y = current.x = current.y = 0;
    layers.forEach(function (layer) {
      layer.el.style.transform = "";
    });
  }

  function sync() {
    if (depthQuery.matches) enable();
    else disable();
  }

  if (depthQuery.addEventListener) depthQuery.addEventListener("change", sync);
  sync();
})();
