#!/bin/bash
cd "$(dirname "$0")"
echo "📚 Starting AI Research Literature Agent..."
for port in 3022 3023; do pid=$(lsof -ti:$port 2>/dev/null); [ -n "$pid" ] && kill -9 $pid 2>/dev/null; done
createdb ai_research_literature_db 2>/dev/null || true
cd backend && npm install 2>/dev/null; cd ../frontend && npm install 2>/dev/null; cd ..
psql -d ai_research_literature_db -f backend/models/schema.sql 2>/dev/null
node backend/seeds/seed.js
cd backend && npx nodemon server.js &
cd ../frontend && PORT=3023 npm start &
echo "✅ Backend: http://localhost:3022 | Frontend: http://localhost:3023"
wait
