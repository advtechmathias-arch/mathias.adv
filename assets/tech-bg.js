(() => {
  "use strict";

  const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SECTIONS = [
    { selector: "#about", theme: "light" },
    { selector: "#team", theme: "light" },
    { selector: "#areas", theme: "light" },
    { selector: "#midia", theme: "light" },
    { selector: "#location", theme: "light" },
    { selector: "#contact", theme: "dark" },
  ];

  const THEMES = {
    light: { rgb: "33, 36, 44", dot: 0.32, line: 0.13, square: 0.24 },
    dark: { rgb: "204, 153, 51", dot: 0.55, line: 0.14, square: 0.35 },
  };

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  function setupSection(section, themeName) {
    if (!section || section.querySelector(".mathias-tech-canvas")) return;
    const cfg = THEMES[themeName];

    const contentWrap = section.firstElementChild;
    section.style.position = "relative";
    section.style.overflow = "hidden";
    if (contentWrap) {
      if (getComputedStyle(contentWrap).position === "static") {
        contentWrap.style.position = "relative";
      }
      if (!contentWrap.style.zIndex) contentWrap.style.zIndex = "1";
    }

    const canvas = document.createElement("canvas");
    canvas.className = "mathias-tech-canvas";
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      zIndex: "0",
      pointerEvents: "none",
    });
    section.insertBefore(canvas, section.firstChild);

    const ctx = canvas.getContext("2d");
    let width, height, dpr, particles, rafId, running = false;

    function targetCount() {
      return Math.max(14, Math.min(60, Math.round((width * height) / 16000)));
    }

    function makeParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.7 + 1,
        square: Math.random() < 0.35,
        size: Math.random() * 9 + 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.006,
      };
    }

    function measure() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = section.clientWidth;
      height = section.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function resize() {
      measure();

      if (!particles) {
        particles = Array.from({ length: targetCount() }, makeParticle);
        return;
      }

      // Keep existing particles where they are (just clamped into the new
      // bounds) instead of re-randomizing everything — a tab switch or content
      // reflow that changes section height shouldn't make the dots "teleport".
      particles.forEach((p) => {
        p.x = Math.max(0, Math.min(p.x, width));
        p.y = Math.max(0, Math.min(p.y, height));
      });

      const want = targetCount();
      if (particles.length < want) {
        particles.push(...Array.from({ length: want - particles.length }, makeParticle));
      } else if (particles.length > want) {
        particles.length = want;
      }
    }

    function paint() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(${cfg.rgb}, ${cfg.line * (1 - dist / 110)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        if (p.square) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.strokeStyle = `rgba(${cfg.rgb}, ${cfg.square})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          ctx.fillStyle = `rgba(${cfg.rgb}, ${cfg.dot})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    function tick() {
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      });
      paint();
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      if (REDUCE_MOTION) paint();
      else tick();
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    resize();

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !document.hidden) start();
        else stop();
      },
      { rootMargin: "150px" }
    );
    io.observe(section);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else if (isInViewport(section)) start();
    });

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (!running) paint();
      }, 120);
    };

    if (window.ResizeObserver) {
      new ResizeObserver(handleResize).observe(section);
    } else {
      window.addEventListener("resize", handleResize);
    }
  }

  function init() {
    SECTIONS.forEach(({ selector, theme }) => {
      setupSection(document.querySelector(selector), theme);
    });
  }

  function safeInit() {
    try {
      init();
    } catch (e) {
      console.error("mathias-tech-bg init failed:", e);
    }
  }

  function allSectionsMounted() {
    return SECTIONS.every(({ selector }) => document.querySelector(selector));
  }

  function pollInit(attemptsLeft) {
    safeInit();
    if (attemptsLeft > 0 && !allSectionsMounted()) {
      setTimeout(() => pollInit(attemptsLeft - 1), 150);
    }
  }

  pollInit(40);
  document.addEventListener("DOMContentLoaded", safeInit);
  window.addEventListener("load", safeInit);
})();
