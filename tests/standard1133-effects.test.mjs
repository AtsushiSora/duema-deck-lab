import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CYCLICA='dm26ex1-N009',CALL='dm26ex1-N010',WER='dm26ex1-N014',AKANE='dm26ex1-N021';
const WING='dm25rp2-S09',STAR='promoy20-cp12',CADDY='dm22rp1-049',ZARD='dmrp17-s07';
const NATURE='dm01-108',FIRE='dm01-097',DARK='dm01-090',DEATH='dm01-027',SPARK='dm01-015';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
function destroy(s,x){
 play(s,DEATH);
 act(s,'effect',a=>a.targets?.some(y=>y.uid===x.uid));
}

test('all eight official prints share their canonical deck IDs and rules',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1133.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const images=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 assert.equal(manifest.cards.length,4);
 assert.equal(manifest.printAliases.length,4);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id;
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1133}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id,count:2}]),[{id,count:3}]);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  assert.ok(images.prints.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  const faces=structuredClone(row.faces);
  faces.at(-1).abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec({...row,faces,status:'complete'},{phase:1133}));
 }
});

for(const mode of ['direct','from Zardi','decline from Zardi','shield trigger'])test('Zardian Sign only offers legal multicolored Commands and can be declined: '+mode,()=>{
 const s=setup(),id='dmx01-015';
 const target=add(s,0,'hand',id);
 const single=add(s,0,'hand','dm25ex2-087');
 const expensive=add(s,0,'hand',WER);
 const noCommand=add(s,0,'hand',AKANE);
 if(mode==='shield trigger'){
  const attacker=add(s,1,'battle',FIRE);
  const shield=add(s,0,'shields',CYCLICA);
  s.active=1;
  s.players[0].shields=[shield];
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,'useTrigger',a=>a.face===1);
 }else if(mode.includes('Zardi')){
  const spell=add(s,0,'grave',CYCLICA);
  play(s,ZARD);
  pick(s,spell.uid);
 }else play(s,CYCLICA,1);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.ok(values(s).includes(target.uid));
 for(const y of [single,expensive,noCommand])assert.ok(!values(s).includes(y.uid));
 pick(s,mode==='decline from Zardi'?null:target.uid);
 assert.equal(has(s,0,'battle',target),mode!=='decline from Zardi');
});

for(const accept of [true,false])test('Sign Cyclica can revive a creature costing at most five after destruction: '+accept,()=>{
 const s=setup(),x=add(s,0,'battle',CYCLICA),y=add(s,0,'grave',AKANE);
 const expensive=add(s,0,'grave',WER),spell=add(s,0,'grave',DEATH);
 s.active=1;
 destroy(s,x);
 assert.ok(values(s).includes(y.uid)&&!values(s).includes(expensive.uid)&&!values(s).includes(spell.uid));
 pick(s,accept?y.uid:null);
 assert.equal(has(s,0,'battle',y),accept);
});

for(const [twin,id] of [[false,WING],[true,WING],[true,STAR],[true,CADDY]])test('Glorious Victory handles the replacement ceiling and prevents further replacements: '+twin+' '+id,()=>{
 const s=setup(),base=inst(FIRE);
 const x=add(s,1,'battle',id,id===CADDY?{}:{under:[base]});
 const high=add(s,1,'battle',CYCLICA);
 if(twin)add(s,0,'mana',AKANE);
 else add(s,0,'mana',AKANE,{faceDown:true});
 play(s,CALL,1);
 assert.ok(values(s).includes(x.uid)&&!values(s).includes(high.uid));
 pick(s,x.uid);
 assert.equal(has(s,1,'battle',x),!twin);
 assert.ok(has(s,1,'grave',base)||id===CADDY);
 assert.equal(has(s,1,'grave',x),twin);
 assert.ok(!has(s,1,'mana',x));
});

test('Koyuki gives freshly summoned creatures speed attacker while three distinct allied element costs remain',()=>{
 const s=setup();
 play(s,CALL);
 const x=play(s,AKANE);
 assert.equal(e.canCreatureAttack(s,0,x),false);
 const y=play(s,CYCLICA);
 assert.equal(e.canCreatureAttack(s,0,x),false);
 play(s,'dm23bd4-008');
 assert.equal(e.canCreatureAttack(s,0,x),true);
 assert.equal(e.canCreatureAttack(s,0,y),true);
});

for(const event of ['tap and recover','tap and decline','EX Life'])test('Weromanov reacts once to each tap or EX Life shield departure: '+event,()=>{
 const s=setup();
 const x=play(s,WER),original=s.players[0].shields.find(y=>y.uid===x.exLifeShieldUid);
 const card=add(s,0,'grave',SPARK);
 const discard=add(s,1,'hand',DARK);
 assert.ok(original);
 if(event==='EX Life'){
  s.active=1;
  destroy(s,x);
  assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',original));
 }else{
  x.entered=s.turn-1;
  attack(s,x.uid);
 }
 assert.equal(s.decision.task.op,'g34_Select');
 pick(s,event==='tap and decline'?null:card.uid);
 assert.equal(has(s,0,'hand',card),event!=='tap and decline');
 assert.equal(s.decision?.task?.op,'discard');
 pick(s,discard.uid);
 assert.ok(has(s,1,'grave',discard));
 assert.ok(!s.decision||s.decision.task?.source!==WER);
});

test('Akane replaces her destruction with mana',()=>{
 const s=setup(),x=add(s,0,'battle',AKANE);
 s.active=1;
 destroy(s,x);
 drain(s);
 assert.ok(has(s,0,'mana',x)&&!has(s,0,'grave',x));
});

test('Akane’s spell sends both players’ non-Giants to their owners’ mana, including evolution materials',()=>{
 const s=setup(),base={...inst(DARK),cardOwner:1};
 const allied=add(s,0,'battle','dm02-024',{under:[base]});
 const enemy=add(s,1,'battle',FIRE,{cardOwner:0});
 const giant=add(s,1,'battle',CADDY);
 const gear=add(s,0,'battle','dm14-110');
 play(s,AKANE,1);
 if(s.decision?.type==='leaveReplace')act(s,'allowLeave');
 drain(s);
 assert.ok(has(s,0,'battle',gear)&&has(s,1,'battle',giant));
 assert.ok(has(s,0,'mana',enemy));
 assert.ok(has(s,1,'mana',base));
 assert.ok(has(s,0,'mana',allied));
});

test('Akane can redirect an attack against another tapped creature with Guardman',()=>{
 const s=setup(),guard=add(s,0,'battle',AKANE),ally=add(s,0,'battle',NATURE,{tapped:true});
 const attacker=add(s,1,'battle',FIRE);
 s.active=1;
 attack(s,attacker.uid,ally.uid);
 act(s,'guardman',a=>a.uid===guard.uid);
 drain(s);
 assert.ok(has(s,0,'battle',ally)&&has(s,0,'mana',guard));
});
