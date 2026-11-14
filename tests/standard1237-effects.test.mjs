import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MARCH='dm32-054',KEN='dm24rp1-022',KOTO='dm24rp2-074';
const NON='dm01-108',DARK='dm01-090',WATER='dm01-083',SLAYER='dm01-088',HIGH='dm01-s06';
const BLOOD='dm24rp2-S06',KIN='dm23bd1-007',BOUNCE='dmr15-041',DESTROY='dm01-027',APURU='dmrp22-042';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(p=0){
 const s=setup();s.active=p;
 for(const who of [0,1]){give(s,who,'deck',Array(20).fill(NON));give(s,who,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function pick(s,wanted){
 act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return typeof wanted==='function'?wanted(value):(value?.uid??value)===wanted;
 });
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const choices=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];

test('the official versions preserve the three original IDs and link all related prints',()=>{
 const m=read('tools/support-phase-1237.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MARCH,KEN,KOTO]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm22rp1-SP4','dmex16-079','dmx20-042','promoy10-049','dm24ex3-028']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1237}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

const playerAttack=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player');
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
}

test('Deathmarch reproduces the original grave evolution reconstruction ruling with Blood (QA45141)',()=>{
 const s=field(),kin=add(s,0,'grave',KIN),blood=add(s,0,'battle',BLOOD);
 cast(s,MARCH);pick(s,kin.uid);
 const top=s.players[0].battle.find(x=>x.cardId===MARCH);
 assert.equal(top.under[0],kin);assert.ok(e.effectiveCard(top,s).blocker);
 cast(s,BOUNCE);pick(s,top.uid);
 assert.ok(has(s,0,'battle',kin)&&has(s,0,'hand',top));
 s.phase='attack';assert.ok(playerAttack(s,kin));
 blood.sealed=true;assert.ok(!playerAttack(s,kin));
});
test('Deathmarch needs a dark creature base, and a grave movement lock prevents the summon',()=>{
 const s=field(),march=add(s,0,'hand',MARCH),own=add(s,0,'grave',NON),enemy=add(s,1,'grave',DARK);
 const ready=()=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===march.uid);
 assert.ok(!ready());
 const eligible=add(s,0,'grave',DARK),lock=add(s,1,'battle',APURU);
 assert.ok(!ready());
 s.players[1].battle.splice(s.players[1].battle.indexOf(lock),1);
 assert.ok(ready());act(s,'play',a=>a.uid===march.uid);assert.deepEqual(choices(s),[eligible.uid]);pick(s,eligible.uid);
 assert.ok(has(s,0,'grave',own)&&has(s,1,'grave',enemy));
});
test('Deathmarch removes a zero-power opponent before comparison and does not get a battle win',()=>{
 const s=field(),march=add(s,0,'battle',MARCH),opponent=add(s,1,'battle',NON,{tapped:true});
 attack(s,march.uid,opponent.uid);finishAttack(s);
 assert.ok(has(s,1,'grave',opponent)&&has(s,0,'battle',march));
 assert.ok(!s.log.some(x=>x.type==='battle'));
 assert.ok(!s.g587BattleWins?.players[0]);
});
test('Slayer still destroys Deathmarch after a zero-power participant leaves (old QA35818)',()=>{
 const s=field(),march=add(s,0,'battle',MARCH),opponent=add(s,1,'battle',SLAYER,{tapped:true});
 attack(s,march.uid,opponent.uid);finishAttack(s);
 assert.ok(has(s,1,'grave',opponent)&&has(s,0,'grave',march));
 assert.ok(!s.g587BattleWins?.players[0]);
});
test('A nonzero opponent compares reduced power without keeping the modifier after battle',()=>{
 const s=field(),march=add(s,0,'battle',MARCH),opponent=add(s,1,'battle',HIGH,{tapped:true});
 assert.equal(e.power(opponent,false,s),7000);assert.equal(e.matchupPower(opponent,march,false,s),3000);
 attack(s,march.uid,opponent.uid);finishAttack(s);
 assert.ok(has(s,0,'grave',march)&&has(s,1,'battle',opponent));
 assert.equal(e.power(opponent,false,s),7000);
 assert.ok(s.g587BattleWins?.players[1]);
});
test('Deathmarch applies the same debuff when blocking and leaves the shield untouched',()=>{
 const s=field(1),march=add(s,0,'battle',MARCH),attacker=add(s,1,'battle',NON);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===march.uid);drain(s);
 assert.ok(has(s,1,'grave',attacker)&&has(s,0,'battle',march));
 assert.equal(s.players[0].shields.length,5);
});
test('Kensuke grants current tapped allies +2000 and Powered Breaker, and can break two when it attacks',()=>{
 const s=field(),ken=add(s,0,'battle',KEN,{tapped:true}),ally=add(s,0,'battle','dm34-024'),enemy=add(s,1,'battle',NON,{tapped:true});
 assert.equal(e.power(ken,false,s),5000);assert.ok(e.effectiveCard(ken,s).poweredBreaker);
 assert.equal(e.power(ally,false,s),4000);assert.ok(!e.effectiveCard(ally,s).poweredBreaker);
 assert.equal(e.power(enemy,false,s),2000);
 attack(s,ally.uid);finishAttack(s);
 assert.equal(e.power(ally,false,s),6000);assert.equal(s.players[1].shields.length,3);
});
test('Kensuke can decline or break one opposing shield after leaving on the opponent turn',()=>{
 for(const use of [false,true]){
  const s=field(1),ken=add(s,0,'battle',KEN),shield=s.players[1].shields[0];
  cast(s,DESTROY);
  act(s,'effect',a=>a.targets[0].uid===ken.uid);
  assert.ok(has(s,0,'grave',ken));
  assert.equal(s.decision.player,0);
  pick(s,use?shield.uid:null);drain(s);
  assert.equal(has(s,1,'hand',shield),use);assert.equal(s.players[1].shields.length,use?4:5);
 }
});
test('Kensuke leaving on its own turn does not break a shield',()=>{
 const s=field(),ken=add(s,0,'battle',KEN);
 cast(s,BOUNCE);pick(s,ken.uid);drain(s);
 assert.ok(has(s,0,'hand',ken)&&!s.decision);assert.equal(s.players[1].shields.length,5);
});
test('Kotataro lets mana cover creature colors without changing zone civilizations or paying for spells',()=>{
 const s=field(),source=add(s,0,'battle',KOTO),creature=add(s,0,'hand',DARK),spell=add(s,0,'hand',DESTROY);
 give(s,0,'mana',Array(6).fill(WATER));const realColors=e.civilizations(e.card(s.players[0].mana[0]));
 assert.deepEqual(realColors,['水']);assert.deepEqual(e.manaColors(e.card(WATER),s,0),['水']);
 const rows=()=>e.getLegalActions(s).filter(a=>a.kind==='play');
 assert.ok(rows().some(a=>a.uid===creature.uid));assert.ok(!rows().some(a=>a.uid===spell.uid));
 source.sealed=true;assert.ok(!rows().some(a=>a.uid===creature.uid));source.sealed=false;
 const a=rows().find(a=>a.uid===creature.uid);e.step(s,a,{manualMana:true});
 assert.deepEqual(s.decision.colors,['闇']);
 for(const x of s.players[0].mana.slice(0,2))act(s,'selectMana',a=>a.uid===x.uid);
 assert.ok(e.manaSelectionStatus(s.decision).valid);
 act(s,'confirmMana');assert.ok(has(s,0,'battle',creature));
 s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===source.uid));
});
test('Kotataro protects a creature with Guardman and does not block player attacks',()=>{
 const s=field(1),source=add(s,0,'battle',KOTO),ally=add(s,0,'battle',NON,{tapped:true}),attacker=add(s,1,'battle',NON);
 attack(s,attacker.uid,ally.uid);act(s,'guardman',a=>a.uid===source.uid);drain(s);
 assert.ok(has(s,0,'battle',ally)&&has(s,0,'grave',source));
 const t=field(1),k=add(t,0,'battle',KOTO),a=add(t,1,'battle',NON);
 attack(t,a.uid);
 assert.ok(!e.getLegalActions(t).some(a=>a.uid===k.uid&&['guardman','block'].includes(a.kind)));
});

test('Deathmarch reduction is present during an actual destruction replacement and does not leak after continuing',()=>{
 const s=field(),march=add(s,0,'battle',MARCH),target=add(s,1,'battle','dm24rp2-030',{tapped:true});
 attack(s,march.uid,target.uid);finishAttack(s);
 assert.ok(has(s,0,'battle',march)&&has(s,1,'shields',target)&&!has(s,1,'grave',target));
 assert.ok(!s.g587BattleWins?.players[0]);
 assert.equal(target.powerModifiers?.some(m=>m.g1237BattleToken!==undefined)??false,false);
});

test('Deathmarch resolves after the powered blocker bonus and leaves that blocker’s printed power unchanged',()=>{
 const s=field(),march=add(s,0,'battle',MARCH),blocker=add(s,1,'battle','dm22rp2-033');
 attack(s,march.uid);act(s,'block',a=>a.uid===blocker.uid);drain(s);
 assert.ok(has(s,0,'grave',march)&&has(s,1,'battle',blocker));
 assert.equal(e.power(blocker,false,s),4000);
 assert.ok(s.g587BattleWins?.players[1]);
});
