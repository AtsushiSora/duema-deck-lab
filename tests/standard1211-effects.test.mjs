import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CIAN='dm23rp2-023',MINT='dm23rp2-009',MOSQUITO='dm23rp2-026';
const GIANT='dm23rp2-024',MECHA='dm23rp2-029',SMALL='dm01-108',DIVER='dmrp01-041';
const DOUBLE='dmsd18-008',SEED='dmrp21-074',BIG='dm01-s06';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));return s;};
const put=(s,p,z,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id,face=0)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);return x;};
const restored=s=>JSON.parse(JSON.stringify(s));
const attacks=s=>e.getLegalActions(s).filter(a=>a.kind==='attack');
const chooseEntry=(s,op)=>{
 const isEntry=s.decision.type==='entryOrder',queue=isEntry?s.triggers.entries:s.pendingEffects;
 const item=queue.find(x=>x.task?.defs?.[0]?.op===op||op==='entry'&&x.effect==='entry');
 assert.ok(item);
 act(s,isEntry?'orderEntry':'orderEffect',a=>a.effectId===item.effectId);
};

test('seven official prints preserve three canonical cards, stats, face texts, images and limits',()=>{
 const m=read('support-phase-1211.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[CIAN,MINT,MOSQUITO]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[
  ['dm23rp2x-023',CIAN],['dm23rp2x-009',MINT],['dm23rp2x-026',MOSQUITO],['promoy22-027',MOSQUITO]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1211}),row.spec);
  for(const i of row.faces.keys()){
   const changed=structuredClone({...row,status:'complete'});
   changed.faces[i].abilityText+='\n未知の能力。';
   assert.throws(()=>standardCardSpec(changed,{phase:1211}));
  }
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.equal(catalogue.get(id).supported,true);
  assert.deepEqual([live.manaValue,live.limit,m.regulationVerification.limits[row.id]],[1,4,4]);
  assert.deepEqual(e.playFaces(live).map(c=>[c.type,c.cost,c.power,c.race,c.civilizations]),
   row.faces.map((f,i)=>[i?'spell':'creature',f.cost,i?undefined:+f.powerText,f.race,f.civilizations]));
  assert.equal(refs.find(c=>c.id===row.id&&c.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
 }
});

test('Cian pays 5, taps another Giant, wins a spell battle and draws before breaking one shield',()=>{
 let s=field();
 const ally=put(s,0,'battle',GIANT),tapped=put(s,0,'battle',GIANT,{tapped:true}),offRace=put(s,0,'battle',SMALL);
 const enemy=put(s,1,'battle',BIG),protectedEnemy=put(s,1,'battle',DIVER);
 const top=s.players[0].deck[0],shield=s.players[1].shields[0],cian=play(s,CIAN);
 assert.deepEqual(values(s),[ally.uid,null]);pick(s,ally.uid);
 assert.ok(ally.tapped&&tapped.tapped&&!offRace.tapped);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
 assert.deepEqual(values(s),[ally.uid,tapped.uid,offRace.uid,cian.uid]);pick(s,cian.uid);
 assert.equal(e.power(cian,false,s),11000);
 assert.deepEqual(values(s),[enemy.uid,null]);assert.ok(has(s,1,'battle',protectedEnemy));
 s=restored(s);pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'hand',top));
 assert.equal(s.players[1].shields.length,5);
 assert.equal(s.decision.task.op,'g34_Break497');pick(s,shield.uid);
 assert.ok(has(s,1,'hand',shield)&&has(s,0,'battle',cian));
 assert.equal(s.players[1].shields.length,4);
});

test('Musical boosts a chosen ally with no opponent or after declining a battle',()=>{
 for(const offer of [false,true]){
  const s=field(),ally=put(s,0,'battle',SMALL);
  if(offer)put(s,1,'battle',SMALL);
  const spell=play(s,CIAN,1);pick(s,ally.uid);
  if(offer)pick(s,null);
  assert.equal(s.decision,null);
  assert.equal(e.power(ally,false,s),e.card(ally).power+4000);
  assert.equal(ally.powerModifiers[0].spellCost,3);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
  assert.ok(has(s,0,'grave',spell));
 }
});

test('Cian can use Guardman and draws and breaks when winning that battle',()=>{
 const s=field();s.active=1;
 const cian=put(s,0,'battle',CIAN),friend=put(s,0,'battle',SMALL,{tapped:true}),enemy=put(s,1,'battle',DOUBLE);
 const top=s.players[0].deck[0],shield=s.players[1].shields[0];
 attack(s,enemy.uid,friend.uid);act(s,'guardman',a=>a.uid===cian.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 assert.ok(has(s,0,'battle',friend)&&has(s,1,'grave',enemy)&&cian.tapped);
 assert.ok(has(s,0,'hand',top));pick(s,shield.uid);
 assert.ok(has(s,1,'hand',shield));
});

test('Mint taps another Mecha and preselects a mode for each allied creature, in printed order',()=>{
 let s=field();
 const mecha=put(s,0,'battle',MECHA),ally=put(s,0,'battle',SMALL);
 put(s,0,'battle',SEED);
 const sealed=put(s,0,'battle',MECHA,{sealed:true});
 s.players[0].seals=[{...inst(SMALL),faceDown:true,sealOf:sealed.uid}];
 const first=put(s,1,'battle',SMALL),second=put(s,1,'battle',SMALL);
 const top=s.players[0].deck[0],mint=play(s,MINT);
 assert.deepEqual(values(s),[mecha.uid,null]);pick(s,mecha.uid);
 assert.ok(mecha.tapped&&!ally.tapped);
 assert.equal(s.decision.task.g1045Preselect,3);
 pick(s,1);pick(s,0);
 assert.equal(s.players[0].hand.length,0);
 s=restored(s);pick(s,0);
 assert.equal(s.decision.task.op,'g34_Target');pick(s,first.uid);
 assert.equal(s.players[0].hand.length,0);
 pick(s,second.uid);
 assert.ok(s.players[1].battle.every(x=>x.tapped)&&has(s,0,'hand',top));
 assert.ok(has(s,0,'battle',mint));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
});

test('Ringing supports repeated draws, zero allied creatures, and a missing legal tap target',()=>{
 const s=field();
 const spell=play(s,MINT,1);
 assert.equal(s.decision,null);assert.ok(has(s,0,'grave',spell));
 put(s,0,'battle',SMALL);put(s,0,'battle',SMALL);put(s,1,'battle',DIVER);
 const top=s.players[0].deck.slice(0,2);
 play(s,MINT,1);pick(s,1);pick(s,1);
 assert.deepEqual(s.players[0].hand,top);
 play(s,MINT,1);pick(s,1);pick(s,0);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,3);assert.equal(s.players[1].battle[0].tapped,false);
});

