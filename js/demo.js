/**
 * AllinBand — Demo de la alerta
 * Reproduce la conversación según lo que responde quien visita la página.
 * El hilo de escalamiento ya está en el HTML: sin JS se lee completo.
 */

(function () {
  "use strict";

  var hero = document.getElementById("inicio");
  var thread = document.getElementById("demoThread");
  var replies = document.getElementById("demoReplies");
  var end = document.getElementById("demoEnd");
  var replay = document.getElementById("demoReplay");
  var okTemplate = document.getElementById("demoOk");
  var noticeLuis = document.getElementById("noticeLuis");

  var alertItems = Array.prototype.slice.call(thread.children);
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var lastPath = null;
  var runId = 0;
  var follow = true;

  // Con JS, Luis todavía no confirma hasta que llega su mensaje
  noticeLuis.classList.remove("is-read");

  function behavior() {
    return calm.matches ? "auto" : "smooth";
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function reveal(item) {
    if (follow) {
      item.scrollIntoView({ block: "nearest", behavior: behavior() });
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

  // Deja el hilo vacío y cancela cualquier reproducción en curso
  function clear() {
    runId += 1;
    Array.prototype.slice.call(thread.children).forEach(function (item) {
      if (alertItems.indexOf(item) === -1) {
        item.remove();
      } else {
        item.classList.remove("is-shown");
      }
    });
    noticeLuis.classList.remove("is-read");
    thread.classList.remove("is-active");
    end.hidden = true;
  }

  function rearm() {
    clear();
    replies.hidden = false;
  }

  function start(path) {
    clear();

    var id = runId;
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

  document.addEventListener("click", function (event) {
    var reply = event.target.closest("[data-path]");

    if (reply) {
      // Desde el cierre, la respuesta se vive arriba, donde está el hilo
      if (!hero.contains(reply)) {
        hero.scrollIntoView({ behavior: behavior() });
      }
      start(reply.dataset.path);
      return;
    }

    // Volver a la alerta siempre deja la pregunta lista para responder
    if (event.target.closest('a[href="#inicio"]')) rearm();
  });

  replay.addEventListener("click", function () {
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
