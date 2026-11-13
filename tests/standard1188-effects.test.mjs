import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const WORLD='dmr23-040',MARRIAGE='dmx11-028',GIANT='dm27-010';
const TEMPLE='dm23ex3-030',ZENITH='dmx13-011',GYM='dmr21-047',FIONA='dmex12-s16',PARTHENON='dmex12-023';
const NATURE='dm01-108',FIRE='dm01-097',LIGHT='dm01-075',TRIGGER='dm01-110';
const MOMO='dm26ex4-017',COURTNEY='dm13-015',FUJIN='dmrp22-037';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(NATURE));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const playable=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid);

test('three official cards and the Marriage Blue reprint resolve to their original IDs',()=>{
 const m=read('tools/support-phase-1188.json'),catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[WORLD,MARRIAGE,GIANT]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[['dmex13-022',MARRIAGE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   [id===GIANT?'creature':'spell',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1188}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(refs.find(ref=>ref.id===row.id&&ref.canonicalId===id)?.image,row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  const changed={...f,abilityText:f.abilityText+'\n未知の能力。'};
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[changed]},{phase:1188}));
 }
});

test('World Stop charges tapped and only the opposing D2 deployment is limited until the caster starts a turn',()=>{
 let s=field();
 s.phase='charge';
 const mana=put(s,0,'hand',WORLD);
 act(s,'charge',a=>a.uid===mana.uid);
 assert.ok(mana.tapped&&has(s,0,'mana',mana));
 cast(s,WORLD);
 assert.ok(e.canCastSpell(s,0,e.card(GYM)));
 end(s);
 s=restore(s);
 assert.equal(s.active,1);
 act(s,'skipCharge');
 const gym=put(s,1,'hand',GYM),parthenon=put(s,1,'hand',PARTHENON);
 assert.equal(playable(s,gym),false);
 assert.equal(playable(s,parthenon),true);
 assert.equal(e.canEnterCreature(s,1,e.card(GYM),{origin:'mana',execution:false}),true);
 end(s);
 assert.equal(s.active,0);
 assert.equal(e.canCastSpell(s,1,e.card(GYM)),true);
});

test('World Stop permits Fiona to put a D2 field from mana without executing it',()=>{
 const s=field();
 cast(s,WORLD);
 end(s);
 act(s,'skipCharge');
 const fieldCard=put(s,1,'mana',GYM);
 cast(s,FIONA);
 pick(s,fieldCard.uid);
 drain(s);
 assert.ok(has(s,1,'battle',fieldCard));
 assert.ok(!has(s,1,'mana',fieldCard));
});

test('World Stop prevents Temple from spending its D-switch, and Genmu suspends the lock while present',()=>{
 const s=field(),temple=put(s,1,'battle',TEMPLE);
 cast(s,WORLD);
 end(s);
 act(s,'skipCharge');
 cast(s,ZENITH);
 assert.ok(!s.decision?.task?.op?.includes('CrystalSwitch'));
 drain(s);
 assert.equal(temple.g1175DSwitched,undefined);
 const genmu=put(s,0,'battle',GEN);
 assert.equal(e.canCastSpell(s,1,e.card(GYM)),true);
 cast(s,ZENITH);
 assert.equal(s.decision.task.op,'g34_CrystalSwitch1175');
 const mana=s.players[1].mana[0];
 mana.faceDown=mana.tapped=true;
 pick(s,true);
 drain(s);
 assert.equal(temple.g1175DSwitched,true);
 assert.equal(mana.tapped,false);
 s.players[0].battle.splice(s.players[0].battle.indexOf(genmu),1);
 assert.equal(e.canCastSpell(s,1,e.card(GYM)),false);
});

