const express=require('express');const cors=require('cors');const helmet=require('helmet');
require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const app=express();const PORT=process.env.PORT||3022;
const CLIENT_URL=process.env.CLIENT_URL||'http://localhost:3000';
if((process.env.JWT_SECRET||'').length<32||!process.env.GOVERNANCE_TENANT_ID||!process.env.DATABASE_URL)throw new Error('JWT_SECRET, GOVERNANCE_TENANT_ID, and DATABASE_URL are required');
app.use(helmet());app.use(cors({origin:CLIENT_URL,credentials:true}));app.use(express.json());
const pool=require('./models/db');
app.locals.pool=pool;
app.use('/api/auth',require('./routes/auth'));
app.use('/api/papers',require('./routes/papers'));
app.use('/api/collections',require('./routes/collections'));
app.use('/api/reviews',require('./routes/reviews'));
app.use('/api/agents',require('./routes/agents'));
app.use('/api/notes',require('./routes/notes'));
app.use('/api/stats',require('./routes/researchStats'));
app.use('/api/governed-literature',require('./governance'));
app.use('/api/ai/literature-review',require('./routes/ai-literature-review'));

// Health endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AIResearchLiteratureAgent', ts: Date.now() }));

// Custom Views (mounted BEFORE 404)
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api', require('./routes/featurePack'));

// Apply pass 6: canonical citation graph visualization endpoint (mechanical
// follow-up over track-citations). Mounted BEFORE 404.
if(process.env.ENABLE_GENERATED_ROUTES==='true'&&process.env.NODE_ENV!=='production')app.use('/api/ai/citation-graph', require('./routes/ai-citation-graph'));

// 404 fallback (must be last)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not Found', path: req.originalUrl }));
if(require.main===module)app.listen(PORT,()=>console.log(`Research Agent server running on port ${PORT}`));
module.exports=app;
