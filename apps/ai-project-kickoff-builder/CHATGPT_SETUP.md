# ChatGPT setup

1. Deploy this directory with Docker using a persistent disk mounted at `/app/data`.
2. Confirm `https://YOUR-HOST/healthz` and `https://YOUR-HOST/mcp`.
3. Enable ChatGPT Developer Mode.
4. Add the remote MCP app URL ending in `/mcp`.
5. Open a chat and say: `Use $ai-project-kickoff-builder to open Project G.`

The UI is the controller; ChatGPT applies the skill, invokes the MCP tools, performs the work, and refreshes the UI.
