# Unified Plugin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge euclid-plugin skills into the euclid-mcp repo so users get deterministic math tools + skills in a single plugin install.

**Architecture:** Add `.claude-plugin/`, `skills/`, and `hooks/` directories to the existing euclid-mcp repo. A SessionStart hook auto-registers the MCP server. The npm package is renamed from `@euclid-tools/euclid-mcp` to `@euclid-tools/euclid`. All existing MCP server code (`src/`, `tests/`) is untouched.

**Tech Stack:** Claude Code plugin system (plugin.json, SKILL.md, hooks.json), bash/batch polyglot scripts, existing TypeScript MCP server.

**Spec:** `docs/superpowers/specs/2026-03-14-unified-plugin-design.md`

---

## Chunk 1: Plugin Manifest and Skills

### Task 1: Create plugin manifest

**Files:**

- Create: `.claude-plugin/plugin.json`

- [ ] **Step 1: Create the plugin manifest**

```json
{
  "name": "euclid",
  "displayName": "Euclid",
  "description": "Deterministic math tools for LLMs — MCP server + skills that teach Claude to use calculate, convert, and statistics tools instead of mental math",
  "version": "0.2.0",
  "author": {
    "name": "Angus"
  },
  "homepage": "https://github.com/euclidtools/euclid",
  "repository": "https://github.com/euclidtools/euclid",
  "license": "MIT",
  "keywords": ["math", "calculator", "mcp", "deterministic", "mathjs"],
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"
}
```

Write this to `.claude-plugin/plugin.json`.

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: add Claude Code plugin manifest"
```

---

### Task 2: Copy skill files from euclid-plugin

**Files:**

- Create: `skills/math/SKILL.md`
- Create: `skills/math/EXPRESSIONS.md`
- Create: `skills/math/UNITS.md`
- Create: `skills/math/STATISTICS.md`

Source: `../euclid-plugin/skills/math/`

- [ ] **Step 1: Copy the four skill files**

Copy these files exactly as they are from `../euclid-plugin/skills/math/` into `skills/math/`:

- `SKILL.md`
- `EXPRESSIONS.md`
- `UNITS.md`
- `STATISTICS.md`

No content changes needed — the skills reference MCP tool names (`calculate`, `convert`, `statistics`) which remain the same.

- [ ] **Step 2: Verify files exist and match source**

Run: `diff -r ../euclid-plugin/skills/math/ skills/math/`
Expected: No output (files are identical)

- [ ] **Step 3: Commit**

```bash
git add skills/
git commit -m "feat: add math skill files from euclid-plugin"
```

---

### Task 3: Add .gitattributes for line endings

**Files:**

- Create: `.gitattributes`

Hook scripts must have Unix line endings (LF) or bash will fail with `\r` errors. This is critical since the repo is developed on Windows.

- [ ] **Step 1: Create .gitattributes**

```
# Ensure hook shell scripts always use LF line endings
hooks/session-start text eol=lf
hooks/run-hook.cmd  text eol=lf
```

Write to `.gitattributes`.

- [ ] **Step 2: Commit**

```bash
git add .gitattributes
git commit -m "chore: add .gitattributes to enforce LF for hook scripts"
```

---

## Chunk 2: SessionStart Hook

### Task 4: Create hooks.json

**Files:**

- Create: `hooks/hooks.json`

- [ ] **Step 1: Create the hook definition**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "async": false
          }
        ]
      }
    ]
  }
}
```

Write to `hooks/hooks.json`.

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add hooks/hooks.json
git commit -m "feat: add SessionStart hook definition"
```

---

### Task 5: Create cross-platform polyglot launcher

**Files:**

- Create: `hooks/run-hook.cmd`

This is a batch+bash polyglot. On Windows, cmd.exe runs the batch section which finds bash. On Unix, bash runs directly.

- [ ] **Step 1: Create run-hook.cmd**

```cmd
: << 'CMDBLOCK'
@echo off
REM Cross-platform polyglot wrapper for hook scripts.
REM On Windows: cmd.exe runs the batch portion, which finds and calls bash.
REM On Unix: the shell interprets this as a script (: is a no-op in bash).

