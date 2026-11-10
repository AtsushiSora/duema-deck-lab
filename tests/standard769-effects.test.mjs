import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-769.json',import.meta.url)));
const IEPP='dm23rp2-067',BLEACH='dm23rp2-035',ZAZARM='dm23rp3-066',JENG='dm23rp3-017';
const BODY='dm01-108',BLOCKER='dm01-001',ARMORED='dm23rp3-063',TRIGGER='dmr19-081';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function advanceTo(s,op){
 for(let n=0;s.decision&&s.decision.task?.op!==op;n++){
  assert.ok(n<20);
  e.step(s,e.chooseAI(s));
 }
 assert.equal(s.decision?.task?.op,op);
}

test('four complete definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:769}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:769}));
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
   assert.deepEqual(print.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})),row.faces.map(f=>({...f,abilityText:f.abilityText.replace(/ /g,'')})));
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

test('Ieppi attacks on its summon turn and raids after three actual shield groups on both sides',()=>{
 let s=setup();
 const watcher=play(s,IEPP);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===watcher.uid));
 give(s,0,'deck',[ARMORED,BODY,BODY,BODY,BODY]);
 const eligible=s.players[0].deck[0];
 task(s,'g34_Break497',0,{owner:'self',n:1});
 pick(s,s.players[0].shields[0].uid);
 task(s,'g34_Break497',0,{n:2});
 pick(s,s.players[1].shields[0].uid);
 pick(s,s.players[1].shields[1].uid);
 assert.deepEqual(s.players.map(p=>p.brokenThisTurn||0),[1,2]);
 s=restore(s);
 end(s);
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.equal(s.decision.task.max,8);
 pick(s,eligible.uid);
 drain(s);
 assert.ok(has(s,0,'battle',eligible));
});

test('Ieppi excludes a shield recovered to hand, extra cards in a shield stack and the opponent turn',()=>{
 for(const situation of ['hand','stack','otherTurn']){
  const s=setup();
  put(s,0,'battle',IEPP);
  if(situation==='otherTurn')s.active=1;
  if(situation==='hand'){
   task(s,'g34_ShieldHand',0,{g238ShieldHand:true});
   pick(s,s.players[0].shields[0].uid);
  }
  if(situation==='stack')s.players[1].shields[0].shieldStack=[inst(BODY),inst(BODY)];
  const n=situation==='otherTurn'?3:2;
  task(s,'g34_Break497',s.active,{n});
  const shields=s.players[1-s.active].shields.slice(0,n);
  for(const x of shields)pick(s,x.uid);
  assert.equal(s.players[1-s.active].brokenThisTurn,n);
  end(s);
  assert.notEqual(s.decision?.task?.op,'g34_RaidPick',situation);
 }
});

test('Bleach locks the chosen blocker and attacker until its own next turn without stopping untaps',()=>{
 const s=setup(),bleach=put(s,0,'battle',BLEACH),enemy=put(s,1,'battle',BLOCKER);
 attack(s,bleach.uid);
 pick(s,enemy.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===enemy.uid));
 drain(s);
 enemy.tapped=true;
 end(s);
 drain(s);
 assert.equal(s.active,1);
 assert.equal(enemy.tapped,false);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid));
 end(s);
 drain(s);
 assert.equal(s.active,0);
 assert.ok(!s.extLimits.some(x=>x.g190Freeze&&x.uid===enemy.uid));
});

test('Bleach reacts to a real untap and offers intermediate discounts only on the next spell',()=>{
 let s=setup();
 const bleach=put(s,0,'battle',BLEACH);
 task(s,'g34_Target',0,{owner:'self',untap:true});
 pick(s,bleach.uid);
 assert.ok(!s.extLimits?.some(x=>x.kind==='g456NextReduction'));
 bleach.tapped=true;
 task(s,'g34_Target',0,{owner:'self',untap:true});
 pick(s,bleach.uid);
 s=restore(s);
 s.phase='main';
 const spell=put(s,0,'hand','dm23rp2-070');
 const choices=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===spell.uid);
 assert.deepEqual(choices.map(a=>a.cost).sort((a,b)=>a-b),[2,3,4,5]);
 const before=s.players[0].mana.filter(x=>x.tapped).length;
 act(s,'play',a=>a.uid===spell.uid&&a.g456Reduction===1);
 drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,before+4);
 assert.ok(!s.extLimits.some(x=>x.kind==='g456NextReduction'));
});

test('Zazarm may tap after a Shield Trigger summon and only compels legal attacks',()=>{
 for(const accept of [false,true]){
  let s=setup();
  const attacker=put(s,1,'battle',BODY),next=put(s,1,'battle',BODY);
  give(s,0,'shields',[ZAZARM,BODY]);
  s.active=1;
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,'useTrigger');
  advanceTo(s,'g34_Offer');
  const source=s.players[0].battle.find(x=>x.cardId===ZAZARM);
  assert.equal(source.tapped,false);
  s=restore(s);
  pick(s,accept?true:null);
  drain(s);
  assert.equal(s.players[0].battle.find(x=>x.uid===source.uid).tapped,accept);
  const targets=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===next.uid).map(a=>a.target);
  assert.ok(targets.length);
  assert.deepEqual([...new Set(targets)],[accept?source.uid:'player']);
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 }
});

test('Jeng can decline its shield pickup or recover once per card in a shield stack without its S-Trigger',()=>{
 let s=setup();
 give(s,0,'shields',[TRIGGER,BODY]);
 const root=s.players[0].shields[0];
 root.shieldStack=[inst(BODY)];
 const under=root.shieldStack[0],a=put(s,0,'grave',BODY),b=put(s,0,'grave',BODY);
 play(s,JENG);
 const declined=restore(s);
 pick(declined,null);
 assert.ok(has(declined,0,'shields',root));
 assert.equal(declined.decision,null);
 pick(s,root.uid);
 assert.ok(has(s,0,'hand',root)&&has(s,0,'hand',under));
 assert.ok(!s.triggers);
 assert.equal(s.players[0].brokenThisTurn||0,0);
 s=restore(s);
 advanceTo(s,'g34_Select');
 pick(s,a.uid);
 advanceTo(s,'g34_Select');
 pick(s,b.uid);
 assert.ok(has(s,0,'hand',a)&&has(s,0,'hand',b));
 assert.equal(s.decision,null);
});

test('Jeng ignores the opponent shield zone and can decline grave recovery',()=>{
 const s=setup();
 put(s,0,'battle',JENG);
 const grave=put(s,0,'grave',BODY);
 task(s,'g34_Break497',0,{n:1});
 pick(s,s.players[1].shields[0].uid);
 assert.equal(s.decision,null);
 task(s,'g34_Break497',0,{owner:'self',n:1});
 pick(s,s.players[0].shields[0].uid);
 advanceTo(s,'g34_Select');
 pick(s,null);
 assert.ok(has(s,0,'grave',grave));
});
