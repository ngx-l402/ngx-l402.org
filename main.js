/* ngx-l402.org — minimal vanilla JS.
   Copy-to-clipboard, live star count, sticky-header state, nav scroll-spy. */

/* ---- copy-to-clipboard for every code card ---- */
(() => {
  const fallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (_) {}
    document.body.removeChild(ta);
  };

  document.querySelectorAll(".codecard").forEach((card) => {
    const btn = card.querySelector(".copy");
    if (!btn) return;
    const src = card.querySelector("template.copy-src");
    const text =
      (src && src.innerHTML.trim()) ||
      (card.querySelector("pre")?.textContent ?? "").trim();
    if (!text) return;

    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        fallbackCopy(text);
      }
      const original = btn.textContent;
      btn.textContent = "copied ✓";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("copied");
      }, 1400);
    });
  });
})();

/* ---- live GitHub star count ---- */
(() => {
  const slots = document.querySelectorAll("[data-stars]");
  if (!slots.length) return;
  const fmt = (n) =>
    n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
  fetch("https://api.github.com/repos/DhananjayPurohit/ngx_l402", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      const stars = d && typeof d.stargazers_count === "number" ? d.stargazers_count : null;
      if (stars == null) return;
      slots.forEach((el) => {
        el.textContent = fmt(stars);
        el.removeAttribute("hidden");
      });
    })
    .catch(() => {});
})();

/* ---- sticky-header shadow once scrolled ---- */
(() => {
  const bar = document.querySelector(".topbar");
  if (!bar) return;
  const onScroll = () => bar.classList.toggle("is-stuck", window.scrollY > 4);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* ---- nav scroll-spy ---- */
(() => {
  const links = [...document.querySelectorAll(".topbar__link[href^='#']")];
  if (!links.length || !("IntersectionObserver" in window)) return;
  const byId = new Map();
  links.forEach((l) => {
    const sec = document.querySelector(l.getAttribute("href"));
    if (sec) byId.set(sec, l);
  });
  let current = null;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (current) current.classList.remove("is-active");
        current = byId.get(e.target) || null;
        if (current) current.classList.add("is-active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  byId.forEach((_, sec) => io.observe(sec));
})();
