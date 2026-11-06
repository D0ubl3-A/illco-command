# AutoTube production architecture: @Sites + illcoai.tech + MCP

## Authoritative production target

AutoTube is not a separate ChatGPT Site and is not branded or exposed through a provider-owned deployment URL.

The authoritative public product surface is:

- Site: `https://illcoai.tech`
- AutoTube MCP: `https://illcoai.tech/api/chatgpt/autotube/mcp`
- AutoTube widget: `https://illcoai.tech/api/chatgpt/autotube/widget`
- Render submission route: `https://illcoai.tech/api/autotube/render`
- OAuth resource metadata: same-origin `illcoai.tech` routes defined by the application

`@Sites` is the publishing and site-management surface used to update the existing `illcoai.tech` Site. The AutoTube application is exposed to ChatGPT through the MCP endpoint on that production domain.

## Required request path

```text
ChatGPT
  -> https://illcoai.tech/api/chatgpt/autotube/mcp
  -> AutoTube MCP tools
  -> AutoTube 4 style engine and quality gate
  -> protected external render service
  -> signed artifact route on illcoai.tech
  -> AutoTube MCP widget
```

## Site and server responsibilities

The `illcoai.tech` Site is responsible for:

- the public iLLCo AI product-studio experience;
- AutoTube product discovery and launch surfaces;
- the same-origin AutoTube MCP and widget URLs;
- authenticated render orchestration;
- status, preview, and signed artifact delivery;
- truthful health and capability reporting.

The protected render service is responsible for:

- long-running FFmpeg work;
- durable job persistence;
- narration and media assembly;
- animation execution supported by the renderer;
- FFprobe verification;
- storage of completed MP4 artifacts.

## OpenMontage capability bridge

The renderer container pins and installs OpenMontage. AutoTube exposes its tool and skill catalog through these MCP bridge tools:

- `openmontage_list_tools` — filter and page through registered tools, including availability and linked skill names.
- `openmontage_get_tool` — read one tool's input/output schemas, dependencies, status, cost estimate behavior, and side effects.
- `openmontage_execute_tool` — run a named tool only when its dependencies are available. Paid tools require an approved cost; unpriced API tools are blocked. Declared external side effects require an explicit confirmation flag.
- `openmontage_list_skills` and `openmontage_read_skill` — find and read text-based skill, pipeline, and reference files under OpenMontage's skill directories.

The MCP bridge uses a small set of generic entry points instead of advertising hundreds of tool schemas in every `tools/list` response. The catalog returns each tool's real schema; the model should inspect the tool and read its referenced skill before execution. Skill files are returned as project content and must not override system or user instructions. OpenMontage is AGPL-3.0; preserve its license and source notices and satisfy the license's source-availability requirements when distributing the integrated renderer.

The external renderer must never be exposed directly to ChatGPT or browser clients. Requests go through the `illcoai.tech` MCP/server routes.

## @Sites deployment rule

When publishing with `@Sites`:

1. Update the existing Site connected to the custom domain `illcoai.tech`.
2. Do not create a second standalone Site for AutoTube.
3. Do not replace the public domain with a `chatgpt.site`, `vercel.app`, or other provider URL.
4. Preserve or implement the server routes listed above.
5. Preserve OAuth, allowlists, SSRF controls, signed delivery, and renderer-service authentication.
6. Store server secrets only in the Site/server runtime.
7. Publish only after source verification passes.
8. After publishing, manually run the GitHub workflow `Verify ILLCO Command for Sites` with `verify_live=true`.
9. Treat the Issue #20 verification receipt as the production proof.

## Same-domain routing requirement

If the Sites runtime supports the required server routes, host the MCP handlers directly in the Site runtime.

If the Sites runtime cannot execute the MCP or long-running server integration, keep the visible Site on `illcoai.tech` and configure an edge/server routing layer so these paths remain on the same public hostname:

- `/api/chatgpt/autotube/mcp`
- `/api/chatgpt/autotube/widget`
- `/api/autotube/*`
- the AutoTube OAuth metadata routes

The routing layer may forward those paths to a protected application origin, but the public URLs returned to ChatGPT and users must remain under `https://illcoai.tech`.

DNS alone cannot perform path-based routing. When the Site and MCP execute on different origins, use a supported same-domain edge proxy or server routing facility.

## Required server configuration

The runtime must provide the equivalents of:

```text
AUTOTUBE_RENDER_SERVICE_URL
AUTOTUBE_RENDER_SERVICE_TOKEN
AUTOTUBE_DOWNLOAD_SIGNING_SECRET or AUTOTUBE_ARTIFACT_SIGNING_SECRET
AUTOTUBE_ALLOWED_EMAILS
AUTOTUBE_ADMIN_EMAILS
narration-provider credentials when narration is enabled
```

Never place these values in client JavaScript, public Site content, MCP structured output, logs, or repository files.

## Production acceptance test

The deployment passes only when all of the following are true:

- `https://illcoai.tech` loads.
- The MCP GET response reports a version beginning with `5.3.0-autotube4`.
- The health object reports standard version `4.0.0`.
- `mcpUrl` equals `https://illcoai.tech/api/chatgpt/autotube/mcp`.
- `widgetUrl` equals `https://illcoai.tech/api/chatgpt/autotube/widget`.
- MCP `initialize` succeeds.
- MCP `tools/list` includes `autotube_health_check` and `autotube_render_video`.
- MCP `tools/list` includes all five `openmontage_*` bridge tools.
- `openmontage_list_tools` returns a paged catalog, and `openmontage_list_skills` returns a non-empty file list.
- `openmontage_get_tool` returns a real schema for a known tool; unavailable tools are listed as unavailable and cannot execute.
- `openmontage_read_skill` reads only files beneath the OpenMontage skill roots.
- Paid/unpriced API execution and side-effecting execution follow the bridge's approval gates.
- The style engine and quality gate are active.
- The widget route returns a usable MCP App document.
- Unsupported animations return structured blockers.
- One real render reaches `ready` and produces a playable signed MP4.

A successful source build is not a successful deployment. A published Site without a working MCP is not a successful AutoTube deployment.