if "%~1"=="" (
    echo run-hook.cmd: missing script name >&2
    exit /b 1
)

set "HOOK_DIR=%~dp0"

REM Try Git for Windows bash in standard locations
if exist "C:\Program Files\Git\bin\bash.exe" (
    "C:\Program Files\Git\bin\bash.exe" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)
if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    "C:\Program Files (x86)\Git\bin\bash.exe" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)

REM Try bash on PATH (e.g. user-installed Git Bash, MSYS2, Cygwin)
where bash >nul 2>nul
if %ERRORLEVEL% equ 0 (
    bash "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)

REM No bash found - exit silently rather than error
REM (plugin still works, just without SessionStart context injection)
exit /b 0
CMDBLOCK

# Unix: run the named script directly
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_NAME="$1"
shift
exec bash "${SCRIPT_DIR}/${SCRIPT_NAME}" "$@"
```

Write to `hooks/run-hook.cmd`.

- [ ] **Step 2: Commit**

```bash
git add hooks/run-hook.cmd
git commit -m "feat: add cross-platform polyglot hook launcher"
```

---

### Task 6: Create session-start hook script

**Files:**

- Create: `hooks/session-start`

This is the bash script that auto-registers the MCP server and injects context.

- [ ] **Step 1: Create session-start**

```bash
#!/usr/bin/env bash
# SessionStart hook for Euclid plugin
# 1. Auto-registers MCP server if not already present
# 2. Injects context reminder that Euclid tools are available

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Check if euclid MCP server is already registered
if ! claude mcp list 2>/dev/null | grep -q "euclid"; then
  claude mcp add euclid -- npx -y @euclid-tools/euclid 2>/dev/null || true
fi

# JSON-escape helper
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

context="Euclid deterministic math tools are available via MCP. For ANY numerical computation, unit conversion, or statistical calculation, use the Euclid MCP tools (calculate, convert, statistics) instead of mental math. Never predict or estimate when a deterministic tool is available."
context_escaped=$(escape_for_json "$context")

# Output context injection
# Claude Code sets CLAUDE_PLUGIN_ROOT; other platforms do not
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "${context_escaped}"
  }
}
EOF
else
  cat <<EOF
{
  "additional_context": "${context_escaped}"
}
EOF
fi

exit 0
```

Write to `hooks/session-start`.

- [ ] **Step 2: Mark executable in git**

Run: `git update-index --chmod=+x hooks/session-start`

- [ ] **Step 3: Test the script runs without error (Unix/Git Bash)**

Run: `bash hooks/session-start`
Expected: JSON output containing `hookSpecificOutput` or `additional_context` with the Euclid context string. No errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/session-start
git commit -m "feat: add session-start hook for MCP auto-registration"
```

---

## Chunk 3: Package Updates

### Task 7: Update package.json

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Update name, version, and repository**

Change:

- `"name": "@euclid-tools/euclid-mcp"` → `"name": "@euclid-tools/euclid"`
- `"version": "0.1.3"` → `"version": "0.2.0"`
- `"description"`: update to `"Deterministic math tools for LLMs — an MCP server and Claude Code plugin powered by mathjs"`

Add a `"repository"` field:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/euclidtools/euclid.git"
}
```

Keep the existing `"bin"` field with both `euclid-mcp` and `euclid` aliases. Keep `"files": ["dist"]` unchanged.

- [ ] **Step 2: Verify package.json is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Run existing tests to confirm no regression**

Run: `pnpm test`
Expected: All tests pass. The package rename does not affect runtime behavior.

- [ ] **Step 4: Run build to confirm it still works**

Run: `pnpm build`
Expected: Build succeeds, `dist/index.js` is generated.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat: rename package to @euclid-tools/euclid, bump to 0.2.0"
```

---

### Task 8: Update .mcp.json

**Files:**

- Modify: `.mcp.json`

