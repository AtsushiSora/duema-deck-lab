import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const SEA='dm36-082',ANALYSIS='dmr13-021',BUBBLE='dm29-010',PROMO='promoy13-024';
const WATER='dm01-083',BODY='dm01-108',SPELL='dm01-086',TWIN='dm25ex1-021';
const DRAGON='dmr13-079',EVOLUTION='dmr19-l02',COST8='promoy15-024',NEO='dm25rp3-S07';
const QX='dmrp07-m01',BIGBANG='dmrp20-s10';
const values=s=>s.decision.choices.map(({value})=>value?.uid??value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(BODY));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function chooseDraw(s,p,n,v){
 assert.equal(s.decision.player,p);
 assert.equal(s.decision.task.op,'g34_DrawUpTo');
 assert.equal(s.decision.task.n,n);
 pick(s,v);
}

test('Phase 853 validates whole abilities and resolves the promo to the original ID',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-853.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[SEA,ANALYSIS,BUBBLE]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:853}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:852}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:853}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.name,c.cost,c.race,c.civilizations,c.limit],[f.name,f.cost,f.race,f.civilizations,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[[PROMO,ANALYSIS]]);
 assert.equal(m.regulationVerification.limits[PROMO],4);
 assert.deepEqual(registry.resolveRows([{id:PROMO,count:2},{id:ANALYSIS,count:2}]),[{id:ANALYSIS,count:4}]);
 assert.ok(!data.cards.some(x=>x.id===PROMO||x.id==='dm26ex4-054'));
});

test('Seakai must return itself when it is the only eligible creature',()=>{
 const s=field();
 const ally=add(s,0,'battle',WATER),enemy=add(s,1,'battle',TWIN);
 const sea=play(s,SEA);
 assert.deepEqual(values(s),[sea.uid]);
 pick(s,sea.uid);
 assert.ok(has(s,0,'hand',sea));
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',enemy));
});

test('Seakai may return a different M Soul creature after resuming',()=>{
 let s=field();
 const ally=add(s,0,'battle',TWIN),sealed=add(s,0,'battle',SEA);
 s.players[0].seals=[{...inst(BODY),sealOf:sealed.uid}];
 const sea=play(s,SEA);
 assert.deepEqual(new Set(values(s)),new Set([ally.uid,sea.uid]));
 s=structuredClone(s);
 pick(s,ally.uid);
 assert.ok(has(s,0,'hand',ally)&&has(s,0,'battle',sea)&&has(s,0,'battle',sealed));
});

test('Bubble may reveal zero without giving either player a draw choice',()=>{
 const s=field();
 const spell=add(s,0,'hand',SPELL);
 play(s,BUBBLE);
 assert.deepEqual(values(s),[spell.uid,null]);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.equal(s.log.filter(x=>x.type==='reveal').length,0);
 assert.deepEqual(s.players.map(p=>p.deck.length),[12,12]);
});

test('Bubble counts each shown spell once, and players stop independently after a draw',()=>{
 let s=field();
 const creature=add(s,0,'hand',WATER),spell=add(s,0,'hand',SPELL),twin=add(s,0,'hand',TWIN);
 play(s,BUBBLE);
 assert.deepEqual(values(s),[spell.uid,twin.uid,null]);
 pick(s,twin.uid);
 assert.deepEqual(values(s),[spell.uid,null]);
 assert.ok(!s.log.some(x=>x.type==='reveal'));
 pick(s,spell.uid);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[SPELL,TWIN]);
 s=structuredClone(s);
 const first=s.players[0].deck[0];
 chooseDraw(s,0,2,true);
 assert.ok(has(s,0,'hand',first));
 chooseDraw(s,0,1,null);
 chooseDraw(s,1,2,true);
 chooseDraw(s,1,1,true);
 assert.equal(s.decision,null);
 assert.ok([creature,spell,twin].every(x=>has(s,0,'hand',x)));
 assert.deepEqual(s.players.map(p=>p.deck.length),[11,10]);
});

