// Record measured results only after every bounded check passed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {nameKey} from '../dist/catalogue.js';
const phase=Number(process.argv[2]),m=JSON.parse(fs.readFileSync('tools/support-phase-'+phase+'.json')),data=JSON.parse(fs.readFileSync('dist/cards.json')),progress=JSON.parse(fs.readFileSync('tools/card-support-progress.json'));
const attempts=fs.readFileSync('tmp/duema-phase-'+phase+'/runs.jsonl','utf8').trim().split('\n').map(JSON.parse);
const runs=[...new Map(attempts.map(r=>[r.name,r])).values()];
for(const name of ['focused','check','audit']){const r=runs.find(x=>x.name===name);assert.ok(r&&r.code===0&&!r.timedout,name);}
for(const r of runs){assert.equal(r.code,0);assert.ok(!r.timedout);const log=fs.readFileSync(r.log,'utf8'),pass=log.match(/(?:ℹ pass |# pass )(\d+)/),fail=log.match(/(?:ℹ fail |# fail )(\d+)/);if(pass)r.passed=Number(pass[1]);if(fail)r.failed=Number(fail[1]);}
const supported=new Set(data.cards.map(c=>nameKey(c.name))).size;assert.equal(supported,data.cards.length);assert.equal(supported,m.baseCount+m.cards.length);assert.ok(supported<=9000);
assert.ok(!progress.batchHistory.some(x=>x.phase===phase));
progress.batchHistory.push({phase,kind:'registration-toward-9000',checkedAt:new Date().toISOString(),baseline:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),manifest:'tools/support-phase-'+phase+'.json',status:'verified-local',before:m.baseCount,supported,pending:progress.pendingNames,added:m.cards.map(c=>({id:c.id,name:c.name})),duplicates:0,results:Object.fromEntries(runs.map(r=>[r.name,r])),...(attempts.some(r=>r.code!==0)?{resolvedAttempts:attempts.filter(r=>r.code!==0),testCorrections:m.testCorrections||[]}:{}),totalTestsPassed:runs.reduce((n,r)=>n+(r.passed||0),0),reason:m.description,remaining:['全体npm testの過去の中断・合否未確認、ユーザー保留中の公式照合2件、本番2アカウント対戦の未確認を維持。'],next:'目標9000種類まで公式全文照合・固有テストを終えた3〜5種類のバッチを追加。push・Netlify反映は別途指示時だけ。'});
if(m.deferred?.length){
 progress.batchHistory.at(-1).deferred=m.deferred;
 const deferred=progress.resume.deferredRegistrationCandidates??=[];
 for(const row of m.deferred)if(!deferred.some(x=>x.id===row.id))deferred.push({...row,phase});
}
const old=progress.registrationStop;
progress.registrationStop={phase,threshold:9000,supportedNames:supported,pendingNames:progress.pendingNames,checkedAt:new Date().toISOString().slice(0,10),registrationStopped:supported>=9000,automationId:'duema-deck-lab',automationStatus:'PAUSED',mode:'manual-current-session',userInstruction:'9000種類までカードを増やして',previousStop:old.previousStop||old};
Object.assign(progress.resume,{lastVerifiedPhase:phase,nextPhase:phase+1,workInProgress:null,registrationStatus:'ユーザーの新目標9000種類に向けて通常登録を再開。現在'+supported+'種類、残り'+(9000-supported)+'種類。automationはPAUSEDのまま。',registrationTarget:{target:9000,startCount:8500,currentCount:supported,remaining:9000-supported,status:supported>=9000?'complete':'active',phase},nextCandidates:['公式照合済みの通常能力を持たないGRクリーチャー','既存のキーワード処理と一致するGRクリーチャー','既存処理で両面を完全に扱えるツインパクトを個別検証。公式未確認・特殊条件は保留。']});
progress.resume.restartSteps[1]='実データ'+supported+'種類・重複0。新目標9000種類まで通常登録を継続。旧8001停止条件は今回のユーザー指示で置き換え。保留2件とautomation PAUSED、Netlify手動更新専用を維持。';
progress.resume.steps[1]=progress.resume.restartSteps[1];
fs.writeFileSync('tools/card-support-progress.json',JSON.stringify(progress,null,2)+'\n');console.log(JSON.stringify({phase,supported,remaining:9000-supported,tests:runs.reduce((n,r)=>n+(r.passed||0),0)}));
