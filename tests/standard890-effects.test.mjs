import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const AKARI='dmrp15-071',MAGE='promoy19-056',SPIRAL='dmrp13-036';
const SMALL='dm01-108',WATER='dm01-083',BIG='dm05-s04',TAKE='dmrp21-040',MONKEY='promoy19-014';
function field(p=0){
 const s=setup();
 s.active=p;
 for(const q of [0,1])give(s,q,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function breakOwn(s,p){
 const enemy=add(s,1-p,'battle',SMALL);
 s.active=1-p;
 attack(s,enemy.uid);
 act(s,'noBlock');
 return enemy;
}
function take(s,p){
 s.active=p;
 s.phase='main';
 play(s,TAKE);
 pick(s,s.players[p].shields[0]);
}

test('Phase 890 verifies complete official abilities, five printings and original saved-deck IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-890.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[AKARI,MAGE,SPIRAL]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmrp15-048',MAGE],['promoy21-013',MAGE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const canonical=m.cards.find(c=>c.id===(row.canonicalId||row.id));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:890}),canonical.spec);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
 }
 assert.deepEqual(registry.resolveRows([{id:'dmrp15-048',count:1},{id:'promoy21-013',count:1},{id:MAGE,count:2}]),[{id:MAGE,count:4}]);
 const forty={id:'phase890',name:'月光王国',cards:[AKARI,MAGE,SPIRAL,SMALL,WATER,BIG,'dm01-076','dm01-090','dm01-027','dm02-024'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(forty),[]);
 assert.equal(registry.coverage(forty).unsupported,0);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.throws(()=>standardCardSpec(detail,{phase:889}));
  const unknown=structuredClone(detail);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:890}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   [row.id===SPIRAL?'spell':'creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

for(const p of [0,1])test('Akari attacks normally before destroying itself after that attack, even if later ignored '+p,()=>{
 for(const ignored of [false,true]){
  let s=field(p),host=add(s,p,'battle',AKARI);
  attack(s,host.uid);
  assert.ok(has(s,p,'battle',host));
  assert.equal(s.attackLifecycle.g542After.length,1);
  if(ignored)host.g35Ignored=s.turn;
  s=JSON.parse(JSON.stringify(s));
  act(s,'noBlock');
  drain(s);
  assert.ok(has(s,p,'grave',host));
  assert.equal(s.players[1-p].shields.length,4);
 }
});

test('Akari after-attack sacrifice occurs after native Kirifuda Dash and its entry effect (QA 34238)',()=>{
 const s=field(),host=add(s,0,'battle',AKARI),monkey=add(s,0,'hand',MONKEY);
 const top=s.players[0].deck[0],mana=s.players[0].mana.length;
 attack(s,host.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'battle',host));
 for(let i=0;s.decision&&s.winner===null;i++){
  assert.ok(i<30,JSON.stringify(s.decision));
  e.step(s,e.chooseAI(s));
  if(has(s,0,'grave',host)){
   assert.ok(has(s,0,'battle',monkey)&&has(s,0,'mana',top));
  }
 }
 assert.ok(has(s,0,'grave',host)&&has(s,0,'battle',monkey));
 assert.equal(s.players[0].mana.length,mana+1);
});

for(const p of [0,1])test('Akari Moon grants itself temporary Slayer and lets it block a larger attacker '+p,()=>{
 const s=field(p),host=add(s,p,'battle',AKARI),big=add(s,1-p,'battle',BIG);
 give(s,p,'shields',[SMALL,SMALL]);
 breakOwn(s,p);
 assert.ok(e.effectiveCard(host,s).slayer);
 attack(s,big.uid);
 act(s,'block',a=>a.uid===host.uid);
 drain(s);
 assert.ok(has(s,p,'grave',host)&&has(s,1-p,'grave',big));

 const t=field(p),akari=add(t,p,'battle',AKARI);
 give(t,p,'shields',[SMALL]);
 take(t,p);
 assert.ok(e.effectiveCard(akari,t).slayer);
 end(t);
 assert.ok(!e.effectiveCard(akari,t).slayer);
});

test('Akari has no printed Slayer and never self-destructs just for blocking',()=>{
 const s=field(1),host=add(s,0,'battle',AKARI),enemy=add(s,1,'battle',SMALL);
 assert.ok(!e.effectiveCard(host,s).slayer);
 host.powerModifiers=[{amount:4000,expires:'end',who:s.active}];
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===host.uid);
 drain(s);
 assert.ok(has(s,0,'battle',host)&&has(s,1,'grave',enemy));
});

