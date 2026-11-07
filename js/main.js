/**
 * AllinBand — Navigation
 * Disclosure ticker, mobile menu, mist band after scrolling and active section.
 */

(function () {
  "use strict";

  var navbar = document.querySelector(".navbar");
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");
  var links = Array.prototype.slice.call(menu.querySelectorAll(".nav__link"));
  var root = document.documentElement;

  // Ticker: the text in the HTML stays the only copy exposed to assistive
  // technology. Under reduced motion, or at a large browser font, it stays static
  var moves =
    root.classList.contains("motion") && !window.matchMedia("(max-width: 19.99em)").matches;

  function fillTicker(ticker, text) {
    var track = ticker.querySelector(".ticker__track");
    var copies = track.children.length ? 7 : 8;
    for (var i = 0; i < copies; i += 1) {
      var copy = document.createElement("p");
      copy.textContent = text;
      copy.setAttribute("aria-hidden", "true");
      track.appendChild(copy);
    }
    ticker.classList.add("is-moving");
  }

  var heroTicker = document.querySelector(".hero__ticker");
  var disclosure = document.querySelector(".hero__disclosure");

  if (moves) {
    fillTicker(heroTicker, disclosure.textContent);
    // Focusable so the keyboard can pause it too
    heroTicker.tabIndex = 0;
    heroTicker.setAttribute("role", "group");
    heroTicker.setAttribute("aria-label", "Aviso del proyecto");

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroTicker.classList.toggle("is-away", !entries[0].isIntersecting);
      }).observe(heroTicker);
    }
  }

  function menuIsOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Cerrar" : "Menú";
    menu.classList.toggle("is-open", open);
    syncNavbar();
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
    if (menuIsOpen() && !event.target.closest(".navbar")) setMenu(false);
  });

  // Open text over the sky; the mist band only once the page has moved
  function syncNavbar() {
    navbar.classList.toggle("is-scrolled", window.scrollY > 8 || menuIsOpen());
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        syncNavbar();
      });
    },
    { passive: true }
  );
  syncNavbar();

  // Active section: the one crossing a small area below the navbar, at the
  // horizontal center so a journey panel counts only once it fills the screen
  var linkBySection = {};
  links.forEach(function (link) {
    linkBySection[link.getAttribute("href").slice(1)] = link;
  });

  function setActive(id) {
    links.forEach(function (link) {
      link.removeAttribute("aria-current");
    });
    if (linkBySection[id]) linkBySection[id].setAttribute("aria-current", "true");
  }

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-30% -49% -65% -49%" }
    );

    document.querySelectorAll("main section[id], footer[id]").forEach(function (section) {
      spy.observe(section);
    });
  }
})();
