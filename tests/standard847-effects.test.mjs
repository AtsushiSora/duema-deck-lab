import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const VAIP='dmrp06-073',ZABU='dmrp06-030',ZENMAI='dmrp02-084',ELJI='dmrp20-080',PRINT='promoy17-101';
const GHOST='dm01-094',REVERSE='dm01-058',RAMP='dm06-110',APUL='dmrp22-042';
const SPEED='dm05-049',CONDITIONAL='dmrp06-025',LAND='dm01-108',FIRE='dm01-097';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,v)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===v;
});
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 847 preserves the original IDs and resolves the Zabumple promo to one card',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-847.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[VAIP,ZABU,ZENMAI,ELJI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,ZABU]]);
 assert.deepEqual(registry.resolveRows([{id:PRINT,count:1},{id:ZABU,count:3}]),[{id:ZABU,count:4}]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:847}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:846}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:847}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.civilizations,c.limit],[f.name,f.cost,Number(f.powerText),f.race,f.civilizations.filter(color=>color!=='無色'),4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
 assert.deepEqual(standardCardSpec({...m.printAliases[0],status:'complete'},{phase:847}),m.cards[1].spec);
 assert.ok(Object.values(m.regulationVerification.limits).every(n=>n===4));
});

test('Vaipshu offers each copy independently after the spell resolves, including after resuming',()=>{
 let s=setup();
 const a=put(s,0,'grave',VAIP),b=put(s,0,'grave',VAIP),enemy=put(s,1,'hand',FIRE);
 const spell=play(s,GHOST),before=physical(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'grave',spell));
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',action=>s.pendingEffects.some(q=>q.effectId===action.effectId&&q.uid===a.uid));
 s=structuredClone(s);
 pick(s,true);
 pick(s,null);
 assert.ok(has(s,0,'hand',a)&&has(s,0,'grave',b));
 assert.deepEqual(physical(s),before);
});

test('Vaipshu does not trigger for the other player, or leave a locked grave',()=>{
 for(const variant of ['enemy','lock']){
  const s=setup(),x=put(s,0,'grave',VAIP);
  if(variant==='enemy')s.active=1;
  else put(s,1,'battle',APUL);
  play(s,RAMP);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'grave',x));
 }
});

test('Vaipshu triggers on its controller’s shield spell in the opponent’s turn',()=>{
 const s=setup(),x=put(s,0,'grave',VAIP),attacker=put(s,1,'battle',LAND);
 give(s,0,'shields',[RAMP]);s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===RAMP);
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.ok(has(s,0,'hand',x));
});

test('A spell that recovers Vaipshu itself consumes the original pending return',()=>{
 const s=setup(),x=put(s,0,'grave',VAIP);
 play(s,REVERSE);
 pick(s,x.uid);
 assert.ok(has(s,0,'hand',x));
 assert.equal(s.decision,null);
});

test('A card entering the grave during resolution only triggers on the next spell',()=>{
 const s=setup();
 give(s,0,'deck',[VAIP,LAND,LAND,LAND,LAND]);
 const x=s.players[0].deck[0];
 play(s,'dmd04-005');
 assert.ok(has(s,0,'grave',x));
 assert.equal(s.decision,null);
 play(s,RAMP);
 pick(s,true);
 assert.ok(has(s,0,'hand',x));
});

for(const player of [0,1])test('Zabumple taps either player’s printed Speed Attacker on entry '+player,()=>{
 const s=setup();
 put(s,0,'battle',ZABU);s.active=player;
 const x=play(s,SPEED),ordinary=play(s,FIRE);
 assert.equal(x.tapped,true);
 assert.equal(ordinary.tapped,false);
 s.phase='attack';
 assert.ok(!legal(s,'attack').some(a=>a.uid===x.uid));
});

test('Zabumple does not tap a creature that gains Speed Attacker after entry (QA39939)',()=>{
 const s=setup();
 put(s,0,'battle',ZABU);
 const x=play(s,CONDITIONAL);
 assert.equal(x.tapped,false);
 assert.ok(e.effectiveCard(x,s).speedAttacker);
 s.phase='attack';
 assert.ok(legal(s,'attack').some(a=>a.uid===x.uid));
});

