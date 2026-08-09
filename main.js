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
  fetch("https://api.github.com/repos/ngx-l402/ngx-l402", {
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

/* ---- mobile hamburger menu ---- */
(() => {
  const bar = document.querySelector(".topbar");
  const btn = document.getElementById("nav-toggle");
  if (!bar || !btn) return;
  const set = (open) => {
    bar.classList.toggle("nav-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  btn.addEventListener("click", () => set(!bar.classList.contains("nav-open")));
  bar.querySelectorAll(".topbar__nav a").forEach((a) =>
    a.addEventListener("click", () => set(false))
  );
})();

/* ---- live latest-version from GitHub releases ---- */
(() => {
  const slots = document.querySelectorAll("[data-version]");
  if (!slots.length) return;
  fetch("https://api.github.com/repos/ngx-l402/ngx-l402/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      const tag = d && typeof d.tag_name === "string" ? d.tag_name : null;
      if (!tag) return;
      const label = tag.startsWith("v") ? tag : "v" + tag;
      slots.forEach((el) => (el.textContent = label));
    })
    .catch(() => {});
})();

/* ---- dark / light theme toggle ---- */
(() => {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const root = document.documentElement;
  const apply = (t) => {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (_) {}
    btn.textContent = t === "dark" ? "☀️" : "🌙";
    btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  };
  apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
  btn.addEventListener("click", () =>
    apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark")
  );
})();

/* ---- live L402 demo widget ---- */
(() => {
  const $ = (id) => document.getElementById(id);
  const go = $("ld-go");
  if (!go) return;

  const state = { macaroon: null, invoice: null };
  const out = $("ld-out"), pay = $("ld-pay");

  const show = (html, cls) => {
    out.hidden = false;
    out.innerHTML = cls ? `<span class="${cls}">${html}</span>` : html;
  };

  const parseChallenge = (header) => {
    const fields = {};
    for (const m of (header || "").matchAll(/(\w+)\s*=\s*"([^"]*)"/g)) fields[m[1]] = m[2];
    const macaroon = fields.macaroon || fields.token;
    if (!macaroon || !fields.invoice) return null;
    return { macaroon, invoice: fields.invoice };
  };

  // Decode the amount from a BOLT-11 invoice's human-readable prefix.
  const invoiceSats = (inv) => {
    // amount (+ optional multiplier) sits before the bech32 "1" separator
    const m = (inv || "").match(/^ln(?:bcrt|bc|tbs|tb)(\d+)([munp])?1/i);
    if (!m) return null; // amountless invoice → don't show a price
    const msatPerUnit = { m: 1e8, u: 1e5, n: 1e2, p: 0.1 };
    const msat = parseInt(m[1], 10) * (m[2] ? msatPerUnit[m[2].toLowerCase()] : 1e11);
    return msat / 1000; // sats (may be fractional)
  };
  const fmtAmount = (sats) =>
    sats == null ? "" : Number.isInteger(sats)
      ? `${sats} sat${sats === 1 ? "" : "s"}`
      : `${Math.round(sats * 1000)} msat`;

  const target = () => $("ld-gw").value.replace(/\/$/, "") + $("ld-path").value;

  const request = async () => {
    pay.hidden = true;
    show("→ GET " + target());
    let resp;
    try {
      resp = await fetch(target());
    } catch (e) {
      show(
        "Gateway unreachable. Start one locally in 60 seconds:\n" +
        "docker run -d -p 8000:8000 -e LN_CLIENT_TYPE=LNURL -e LNURL_ADDRESS=you@getalby.com " +
        "-e ROOT_KEY=$(openssl rand -hex 32) ghcr.io/ngx-l402/ngx-l402:latest\n" +
        "then set the gateway above to http://localhost:8000", "warn");
      return;
    }
    if (resp.status === 200) {
      show("<span class='ok'>200 OK</span> — this route isn't paywalled.\n\n" + (await resp.text()).slice(0, 500));
      return;
    }
    if (resp.status !== 402) {
      show("Unexpected HTTP " + resp.status, "warn");
      return;
    }
    const parsed = parseChallenge(resp.headers.get("WWW-Authenticate"));
    if (!parsed) {
      show("Got 402, but the browser can't read WWW-Authenticate.\nThe gateway must send: Access-Control-Expose-Headers: WWW-Authenticate", "warn");
      return;
    }
    state.macaroon = parsed.macaroon;
    state.invoice = parsed.invoice;
    const amt = fmtAmount(invoiceSats(parsed.invoice));
    show(`<span class='warn'>402 Payment Required</span>${amt ? " — pay <b>" + amt + "</b>" : ""}. Pay the invoice below, then unlock.`);
    $("ld-invoice").textContent = parsed.invoice;
    $("ld-wallet").href = "lightning:" + parsed.invoice;
    pay.hidden = false;
  };

  // eCash never sees a 402, so the price and mint list come from the manifest.
  const showMints = async () => {
    const el = $("ld-mints");
    el.hidden = true;
    try {
      const gw = $("ld-gw").value.replace(/\/$/, "");
      const resp = await fetch(gw + "/.well-known/l402-services");
      if (!resp.ok) return;
      const manifest = await resp.json();

      const cashu = (manifest.payment_methods || []).find((p) => p.type === "cashu");
      if (!cashu || !cashu.mints || !cashu.mints.length) return;

      const path = $("ld-path").value;
      const route = (manifest.routes || []).find((r) => r.path === path);
      const msat = route && route.price && route.price.amount_msat;
      const price = msat ? fmtAmount(msat / 1000) : null;

      // Keep the path — mint.minibits.cash/Bitcoin is not mint.minibits.cash.
      const names = cashu.mints.map((m) => m.replace(/^https?:\/\//, ""));
      const mints =
        names.length > 1
          ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`
          : names[0];
      el.textContent = price
        ? `Needs a ${price} token from ${mints}`
        : `Tokens accepted from ${mints}`;
      el.hidden = false;
    } catch (e) {
      /* manifest is optional — the invoice path works without it */
    }
  };

  // Not NUT-24's X-Cashu: gateways only read it from 1.2.9 on, and the gateway
  // field accepts any URL, so Authorization is what works against every version.
  const retry = async (authorization) => {
    show("→ sending proof of payment…");
    let resp;
    try {
      resp = await fetch(target(), { headers: { Authorization: authorization } });
    } catch (e) {
      show("Network error on retry: " + e, "warn");
      return;
    }
    const body = (await resp.text()).slice(0, 500);
    if (resp.status === 200) {
      pay.hidden = true;
      show("<span class='ok'>🔓 200 OK — unlocked. That's the whole flow: 402 → pay → proof → content.</span>\n\n" + body);
    } else {
      show("Retry returned HTTP " + resp.status + "\n" + body, "warn");
    }
  };

  go.addEventListener("click", request);
  $("ld-webln").addEventListener("click", async () => {
    if (!window.webln) {
      show("No WebLN wallet found (try the Alby extension) — or pay with any wallet and paste the preimage below.", "warn");
      return;
    }
    try {
      await window.webln.enable();
      const res = await window.webln.sendPayment(state.invoice);
      if (!res || !res.preimage) throw new Error("wallet returned no preimage");
      await retry(`L402 ${state.macaroon}:${res.preimage}`);
    } catch (e) {
      // Alby latches after a failed enable() and refuses every later call, so
      // say the reload out loud — otherwise the next click looks like a new bug.
      show("WebLN: " + (e.message || e) + "\nIf this repeats, reload the page — the wallet blocks further calls until then.", "warn");
    }
  });
  $("ld-unlock").addEventListener("click", () => {
    const p = $("ld-preimage").value.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(p)) {
      show("Preimage must be 64 hex characters.", "warn");
      return;
    }
    retry(`L402 ${state.macaroon}:${p}`);
  });
  $("ld-cashu-unlock").addEventListener("click", () => {
    const t = $("ld-cashu").value.trim();
    if (!/^cashu[AB]/.test(t)) {
      show("That doesn't look like a Cashu token — they start with cashuA or cashuB.", "warn");
      return;
    }
    retry(`Cashu ${t}`);
  });
  $("ld-copy").addEventListener("click", () => navigator.clipboard.writeText(state.invoice || ""));

  // Fetch on open, not on load: the invoice flow costs no extra request.
  $("ld-cashu-toggle").addEventListener("click", (e) => {
    e.preventDefault();
    const box = $("ld-cashu-box");
    box.hidden = !box.hidden;
    if (!box.hidden) showMints();
  });
  ["ld-gw", "ld-path"].forEach((id) =>
    $(id).addEventListener("change", () => {
      if (!$("ld-cashu-box").hidden) showMints();
    })
  );
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
