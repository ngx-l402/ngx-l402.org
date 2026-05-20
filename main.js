/* ngx-l402.org — minimal vanilla JS.
   Just copy-to-clipboard for every code card. */

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