test('Mint blocks normally and both Twinpact creatures have W-Breaker',()=>{
 const s=field();s.active=1;
 const mint=put(s,0,'battle',MINT),enemy=put(s,1,'battle',SMALL);
 attack(s,enemy.uid);act(s,'block',a=>a.uid===mint.uid);drain(s);
 assert.ok(mint.tapped&&has(s,1,'grave',enemy));assert.equal(s.players[0].shields.length,5);
 for(const id of [CIAN,MINT]){
  const t=field(),x=put(t,0,'battle',id);attack(t,x.uid);
  if(e.getLegalActions(t).some(a=>a.kind==='noBlock'))act(t,'noBlock');
  act(t,'breakShields',a=>a.shields.length===2);
  assert.equal(t.players[1].shields.length,3);
 }
});

test('Mosquito optionally returns any own mana and naturally attacks creatures only',()=>{
 const s=field(),down=s.players[0].mana.at(-1);
 down.faceDown=true;
 const mosquito=play(s,MOSQUITO);
 pick(s,down.uid);assert.ok(has(s,0,'hand',down)&&!down.faceDown);
 play(s,MOSQUITO);pick(s,null);
 assert.equal(s.players[0].hand.length,1);
 const enemy=put(s,1,'battle',SMALL,{tapped:true});
 s.turn++;s.phase='attack';
 assert.deepEqual(attacks(s).filter(a=>a.uid===mosquito.uid).map(a=>a.target),[enemy.uid]);
});

function breakForMosquito(s,{double=false,previous=0}={}){
 s.active=1;s.players[0].brokenThisTurn=previous;
 give(s,0,'shields',[MOSQUITO,SMALL,SMALL,SMALL,SMALL]);
 const shields=s.players[0].shields,mosquito=shields[0];
 const attacker=put(s,1,'battle',double?DOUBLE:SMALL);
 if(double)give(s,1,'hand',[SMALL]);
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 if(double)act(s,'breakShields',a=>a.shields.includes(mosquito.uid)&&a.shields.length===2);
 act(s,'useTrigger',a=>a.uid===mosquito.uid);
 return {mosquito,attacker};
}

test('Mosquito plus can resolve after mana recovery and blocks player attacks from up to three chosen enemies for the turn',()=>{
 let s=field();
 const ready=Array.from({length:4},()=>put(s,1,'battle',SMALL));
 const protectedEnemy=put(s,1,'battle',DIVER),target=put(s,0,'battle',SMALL,{tapped:true});
 const mana=s.players[0].mana.at(-1);
 const {mosquito,attacker}=breakForMosquito(s,{double:true});
 assert.ok(has(s,0,'battle',mosquito)&&mosquito.triggerPlus);
 assert.equal(s.players[0].brokenThisTurn,2);
 chooseEntry(s,'entry');pick(s,mana.uid);assert.ok(has(s,0,'hand',mana));
 assert.ok(values(s).includes(attacker.uid)&&!values(s).includes(protectedEnemy.uid));
 pick(s,ready[0].uid);assert.ok(!values(s).includes(ready[0].uid));
 s=restored(s);pick(s,ready[1].uid);pick(s,ready[2].uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,3);
 for(const x of ready.slice(0,3)){
  assert.ok(!attacks(s).some(a=>a.uid===x.uid&&a.target==='player'));
  assert.ok(attacks(s).some(a=>a.uid===x.uid&&a.target===target.uid));
 }
 assert.ok(attacks(s).some(a=>a.uid===ready[3].uid&&a.target==='player'));
 act(s,'endTurn');drain(s);s.phase='attack';act(s,'endTurn');drain(s);
 s.phase='attack';assert.ok(attacks(s).some(a=>a.uid===ready[0].uid&&a.target==='player'));
});

test('Mosquito first single break has only the usual entry, while the second can decline all bonus targets',()=>{
 for(const previous of [0,1]){
  const s=field(),enemy=put(s,1,'battle',SMALL);
  const {mosquito}=breakForMosquito(s,{previous});
  assert.equal(!!mosquito.triggerPlus,Boolean(previous));
  if(previous){chooseEntry(s,'Select');pick(s,null);}
  pick(s,null);
  assert.ok(!s.extLimits?.some(x=>x.kind==='g567PlayerStop'));
  assert.ok(attacks(s).some(a=>a.uid===enemy.uid&&a.target==='player'));
 }
});
