import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-741.json',import.meta.url)));

test('Phase 741 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:741}));
  assert.throws(()=>standardCardSpec(detail,{phase:740}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:741}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:741}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const WYV='dm23rp2-021',EPS='dm23ex2-048',GRA='dm32-014',AZ='dm28-015';
const LOW='dm01-083',MED='dm01-108',HIGH='dm08-049',SURVIVOR='dm05-044',DARK_HAND='dm01-027';
const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const uid=value=>value?.uid??value;
const values=s=>s.decision.choices.map(o=>uid(o.value));
const pick=(s,x)=>act(s,'extended',a=>uid(s.decision.choices[a.choice].value)===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(MED));
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function order(s,pred){
 const entry=s.decision.type==='entryOrder';
 const queue=entry?s.triggers.entries:s.pendingEffects;
 act(s,entry?'orderEntry':'orderEffect',a=>queue.some(e=>e.effectId===a.effectId&&pred(e)));
}

test('Wyvern continues responding to each player attack after leaving and after restoration, until its next turn',()=>{
 let s=field();
 const wyvern=play(s,WYV),ally=put(s,0,HIGH,{tapped:true});
 end(s);
 ally.tapped=true;
 play(s,DARK_HAND);
 act(s,'effect',a=>a.targets.some(x=>x.uid===wyvern.uid));
 assert.ok(has(s,0,'grave',wyvern));
 const first=put(s,1,HIGH),second=put(s,1,HIGH),small=put(s,1,LOW),medium=put(s,1,MED);
 attack(s,first.uid,ally.uid);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');drain(s);
 assert.ok(has(s,1,'battle',small));
 attack(s,second.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[small.uid]);
 s=restore(s);
 pick(s,small);
 act(s,'noBlock');drain(s);
 const third=put(s,1,HIGH);
 attack(s,third.uid);
 assert.deepEqual(values(s),[medium.uid]);
 pick(s,medium);
 act(s,'noBlock');drain(s);
 end(s);end(s);
 assert.equal(s.active,1);
 const later=put(s,1,HIGH),survivor=put(s,1,LOW);
 attack(s,later.uid);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');drain(s);
 assert.ok(has(s,1,'battle',survivor));
});

for(const count of [1,2])test('Wyvern shield trigger grants the 12000 removal only after '+count+' simultaneous break(s)',()=>{
 const s=field(1),attacker=put(s,1,count===2?'dm01-s06':MED);
 const boundary=put(s,1,HIGH,{powerModifiers:[{amount:8000}]}),tooHigh=put(s,1,HIGH,{powerModifiers:[{amount:9000}]});
 give(s,0,'shields',count===2?[WYV,LOW]:[WYV]);give(s,0,'mana',[]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.players[0].brokenThisTurn,count);
 if(count===2){
  order(s,e=>e.task?.defs?.[0]?.filter?.maxPower===12000);
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),[attacker.uid,boundary.uid]);
  pick(s,boundary);
 }else assert.equal(s.decision,null);
 assert.equal(has(s,1,'grave',boundary),count===2);
 assert.ok(has(s,1,'battle',attacker)&&has(s,1,'battle',tooHigh));
 assert.ok(s.players[0].battle.some(y=>y.cardId===WYV));
 const later=put(s,1,MED);
 attack(s,later.uid);
 assert.equal(s.decision.player,1);
 assert.ok(values(s).includes(later.uid));
 pick(s,later);
 assert.ok(has(s,1,'grave',later));
});

test('Epsilon evolves on a Survivor, revives a non-evolution before combat and breaks two shields',()=>{
 const s=field(),base=put(s,0,SURVIVOR),wrong=put(s,0,MED);
 give(s,0,'grave',[EPS,HIGH,'dm01-027']);
 const [,revive]=s.players[0].grave,x=inst(EPS);
 s.players[0].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='evolve'&&a.baseUid===wrong.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(x.under[0].uid,base.uid);
 attack(s,x.uid);
 assert.deepEqual(values(s),[revive.uid]);
 pick(s,revive);
 assert.ok(has(s,0,'battle',revive));
 assert.equal(s.players[1].shields.length,5);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const sourceAlsoDies of [false,true])test('Epsilon resolves other Survivor deaths only if the source survives the same destruction '+sourceAlsoDies,()=>{
 const s=field(1),eps=put(s,0,EPS,{powerModifiers:sourceAlsoDies?[{amount:-4000}]:[]}),a=put(s,0,SURVIVOR),b=put(s,0,SURVIVOR);
 const first=put(s,1,HIGH,{powerModifiers:[{amount:1000}]}),second=put(s,1,HIGH,{powerModifiers:[{amount:2000}]});
 play(s,'dm38-013');
 assert.ok(has(s,0,'grave',a)&&has(s,0,'grave',b));
 assert.equal(has(s,0,'grave',eps),sourceAlsoDies);
 if(sourceAlsoDies){
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'battle',first)&&has(s,1,'battle',second));
 }else{
  order(s,e=>e.source===EPS);
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),[first.uid]);
  pick(s,first);
  assert.deepEqual(values(s),[second.uid]);
  pick(s,second);
  assert.ok(has(s,1,'grave',first)&&has(s,1,'grave',second));
 }
});

test('Epsilon ignores opposing Survivors and the destruction of friendly non-Survivors',()=>{
 const s=field(),ally=put(s,0,LOW),enemy=put(s,1,SURVIVOR),eps=put(s,0,EPS);
 play(s,'dm38-013');
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',enemy)&&has(s,0,'battle',eps));
});

test('Graviteus chooses one tied lowest tapped target and skips only its next normal untap',()=>{
 let s=field();
 const a=put(s,1,MED,{tapped:true}),b=put(s,1,MED,{tapped:true}),high=put(s,1,HIGH,{tapped:true}),low=put(s,1,LOW);
 play(s,GRA);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[a.uid,b.uid]);
 s=restore(s);pick(s,b);
 end(s);
 const current=x=>s.players[1].battle.find(y=>y.uid===x.uid);
 assert.ok(current(b).tapped);
 for(const x of [a,high,low])assert.ok(!current(x).tapped);
 end(s);end(s);
 assert.ok(!current(b).tapped);
});

test('A protected minimum is not replaced by a higher target, while Azars can freely pick a tapped creature',()=>{
 const s=field(),protectedLow=put(s,1,'dmrp01-041',{tapped:true}),high=put(s,1,HIGH,{tapped:true}),medium=put(s,1,'dm01-107',{tapped:true});
 play(s,GRA);
 assert.equal(s.decision,null);
 play(s,AZ);
 assert.deepEqual(values(s),[high.uid,medium.uid]);
 pick(s,high);
 end(s);
 assert.equal(protectedLow.tapped,false);
 assert.equal(medium.tapped,false);
 assert.equal(high.tapped,true);
});

test('An untap effect can still ready the creature after Azars skipped its turn-start untap',()=>{
 const s=field(),enemy=put(s,1,MED,{tapped:true});
 play(s,AZ);
 pick(s,enemy);
 end(s);
 assert.ok(enemy.tapped);
 play(s,'dm26rp2-057');
 pick(s,enemy);
 assert.equal(enemy.tapped,false);
});