test('Marriage Blue adds two separate face-down shields and the chosen two go to grave on the next own turn',()=>{
 let s=field();
 const [old]=s.players[0].shields,[first,second]=s.players[0].deck;
 const stacked=inst(TRIGGER);
 old.shieldStack=[stacked];
 cast(s,MARRIAGE);
 assert.deepEqual(s.players[0].shields.slice(-2).map(x=>x.uid),[first.uid,second.uid]);
 assert.ok(!first.faceUp&&!second.faceUp&&!first.shieldStack&&!second.shieldStack);
 end(s);
 assert.equal(s.active,1);
 assert.equal(s.players[0].shields.length,7);
 end(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_ShieldGrave588');
 pick(s,old.uid);
 s=restore(s);
 assert.equal(s.players[0].shields.length,7);
 assert.ok(!s.decision.choices.some(c=>c.value===old.uid||c.value===null));
 pick(s,second.uid);
 assert.equal(s.players[0].shields.length,5);
 assert.ok([old,stacked,second].every(x=>has(s,0,'grave',x)));
 assert.ok(has(s,0,'shields',first));
 assert.equal(s.metrics[0].triggers,0);
 assert.equal(s.g537Delays.length,0);
});

test('Marriage Blue can use S Trigger with no mana and resolves its delay on the immediately upcoming own turn',()=>{
 const s=field();
 give(s,1,'mana',[]);
 give(s,1,'shields',[MARRIAGE]);
 const [shield]=s.players[1].shields;
 attack(s,put(s,0,'battle',FIRE).uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.ok(has(s,1,'grave',shield));
 assert.equal(s.players[1].shields.length,2);
 end(s);
 assert.equal(s.decision.player,1);
 while(s.decision?.task?.op==='g34_ShieldGrave588')pick(s,s.decision.choices[0].value);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.metrics[1].triggers,1);
});

for(const count of [0,1])test('Marriage Blue still schedules its mandatory loss of up to two shields after shield addition is prevented: '+count,()=>{
 const s=field();
 put(s,1,'battle',FUJIN);
 give(s,0,'shields',Array(count).fill(TRIGGER));
 cast(s,MARRIAGE);
 assert.equal(s.players[0].shields.length,count);
 assert.equal(s.g537Delays.length,1);
 end(s);
 end(s);
 if(count)pick(s,s.players[0].shields[0].uid);
 assert.equal(s.players[0].shields.length,0);
 assert.equal(s.metrics[0].triggers,0);
 assert.equal(s.g537Delays.length,0);
});

test('Marriage Blue delayed effect is ignored by opposing Momomugen in hyper mode',()=>{
 const s=field();
 cast(s,MARRIAGE);
 put(s,1,'battle',MOMO,{hyperActive:true});
 assert.equal(e.spellIgnored(s,e.card(MARRIAGE)),true);
 end(s);
 end(s);
 assert.equal(s.players[0].shields.length,7);
 assert.equal(s.g537Delays.length,0);
});

test('Civilization Breaker reads the distinct mana civilizations when the defender declines to block',()=>{
 const s=field();
 give(s,0,'mana',[WORLD,LIGHT,NATURE,FIRE]);
 s.players[0].mana[3].faceDown=true;
 const giant=put(s,0,'battle',GIANT);
 attack(s,giant.uid);
 assert.equal(e.effectiveCard(giant,s).breaker,3);
 put(s,0,'mana','dm01-090');
 act(s,'noBlock');
 assert.equal(s.decision.type,'breakChoice');
 assert.equal(s.decision.count,4);
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,1);
});

test('Civilization Breaker counts five granted colors and zero when mana has no civilization',()=>{
 let s=field();
 give(s,0,'mana',[NATURE]);
 put(s,0,'battle',COURTNEY);
 attack(s,put(s,0,'battle',GIANT).uid);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,0);

 s=field();
 give(s,0,'mana',[NATURE]);
 s.players[0].mana[0].faceDown=true;
 attack(s,put(s,0,'battle',GIANT).uid);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,5);
 assert.equal(s.winner,null);
});

test('Civilization Breaker keeps the declared count through unblocked effects and a saved choice',()=>{
 let s=field();
 give(s,0,'mana',[WORLD,NATURE]);
 s.players[0].deck[0].cardId=FIRE;
 const giant=put(s,0,'battle',GIANT,{g34Grants:[{turn:s.turn,g482Unblocked:[
  {op:'Offer',title:'マナゾーンに置く？',defs:[{op:'Ramp',n:1}]}
 ]}]});
 attack(s,giant.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_Offer');
 s=restore(s);
 pick(s,true);
 assert.ok(s.players[0].mana.some(x=>x.cardId===FIRE));
 assert.equal(s.decision.type,'breakChoice');
 assert.equal(s.decision.count,3);
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,2);
});

test('Civilization Breaker offers an independent granted W Breaker',()=>{
 const s=field();
 give(s,0,'mana',[WORLD,NATURE,TRIGGER]);
 const giant=put(s,0,'battle',GIANT,{g34Grants:[{turn:s.turn,breaker:2,g633DoubleBreaker:true}]});
 attack(s,giant.uid);
 act(s,'noBlock');
 assert.deepEqual(s.decision.choices.map(c=>c.value),[2,3]);
 pick(s,2);
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
});
