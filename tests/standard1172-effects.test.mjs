import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const WHITE='dmx16-072',ACCUMULATED='dmrp02-072',TROY='dm23sd2-014';
const FIRE='dm01-097',NATURE='dm01-108',DEMON='dm01-027',MECHA='dm24rp2-053',SEED='dmrp22-048';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function pick(s,value){
 act(s,'extended',a=>{
  const v=s.decision.choices[a.choice].value;
  return (v?.uid??v)===value;
 });
}

test('phase 1172 verifies complete definitions, restrictions and both reprints',()=>{
 const m=read('tools/support-phase-1172.json'),registry=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[WHITE,ACCUMULATED,TROY]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm23rp2-055',TROY],['dm23rp2x-055',TROY]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1172}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   ['spell',f.cost,f.civilizations,f.race,0,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(images.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1172}));
 }
});

test('White Blueprint shows five, takes all printed vanilla creatures and orders the remaining cards',()=>{
 let s=field();
 give(s,0,'deck',[FIRE,DEMON,MECHA,NATURE,ACCUMULATED,FIRE]);
 const [one,spell,withAbility,two,otherSpell,last]=s.players[0].deck;
 cast(s,WHITE);
 assert.equal(s.decision.task.op,'g34_Order');
 assert.deepEqual(s.players[0].hand,[one,two]);
 const preview=s.log.find(l=>l.type==='reveal'&&l.cardId===WHITE);
 assert.ok(preview);
 assert.ok(preview.text.includes([FIRE,DEMON,MECHA,NATURE,ACCUMULATED].map(id=>e.card(id).name).join('・')));
 pick(s,otherSpell.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,spell.uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[last.uid,otherSpell.uid,spell.uid,withAbility.uid]);
});

for(const fromShield of [false,true])test('Accumulated Magic draws once plus only exact names from its own grave: '+fromShield,()=>{
 const s=field(),p=Number(fromShield),own=s.players[p];
 give(s,p,'grave',[ACCUMULATED,ACCUMULATED,'dmrp04s-037','dm25ex2-086',DEMON]);
 give(s,1-p,'grave',[ACCUMULATED]);
 const expected=own.deck.slice(0,3);
 if(fromShield){
  give(s,p,'shields',[ACCUMULATED]);
  attack(s,put(s,0,'battle',FIRE).uid);
  act(s,'noBlock');
  act(s,'useTrigger',a=>a.cardId===ACCUMULATED);
 }else cast(s,ACCUMULATED);
 assert.equal(s.decision,null);
 assert.deepEqual(own.hand,expected);
 assert.equal(own.grave.filter(x=>x.cardId===ACCUMULATED).length,3);
});

for(const mode of ['normal','decline','replacement'])test('Troy deploys from hand only after choosing an own Mecha or Shinobi: '+mode,()=>{
 const s=field(),own=s.players[0];
 const source=put(s,0,'battle',SEED),enemy=put(s,1,'battle',MECHA);
 const normal=put(s,0,'battle',FIRE),eligible=put(s,0,'hand',MECHA);
 const expensive=put(s,0,'hand','dm23rp2-OR01'),wrong=put(s,0,'hand',FIRE);
 if(mode==='replacement')source.g26Stay=true;
 cast(s,TROY);
 assert.equal(s.decision.task.op,'g34_Target');
 assert.deepEqual(s.decision.choices.map(o=>o.value?.uid??o.value),[source.uid,null]);
 pick(s,mode==='decline'?null:source.uid);
 if(mode!=='decline'){
  assert.equal(s.decision.task.op,'g34_Select');
  assert.deepEqual(s.decision.choices.map(o=>o.value?.uid??o.value),[eligible.uid,null]);
  pick(s,eligible.uid);
 }
 assert.equal(s.decision,null);
 assert.equal(own.battle.includes(source),mode!=='normal');
 assert.equal(own.hand.includes(source),mode==='normal');
 assert.equal(own.battle.includes(eligible),mode!=='decline');
 assert.ok(own.hand.includes(expensive)&&own.hand.includes(wrong)&&own.battle.includes(normal));
 assert.ok(s.players[1].battle.includes(enemy));
});

test('Hakumei can discard a broken Nibaiken and it can enter by replacement on the opposing turn (QA48484)',()=>{
 const s=field(),own=s.players[1];
 const hakumei=put(s,1,'hand','dmex14-093'),attacker=put(s,0,'battle',FIRE);
 give(s,1,'shields',['dm26rp1-S011']);
 const [nibaiken]=own.shields;
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g13_SB');
 pick(s,hakumei.uid);
 assert.equal(s.decision.player,1);
 assert.match(s.decision.title,/捨てるかわりに/);
 pick(s,true);
 drain(s);
 assert.ok(own.battle.includes(nibaiken)&&own.battle.includes(hakumei));
 assert.ok(!own.grave.includes(nibaiken));
});
