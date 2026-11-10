import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const SCIENCE='dmex13-023',SONG='dmrp16-001',LOVE='dmrp16-072';
const SMALL='dm01-108',WATER='dm01-083',DARK='dm01-090',LIGHT='dm01-076',BIG='dm05-s04';
const DRAW='dm01-052',BOUNCE='dm01-086',ST='dm01-027',DEADLY='dm36-058',TAKE='dmrp21-040';
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
function chooseNative(s,x){
 const uid=x.uid;
 const a=e.getLegalActions(s).find(a=>a.kind==='extended'
  ?s.decision.choices[a.choice].value===uid||s.decision.choices[a.choice].value?.uid===uid
  :a.targets?.some(t=>t.uid===uid));
 assert.ok(a,JSON.stringify(s.decision));
 e.step(s,a);
}

test('Phase 889 verifies all official abilities and four printings, including a canonical saved-deck alias',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-889.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[SCIENCE,SONG,LOVE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex19-035',SCIENCE]]);
 assert.equal(registry.get('dmex19-035').id,SCIENCE);
 assert.deepEqual(registry.resolveRows([{id:'dmex19-035',count:2},{id:SCIENCE,count:2}]),[{id:SCIENCE,count:4}]);
 for(const row of [...m.cards,...m.printAliases]){
  const canonical=m.cards.find(c=>c.id===(row.canonicalId||row.id));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:889}),canonical.spec);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
 }
 const forty={id:'phase889',name:'月光王国',cards:[SCIENCE,SONG,LOVE,SMALL,WATER,DARK,LIGHT,ST,BOUNCE,'dm02-024'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(forty),[]);
 assert.equal(registry.coverage(forty).unsupported,0);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.throws(()=>standardCardSpec(detail,{phase:888}));
  const unknown=structuredClone(detail);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:889}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

for(const p of [0,1])test('Science can cast a cost-four hand spell freely or decline, excluding creatures and high-cost spells '+p,()=>{
 for(const accept of [true,false]){
  const s=field(p),spell=add(s,p,'hand',DRAW),high=add(s,p,'hand',ST),creature=add(s,p,'hand',SMALL);
  const host=play(s,SCIENCE),paid=s.players[p].mana.filter(x=>x.tapped).length;
  assert.equal(s.decision.task.op,'g34_Execute');
  assert.deepEqual(values(s),[spell.uid,null]);
  pick(s,accept?spell:null);
  drain(s);
  assert.equal(s.players[p].mana.filter(x=>x.tapped).length,paid);
  assert.equal(s.players[p].deck.length,accept?17:20);
  assert.ok(has(s,p,accept?'grave':'hand',spell));
  assert.ok(has(s,p,'battle',host)&&has(s,p,'hand',high)&&has(s,p,'hand',creature));
 }
});

test('Science recovers the just-cast Shield Trigger only after its resolution (QA 34328)',()=>{
 const s=field(),host=add(s,0,'battle',SCIENCE);
 give(s,0,'shields',[ST]);
 const spell=s.players[0].shields[0],enemy=breakOwn(s,0);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='orderEffect'));
 act(s,'useTrigger');
 chooseNative(s,enemy);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[spell.uid]);
 pick(s,spell);
 assert.ok(has(s,0,'hand',spell)&&has(s,0,'battle',host));
});

test('Science spell recovery accepts a twinpact spell face and never a creature-only card',()=>{
 const s=field();
 add(s,0,'battle',SCIENCE);
 const twin=add(s,0,'grave','dm22ex1-059'),creature=add(s,0,'grave',SMALL),spell=add(s,0,'grave',BOUNCE);
 give(s,0,'shields',[SMALL]);
 take(s,0);
 assert.deepEqual(values(s),[twin.uid,spell.uid]);
 pick(s,twin);
 assert.ok(has(s,0,'hand',twin)&&has(s,0,'grave',creature));
});

test('Science blocker and Slayer destroy a larger attacker, and its W Breaker breaks two shields',()=>{
 const s=field(1),host=add(s,0,'battle',SCIENCE),attacker=add(s,1,'battle',BIG);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===host.uid);
 drain(s);
 assert.ok(has(s,0,'grave',host)&&has(s,1,'grave',attacker));
 const t=field(),science=add(t,0,'battle',SCIENCE);
 attack(t,science.uid);
 act(t,'noBlock');
 act(t,'breakShields',a=>a.shields.length===2);
 drain(t);
 assert.equal(t.players[1].shields.length,3);
});

for(const p of [0,1])test('Song Sympathy counts only unsealed friendly creatures once, reaches one mana, and draws exactly one '+p,()=>{
 const s=field(p);
 assert.equal(e.summonCost(s,p,e.card(SONG)),7);
 const top=add(s,p,'battle',SMALL);
 top.under=[inst(WATER)];
 add(s,1-p,'battle',SMALL);
 const sealed=add(s,p,'battle',SMALL,{sealed:true});
 add(s,p,'seals',SMALL,{sealOf:sealed.uid,faceDown:true});
 assert.equal(e.summonCost(s,p,e.card(SONG)),6);
 for(let i=0;i<8;i++)add(s,p,'battle',SMALL);
 assert.equal(e.summonCost(s,p,e.card(SONG)),1);
 give(s,p,'mana',['dm01-075']);
 const drawn=s.players[p].deck[0],song=play(s,SONG);
 assert.ok(has(s,p,'hand',drawn)&&has(s,p,'battle',song));
 assert.equal(s.players[p].deck.length,19);
 assert.equal(s.players[p].mana.filter(x=>x.tapped).length,1);
});