for(const p of [0,1])test('Mage must put a whole shield stack into the grave, with an opponent-chosen destruction for each card '+p,()=>{
 const s=field(p);
 give(s,p,'shields',[SMALL]);
 const shield=s.players[p].shields[0],extra=inst(WATER);
 shield.shieldStack=[extra];
 const keep=add(s,1-p,'battle',BIG),a=add(s,1-p,'battle',SMALL),b=add(s,1-p,'battle',WATER);
 const host=play(s,MAGE);
 assert.deepEqual(values(s),[shield.uid]);
 pick(s,shield);
 act(s,'orderEffect',a=>a.cardId===MAGE);
 assert.equal(s.decision.player,1-p);
 pick(s,b);
 assert.equal(s.decision.player,1-p);
 pick(s,a);
 assert.ok(has(s,1-p,'battle',keep)&&has(s,1-p,'grave',a)&&has(s,1-p,'grave',b));
 assert.ok(has(s,p,'grave',shield)&&has(s,p,'grave',extra)&&has(s,p,'battle',host));
});

test('Mage resolves without an existing shield or opponent, and its ordinary blocker survives a small attack',()=>{
 const s=field();
 give(s,0,'shields',[]);
 const mage=play(s,MAGE);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',mage));
 const t=field(1),host=add(t,0,'battle',MAGE),enemy=add(t,1,'battle',SMALL);
 attack(t,enemy.uid);
 act(t,'block',a=>a.uid===host.uid);
 drain(t);
 assert.ok(has(t,0,'battle',host)&&has(t,1,'grave',enemy));
});

for(const p of [0,1])test('Spiral returns zero, one or two creatures from either side using current power '+p,()=>{
 for(const n of [0,1,2]){
  const s=field(p),own=add(s,p,'battle',SMALL),enemy=add(s,1-p,'battle',SMALL);
  const tooBig=add(s,1-p,'battle',SMALL,{powerModifiers:[{amount:2001}]}),equal=add(s,1-p,'battle',SMALL,{powerModifiers:[{amount:2000}]});
  cast(s,SPIRAL);
  assert.deepEqual(values(s),[enemy.uid,equal.uid,own.uid,null]);
  if(n>0)pick(s,own);
  if(n>1)pick(s,equal);
  else pick(s,null);
  assert.equal(has(s,p,'hand',own),n>0);
  assert.equal(has(s,1-p,'hand',equal),n>1);
  assert.ok(has(s,1-p,'battle',enemy)&&has(s,1-p,'battle',tooBig));
 }
});

test('Spiral uses its real Shield Trigger and bounces the attacker with no mana paid',()=>{
 const s=field();
 give(s,0,'shields',[SPIRAL]);
 const spell=s.players[0].shields[0];
 give(s,0,'mana',[]);
 const enemy=breakOwn(s,0);
 act(s,'useTrigger');
 pick(s,enemy);
 drain(s);
 assert.ok(has(s,1,'hand',enemy)&&has(s,0,'grave',spell));
 assert.equal(s.attack,null);
 assert.equal(s.players[0].mana.length,0);
});

test('Spiral preserves physical identities across a saved multi-selection, including full evolution stacks',()=>{
 let s=field(),base=inst(WATER),evolution=add(s,1,'battle','dm02-024',{under:[base]});
 evolution.powerModifiers=[{amount:-4000}];
 const own=add(s,0,'battle',SMALL);
 cast(s,SPIRAL);
 pick(s,own);
 assert.ok(has(s,0,'battle',own));
 const ids=e.physicalCards(s).map(x=>x.uid).sort();
 s=JSON.parse(JSON.stringify(s));
 pick(s,evolution);
 assert.ok(has(s,0,'hand',own)&&has(s,1,'hand',evolution)&&has(s,1,'hand',base));
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),ids);
});

for(const id of [AKARI,MAGE])test(e.card(id).name+' has no Moon when sealed or ignored',()=>{
 for(const mode of ['sealed','ignored']){
  const s=field(),host=add(s,0,'battle',id),enemy=add(s,1,'battle',SMALL);
  if(mode==='sealed'){
   host.sealed=true;
   add(s,0,'seals',SMALL,{sealOf:host.uid,faceDown:true});
  }else add(s,1,'battle',GEN);
  give(s,0,'shields',[SMALL]);
  breakOwn(s,0);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'battle',enemy)&&!e.effectiveCard(host,s).slayer);
 }
});

for(const id of [AKARI,MAGE,SPIRAL])test(e.card(id).name+' charges as one mana with its official color orientation',()=>{
 const s=field();
 s.phase='charge';
 give(s,0,'hand',[id]);
 const x=s.players[0].hand[0];
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x));
 assert.equal(x.tapped,id===MAGE);
 assert.equal(e.card(x).manaValue,1);
});
