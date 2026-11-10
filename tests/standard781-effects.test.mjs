import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-781.json',import.meta.url)));
const ENTRY="dm24rp2-013",GOLF="dm24rp2-S09",ASAGI="dm24rp2-025";
const BODY="dm01-108",FIRE="dm01-097",HYPER="dm24ex1-023",RUSH="dm26rp1-014",DOGI="dm24rp1-DM1";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 781 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:781}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:781}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:781}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const finishAttack=s=>{
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
};
const playFrom=(s,x,origin)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid&&(a.origin??'hand')===origin);
const getBattle=(s,p,x)=>s.players[p].battle.find(y=>y.uid===x.uid);

test('Hyper Entry chooses an allied card in hand, preserves selection on restore, and grants the entrant both effects',()=>{
 let s=setup();
 const old=put(s,0,'battle',DOGI),wanted=put(s,0,'hand',HYPER),normal=put(s,0,'hand',BODY);
 const spell=play(s,ENTRY);
 assert.deepEqual(values(s),[wanted.uid,null]);
 s=restore(s);
 pick(s,wanted.uid);
 const entrant=getBattle(s,0,wanted);
 assert.equal(e.effectiveCard(entrant,s).power,e.card(HYPER).hyper.power);
 assert.equal(e.effectiveCard(entrant,s).blocker,true);
 assert.equal(getBattle(s,0,old).hyperActive,undefined);
 assert.ok(has(s,0,'hand',normal)&&has(s,0,'grave',spell));
 end(s);
 assert.ok(entrant.hyperActive&&e.effectiveCard(entrant,s).blocker);
 end(s);
 assert.equal(entrant.hyperActive,undefined);
 assert.equal(e.effectiveCard(entrant,s).blocker,undefined);
});

test('Hyper Entry supports declining and applies neither effect if entry is replaced by Caddy Beetle',()=>{
 for(const choose of [false,true]){
  const s=setup(),wanted=put(s,0,'hand',DOGI);
  put(s,1,'battle','dm22rp1-049');
  give(s,0,'mana',Array(5).fill('dm01-075'));
  play(s,ENTRY);
  pick(s,choose?wanted.uid:null);
  assert.ok(has(s,0,choose?'mana':'hand',wanted));
  assert.ok(!wanted.hyperActive&&!s.extLimits?.some(l=>l.ref?.uid===wanted.uid));
 }
});

test('Hyper Entry can be used as an S-Trigger and gives a creature Blocker for the next attack',()=>{
 const s=setup(),wanted=put(s,0,'hand',HYPER),first=put(s,1,'battle',FIRE),second=put(s,1,'battle',FIRE);
 s.active=1;
 give(s,0,'shields',[ENTRY,BODY]);
 attack(s,first.uid);
 finishAttack(s);
 act(s,'useTrigger');
 pick(s,wanted.uid);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.ok(e.effectiveCard(wanted,s).blocker);
 attack(s,second.uid);
 assert.equal(s.decision.type,'block');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===wanted.uid));
});

test('Golf reduces only Hyper creature summons, stacks from two sources, and keeps the cost floor at one',()=>{
 const s=setup(),one=put(s,0,'battle',GOLF),matching=put(s,0,'hand',DOGI),normal=put(s,0,'hand',BODY);
 const cost=x=>playFrom(s,x,'hand')[0]?.cost;
 assert.equal(cost(matching),3);
 assert.equal(cost(normal),e.card(BODY).cost);
 const two=put(s,0,'battle',GOLF);
 assert.equal(cost(matching),1);
 one.g35Ignored=two.g35Ignored=s.turn;
 assert.equal(cost(matching),6);
});

test('Golf releases every current unsealed Hyper ally only when attacking in Hyper Mode (QA 45136)',()=>{
 for(const active of [false,true]){
  const s=setup(),golf=put(s,0,'battle',GOLF),donor=put(s,0,'battle',BODY);
  const hyper=put(s,0,'battle',HYPER),rush=put(s,0,'battle',RUSH),enemy=put(s,1,'battle',HYPER);
  const sealed=put(s,0,'battle',HYPER);
  sealed.sealed=true;
  s.players[0].seals=[{...inst(BODY),faceDown:true,sealOf:sealed.uid}];
  if(active){act(s,'hyper',a=>a.uid===golf.uid);pick(s,donor.uid);}
  attack(s,golf.uid);
  assert.equal(e.power(golf,true,s),active?11000:6000);
  assert.equal(Boolean(hyper.hyperActive),active);
  assert.equal(Boolean(rush.hyperActive),active);
  assert.ok(!sealed.hyperActive&&!enemy.hyperActive&&!donor.hyperActive);
  finishAttack(s);
  const later=put(s,0,'battle',HYPER);
  assert.ok(!later.hyperActive);
 }
});

test('Asagi privately sends the chosen card to mana and the other to hand, without touching the third card',()=>{
 let s=setup();
 give(s,0,'deck',[BODY,HYPER,FIRE,BODY]);
 const [hand,mana,next]=s.players[0].deck;
 play(s,ASAGI);
 assert.deepEqual(values(s),[hand.uid,mana.uid]);
 s=restore(s);
 pick(s,mana.uid);
 if(s.decision?.task?.op==='g34_LookPick')pick(s,hand.uid);
 assert.ok(has(s,0,'mana',mana)&&has(s,0,'hand',hand));
 assert.equal(s.players[0].deck[0].uid,next.uid);
});

test('Asagi allows one paid Hyper summon from mana per copy and resets on the next own turn',()=>{
 const s=setup(),first=put(s,0,'mana',HYPER),second=put(s,0,'mana',RUSH),ordinary=put(s,0,'mana',BODY);
 const asagi=put(s,0,'battle',ASAGI);
 const actions=x=>playFrom(s,x,'mana').filter(a=>a.manaPermit?.startsWith('g450:'));
 assert.ok(actions(first).length&&actions(second).length);
 assert.equal(actions(ordinary).length,0);
 act(s,'play',a=>a.uid===first.uid&&a.origin==='mana');
 assert.ok(has(s,0,'battle',first));
 assert.equal(actions(second).length,0);
 const other=put(s,0,'battle',ASAGI);
 assert.deepEqual(actions(second).map(a=>a.manaPermit),['g450:'+other.uid+'@0']);
 assert.notEqual(actions(second)[0].manaPermit,'g450:'+asagi.uid+'@0');
 end(s);
 end(s);
 s.phase='main';
 assert.ok(actions(second).length);
});
