import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PRINCESS='dm25ex2-076',PRELUDE='dmx13-018',APACHE='dmx15-019',AQUA='dmbd13-012';
const WATER='dm01-083',FIRE='dm01-097',NATURE='dm01-108',DARK='dm01-090',HIGH='dm01-s07';
const YATTARE='dmsd01-012',RA='dmrp01-058',GIFT='dm14-069',LEGACY_MULTI='dmr02-054';
const choices=s=>s.decision?.choices?.map(x=>x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>(choices(s)[a.choice]?.uid??choices(s)[a.choice])===value);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>x.uid===y.uid);

function table(){
 const s=setup();
 s.turn=3;
 for(const p of [0,1])give(s,p,'hand',[]);
 return s;
}

function add(s,p,zone,id,props={}){
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
}

function play(s,id,match=()=>true){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&match(a));
 return x;
}

test('three registered names and fifteen official prints keep one canonical deck ID per name',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1113.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1113}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1113}));
 }
 for(const row of manifest.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1113}),row.spec);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===row.canonicalId&&x.image===row.image));
 }
});

test('Prelude casts at three mana and offers zero-cost Apache, whose real entry is returned by Aqua (QA 38714)',()=>{
 const s=table(),own=s.players[0];
 add(s,1,'battle',AQUA);
 const eligible=add(s,0,'deck',WATER);
 play(s,PRELUDE);
 const mana=own.mana.filter(x=>x.tapped).length;
 assert.equal(mana,3);
 const apache=play(s,APACHE,a=>a.cost===0);
 assert.ok(has(s,0,'battle',apache));
 assert.equal(s.decision?.player,0);
 assert.ok(choices(s).some(x=>x?.uid===eligible.uid));
 pick(s,null);
 assert.equal(s.decision?.source,AQUA);
 assert.equal(s.decision?.player,1);
 pick(s,true);
 assert.ok(has(s,0,'hand',apache));
 assert.equal(own.mana.filter(x=>x.tapped).length,mana);
 assert.equal(e.summonCost(s,0,e.card(APACHE)),4);
});

test('Prelude is scoped to the next matching summon, permits a smaller reduction and expires at turn end',()=>{
 const s=table();
 play(s,PRELUDE);
 play(s,FIRE,a=>a.cost===2);
 const a=play(s,APACHE,a=>a.g456Reduction===2&&a.cost===2);
 drain(s);
 assert.ok(has(s,0,'battle',a));
 assert.equal(e.summonCost(s,0,e.card(APACHE)),4);
 play(s,PRELUDE);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(e.summonCost(s,0,e.card(APACHE)),4);
});

test('multiple Prelude reductions stack, while an applied one-mana floor survives (QA 40363 and QA 39980)',()=>{
 const s=table(), expensive='dmrp07-001';
 assert.ok(e.card(expensive).cost>5&&e.card(expensive).cost<=10);
 assert.equal(e.card(expensive).civilizations.length,0);
 play(s,PRELUDE);
 assert.equal(e.summonCost(s,0,e.card(expensive)),e.card(expensive).cost-5);
 play(s,PRELUDE);
 assert.equal(e.summonCost(s,0,e.card(expensive)),0);
 assert.equal(e.summonCost(s,0,e.card(RA)),0);
 add(s,0,'battle',YATTARE);
 assert.equal(e.summonCost(s,0,e.card(RA)),1);
});

test('Apache privately searches the full library, ignores an old mana rule and shuffles after one deployment',()=>{
 const s=table(),own=s.players[0];
 give(s,0,'deck',[WATER,PRELUDE,LEGACY_MULTI,HIGH,AQUA,NATURE,DARK]);
 const [plain,spell,legacy,high,withAbility]=own.deck;
 const before=s.rng;
 play(s,APACHE);
 assert.ok(choices(s).some(v=>v?.uid===plain.uid)&&choices(s).some(v=>v?.uid===legacy.uid));
 assert.ok(!choices(s).some(v=>[spell,high,withAbility].some(x=>x.uid===v?.uid)));
 assert.ok(s.log.some(x=>x.type==='look'&&x.cardId===APACHE));
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===APACHE));
 pick(s,legacy.uid);
 assert.ok(has(s,0,'battle',legacy));
 assert.ok(has(s,0,'deck',plain));
 assert.notEqual(s.rng,before);
 assert.deepEqual(own.g34Protected,[]);
});

test('Apache recognizes a blank creature face independently of its spell and shuffles after declining',()=>{
 const twin='fixture-1113-blank-twinpact';
 const base=e.card(WATER),spell=e.card(GIFT);
 e.setCards([...data.cards,{...base,id:twin,name:'Blank creature / Spell',text:'能力なし\n【呪文面】\n'+spell.text,
  spellFace:{...spell,id:twin,name:'Spell'}}]);
 try{
  const s=table();
  give(s,0,'deck',[twin,WATER,NATURE,DARK]);
  const [x]=s.players[0].deck,before=s.rng;
  play(s,APACHE);
  assert.ok(choices(s).some(v=>v?.uid===x.uid));
  pick(s,null);
  assert.ok(has(s,0,'deck',x));
  assert.notEqual(s.rng,before);
 }finally{e.setCards(data.cards);}
});

test('Princess reduces one creature before the hand choice, and can then reduce another',()=>{
 const s=table(),first=add(s,1,'battle',WATER),second=add(s,1,'battle',FIRE);
 const hand=add(s,0,'hand',DARK);
 play(s,PRINCESS);
 pick(s,first.uid);
 assert.ok(has(s,1,'grave',first)&&has(s,1,'battle',second));
 pick(s,hand.uid);
 assert.ok(!choices(s).some(x=>x?.uid===first.uid));
 pick(s,second.uid);
 assert.ok(has(s,1,'grave',second)&&has(s,0,'extra',hand));
});

test('Princess can choose the same surviving creature again or decline the repeat',()=>{
 for(const repeat of [true,false]){
  const s=table(),target=add(s,1,'battle',FIRE,{powerModifiers:[{amount:5000}]});
  const hand=add(s,0,'hand',DARK);
  play(s,PRINCESS);
  pick(s,target.uid);
  assert.equal(e.power(target,false,s),4000);
  pick(s,repeat?hand.uid:null);
  if(repeat)pick(s,target.uid);
  assert.equal(e.power(target,false,s),repeat?1000:4000);
  assert.equal(has(s,0,'extra',hand),repeat);
  act(s,'toAttack');
  act(s,'endTurn');
  drain(s);
  assert.equal(e.power(target,false,s),7000);
 }
});
