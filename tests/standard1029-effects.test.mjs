import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const BORO='dmrp04s-015', MEGURU='dmrp05-047', TEN='dmrp04m-s02';
const NATURE='dm01-108', HIGH='dm01-s08', GENMU='dmrp15-km1', MASTER='dmrp05-m02';
const EYE='dmbd04-008', RAGE='dmrp06-065';

function add(s,p,zone,id,props={}){
 const card=Object.assign(inst(id),props);
 s.players[p][zone].push(card);
 return card;
}
const options=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const shield=(s,p=0)=>s.players[p].shields[0];
const finish=(s,p=0)=>choose(s,shield(s,p).shieldGroup||shield(s,p).uid);
const restored=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('the three Crests keep their catalogue IDs and both Dragon Finale print aliases',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1029.json',import.meta.url)));
 assert.deepEqual(manifest.cards.map(x=>x.id),[BORO,MEGURU,TEN]);
 for(const row of manifest.cards){
  const c=registry.get(row.id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(c.cost,row.faces[0].cost);
  assert.equal(CARD_IMAGES[c.id],row.image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).length,1);
 }
 assert.deepEqual(manifest.printAliases.map(x=>x.id),['dmex17-005','dm24ex3-TD02']);
 for(const row of manifest.printAliases){
  assert.equal(registry.get(row.id).id,TEN);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1029}),manifest.cards.at(-1).spec);
 }
});

test('Boro lets the chosen creature beat a stronger one and protects it through the opponent turn',()=>{
 const s=setup(),ally=add(s,0,'battle',NATURE),other=add(s,0,'battle',NATURE);
 const enemy=add(s,1,'battle',HIGH,{tapped:true});
 const spell=add(s,0,'hand',BORO);
 cast(s,spell);
 assert.deepEqual(options(s),[ally.uid,other.uid]);
 choose(s,ally.uid);
 finish(s);
 assert.equal(e.effectiveCard(ally,s).g1029TargetProtection,true);
 assert.equal(e.effectiveCard(other,s).untargetable,undefined);
 attack(s,ally.uid,enemy.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(inZone(s,1,'grave',enemy),true);
 assert.equal(inZone(s,0,'battle',ally),true);
 end(s);
 assert.equal(s.active,1);
 act(s,'skipCharge');
 const freeze=add(s,1,'hand',EYE);
 cast(s,freeze);
 assert.deepEqual(options(s),[other.uid]);
 choose(s,other.uid);
 finish(s,1);
 end(s);
 assert.equal(s.active,0);
 assert.equal(e.effectiveCard(ally,s).g1029TargetProtection,undefined);
 assert.equal(e.effectiveCard(ally,s).g34AlwaysWin,undefined);
 assert.equal(shield(s).shieldStack[0].uid,spell.uid);
});

for(const selected of ['trigger','root','skip'])test('Meguru chooses one physical shield card at the next own start '+selected,()=>{
 let s=setup();
 give(s,0,'deck',[NATURE,NATURE,NATURE,NATURE]);
 give(s,1,'deck',[NATURE,NATURE,NATURE,NATURE]);
 give(s,0,'shields',[NATURE,NATURE]);
 const [root,second]=s.players[0].shields;
 const trigger={...inst(EYE),faceUp:true,shieldCardOnly:true},neighbor={...inst(RAGE),faceUp:true,shieldCardOnly:true};
 root.shieldStack=[trigger,neighbor];
 const enemy=add(s,1,'battle',NATURE),spell=add(s,0,'hand',MEGURU),all=physical(s);
 cast(s,spell);
 choose(s,enemy.uid);
 assert.equal(enemy.tapped,true);
 choose(s,second.uid);
 end(s);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
 assert.equal(enemy.tapped,false);
 end(s);
 assert.equal(s.active,0);
 assert.deepEqual(options(s),[root.uid,trigger.uid,neighbor.uid,second.uid,spell.uid,null]);
 assert.equal(s.decision.choices[0].cardId,undefined);
 s=restored(s);
 choose(s,selected==='trigger'?trigger.uid:selected==='root'?root.uid:null);
 if(selected==='trigger'){
  act(s,'useTrigger',a=>a.uid===trigger.uid);
  choose(s,enemy.uid);
  finish(s);
  assert.equal(enemy.uid,s.players[1].battle[0].uid);
  assert.equal(s.players[1].battle[0].tapped,true);
  assert.deepEqual(shield(s).shieldStack.map(x=>x.uid),[neighbor.uid,trigger.uid]);
 }else if(selected==='root'){
  assert.equal(inZone(s,0,'hand',root),true);
  assert.equal(shield(s).uid,trigger.uid);
  assert.equal(shield(s).shieldGroup,root.uid);
  assert.deepEqual(shield(s).shieldStack.map(x=>x.uid),[neighbor.uid]);
 }else assert.deepEqual(shield(s).shieldStack.map(x=>x.uid),[trigger.uid,neighbor.uid]);
 assert.equal(s.players[0].shields.length,2);
 assert.equal(s.metrics[0].breaks,0);
 assert.deepEqual(physical(s),all);
});

for(const untap of [true,false])test('Dragon Finale can cast on an Infinity Master Dragon attack and untaps the full chosen group '+untap,()=>{
 let s=setup();
 give(s,0,'mana',[]);
 const attacker=add(s,0,'battle',GENMU),ally=add(s,0,'battle',MASTER,{tapped:true});
 const unrelated=add(s,0,'battle',NATURE,{tapped:true});
 const enemy=add(s,1,'battle',NATURE),other=add(s,1,'battle',NATURE,{tapped:true});
 const spell=add(s,0,'hand',TEN),all=physical(s);
 attack(s,attacker.uid);
 assert.equal(s.decision.task.op,'g34_Chance417');
 s=restored(s);
 choose(s,true);
 assert.equal(s.players[1].battle.every(x=>x.tapped),true);
 choose(s,untap?true:null);
 for(const x of [attacker,ally])assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,!untap);
 assert.equal(s.players[0].battle.find(x=>x.uid===unrelated.uid).tapped,true);
 finish(s);
 assert.equal(shield(s).shieldStack[0].uid,spell.uid);
 assert.deepEqual(physical(s),all);
 act(s,'noBlock');
 drain(s);
 end(s);
 assert.equal(s.active,1);
 for(const x of [enemy,other])assert.equal(s.players[1].battle.find(y=>y.uid===x.uid).tapped,true);
 end(s);
 end(s);
 for(const x of [enemy,other])assert.equal(s.players[1].battle.find(y=>y.uid===x.uid).tapped,false);
});

