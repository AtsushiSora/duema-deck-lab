import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const KUJI='dmr20-040',SARUEL='dmd28-015',FREN='dm17-016';
const NATURE='dm01-108',FIRE='dm01-097',HIGH='dmx22b-006',NINE='dmx22b-009',TEN='dmx22b-010';
const SEED='dm22ex1-086',ONIKAMASU='dmrp01-041',TRIGGER='dm23-051',AURA='dm15-020',HORNET='dm01-066';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const breaker=(s,x)=>e.effectiveCard(x,s).breaker??1;
function add(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function shieldAttack(s,attacker){
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
}

test('Three verified official prints keep their IDs, stats, images and copy limits',()=>{
 const manifest=read('tools/support-phase-1047.json');
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[KUJI,SARUEL,FREN]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.equal(catalogue.get(row.id).id,row.id);
  assert.ok(catalogue.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1047}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
});

test('Kujigojira may decline its own entry ramp or ramp for an allied creature at exactly 6000 power',()=>{
 const s=field(),kuji=add(s,0,'hand',KUJI),top=s.players[0].deck[0];
 const small=add(s,0,'hand',NATURE),high=add(s,0,'hand',HIGH),enemy=add(s,1,'hand',HIGH);
 const all=physical(s);
 play(s,kuji);
 assert.deepEqual(choices(s),[true,null]);
 pick(s,null);
 assert.equal(s.players[0].deck[0],top);
 assert.equal(breaker(s,kuji),2);
 play(s,small);
 assert.equal(s.decision,null);
 play(s,high);
 pick(s,true);
 assert.ok(has(s,0,'mana',top)&&!top.tapped);
 s.active=1;
 play(s,enemy);
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),all);
});

test('Kujigojira checks the creature’s power with a continuous effect already applied as it enters',()=>{
 const s=field();
 add(s,0,'battle',KUJI);
 add(s,0,'battle',AURA);
 const hornet=add(s,0,'hand',HORNET),top=s.players[0].deck[0];
 assert.equal(e.card(HORNET).power,4000);
 play(s,hornet);
 assert.equal(e.power(hornet,false,s),6000);
 pick(s,true);
 assert.ok(has(s,0,'mana',top));
});

test('Kujigojira may use its own ramp even when a replacement redirects the top card to the grave',()=>{
 const s=field(),kuji=add(s,0,'hand',KUJI),top=s.players[0].deck[0],n=s.players[0].mana.length;
 add(s,1,'battle',SEED);
 play(s,kuji);
 pick(s,true);
 assert.ok(has(s,0,'grave',top));
 assert.equal(s.players[0].mana.length,n);
});

test('Saruel targets one legal opponent on its own entry and uses the battlefield cost threshold of nine',()=>{
 let s=field();
 const saruel=add(s,0,'hand',SARUEL),nine=add(s,0,'hand',NINE),ten=add(s,0,'hand',TEN);
 const a=add(s,1,'battle',NATURE),b=add(s,1,'battle',FIRE),protectedEnemy=add(s,1,'battle',ONIKAMASU);
 const enemySeed=add(s,1,'battle',SEED),ally=add(s,0,'battle',NATURE);
 play(s,saruel);
 assert.deepEqual(new Set(choices(s)),new Set([a.uid,b.uid]));
 s=decodeBattleData(encodeBattleData(s));
 pick(s,a.uid);
 assert.ok(s.players[1].battle.find(x=>x.uid===a.uid).tapped);
 play(s,ten);
 assert.equal(s.decision,null);
 play(s,nine);
 assert.deepEqual(new Set(choices(s)),new Set([a.uid,b.uid]));
 pick(s,b.uid);
 for(const x of [protectedEnemy,enemySeed])assert.equal(s.players[1].battle.find(y=>y.uid===x.uid).tapped,false);
 assert.equal(s.players[0].battle.find(y=>y.uid===ally.uid).tapped,false);
 assert.equal(breaker(s,saruel),2);
});

test('Saruel retains Blocker and triggers from a friendly shield-trigger creature on the enemy turn',()=>{
 const s=Object.assign(field(),{active:1});
 const saruel=add(s,0,'battle',SARUEL),enemy=add(s,1,'battle',FIRE);
 give(s,0,'shields',[TRIGGER,NATURE]);
 const trigger=s.players[0].shields[0];
 attack(s,add(s,1,'battle',FIRE).uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===saruel.uid));
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 pick(s,enemy.uid);
 assert.ok(has(s,0,'battle',trigger)&&enemy.tapped);
});

test('Frendios skips its own entry and seeds and responds to an opposing creature',()=>{
 const s=field(),fren=add(s,0,'hand',FREN);
 play(s,fren);
 assert.equal(e.power(fren,false,s),1000);
 assert.equal(breaker(s,fren),1);
 play(s,add(s,0,'hand',SEED));
 assert.equal(e.power(fren,false,s),1000);
 s.active=1;
 play(s,add(s,1,'hand',NATURE));
 assert.equal(e.power(fren,false,s),6000);
 assert.equal(breaker(s,fren),2);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(fren,false,s),1000);
 assert.equal(breaker(s,fren),1);
});

test('Frendios gains power from both sides in one turn and two grants still break two shields',()=>{
 const s=field(),fren=add(s,0,'battle',FREN);
 give(s,1,'shields',[TRIGGER,NATURE,NATURE,NATURE,NATURE]);
 const trigger=s.players[1].shields[0];
 play(s,add(s,0,'hand',NATURE));
 assert.equal(e.power(fren,false,s),6000);
 play(s,add(s,0,'hand',FIRE));
 assert.equal(e.power(fren,false,s),11000);
 shieldAttack(s,fren);
 act(s,'breakShields',a=>a.shields.includes(trigger.uid));
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(has(s,1,'battle',trigger));
 assert.equal(e.power(fren,false,s),16000);
 assert.equal(breaker(s,fren),2);
});
