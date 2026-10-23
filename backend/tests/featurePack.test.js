'use strict';
// Offline tests for the feature pack. Provider keys are removed before the
// (provider-free) module is imported, and no network or database is used.
delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENAI_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  FALLBACK_LABEL,
  normalizeTaskInput,
  applyTaskUpdate,
  filterRecords,
  toCsv,
  serializeExport,
  readingQueueSummary,
  citationGapSummary,
  reviewProgressSummary,
} = require('../services/featurePack');

test('task create requires a title and applies defaults', () => {
  assert.deepEqual(normalizeTaskInput({}).errors, ['title is required']);
  const { task, errors } = normalizeTaskInput({ title: '  Read transformer survey  ' });
  assert.deepEqual(errors, []);
  assert.equal(task.title, 'Read transformer survey');
  assert.equal(task.status, 'open');
  assert.equal(task.priority, 'medium');
  assert.equal(task.description, '');
});

test('task update preserves explicit empty values', () => {
  const next = applyTaskUpdate(
    { title: 'Old', description: 'keep?', status: 'open', priority: 'high' },
    { description: '', status: 'done' }
  );
  assert.equal(next.title, 'Old');
  assert.equal(next.description, '');
  assert.equal(next.status, 'done');
});

test('search and status filters narrow the paper list', () => {
  const rows = [
    { title: 'Attention survey', status: 'unread', source: 'arxiv' },
    { title: 'Protein folding', status: 'read', source: 'pubmed' },
    { title: 'Attention in vision', status: 'unread', source: 'arxiv' },
  ];
  assert.equal(filterRecords(rows, { search: 'attention' }).length, 2);
  assert.equal(filterRecords(rows, { status: 'unread' }).length, 2);
  assert.equal(filterRecords(rows, {}).length, 3);
});

test('CSV and JSON export preserve false, 0 and empty values', () => {
  const rows = [{ title: 'Paper', citations: 0, reviewed: false, doi: '' }];
  const csv = toCsv(rows);
  assert.match(csv, /citations/);
  assert.match(csv, /,0,/);
  assert.match(csv, /false/);
  const json = JSON.parse(serializeExport(rows, 'json').body);
  assert.equal(json[0].citations, 0);
  assert.equal(json[0].reviewed, false);
  assert.equal(json[0].doi, '');
  assert.equal(serializeExport(rows, 'xml'), null);
});

test('domain fallbacks are labelled, deterministic and keep zero counts', () => {
  const input = {
    papers: [
      { status: 'unread', relevance_score: 0, abstract: '', citations: 0, doi: '', year: 2024 },
      { status: 'read', relevance_score: 8, abstract: 'text', citations: 12, doi: '10.1/x', year: 2023 },
    ],
  };
  const queue = readingQueueSummary(input);
  assert.equal(queue.aiGenerated, false);
  assert.equal(queue.label, FALLBACK_LABEL);
  assert.deepEqual(queue, readingQueueSummary(input));
  const q = Object.fromEntries(queue.sections.map((s) => [s.label, s.value]));
  assert.equal(q['Papers with zero relevance score'], 1);
  assert.equal(q['Has unread papers'], true);

  const gaps = citationGapSummary(input);
  const g = Object.fromEntries(gaps.sections.map((s) => [s.label, s.value]));
  assert.equal(g['Papers with zero citations'], 1);
  assert.equal(g['Every paper has a DOI'], false);

  const progress = reviewProgressSummary({ reviews: [], papers: input.papers });
  const p = Object.fromEntries(progress.sections.map((s) => [s.label, s.value]));
  assert.equal(p['Reviews reviewed'], 0);
  assert.equal(p['Has draft review'], false);
  assert.equal(p['Saved papers available'], 2);
});

test('server mounts the feature pack without provider calls', () => {
  const server = fs.readFileSync(__dirname + '/../server.js', 'utf8');
  assert.ok(server.includes("require('./routes/featurePack')"), 'feature pack must be mounted');
  const route = fs.readFileSync(__dirname + '/../routes/featurePack.js', 'utf8');
  assert.ok(!route.includes('openrouter.ai') && !route.includes('api.openai.com'), 'feature pack must not call a provider');
  const papers = fs.readFileSync(__dirname + '/../routes/papers.js', 'utf8');
  assert.ok(papers.includes('search'), 'papers list search must remain available');
});
