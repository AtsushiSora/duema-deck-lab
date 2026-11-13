import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LOVE='dm25ex2-071',CLASSIC='dm25ex2-035',BAZA='dm25ex2-063';
const WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const SEED='dm22ex2-067',HAND='dm01-027',BOLSHACK='dmex04-027',TWO_NAMES='dmbd16-008';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>x.uid===y.uid);
const values=s=>s.decision?.choices?.map(x=>x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>(values(s)[a.choice]?.uid??values(s)[a.choice])===value);

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

test('three official definitions have distinct canonical IDs and reject unrecognized abilities',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1116.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1116}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1116}));
 }
});

function end(s){
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 act(s,'skipCharge');
}

test('Love repeats its tap lock after moving a hand card to the extra zone',()=>{
 let s=setup();
 const first=add(s,1,'battle',WATER),second=add(s,1,'battle',FIRE,{tapped:true});
 const spent=add(s,0,'hand',DARK);
 play(s,LOVE);
 pick(s,first.uid);
 assert.ok(first.tapped);
 assert.equal(e.canUntap(first),false);
 s=JSON.parse(JSON.stringify(s));
 pick(s,spent.uid);
 assert.ok(has(s,0,'extra',spent));
 pick(s,second.uid);
 const targets=()=>s.players[1].battle.filter(x=>[first.uid,second.uid].includes(x.uid));
 assert.ok(targets().every(x=>x.tapped&&!e.canUntap(x)));
 end(s);
 assert.ok(targets().every(x=>x.tapped&&!e.canUntap(x)));
 end(s);
 assert.ok(targets().every(x=>e.canUntap(x)));
 end(s);
 assert.ok(targets().every(x=>!x.tapped));
});

test('Love can decline the hand move and may select the same target again',()=>{
 for(const repeat of [true,false]){
  const s=setup(),target=add(s,1,'battle',FIRE),spent=add(s,0,'hand',DARK);
  play(s,LOVE);
  pick(s,target.uid);
  pick(s,repeat?spent.uid:null);
  if(repeat)pick(s,target.uid);
  assert.equal(has(s,0,'extra',spent),repeat);
  end(s);
  assert.ok(target.tapped&&!e.canUntap(target));
  end(s);
  assert.ok(e.canUntap(target));
 }
});

test('Love follows the same creature while it has that type and lifts the lock on a dormant ACE',()=>{
 const s=setup(),ace=add(s,1,'battle','dm22rp2-S8');
 const allies=Array.from({length:3},()=>add(s,1,'battle',NATURE));
 assert.equal(e.isCreature(s,ace),true);
 play(s,LOVE);
 pick(s,ace.uid);
 assert.equal(e.canUntap(ace),false);
 play(s,HAND);
 act(s,'effect',a=>a.targets?.some(x=>x.uid===allies[0].uid));
 assert.equal(e.isCreature(s,ace),false);
 assert.equal(e.canUntap(ace),true);
 end(s);
 assert.equal(ace.tapped,false);
});

test('Classic returns untargetable opponent creatures to their owners and leaves seeds and allies in place',()=>{
 const s=setup(),ally=add(s,0,'battle',WATER);
 const borrowed=add(s,1,'battle',FIRE,{cardOwner:0});
 const diver=add(s,1,'battle','dm25rp3-012',{justDiverActive:true});
 const seed=add(s,1,'battle',SEED);
 const classic=play(s,CLASSIC);
 drain(s);
 assert.ok(has(s,0,'hand',borrowed)&&has(s,1,'hand',diver));
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',seed));
 const rules=e.effectiveCard(classic,s);
 assert.ok(rules.blocker);
 assert.equal(rules.breaker,3);
 assert.equal(e.power(classic,false,s),12000);
 assert.equal(e.power(ally,false,s),7000);
 assert.ok(e.effectiveCard(ally,s).poweredBreaker);
 assert.equal(e.effectiveCard(ally,s).breaker,2);
});

test('Classic auras apply to later creatures, stack from distinct sources, and end when their source leaves',()=>{
 const s=setup(),classic=play(s,CLASSIC),ally=play(s,WATER);
 assert.equal(e.power(ally,false,s),7000);
 const second=play(s,CLASSIC);
 assert.equal(e.power(ally,false,s),13000);
 assert.equal(e.effectiveCard(ally,s).breaker,3);
 assert.equal(e.power(classic,false,s),18000);
 end(s);
 play(s,HAND,a=>a.cost===6);
 act(s,'effect',a=>a.targets?.some(x=>x.uid===classic.uid));
 assert.ok(has(s,0,'grave',classic));
 assert.equal(e.power(ally,false,s),7000);
 assert.equal(e.power(second,false,s),12000);
});

test('Classic lets an ally choose its own T-breaker or the granted Powered Breaker',()=>{
 for(const count of [3,4]){
  const s=setup(),ally=add(s,0,'battle','dm05-s04');
  s.turn=3;
  play(s,CLASSIC);
  assert.equal(e.power(ally,false,s),21000);
  act(s,'toAttack');
  act(s,'attack',a=>a.uid===ally.uid&&a.target==='player');
  act(s,'noBlock');
  assert.deepEqual(values(s),[3,4]);
  pick(s,count);
  assert.equal(s.decision.count,count);
  drain(s);
  assert.equal(s.players[1].shields.length,5-count);
 }
});

test('Baza counts each matching graveyard card once even when both twinpact names match',()=>{
 const s=setup(),baza=play(s,BAZA);
 add(s,0,'grave',BOLSHACK);
 const twoNames=add(s,0,'grave',TWO_NAMES);
 add(s,0,'grave',FIRE);
 add(s,1,'grave',BOLSHACK);
 assert.equal(e.power(baza,false,s),15500);
 assert.equal(e.effectiveCard(baza,s).breaker,3);
 twoNames.faceDown=true;
 assert.equal(e.power(baza,false,s),12500);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===baza.uid));
});

test('Baza untaps when an opposing creature changes from untapped to tapped on either turn',()=>{
 const s=setup(),baza=add(s,0,'battle',BAZA,{tapped:true});
 const fresh=add(s,1,'battle',WATER),already=add(s,1,'battle',FIRE,{tapped:true});
 const spent=add(s,0,'hand',DARK);
 play(s,LOVE);
 pick(s,already.uid);
 assert.ok(baza.tapped);
 pick(s,spent.uid);
 pick(s,fresh.uid);
 drain(s);
 assert.ok(!baza.tapped&&fresh.tapped);
 const attacker=add(s,1,'battle',NATURE);
 end(s);
 baza.tapped=true;
 act(s,'toAttack');
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 drain(s);
 assert.equal(baza.tapped,false);
});

test('Baza redirects a creature attack with Guardman and may use Escape to keep itself',()=>{
 for(const escape of [true,false]){
  const s=setup(),ally=add(s,0,'battle',WATER,{tapped:true}),baza=add(s,0,'battle',BAZA);
  const shield=add(s,0,'shields',HAND);
  const attacker=add(s,1,'battle',CLASSIC);
  s.active=1;
  s.turn=3;
  s.phase='attack';
  act(s,'attack',a=>a.uid===attacker.uid&&a.target===ally.uid);
  act(s,'guardman',a=>a.uid===baza.uid);
  if(escape)act(s,'replaceEscape',a=>a.shield===shield.uid||a.shieldUid===shield.uid);
  else act(s,'allowLeave');
  assert.ok(has(s,0,'battle',ally));
  assert.equal(has(s,0,'battle',baza),escape);
  assert.equal(has(s,0,'hand',shield),escape);
  assert.ok(!s.decision);
 }
});
