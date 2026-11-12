import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const MAO='dm24rp1-013',MESSIAH='dmsd07-001',ROSETTA='dmd28-009',BOLUCCI='promoy14-062';
const N='dm01-108',SPARK='dm01-015',CREST='dmrp06-065',WHITE='dmex16-021';
const BOUNCE='dm01-086',DEMON='dm01-027',STRONG='dm01-107';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const restore=s=>decodeBattleData(encodeBattleData(s));
const zoneHas=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
function placeCrest(s,p){
 const root=s.players[p].shields[0];
 cast(s,add(s,p,'hand',CREST));
 choose(s,root.uid);
}

test('four official definitions and two alternate prints retain canonical IDs, art and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1033.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MAO,MESSIAH,ROSETTA,BOLUCCI]);
 assert.equal(m.printAliases.length,2);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=registry.get(row.id),f=row.faces[0],base=m.cards.find(r=>r.id===id);
  assert.equal(c.id,id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText));
  assert.equal(CARD_IMAGES[id],base.image);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1033}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[id]);
 }
});

test('Mao untaps after a face-up card attaches to its shield and can block again after a shield leaves',()=>{
 const s=setup(),mao=add(s,0,'battle',MAO,{tapped:true}),foe=add(s,1,'battle',MAO,{tapped:true});
 assert.equal(e.effectiveCard(mao,s).breaker,2);
 placeCrest(s,0);
 assert.equal(mao.tapped,false);
 assert.equal(foe.tapped,true);
 end(s);
 mao.tapped=true;
 give(s,0,'shields',[N]);
 const attacker=add(s,1,'battle',N);
 attack(s,attacker.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(mao.tapped,false);
 attack(s,foe.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===mao.uid));
});

for(const removal of [BOUNCE,DEMON])test('Messiah resists removal after shield placement until its next start '+removal,()=>{
 let s=setup();
 const messiah=add(s,0,'battle',MESSIAH);
 assert.equal(e.effectiveCard(messiah,s).breaker,2);
 assert.equal(e.effectiveCard(messiah,s).blocker,true);
 placeCrest(s,0);
 s=restore(s);
 end(s);
 act(s,'skipCharge');
 cast(s,add(s,1,'hand',removal));
 drain(s);
 assert.ok(zoneHas(s,0,'battle',messiah));
 end(s);
 end(s);
 act(s,'skipCharge');
 cast(s,add(s,1,'hand',removal));
 drain(s);
 assert.ok(!zoneHas(s,0,'battle',messiah));
 assert.ok(zoneHas(s,0,removal===BOUNCE?'hand':'grave',messiah));
});

test('Messiah untaps on shield departure even when no shield has been placed',()=>{
 const s=Object.assign(setup(),{active:1}),messiah=add(s,0,'battle',MESSIAH,{tapped:true});
 give(s,0,'shields',[N]);
 const enemy=add(s,1,'battle',N);
 attack(s,enemy.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(messiah.tapped,false);
 assert.ok(!s.extLimits?.some(l=>l.kind==='g627Stay'));
});

test('Rosetta may take an entire shield bundle without using S-Triggers',()=>{
 let s=setup();
 give(s,0,'shields',[SPARK,N,N]);
 const [root]=s.players[0].shields,leaf=inst(SPARK),other=add(s,1,'battle',N);
 root.shieldStack=[leaf];
 cast(s,add(s,0,'hand',ROSETTA));
 assert.deepEqual(values(s),[...s.players[0].shields.map(x=>x.uid),null]);
 s=restore(s);
 choose(s,root.uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,2);
 assert.ok(zoneHas(s,0,'hand',root)&&zoneHas(s,0,'hand',leaf));
 assert.equal(s.players[1].battle.find(x=>x.uid===other.uid).tapped,false);
});

for(const n of [2,3])test('Rosetta may add one face-down shield at its own start with at most two shield groups '+n,()=>{
 const s=setup();
 give(s,0,'shields',Array(n).fill(N));
 s.players[0].shields[0].shieldStack=[inst(N),inst(N)];
 cast(s,add(s,0,'hand',ROSETTA));
 choose(s,null);
 const top=s.players[0].deck[0];
 end(s);
 assert.equal(s.decision,null);
 end(s);
 assert.equal(s.active,0);
 if(n===2){
  assert.deepEqual(values(s),[true,null]);
  choose(s,true);
  assert.equal(s.players[0].shields.at(-1).uid,top.uid);
  assert.ok(!s.players[0].shields.at(-1).faceUp);
 }else assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,3);
});

for(const takeFirst of [true,false])test('Bolucci resolves independent entry abilities in the chosen order '+takeFirst,()=>{
 let s=setup();
 give(s,0,'shields',[SPARK,N,N]);
 const shield=s.players[0].shields[0],ally=add(s,0,'battle',N);
 const enemy=add(s,1,'battle',STRONG,{tapped:true}),bolucci=add(s,0,'hand',BOLUCCI);
 cast(s,bolucci);
 assert.equal(s.decision.type,'effectOrder');
 const entries=s.pendingEffects.filter(x=>x.uid===bolucci.uid);
 assert.equal(entries.length,2);
 const first=entries.find(x=>takeFirst?x.label!=='革命2':x.label==='革命2');
 s=restore(s);
 act(s,'orderEffect',a=>a.effectId===first.effectId);
 choose(s,shield.uid);
 assert.ok(zoneHas(s,0,'hand',shield));
 assert.equal(s.decision,null);
 assert.equal(e.power(s.players[0].battle.find(x=>x.uid===ally.uid),false,s),2000);
 assert.equal(s.extLimits?.filter(x=>x.kind==='g446BattlePower').length??0,takeFirst?2:0);
 attack(s,ally.uid,enemy.uid);
 drain(s);
 assert.equal(zoneHas(s,0,'battle',ally),takeFirst);
 assert.equal(zoneHas(s,1,'battle',enemy),!takeFirst);
 end(s);
 assert.ok(!s.extLimits?.some(x=>x.kind==='g446BattlePower'));
});

test('a blocked shield placement does not untap Mao or protect Messiah',()=>{
 const s=setup(),mao=add(s,0,'battle',MAO,{tapped:true}),messiah=add(s,0,'battle',MESSIAH);
 add(s,1,'battle','dmrp22-037');
 const white=add(s,0,'hand',WHITE);
 cast(s,white);
 choose(s,true);
 assert.equal(mao.tapped,true);
 assert.ok(!s.extLimits?.some(l=>l.kind==='g627Stay'&&l.ref.uid===messiah.uid));
});
