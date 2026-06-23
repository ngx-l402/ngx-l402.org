# ngx-l402.org

Static landing site for [ngx_l402](https://github.com/DhananjayPurohit/ngx_l402) —
an open-source nginx module that puts a Lightning paywall in front of any HTTP API.

Plain HTML + CSS with one ~2 KB vanilla-JS file (copy-to-clipboard, live
star count, scroll-spy). No build step, no framework, no dependencies.

```
.
├── index.html   # markup + inline stylesheet
└── main.js      # copy buttons, GitHub stars, sticky-header + nav state
```

## Develop

Any static server works (the GitHub star fetch needs `http://`, not `file://`):

```
python3 -m http.server 8000   # → http://localhost:8000
```

## Deploy

Deploy the repo root as-is on GitHub Pages, Cloudflare Pages, or Vercel —
no build command, output directory `.`.

## License

MIT.
