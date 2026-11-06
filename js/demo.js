/**
 * AllinBand — Demo de la alerta
 * Reproduce la conversación según lo que responde quien visita la página.
 * El hilo de escalamiento ya está en el HTML: sin JS se lee completo.
 */

(function () {
  "use strict";

  var thread = document.getElementById("demoThread");
  var replies = document.getElementById("demoReplies");
  var end = document.getElementById("demoEnd");
  var replay = document.getElementById("demoReplay");
  var okTemplate = document.getElementById("demoOk");

  var alertItems = Array.prototype.slice.call(thread.children);
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var lastPath = null;
  var runId = 0;
  var follow = true;

  // Con JS, Luis todavía no confirma hasta que llega su mensaje
  document.getElementById("noticeLuis").classList.remove("is-read");

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function reveal(item) {
    if (follow) {
      item.scrollIntoView({
        block: "nearest",
        behavior: calm.matches ? "auto" : "smooth",
      });
    }
  }

  function showTyping() {
    var typing = document.createElement("li");
    typing.className = "is-shown";
    typing.setAttribute("aria-hidden", "true");
    typing.innerHTML =
      '<div class="msg msg--in typing"><span></span><span></span><span></span></div>';
    thread.appendChild(typing);
    reveal(typing);
    return typing;
  }

  function play(items, id) {
    return items.reduce(function (previous, item) {
      return previous.then(function () {
        if (id !== runId) return null;

        var isMessage = !item.classList.contains("sys");
        var typing = isMessage ? showTyping() : null;

        return wait(Number(item.dataset.wait)).then(function () {
          if (typing) typing.remove();
          if (id !== runId) return;

          item.classList.add("is-shown");
          reveal(item);

          if (item.dataset.marks) {
            document.getElementById(item.dataset.marks).classList.add("is-read");
          }
        });
      });
    }, Promise.resolve());
  }

  function start(path) {
    var id = ++runId;
    var items = alertItems;

    lastPath = path;
    follow = true;
    replies.hidden = true;
    thread.classList.add("is-active");
    thread.focus({ preventScroll: true });

    if (path === "ok") {
      thread.appendChild(okTemplate.content.cloneNode(true));
      items = Array.prototype.slice.call(thread.children).slice(alertItems.length);
    }

    play(items, id).then(function () {
      if (id !== runId) return;

      replay.textContent =
        path === "ok" ? "Ver qué pasa si no respondes" : "Ver qué pasa si cancelas";
      end.hidden = false;
      reveal(end);
      replay.focus({ preventScroll: true });
    });
  }

  function reset() {
    Array.prototype.slice.call(thread.children).forEach(function (item) {
      if (alertItems.indexOf(item) === -1) {
        item.remove();
      } else {
        item.classList.remove("is-shown");
      }
    });
    document.getElementById("noticeLuis").classList.remove("is-read");
    end.hidden = true;
  }

  replies.addEventListener("click", function (event) {
    var button = event.target.closest("[data-path]");
    if (button) start(button.dataset.path);
  });

  replay.addEventListener("click", function () {
    reset();
    start(lastPath === "ok" ? "alert" : "ok");
  });

  // Quien se desplaza por su cuenta deja de ser arrastrado por el hilo
  ["wheel", "touchmove"].forEach(function (type) {
    window.addEventListener(
      type,
      function () {
        follow = false;
      },
      { passive: true }
    );
  });
})();
