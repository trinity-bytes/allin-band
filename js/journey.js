/**
 * AllinBand — Horizontal journey and pulse
 *
 * 1. Morning pulse (#como-funciona): three moments behind an ARIA tablist.
 *    The ECG keeps a flat baseline; the heart rate shows only in the spacing
 *    between beats. Each new trace is drawn with stroke-dashoffset, and a
 *    bright pulse runs along it, one heartbeat from spike to spike, speeding up
 *    into each one.
 *    Hover or focus on a moment selects it; the timeline also advances by
 *    itself about every 6 s while the panel is in view. Hover and focus pause
 *    it; a click, tap or arrow key hands control to the reader for good.
 * 2. Horizontal journey (sections 03 to 07): desktop with a mouse, motion allowed and a tall
 *    enough viewport only. A sticky stage translates the track as the page
 *    scrolls down. Hash links and keyboard focus scroll the page to the
 *    vertical position that shows the target panel.
 * Reduced motion: the head script never adds `.motion`, so the journey stays
 * stacked, nothing auto-advances and traces appear without drawing.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  var journey = document.querySelector(".journey");
  if (!journey) return;

  var motion = root.classList.contains("motion");

  /* ---------------------------------------------------------------
   * 1. Morning pulse
   * ------------------------------------------------------------- */

  var moments = journey.querySelector(".moments");
  if (moments) initPulse(moments);

  function initPulse(container) {
    var tabs = Array.prototype.slice.call(container.querySelectorAll(".moments__tab"));
    var states = Array.prototype.slice.call(container.querySelectorAll(".moment"));
    var fills = tabs.map(function (tab) {
      return tab.querySelector(".moments__fill");
    });
    var ecg = container.querySelector(".ecg");
    var svg = ecg.querySelector(".ecg__svg");
    var traces = Array.prototype.slice.call(ecg.querySelectorAll(".ecg__trace"));
    var comet = ecg.querySelector(".ecg__comet");
    var halo = ecg.querySelector(".ecg__halo");
    var dot = ecg.querySelector(".ecg__dot");
    var fades = Array.prototype.slice.call(ecg.querySelectorAll(".ecg__fade"));
    var panel = container.closest(".panel");

    var DURATION = 6000;
    var COMET_DASH = 0.07; // Dash length in css/journey.css, as a share of the path
    var COMET_EXIT = 1.27; // Head position where the whole dash is past the end
    var COMET_EASE = "cubic-bezier(0.6, 0, 0.9, 0.5)";
    var cometRun = null;
    var active = 0;
    var shown = 0;
    var stopped = false;
    var paused = { hover: false, focus: false };
    var inView = false;
    var elapsed = 0;
    var last = 0;
    var raf = 0;
    var size = { w: 0, h: 0 };

    function data(i) {
      var el = states[i];
      return {
        bpm: Number(el.dataset.bpm),
        period: Number(el.dataset.period),
        shape: Number(el.dataset.shape),
        alert: el.classList.contains("moment--alert"),
      };
    }

    function n(value) {
      return Math.round(value * 10) / 10;
    }

    // One beat in the 200 px tall Figma frame, scaled to the box height (k)
    // and squeezed horizontally (s) for faster rates.
    function beat(x, k, s) {
      function p(dx, y) {
        return n(x + dx * s) + " " + n(y * k);
      }
      return (
        " H" + n(x) +
        " C" + p(9.333, 109.333) + " " + p(18.667, 109.333) + " " + p(28, 120) +
        " H" + n(x + 38 * s) +
        " L" + p(44, 134) + " L" + p(56, 16) + " L" + p(68, 166) + " L" + p(78, 120) +
        " C" + p(90, 104) + " " + p(102.667, 104) + " " + p(116, 120)
      );
    }

    function geometry() {
      var w = size.w;
      var k = size.h / 200;
      var wide = w >= 700;
      var end = wide ? w - 190 * k : w - 45;
      // Narrow boxes tighten the spacing so the mobile frame (37:237) shows two beats
      return { w: w, k: k, end: end, base: 120 * k, spacing: wide ? 1 : 0.62 };
    }

    function tracePath(state) {
      var g = geometry();
      var s = state.shape * g.k;
      var step = state.period * g.k * g.spacing;
      var tail = Math.max(state.period * 0.42, 89) * g.k * g.spacing;
      var lastBeat = g.end - tail - 116 * s;
      var first = lastBeat;
      while (first - step >= 8 * g.k) first -= step;
      var d = "M0 " + n(g.base);
      var spikes = [];
      for (var x = first; x <= lastBeat + 0.5; x += step) {
        d += beat(x, g.k, s);
        spikes.push(x + 78 * s);
      }
      return { d: d + " H" + n(g.end), spikes: spikes, step: step };
    }

    // Share of the path length at a horizontal position (x only moves forward)
    function shareAt(x, total) {
      var low = 0;
      var high = total;
      for (var i = 0; i < 18; i += 1) {
        var mid = (low + high) / 2;
        if (comet.getPointAtLength(mid).x < x) low = mid;
        else high = mid;
      }
      return low / total;
    }

    // The bright pulse takes one heartbeat from spike to spike: it leaves each
    // spike slowly and speeds up into the next one
    function runComet(trace, bpm) {
      if (cometRun) cometRun.cancel();
      if (!motion || !comet.animate || !comet.getTotalLength) return;
      var total = comet.getTotalLength();
      var beatMs = 60000 / bpm;
      var stops = [{ x: 0, share: 0 }];
      trace.spikes.forEach(function (x) {
        stops.push({ x: x, share: shareAt(x, total) });
      });
      var end = geometry().end;
      stops.push({ x: end, share: 1 });
      var times = [0];
      for (var i = 1; i < stops.length; i += 1) {
        times.push(times[i - 1] + ((stops[i].x - stops[i - 1].x) / trace.step) * beatMs);
      }
      // The dash leaves the line before the loop starts again
      var duration = times[times.length - 1] + beatMs * 0.35;
      var frames = stops.map(function (stop, j) {
        return {
          offset: times[j] / duration,
          strokeDashoffset: COMET_DASH - stop.share,
          easing: COMET_EASE,
        };
      });
      frames.push({ offset: 1, strokeDashoffset: COMET_DASH - COMET_EXIT });
      cometRun = comet.animate(frames, { duration: duration, iterations: Infinity });
    }

    function paint(i, draw) {
      var state = data(i);
      var trace = tracePath(state);
      var d = trace.d;
      var next = traces[shown === 0 ? 1 : 0];
      var prev = traces[shown];
      var stroke = state.alert ? "url(#ecg-amber)" : "url(#ecg-paper)";

      next.setAttribute("d", d);
      next.setAttribute("stroke", stroke);
      comet.setAttribute("d", d);
      ecg.classList.toggle("ecg--alert", state.alert);
      ecg.dataset.bpm = String(state.bpm);

      if (draw && motion && next.animate) {
        next.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: 1100,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        });
      }
      prev.classList.remove("is-shown");
      next.classList.add("is-shown");
      shown = traces.indexOf(next);

      runComet(trace, state.bpm);
      halo.style.animationDuration = (60 / state.bpm).toFixed(3) + "s";
    }

    function layout() {
      var box = ecg.getBoundingClientRect();
      if (!box.width || !box.height) return;
      if (Math.abs(box.width - size.w) < 0.5 && Math.abs(box.height - size.h) < 0.5) return;
      size.w = box.width;
      size.h = box.height;
      var g = geometry();
      svg.setAttribute("viewBox", "0 0 " + n(g.w) + " " + n(size.h));
      svg.setAttribute("preserveAspectRatio", "none");
      fades.forEach(function (fade) {
        fade.setAttribute("x2", n(g.end));
      });
      [halo, dot].forEach(function (circle) {
        circle.setAttribute("cx", n(g.end));
        circle.setAttribute("cy", n(g.base));
      });
      halo.setAttribute("r", n(16 * g.k));
      dot.setAttribute("r", n(6 * Math.max(g.k, 0.75)));
      traces[shown === 0 ? 1 : 0].setAttribute("d", "M0 " + n(g.base));
      paint(active, false);
    }

    function select(i, draw) {
      if (i === active) return;
      active = i;
      tabs.forEach(function (tab, j) {
        var on = j === i;
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        states[j].classList.toggle("is-active", on);
      });
      elapsed = 0;
      fills.forEach(function (fill) {
        fill.style.transform = "scaleX(0)";
      });
      paint(i, draw);
    }

    /* Auto-advance */
    function canRun() {
      return motion && !stopped && inView && !paused.hover && !paused.focus && !document.hidden;
    }

    function tick(now) {
      raf = 0;
      if (!canRun()) {
        last = 0;
        return;
      }
      if (last) elapsed += now - last;
      last = now;
      if (elapsed >= DURATION) select((active + 1) % tabs.length, true);
      fills[active].style.transform = "scaleX(" + Math.min(elapsed / DURATION, 1).toFixed(4) + ")";
      raf = window.requestAnimationFrame(tick);
    }

    function kick() {
      if (!raf && canRun()) {
        last = 0;
        raf = window.requestAnimationFrame(tick);
      }
    }

    function stop() {
      stopped = true;
      container.classList.add("moments--stopped");
    }

    /* Hover (fine pointers only), focus, tap and keys */
    tabs.forEach(function (tab, i) {
      tab.addEventListener("pointerenter", function (event) {
        if (event.pointerType !== "mouse") return;
        paused.hover = true;
        select(i, true);
      });
      tab.addEventListener("focus", function () {
        select(i, true);
      });
      tab.addEventListener("click", function () {
        select(i, true);
        stop();
      });
    });

    var list = container.querySelector(".moments__tabs");
    list.addEventListener("pointerleave", function () {
      paused.hover = false;
      kick();
    });
    list.addEventListener("focusin", function () {
      paused.focus = true;
    });
    list.addEventListener("focusout", function (event) {
      if (list.contains(event.relatedTarget)) return;
      paused.focus = false;
      kick();
    });
    list.addEventListener("keydown", function (event) {
      var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      var next = null;
      if (event.key in keys) next = (active + keys[event.key] + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      stop();
      tabs[next].focus();
    });

    document.addEventListener("visibilitychange", kick);

    if ("IntersectionObserver" in window && panel) {
      new IntersectionObserver(
        function (entries) {
          inView = entries[0].isIntersecting;
          if (inView) kick();
        },
        { threshold: 0.5 }
      ).observe(panel);
    }

    if ("ResizeObserver" in window) new ResizeObserver(layout).observe(ecg);
    layout();
  }

  /* ---------------------------------------------------------------
   * 2. Horizontal journey
   * ------------------------------------------------------------- */

  var stage = journey.querySelector(".journey__stage");
  var track = journey.querySelector(".journey__track");
  var panels = Array.prototype.slice.call(track.children);
  var ids = panels.map(function (panel) {
    return panel.id;
  });
  var progress = journey.querySelector(".journey__progress");
  var fill = journey.querySelector(".journey__fill");
  var head = journey.querySelector(".journey__head");
  var band = journey.querySelector(".band");

  journey.classList.add("journey--ready");

  // Leader lines on the band photo draw once the panel is mostly in view
  if (band && "IntersectionObserver" in window) {
    var bandSeen = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        band.classList.add("is-seen");
        bandSeen.disconnect();
      },
      { threshold: 0.6 }
    );
    bandSeen.observe(band);
  } else if (band) {
    band.classList.add("is-seen");
  }

  if (!motion) return;

  var wide = window.matchMedia("(min-width: 64rem) and (min-height: 37.5rem) and (hover: hover) and (pointer: fine)");
  var horizontal = false;
  var failedAt = "";
  var anchor = null;
  var resizing = false;
  var sections = Array.prototype.filter.call(
    document.querySelectorAll("main section[id], footer[id]"),
    function (section) {
      return !journey.contains(section);
    }
  );
  var metrics = { top: 0, range: 0, width: 0, holdStart: 0, holdEnd: 0 };
  var nearObserver = null;
  var frame = 0;
  var navigating = false;
  var PANEL_GAP = 2;
  // Vertical scroll spent on the first and last panel, in screens
  var HOLD_START = 0.9;
  var HOLD_END = 0.3;

  function sizeKey() {
    return window.innerWidth + "x" + window.innerHeight + "@" + getComputedStyle(root).fontSize;
  }

  function measure() {
    // One step is a panel plus the 2px gap between panels (css/journey.css)
    var width = stage.clientWidth + PANEL_GAP;
    metrics.width = width;
    metrics.range = (panels.length - 1) * width;
    metrics.holdStart = window.innerHeight * HOLD_START;
    metrics.holdEnd = window.innerHeight * HOLD_END;
    journey.style.height = window.innerHeight + metrics.holdStart + metrics.range + metrics.holdEnd + "px";
    metrics.top = journey.getBoundingClientRect().top + window.scrollY;
  }

  // Every line of copy must sit above the progress line; otherwise stay vertical
  function fits() {
    var limit = progress.getBoundingClientRect().top + 1;
    return panels.every(function (panel) {
      var items = panel.querySelectorAll(".panel__flow h2, .panel__flow p, .panel__flow li, .panel__flow button");
      for (var i = 0; i < items.length; i += 1) {
        if (items[i].closest(".phone")) continue;
        if (items[i].getBoundingClientRect().bottom > limit) return false;
      }
      return true;
    });
  }

  // The track stands still during both holds
  function progressNow() {
    var p = (window.scrollY - metrics.top - metrics.holdStart) / (metrics.range || 1);
    return Math.min(Math.max(p, 0), 1);
  }

  // The first panel opens its hold; the others are where the track stops on them
  function panelY(i) {
    return i === 0 ? metrics.top : metrics.top + metrics.holdStart + i * metrics.width;
  }

  function render() {
    frame = 0;
    if (!horizontal) return;
    if (stage.scrollLeft) stage.scrollLeft = 0;
    var p = progressNow();
    track.style.transform = "translate3d(" + (-p * metrics.range).toFixed(2) + "px, 0, 0)";

    // Head sits over the middle of the current panel's share of the rail
    var rail = progress.clientWidth;
    var unit = head.getBoundingClientRect().width / 80;
    var x = ((p * (panels.length - 1) + 0.5) / panels.length) * rail;
    head.style.transform = "translate3d(" + (x - 74.4 * unit).toFixed(2) + "px, 0, 0)";
    fill.style.transform = "scaleX(" + Math.max(0, (x - 74.4 * unit) / rail).toFixed(4) + ")";
  }

  function request() {
    if (!frame) frame = window.requestAnimationFrame(render);
  }

  /* Reading position: a panel inside the journey, or the section around the
     middle of the screen. It is saved while scrolling because a resize has
     already changed the layout by the time any handler can read it. */
  function readAnchor() {
    var middle = window.innerHeight / 2;
    var i;
    var r;
    if (horizontal) {
      r = journey.getBoundingClientRect();
      if (r.top <= middle && r.bottom > middle) {
        var p = progressNow();
        return { progress: p, panel: Math.round(p * (panels.length - 1)) };
      }
    }
    for (i = 0; !horizontal && i < panels.length; i += 1) {
      r = panels[i].getBoundingClientRect();
      if (r.top <= middle && r.bottom > middle) return { progress: i / (panels.length - 1), panel: i };
    }
    for (i = 0; i < sections.length; i += 1) {
      r = sections[i].getBoundingClientRect();
      if (r.top <= middle && r.bottom > middle) return { section: sections[i], offset: r.top };
    }
    return null;
  }

  function restoreAnchor() {
    var top;
    if (anchor.section) top = window.scrollY + anchor.section.getBoundingClientRect().top - anchor.offset;
    else if (horizontal) top = metrics.top + metrics.holdStart + anchor.progress * metrics.range;
    else top = panels[anchor.panel].getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top, behavior: "instant" });
  }

  function scrollToPanel(i, behavior) {
    if (horizontal) measure();
    var top = horizontal
      ? panelY(i)
      : panels[i].getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top, behavior: behavior });
  }

  // Offscreen panels are clipped, so native lazy loading would wait too long:
  // the photos load together one screen before the journey arrives
  function loadPanelsWhenNear() {
    if (nearObserver) return;
    nearObserver = new IntersectionObserver(
      function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        nearObserver.disconnect();
        Array.prototype.forEach.call(track.querySelectorAll("img[loading='lazy']"), function (img) {
          img.loading = "eager";
        });
      },
      { rootMargin: "100% 0px" }
    );
    nearObserver.observe(journey);
  }

  function enable() {
    horizontal = true;
    journey.classList.add("is-horizontal");
    panels.forEach(function (panel) {
      panel.tabIndex = 0;
    });
    loadPanelsWhenNear();
    window.addEventListener("scroll", request, { passive: true });
    measure();
    render();
  }

  function disable() {
    horizontal = false;
    journey.classList.remove("is-horizontal");
    journey.style.height = "";
    track.style.transform = "";
    panels.forEach(function (panel) {
      panel.removeAttribute("tabindex");
    });
    window.removeEventListener("scroll", request);
  }

  function sync() {
    var wasHorizontal = horizontal;
    var want = wide.matches && failedAt !== sizeKey();
    if (want && !horizontal) {
      enable();
      if (!fits()) {
        failedAt = sizeKey();
        disable();
      }
    } else if (!want && horizontal) {
      disable();
    } else if (horizontal) {
      measure();
      if (!fits()) {
        failedAt = sizeKey();
        disable();
      }
    }
    // A stacked page keeps its place by itself; restoring would fight the
    // resize that mobile browsers fire when the address bar moves
    if (anchor && (horizontal || wasHorizontal)) restoreAnchor();
    request();
  }

  /* Hash links: scroll to the vertical position that shows the panel */
  document.addEventListener("click", function (event) {
    if (!horizontal || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link) return;
    var i = ids.indexOf(link.getAttribute("href").slice(1));
    if (i < 0) return;
    event.preventDefault();
    scrollToPanel(i, "smooth");
    if (location.hash !== "#" + ids[i]) history.pushState(null, "", "#" + ids[i]);
    navigating = true;
    panels[i].focus({ preventScroll: true });
    navigating = false;
  });

  function followHash() {
    var i = ids.indexOf(location.hash.slice(1));
    if (horizontal && i >= 0) scrollToPanel(i, "instant");
  }

  window.addEventListener("hashchange", followHash);
  window.addEventListener("popstate", followHash);

  /* Keyboard: bring the panel that holds the focus into view */
  track.addEventListener("focusin", function (event) {
    if (!horizontal || navigating) return;
    var panel = event.target.closest(".panel");
    var i = panels.indexOf(panel);
    if (i < 0) return;
    var r = event.target.getBoundingClientRect();
    var inside = r.left >= 0 && r.right <= stage.clientWidth && r.top >= 0 && r.bottom <= window.innerHeight;
    if (inside && event.target !== panel) return;
    if (Math.abs(window.scrollY - panelY(i)) > 1) scrollToPanel(i, "instant");
  });

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    resizing = true;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      sync();
      resizing = false;
      anchor = readAnchor();
    }, 120);
  });
  window.addEventListener(
    "scroll",
    function () {
      if (!resizing) anchor = readAnchor();
    },
    { passive: true }
  );
  if (wide.addEventListener) wide.addEventListener("change", sync);

  // Content above the journey can change height (fonts, images)
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () {
      if (horizontal) {
        measure();
        request();
      }
    }).observe(document.body);
  }

  // On reload and back/forward the browser restores the position by itself;
  // following the hash too would jump to the panel and scroll back across the page
  var navigation = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  var restored = navigation && (navigation.type === "reload" || navigation.type === "back_forward");

  sync();
  if (!restored) followHash();
  anchor = readAnchor();
  window.addEventListener("load", function () {
    if (horizontal) measure();
    if (!restored) followHash();
    request();
    anchor = readAnchor();
  });
})();
