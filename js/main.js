(function () {
  "use strict";

  const header = document.getElementById("site-header");
  const burger = document.getElementById("burger");
  const nav = document.getElementById("main-nav");
  const heroMedia = document.getElementById("hero-video-slot");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (burger && nav) {
    burger.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      });
    });
  }

  const sections = ["hero", "proof", "specs", "usage", "delivery", "contacts"]
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  function updateActiveNav() {
    if (!nav) return;
    const y = window.scrollY + 110;
    let current = sections[0];
    sections.forEach(function (sec) {
      if (sec.offsetTop <= y) current = sec;
    });
    nav.querySelectorAll("a").forEach(function (a) {
      const href = a.getAttribute("href") || "";
      a.classList.toggle("is-active", href === "#" + current.id);
    });
  }

  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();

  /* Hero video: mark ready / fallback on error */
  if (heroMedia) {
    const video = heroMedia.querySelector(".hero__video");
    if (video) {
      const markReady = function () {
        heroMedia.classList.add("has-video");
      };

      if (video.readyState >= 2) {
        markReady();
      } else {
        video.addEventListener("loadeddata", markReady);
        video.addEventListener("canplay", markReady);
      }

      video.addEventListener("error", function () {
        heroMedia.classList.remove("has-video");
      });

      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {});
      }
    }
  }

  /* Mid-page videos: play only when visible */
  const viewVideos = document.querySelectorAll("[data-autoplay-on-view]");
  if (viewVideos.length && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const v = entry.target;
          if (entry.isIntersecting) {
            const p = v.play();
            if (p && typeof p.catch === "function") p.catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.35 }
    );
    viewVideos.forEach(function (v) {
      vio.observe(v);
    });
  } else {
    viewVideos.forEach(function (v) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    });
  }

  /* Reveal + stagger on scroll */
  const revealEls = document.querySelectorAll(".reveal, .reveal-stagger");

  function showAll() {
    revealEls.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  if (reduceMotion) {
    showAll();
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    showAll();
  }
})();
