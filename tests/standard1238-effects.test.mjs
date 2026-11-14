import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const IMAM='dmrp22-029',KIYURI='dmrp22-052',KAMAKIRI='dmrp22-065',MARCH='dm32-054';
const SEED='dm22ex1-086',SEED_CREATURE='dm22rp1-6A',REX='dmrp18-060',WATER='dm01-083';
const UNSELECTABLE='dm11-007',NO_SHINKALIZE='dmrp22-072';
const LOW='dm01-108',SLAYER='dm01-088',HIGH='dm01-s06',BLOCKER='dm01-076',DESTROY='dm01-027';
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
const options=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const evolve=(s,x,base)=>{play(s,x);act(s,'evolve',a=>a.baseUid===base.uid);};
function block(s,attacker,defender){
 attack(s,attacker.uid);act(s,'block',a=>a.uid===defender.uid);drain(s);
}
function destroy(s,target){
 play(s,add(s,s.active,'hand',DESTROY));
 act(s,'effect',a=>a.targets.some(t=>t.uid===target.uid));drain(s);
}

test('The three official DMRP22 cards retain their catalogue IDs, verified images and legal copy limits',()=>{
 const m=read('tools/support-phase-1238.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[IMAM,KIYURI,KAMAKIRI]);assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1238}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.equal(catalogue.get(row.id).supported,true);
  assert.deepEqual(data.cards.filter(other=>nameKey(other.name)===nameKey(row.name)).map(other=>other.id),[row.id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===row.id)?.image,row.image);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
});

test('Imamusou applies exactly two mana reduction for one or more friendly Tamaseeds',()=>{
 const s=field(),imam=add(s,0,'hand',IMAM);
 const quoted=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===imam.uid).cost;
 add(s,1,'battle',SEED);assert.equal(quoted(),5);
 const seed=add(s,0,'battle',SEED,{sealed:true});assert.equal(quoted(),5);
 const dual=add(s,0,'battle',SEED_CREATURE);assert.equal(quoted(),3);
 seed.sealed=false;assert.equal(quoted(),3);
 s.players[0].battle.splice(s.players[0].battle.indexOf(dual),1);
 const spent=()=>s.players[0].mana.filter(x=>x.tapped).length;
 const before=spent();play(s,imam);
 assert.equal(spent()-before,3);assert.ok(has(s,0,'battle',imam));
});

test('Imamusou uses G Strike from a broken shield and stops a later attacker',()=>{
 const s=field(1),attacker=add(s,1,'battle',LOW),later=add(s,1,'battle',LOW);
 give(s,0,'shields',[IMAM]);
 attack(s,attacker.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);pick(s,later.uid);drain(s);
 assert.ok(e.attackLocked(s,1,later));assert.equal(later.tapped,false);
 assert.equal(s.players[0].hand[0].cardId,IMAM);
});

test('QA41425: Deathmarch and the blocking Imamusou survive tapped and the power is restored',()=>{
 const s=field(),march=add(s,0,'battle',MARCH),imam=add(s,1,'battle',IMAM);
 block(s,march,imam);
 assert.ok(has(s,0,'battle',march)&&has(s,1,'battle',imam));
 assert.equal(march.tapped,true);assert.equal(imam.tapped,true);
 assert.equal(s.players[1].shields.length,5);
 assert.equal(e.power(imam,false,s),4000);
 assert.ok(!imam.powerModifiers?.some(m=>m.g1237BattleToken!==undefined));
 assert.ok(!s.attackLifecycle);
 s.phase='main';destroy(s,imam);assert.ok(has(s,1,'grave',imam));
});

test('QA42392: Imamusou survives Slayer and only protects itself during its own block',()=>{
 const s=field(),slayer=add(s,0,'battle',SLAYER),imam=add(s,1,'battle',IMAM);
 block(s,slayer,imam);
 assert.ok(has(s,1,'battle',imam)&&has(s,0,'grave',slayer));
 const high=add(s,0,'battle',HIGH),other=add(s,1,'battle',BLOCKER);
 block(s,high,other);assert.ok(has(s,1,'grave',other));
});

test('Imamusou can be destroyed by battle when it is attacked directly',()=>{
 const s=field(),high=add(s,0,'battle',HIGH),imam=add(s,1,'battle',IMAM,{tapped:true});
 attack(s,high.uid,imam.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);assert.ok(has(s,1,'grave',imam));
});

test('Kiyuri draws two and discards one on a Tamaseed, then Star Evolution leaves the base',()=>{
 const s=field(),seed=add(s,0,'battle',SEED),kiyuri=add(s,0,'hand',KIYURI);
 const [first,second]=s.players[0].deck;
 evolve(s,kiyuri,seed);
 assert.equal(kiyuri.under[0],seed);
 assert.deepEqual(new Set(options(s)),new Set([first.uid,second.uid]));
 pick(s,first.uid);drain(s);
 assert.ok(has(s,0,'grave',first)&&has(s,0,'hand',second));
 s.active=1;destroy(s,kiyuri);
 assert.ok(has(s,0,'grave',kiyuri)&&has(s,0,'battle',seed));
});

test('Kiyuri may evolve on a Water creature and does not draw or discard from that base',()=>{
 const s=field(),base=add(s,0,'battle',WATER),kiyuri=add(s,0,'hand',KIYURI);
 evolve(s,kiyuri,base);drain(s);
 assert.equal(s.players[0].deck.length,20);assert.equal(s.players[0].hand.length,0);
 attack(s,kiyuri.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.decision.count,2);act(s,'breakShields');drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Kamakiri destroys exactly one opposing blocker when evolving from a Tamaseed',()=>{
 const s=field(),seed=add(s,0,'battle',SEED),kamakiri=add(s,0,'hand',KAMAKIRI);
 const first=add(s,1,'battle',BLOCKER),second=add(s,1,'battle',IMAM),other=add(s,1,'battle',HIGH),own=add(s,0,'battle',BLOCKER);
 evolve(s,kamakiri,seed);
 assert.deepEqual(new Set(options(s)),new Set([first.uid,second.uid]));
 pick(s,second.uid);drain(s);
 assert.ok(has(s,1,'grave',second)&&has(s,1,'battle',first)&&has(s,1,'battle',other)&&has(s,0,'battle',own));
});

test('Kamakiri may evolve on a non-Tamaseed RexStar and does not destroy on that base',()=>{
 const s=field(),base=add(s,0,'battle',REX),kamakiri=add(s,0,'hand',KAMAKIRI),blocker=add(s,1,'battle',BLOCKER);
 evolve(s,kamakiri,base);drain(s);assert.ok(has(s,1,'battle',blocker));
});

test('Kamakiri can destroy an unselectable blocker under rule 701.34b',()=>{
 const s=field(),seed=add(s,0,'battle',SEED),kamakiri=add(s,0,'hand',KAMAKIRI);
 const target=add(s,1,'battle',UNSELECTABLE);
 evolve(s,kamakiri,seed);pick(s,target.uid);drain(s);
 assert.ok(has(s,1,'grave',target));
});

test('Both Star Evolutions reject a RexStar Tamaseed without Shinkalize (QA41412)',()=>{
 const s=field(),invalid=add(s,0,'battle',NO_SHINKALIZE),valid=add(s,0,'battle',SEED);
 for(const id of [KIYURI,KAMAKIRI]){
  const eligible=e.evolutionBases(s,0,e.card(id)).map(x=>x.uid);
  assert.ok(eligible.includes(valid.uid)&&!eligible.includes(invalid.uid));
 }
});