test('Bubble starts with its controller when it enters during the other turn',()=>{
 const s=field();
 const bubble=add(s,1,'hand',BUBBLE),spell=add(s,1,'hand',SPELL);
 s.extTasks=[{op:'g34_Put',p:1,source:BUBBLE,origin:'hand',target:bubble.uid}];
 act(s,'toAttack');
 assert.equal(s.active,0);
 pick(s,spell.uid);
 chooseDraw(s,1,1,null);
 chooseDraw(s,0,1,true);
 assert.deepEqual(s.players.map(p=>p.deck.length),[11,12]);
});

test('Bubble resolves a draw replacement before asking for the next draw',()=>{
 const s=field();
 give(s,0,'deck',[]);
 add(s,0,'battle',BIGBANG);
 const revive=add(s,0,'grave',WATER),first=add(s,0,'hand',SPELL),second=add(s,0,'hand',ANALYSIS);
 play(s,BUBBLE);
 pick(s,first.uid);
 pick(s,second.uid);
 chooseDraw(s,0,2,true);
 assert.equal(s.decision.task.op,'g10_Draws');
 pick(s,revive.uid);
 assert.ok(has(s,0,'battle',revive));
 chooseDraw(s,0,1,null);
 chooseDraw(s,1,2,null);
 assert.equal(s.decision,null);
});

for(const accept of [false,true])test('Analysis shuffles even with an empty hand and offers only eligible Dragons: '+accept,()=>{
 let s=field();
 give(s,0,'deck',[DRAGON,EVOLUTION,COST8,WATER,...Array(8).fill(DRAGON)]);
 const rng=s.rng;
 const spell=play(s,ANALYSIS),eligible=s.players[0].hand.filter(x=>x.cardId===DRAGON);
 assert.notEqual(s.rng,rng);
 assert.equal(s.players[0].hand.length,4);
 assert.ok(eligible.length>0);
 assert.deepEqual(values(s),[...eligible.map(x=>x.uid),null]);
 s=structuredClone(s);
 pick(s,accept?eligible[0].uid:null);
 assert.equal(s.players[0].battle.length,Number(accept));
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
});

test('Analysis inserts the original hand before drawing four under a shuffle prohibition',()=>{
 const s=field();
 add(s,1,'battle',QX);
 give(s,0,'deck',[DRAGON,EVOLUTION,COST8,WATER,...Array(8).fill(BODY)]);
 const top=s.players[0].deck.slice(0,4);
 const old=add(s,0,'hand',WATER);
 play(s,ANALYSIS);
 assert.equal(s.decision.task.op,'g11_Insert');
 assert.equal(s.players[0].hand.length,0);
 pick(s,s.decision.choices.at(-1).value);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),top.map(x=>x.uid));
 assert.equal(s.players[0].deck.at(-1).uid,old.uid);
 assert.deepEqual(values(s),[top[0].uid,null]);
 pick(s,top[0].uid);
 assert.ok(has(s,0,'battle',top[0]));
});

test('Analysis can select a NEO Dragon in hand and offer its normal evolution choice',()=>{
 const s=field();
 add(s,1,'battle',QX);
 const base=add(s,0,'battle',WATER);
 give(s,0,'deck',[NEO,...Array(8).fill(BODY)]);
 const neo=s.players[0].deck[0];
 play(s,ANALYSIS);
 pick(s,neo.uid);
 assert.equal(s.decision.task.op,'g34_Put');
 assert.deepEqual(new Set(values(s)),new Set([base.uid,null]));
 pick(s,null);
 assert.ok(has(s,0,'battle',neo)&&has(s,0,'battle',base));
});


test('Analysis finishes mandatory draw replacements before offering deployment',()=>{
 const s=field();
 add(s,0,'battle',BIGBANG);
 const revive=add(s,0,'grave',WATER);
 give(s,0,'deck',[DRAGON]);
 const dragon=s.players[0].deck[0];
 play(s,ANALYSIS);
 for(const value of [revive.uid,null,null]){
  assert.equal(s.decision.task.op,'g10_Draws');
  pick(s,value);
 }
 assert.ok(has(s,0,'battle',revive));
 assert.deepEqual(values(s),[dragon.uid,null]);
 pick(s,dragon.uid);
 assert.ok(has(s,0,'battle',dragon));
});
