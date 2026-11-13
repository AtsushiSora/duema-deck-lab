import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DANTE='dm26ex4-073',SINGLE='dmr20-012',CHURA='dmd08-021',OFFENSE='promoy14-074';
const FIRE='dm01-097',NATURE='dm01-108',SPELL='dm01-027',BLUEPRINT='dm36-070',DRAGON='dmr22-036';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function pick(s,value){
 act(s,'extended',a=>{
  const v=s.decision.choices[a.choice].value;
  return (v?.uid??v)===value;
 });
}
function play(s,id,face=0){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
 return x;
}

test('phase 1171 verifies three whole cards and keeps the standalone faces and reprint IDs separate',()=>{
 const m=read('tools/support-phase-1171.json'),registry=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[DANTE,CHURA,OFFENSE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmx22a-028',CHURA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1171}),row.spec);
  assert.deepEqual([c.cost,c.civilizations,c.race,c.power,c.limit],[f.cost,f.civilizations,f.race,Number(f.powerText),4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(images.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'},...row.faces.slice(1)]},{phase:1171}));
 }
 assert.notEqual(e.card(DANTE).name,e.card(SINGLE).name);
 assert.notEqual(e.card(DANTE).name,e.card(BLUEPRINT).name);
 assert.deepEqual(e.card(DANTE).g34Tasks,e.card(SINGLE).g34Tasks);
 assert.equal(e.card(DANTE).spellFace.name,e.card(BLUEPRINT).name);
});

for(const origin of ['mana','grave'])test('Dante recovers a spell face from '+origin+' and replaces destruction with deck top',()=>{
 const s=field(),own=s.players[0];
 const mana=put(s,0,'mana',SPELL),grave=put(s,0,'grave',DANTE),wrong=put(s,0,'grave',FIRE);
 const x=play(s,DANTE);
 assert.equal(s.decision.task.op,'g34_Select');
 const uids=s.decision.choices.map(o=>o.value?.uid??o.value);
 assert.ok(uids.includes(mana.uid)&&uids.includes(grave.uid)&&!uids.includes(wrong.uid));
 pick(s,(origin==='mana'?mana:grave).uid);
 assert.ok(own.hand.includes(origin==='mana'?mana:grave));
 assert.equal(e.effectiveCard(x,s).blocker,true);
 assert.equal(e.effectiveCard(x,s).noPlayerAttack,true);
 s.extTasks=[{op:'g34_ExactMove',p:1,owner:0,target:x.uid,to:'grave',source:SPELL}];
 act(s,'toAttack');
 assert.equal(own.deck[0],x);
 assert.ok(!own.grave.includes(x));
});

for(const fromShield of [false,true])test('Blueprint uses the same private top-six search in '+(fromShield?'the shield trigger window':'paid casting'),()=>{
 let s=field();
 const p=Number(fromShield),own=s.players[p];
 give(s,p,'deck',[FIRE,SPELL,NATURE,FIRE,SPELL,NATURE,DANTE]);
 const initial=own.deck.map(x=>x.uid),taken=initial[2],ordered=[initial[5],initial[4],initial[3],initial[1],initial[0]];
 if(fromShield){
  give(s,p,'shields',[DANTE]);
  attack(s,put(s,0,'battle',FIRE).uid);
  act(s,'noBlock');
  act(s,'useTrigger',a=>a.face===1);
 }else play(s,DANTE,1);
 assert.equal(s.decision.task.op,'g47_LookPick');
 assert.equal(s.decision.player,p);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[initial[0],initial[2],initial[3],initial[5],null]);
 pick(s,taken);
 s=JSON.parse(JSON.stringify(s));
 for(const uid of ordered.slice(0,-1))pick(s,uid);
 assert.ok(s.players[p].hand.some(x=>x.uid===taken));
 assert.deepEqual(s.players[p].deck.map(x=>x.uid),[initial[6],...ordered]);
 assert.equal(s.log.filter(x=>x.type==='reveal'&&x.cardId===NATURE).length,1);
 assert.ok(s.players[p].grave.some(x=>x.cardId===DANTE));
});

for(const accept of [false,true])test('Chura trades one whole shield for up to two cards: '+accept,()=>{
 const s=field(),own=s.players[0],attacker=put(s,0,'battle',CHURA);
 const shield=own.shields[0],extra=inst(SPELL),drawn=own.deck.slice(0,2);
 shield.shieldStack=[extra];
 attack(s,attacker.uid);
 assert.equal(s.decision.task.op,'g34_ShieldGrave');
 pick(s,accept?shield.uid:null);
 if(accept){
  assert.ok(own.grave.includes(shield)&&own.grave.includes(extra));
  assert.equal(s.decision.task.op,'g34_DrawUpTo');
  pick(s,true);
  pick(s,true);
 }
 assert.deepEqual(own.hand,accept?drawn:[]);
 assert.equal(own.shields.includes(shield),!accept);
 assert.equal(s.decision?.type,'block');
});

test('Chura cannot draw when there is no shield to put in the grave',()=>{
 const s=field(),x=put(s,0,'battle',CHURA);
 give(s,0,'shields',[]);
 attack(s,x.uid);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.decision?.type,'block');
});

test('Perfect Offense applies per friendly Dragon attack and expires at the turn boundary',()=>{
 const s=field(),own=s.players[0],dragon=put(s,0,'battle',DRAGON);
 const mono=put(s,0,'battle',FIRE),enemy=put(s,1,'battle','dm01-074',{tapped:true,powerModifiers:[{amount:27000}]});
 cast(s,OFFENSE);
 assert.equal(e.power(dragon,false,s),3000);
 attack(s,dragon.uid,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.ok(own.battle.includes(dragon));
 assert.equal(e.power(dragon,false,s),13000);
 dragon.tapped=false;
 attack(s,dragon.uid,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.equal(e.power(dragon,false,s),23000);
 attack(s,mono.uid,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.ok(!own.battle.includes(mono));
 act(s,'endTurn');
 assert.equal(e.power(dragon,false,s),3000);
});

test('Perfect Offense does not prevent a Slayer ability after the battle (QA45573)',()=>{
 const s=field(),dragon=put(s,0,'battle',DRAGON);
 const slayer=data.cards.find(x=>x.slayer&&x.power>0&&x.power<10000&&!x.g34Tasks&&!x.g172Death&&!x.effect);
 assert.ok(slayer);
 const victim=put(s,1,'battle',slayer.id,{tapped:true});
 cast(s,OFFENSE);
 attack(s,dragon.uid,victim.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.ok(s.players[0].grave.includes(dragon));
});
