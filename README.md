# ngx-l402.org

Static landing site for [ngx_l402](https://github.com/) — an open-source
nginx module that puts a Lightning paywall in front of any HTTP API.

## Stack

Plain HTML + CSS + a single vanilla-JS file. No build step, no
framework, no dependencies. Inlined CSS, deferred ~1 KB script.

```
.
├── index.html   # markup + inline stylesheet
└── main.js      # copy-to-clipboard for code blocks
```

## Run locally

Any static server will do:

```
python3 -m http.server 8000
# → http://localhost:8000
```

Or:

```
npx serve .
```

## Deploy

The repo is a deploy-as-is static site. Point GitHub Pages, Cloudflare
Pages, or Vercel at the root.

```
# Cloudflare Pages / Vercel
# Build command: (none)
# Output directory: .
```

## Edit checklist

Placeholders to swap before launch:

- [ ] Star count on the GitHub button — currently absent; add `· 142`
      after `View on GitHub` once known. Consider fetching at build time
      from `https://api.github.com/repos/ngx-l402/ngx-l402.org` instead.
- [ ] `og:url` in `<head>` is `https://ngx-l402.org` — confirm before
      production.
- [ ] Docs link (`Read the docs ↗`) — currently `#`, point at real docs.
- [ ] Footer Reference links (directive ref, backend ref, L402 spec,
      MPP draft) — currently `#`, point at real URLs.

## Why no framework

The audience is backend engineers evaluating a paywall gateway. They
will view-source. The page targets Lighthouse 100/100/100/100 as a
credibility signal — a 25 KB static document with no client framework
hits that cleanly.

## License

MIT.
