# Unified Plugin Design — Merge Skills into MCP Repo

**Date:** 2026-03-14
**Status:** Draft
**Goal:** Combine the euclid-mcp server and euclid-plugin skills into a single repository and plugin, so users get deterministic math tools + the skills that teach Claude to use them in one install step.

## Context

Euclid currently has two separate repos:

- `euclidtools/euclid-mcp` — MCP server (TypeScript, npm package) providing `calculate`, `convert`, `statistics` tools
- `euclidtools/euclid-plugin` — Claude Code plugin (markdown skills) that teaches Claude when/how to use those tools

This split means two install steps, version drift risk, and a confusing onboarding experience. Competing plugins (superpowers, marketingskills) demonstrate that the Claude Code plugin system supports skills, hooks, agents, and commands via a single `.claude-plugin/plugin.json` manifest — and that skills are simply directories with a `SKILL.md` file at the repo root.

Euclid's unique value is that the skills and MCP server are interdependent: skills are useless without the MCP tools, and MCP tools are underutilized without skills teaching the agent when to use them. They belong in the same repo.

## Decisions

| Decision              | Choice                   | Rationale                                                                                          |
| --------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| Repo structure        | Flat (Approach 1)        | Proven pattern from superpowers/marketingskills. Skills at repo root alongside src/.               |
| MCP auto-registration | SessionStart hook        | Idempotent hook checks if MCP is registered, adds it if not. One install step for users.           |
| Package rename        | `@euclid-tools/euclid`   | Cleaner name since repo is no longer MCP-only. `@euclid-tools/euclid` confirmed available.         |
| Repo rename           | `euclidtools/euclid`     | Matches package name.                                                                              |
| Cross-platform hooks  | Polyglot `run-hook.cmd`  | Batch + bash in one file, same pattern as superpowers. Handles Windows (Git Bash, MSYS2) and Unix. |
| Other platforms       | Claude Code only for now | Cursor, Gemini, Codex support will be separate projects later.                                     |
| euclid-plugin repo    | Delete after validation  | Once unified plugin is working, the old repo is removed.                                           |

## Target Directory Structure

```
euclid/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest — declares skills + hooks
├── skills/
│   └── math/
│       ├── SKILL.md             # Main skill definition
│       ├── EXPRESSIONS.md       # Expression syntax reference
│       ├── UNITS.md             # Unit conversion reference
│       └── STATISTICS.md        # Statistics operations reference
├── hooks/
│   ├── hooks.json               # SessionStart hook definition
│   ├── run-hook.cmd             # Cross-platform polyglot launcher
│   └── session-start            # Registers MCP server + injects context
├── src/                         # MCP server source (unchanged)
│   ├── index.ts
│   ├── engine.ts
│   ├── normalization.ts
│   ├── error-hints.ts
│   └── tools/
│       ├── calculate.ts
│       ├── convert.ts
│       └── statistics.ts
├── tests/                       # MCP server tests (unchanged)
├── dist/                        # Built output (unchanged)
├── docs/                        # Design docs (unchanged)
├── .github/workflows/ci.yml     # CI pipeline (unchanged)
├── package.json                 # Renamed to @euclid-tools/euclid
├── tsconfig.json
├── tsup.config.ts
├── eslint.config.js
├── .prettierrc
└── README.md                    # Updated with unified install + Euclid branding
```

## Plugin Manifest

**`.claude-plugin/plugin.json`:**

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

- `skills` → Claude Code auto-discovers `math/SKILL.md` inside `./skills/`
- `hooks` → registers the SessionStart hook for MCP auto-registration
- Version bumped to `0.2.0` (structural change, not a patch)

## SessionStart Hook

### `hooks/hooks.json`

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

Fires on all four session events. MCP registration (steps 1-2 in the script) is idempotent and skips if already registered. Context injection (step 3) must fire on `clear` and `compact` too, since those events wipe the conversation context including any previously injected `additionalContext`.

### `hooks/run-hook.cmd`

Cross-platform polyglot script following the superpowers pattern:

- On Windows: locates bash via Git Bash (`C:\Program Files\Git\bin\bash.exe`) or MSYS2, then delegates
- On Unix/macOS: runs bash directly
- Invokes `hooks/session-start` with the appropriate shell

### `hooks/session-start`

Bash script that:

1. Checks if `euclid` MCP server is already registered (via `claude mcp list`)
2. If not registered, runs `claude mcp add euclid -- npx -y @euclid-tools/euclid`
3. Outputs JSON with context reminder that Euclid tools are available