- [ ] **Step 1: Update package name reference**

Change `@euclid-tools/euclid-mcp` → `@euclid-tools/euclid` in the args array.

```json
{
  "mcpServers": {
    "euclid": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@euclid-tools/euclid"]
    }
  }
}
```

Note: This is a developer-local file. The `cmd /c` wrapper is Windows-specific.

- [ ] **Step 2: Commit**

```bash
git add .mcp.json
git commit -m "chore: update .mcp.json to new package name"
```

---

## Chunk 4: CI Pipeline Update

### Task 9: Add plugin file validation to CI

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add JSON validation step**

Add a "Validate plugin files" step after `actions/setup-node` and before `pnpm install`. The final YAML should look like:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node-version }}
    cache: pnpm
- name: Validate plugin files
  run: |
    node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'))"
    node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'))"
- run: pnpm install --frozen-lockfile
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add JSON validation for plugin manifest and hooks"
```

---

## Chunk 5: README and CLAUDE.md

### Task 10: Rewrite README.md

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Rewrite with unified install + Euclid branding**

Start from the existing `README.md` and make these specific changes:

**A) Replace the opening section** (lines 1-11 of current README) with branding that connects to Euclid the mathematician. Lean into "what is self-evident should not be guessed" energy — Euclid built geometry on axioms and proofs, this tool gives LLMs deterministic math instead of probabilistic guessing. Keep the quote. Keep the existing tagline "Deterministic math tools for LLMs." as a subtitle.

**B) Replace the "Quick Start" section** (lines 14-144) with a new "Installation" section. The first and primary method should be the Claude Code plugin:

````markdown
### Claude Code (Recommended)

```bash
claude plugin install euclidtools/euclid
```
````

One command. This installs the skill (teaches Claude when to use Euclid) and auto-registers the MCP server.

````

Then include these additional pathways in order:
- Manual MCP: `claude mcp add euclid -- npx -y @euclid-tools/euclid`
- Claude Desktop JSON config (keep existing collapsible macOS/Windows sections, update package name)
- Cursor JSON config (keep existing collapsible sections, update package name)
- Windsurf JSON config (keep existing collapsible sections, update package name)
- Other MCP clients (update package name)
- npx one-off: `npx -y @euclid-tools/euclid`
- npm global: `npm install -g @euclid-tools/euclid`
- Local dev: clone repo, `pnpm install`, `pnpm dev`

**C) Keep these sections verbatim** (except updating `@euclid-tools/euclid-mcp` → `@euclid-tools/euclid`):
- "The Problem" section
- "Tools" section (calculate, convert, statistics)
- "Why Not Just Use Code Execution?" table
- "How It Works" diagram
- "Security" section
- "Contributing" section
- "Philosophy" section
- "License" section
- Footer closing about Euclid of Alexandria

**D) Update the "Roadmap" section** — add `- [x] Claude Code plugin — skills + auto-registration` as a completed item.

**E) Find-and-replace** all remaining `@euclid-tools/euclid-mcp` → `@euclid-tools/euclid` throughout.

- [ ] **Step 2: Verify all package name references are updated**

Run: `grep -r "euclid-mcp" README.md`
Expected: No output (all references updated to the new name)

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with unified plugin install and Euclid branding"
````

---

### Task 11: Update CLAUDE.md

**Files:**

- Modify: `../../CLAUDE.md` (the root-level CLAUDE.md at `C:\Code\euclid\CLAUDE.md`)

The root CLAUDE.md currently says this is a monorepo with `euclid-mcp/` as the main project and all commands run from `euclid-mcp/`. After the merge, `euclid-mcp/` IS the project — but it will eventually be renamed to `euclid/`. For now, update the CLAUDE.md to reflect:

- [ ] **Step 1: Update CLAUDE.md**

Make these specific changes to `../../CLAUDE.md`:

**A) Replace the "Repository Structure" section** (lines 7-12). Replace:

```
This is a monorepo with two projects:

