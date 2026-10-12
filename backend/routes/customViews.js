const router = require('express').Router();
const pool = require('../models/db');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

router.use(require('../middleware/auth'));
router.use(require('../middleware/researchActor'));


const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user.id ? String(req.user.id) : ipKeyGenerator(req)),
});
router.use(limiter);

// 1) VIZ: publications-per-year
router.get('/publications-per-year', async (req, res) => {
  try {
    const r = await pool.query("SELECT year, COUNT(*)::int AS count, COALESCE(SUM(citations),0)::int AS total_citations FROM papers WHERE user_id=$1 AND year IS NOT NULL GROUP BY year ORDER BY year ASC", [req.user.id]);
    const data = r.rows;
    const totalPapers = data.reduce((s, d) => s + d.count, 0);
    const yearRange = data.length ? `${data[0].year}-${data[data.length-1].year}` : 'n/a';
    res.json({ ok: true, type: 'publications-per-year', range: yearRange, totalPapers, data });
  } catch (_error) {
    res.status(500).json({ ok: false, error: 'Could not load publication trends' });
  }
});

// 2) VIZ: citation co-occurrence heatmap (topic x topic from tags)
router.get('/citation-cooccurrence', async (req, res) => {
  try {
    const r = await pool.query("SELECT tags, citations FROM papers WHERE user_id=$1 AND tags IS NOT NULL AND tags <> ''", [req.user.id]);
    const topicSet = {};
    r.rows.forEach(row => {
      (row.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean).forEach(t => { topicSet[t] = (topicSet[t] || 0) + 1; });
    });
    const topTopics = Object.entries(topicSet).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);
    const matrix = topTopics.map(() => topTopics.map(() => 0));
    r.rows.forEach(row => {
      const tags = (row.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(t => topTopics.includes(t));
      const w = Math.max(1, Math.log10((row.citations || 1) + 10));
      for (let i = 0; i < tags.length; i++) {
        for (let j = 0; j < tags.length; j++) {
          const ai = topTopics.indexOf(tags[i]);
          const bi = topTopics.indexOf(tags[j]);
          if (ai >= 0 && bi >= 0) matrix[ai][bi] += w;
        }
      }
    });
    const rounded = matrix.map(row => row.map(v => Math.round(v * 10) / 10));
    res.json({ ok: true, type: 'cooccurrence', topics: topTopics, matrix: rounded, sampleSize: r.rows.length });
  } catch (_error) {
    res.status(500).json({ ok: false, error: 'Could not load citation co-occurrence data' });
  }
});

// 3) NON-VIZ: literature review PDF (simple PDF generator, no external lib)
router.get('/literature-review-pdf', async (req, res) => {
  let papers = [];
  try {
    const r = await pool.query("SELECT title, authors, year, citations, source, abstract FROM papers WHERE user_id=$1 ORDER BY citations DESC NULLS LAST,id LIMIT 10", [req.user.id]);
    papers = r.rows;
  } catch (_error) {
    return res.status(500).json({ error: 'Could not load papers for the PDF draft' });
  }

  // Minimal PDF construction (PDF 1.4) — single page summary
  const lines = [];
  lines.push('AI Research Literature Planning Draft');
  lines.push('Generated: ' + new Date().toISOString().substring(0, 10));
  lines.push('');
  lines.push('Saved account records by citation count:');
  papers.forEach((p, i) => {
    const t = (p.title || '').substring(0, 70);
    const a = (p.authors || '').substring(0, 50);
    lines.push(`${i + 1}. ${t} (${p.year || 'n/d'}) - ${p.citations || 0} cites`);
    lines.push(`   ${a}`);
  });
  lines.push('');
  lines.push(`Total saved records listed: ${papers.length}`);
  lines.push('Verify real sources; synthetic training records are not published evidence.');

  const escape = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  let text = 'BT /F1 11 Tf 50 780 Td 14 TL\n';
  lines.forEach((ln, idx) => {
    text += idx === 0 ? `(${escape(ln)}) Tj\n` : `T* (${escape(ln)}) Tj\n`;
  });
  text += 'ET';
  const stream = text;
  const streamLen = Buffer.byteLength(stream, 'binary');

  const objs = [];
  objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objs.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objs.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
  objs.push(`4 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`);
  objs.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objs.forEach(o => { offsets.push(Buffer.byteLength(pdf, 'binary')); pdf += o; });
  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="literature-review.pdf"');
  res.status(200).send(Buffer.from(pdf, 'binary'));
});

// 4) NON-VIZ: paper filter rules CRUD
router.get('/filter-rules', async (req, res) => {
  try {
    const result=await pool.query('SELECT id,type,field,pattern,note,created_at FROM paper_filter_rules WHERE user_id=$1 ORDER BY created_at DESC,id DESC',[req.user.id]);
    res.json({ok:true,count:result.rows.length,rules:result.rows});
  } catch (_error) { res.status(500).json({ok:false,error:'Could not load filter rules'}); }
});
router.post('/filter-rules', async (req, res) => {
  try {
    const type=req.body?.type==='exclusion'?'exclusion':'inclusion';
    const field=String(req.body?.field||'').trim(),pattern=String(req.body?.pattern||'').trim(),note=String(req.body?.note||'').trim();
    if(!field||!pattern)return res.status(400).json({ok:false,error:'field and pattern are required'});
    const result=await pool.query('INSERT INTO paper_filter_rules(user_id,type,field,pattern,note) VALUES($1,$2,$3,$4,$5) RETURNING id,type,field,pattern,note,created_at',[req.user.id,type,field,pattern,note]);
    res.status(201).json({ok:true,rule:result.rows[0]});
  } catch (_error) { res.status(500).json({ok:false,error:'Could not create filter rule'}); }
});
router.put('/filter-rules/:id', async (req, res) => {
  try {
    const type=req.body?.type==='exclusion'?'exclusion':'inclusion';
    const field=String(req.body?.field||'').trim(),pattern=String(req.body?.pattern||'').trim(),note=String(req.body?.note||'').trim();
    if(!field||!pattern)return res.status(400).json({ok:false,error:'field and pattern are required'});
    const result=await pool.query('UPDATE paper_filter_rules SET type=$1,field=$2,pattern=$3,note=$4 WHERE id=$5 AND user_id=$6 RETURNING id,type,field,pattern,note,created_at',[type,field,pattern,note,req.params.id,req.user.id]);
    if(!result.rows[0])return res.status(404).json({ok:false,error:'not_found'});
    res.json({ok:true,rule:result.rows[0]});
  } catch (_error) { res.status(500).json({ok:false,error:'Could not update filter rule'}); }
});
router.delete('/filter-rules/:id', async (req, res) => {
  try {
    const result=await pool.query('DELETE FROM paper_filter_rules WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]);
    if(!result.rows[0])return res.status(404).json({ok:false,error:'not_found'});
    res.json({ok:true,deleted:1});
  } catch (_error) { res.status(500).json({ok:false,error:'Could not delete filter rule'}); }
});

module.exports = router;
