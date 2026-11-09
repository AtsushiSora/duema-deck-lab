import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-734.json',import.meta.url)));

test('Phase 734 validates five complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:734}));
  assert.throws(()=>standardCardSpec(detail,{phase:733}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:734}));
 }
});


const HARRY='dm23rp1-063', ZEK='dmrp04s-055', BIL='dm23ex1-019', DACHI='dmrp21-019', DOL='dmrp17-040';
const SMALL='dm01-108', FIRE='dm01-097', HAND='dm01-027';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const pickUnit=(s,x)=>act(s,'extended',a=>s.decision.choices[a.choice].value.uid===x.uid);
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function attackPlayer(s,x){
 attack(s,x.uid);
 act(s,'noBlock');
}

test('Harry reprint resolves to the original battle ID and keeps its own image reference',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 const [row]=printAliases;
 assert.equal(printAliases.length,1);
 assert.equal(row.canonicalId,HARRY);
 assert.deepEqual(registry.resolveRows([{id:HARRY,count:1},{id:row.id,count:2}]),[{id:HARRY,count:3}]);
 assert.equal(refs.prints.find(x=>x.id===row.id).image,row.image);
 assert.equal(row.verification.facesMatched,true);
});

test('Harry goes to the bottom only after its shield break',()=>{
 const s=field(),harry=play(s,HARRY);
 harry.entered=0;
 const before=s.players[0].deck.map(y=>y.uid);
 attack(s,harry.uid);
 assert.ok(has(s,0,'battle',harry));
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.deepEqual(s.players[0].deck.map(y=>y.uid),[...before,harry.uid]);
});

test('Harry orders underlying cards at the bottom without changing the earlier deck',()=>{
 let s=field();
 const under={...inst(SMALL),faceDown:true},harry=put(s,0,HARRY,{under:[under]});
 const before=s.players[0].deck.map(y=>y.uid);
 attackPlayer(s,harry);
 assert.equal(s.decision.task.op,'g78_BottomOrder');
 const hidden=s.decision.choices.find(o=>o.value===under.uid);
 assert.match(hidden.label,/裏向き/);
 assert.ok(!hidden.cardId);
 s=restore(s);
 pick(s,under.uid);
 assert.deepEqual(s.players[0].deck.map(y=>y.uid),[...before,under.uid,harry.uid]);
});

test('Zek can attack a tapped creature but cannot attack the player and ends in mana',()=>{
 const s=field(),zek=put(s,0,ZEK),target=put(s,1,SMALL,{tapped:true});
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===zek.uid&&a.target==='player'));
 const n=s.players[0].mana.length;
 attack(s,zek.uid,target.uid);
 drain(s);
 assert.ok(has(s,1,'grave',target)&&has(s,0,'mana',zek));
 assert.equal(s.players[0].mana.length,n+1);
 assert.equal(s.players[0].mana.at(-1).tapped,false);
});

test('Billiard breaks three shields and selects distinct allies before simultaneous destruction',()=>{
 let s=field();
 const bil=put(s,0,BIL),a=put(s,0,SMALL),b=put(s,0,FIRE);
 attackPlayer(s,bil);
 for(let n=0;s.decision&&s.decision.task?.op!=='g34_Select';n++){
  assert.ok(n<10);
  e.step(s,e.chooseAI(s));
 }
 assert.equal(s.players[1].shields.length,2);
 pickUnit(s,a);
 assert.ok(has(s,0,'battle',a));
 assert.ok(!s.decision.choices.some(o=>o.value.uid===a.uid));
 s=restore(s);
 pickUnit(s,b);
 assert.ok(has(s,0,'grave',a)&&has(s,0,'grave',b)&&has(s,0,'battle',bil));
});

test('Billiard can select itself and destroys only one if it is the only creature',()=>{
 const s=field(),bil=put(s,0,BIL);
 give(s,1,'shields',[SMALL,SMALL,SMALL]);
 attackPlayer(s,bil);
 assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[bil.uid]);
 pickUnit(s,bil);
 assert.ok(has(s,0,'grave',bil));
});

test('Billiard never offers sacrifices after Demon Hand destroys the attacker during its trigger window',()=>{
 const s=field(),bil=put(s,0,BIL),ally=put(s,0,SMALL);
 give(s,1,'shields',[HAND]);
 attackPlayer(s,bil);
 act(s,'useTrigger');
 act(s,'effect',a=>a.targets.some(x=>x.uid===bil.uid));
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',bil)&&has(s,0,'battle',ally));
});

test('Dachikko evolves on fire, breaks two shields, keeps its base and then draws two',()=>{
 const s=field(),base=put(s,0,FIRE),invalid=put(s,0,SMALL);
 const dachi=play(s,DACHI);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 const before=s.players[0].deck.slice(0,2).map(x=>x.uid);
 give(s,1,'shields',[SMALL,SMALL]);
 attackPlayer(s,dachi);
 drain(s);
 assert.ok(has(s,0,'grave',dachi)&&has(s,0,'battle',base)&&has(s,0,'battle',invalid));
 assert.equal(s.players[1].shields.length,0);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),before);
});

test('Dachikko still draws after its attack-end self-destruction is prevented',()=>{
 const s=field(),dachi=put(s,0,DACHI,{g26Stay:true,under:[inst(FIRE)]});
 give(s,1,'shields',[SMALL,SMALL]);
 attackPlayer(s,dachi);
 drain(s);
 assert.ok(has(s,0,'battle',dachi));
 assert.equal(s.players[0].hand.length,2);
});

test('Dolbro enters as a shield trigger and survives a block it wins',()=>{
 const s=field(),first=put(s,1,SMALL),second=put(s,1,SMALL);
 give(s,0,'shields',[DOL]);
 give(s,0,'mana',[]);
 s.active=1;
 attackPlayer(s,first);
 act(s,'useTrigger');
 drain(s);
 const dol=s.players[0].battle.find(x=>x.cardId===DOL);
 assert.ok(dol);
 assert.equal(s.metrics[0].triggers,1);
 attack(s,second.uid);
 act(s,'block',a=>a.uid===dol.uid);
 drain(s);
 assert.ok(has(s,0,'battle',dol)&&has(s,1,'grave',second));
});

test('Dolbro destroys itself at the end of its own attack',()=>{
 const s=field(),dol=put(s,0,DOL);
 attackPlayer(s,dol);
 drain(s);
 assert.ok(has(s,0,'grave',dol));
 assert.equal(s.players[1].shields.length,4);
});

test('Dolbro Sasage one is offered and pays the existing Dispector reduction',()=>{
 const s=field(),dol=put(s,0,DOL);
 give(s,0,'hand',['dmrp17-039']);
 give(s,0,'mana',Array(5).fill('dm01-090'));
 act(s,'play',a=>a.alternative==='sasage'&&a.sasage.includes(dol.uid));
 drain(s);
 assert.ok(has(s,0,'grave',dol));
 assert.ok(s.players[0].battle.some(x=>x.cardId==='dmrp17-039'));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
});
