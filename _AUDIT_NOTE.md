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
