'use strict';
function evaluate(input = {}) {
  const errors = [], sources = input.sources || [], chunks = input.chunks || [], citations = input.citations || [];
  if (!input.question || !input.collection?.id || !input.collection?.permissionVersion || !input.collection?.retentionDays) errors.push('scoped collection, question, permissions, and retention required');
  const ids = new Set();
  for (const s of sources) { if (!s.id || ids.has(String(s.id)) || !s.version || !/^[a-f0-9]{64}$/i.test(s.sha256 || '') || !s.capturedAt || !s.rightsBasis || !Array.isArray(s.allowedRoles)) errors.push('source provenance or permissions invalid'); ids.add(String(s.id)); }
  for (const c of chunks) if (!c.id || !ids.has(String(c.sourceId)) || !c.sourceVersion || !c.span || !c.embeddingVersion || c.deleted) errors.push('chunk/version/deletion state invalid');
  for (const c of citations) if (!ids.has(String(c.sourceId)) || !c.sourceVersion || !c.span || c.resolved !== true) errors.push('citation does not resolve to a versioned span');
  if (!input.answer?.text || !Array.isArray(input.answer.claims) || input.answer.claims.some(c => !c.citationId) || input.answer.hardwareExecuted === true) errors.push('answer must be cited and must not claim hardware execution');
  if (input.answer?.evidenceSufficient !== true && input.answer?.abstained !== true) errors.push('insufficient evidence requires abstention');
  const job = input.ingestionJob || {}; if (!job.id || !job.cursor || !['queued','parsing','indexing','completed'].includes(job.status) || !job.objectRef || !job.dedupeKey) errors.push('resumable ingestion/indexing job invalid');
  const v = input.validation || {}; for (const k of ['datasetVersion','retrievalRecall','faithfulness','citationResolution','freshness']) if (v[k] === undefined || v[k] === '') errors.push(`validation ${k} required`);
  if (v.conflictCasesPassed !== true || v.injectionCasesPassed !== true || v.deletedContentExcluded !== true) errors.push('conflict, injection, and deletion evaluations required');
  return { errors, result: { sourceCount: sources.length, citationCount: citations.length, disposition: errors.length ? 'revise' : 'grounded' }, assumptions: ['No quantum hardware or advantage claim is made without provider evidence'], uncertainty: { abstentionSupported: true, hardwareNotConnected: true } };
}
module.exports = { evaluate };