test('An ignored Zabumple has no effect on entry',()=>{
 const s=setup();
 put(s,0,'battle',ZABU,{g35Ignored:s.turn});
 assert.equal(play(s,SPEED).tapped,false);
});

test('Zabumple also taps a creature put into battle without summoning',()=>{
 const s=setup(),x=put(s,0,'hand',SPEED);
 put(s,1,'battle',ZABU);
 s.extTasks=[{op:'putCreature',p:0,source:REVERSE,origin:'hand',uid:x.uid}];
 act(s,'toAttack');
 assert.ok(has(s,0,'battle',x));
 assert.equal(x.tapped,true);
});

for(const id of [ZENMAI,ELJI])test(id+' must target an attackable creature before ending, while allies retain their options',()=>{
 const s=setup(),x=put(s,0,'battle',id),ally=put(s,0,'battle',LAND);
 const target=put(s,1,'battle',FIRE,{tapped:true});
 s.phase='attack';
 assert.equal(legal(s,'endTurn').length,0);
 assert.ok(legal(s,'attack').some(a=>a.uid===ally.uid&&a.target==='player'));
 assert.deepEqual(legal(s,'attack').filter(a=>a.uid===x.uid).map(a=>a.target),[target.uid]);
 attack(s,x.uid,target.uid);
 drain(s);
 assert.ok(has(s,1,'grave',target));
 assert.equal(legal(s,'endTurn').length,1);
});

test('Zenmai is forced again if untapped with a second available creature',()=>{
 const s=setup(),x=put(s,0,'battle',ZENMAI);
 const a=put(s,1,'battle',FIRE,{tapped:true}),b=put(s,1,'battle',FIRE,{tapped:true});
 attack(s,x.uid,a.uid);
 drain(s);
 x.tapped=false;
 assert.equal(legal(s,'endTurn').length,0);
 assert.deepEqual(legal(s,'attack').filter(a=>a.uid===x.uid).map(a=>a.target),[b.uid]);
});

test('Zenmai can attack a player when there are no legal creature targets',()=>{
 const s=setup(),x=put(s,0,'battle',ZENMAI);
 put(s,1,'battle',FIRE);
 s.phase='attack';
 assert.equal(legal(s,'endTurn').length,1);
 assert.ok(legal(s,'attack').some(a=>a.uid===x.uid&&a.target==='player'));
});

test('Zenmai has no obligation while sick or tapped, or while its ability is ignored',()=>{
 for(const attrs of [{entered:1},{tapped:true},{g35Ignored:1}]){
  const s=setup();s.turn=1;s.phase='attack';
  const x=put(s,0,'battle',ZENMAI,attrs);
  put(s,1,'battle',FIRE,{tapped:true});
  assert.equal(legal(s,'endTurn').length,1);
  assert.equal(legal(s,'attack').some(a=>a.uid===x.uid&&a.target==='player'),!!attrs.g35Ignored);
 }
});

test('Elji optionally reduces a Dispector summon by one and is destroyed before entry',()=>{
 const s=setup(),donor=put(s,0,'battle',ELJI),recipient=put(s,0,'hand','dmrp17-016'),other=put(s,0,'hand',FIRE);
 const before=physical(s),actions=legal(s,'play');
 assert.ok(actions.some(a=>a.uid===recipient.uid&&!a.alternative&&a.cost===e.card(recipient).cost));
 assert.ok(!actions.some(a=>a.uid===other.uid&&a.alternative==='sasage'));
 act(s,'play',a=>a.uid===recipient.uid&&a.alternative==='sasage'&&a.sasage.includes(donor.uid)&&a.cost===e.card(recipient).cost-1);
 drain(s);
 assert.ok(has(s,0,'battle',recipient)&&has(s,0,'grave',donor));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(recipient).cost-1);
 assert.deepEqual(physical(s),before);
});
