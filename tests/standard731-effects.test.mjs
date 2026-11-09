import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-731.json',import.meta.url)));

test('Phase 731 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:731}));
  assert.throws(()=>standardCardSpec(detail,{phase:730}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:731}));
 }
});

const EARTH='dm13-014', FISH='dm03-s02', LUD='dm10-002';
const WATER='dm01-049', WATER_DARK='dm10-064', FIRE='dm01-097', BEAST='dm01-108';
const WATER_GEAR='dm16-026', FIRE_GEAR='dm28-033', COLORLESS='dm23ex2-065';
const HAND='dm01-027', BOUNCE='dm05-024', QX='dmrp07-m01', HAWK='dm25ex2-025';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const target=(s,x)=>act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));

test('Earth counts distinct civilizations of elements across both players, including a cross gear',()=>{
 const s=field(),earth=put(s,0,EARTH);
 put(s,0,FIRE_GEAR);
 put(s,1,FIRE);
 put(s,1,LUD,{sealed:true});
 put(s,1,COLORLESS);
 assert.equal(e.power(earth,false,s),5000);
 assert.equal(e.effectiveCard(earth,s).breaker,1);
 put(s,1,WATER_DARK);
 assert.equal(e.power(earth,false,s),9000);
 assert.equal(e.effectiveCard(earth,s).breaker,2);
});

for(const extra of [false,true])test('Earth uses its current power for the number of shields broken '+extra,()=>{
 const s=field(),earth=put(s,0,EARTH);
 put(s,0,FIRE_GEAR);
 if(extra)put(s,1,WATER_GEAR);
 attack(s,earth.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,extra?3:4);
});

for(const n of [0,1,2])test('Fish counts only other allied water creatures and draws the chosen number '+n,()=>{
 let s=field();
 const fish=put(s,0,FISH);
 put(s,0,WATER);
 put(s,0,WATER_DARK,{tapped:true});
 const sealed=put(s,0,WATER,{sealed:true});
 s.players[0].seals.push({...inst(BEAST),faceDown:true,sealOf:sealed.uid});
 put(s,0,WATER_GEAR);
 put(s,1,WATER_DARK);
 const deck=s.players[0].deck.length;
 assert.equal(e.power(fish,false,s),3000);
 attack(s,fish.uid);
 assert.deepEqual(s.decision.choices.map(c=>c.value),[0,1,2]);
 s=restore(s);
 pick(s,n);
 assert.equal(s.players[0].deck.length,deck-n);
 assert.equal(s.players[0].hand.length,n);
});

test('Fish can choose less than its deck size when the permitted count is larger',()=>{
 const s=field(),fish=put(s,0,FISH);
 for(let i=0;i<3;i++)put(s,0,WATER);
 give(s,0,'deck',[BEAST,FIRE]);
 const next=s.players[0].deck[0];
 attack(s,fish.uid);
 assert.deepEqual(s.decision.choices.map(c=>c.value),[0,1,2,3]);
 pick(s,1);
 assert.ok(has(s,0,'hand',next));
 assert.equal(s.players[0].deck.length,1);
 assert.equal(s.winner,null);
});

test('Lud counts other untapped allied creatures regardless of their civilization',()=>{
 const s=field(),lud=put(s,0,LUD);
 const ally=put(s,0,WATER);
 put(s,0,BEAST,{tapped:true});
 put(s,0,FIRE,{sealed:true});
 put(s,0,FIRE_GEAR);
 put(s,1,WATER);
 assert.equal(e.power(lud,false,s),4000);
 ally.tapped=true;
 assert.equal(e.power(lud,false,s),2000);
});

test('Lud replaces destruction with a mandatory return to the deck and shuffle',()=>{
 const s=field(),lud=put(s,0,LUD);
 s.active=1;
 play(s,HAND);
 const rng=s.rng;
 target(s,lud);
 assert.ok(has(s,0,'deck',lud)&&!has(s,0,'grave',lud));
 assert.notEqual(s.rng,rng);
 assert.equal(s.decision,null);
});

test('Lud and Black Hawk offer a replacement choice that survives a save',()=>{
 let s=field();
 const lud=put(s,0,LUD);
 put(s,0,HAWK,{tapped:true});
 s.active=1;
 play(s,HAND);
 target(s,lud);
 assert.equal(s.decision.type,'leaveReplace');
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind).sort(),['replaceHawk','replaceShuffle731']);
 s=restore(s);
 const alt=restore(s),rng=s.rng;
 act(s,'replaceShuffle731');
 assert.ok(has(s,0,'deck',lud));
 assert.notEqual(s.rng,rng);
 act(alt,'replaceHawk');
 assert.equal(alt.players[0].deck.at(-1).uid,lud.uid);
 assert.equal(alt.rng,rng);
});

test('Lud is inserted without shuffling if QX prohibits changing the deck order',()=>{
 let s=field();
 const lud=put(s,0,LUD);
 put(s,1,QX);
 give(s,0,'deck',[BEAST,FIRE,WATER]);
 const ids=s.players[0].deck.map(x=>x.uid),rng=s.rng;
 s.active=1;
 play(s,HAND);
 target(s,lud);
 assert.equal(s.decision.task.op,'g11_Insert');
 s=restore(s);
 pick(s,1);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[ids[0],lud.uid,...ids.slice(1)]);
 assert.equal(s.rng,rng);
});

test('Lud does not use the replacement when bounced or when discarded from mana',()=>{
 const s=field(),lud=put(s,0,LUD);
 s.active=1;
 play(s,BOUNCE);
 const rng=s.rng;
 target(s,lud);
 assert.ok(has(s,0,'hand',lud));
 assert.equal(s.rng,rng);
 give(s,0,'mana',[LUD]);
 const mana=s.players[0].mana[0];
 s.extTasks=[{op:'g34_Select',p:0,source:HAND,origin:'mana',to:'grave',n:1}];
 act(s,'toAttack');
 act(s,'extended',a=>s.decision.choices[a.choice].value.uid===mana.uid);
 assert.ok(has(s,0,'grave',mana)&&!has(s,0,'deck',mana));
});