**Output format** (must match Claude Code's expected structure):

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Euclid deterministic math tools are available. Use calculate, convert, and statistics MCP tools for any numerical computation instead of mental math."
  }
}
```

The script must be marked executable: `git update-index --chmod=+x hooks/session-start`.

The hook is **idempotent**: safe to run on every session event. If the MCP server is already configured, it skips registration and only injects the context reminder.

## Package Changes

### `package.json` updates

- `name`: `@euclid-tools/euclid-mcp` → `@euclid-tools/euclid`
- `version`: Bump to `0.2.0` (in sync with `plugin.json`)
- `bin`: Keep both `euclid` and `euclid-mcp` as aliases (backwards compatibility)
- `files`: Stays as `["dist"]` — skills and hooks are consumed by the plugin system, not distributed via npm
- `repository`: Update to `https://github.com/euclidtools/euclid`

### `.mcp.json` update

This is a developer-local file (not distributed to users). Update to new package name. The `cmd /c` wrapper is Windows-specific; developers on macOS/Linux should use `"command": "npx", "args": ["-y", "@euclid-tools/euclid"]` instead.

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

## Skills (moved from euclid-plugin)

Four files copied directly from `euclid-plugin/skills/math/` into `skills/math/`:

- `SKILL.md` — Main skill with frontmatter, rules, tool quick reference
- `EXPRESSIONS.md` — Expression syntax, functions, constants, Unicode, limits
- `UNITS.md` — Supported units by category, natural language aliases
- `STATISTICS.md` — Operations, data format, common errors

No content changes needed — the skills reference MCP tool names (`calculate`, `convert`, `statistics`) which remain the same.

## README

The README serves as both documentation and a branding exercise.

### Tone & Positioning

Lean into Euclid the mathematician. The connection is natural: Euclid built geometry on axioms and deterministic proofs; this tool gives LLMs deterministic math instead of probabilistic guessing. "What is self-evident should not be guessed" energy. Have fun with the language while keeping it useful.

### Installation Pathways

All pathways documented:

1. **Claude Code plugin (recommended):** `claude plugin install euclidtools/euclid` — one step, gets skills + auto-registers MCP
2. **Manual MCP add:** `claude mcp add euclid -- npx -y @euclid-tools/euclid` — MCP server only, no skills
3. **npx (one-off):** `npx -y @euclid-tools/euclid` — run the MCP server directly
4. **npm global install:** `npm install -g @euclid-tools/euclid` — permanent global install
5. **Local development:** Clone repo, `pnpm install`, `pnpm dev`

### Content

- What Euclid does (the problem it solves: LLMs guess math, Euclid makes it deterministic)
- Quick examples of each tool in action
- All installation pathways
- Link to skill reference files
- Contributing / license

## What Does NOT Change

- `src/` — All MCP server source code stays exactly as-is
- `tests/` — All test files stay exactly as-is
- `docs/plans/` — Existing design documents stay
- Build tooling — tsup, TypeScript, ESLint, Prettier configs unchanged
- MCP tool names — `calculate`, `convert`, `statistics` unchanged
- Security model — V8 sandbox, disabled functions, length/time limits unchanged

## CI Pipeline Updates

The existing CI pipeline (format, lint, test, build) stays unchanged for the MCP server. Add a validation step for plugin files:

- Validate `hooks/hooks.json` is valid JSON
- Validate `.claude-plugin/plugin.json` is valid JSON
- Optionally lint `hooks/session-start` with shellcheck (if available)

## Git History

Skills files are copied from `euclid-plugin` into this repo as new files. The git history of those files in the `euclid-plugin` repo will not be preserved. This is acceptable — the skills are short markdown documents with minimal revision history, and the `euclid-plugin` repo will be retained until validation is complete.

## Migration Steps (High Level)

### Phase 1: Add plugin content to euclid-mcp repo

1. Create `.claude-plugin/plugin.json`
2. Copy `skills/math/` from euclid-plugin (4 markdown files)
3. Create `hooks/` directory with hooks.json, run-hook.cmd, session-start (chmod +x)
4. Update `package.json` (rename to `@euclid-tools/euclid`, bump to 0.2.0, keep bin aliases)
5. Update `.mcp.json` (new package name)
6. Add plugin file validation to CI pipeline
7. Rewrite `README.md` with unified install instructions + Euclid branding
8. Update `CLAUDE.md` — the root of the repo is now the project root (not `euclid-mcp/`), all path references and command prefixes need updating, repo description changes from "MCP server" to "unified plugin"

### Phase 2: Validate

9. Test locally: plugin loads, hook fires, MCP registers, skills activate, all three tools work
10. Run existing test suite (`pnpm test`) to confirm no regressions

### Phase 3: Publish and rename

11. Rename GitHub repo to `euclidtools/euclid` (do this FIRST so npm links are valid)
12. Publish `@euclid-tools/euclid` to npm
13. Deprecate old package: `npm deprecate @euclid-tools/euclid-mcp "Renamed to @euclid-tools/euclid — see https://github.com/euclidtools/euclid"`

### Phase 4: Cleanup

14. Delete `euclid-plugin` repo once unified plugin is validated in production
