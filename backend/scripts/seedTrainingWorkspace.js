'use strict';
const fs=require('fs');
const path=require('path');
const topics=['Search strategy','Abstract structure','Question framing','Method comparison','Evidence limitations','Citation verification','Study selection','Reproducibility checklist','Bias review','Terminology mapping','Dataset documentation','Review outline','Research gap framing','Source quality checklist','Future study planning'];
const migration=fs.readFileSync(path.join(__dirname,'../migrations/003_native_workspace_ownership.sql'),'utf8');

async function seedTrainingWorkspace(pool,{userId,expectedEmail,minimum=15,dryRun=false}={}){
  const actorId=Number(userId);
  if(!Number.isSafeInteger(actorId)||actorId<1)throw new Error('An explicit existing user ID is required');
  if(!expectedEmail||typeof expectedEmail!=='string')throw new Error('The expected existing account email is required');
  if(!Number.isSafeInteger(minimum)||minimum<15||minimum>100)throw new Error('minimum must be an integer from 15 to 100');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1,$2)',[41873,actorId]);
    const actor=(await client.query('SELECT id,email FROM users WHERE id=$1 FOR UPDATE',[actorId])).rows[0];
    if(!actor||actor.email!==expectedEmail)throw new Error('The selected existing account identity is not current');
    await client.query(migration);
    const tables=['papers','collections','reviews','notes','research_logs','paper_filter_rules'];
    const nullableOwnerTables=['papers','collections','reviews','notes','research_logs'];
    const before={},unclaimedBefore={};
    for(const table of tables)before[table]=Number((await client.query(`SELECT count(*) FROM ${table} WHERE user_id=$1`,[actorId])).rows[0].count);
    for(const table of nullableOwnerTables)unclaimedBefore[table]=Number((await client.query(`SELECT count(*) FROM ${table} WHERE user_id IS NULL`)).rows[0].count);
    const inserted=Object.fromEntries(tables.map(table=>[table,0]));
    const existingPaperTitles=new Set((await client.query('SELECT title FROM papers WHERE user_id=$1',[actorId])).rows.map(row=>row.title));
    const existingCollectionNames=new Set((await client.query('SELECT name FROM collections WHERE user_id=$1',[actorId])).rows.map(row=>row.name));
    const existingReviewTitles=new Set((await client.query('SELECT title FROM reviews WHERE user_id=$1',[actorId])).rows.map(row=>row.title));
    for(let ordinal=1;before.papers+inserted.papers<minimum;ordinal++){
      const topic=topics[(ordinal-1)%topics.length],title=`[Synthetic training example ${String(ordinal).padStart(2,'0')}] ${topic}`;
      if(existingPaperTitles.has(title))continue;
      await client.query(`INSERT INTO papers(title,authors,abstract,source,tags,status,user_id,citations,relevance_score) VALUES($1,'Not applicable — synthetic training record',$2,'synthetic-training','synthetic,training-example','draft',$3,0,0)`,[title,`Fictional training draft for practicing ${topic.toLowerCase()}. This is not a published paper, verified study, clinical observation, or evidence of an actual finding. Verify real sources separately.`,actorId]);
      existingPaperTitles.add(title);inserted.papers++;
    }
    for(let ordinal=1;before.collections+inserted.collections<minimum;ordinal++){
      const topic=topics[(ordinal-1)%topics.length],name=`[Synthetic planning collection ${String(ordinal).padStart(2,'0')}] ${topic}`;
      if(existingCollectionNames.has(name))continue;
      await client.query('INSERT INTO collections(name,description,paper_count,user_id) VALUES($1,$2,0,$3)',[name,`Fictional account-owned planning collection for ${topic.toLowerCase()}. It contains no claim of verified sources, completed searches, approvals, or published evidence.`,actorId]);
      existingCollectionNames.add(name);inserted.collections++;
    }
    for(let ordinal=1;before.reviews+inserted.reviews<minimum;ordinal++){
      const topic=topics[(ordinal-1)%topics.length],title=`[Synthetic review draft ${String(ordinal).padStart(2,'0')}] ${topic}`;
      if(existingReviewTitles.has(title))continue;
      await client.query(`INSERT INTO reviews(title,topic,status,papers_included,content,gaps_identified,user_id) VALUES($1,$2,'draft',0,$3,$4,$5)`,[title,`Fictional planning topic: ${topic}`,`Training-only review outline for practicing ${topic.toLowerCase()}. No literature search, study result, citation, consent, approval, or publication is represented.`,'Unknown until genuine saved sources are selected and reviewed.',actorId]);
      existingReviewTitles.add(title);inserted.reviews++;
    }
    let notePaper=(await client.query("SELECT id FROM papers WHERE user_id=$1 AND source='synthetic-training' ORDER BY id LIMIT 1",[actorId])).rows[0];
    if(before.notes<minimum&&!notePaper){
      const result=await client.query(`INSERT INTO papers(title,authors,abstract,source,tags,status,user_id,citations,relevance_score) VALUES('[Synthetic training note source] Planning annotations','Not applicable — synthetic training record','Fictional record used only to contain training notes. It is not published evidence.','synthetic-training','synthetic,training-example','draft',$1,0,0) RETURNING id`,[actorId]);
      notePaper=result.rows[0];inserted.papers++;
    }
    const existingNotes=new Set((await client.query("SELECT content FROM notes WHERE user_id=$1 AND content LIKE '[Synthetic training note %'",[actorId])).rows.map(row=>row.content));
    for(let ordinal=1;before.notes+inserted.notes<minimum;ordinal++){
      const topic=topics[(ordinal-1)%topics.length],content=`[Synthetic training note ${String(ordinal).padStart(2,'0')}] Practice ${topic.toLowerCase()}; no real source finding or completed action is claimed.`;
      if(existingNotes.has(content))continue;
      await client.query('INSERT INTO notes(paper_id,content,highlights,user_id) VALUES($1,$2,$3,$4)',[notePaper.id,content,'Training-only annotation; verify against authentic sources.',actorId]);
      existingNotes.add(content);inserted.notes++;
    }
    const existingLogMessages=new Set((await client.query("SELECT message FROM research_logs WHERE user_id=$1 AND message LIKE '[Synthetic report history %'",[actorId])).rows.map(row=>row.message));
    for(let ordinal=1;before.research_logs+inserted.research_logs<minimum;ordinal++){
      const topic=topics[(ordinal-1)%topics.length],message=`[Synthetic report history ${String(ordinal).padStart(2,'0')}] ${topic}`;
      if(existingLogMessages.has(message))continue;
      const result={summary:`Training-only planning output for ${topic.toLowerCase()}.`,source_assessment:'No authentic source was evaluated by this fixture.',findings:[],recommendations:['Select and verify authentic sources before drawing conclusions.'],assumptions:['This is fictional training data.'],uncertainties:['All domain findings remain unknown.'],next_steps:['Replace this fixture with an evidence-grounded draft.']};
      await client.query("INSERT INTO research_logs(level,agent,message,user_id,result) VALUES('info','trainingFixture',$1,$2,$3::jsonb)",[message,actorId,JSON.stringify(result)]);
      existingLogMessages.add(message);inserted.research_logs++;
    }
    const existingRuleNotes=new Set((await client.query("SELECT note FROM paper_filter_rules WHERE user_id=$1 AND note LIKE '[Synthetic planning rule %'",[actorId])).rows.map(row=>row.note));
    for(let ordinal=1;before.paper_filter_rules+inserted.paper_filter_rules<minimum;ordinal++){
      const topic=topics[(ordinal-1)%topics.length],note=`[Synthetic planning rule ${String(ordinal).padStart(2,'0')}] Practice filter for ${topic.toLowerCase()}; validate before real use.`;
      if(existingRuleNotes.has(note))continue;
      await client.query('INSERT INTO paper_filter_rules(user_id,type,field,pattern,note) VALUES($1,$2,$3,$4,$5)',[actorId,ordinal%3===0?'exclusion':'inclusion',ordinal%2===0?'source':'tags',`training-example-${String(ordinal).padStart(2,'0')}`,note]);
      existingRuleNotes.add(note);inserted.paper_filter_rules++;
    }
    const after={},unclaimedAfter={};
    for(const table of tables)after[table]=Number((await client.query(`SELECT count(*) FROM ${table} WHERE user_id=$1`,[actorId])).rows[0].count);
    for(const table of nullableOwnerTables){
      unclaimedAfter[table]=Number((await client.query(`SELECT count(*) FROM ${table} WHERE user_id IS NULL`)).rows[0].count);
      if(unclaimedAfter[table]!==unclaimedBefore[table])throw new Error(`Unclaimed ${table} rows changed unexpectedly`);
    }
    for(const table of tables)if(after[table]<minimum)throw new Error(`${table} did not reach the required minimum`);
    await client.query(dryRun?'ROLLBACK':'COMMIT');
    return{userId:actorId,minimum,before,inserted,after,unclaimedBefore,unclaimedAfter,originalRowsPreserved:true,accountsChanged:0,credentialsChanged:0,providerCalls:0,dryRun};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
module.exports={seedTrainingWorkspace};
if(require.main===module){
  const root=path.join(__dirname,'../..');require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'.env'),override:true});
  const args=process.argv.slice(2),userIndex=args.indexOf('--user-id'),emailIndex=args.indexOf('--expected-email');
  if(userIndex<0||!args[userIndex+1]||emailIndex<0||!args[emailIndex+1]){console.error('Usage: node scripts/seedTrainingWorkspace.js --user-id EXISTING_ID --expected-email EXISTING_EMAIL [--dry-run]');process.exitCode=1;}
  else{const pool=require('../models/db');seedTrainingWorkspace(pool,{userId:Number(args[userIndex+1]),expectedEmail:args[emailIndex+1],dryRun:args.includes('--dry-run')}).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());}
}