# Audit Note — AIResearchLiteratureAgent

## Original audit recommendations (batch_07.md §16)

**Missing AI endpoints:** `/paper-summarizer`, `/literature-review-generator`, `/gap-finder`, `/methodology-comparison`, `/citation-network-analysis`, `/paper-recommender`.

**Missing non-AI features:** PDF ingestion, annotation, collaborative notes, citation management, arXiv/PubMed integration, quality assessment.

**Custom suggestions:** automated lit review generation, methodology assessment (GRADE), citation network viz, keyword taxonomy, hypothesis-driven discovery, collaborative annotation.

Note: audit said "0 AI endpoints"; project actually wires 5 agents (synthesizer / gapFinder / reviewGenerator / citationTracker / search) plus a multi-agent `/pipeline` plus Crossref `/doi-lookup` — i.e. `/literature-review-generator` (`/generate-review`), `/gap-finder` (`/identify-gaps`), `/citation-network-analysis` (`/track-citations`) are already there.

## Implemented this pass (3 mechanical)
1. `POST /api/agents/paper-summarizer` — single-paper structured summary (key findings, methods, limitations, glossary).
2. `POST /api/agents/methodology-comparison` — methodology comparison across selected papers.
3. `POST /api/agents/paper-recommender` — recommend top-N related papers given seed/query against the corpus.

All three reuse existing `auth` + `aiRateLimiter`, persist to `research_logs`, and use a local `callAI` helper following the same OpenRouter conventions. Syntax-checked.

## Backlog (prioritized)
1. PDF ingestion / parsing (mechanical, NEEDS-LIB choice e.g. pdf-parse).
2. arXiv / PubMed / Semantic Scholar fetchers (mechanical, NEEDS-CREDS for higher rate-limits).
3. Annotation + collaborative notes data model (mechanical).
4. Citation graph visualization endpoint (mechanical follow-up over `track-citations`).
5. GRADE/methodology rigor scorer (NEEDS-PRODUCT-DECISION).

## Apply pass 3 (frontend)

LEFT-AS-IS. `frontend/src/pages/NewAgentsPage.js` already provides a tabbed UI for all three apply-pass-2 agents (`/agents/paper-summarizer`, `/agents/methodology-comparison`, `/agents/paper-recommender`). JWT is read from `localStorage.token` and sent as `Bearer`. Component is registered in `App.js`. Idempotent; no changes made.

## Apply pass 6 (close-out)

Items implemented:
1. `POST /api/ai/citation-graph` — canonical citation graph visualization endpoint. Body `{ paper_id?, papers?: [{id,title,citing_ids,cited_ids}] }`. Returns `{ nodes:[{id,title,centrality}], edges:[{from,to,type}], clusters:[...], key_papers, suggested_reading_order }`. Includes a deterministic degree-centrality baseline so the response is still useful when `OPENROUTER_API_KEY` is missing or the LLM fails to return parsable JSON. Reuses `auth` + Postgres pool + `citationTracker` (Crossref) + `research_logs` persistence in line with house style. Mounted in `server.js` before the `/api` 404 fallback.

Note: a prior pass already added `POST /api/agents/citation-graph` (different schema, seed-paper centric). The canonical `/api/ai/citation-graph` is now added alongside it per the requested body/return contract; both coexist (append-only — pre-existing endpoint not modified).

Files touched (append-only):
- `backend/routes/ai-citation-graph.js` (new)
- `backend/server.js` (added one mount line before the 404 handler)
- `_AUDIT_NOTE.md` (this section)

Syntax check: `node --check` PASS on `backend/routes/ai-citation-graph.js` and `backend/server.js`.

Bonus item 2 (annotation + collaborative notes): SKIPPED — project uses raw Postgres (`backend/models/db.js` + `schema.sql`), not Prisma. No Prisma schema exists, so this item is NEEDS-SCHEMA per the task instructions.

Remaining backlog:
- NEEDS-CREDS: arXiv / PubMed / Semantic Scholar fetcher rate-limited keys (gap routes exist as scaffolds; need API keys + production wiring).
- NEEDS-PRODUCT-DECISION: GRADE / methodology rigor scorer (scaffold present; scoring rubric + thresholds undefined).
- NEEDS-SCHEMA: annotation / collaborative notes data model (would require Prisma adoption or new raw-SQL tables — out of scope for an append-only mechanical pass).
