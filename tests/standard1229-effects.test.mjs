import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const UNA='dm23rp1-015',BULL='dm23rp1-021',ALDE='dm23rp1-052',SY='dm23rp1-073';
const L='dm01-075',W='dm01-083',F='dm01-097',N='dm01-108',VIRIDE='dm24rp1-S02';
const ARMOR='dm23rp3-038',ARMOR_SEED='dmrp21-069',DRAGON='dmrp18-075',METEOR='dm01-s08';
const MAGIC='dm23rp1-S3',GIANT='dmrp21-074',MECHA='dm23rp1-055';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){const s=setup();for(const p of [0,1]){give(s,p,'deck',Array(16).fill(N));give(s,p,'grave',[]);}return s;}
function put(s,p,zone,id,props={}){const x=Object.assign(inst(id),props);s.players[p][zone].push(x);return x;}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const plays=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid);
const manaUsed=(s,p=0)=>s.players[p].mana.filter(x=>x.tapped).length;
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}

test('seven verified official prints resolve to four supported card IDs',()=>{
 const m=read('tools/support-phase-1229.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[UNA,BULL,ALDE,SY]);
 assert.deepEqual(m.printAliases.map(c=>c.canonicalId),[BULL,BULL,ALDE]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1229}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1229}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],[f.cost,+f.powerText,f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){assert.equal(CARD_IMAGES[id],row.image);assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);}
 }
});

test('UNA draws exactly two when attacking and Just Diver protects through the opposing turn',()=>{
 const s=field(),before=s.players[0].deck.slice(0,2),x=put(s,0,'battle',UNA);
 attack(s,x.uid);pick(s,0);drain(s);
 assert.deepEqual(s.players[0].hand.map(y=>y.uid),before.map(y=>y.uid));
 const t=field(),una=put(t,0,'hand',UNA);act(t,'play',a=>a.uid===una.uid);drain(t);
 assert.ok(una.justDiverActive);
 end(t);assert.ok(una.justDiverActive);
 end(t);assert.ok(!una.justDiverActive);
});

test('UNA discards two distinct cards to Mekraid, uses a Magic Twinpact face and orders the rest',()=>{
 const s=field(),x=put(s,0,'battle',UNA),first=put(s,0,'hand',L),second=put(s,0,'hand',F);
 const twin=inst(MAGIC),left=inst(W),right=inst(N);
 s.players[0].deck.unshift(twin,left,right);
 attack(s,x.uid);pick(s,1);pick(s,first.uid);pick(s,second.uid);
 assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',second));
 assert.equal(s.decision.task.max,8);
 assert.deepEqual(new Set(values(s)),new Set([twin.uid,null]));
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===twin.uid&&s.decision.choices[a.choice].value?.face===1);
 pick(s,right.uid);drain(s);
 assert.deepEqual(s.players[0].deck.slice(-2).map(y=>y.uid),[right.uid,left.uid]);
 assert.equal(manaUsed(s),0);
 assert.ok(has(s,0,'grave',twin));
});

test('UNA can decline the discard after the first selection and requires two cards',()=>{
 for(const n of [1,2]){
  const s=field(),x=put(s,0,'battle',UNA);give(s,0,'hand',Array(n).fill(F));
  const hand=s.players[0].hand.map(y=>y.uid),deck=s.players[0].deck.map(y=>y.uid);
  attack(s,x.uid);pick(s,1);
  if(n===2){pick(s,hand[0]);pick(s,null);}
  drain(s);
  assert.deepEqual(s.players[0].hand.map(y=>y.uid),hand);
  assert.deepEqual(s.players[0].deck.map(y=>y.uid),deck);
  assert.deepEqual(s.players[0].grave,[]);
 }
});

for(const id of [ARMOR,ARMOR_SEED,METEOR])test(`Bull discounts and consumes the next ${e.card(id).type} use`,()=>{
 const s=field();cast(s,BULL);drain(s);
 const unrelated=put(s,0,'hand',W);act(s,'play',a=>a.uid===unrelated.uid);drain(s);
 const x=put(s,0,'hand',id),next=put(s,0,'hand',id),before=manaUsed(s);
 assert.equal(plays(s,x)[0].cost,1);
 act(s,'play',a=>a.uid===x.uid);drain(s);
 assert.equal(manaUsed(s)-before,1);
 assert.equal(plays(s,next)[0].cost,e.card(id).cost);
});

test('a free Armored use also spends the next-use reduction (analogous QA40776)',()=>{
 const s=field();cast(s,BULL);drain(s);
 const seed=inst(ARMOR_SEED);s.players[0].deck.unshift(seed);
 s.extTasks=[{op:'g34_Raid767',p:0,source:BULL,race:'アーマード',max:5}];
 act(s,'toAttack');pick(s,seed.uid);drain(s);
 assert.ok(has(s,0,'battle',seed));
 s.phase='main';const next=put(s,0,'hand',METEOR);
 assert.equal(plays(s,next)[0].cost,7);
});

