(function () {
  "use strict";

  var TELEGRAM_USER = "alekyananna";
  // Адрес Cloudflare Worker, который пересылает заявки в бота.
  // Если оставить пустым — форма откроет личный чат в Telegram с готовым текстом.
  var FORM_ENDPOINT = "https://pvd-form.anna-alekyan.workers.dev";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─── Шапка: фон при скролле ─── */
  var header = document.getElementById("header");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ─── Свечение за курсором ─── */
  var cursorGlow = document.getElementById("cursor-glow");
  if (cursorGlow && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    // стартуем там, где раньше стояло статичное свечение первого экрана
    var gx = window.innerWidth * 0.72;
    var gy = window.innerHeight * 0.3;
    var tx = gx;
    var ty = gy;
    var raf = 0;
    var ease = reduceMotion ? 1 : 0.14;

    var paint = function () {
      gx += (tx - gx) * ease;
      gy += (ty - gy) * ease;
      cursorGlow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      raf = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5 ? requestAnimationFrame(paint) : 0;
    };

    document.documentElement.classList.add("has-cursor-glow");
    paint();

    window.addEventListener("pointermove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      cursorGlow.classList.remove("is-away");
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", function () {
      cursorGlow.classList.add("is-away");
    });
  }

  /* ─── Бургер-меню ─── */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }
  burger.addEventListener("click", function () {
    setMenu(!nav.classList.contains("is-open"));
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  document.addEventListener("click", function (e) {
    if (nav.classList.contains("is-open") && !nav.contains(e.target) && !burger.contains(e.target)) setMenu(false);
  });

  /* ─── Активный пункт меню ─── */
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var tracked = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  function updateActive() {
    var y = window.scrollY + window.innerHeight * 0.35;
    var current = tracked[0];
    tracked.forEach(function (sec) {
      if (sec.getBoundingClientRect().top + window.scrollY <= y) current = sec;
    });
    // в самом низу страницы подсвечиваем последний пункт («Контакты»)
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = tracked[tracked.length - 1];
    }
    navLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + current.id);
    });
  }
  window.addEventListener("scroll", updateActive, { passive: true });
  updateActive();

  /* ─── Видео на первом экране: пока грузится — фото гранулы ─── */
  var heroMedia = document.getElementById("hero-media");
  var heroVideo = heroMedia && heroMedia.querySelector(".hero__video");
  var saveData = navigator.connection && navigator.connection.saveData;

  if (heroVideo && !reduceMotion && !saveData) {
    var startHeroVideo = function () {
      heroVideo.src = heroVideo.getAttribute("data-src");
      heroVideo.addEventListener("playing", function () {
        heroMedia.classList.add("has-video");
      }, { once: true });
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (document.readyState === "complete") startHeroVideo();
    else window.addEventListener("load", startHeroVideo, { once: true });
  }

  /* ─── Видео о материале: играет, только когда на экране ─── */
  var viewVideos = document.querySelectorAll("[data-autoplay-on-view]");
  if ("IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.35 });
    viewVideos.forEach(function (v) { vio.observe(v); });
  }

  /* ─── Сравнение «До / После» ─── */
  var compare = document.getElementById("compare");
  if (compare) {
    var range = compare.querySelector(".compare__range");
    var dragging = false;
    var touched = false;

    var setPos = function (v) {
      v = Math.max(0, Math.min(100, v));
      compare.style.setProperty("--pos", v + "%");
      range.value = Math.round(v);
      compare.classList.toggle("is-left", v < 12);
      compare.classList.toggle("is-right", v > 88);
    };
    var posFromEvent = function (e) {
      var r = compare.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    };

    compare.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      touched = true;
      compare.classList.add("is-dragging");
      setPos(posFromEvent(e));
      compare.setPointerCapture(e.pointerId);
    });
    compare.addEventListener("pointermove", function (e) {
      if (dragging) setPos(posFromEvent(e));
    });
    var stopDrag = function () {
      dragging = false;
      compare.classList.remove("is-dragging");
    };
    compare.addEventListener("pointerup", stopDrag);
    compare.addEventListener("pointercancel", stopDrag);

    range.addEventListener("input", function () {
      touched = true;
      setPos(Number(range.value));
    });

    // Подсказка: один раз «покачиваем» ползунок, когда блок появился на экране
    if (!reduceMotion && "IntersectionObserver" in window) {
      var hintIo = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        hintIo.disconnect();
        var keys = [50, 28, 72, 50];
        var start = null;
        var step = 700;
        var tick = function (t) {
          if (touched) return;
          if (start === null) start = t;
          var k = (t - start) / step;
          var i = Math.floor(k);
          if (i >= keys.length - 1) { setPos(50); return; }
          var f = k - i;
          var eased = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
          setPos(keys[i] + (keys[i + 1] - keys[i]) * eased);
          requestAnimationFrame(tick);
        };
        setTimeout(function () { requestAnimationFrame(tick); }, 500);
      }, { threshold: 0.6 });
      hintIo.observe(compare);
    }
  }

  /* ─── Появление блоков при скролле ─── */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ─── Маска телефона ─── */
  var form = document.getElementById("order-form");
  var phoneInput = form.querySelector('[name="phone"]');
  var phoneField = phoneInput.closest(".field");

  function formatPhone(value) {
    var d = value.replace(/\D/g, "");
    if (!d) return "";
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    var out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length >= 4) out += ")";
    if (d.length > 4) out += " " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    return out;
  }

  phoneInput.addEventListener("input", function () {
    phoneInput.value = formatPhone(phoneInput.value);
    phoneField.classList.remove("is-invalid");
  });

  /* ─── Согласие на обработку данных ─── */
  var consent = document.getElementById("consent");
  var submitBtn = form.querySelector('[type="submit"]');

  function syncConsent() { submitBtn.disabled = !consent.checked; }
  consent.addEventListener("change", syncConsent);
  window.addEventListener("pageshow", syncConsent);
  syncConsent();

  /* ─── Модалка с политикой ─── */
  var policyModal = document.getElementById("policy-modal");

  document.querySelectorAll("[data-open-policy]").forEach(function (btn) {
    btn.addEventListener("click", function () { policyModal.showModal(); });
  });
  policyModal.querySelector("[data-close-policy]").addEventListener("click", function () {
    policyModal.close();
  });
  // Клик по затемнённому фону закрывает модалку
  policyModal.addEventListener("click", function (e) {
    if (e.target === policyModal) policyModal.close();
  });

  /* ─── Заявка → Telegram-бот (через Cloudflare Worker) ─── */
  var note = document.getElementById("form-note");
  var submitLabel = submitBtn.querySelector(".btn__label");
  if (FORM_ENDPOINT) {
    submitLabel.textContent = "Отправить заявку";
    note.textContent = "Перезвоним и назовём цену в течение 30 минут.";
  }
  var submitText = submitLabel.textContent;

  function setNote(message, state) {
    note.textContent = message;
    note.classList.toggle("is-ok", state === "ok");
    note.classList.toggle("is-error", state === "error");
  }

  function setSending(sending) {
    form.setAttribute("aria-busy", sending ? "true" : "false");
    submitLabel.textContent = sending ? "Отправляем…" : submitText;
    submitBtn.disabled = sending || !consent.checked;
  }

  function formToFields(data) {
    return {
      phone: String(data.get("phone") || "").trim(),
      city: String(data.get("city") || "").trim(),
      volume: String(data.get("volume") || ""),
      message: String(data.get("message") || "").trim(),
      website: String(data.get("website") || "")
    };
  }

  function telegramUrl(f) {
    var text =
      "Здравствуйте! Хочу узнать цену на вторичную гранулу ПВД с доставкой.\n" +
      "Телефон: " + f.phone + "\n" +
      "Город: " + (f.city || "—") + "\n" +
      "Объём: " + (f.volume || "—") + "\n" +
      "Комментарий: " + (f.message || "—");
    return "https://t.me/" + TELEGRAM_USER + "?text=" + encodeURIComponent(text);
  }

  // Запасной путь, если бот недоступен: ссылка на Telegram с готовым текстом
  function showFallback(f) {
    setNote("Не получилось отправить заявку. ", "error");
    var link = document.createElement("a");
    link.href = telegramUrl(f);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Отправить в Telegram →";
    note.appendChild(link);
  }

  function sendToBot(f) {
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, 12000);
    return fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok || !body.ok) throw new Error(body.error || "send");
      });
    }).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!consent.checked || form.getAttribute("aria-busy") === "true") return;
    var f = formToFields(new FormData(form));

    if (f.phone.replace(/\D/g, "").length < 11) {
      phoneField.classList.add("is-invalid");
      phoneInput.focus();
      return;
    }

    // Адрес воркера ещё не задан — работаем по-старому, через личный чат
    if (!FORM_ENDPOINT) {
      window.open(telegramUrl(f), "_blank", "noopener");
      return;
    }

    setSending(true);
    setNote("", null);
    sendToBot(f).then(function () {
      form.reset();
      setNote("Спасибо! Заявка отправлена — перезвоним в течение 30 минут.", "ok");
    }, function () {
      showFallback(f);
    }).then(function () {
      setSending(false);
    });
  });
})();
