import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-721.json',import.meta.url)));

test('Phase 721 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:721}));
  assert.throws(()=>standardCardSpec(detail,{phase:720}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:721}));
 }
});

const SHAMAN='dm16-033', SCREW='dm19-081', STRIUM='dm19-092';
const CLAW='dm14-110', TAKION='dm23ex1-058', WATER='dm01-083', DEVIL='dm19-084';
const NATURE='dm01-108', LANCER='dm02-024', MAROKU='dm23ex1-033', SPEED='dmex14-108';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);

function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}

function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

function cross(s,gear,host){
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid);
}

test('the DMD02 Strium reprint has the same effect, canonical ID and copy limit',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(printAliases.length,1);
 const [print]=printAliases,original=cards.find(x=>x.id===STRIUM);
 const stats=faces=>faces.map(({abilityText,...face})=>face);
 assert.deepEqual(stats(print.faces),stats(original.faces));
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:721}),original.spec);
 assert.ok(print.verification.facesMatched);
 assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[STRIUM]);
 assert.equal(catalogue.get(print.id).id,STRIUM);
 assert.deepEqual(catalogue.resolveRows([{id:STRIUM,count:1},{id:print.id,count:3}]),[{id:STRIUM,count:4}]);
 assert.ok(!data.cards.some(x=>x.id===print.id));
});

test('Shaman adds the exact top card tapped on each legal cross (QA 35358)',()=>{
 const s=field(),shaman=put(s,0,SHAMAN),gear=put(s,0,CLAW),other=put(s,0,NATURE);
 const own=s.players[0];
 const [first,second]=own.deck;
 const baseMana=own.mana.length;
 cross(s,gear,shaman);
 assert.equal(own.mana.at(-1).uid,first.uid);
 assert.ok(own.mana.at(-1).tapped);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='crossGear'&&a.uid===gear.uid&&a.target===shaman.uid));
 cross(s,gear,other);
 assert.equal(own.deck[0].uid,second.uid);
 cross(s,gear,shaman);
 assert.equal(own.mana.length,baseMana+2);
 assert.equal(own.mana.at(-1).uid,second.uid);
 assert.ok(own.mana.at(-1).tapped);
});

test('Shaman also triggers from Maroku’s free cross without spending mana',()=>{
 let s=field();
 const shaman=put(s,0,SHAMAN),maroku=put(s,0,MAROKU);
 put(s,0,CLAW,{crossedTo:{uid:maroku.uid,incarnation:0}});
 give(s,0,'deck',[TAKION,WATER,NATURE,NATURE,NATURE,NATURE]);
 const [gear,,,ramped]=s.players[0].deck;
 s.extTasks=[{op:'g18_Maroku',p:0,source:MAROKU,uid:maroku.uid,incarnation:0}];
 act(s,'toAttack');
 pick(s,gear.uid);
 assert.equal(s.decision.task.op,'g18_FreeCross');
 s=restore(s);
 pick(s,shaman.uid);
 drain(s);
 const own=s.players[0];
 assert.equal(own.battle.find(x=>x.uid===gear.uid).crossedTo.uid,shaman.uid);
 assert.equal(own.mana.at(-1).uid,ramped.uid);
 assert.deepEqual(own.mana.filter(x=>x.tapped).map(x=>x.uid),[ramped.uid]);
});

test('Screw lets its controller draw or decline for another allied Liquid People base',()=>{
 for(const draw of [0,1]){
  let s=field();
  put(s,0,SCREW);
  const base=put(s,0,WATER);
  put(s,1,SCREW);
  const [top]=s.players[0].deck;
  play(s,LANCER);
  act(s,'evolve',a=>a.base===base.uid||a.baseUid===base.uid);
  assert.equal(s.decision.player,0);
  assert.equal(s.decision.task.op,'g34_Draw');
  s=restore(s);
  pick(s,draw);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.some(x=>x.uid===top.uid),!!draw);
 }
});

test('GV gives Screw one optional draw per matching base, and none if Screw is also used (QA 35422 and 35423)',()=>{
 const gv={id:'phase721-test-gv',name:'Test Evolution GV',type:'creature',civ:'水',cost:5,power:5000,
  race:'フェニックス',evolution:{g31:true},g31Evolution:{zone:'battle',conditions:Array.from({length:3},()=>({creature:true}))}};
 e.setCards([...data.cards,gv]);
 try{
  for(const selfBase of [false,true]){
   const s=field(),screw=put(s,0,SCREW),a=put(s,0,WATER),b=put(s,0,WATER),c=put(s,0,DEVIL);
   const before=s.players[0].deck.length;
   const evolved=play(s,gv.id);
   for(const base of [a,b,selfBase?screw:c])pick(s,base.uid);
   assert.equal(evolved.under.length,3);
   for(let n=0;n<(selfBase?0:3);n++){
    if(s.decision?.type==='effectOrder')act(s,'orderEffect');
    assert.equal(s.decision.task.op,'g34_Draw');
    pick(s,1);
   }
   assert.equal(s.decision,null);
   assert.equal(s.players[0].deck.length,before-(selfBase?0:3));
  }
 }finally{
  e.setCards(data.cards);
 }
});

test('Strium restricts other allies for the turn, including a later speed attacker',()=>{
 let s=field(),strium=put(s,0,STRIUM),other=put(s,0,NATURE);
 const legal=()=>e.getLegalActions(s).filter(a=>a.kind==='attack').map(a=>a.uid);
 s.phase='attack';
 assert.ok(legal().includes(other.uid));
 attack(s,strium.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 s=restore(s);
 const current=s.players[0].battle.find(x=>x.uid===strium.uid);
 current.tapped=false;
 const late=play(s,SPEED);
 s.phase='attack';
 assert.deepEqual([...new Set(legal())],[strium.uid]);
 assert.ok(e.attackLocked(s,0,late));
 s.players[0].grave.push(s.players[0].battle.shift());
 assert.equal(legal().length,0);
 act(s,'endTurn');
 assert.ok(!s.extLimits.some(x=>x.kind==='g677OnlyAttacker'));
 assert.ok(!e.attackLocked(s,0,late));
});

test('Strium’s ignored attack ability leaves other attackers available',()=>{
 const s=field(),strium=put(s,0,STRIUM,{g35Ignored:s.turn}),other=put(s,0,NATURE);
 attack(s,strium.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===other.uid));
});
