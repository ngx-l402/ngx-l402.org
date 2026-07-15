# ngx-l402.org

Static landing site for [ngx_l402](https://github.com/ngx-l402/ngx-l402) —
an open-source nginx module that puts a Lightning paywall in front of any HTTP API.

Plain HTML + CSS with one vanilla-JS file — no build step, no framework, no
dependencies.

```
.
├── index.html   # markup + inline stylesheet
├── main.js      # copy buttons, theme toggle, live demo widget, GitHub stars
├── docs/        # rendered mdBook (synced from the module repo on release)
└── examples/    # runnable demos
```

## Develop

Any static server works (the GitHub star fetch needs `http://`, not `file://`):

```
python3 -m http.server 8000   # → http://localhost:8000
```

## License

MIT.
