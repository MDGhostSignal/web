# Figma MCP Access Runbook (GhostSignal)

This runbook defines how to verify that agents have full MCP access to the GhostSignal Figma design.

## Endpoint

- MCP URL: `http://127.0.0.1:3845/mcp`
- Figma file: `https://www.figma.com/design/6nDMQnD7o9MMMSGzNAzXRc/ghostsignal-design-system`
- Smoke-test node id: `3002:370`

## What "Full Access" Means

All items below must succeed:

1. Server handshake succeeds (`initialize`) and returns `Figma Dev Mode MCP Server`.
2. Tool discovery includes:
   - `get_design_context`
   - `get_variable_defs`
   - `get_screenshot`
   - `get_metadata`
3. Node metadata is retrievable (positions/sizes/hierarchy).
4. Variables are retrievable (color/font/spacing/sizing token values).
5. Screenshot is retrievable (image payload).
6. Design context is retrievable (reference code, node IDs, style context, asset URLs).

## Known Transport Requirement

The local Figma MCP endpoint requires:

- `Accept: application/json, text/event-stream`

Without this, requests may fail with HTTP `406 Not Acceptable`.

## Direct JSON-RPC Fallback Check (PowerShell)

Use this if a built-in MCP client call fails to handshake:

```powershell
$node='3002:370'
$initBody='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"codex-cli","version":"0.1"}}}'
$headers=@{Accept='application/json, text/event-stream'}
$init=Invoke-WebRequest -Uri 'http://127.0.0.1:3845/mcp' -Method POST -Headers $headers -ContentType 'application/json' -Body $initBody -UseBasicParsing
$sid=$init.Headers['mcp-session-id']

function Invoke-McpTool($id,$name,$args){
  $bodyObj=@{jsonrpc='2.0';id=$id;method='tools/call';params=@{name=$name;arguments=$args}}
  $body=($bodyObj|ConvertTo-Json -Depth 20 -Compress)
  $h=@{Accept='application/json, text/event-stream';'mcp-session-id'=$sid}
  Invoke-WebRequest -Uri 'http://127.0.0.1:3845/mcp' -Method POST -Headers $h -ContentType 'application/json' -Body $body -UseBasicParsing
}

# 1) tools/list
$listBody='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
$listRes=Invoke-WebRequest -Uri 'http://127.0.0.1:3845/mcp' -Method POST -Headers @{Accept='application/json, text/event-stream';'mcp-session-id'=$sid} -ContentType 'application/json' -Body $listBody -UseBasicParsing
$listRes.Content

# 2) get_metadata
Invoke-McpTool 10 'get_metadata' @{nodeId=$node;clientLanguages='typescript';clientFrameworks='react'} | Select-Object -ExpandProperty Content

# 3) get_variable_defs
Invoke-McpTool 11 'get_variable_defs' @{nodeId=$node;clientLanguages='typescript';clientFrameworks='react'} | Select-Object -ExpandProperty Content

# 4) get_screenshot
Invoke-McpTool 12 'get_screenshot' @{nodeId=$node;clientLanguages='typescript';clientFrameworks='react'} | Select-Object -ExpandProperty Content

# 5) get_design_context
Invoke-McpTool 13 'get_design_context' @{nodeId=$node;clientLanguages='typescript';clientFrameworks='react';taskType='CHANGE_ARTIFACT';artifactType='WEB_PAGE_OR_APP_SCREEN'} | Select-Object -ExpandProperty Content
```

## Runtime Note

- If a running agent process still uses stale MCP transport settings, update local config and restart the agent/runtime session before re-checking built-in MCP discovery tools.