test('Dragon Finale can be paid normally and cannot be cast by an unrelated attacker',()=>{
 const s=setup(),ally=add(s,0,'battle',NATURE),spell=add(s,0,'hand',TEN);
 cast(s,spell);
 choose(s,null);
 finish(s);
 const second=add(s,0,'hand',TEN);
 attack(s,ally.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Chance417');
 assert.equal(inZone(s,0,'hand',second),true);
});

for(const selectCastle of [true,false])test('Meguru follows the Castle ruling when picking a fortification or its last shield card '+selectCastle,()=>{
 const s=setup(),castle={...inst('dm26rp1-043'),faceUp:true,shieldCardOnly:true};
 give(s,0,'shields',[NATURE,NATURE]);
 const [root,keep]=s.players[0].shields;
 root.shieldStack=[castle];
 const spell=add(s,0,'hand',MEGURU),all=physical(s);
 cast(s,spell);
 choose(s,keep.uid);
 end(s);
 end(s);
 choose(s,selectCastle?castle.uid:root.uid);
 assert.equal(inZone(s,0,'hand',castle),selectCastle);
 assert.equal(inZone(s,0,'hand',root),!selectCastle);
 assert.equal(inZone(s,0,'grave',castle),!selectCastle);
 assert.equal(s.players[0].shields.length,selectCastle?2:1);
 assert.equal(s.metrics[0].breaks,0);
 assert.deepEqual(physical(s),all);
});
