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

  // The menu repeats the disclosure on screen; the hero copy is the one exposed
  var menuTicker = document.createElement("div");
  menuTicker.className = "ticker nav__ticker is-away";
  menuTicker.setAttribute("aria-hidden", "true");
  menuTicker.innerHTML = '<div class="ticker__track"></div>';
  if (moves) {
    fillTicker(menuTicker, disclosure.textContent);
  } else {
    menuTicker.firstChild.textContent = disclosure.textContent;
  }
  menu.appendChild(menuTicker);

  // Everything behind the menu leaves the tab order while it is open
  var behind = Array.prototype.slice.call(document.querySelectorAll(".skip-link, main, .closing"));
  var desktop = window.matchMedia("(min-width: 64rem)");
  var CLOSE_MS = 200;
  var closeTimer = 0;

  function menuIsOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  function setMenu(open, instant) {
    window.clearTimeout(closeTimer);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Cerrar" : "Menú";
    menu.classList.toggle("is-open", open);
    menuTicker.classList.toggle("is-away", !open);
    root.classList.toggle("menu-open", open);
    behind.forEach(function (el) {
      el.inert = open;
    });

    if (open) {
      menu.classList.add("is-live");
      menu.scrollTop = 0;
      navbar.classList.add("is-menu-open");
    } else if (instant || !root.classList.contains("motion")) {
      navbar.classList.remove("is-menu-open");
    } else {
      // The navbar blur comes back only after the fade, or it would clip the menu
      closeTimer = window.setTimeout(function () {
        navbar.classList.remove("is-menu-open");
      }, CLOSE_MS);
    }
  }

  toggle.addEventListener("click", function () {
    setMenu(!menuIsOpen());
  });

  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) setMenu(false);
  });

  function keepFocusInside(event) {
    var items = Array.prototype.filter.call(
      navbar.querySelectorAll("a[href], button"),
      function (item) {
        return item.getClientRects().length > 0;
      }
    );
    var first = items[0];
    var last = items[items.length - 1];
    var active = document.activeElement;
    if (items.indexOf(active) < 0) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener("keydown", function (event) {
    if (!menuIsOpen()) return;
    if (event.key === "Escape") {
      setMenu(false);
      toggle.focus();
    } else if (event.key === "Tab") {
      keepFocusInside(event);
    }
  });

  function closeOnDesktop() {
    if (desktop.matches && menuIsOpen()) setMenu(false, true);
  }

  if (desktop.addEventListener) desktop.addEventListener("change", closeOnDesktop);

  // Open text over the sky; the mist band only once the page has moved
  function syncNavbar() {
    navbar.classList.toggle("is-scrolled", window.scrollY > 8);
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
