'use strict';
// Deterministic feature-pack logic for AIResearchLiteratureAgent.
// This module never calls an AI provider, never loads dotenv, and never
// touches the database, so tests can import it offline with provider
// keys unset. AI-style endpoints built on it always return the labelled
// deterministic fallback (aiGenerated: false) computed from the caller's
// own saved papers, collections, and reviews.

const FALLBACK_LABEL = 'Deterministic fallback — not AI-generated';
const TASK_STATUSES = ['open', 'in_progress', 'done', 'blocked'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeTaskInput(body, { partial = false } = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = [];
  const task = {};
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'title')) {
    const title = cleanText(input.title);
    if (!title) errors.push('title is required');
    else task.title = title.slice(0, 300);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'description')) {
    task.description = cleanText(input.description);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'status')) {
    const status = cleanText(input.status).toLowerCase();
    task.status = TASK_STATUSES.includes(status) ? status : 'open';
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'priority')) {
    const priority = cleanText(input.priority).toLowerCase();
    task.priority = TASK_PRIORITIES.includes(priority) ? priority : 'medium';
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'due_date')) {
    task.due_date = cleanText(input.due_date) || null;
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'related_type')) {
    task.related_type = cleanText(input.related_type);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, 'related_id')) {
    const raw = input.related_id;
    task.related_id = raw === null || raw === undefined ? '' : String(raw);
  }
  return { task, errors };
}

// Merges a partial patch without dropping explicit false / 0 / '' values.
function applyTaskUpdate(existing, patch) {
  const base = existing && typeof existing === 'object' ? existing : {};
  const next = { ...base };
  const input = patch && typeof patch === 'object' ? patch : {};
  for (const key of ['title', 'description', 'status', 'priority', 'due_date', 'related_type', 'related_id']) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      next[key] = input[key];
    }
  }
  return next;
}

function filterRecords(records, { search = '', status = '', priority = '', searchFields = [] } = {}) {
  const rows = Array.isArray(records) ? records : [];
  const q = cleanText(search).toLowerCase();
  const wantedStatus = cleanText(status).toLowerCase();
  const wantedPriority = cleanText(priority).toLowerCase();
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    if (wantedStatus && String(row.status ?? '').toLowerCase() !== wantedStatus) return false;
    if (wantedPriority && String(row.priority ?? '').toLowerCase() !== wantedPriority) return false;
    if (!q) return true;
    const fields = searchFields.length ? searchFields : Object.keys(row);
    return fields.some((field) => String(row[field] ?? '').toLowerCase().includes(q));
  });
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

// Serializes rows without dropping false / 0 values; empties stay empty.
function toCsv(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return '';
  const columns = Array.from(new Set(list.flatMap((row) => Object.keys(row && typeof row === 'object' ? row : {}))));
  if (!columns.length) return '';
  return [columns.map(csvEscape).join(','), ...list.map((row) => columns.map((c) => csvEscape(row ? row[c] : '')).join(','))].join('\n');
}

function serializeExport(rows, format) {
  const fmt = cleanText(format).toLowerCase();
  if (fmt === 'csv') return { contentType: 'text/csv; charset=utf-8', body: toCsv(rows) };
  if (fmt === 'json') return { contentType: 'application/json; charset=utf-8', body: JSON.stringify(rows ?? [], null, 2) };
  return null;
}

function section(label, value) {
  return { label: String(label), value: value === undefined ? null : value };
}

function fallbackEnvelope(feature, summary, sections, extra = {}) {
  return {
    aiGenerated: false,
    label: FALLBACK_LABEL,
    feature,
    summary,
    sections,
    ...extra,
  };
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// --- Domain deterministic fallbacks over the caller's own records ---

function readingQueueSummary({ papers = [] } = {}) {
  const rows = Array.isArray(papers) ? papers : [];
  const unread = rows.filter((r) => String(r.status ?? 'unread').toLowerCase() === 'unread').length;
  const scores = rows.map((r) => numberOrZero(r.relevance_score));
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const summary = rows.length
    ? `${rows.length} saved paper(s); ${unread} unread with an average relevance score of ${Math.round(average * 10) / 10}.`
    : 'No saved papers available; all counts are zero.';
  return fallbackEnvelope('reading-queue-summary', summary, [
    section('Papers reviewed', rows.length),
    section('Unread papers', unread),
    section('Average relevance score', Math.round(average * 10) / 10),
    section('Papers with zero relevance score', scores.filter((s) => s === 0).length),
    section('Has unread papers', unread > 0),
    section('Papers without an abstract', rows.filter((r) => cleanText(r.abstract) === '').length),
  ]);
}

function citationGapSummary({ papers = [] } = {}) {
  const rows = Array.isArray(papers) ? papers : [];
  const zeroCitations = rows.filter((r) => numberOrZero(r.citations) === 0).length;
  const missingDoi = rows.filter((r) => cleanText(r.doi) === '').length;
  const totalCitations = rows.reduce((sum, r) => sum + numberOrZero(r.citations), 0);
  const summary = rows.length
    ? `${rows.length} paper(s) hold ${totalCitations} citation(s) in total; ${zeroCitations} have zero citations and ${missingDoi} have no DOI recorded.`
    : 'No saved papers available; citation counts are zero.';
  return fallbackEnvelope('citation-gap-summary', summary, [
    section('Papers reviewed', rows.length),
    section('Total citations recorded', totalCitations),
    section('Papers with zero citations', zeroCitations),
    section('Papers without a DOI', missingDoi),
    section('Every paper has a DOI', missingDoi === 0 && rows.length > 0),
    section('Papers without a year', rows.filter((r) => r.year === null || r.year === undefined || cleanText(r.year) === '').length),
  ]);
}

function reviewProgressSummary({ reviews = [], papers = [] } = {}) {
  const reviewRows = Array.isArray(reviews) ? reviews : [];
  const paperRows = Array.isArray(papers) ? papers : [];
  const drafts = reviewRows.filter((r) => String(r.status ?? '').toLowerCase() === 'draft').length;
  const included = reviewRows.reduce((sum, r) => sum + numberOrZero(r.papers_included), 0);
  const summary = reviewRows.length
    ? `${reviewRows.length} review(s) covering ${included} included paper(s); ${drafts} still in draft.`
    : 'No reviews available; progress counts are zero.';
  return fallbackEnvelope('review-progress-summary', summary, [
    section('Reviews reviewed', reviewRows.length),
    section('Draft reviews', drafts),
    section('Papers included across reviews', included),
    section('Saved papers available', paperRows.length),
    section('Has draft review', drafts > 0),
    section('Reviews without a topic', reviewRows.filter((r) => cleanText(r.topic) === '').length),
  ]);
}

const TASKS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  related_type TEXT NOT NULL DEFAULT '',
  related_id TEXT NOT NULL DEFAULT '',
  user_id INTEGER,
  tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

module.exports = {
  FALLBACK_LABEL,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASKS_TABLE_SQL,
  normalizeTaskInput,
  applyTaskUpdate,
  filterRecords,
  toCsv,
  serializeExport,
  readingQueueSummary,
  citationGapSummary,
  reviewProgressSummary,
};
