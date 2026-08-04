# AI Project Kickoff Builder

GitHub source of truth for the original AI Project Kickoff Builder skill and its Project G in-chat command-center controller.

## Included

- 21 Project G tabs
- evidence-based completion and readiness
- Aaron Allton / Cody Rose contribution evidence
- iLL Agency normalized to Aaron
- section updates and Aaron/Cody/team notes
- 12 MCP tools
- direct ChatGPT action routing
- Docker deployment and persistent JSON state
- bundled skill and deterministic Python runner

## Run

```bash
npm install
npm run check
npm start
```

- MCP: `http://localhost:8787/mcp`
- Preview: `http://localhost:8787/preview`
- Health: `http://localhost:8787/healthz`

Deploy the Docker app from this directory, then connect the public HTTPS URL ending in `/mcp` as a ChatGPT Developer Mode app.
