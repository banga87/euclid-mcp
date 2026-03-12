# Euclid

**Deterministic math tools for LLMs.**

Large language models don't calculate — they predict. When you ask an LLM "what's 247 × 389?", it doesn't reach for a calculator. It pattern-matches against its training data and _guesses_ what the answer probably looks like. Sometimes it's right. Sometimes it's not. You'd never know the difference.

Euclid fixes this. It's an open source [MCP server](https://modelcontextprotocol.io) that gives any LLM access to a real, deterministic math engine. One line in your config, and your model stops guessing and starts computing.

> _"The laws of nature are but the mathematical thoughts of God."_
> — Euclid (maybe)

---

## Quick Start

Add Euclid to your MCP client config. That's it.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

<details>
<summary>macOS / Linux</summary>

```json
{
  "mcpServers": {
    "euclid": {
      "command": "npx",
      "args": ["-y", "@euclid-tools/euclid-mcp"]
    }
  }
}
```

</details>

<details>
<summary>Windows</summary>

```json
{
  "mcpServers": {
    "euclid": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@euclid-tools/euclid-mcp"]
    }
  }
}
```

</details>

### Claude Code

```bash
# macOS / Linux
claude mcp add euclid "npx -y @euclid-tools/euclid-mcp"

# Windows — add via the /mcp menu or edit .claude.json directly (see note below)
```

> **Windows + Claude Code:** The `claude mcp add` command doesn't split `cmd /c` into separate args correctly. Instead, use the `/mcp` menu inside Claude Code, or manually add the entry to your `.claude.json` using the same JSON config shown in the Claude Desktop section above.

### Cursor

Add to `~/.cursor/mcp.json`:

<details>
<summary>macOS / Linux</summary>

```json
{
  "mcpServers": {
    "euclid": {
      "command": "npx",
      "args": ["-y", "@euclid-tools/euclid-mcp"]
    }
  }
}
```

</details>

<details>
<summary>Windows</summary>

```json
{
  "mcpServers": {
    "euclid": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@euclid-tools/euclid-mcp"]
    }
  }
}
```

</details>

### Windsurf

Add to `~/.windsurf/mcp.json`:

<details>
<summary>macOS / Linux</summary>

```json
{
  "mcpServers": {
    "euclid": {
      "command": "npx",
      "args": ["-y", "@euclid-tools/euclid-mcp"]
    }
  }
}
```

</details>

<details>
<summary>Windows</summary>

```json
{
  "mcpServers": {
    "euclid": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@euclid-tools/euclid-mcp"]
    }
  }
}
```

</details>

### Other MCP Clients

Any MCP client that supports stdio transport will work. Use `npx -y @euclid-tools/euclid-mcp` as the command (on Windows, run it through `cmd /c`).

Restart your client. Done. Your LLM now has a calculator.

> **Why `cmd /c` on Windows?** On Windows, `npx` is a batch script (`npx.cmd`). MCP clients spawn processes directly, which can't execute `.cmd` files without a shell wrapper. Using `cmd /c` solves this. This affects all npx-based MCP servers, not just Euclid.

---

## The Problem

LLMs are non-deterministic. Every token they produce is a _prediction_ of what should come next — including math. This means:

- `247 × 389` → the model _predicts_ `96,083` (sometimes it gets `96,183` or `95,983`)
- `sin(47.3°) × cos(12.1°)` → the model _predicts_ something close-ish
- `17^4 + 3^7` → the model _predicts_ a number that looks right
- `15% of $8,472.50` → the model _predicts_ a dollar amount

Sometimes the predictions are correct. Sometimes they're subtly wrong. The problem is you can never be sure which is which.

**Euclid makes this a non-issue.** When an LLM has Euclid available, it sends expressions to a real math engine and returns the computed result. Deterministic. Correct. Every time.

Think of it like what `grep` did for AI code search — a simple, proven tool that gives the model a capability it fundamentally lacks.

---

## Tools

Euclid exposes multiple purpose-built tools, so the model can pick the right one for the job.

### `calculate`

Evaluates mathematical expressions deterministically.

```
"What's (245 × 389) + (12^3 / 7)?"
→ calculate("(245 * 389) + (12^3 / 7)")
→ 95,551.85714285714
```

