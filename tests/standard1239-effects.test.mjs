import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LUPIA='dmrp22-069',TEAM='dmrp22-016',TATE='dm24rp1-001',PRINT='dm24ex3-rp1001';
const KAMAKIRI='dmrp22-065',KIYURI='dmrp22-052',CAREIKO='dm22ex1-086',DUAL='dm22rp1-6A';
const LOW='dm01-108',WATER='dm01-083',FIRE='dm01-097',BLOCKER='dm01-076',DESTROY='dm01-027';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(LOW));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,z,id,properties={}){
 const x=Object.assign(inst(id),properties);s.players[p][z].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const pick=(s,wanted)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===wanted;
});
const action=(s,x)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const ids=rows=>rows.map(x=>x.uid);
function breakWith(s,x){
 attack(s,x.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
}

test('The three official cards and the Tatef reprint resolve to their original IDs and images',()=>{
 const m=read('tools/support-phase-1239.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LUPIA,TEAM,TATE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,TATE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1239}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(other=>nameKey(other.name)===nameKey(row.name)).map(other=>other.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Lupia is a usable Tamaseed and only its own evolution gets the two-mana reduction',()=>{
 const s=field(),lupia=add(s,0,'hand',LUPIA),kiyuri=add(s,0,'hand',KIYURI);
 const other=add(s,0,'battle',WATER);
 play(s,lupia);assert.ok(has(s,0,'battle',lupia));assert.equal(e.isCreature(s,lupia),false);
 give(s,0,'mana',[WATER,LOW,LOW]);
 play(s,kiyuri);
 const choices=e.getLegalActions(s).filter(a=>a.kind==='evolve');
 assert.deepEqual(new Map(choices.map(a=>[a.baseUid,a.cost])),new Map([[lupia.uid,1],[other.uid,3]]));
 act(s,'evolve',a=>a.baseUid===other.uid);drain(s);
 assert.ok(s.players[0].mana.every(x=>x.tapped));assert.ok(has(s,0,'battle',lupia));
});

test('A one-mana Kamakiri summon on Lupia still pays fire mana and resolves the Tamaseed entry ability',()=>{
 const s=field(),lupia=add(s,0,'battle',LUPIA),kamakiri=add(s,0,'hand',KAMAKIRI);
 const other=add(s,0,'battle',FIRE),target=add(s,1,'battle',BLOCKER);
 give(s,0,'mana',[WATER]);assert.equal(action(s,kamakiri),undefined);
 give(s,0,'mana',[FIRE]);assert.equal(action(s,kamakiri).cost,1);
 play(s,kamakiri);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[lupia.uid]);
 act(s,'evolve',a=>a.baseUid===lupia.uid);pick(s,target.uid);drain(s);
 assert.ok(s.players[0].mana[0].tapped&&has(s,1,'grave',target));
 assert.ok(has(s,0,'battle',other));assert.equal(kamakiri.under[0],lupia);
 assert.equal(e.card(KAMAKIRI).cost,2);
});

test('Lupia in an opponent field or sealed cannot discount a normal evolution',()=>{
 const s=field(),kamakiri=add(s,0,'hand',KAMAKIRI);
 add(s,1,'battle',LUPIA);add(s,0,'battle',LUPIA,{sealed:true});add(s,0,'battle',FIRE);
 give(s,0,'mana',[FIRE]);assert.equal(action(s,kamakiri),undefined);
 give(s,0,'mana',[FIRE,LOW]);assert.equal(action(s,kamakiri).cost,2);
});

test('The Trio counts both Tamaseeds and Tamaseed creatures, then breaks own shields together and allows triggers',()=>{
 const s=field();
 give(s,0,'shields',[LOW,DESTROY,LOW,LOW]);
 const [one,trigger]=s.players[0].shields;
 add(s,0,'battle',LUPIA);add(s,0,'battle',DUAL);
 const sealed=add(s,0,'battle',CAREIKO,{sealed:true});
 add(s,0,'seals',LOW,{sealOf:sealed.uid});add(s,1,'battle',LUPIA);
 const target=add(s,1,'battle',FIRE),team=add(s,0,'hand',TEAM);
 play(s,team);assert.ok(e.effectiveCard(team,s).blocker);
 pick(s,one.uid);assert.equal(s.players[0].shields.length,4);
 pick(s,trigger.uid);
 assert.equal(s.players[0].shields.length,2);assert.equal(s.players[0].brokenThisTurn,2);
 assert.equal(s.players[1].shields.length,5);assert.equal(s.triggers.player,0);
 drain(s);assert.ok(has(s,1,'grave',target));
});

test('The Trio with no friendly Tamaseeds leaves every shield intact',()=>{
 const s=field(),before=ids(s.players[0].shields);
 add(s,1,'battle',LUPIA);
 play(s,add(s,0,'hand',TEAM));drain(s);
 assert.deepEqual(ids(s.players[0].shields),before);
});

test('Tatef replaces each W Breaker shield with a new own shield, without moving the selected shields',()=>{
 const s=field(),tate=add(s,0,'battle',TATE);
 give(s,1,'shields',[DESTROY,DESTROY]);
 const defending=ids(s.players[1].shields),top=ids(s.players[0].deck.slice(0,2));
 breakWith(s,tate);
 assert.deepEqual(ids(s.players[0].shields.slice(-2)),top);
 assert.deepEqual(ids(s.players[1].shields),defending);
 assert.equal(s.players[1].hand.length,0);assert.equal(s.metrics[0].breaks,0);
 assert.ok(!s.triggers);
});

test('The shield break replacement does not chain into Careiko, while the leave ability does',()=>{
 const s=field(),tate=add(s,0,'battle',TATE);
 add(s,1,'battle',CAREIKO);
 const initial=ids(s.players[0].deck.slice(0,3));
 breakWith(s,tate);assert.deepEqual(ids(s.players[0].shields.slice(-2)),initial.slice(0,2));
 s.active=1;s.phase='main';
 play(s,add(s,1,'hand',DESTROY));
 act(s,'effect',a=>a.targets.some(t=>t.uid===tate.uid));drain(s);
 assert.ok(has(s,0,'grave',tate));
 assert.ok(s.players[0].grave.some(x=>x.uid===initial[2]));
 assert.equal(s.players[0].shields.length,7);
});

test('Tatef gains a shield after being returned to hand and can still attack directly',()=>{
 const s=field(),tate=add(s,0,'battle',TATE),top=s.players[0].deck[0];
 s.active=1;play(s,add(s,1,'hand','dmr15-041'));
 pick(s,tate.uid);drain(s);
 assert.ok(has(s,0,'hand',tate)&&has(s,0,'shields',top));

 const direct=field(),fresh=add(direct,0,'battle',TATE);
 give(direct,1,'shields',[]);breakWith(direct,fresh);
 assert.equal(direct.winner,0);assert.equal(direct.players[0].shields.length,5);
});

test('A cost-reduction lock also suppresses Lupia’s base discount',()=>{
 const s=field(),lupia=add(s,0,'battle',LUPIA),kamakiri=add(s,0,'hand',KAMAKIRI);
 add(s,1,'battle','dmrp22-027');
 give(s,0,'mana',[FIRE]);assert.equal(action(s,kamakiri),undefined);
 give(s,0,'mana',[FIRE,LOW]);assert.equal(action(s,kamakiri).cost,2);
 play(s,kamakiri);act(s,'evolve',a=>a.baseUid===lupia.uid);drain(s);
 assert.ok(s.players[0].mana.every(x=>x.tapped));
});

test('When shield placement is prohibited, Tatef still breaks its selected shields',()=>{
 const s=field(),tate=add(s,0,'battle',TATE);
 add(s,1,'battle','dmrp22-037');
 breakWith(s,tate);
 assert.equal(s.players[0].shields.length,5);assert.equal(s.players[0].deck.length,20);
 assert.equal(s.players[1].shields.length,3);assert.equal(s.metrics[0].breaks,2);
});