test('Bull gives only allied Dragons immediate attacks and its reduction expires at turn end',()=>{
 const s=field();cast(s,BULL);drain(s);
 const ally=put(s,0,'hand',DRAGON),other=put(s,0,'hand',F),enemy=put(s,1,'battle',DRAGON,{summonedTurn:s.turn});
 for(const x of [ally,other]){act(s,'play',a=>a.uid===x.uid);drain(s);}
 s.phase='attack';assert.ok(attacks(s,ally).length);assert.equal(attacks(s,other).length,0);
 assert.equal(Boolean(e.effectiveCard(enemy,s).speedAttacker),false);
 s.players[0].battle=s.players[0].battle.filter(x=>x.cardId!==BULL);
 assert.equal(attacks(s,ally).length,0);
 end(s);end(s);s.phase='main';
 const x=put(s,0,'hand',ARMOR);
 assert.equal(plays(s,x)[0].cost,e.card(ARMOR).cost);
});

test('Bull G Strike stops an opposing attack without tapping the target',()=>{
 const s=field();s.active=1;give(s,0,'shields',[BULL]);give(s,1,'battle',[N,N]);
 const [a,b]=s.players[1].battle;attack(s,a.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 pick(s,true);pick(s,b.uid);
 assert.equal(b.tapped,false);assert.ok(e.attackLocked(s,1,b));
 assert.equal(attacks(s,b).length,0);end(s);assert.ok(!e.attackLocked(s,1,b));
});

for(const [reducer,id] of [[ALDE,MECHA],[SY,GIANT]])test(`${e.card(reducer).name} can decline or use the reduction once per turn`,()=>{
 const s=field(),x=put(s,0,'battle',reducer),first=put(s,0,'hand',id),second=put(s,0,'hand',id),third=put(s,0,'hand',id);
 const full=e.card(id).cost;
 function finishEffect(){
  if(reducer===ALDE)pick(s,null);
  else pick(s,s.players[1].battle[0].uid);
  drain(s);
 }
 function provideTarget(){if(reducer===SY)put(s,1,'battle',W);}
 provideTarget();
 act(s,'play',a=>a.uid===first.uid);assert.ok(values(s).some(v=>String(v).startsWith(x.uid+'@')));pick(s,null);finishEffect();
 assert.equal(manaUsed(s),full);
 act(s,'play',a=>a.uid===second.uid);pick(s,false);assert.ok(has(s,0,'hand',second));assert.equal(manaUsed(s),full);
 provideTarget();
 act(s,'play',a=>a.uid===second.uid);pick(s,values(s).find(v=>String(v).startsWith(x.uid+'@')));pick(s,null);finishEffect();
 assert.equal(manaUsed(s),2*full-1);
 assert.equal(plays(s,third)[0].cost,full);
 end(s);end(s);s.phase='main';
 assert.equal(plays(s,third)[0].cost,full-1);
});

test('Alde reduces the Viride alternative summon from two to one light mana (QA45560)',()=>{
 const s=field(),a=put(s,0,'battle',ALDE),viride=put(s,0,'hand',VIRIDE);
 s.players[1].shields.pop();give(s,0,'mana',[L]);
 assert.equal(plays(s,viride).find(x=>x.alternative==='viride')?.cost,1);
 act(s,'play',x=>x.uid===viride.uid&&x.alternative==='viride');
 pick(s,values(s).find(v=>String(v).startsWith(a.uid+'@')));pick(s,null);drain(s);
 assert.ok(has(s,0,'battle',viride));assert.equal(manaUsed(s),1);
 assert.equal(e.card(viride).cost,6);
});

test('Viride preserves the choice to decline an existing optional Garden discount',()=>{
 const s=field(),garden=put(s,0,'shields','dm26rp1-024',{faceUp:true}),viride=put(s,0,'hand',VIRIDE);
 give(s,0,'mana',[L,L]);
 const routes=plays(s,viride).filter(x=>x.alternative==='viride');
 assert.deepEqual(routes.map(a=>a.cost).sort(),[1,2]);
 act(s,'play',a=>a.uid===viride.uid&&a.alternative==='viride'&&a.cost===2);
 assert.equal(manaUsed(s),2);
 assert.equal(s.g26GardenUsed?.[garden.uid+'@0'],undefined);
});

test('Alde blocks and can attack creatures; Sy redirects only creature attacks and cannot attack',()=>{
 const s=field(),a=put(s,0,'battle',ALDE),b=put(s,0,'battle',SY),other=put(s,0,'battle',N,{tapped:true}),enemy=put(s,1,'battle',N,{tapped:true});
 s.phase='attack';assert.ok(attacks(s,a).some(x=>x.target===enemy.uid));assert.ok(!attacks(s,a).some(x=>x.target==='player'));
 assert.equal(attacks(s,b).length,0);
 s.active=1;enemy.tapped=false;attack(s,enemy.uid);assert.ok(e.getLegalActions(s).some(x=>x.kind==='block'&&x.uid===a.uid));
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='guardman'));
 act(s,'block',x=>x.uid===a.uid);drain(s);
 const next=put(s,1,'battle',W);attack(s,next.uid,other.uid);act(s,'guardman',x=>x.uid===b.uid);drain(s);
 assert.ok(b.tapped&&has(s,0,'battle',other));
});
