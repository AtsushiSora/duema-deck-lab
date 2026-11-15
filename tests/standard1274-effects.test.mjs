import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TAKONCHU='dmr20-003',RABBIT='dm22ex1-057',MEDIC='dmrp19-035';
const PAINT='dmex03-010',PENTER='dmrp17-036',ZERO='dmex15-b025',VV='dmr22-l01';
const WATER='dm01-083',NATURE='dm01-108',BOUNCE='dmrp20-036';
const REVVO='dm26ex4-005';
const DISTAS='dmrp17-068',DISPECTOR='dmrp19-030',SILENCE='dmrp14-s05';
const KILL='dm01-027',YAMATA='dmbd18-003',VEIL='dm22ex2-044';
const SHAKO='dmrp03-s03',GENMU='dmrp15-km1',SWEEP='dm14-015';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const play=(s,x,pred=()=>true)=>act(s,'play',a=>a.uid===x.uid&&pred(a));
const values=s=>s.decision?.choices?.map(x=>x.value)??[];
const pick=(s,uid)=>act(s,'extended',a=>(values(s)[a.choice]?.uid??values(s)[a.choice])===uid);
const pass=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('five official prints map to three canonical battle cards',()=>{
 const m=read('tools/support-phase-1274.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalog=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[TAKONCHU,RABBIT,MEDIC]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex12-002',TAKONCHU],['dm25ex2-Cho016',TAKONCHU]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  const detail={id,status:'complete',faces:row.faces};
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1274}),row.spec);
  const altered=structuredClone(detail);altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1274}));
  assert.deepEqual(catalog.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.ok(refs.some(ref=>ref.id===id&&ref.canonicalId===canonicalId&&ref.image===image));
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
 }
});

test('Takonchu grants Magic Command on the board and a water non-Command unseals VV-8 on entry (QA38650)',()=>{
 const s=field(),source=add(s,0,'battle',TAKONCHU),nature=add(s,0,'battle',NATURE);
 const opponent=add(s,1,'battle',WATER),incoming=add(s,0,'hand',WATER);
 const vv=add(s,0,'battle',VV,{sealed:true});
 const seal=add(s,0,'seals',NATURE,{sealOf:vv.uid,faceDown:true});
 assert.doesNotMatch(e.zoneCard(s,0,incoming,'hand').race,/コマンド/);
 play(s,incoming);
 drain(s);
 assert.ok(has(s,0,'grave',seal));
 assert.match(e.effectiveCard(incoming,s).race,/マジック・コマンド/);
 for(const x of [nature,opponent])assert.doesNotMatch(e.effectiveCard(x,s).race,/マジック・コマンド/);
 source.sealed=true;
 assert.doesNotMatch(e.effectiveCard(incoming,s).race,/マジック・コマンド/);
});

test('Takonchu replaces both zero-power destructions caused by Painty and expires the two bonuses (QA38679)',()=>{
 const s=field(),x=add(s,1,'battle',TAKONCHU);
 const deck=s.players[0].deck.slice();
 const paint=add(s,0,'hand',PAINT);
 play(s,paint);
 if(s.decision?.type==='evolution')act(s,'evolve',a=>a.baseUid==null);
 drain(s);
 assert.ok(has(s,1,'battle',x));
 assert.deepEqual(s.players[0].hand,deck.slice(0,10));
 assert.equal(e.power(x,false,s),5000);
 pass(s);
 assert.equal(e.power(x,false,s),5000);
 assert.equal(x.powerModifiers?.length??0,0);
});

for(const shako of [false,true])test('fixed zero power repeats the replacement through the last draw (Shako '+shako+')',()=>{
 const s=field(),x=add(s,1,'battle',TAKONCHU);
 if(shako)add(s,0,'battle',SHAKO);
 give(s,0,'deck',Array(12).fill(NATURE));
 cast(s,ZERO);pick(s,x.uid);
 assert.equal(s.players[0].hand.length,12);
 assert.equal(s.winner,shako?0:1);
 assert.ok(has(s,1,'battle',x));
 assert.equal(e.power(x,false,s),0);
});

