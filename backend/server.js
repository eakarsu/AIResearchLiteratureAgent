const express=require('express');const cors=require('cors');const helmet=require('helmet');
require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const app=express();const PORT=process.env.PORT||3022;
const CLIENT_URL=process.env.CLIENT_URL||'http://localhost:3000';
app.use(helmet());app.use(cors({origin:CLIENT_URL,credentials:true}));app.use(express.json());
const pool=require('./models/db');
// Run schema migrations
async function initDB(){
try{
await pool.query(`ALTER TABLE papers ADD COLUMN IF NOT EXISTS user_id INTEGER`);
await pool.query(`ALTER TABLE collections ADD COLUMN IF NOT EXISTS user_id INTEGER`);
await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER`);
await pool.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id INTEGER`);
await pool.query(`CREATE TABLE IF NOT EXISTS research_logs (id SERIAL PRIMARY KEY, paper_id INTEGER REFERENCES papers(id), level VARCHAR(20) DEFAULT 'info', agent VARCHAR(50), message TEXT, user_id INTEGER, result TEXT, created_at TIMESTAMP DEFAULT NOW())`);
console.log('DB migrations done');
}catch(e){console.error('DB init error:',e.message);}
}
initDB();
app.use('/api/auth',require('./routes/auth'));
app.use('/api/papers',require('./routes/papers'));
app.use('/api/collections',require('./routes/collections'));
app.use('/api/reviews',require('./routes/reviews'));
app.use('/api/agents',require('./routes/agents'));
app.use('/api/notes',require('./routes/notes'));
app.get('/api/stats',async(req,res)=>{try{const[p,c,r,u]=await Promise.all([pool.query('SELECT COUNT(*) FROM papers'),pool.query('SELECT COUNT(*) FROM collections'),pool.query('SELECT COUNT(*) FROM reviews'),pool.query("SELECT COUNT(*) FROM papers WHERE status='unread'")]);res.json({papers:+p.rows[0].count,collections:+c.rows[0].count,reviews:+r.rows[0].count,unread:+u.rows[0].count});}catch(e){res.status(500).json({error:e.message});}});
app.listen(PORT,()=>console.log(`Research Agent server running on port ${PORT}`));

// AI feature mount: literature-review
app.use('/api/ai/literature-review', require('./routes/ai-literature-review'));
// === Batch 07 Gaps & Frontend Mounts ===
app.use('/api/gap-no-papersummarizer-abstract-key-findings', require('./routes/gap-no-papersummarizer-abstract-key-findings'));
app.use('/api/gap-no-literaturereviewgenerator-multipaper-synt', require('./routes/gap-no-literaturereviewgenerator-multipaper-synt'));
app.use('/api/gap-no-gapfinder-unanswered-questions', require('./routes/gap-no-gapfinder-unanswered-questions'));
app.use('/api/gap-no-methodologycomparison', require('./routes/gap-no-methodologycomparison'));
app.use('/api/gap-no-citationnetworkanalysis-graph-influence', require('./routes/gap-no-citationnetworkanalysis-graph-influence'));
app.use('/api/gap-no-paperrecommender', require('./routes/gap-no-paperrecommender'));
app.use('/api/gap-no-pdf-ingestionparsing-pipeline', require('./routes/gap-no-pdf-ingestionparsing-pipeline'));
app.use('/api/gap-no-highlightannotation-tool', require('./routes/gap-no-highlightannotation-tool'));
app.use('/api/gap-no-realtime-collaborative-editing', require('./routes/gap-no-realtime-collaborative-editing'));
app.use('/api/gap-no-bibtexzotero-citation-export', require('./routes/gap-no-bibtexzotero-citation-export'));
app.use('/api/gap-no-arxivpubmedgoogle-scholar-api-integration', require('./routes/gap-no-arxivpubmedgoogle-scholar-api-integration'));
app.use('/api/gap-no-quality-scoring-grade-methodology-rigor', require('./routes/gap-no-quality-scoring-grade-methodology-rigor'));
app.use('/api/gap-no-notifications-for-new-matching-papers', require('./routes/gap-no-notifications-for-new-matching-papers'));
// === End Batch 07 ===

// Health endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AIResearchLiteratureAgent', ts: Date.now() }));

// Custom Views (mounted BEFORE 404)
app.use('/api/custom-views', require('./routes/customViews'));

// Apply pass 6: canonical citation graph visualization endpoint (mechanical
// follow-up over track-citations). Mounted BEFORE 404.
app.use('/api/ai/citation-graph', require('./routes/ai-citation-graph'));

// 404 fallback (must be last)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not Found', path: req.originalUrl }));
