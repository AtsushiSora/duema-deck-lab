import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const DEMI='dmrp06-005',KIRKE='dmrp08-020',ZEKIA='dmx13-009';
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',SEED='dm22ex1-086';
const HAND='dm01-027',EX='dm23ex2-016',STAR='dmrp21-052',BLOCKER='dm01-076',ONIKAMASU='dmrp01-041';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const restore=s=>decodeBattleData(encodeBattleData(s));

function add(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function end(s){
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
}
function destroyWithHand(s,x){
 play(s,add(s,s.active,'hand',HAND));
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
}
function pickAndFinishAttack(s,uid){
 pick(s,uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 drain(s);
}

test('Three verified definitions retain the official printing, restrictions, names and IDs',()=>{
 const manifest=read('tools/support-phase-1050.json'),catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[DEMI,KIRKE,ZEKIA]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.equal(catalogue.get(row.id).id,row.id);
  assert.ok(catalogue.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations.filter(v=>v!=='無色'),1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1050}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.equal(c.breaker,2);
 }
});

test('Demiblam makes the opponent destroy one untapped creature before breaking two shields',()=>{
 const s=field(),demi=add(s,0,'battle',DEMI),tapped=add(s,1,'battle',FIRE),target=add(s,1,'battle',ONIKAMASU);
 add(s,1,'battle',SEED);
 tapped.tapped=true;
 attack(s,demi.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[target.uid]);
 pickAndFinishAttack(s,target.uid);
 assert.ok(has(s,1,'grave',target)&&has(s,1,'battle',tapped));
 assert.equal(s.players[1].shields.length,3);
});

test('Demiblam returns mandatorily after two enemy destructions including Star Evolution, even after restoring',()=>{
 let s=field();
 const demi=add(s,0,'grave',DEMI),normal=add(s,1,'battle',NATURE),star=add(s,1,'battle',STAR);
 star.under=[inst(WATER)];
 const base=star.under[0];
 destroyWithHand(s,normal);
 destroyWithHand(s,star);
 assert.ok(has(s,1,'battle',base)&&has(s,1,'grave',star));
 assert.deepEqual(s.g393DDestroyed.byPlayer,[0,2]);
 const all=physical(s);
 s=restore(s);
 end(s);
 assert.ok(has(s,0,'hand',demi));
 assert.deepEqual(physical(s),all);
});

test('Demiblam does not count an EX Life replacement or a friendly death toward the threshold',()=>{
 const s=field(),demi=add(s,0,'grave',DEMI),normal=add(s,1,'battle',NATURE);
 const shield=s.players[1].shields[0],enemy=add(s,1,'battle',EX);
 enemy.exLifeShieldUid=shield.uid;
 destroyWithHand(s,normal);
 destroyWithHand(s,enemy);
 drain(s);
 assert.ok(has(s,1,'battle',enemy)&&has(s,1,'grave',shield));
 s.active=1;
 destroyWithHand(s,add(s,0,'battle',NATURE));
 s.active=0;
 assert.deepEqual(s.g393DDestroyed.byPlayer,[1,1]);
 end(s);
 assert.ok(has(s,0,'grave',demi));
});

test('Demiblam counts only its own ending turn',()=>{
 const s=field(),demi=add(s,0,'grave',DEMI);
 s.active=1;
 for(const p of [0,1])for(let n=0;n<3;n++)add(s,p,'battle',NATURE);
 play(s,add(s,1,'hand','dm14-015'));
 drain(s);
 assert.deepEqual(s.g393DDestroyed.byPlayer,[3,3]);
 end(s);
 assert.ok(has(s,0,'grave',demi));
 s.phase='main';
 end(s);
 assert.ok(has(s,0,'grave',demi));
});

for(const discardFirst of [true,false])test('Kirke resolves independent entries in either order '+discardFirst,()=>{
 let s=field();
 const kirke=add(s,0,'hand',KIRKE);
 const h1=add(s,1,'hand',FIRE),h2=add(s,1,'hand',WATER),h3=add(s,1,'hand',NATURE);
 const a=add(s,1,'battle',FIRE),b=add(s,1,'battle',WATER),seed=add(s,1,'battle',SEED),all=physical(s);
 play(s,kirke);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.label.includes(discardFirst?'手札枚数':'クリーチャー数'));
 const steps=discardFirst?[[h1,h2],[a,b]]:[[a,b],[h1,h2]];
 for(const [first,second] of steps){
  assert.equal(s.decision.player,1);
  assert.ok(!choices(s).includes(null)&&!choices(s).includes(seed.uid));
  pick(s,first.uid);
  assert.ok(!has(s,1,'grave',first));
  s=restore(s);
  pick(s,second.uid);
  assert.ok(has(s,1,'grave',first)&&has(s,1,'grave',second));
 }
 assert.ok(has(s,1,'hand',h3)&&has(s,1,'battle',seed)&&has(s,0,'battle',kirke));
 assert.deepEqual(physical(s),all);
});

test('Kirke does neither action when creature and post-summon hand counts are equal',()=>{
 const s=field(),kirke=add(s,0,'hand',KIRKE);
 add(s,0,'hand',FIRE);
 add(s,1,'hand',FIRE);
 add(s,1,'battle',FIRE);
 add(s,1,'battle',SEED);
 play(s,kirke);
 drain(s);
 assert.equal(s.players[1].hand.length,1);
 assert.equal(s.players[1].battle.length,2);
 assert.equal(s.players[1].grave.length,0);
});

test('Zekia destroys the last blocker before blocking and may turn the next deck card into a new shield',()=>{
 const s=field(),zekia=add(s,0,'battle',ZEKIA),blocker=add(s,1,'battle',BLOCKER);
 const top=s.players[0].deck[0],all=physical(s);
 attack(s,zekia.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[blocker.uid]);
 pick(s,blocker.uid);
 assert.ok(has(s,1,'grave',blocker));
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[true,null]);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'shields',top)&&!top.faceUp);
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),all);
});

test('Zekia may decline after a colored death and receives no shield offer for a colorless death',()=>{
 for(const colorless of [false,true]){
  const s=field(),top=s.players[0].deck[0];
  add(s,0,'battle',ZEKIA);
  const enemy=add(s,1,'battle',colorless?ZEKIA:FIRE);
  destroyWithHand(s,enemy);
  if(colorless)assert.equal(s.decision,null);
  else{
   assert.deepEqual(choices(s),[true,null]);
   pick(s,null);
  }
  assert.ok(has(s,1,'grave',enemy));
  assert.equal(s.players[0].deck[0],top);
 }
});