test('fixed zero power with a protected empty library requires a rematch (QA40600)',()=>{
 const s=field(),x=add(s,1,'battle',TAKONCHU),mondo=add(s,0,'hand','dm23rp1-S3');
 give(s,0,'deck',Array(10).fill(NATURE));
 play(s,mondo,a=>a.face===1);
 drain(s);
 const drawn=s.players[0].deck.map(y=>y.uid);
 assert.equal(drawn.length,5);
 const physical=e.physicalCards(s).map(y=>y.uid).sort(),initialHand=s.players[0].hand.map(y=>y.uid);
 const zero=add(s,0,'hand',ZERO);
 play(s,zero);pick(s,x.uid);
 assert.deepEqual(s.players[0].hand.map(y=>y.uid),[...initialHand,...drawn]);
 assert.deepEqual(e.physicalCards(s).map(y=>y.uid).sort(),[...physical,zero.uid].sort());
 assert.equal(s.winner,null);
 assert.equal(s.phase,'rematch');
 assert.equal(s.decision,null);
 assert.equal(e.power(x,false,s),0);
 assert.equal(s.log.filter(row=>row.type==='rematch').length,1);
 const saved=structuredClone(s);
 assert.deepEqual(e.getLegalActions(saved),[]);
 assert.equal(e.chooseAI(saved),null);
 assert.throws(()=>e.step(saved,0),/選択できない行動/);
});

test('simultaneous destruction determines Dis Penter eligibility before Takonchu gains power (QA39667)',()=>{
 const s=field(),x=add(s,1,'battle',TAKONCHU),penter=add(s,1,'battle',PENTER);
 for(let i=0;i<4;i++)add(s,0,'battle',WATER);
 cast(s,SWEEP);
 assert.ok(has(s,1,'battle',x));
 assert.ok(has(s,1,'grave',penter));
 assert.ok(!has(s,1,'hand',penter));
 assert.equal(e.power(x,false,s),10000);
 assert.equal(s.players[0].hand.length,5);
});

test('Takonchu competes with another mandatory destruction replacement and its draw cannot be replaced',()=>{
 for(const kind of ['replaceTakonchu1274','replaceYamata']){
  let s=field();
  const x=add(s,1,'battle',TAKONCHU);
  add(s,1,'battle',YAMATA);
  add(s,0,'battle',VEIL);
  cast(s,KILL);act(s,'effect',a=>a.targets[0].uid===x.uid);
  assert.equal(s.decision.player,1);
  const legal=e.getLegalActions(s);
  assert.ok(legal.some(a=>a.kind==='replaceTakonchu1274'));
  assert.ok(legal.some(a=>a.kind==='replaceYamata'));
  assert.ok(!legal.some(a=>a.kind==='allowLeave'));
  s=JSON.parse(JSON.stringify(s));
  act(s,kind);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,kind==='replaceYamata'?'mana':'battle',x));
  assert.equal(s.players[0].hand.length,kind==='replaceYamata'?0:5);
 }
});

test('Takonchu goes to the graveyard during its own turn and can be bounced on the opponent turn',()=>{
 const own=field(),x=add(own,0,'battle',TAKONCHU,{powerModifiers:[{amount:-5000}]});
 act(own,'toAttack');
 assert.ok(has(own,0,'grave',x));
 assert.equal(own.players[1].hand.length,0);
 const opposing=field(),y=add(opposing,1,'battle',TAKONCHU);
 cast(opposing,BOUNCE);pick(opposing,y.uid);
 assert.ok(has(opposing,1,'hand',y));
 assert.equal(opposing.players[0].hand.length,0);
});

test('Rabbit has all five civilizations on the board and only nature in hand, mana, and grave (QA42361)',()=>{
 const s=field(),x=add(s,0,'hand',RABBIT);
 const colors=['光','水','闇','火','自然'];
 assert.deepEqual(e.zoneCard(s,0,x,'hand').civilizations,['自然']);
 play(s,x);
 assert.deepEqual(e.effectiveCard(x,s).civilizations,colors);
 assert.equal(e.natureElements(s,0),1);
 add(s,1,'battle',GENMU);
 assert.deepEqual(e.effectiveCard(x,s).civilizations,['自然']);
 s.players[0].battle=[];
 for(const zone of ['mana','grave']){
  s.players[0][zone].push(x);
  assert.deepEqual(e.zoneCard(s,0,x,zone).civilizations,['自然']);
  s.players[0][zone].pop();
 }
});