for(const p of [0,1])test('Song deploys a just-broken eligible shield creature without payment (QA 39074) '+p,()=>{
 const s=field(p);
 add(s,p,'battle',SONG);
 give(s,p,'shields',[DARK]);
 const shield=s.players[p].shields[0];
 give(s,p,'mana',[]);
 breakOwn(s,p);
 assert.ok(values(s).includes(shield.uid));
 pick(s,shield);
 drain(s);
 assert.ok(has(s,p,'battle',shield));
 assert.equal(s.players[p].mana.length,0);
});

test('Song permits either Light or Darkness and a multicolor body, excludes wrong color and cost four, and may decline',()=>{
 const s=field();
 add(s,0,'battle',SONG);
 const light=add(s,0,'hand',LIGHT),dark=add(s,0,'hand',DARK),multi=add(s,0,'hand','dmrp15-049');
 const water=add(s,0,'hand',WATER),high=add(s,0,'hand','dmrp16-048'),spell=add(s,0,'hand',BOUNCE);
 give(s,0,'shields',[SMALL]);
 take(s,0);
 assert.deepEqual(values(s),[light.uid,dark.uid,multi.uid,null]);
 pick(s,null);
 assert.ok([light,dark,multi,water,high,spell].every(x=>has(s,0,'hand',x)));
});

test('Song real Moon deployments still obey a nonsummon entry replacement',()=>{
 const s=field();
 add(s,0,'battle',SONG);
 add(s,1,'battle','dmrp18-083');
 const body=add(s,0,'hand',DARK);
 give(s,0,'shields',[SMALL]);
 take(s,0);
 pick(s,body);
 drain(s);
 assert.ok(has(s,0,'grave',body)&&!has(s,0,'battle',body));
});

test('Love revives its own destroyed source after the Shield Trigger resolves (QA 39105)',()=>{
 let s=field(),host=add(s,0,'battle',LOVE);
 give(s,0,'shields',[DEADLY]);
 const enemy=breakOwn(s,0);
 act(s,'useTrigger');
 chooseNative(s,host);
 assert.ok(has(s,0,'grave',host));
 chooseNative(s,enemy);
 assert.deepEqual(values(s),[host.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,host);
 drain(s);
 assert.ok(has(s,0,'battle',host)&&has(s,1,'grave',enemy));
 assert.equal(s.decision,null);
});

for(const p of [0,1])test('Love mandatory grave deployment selects only the exact same name, once per shield card '+p,()=>{
 const s=field(p);
 add(s,p,'battle',LOVE);
 const a=add(s,p,'grave',LOVE),b=add(s,p,'grave',LOVE),other=add(s,p,'grave',DARK);
 give(s,p,'shields',[SMALL]);
 s.players[p].shields[0].shieldStack=[inst(WATER)];
 breakOwn(s,p);
 act(s,'orderEffect',a=>a.cardId===LOVE);
 assert.deepEqual(values(s),[a.uid,b.uid]);
 pick(s,a);
 pick(s,b);
 assert.ok(has(s,p,'battle',a)&&has(s,p,'battle',b)&&has(s,p,'grave',other));
});

test('Love resolves without a namesake, blocks normally and cannot make any attack',()=>{
 const s=field(1),host=add(s,0,'battle',LOVE),enemy=add(s,1,'battle',SMALL);
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===host.uid);
 drain(s);
 assert.ok(has(s,0,'grave',host)&&has(s,1,'grave',enemy));
 const t=field(),love=add(t,0,'battle',LOVE),target=add(t,1,'battle',SMALL,{tapped:true});
 t.phase='attack';
 assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'&&a.uid===love.uid));
 give(t,0,'shields',[SMALL]);
 take(t,0);
 assert.equal(t.decision,null);
 assert.ok(has(t,1,'battle',target));
});

for(const id of [SCIENCE,SONG,LOVE])test(e.card(id).name+' has no Moon while sealed or explicitly ignored',()=>{
 for(const mode of ['sealed','ignored']){
  const s=field(),host=add(s,0,'battle',id);
  if(mode==='sealed'){
   host.sealed=true;
   add(s,0,'seals',SMALL,{sealOf:host.uid,faceDown:true});
  }else host.g35Ignored=s.turn;
  add(s,0,'grave',BOUNCE);
  add(s,0,'grave',LOVE);
  add(s,0,'hand',DARK);
  give(s,0,'shields',[SMALL]);
  breakOwn(s,0);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].grave.length,2);
  assert.equal(s.players[0].battle.length,1);
 }
});

for(const id of [SCIENCE,SONG,LOVE])test(e.card(id).name+' charges as printed one mana with the correct multicolor state',()=>{
 const s=field();
 s.phase='charge';
 give(s,0,'hand',[id]);
 const x=s.players[0].hand[0];
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x));
 assert.equal(x.tapped,id===SCIENCE);
 assert.equal(e.card(x).manaValue,1);
});
