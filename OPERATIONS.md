# Governed research literature operations

## Intended use and limits

The governed API ingests permissioned, versioned literature and produces chunk-cited, uncertainty-aware answers with abstention. It does not guarantee scientific correctness, copyright permission, novelty, or completeness. Researchers independently inspect cited sources and conflicting evidence.

## Data and integrations

Signed tenant/role claims, collection access, retention, checksummed source provenance, resumable checkpoints, independent approval, and immutable audit events are mandatory. arXiv, PubMed, Crossref, storage, parser, and index adapters are allow-listed and fail closed through an idempotent outbox with leased claims, bounded retries, and dead letters.

## Deploy, rollback, and recovery

Run `./start.sh check`, back up PostgreSQL and source objects, then use `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`. No DDL runs during normal startup. Reconcile checksums, ingestion checkpoints, index state, and provider receipts before replay. Alert on permissions, source drift, conflict suppression, injection findings, evaluation regression, self-approval, and dead letters.