test('Rabbit shields the top card with EX Life and battles an untapped creature on its entry turn',()=>{
 const s=field(),x=add(s,0,'hand',RABBIT),target=add(s,1,'battle',PENTER);
 const top=s.players[0].deck[0];
 play(s,x);
 assert.deepEqual(e.exLifeShields(s,0,x).map(y=>y.uid),[top.uid]);
 attack(s,x.uid,target.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.ok(has(s,1,'grave',target));
 pass(s);s.phase='main';
 cast(s,BOUNCE);pick(s,x.uid);drain(s);
 assert.ok(has(s,0,'battle',x));
 assert.ok(has(s,0,'grave',top));
 assert.deepEqual(e.exLifeShields(s,0,x),[]);
});

test('EX Life evolution can spend the Rabbit shield inherited from its base (QA42663 analogue)',()=>{
 const s=field(),base=add(s,0,'hand',RABBIT),evolution=add(s,0,'hand',REVVO);
 const [baseShield,evolutionShield]=s.players[0].deck;
 play(s,base);
 play(s,evolution);
 act(s,'evolve',a=>a.baseUid===base.uid);
 drain(s);
 assert.deepEqual(e.exLifeShields(s,0,evolution).map(x=>x.uid),[baseShield.uid,evolutionShield.uid]);
 pass(s);
 s.phase='main';
 cast(s,KILL);act(s,'effect',a=>a.targets[0].uid===evolution.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='replaceEx').map(a=>a.shield),
  [baseShield.uid,evolutionShield.uid]);
 act(s,'replaceEx',a=>a.shield===baseShield.uid);
 assert.ok(has(s,0,'battle',evolution));
 assert.ok(has(s,0,'grave',baseShield));
 assert.ok(has(s,0,'shields',evolutionShield));
});

test('Medic grants Just Diver to itself and later allied Distass, without granting prior protection (QA40245)',()=>{
 const s=field(),old=add(s,0,'battle',PENTER),opposing=add(s,1,'battle',PENTER),medic=add(s,0,'hand',MEDIC);
 play(s,medic);
 assert.equal(medic.justDiverActive,true);
 assert.equal(e.effectiveCard(old,s).justDiver,true);
 assert.equal(old.justDiverActive,undefined);
 assert.equal(e.effectiveCard(opposing,s).justDiver,undefined);
 const entrant=add(s,0,'hand',DISTAS);
 play(s,entrant);drain(s);
 assert.equal(entrant.justDiverActive,true);
 assert.deepEqual(e.effectiveCard(entrant,s).civilizations,['水']);
});

test('granted Just Diver protects against attack and selection until the next own turn after Medic is sacrificed',()=>{
 const s=field(),medic=add(s,0,'battle',MEDIC),entrant=add(s,0,'hand',DISTAS),other=add(s,0,'battle',WATER);
 const enemy=add(s,1,'battle',WATER);
 play(s,entrant);drain(s);
 const dis=add(s,0,'hand',DISPECTOR);
 play(s,dis,a=>a.alternative==='sasage'&&a.sasage.includes(medic.uid)&&a.cost===6);
 drain(s);
 assert.ok(has(s,0,'grave',medic));
 assert.ok(has(s,0,'battle',dis));
 pass(s);
 entrant.tapped=true;other.tapped=true;
 enemy.tapped=false;
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===other.uid));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===entrant.uid));
 s.phase='main';cast(s,BOUNCE);
 assert.ok(!values(s).some(x=>x?.uid===entrant.uid));
 pick(s,other.uid);drain(s);
 pass(s);
 assert.equal(entrant.justDiverActive,undefined);
});

test('opposing entry suppression stops granted Just Diver (QA40533 analogue)',()=>{
 const s=field(),medic=add(s,0,'battle',MEDIC),entrant=add(s,0,'hand',DISTAS);
 add(s,1,'battle',SILENCE);
 play(s,entrant);drain(s);
 assert.equal(e.effectiveCard(entrant,s).justDiver,true);
 assert.equal(entrant.justDiverActive,undefined);
 assert.ok(has(s,0,'battle',medic));
});
