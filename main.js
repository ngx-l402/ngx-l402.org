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
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const clip = (s, n = 76) => (s.length > n ? s.slice(0, n - 14) + "…" + s.slice(-12) : s);
  const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  // ---- wire view: each exchange as the browser sees it ----
  const wireLog = $("ld-wire-log");
  const wire = (text, cls) => {
    const line = document.createElement("span");
    if (cls) line.className = cls;
    line.textContent = text + "\n";
    wireLog.append(line);
    $("ld-wire").hidden = false;
    wireLog.scrollTop = wireLog.scrollHeight;
  };
  const STATUS = { 200: "OK", 401: "Unauthorized", 402: "Payment Required", 404: "Not Found", 429: "Too Many Requests", 503: "Service Unavailable" };

  const http = async (url, headers = {}) => {
    wire(`→ GET ${url}`, "req");
    for (const [k, v] of Object.entries(headers)) wire(`  ${k.toLowerCase()}: ${clip(v)}`);
    const t0 = performance.now();
    const resp = await fetch(url, { headers });
    wire(`← ${resp.status} ${resp.statusText || STATUS[resp.status] || ""} · ${Math.round(performance.now() - t0)} ms`, resp.ok ? "ok" : "warn");
    // CORS lets a page read only the headers the gateway exposes.
    resp.headers.forEach((v, k) => wire(`  ${k}: ${clip(v)}`));
    return resp;
  };

  // The demo serves HTML; show its text, never its markup.
  const bodyText = async (resp) => {
    let text = await resp.text();
    if ((resp.headers.get("content-type") || "").includes("html")) {
      // Join text nodes with spaces: textContent glues "<h1>a</h1><p>b</p>" into "ab".
      const doc = new DOMParser().parseFromString(text, "text/html");
      doc.querySelectorAll("script, style").forEach((el) => el.remove());
      const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT), parts = [];
      while (walk.nextNode()) parts.push(walk.currentNode.nodeValue);
      text = parts.join(" ");
    }
    return text.replace(/\s+/g, " ").trim().slice(0, 300);
  };

  // L402 macaroons are v1: base64url packets of "<4-hex length>key value\n",
  // and the identifier is the invoice's payment hash.
  const decodeMacaroon = (b64) => {
    try {
      const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64.length / 4) * 4, "="));
      const mac = { caveats: [] };
      for (let i = 0, n; i < s.length && (n = parseInt(s.slice(i, i + 4), 16)); i += n) {
        const packet = s.slice(i + 4, i + n - 1), sp = packet.indexOf(" ");
        const key = packet.slice(0, sp), value = packet.slice(sp + 1);
        if (key === "identifier") mac.hash = toHex(Array.from(value, (c) => c.charCodeAt(0))).slice(-64);
        if (key === "cid") mac.caveats.push(value);
      }
      return mac.hash && mac.hash.length === 64 ? mac : null;
    } catch {
      return null;
    }
  };

  // BOLT-11: 7 words of timestamp, tagged fields, then a 104-word signature.
  // Tag "p" (1) holds the payment hash in 52 five-bit words.
  const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const invoiceHash = (invoice) => {
    const s = invoice.toLowerCase();
    const w = Array.from(s.slice(s.lastIndexOf("1") + 1, -6), (c) => BECH32.indexOf(c));
    for (let i = 7; i + 3 <= w.length - 104; i += 3 + w[i + 1] * 32 + w[i + 2]) {
      if (w[i] !== 1 || w[i + 1] * 32 + w[i + 2] !== 52) continue;
      const bits = w.slice(i + 3, i + 55).map((x) => x.toString(2).padStart(5, "0")).join("");
      return toHex(bits.slice(0, 256).match(/.{8}/g).map((b) => parseInt(b, 2)));
    }
    return null;
  };

  const sha256Hex = async (hex) =>
    crypto.subtle
      ? toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16))))))
      : null;

  // What a 402 commits to: the token and the invoice share one payment hash.
  const explain = ({ macaroon, invoice }) => {
    const mac = decodeMacaroon(macaroon), hash = invoiceHash(invoice);
    state.hash = (mac && mac.hash) || hash;
    wire("\n  macaroon, decoded", "dim");
    if (mac) {
      wire(`    payment hash  ${mac.hash}`);
      mac.caveats.forEach((c) => wire(`    caveat        ${c}`));
    } else wire("    (not a format this page decodes)");
    wire("  invoice, decoded", "dim");
    wire(`    amount        ${fmtAmount(invoiceSats(invoice)) || "any"}`);
    if (hash) wire(`    payment hash  ${hash}`);
    if (mac && hash) {
      const same = mac.hash === hash;
      wire(same ? "    ✓ token and invoice share one payment hash" : "    ✗ token and invoice hashes differ", same ? "ok" : "warn");
    }
  };

  const request = async (keepWire) => {
    pay.hidden = true;
    $("ld-receipt").hidden = true;
    if (keepWire !== true) wireLog.textContent = "";
    show("→ GET " + esc(target()));
    let resp;
    try {
      resp = await http(target());
    } catch (e) {
      show(
        "Gateway unreachable. Start one locally in 60 seconds:\n" +
        "docker run -d -p 8000:8000 -e LN_CLIENT_TYPE=LNURL -e LNURL_ADDRESS=you@getalby.com " +
        "-e ROOT_KEY=$(openssl rand -hex 32) ghcr.io/ngx-l402/ngx-l402:latest\n" +
        "then set the gateway above to http://localhost:8000", "warn");
      return null;
    }
    if (resp.status === 200) {
      show("<span class='ok'>200 OK</span> — this route isn't paywalled.\n\n" + esc(await bodyText(resp)));
      return null;
    }
    if (resp.status !== 402) {
      show("Unexpected HTTP " + resp.status, "warn");
      return null;
    }
    const parsed = parseChallenge(resp.headers.get("WWW-Authenticate"));
    if (!parsed) {
      show("Got 402, but the browser can't read WWW-Authenticate.\nThe gateway must send: Access-Control-Expose-Headers: WWW-Authenticate", "warn");
      return null;
    }
    state.macaroon = parsed.macaroon;
    state.invoice = parsed.invoice;
    explain(parsed);
    const amt = fmtAmount(invoiceSats(parsed.invoice));
    show(`<span class='warn'>402 Payment Required</span>${amt ? " — pay <b>" + amt + "</b>" : ""}. Pay the invoice below, then unlock.`);
    $("ld-invoice").textContent = parsed.invoice;
    $("ld-wallet").href = "lightning:" + parsed.invoice;
    pay.hidden = false;
    return parsed;
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
      state.cashuSats = msat ? msat / 1000 : null;

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
    wire("");
    const preimage = authorization.startsWith("L402 ") ? authorization.split(":").pop() : null;
    state.verified = false;
    if (preimage && state.hash) {
      const hash = await sha256Hex(preimage);
      if (hash) {
        state.verified = hash === state.hash;
        wire(`  sha256(preimage) = ${hash}`, "dim");
        wire(state.verified
          ? "  ✓ matches the payment hash: proof of payment, checked in your browser"
          : "  ✗ doesn't match the payment hash, so the gateway will refuse it", state.verified ? "ok" : "warn");
      }
    }
    let resp;
    try {
      resp = await http(target(), { Authorization: authorization });
    } catch (e) {
      show("Network error on retry: " + esc(e), "warn");
      return false;
    }
    const body = esc(await bodyText(resp));
    if (resp.status === 200) {
      pay.hidden = true;
      show("<span class='ok'>🔓 200 OK — unlocked. That's the whole flow: 402 → pay → proof → content.</span>\n\n" + body);
      receipt(preimage ? "Lightning" : "Cashu ecash");
      return true;
    }
    show("Retry returned HTTP " + resp.status + "\n" + body, "warn");
    return false;
  };

  // ---- receipt, shareable as a Nostr note ----
  const receipt = (method) => {
    const sats = method === "Lightning" ? invoiceSats(state.invoice) : state.cashuSats;
    const paid = fmtAmount(sats) || "a few sats";
    const rows = [
      ["Paid", `${paid} · ${method}`],
      ["For", "GET " + target().replace(/^https?:\/\//, "")],
      ["When", new Date().toLocaleString()],
    ];
    if (method === "Lightning" && state.hash) rows.push(["Payment hash", clip(state.hash, 34)]);
    if (state.verified) rows.push(["Proof", "sha256(preimage) = payment hash ✓"]);
    $("ld-receipt-body").replaceChildren(...rows.flatMap(([k, v]) => {
      const dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = k;
      dd.textContent = v;
      return [dt, dd];
    }));
    state.note = `Just paid ${paid} ${method === "Lightning" ? "over Lightning" : "in Cashu ecash"} to get past a paywall: ` +
      "no account, no card, no API key. Checked at the edge by ngx-l402.\n\nTry it: https://ngx-l402.org/#try";
    $("ld-share").disabled = false;
    $("ld-share").textContent = "Share on Nostr";
    $("ld-receipt").hidden = false;
  };

  // NIP-07: the visitor's extension signs; the first relay to accept wins.
  const RELAYS = ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net"];
  const publish = (event) =>
    Promise.any(RELAYS.map((url) => new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const finish = (fn, v) => { clearTimeout(timer); ws.close(); fn(v); };
      const timer = setTimeout(() => finish(reject, "timeout"), 6000);
      ws.onopen = () => ws.send(JSON.stringify(["EVENT", event]));
      ws.onerror = () => finish(reject, "error");
      ws.onmessage = (m) => {
        const [type, id, accepted] = JSON.parse(m.data);
        if (type === "OK" && id === event.id) finish(accepted ? resolve : reject, url);
      };
    })));

  const share = async () => {
    const btn = $("ld-share");
    if (!window.nostr) {
      try {
        await navigator.clipboard.writeText(state.note);
        btn.textContent = "Copied: paste it into any Nostr client";
      } catch {
        show(esc(state.note));
      }
      return;
    }
    btn.disabled = true;
    try {
      btn.textContent = "Signing…";
      const event = await window.nostr.signEvent({
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["t", "l402"], ["r", "https://ngx-l402.org"]],
        content: state.note,
      });
      btn.textContent = "Publishing…";
      await publish(event);
      btn.textContent = "Posted to Nostr ✓";
    } catch (e) {
      btn.disabled = false;
      btn.textContent = "Share on Nostr";
      show("Nostr: " + esc(e instanceof AggregateError ? "no relay accepted the note" : e.message || e), "warn");
    }
  };

  const payWithWebln = async () => {
    if (!window.webln) {
      show("No WebLN wallet found (try the Alby extension) — or pay with any wallet and paste the preimage below.", "warn");
      return false;
    }
    try {
      await window.webln.enable();
      const res = await window.webln.sendPayment(state.invoice);
      if (!res || !res.preimage) throw new Error("wallet returned no preimage");
      return await retry(`L402 ${state.macaroon}:${res.preimage}`);
    } catch (e) {
      // Alby latches after a failed enable() and refuses every later call, so
      // say the reload out loud — otherwise the next click looks like a new bug.
      show("WebLN: " + esc(e.message || e) + "\nIf this repeats, reload the page — the wallet blocks further calls until then.", "warn");
      return false;
    }
  };

  // ---- agent mode: discover → check the price → pay → unlock, narrated ----
  const BUDGET_SATS = 10;
  const say = (text) => wire("🤖 " + text, "agent");
  const agent = async (e) => {
    e.preventDefault();
    wireLog.textContent = "";
    $("ld-wire").open = true;
    const gw = $("ld-gw").value.replace(/\/$/, "");
    show("🤖 Agent running. Follow it in the wire view below.");
    say(`Given only ${gw.replace(/^https?:\/\//, "")} and a ${BUDGET_SATS}-sat budget. Looking for a price list…`);
    let manifest = null;
    try {
      const resp = await http(gw + "/.well-known/l402-services");
      if (resp.ok) manifest = await resp.json();
    } catch {
      /* reported below */
    }
    const routes = (manifest && manifest.routes) || [];
    if (!routes.length) return say("No /.well-known/l402-services here, so there's nothing to discover. Stopping.");
    say(`Found "${(manifest.service && manifest.service.name) || "a service"}" with ${routes.length} paid route${routes.length === 1 ? "" : "s"}:`);
    routes.forEach((r) => say(`  ${r.path}  ${r.price && r.price.amount_msat ? fmtAmount(r.price.amount_msat / 1000) : "priced per request"}`));
    const route = routes.find((r) => r.path === $("ld-path").value) || routes[0];
    // null coerces to 0 in comparisons, so a null price would read as
    // "within budget" — treat any non-numeric price as unaffordable.
    const sats = route.price && route.price.amount_msat != null ? route.price.amount_msat / 1000 : null;
    if (sats == null || !(sats <= BUDGET_SATS)) return say(`${route.path} has no fixed price within budget. Stopping.`);
    $("ld-path").value = route.path;
    say(`Picking ${route.path}: ${fmtAmount(sats)} fits the budget. Requesting it…`);
    if (!(await request(true))) return say("No payable challenge came back. Stopping.");
    const asked = invoiceSats(state.invoice);
    if (asked !== sats) return say(`The invoice asks for ${fmtAmount(asked)}, not the advertised ${fmtAmount(sats)}. Refusing to pay.`);
    say("The invoice matches the advertised price. Paying…");
    if (!window.webln) return say("A real agent pays from its own wallet here. This browser has no WebLN wallet, so pay the invoice below and paste the preimage to finish.");
    if (await payWithWebln()) say("Done: discovered, paid and unlocked with no human in the loop.");
  };

  go.addEventListener("click", request);
  $("ld-webln").addEventListener("click", payWithWebln);
  $("ld-agent").addEventListener("click", agent);
  $("ld-share").addEventListener("click", share);
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
