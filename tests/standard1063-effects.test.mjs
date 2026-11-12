import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const GALLOP='dm25rp4-064',RIRIN='dm25rp2-003',BARUGA='dm25rp2-005';
const WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108',LIGHT='dm01-075';
const DARK_SPELL='dm01-027',LARGE='dm25rp3-S09';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const ids=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function summon(s,id,base){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}
function invoke(s,p,source,defs){
 s.extTasks=[{op:'g34_Sequence',p,source:source.cardId,uid:source.uid,incarnation:source.incarnation||0,defs}];
 s.phase='main';
 act(s,'toAttack');
}
function move(s,p,x,to='grave'){
 invoke(s,s.active,x,[{op:'ExactMove',owner:p,to,target:x.uid,targetIncarnation:x.incarnation||0}]);
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
function attacks(s,x,target='player'){
 s.phase='attack';
 return e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target);
}

test('Three official cards and two reprints preserve canonical IDs, stats, limits and art',()=>{
 const m=read('tools/support-phase-1063.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[GALLOP,RIRIN,BARUGA]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[['dm25ex3-rp2003',RIRIN],['dm25ex3-rp2005',BARUGA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.equal(cat.get(id).supported,true);
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1063}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,parseInt(f.powerText,10),f.civilizations,1,4]);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.canonicalId)continue;
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(details.cards.find(r=>r.id===id).faces,row.faces);
  assert.deepEqual(data.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('Gallop keeps Slayer in battle and returns the exact evolved copy as an ordinary NEO',()=>{
 let s=field();
 const base=add(s,0,'battle',WATER),duplicate=add(s,0,'grave',GALLOP);
 const victim=add(s,1,'battle',LARGE,{tapped:true});
 const x=summon(s,GALLOP,base),old=x.incarnation;
 const before=physical(s);
 assert.ok(e.isEvolution(x));
 attack(s,x.uid,victim.uid);
 if(s.decision?.type==='extended')s=restore(s);
 drain(s);
 const back=s.players[0].battle.find(y=>y.uid===x.uid);
 assert.ok(back&&back.incarnation!==old&&!e.isEvolution(back));
 assert.deepEqual(new Set(ids(s,0,'grave')),new Set([duplicate.uid,base.uid]));
 assert.ok(ids(s,1,'grave').includes(victim.uid));
 assert.deepEqual(physical(s),before);
});

test('Gallop does not return after ordinary NEO destruction, bounce, a replacement, ability suppression, or a grave lock',()=>{
 for(const mode of ['ordinary','bounce','prevented','ignored','grave lock']){
  const s=field(),base=mode==='ordinary'?undefined:add(s,0,'battle',DARK);
  const x=summon(s,GALLOP,base);
  if(mode==='prevented')x.g26Stay=true;
  if(mode==='ignored')x.g35Ignored=s.turn;
  if(mode==='grave lock')add(s,1,'battle','dmrp22-042');
  move(s,0,x,mode==='bounce'?'hand':'grave');
  drain(s);
  assert.equal(ids(s,0,'battle').includes(x.uid),mode==='prevented',mode);
  assert.equal(ids(s,0,mode==='bounce'?'hand':'grave').includes(x.uid),mode!=='prevented',mode);
 }
});

test('Ririn deploys eligible former bases within the shared budget and recovers the rest',()=>{
 let s=field();
 const base=add(s,0,'battle',WATER),copy=add(s,0,'grave',FIRE);
 give(s,0,'deck',[LIGHT,FIRE,GREEN,DARK,GREEN,GREEN]);
 const r=summon(s,RIRIN,base);
 const raid=s.players[0].deck.find(y=>y.cardId===FIRE);
 assert.deepEqual(new Set(values(s)),new Set([raid.uid,null]));
 pick(s,raid.uid);
 drain(s);
 const third=inst(DARK),expensive=inst(LARGE),spell=inst(DARK_SPELL);
 raid.under=[third];
 r.under.push(expensive,spell);
 assert.equal(e.effectiveCard(r,s).blocker,true);
 const before=physical(s);
 move(s,0,r);
 assert.deepEqual(new Set(values(s)),new Set([base.uid,raid.uid,third.uid,null]));
 pick(s,raid.uid);
 s=restore(s);
 pick(s,base.uid);
 assert.deepEqual(new Set(values(s)),new Set([third.uid,expensive.uid,spell.uid,null]));
 pick(s,spell.uid);
 pick(s,third.uid);
 pick(s,null);
 assert.deepEqual(new Set(ids(s,0,'battle')),new Set([base.uid,raid.uid]));
 assert.deepEqual(new Set(ids(s,0,'hand')),new Set([spell.uid,third.uid]));
 assert.deepEqual(new Set(ids(s,0,'grave')),new Set([r.uid,copy.uid,expensive.uid]));
 assert.deepEqual(physical(s),before);
});

test('Ririn can skip revival and recover any exact former cards from the same grave visit',()=>{
 let s=field();
 const base=inst(WATER),spell=inst(DARK_SPELL),r=add(s,0,'battle',RIRIN,{under:[base,spell]});
 move(s,0,r);
 pick(s,null);
 s=restore(s);
 const former=s.players[0].grave.find(x=>x.uid===base.uid);
 former.zoneSerial++;
 pick(s,base.uid);
 assert.ok(ids(s,0,'grave').includes(base.uid));
 pick(s,spell.uid);
 assert.deepEqual(ids(s,0,'hand'),[spell.uid]);
});

test('BARUGA counts nested under-cards and applies Powered Breaker',()=>{
 const s=field(),base=add(s,0,'battle',GREEN,{under:[inst(LIGHT)]});
 give(s,0,'deck',[WATER,FIRE,DARK,GREEN,GREEN]);
 const raid=s.players[0].deck[1],x=summon(s,BARUGA,base);
 assert.equal(e.power(x,false,s),24000);
 act(s,'orderEffect',a=>s.pendingEffects.some(q=>q.effectId===a.effectId&&q.effect==='entry'));
 assert.deepEqual(new Set(values(s)),new Set([raid.uid,null]));
 pick(s,raid.uid);
 drain(s);
 assert.equal(e.power(x,false,s),32000);
 assert.equal(e.effectiveCard(x,s).poweredBreaker,true);
 attack(s,x.uid);
 drain(s);
 assert.equal(ids(s,1,'shields').length,0);
});

test('BARUGA protects only the player, uses strict live power, and releases the lock on departure',()=>{
 let s=field();
 const own=add(s,0,'battle',LIGHT,{tapped:true}),base=add(s,0,'battle',GREEN);
 const low=add(s,1,'battle',WATER),equal=add(s,1,'battle',FIRE);
 const x=summon(s,BARUGA,base);
 drain(s);
 end(s);
 s=restore(s);
 const baruga=s.players[0].battle.find(y=>y.uid===x.uid);
 const attacker=s.players[1].battle.find(y=>y.uid===equal.uid);
 attacker.powerModifiers=[{amount:22000,expires:'end',who:1}];
 assert.ok(!attacks(s,low));
 assert.ok(attacks(s,low,own.uid));
 assert.ok(attacks(s,equal));
 baruga.powerModifiers=[{amount:1000,expires:'end',who:1}];
 assert.ok(!attacks(s,equal));
 baruga.g35Ignored=s.turn;
 assert.ok(!attacks(s,low));
 delete baruga.g35Ignored;
 move(s,0,baruga);
 assert.ok(attacks(s,low));
 end(s);
 assert.ok(!s.extLimits?.some(l=>l.kind==='g593AttackPower'));
});