**Supports:** arithmetic, order of operations, exponents, roots, trigonometry, logarithms, factorials, constants (π, e, φ), complex numbers, and anything else [mathjs](https://mathjs.org) can parse.

```
calculate("sqrt(144)")           → 12
calculate("sin(45 deg)")         → 0.7071067811865476
calculate("10!")                  → 3628800
calculate("log(1000, 10)")       → 3
calculate("2^32")                → 4294967296
calculate("e^(i * pi) + 1")     → 0 (Euler's identity!)
```

### `convert`

Converts between units deterministically.

```
convert(100, "fahrenheit", "celsius")  → 37.778
convert(5, "km", "miles")             → 3.10686
convert(1, "lb", "kg")                → 0.45359
convert(1024, "bytes", "kB")          → 1.024
```

**Supports:** length, weight, volume, temperature, area, speed, time, data, and [100+ units](https://mathjs.org/docs/datatypes/units.html) via mathjs.

### `statistics`

Statistical calculations on datasets.

```
statistics("mean", [23, 45, 12, 67, 34])     → 36.2
statistics("std", [23, 45, 12, 67, 34])       → 21.159
statistics("percentile", [1, 2, 3, 4, 5], 90) → 4.6
```

---

## Why Not Just Use Code Execution?

Good question. Many LLM environments have code execution tools (Python sandboxes, etc.) that can do math. The difference:

|                     | Code Execution                     | Euclid                                     |
| ------------------- | ---------------------------------- | ------------------------------------------ |
| **Overhead**        | Spins up a sandbox/interpreter     | Near-zero — evaluates an expression string |
| **Latency**         | Hundreds of ms to seconds          | Single-digit ms                            |
| **Availability**    | Varies by client                   | Any MCP client                             |
| **Model behaviour** | Model writes _code_ that does math | Model writes a _math expression_           |
| **Failure modes**   | Syntax errors, runtime exceptions  | Clear error on invalid expression          |
| **Token cost**      | Code generation is verbose         | Expression strings are minimal             |

Euclid is to code execution what `grep` is to writing a Python script to search files. You _can_ solve it the heavy way, but why would you?

---

## How It Works

```
┌─────────────┐     MCP (stdio)     ┌─────────────┐     evaluate()     ┌─────────┐
│   LLM       │ ──────────────────► │   Euclid    │ ─────────────────► │  mathjs  │
│   Client    │ ◄────────────────── │   Server    │ ◄───────────────── │  engine  │
└─────────────┘     result          └─────────────┘     number         └─────────┘
```

1. The LLM encounters a calculation in conversation
2. Instead of predicting the answer, it calls Euclid's `calculate` tool with the expression
3. Euclid evaluates the expression using [mathjs](https://mathjs.org) — a battle-tested math library with 15,000+ GitHub stars
4. The deterministic result is returned to the model
5. The model presents the _computed_ answer to the user

The model doesn't need to be good at math. It just needs to know when to reach for the calculator.

---

## Security

Euclid runs entirely on your local machine via stdio. No network calls, no data sent anywhere.

Expression evaluation is sandboxed — `import`, `require`, `createUnit`, nested `evaluate`, and other potentially dangerous mathjs functions are disabled. Expressions are length-limited and time-bounded to prevent abuse.

---

## Tech Stack

- **TypeScript** — type-safe, well-documented
- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)** — official MCP TypeScript SDK
- **[mathjs](https://mathjs.org)** — the math engine (15k+ stars, 2.5M+ weekly npm downloads, 13 years of battle-testing)
- **[zod](https://github.com/colinhacks/zod)** — schema validation

---

## Roadmap

- [x] Core `calculate` tool — expression evaluation
- [x] `convert` tool — unit conversion
- [x] `statistics` tool — mean, median, std, percentile, etc.
- [ ] Financial calculations — compound interest, NPV, amortisation
- [ ] Date/time arithmetic — deterministic, not "about 3 months"
- [ ] LLM accuracy benchmarks — prove the difference with data
- [ ] Streamable HTTP transport — for remote/hosted deployments

---

## Contributing

Euclid is open source and contributions are welcome.

The most impactful contributions right now are:

- **Tool descriptions** — the prompt text that teaches models _when_ to use Euclid instead of guessing. This is harder than it sounds and has the biggest impact on real-world usefulness
- **Test cases** — especially edge cases where LLMs commonly hallucinate math (multi-step expressions, trig, large number arithmetic)
- **New calculation domains** — financial math, date arithmetic, or other areas where deterministic output matters
- **Benchmark data** — comparing raw LLM output vs Euclid-assisted output across different models

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Philosophy

LLMs are incredibly powerful, but they have a fundamental limitation: everything they produce is a prediction. For creative writing, reasoning, and conversation, that's a feature. For math, it's a bug.

The solution isn't to make models better at predicting math. It's to give them a calculator.

This is part of a broader principle: **wherever a model does something predictive that should be deterministic, give it a deterministic tool.** Math is the most obvious case, but the same logic applies to unit conversions, date arithmetic, regex evaluation, and more.

Euclid starts with math. Where it goes from there is up to the community.

---

## License

MIT

---

<p align="center">
  <i>Euclid of Alexandria formalised mathematical proof 2,300 years ago.<br>
  We're just giving his tools to the machines.</i>
</p>
