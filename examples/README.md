# ngx-l402 examples

Runnable demos for putting a Lightning paywall in front of any HTTP API with
[ngx_l402](https://github.com/ngx-l402/ngx-l402).

| Demo | What it shows | Run with |
|---|---|---|
| [`agent-pays-per-call`](agent-pays-per-call/) | An autonomous agent discovers a paid route, pays the invoice, and gets the data — no API key, no human. | Python |
| [`mcp-paid-tool`](mcp-paid-tool/) | The same flow as an **MCP tool**, so Claude (or any MCP client) can buy API calls on demand. | Python + MCP |
| [`llm-api-paywall`](llm-api-paywall/) | ngx-l402 in front of a local **LLM** (Ollama) — every chat completion costs sats. | Docker Compose |
| [`browser-pay-to-unlock`](browser-pay-to-unlock/) | A **WebLN** page that pays a 402 invoice in the browser and unlocks content live. | Static HTML |
| [`demo-gateway`](demo-gateway/) | The 1-sat live gateway behind the site's **"Try it live"** widget — CORS-ready nginx.conf + compose. | Docker Compose |

They all target the same primitive: a `402 Payment Required` carrying a Lightning
invoice, settled with a preimage. Point them at any ngx-l402 gateway — your own
deployment, or the regtest dev stack in the
[module repo](https://github.com/ngx-l402/ngx-l402).