- **`euclid-mcp/`** — The main project. An MCP server that provides deterministic math tools for LLMs, powered by mathjs. Published as `euclid-mcp` on npm.
- **`euclid-web/`** — Web project (currently empty/initialized).

Each project is its own git repo. All development commands below should be run from within `euclid-mcp/`.
```

With:

```
This is a monorepo. The main project is **`euclid-mcp/`** — a unified Claude Code plugin that provides:

- **MCP server** — Deterministic math tools for LLMs, powered by mathjs. Published as `@euclid-tools/euclid` on npm.
- **Skills** — Markdown files that teach Claude when and how to use the math tools instead of mental math.
- **Hooks** — SessionStart hook that auto-registers the MCP server on plugin install.

Also in this repo: **`euclid-web/`** — Web landing page (separate git repo).

All development commands below should be run from within `euclid-mcp/`.
```

**B) Update the "Commands" section** (line 16). Change `Published as `euclid-mcp` on npm` references if any appear. Keep all commands as-is since they still run from `euclid-mcp/`.

**C) Add a "Plugin system" subsection** after the "Security model" subsection (after line 53). Insert:

```
### Plugin system

- **`.claude-plugin/plugin.json`** — Plugin manifest. Declares skills and hooks for Claude Code auto-discovery.
- **`skills/math/SKILL.md`** — Main skill definition. Teaches Claude to use `calculate`, `convert`, `statistics` tools instead of predicting math. References `EXPRESSIONS.md`, `UNITS.md`, `STATISTICS.md` for detailed tool documentation.
- **`hooks/session-start`** — Bash script that auto-registers the MCP server via `claude mcp add` if not already present, and injects context reminding Claude that Euclid tools are available.
- **`hooks/run-hook.cmd`** — Cross-platform polyglot launcher (batch + bash) that finds bash on Windows (Git Bash, MSYS2) or runs directly on Unix.
```

- [ ] **Step 2: Commit**

```bash
git add ../../CLAUDE.md
git commit -m "docs: update CLAUDE.md for unified plugin structure"
```

---

## Chunk 6: Final Validation

### Task 12: End-to-end validation

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All existing tests pass.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors (lint only covers `src/`, new files are markdown/bash).

- [ ] **Step 3: Run format check**

Run: `pnpm format:check`
Expected: Pass. If markdown files cause format issues, run `pnpm format` first then commit.

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: `dist/index.js` generated successfully.

- [ ] **Step 5: Verify directory structure matches spec**

Confirm these files exist:

- `.claude-plugin/plugin.json`
- `skills/math/SKILL.md`
- `skills/math/EXPRESSIONS.md`
- `skills/math/UNITS.md`
- `skills/math/STATISTICS.md`
- `hooks/hooks.json`
- `hooks/run-hook.cmd`
- `hooks/session-start`

Run: `ls -la .claude-plugin/ skills/math/ hooks/`
Expected: All files present.

- [ ] **Step 6: Verify hook script outputs valid JSON**

Run: `bash hooks/session-start 2>/dev/null > /tmp/euclid-hook-output.json && node -e "JSON.parse(require('fs').readFileSync('/tmp/euclid-hook-output.json','utf8')); console.log('valid hook output')"`
Expected: `valid hook output`

- [ ] **Step 7: Verify no old package name references remain in source**

Run: `grep -r "euclid-mcp" --include="*.json" --include="*.ts" --include="*.md" . | grep -v node_modules | grep -v docs/plans | grep -v docs/superpowers | grep -v .git`
Expected: No output (or only intentional references in docs/plans for historical context).

---

## Out of Scope

The following spec phases are manual steps performed after this plan's implementation is validated:

- **Phase 3: Publish and rename** — Rename GitHub repo to `euclidtools/euclid`, publish `@euclid-tools/euclid` to npm, deprecate old `@euclid-tools/euclid-mcp` package. These are manual operations done by the repo owner.
- **Phase 4: Cleanup** — Delete the `euclid-plugin` repo once the unified plugin is validated in production.
