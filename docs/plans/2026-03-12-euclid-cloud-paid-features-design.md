# Euclid Cloud — Paid Features Design

**Date:** 2026-03-12
**Purpose:** Define the paid feature set for Euclid Cloud and the marketing framing for a waitlist landing page that validates demand.

---

## Context

Euclid is an open-source MCP server that gives AI agents deterministic mathematical computation. The core tool is and will remain free and open source (MIT licence). Euclid Cloud is the paid hosted platform that adds observability, infrastructure, and premium capabilities on top of the open-source engine.

This document defines the paid features and how they should be presented on a waitlist landing page. The waitlist is a demand validation exercise — aspirational, wide-net, designed to discover who wants this and why.

---

## Core Positioning

**Headline concept:** "Do you know what your AI agent is calculating?"

The paid platform story rests on one insight: if you're using AI agents that deal with numbers — pricing, quoting, financial models, engineering calculations, trading signals, data analysis — those agents are either guessing or computing. Euclid makes them compute. Euclid Cloud lets you see what they computed.

**The split in plain language:**
- **Euclid (free, open source):** The calculator your AI agent uses instead of guessing. Install it, your agent gets deterministic math.
- **Euclid Cloud (paid, usage-based):** The platform that hosts that calculator for you AND gives you a window into every calculation your agents perform — what they asked, what they got, whether they even used the calculator at all.

**Pricing philosophy:**
- Usage-based, linear — pay for what you use
- Mirrors the token-usage pricing model developers already understand from LLM APIs
- No tiers, no per-seat fees, no cliff edges
- Scales up and down with actual usage
- On the waitlist page: soft signal only ("Simple, usage-based pricing. Details at launch.")

---

## Target Audience

Deliberately broad — this is a demand validation exercise. The waitlist should appeal to:
- Solo developers building agents that need reliable computation (trading bots, automation tools)
- Teams building AI-powered quoting, pricing, or estimation systems
- Financial modelling and accounting workflows using AI agents
- Engineering and scientific computation via AI agents
- Data analysis and reporting agents
- Anyone running, building, or scoping an agent that needs deterministic numerical output and wants to observe what that agent is doing

Both technical and non-technical audiences. The rise of accessible LLM tools (Claude Code, ChatGPT, etc.) means non-developers are building agent-driven workflows. The page must communicate value in plain language.

---

## Paid Feature Set

### Category 1: Observability & Debugging
*The primary hook — "see what your agents are actually doing with numbers"*

- **Calculation Dashboard** — Real-time view of every computation your agents perform. See the expressions they construct, the results they get, and whether they used the calculator or hallucinated a number.
- **Expression Inspection** — Drill into individual calculations. See the raw expression the agent sent, how it was parsed, what the result was, and the full request/response context.
- **Error & Misuse Alerts** — Get notified when agents construct malformed expressions, hit evaluation errors, or appear to be bypassing the calculator for computations they should be using it for.
- **Agent Behaviour Analytics** — Trends over time: calculation volume, error rates, which tools agents use most, which expressions fail most often. Understand how your agents' computational behaviour changes as you tune your prompts.

### Category 2: Compliance & Audit
*The enterprise depth — "prove how every number was produced"*

- **Immutable Audit Logs** — Every calculation request and response, stored immutably. When someone asks "how did the agent arrive at this number?", you have the answer.
- **Exportable Records** — Download calculation logs in standard formats for compliance reporting, internal review, or integration with existing audit systems.

### Category 3: Optimisation
*The power-user layer — "make your agents better at math"*

- **Tool Description Optimisation** — Continuously tested and improved system prompts that maximise how reliably different LLM providers select and use the calculator. Agents get smarter at knowing when to compute vs. guess, without manual tuning.
- **Expression Quality Scoring** — See how well agents are constructing mathematical expressions. Identify patterns where agents build overly complex, redundant, or incorrect expressions so prompts can be improved.

### Category 4: Hosted Infrastructure
*The convenience play — "don't self-host, just connect"*

- **Managed Endpoint** — A single URL agents connect to. No local server to run, no infrastructure to maintain. Global edge deployment for low-latency computation from anywhere.
- **API Key Management** — Multiple keys for different agents, projects, or team members. Per-key usage tracking to know exactly which agent or project is driving computation volume.

### Category 5: Premium Tool Packs
*The expansion — "more than a calculator"*

- **Domain-Specific Libraries** — Specialised calculation tools for financial modelling, engineering, scientific computation, and more. Built in partnership with domain experts and optimised for LLM tool selection.
- **Custom Tool Development** — Bespoke deterministic computation tools built for specific industries or use cases.

---

## Waitlist Page Structure

### 1. Hero
- Headline hook: "Do you know what your AI agent is calculating?"
- Subhead: one sentence explaining the problem
- Primary CTA: "Join the waitlist for Euclid Cloud"
- Secondary CTA: "Use the free open-source tool now"

### 2. The Problem
- Brief, accessible explanation of why LLMs guess at math instead of computing it
- No jargon, aimed at both technical and non-technical readers
- Framing: "Every AI model — ChatGPT, Claude, Gemini — predicts mathematical answers instead of calculating them. Usually they're close. Sometimes they're wrong. You can't tell the difference."

### 3. The Open Source Solution
- Quick intro to Euclid: free, open source, makes your agent compute instead of guess
- Establishes credibility and generosity before the paid pitch

### 4. Euclid Cloud Features
- Presented as 4-5 visual blocks, not a wall of text
- Each block has:
  - A short, benefit-led headline (e.g., "See every calculation your agents make" not "Calculation Dashboard")
  - 2-3 sentences of description in plain language
  - A simple visual/icon (not a screenshot — the product doesn't exist yet)

**Suggested benefit-led headlines:**
- "See every calculation your agents make" (Observability)
- "Prove how every number was produced" (Audit)
- "Make your agents smarter at math" (Optimisation)
- "Connect in seconds, no infrastructure to manage" (Hosted)
- "Specialised tools for your industry" (Premium Packs)

### 5. Use Cases
- 4-6 short examples casting the wide net:
  - Trading bots & financial agents
  - Quoting & pricing systems
  - Engineering & scientific computation
  - Data analysis & reporting agents
  - Accounting & financial modelling
  - Any agent that works with numbers

### 6. Pricing Signal
- "Simple, usage-based pricing. Pay for what you use, just like the LLM APIs you already work with. Details at launch."

### 7. Waitlist CTA
- Email capture
- Optional free-text field: "Tell us what you'd use Euclid Cloud for" (provides demand signal data about use cases)

### 8. Footer
- Links to open source repo, npm, docs

---

## Copy Principles

- Lead with benefit, not feature name
- No jargon — "your AI agent" not "your MCP client"
- Every feature described in terms of what it lets you do or know, not what it is
- Tone is confident but not hype-y: "This is a real problem, here's a real solution, we're building the next layer"
- Accessible to non-technical readers who are building with AI tools

---

## What This Document Is NOT

This document defines the marketing feature set and page framing. It does not cover:
- Technical architecture for Euclid Cloud
- Infrastructure decisions (hosting, database, auth)
- Actual pricing numbers
- Website implementation (framework, hosting, design system)

Those are downstream decisions that follow from demand validation.
