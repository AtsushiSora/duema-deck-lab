import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,cast,data,details,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const DRAVITA='dm37-023', VICE='dm37-029', JENNY='dmex17-086', RAIDEN='dmr02-043';
const LIGHT='dm01-076', DARK='dm01-090', NATURE='dm01-108';
const TWIN_CHEAP_SPELL='dm22ex1-030', TWIN_EXPENSIVE_SPELL='dmex12-074', SPELL='dm06-085';
const MARTINI='dm37-024', JOHN='dm37-033', UNTOUCHABLE='dm37-021', FIVE='dm39-001';
const APRIL='dm36-053', CHEVAL='dm38-033', EX_LIFE='dmex16-072';
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const pickBack=(s,x)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice]?.value;
 return value?.uid===x.uid&&value.g1104Back===true;
});
const find=(rows,id)=>rows.find(x=>x.cardId===id);

function table(extra=[MARTINI,JOHN,UNTOUCHABLE,FIVE,APRIL,CHEVAL]){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:extra.map(id=>({id,count:1}))}));
 const s=e.createGame(decks,{seed:1104});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[LIGHT,DARK,NATURE,'dm01-083'].flatMap(id=>Array(4).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}

test('Dravita uses the spell face cost in the grave and can deploy a light cost-six Psychic',()=>{
 const s=table(),own=s.players[0],five=find(own.extra,FIVE);
 give(s,0,'grave',[SPELL,TWIN_CHEAP_SPELL,TWIN_EXPENSIVE_SPELL,NATURE,DRAVITA]);
 const [cheap,twin]=own.grave;
 cast(s,DRAVITA);
 assert.deepEqual(values(s),[cheap.uid,twin.uid]);
 pick(s,twin.uid);
 assert.deepEqual(own.hand,[twin]);
 pick(s,1);
 assert.ok(values(s).includes(five.uid));
 assert.ok(!values(s).includes(find(own.extra,APRIL).uid));
 pick(s,five.uid);
 assert.deepEqual(own.battle,[five]);
 assert.equal(e.card(five).cost,6);
});

test('Dravita can skip an empty grave and choose multiple Psychics within total cost five',()=>{
 const s=table(),own=s.players[0],untouchable=find(own.extra,UNTOUCHABLE),john=find(own.extra,JOHN);
 cast(s,DRAVITA);
 pick(s,0);
 pick(s,untouchable.uid);
 assert.ok(values(s).includes(john.uid));
 assert.ok(!values(s).includes(find(own.extra,APRIL).uid));
 pick(s,john.uid);
 assert.deepEqual(own.battle,[untouchable,john]);
});

test('Vice privately inspects the full hand but can discard only a spell, including a twinpact',()=>{
 const s=table(),own=s.players[0],opp=s.players[1];
 give(s,1,'hand',[NATURE,VICE,TWIN_CHEAP_SPELL]);
 const [creature,spell,twin]=opp.hand;
 cast(s,VICE);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.task.seen,[NATURE,VICE,TWIN_CHEAP_SPELL]);
 assert.deepEqual(values(s),[spell.uid,twin.uid]);
 pick(s,twin.uid);
 assert.deepEqual(opp.hand,[creature,spell]);
 assert.ok(opp.grave.includes(twin));
 pick(s,1);
 const april=find(own.extra,APRIL);
 assert.deepEqual(values(s),[april.uid,april.uid,find(own.extra,CHEVAL).uid]);
 pick(s,find(own.extra,CHEVAL).uid);
 assert.equal(own.battle[0].cardId,CHEVAL);
});

test('Vice inspects a hand without spells and can deploy two Psychics for six',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],john=find(own.extra,JOHN),martini=find(own.extra,MARTINI);
 give(s,1,'hand',[NATURE]);
 cast(s,VICE);
 assert.deepEqual(values(s),[null]);
 pick(s,null);
 assert.equal(opp.hand.length,1);
 pick(s,0);
 pick(s,john.uid);
 assert.deepEqual(values(s),[martini.uid,find(own.extra,UNTOUCHABLE).uid,null]);
 pick(s,martini.uid);
 assert.deepEqual(own.battle,[john,martini]);
});

test('Jenny requires the opponent to choose a discard when they have cards (QA 40390)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1];
 give(s,1,'hand',[NATURE,LIGHT]);
 const selected=opp.hand[1];
 cast(s,JENNY);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),opp.hand.map(x=>x.uid));
 pick(s,selected.uid);
 assert.deepEqual(own.hand,[]);
 assert.deepEqual(opp.grave,[selected]);
 pick(s,1);
 pick(s,find(own.extra,CHEVAL).uid);
 assert.equal(own.battle[0].cardId,CHEVAL);
});

test('Jenny draws two before choosing the deployment when the opponent has no hand (QA 40390)',()=>{
 const s=table(),own=s.players[0],first=own.deck.slice(0,2);
 cast(s,JENNY);
 assert.deepEqual(own.hand,first);
 pick(s,1);
 pick(s,find(own.extra,APRIL).uid);
 assert.equal(own.battle[0].cardId,APRIL);
});

test('Raiden offers only non-Psychic creatures for its second deployment and can decline',()=>{
 for(const sacrifice of [true,false]){
  const s=table(),own=s.players[0],ally=inst(NATURE),cheval=find(own.extra,CHEVAL),april=find(own.extra,APRIL);
  own.battle.push(ally);
  cast(s,RAIDEN);
  assert.deepEqual(values(s),[april.uid,cheval.uid]);
  pick(s,cheval.uid);
  assert.deepEqual(values(s),[ally.uid,null]);
  pick(s,sacrifice?ally.uid:null);
  if(sacrifice){
   assert.ok(own.grave.includes(ally));
   assert.deepEqual(values(s),[april.uid]);
   pick(s,april.uid);
   assert.deepEqual(own.battle,[cheval,april]);
  }else{
   assert.deepEqual(own.battle,[ally,cheval]);
   assert.equal(s.decision,null);
  }
 }
});

test('Raiden still gets the second deployment when EX Life replaces destruction (QA 36427)',()=>{
 const s=table(),own=s.players[0],shield=own.shields[0],ally=inst(EX_LIFE);
 const cheval=find(own.extra,CHEVAL),april=find(own.extra,APRIL);
 ally.exLifeShieldUid=shield.uid;
 own.battle.push(ally);
 cast(s,RAIDEN);
 pick(s,cheval.uid);
 pick(s,ally.uid);
 assert.ok(own.battle.includes(ally));
 assert.ok(own.grave.includes(shield));
 pick(s,april.uid);
 assert.deepEqual(own.battle,[ally,cheval,april]);
});

test('Vice can deploy the ten-cost dark face directly and it cannot attack that turn',()=>{
 let s=table([APRIL]);
 const uid=s.players[0].extra[0].uid;
 cast(s,VICE);
 pick(s,1);
 assert.deepEqual(values(s),[uid,uid]);
 assert.deepEqual(s.decision.choices.map(c=>c.label),['時空の銃姫エイプリル','鎮魂の覚醒者デス・エイプリル']);
 s=JSON.parse(JSON.stringify(s));
 const own=s.players[0],april=own.extra[0];
 pickBack(s,april);
 assert.deepEqual(own.battle,[april]);
 assert.equal(e.card(april).name,'鎮魂の覚醒者デス・エイプリル');
 assert.equal(e.card(april).cost,10);
 assert.equal(april.g1085AwakenedTurn,undefined);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===april.uid));
});

test('A Psychic deployed on its back returns to the extra zone with the same ID',()=>{
 const s=table([APRIL]),own=s.players[0],april=own.extra[0];
 cast(s,VICE);
 pick(s,1);
 pickBack(s,april);
 s.active=1;
 cast(s,'dm01-027');
 act(s,'effect',a=>a.targets?.some(target=>target.uid===april.uid));
 assert.deepEqual(own.extra,[april]);
 assert.equal(e.card(april).name,'時空の銃姫エイプリル');
 assert.equal(april.cardId,APRIL);
});

test('Dravita can select the light back of a water Psychic',()=>{
 const s=table([MARTINI,UNTOUCHABLE]),own=s.players[0],martini=own.extra[0];
 cast(s,DRAVITA);
 pick(s,1);
 assert.deepEqual(values(s),[martini.uid,own.extra[1].uid]);
 pickBack(s,martini);
 assert.equal(e.card(martini).civ,'光');
 assert.equal(e.card(martini).cost,6);
 assert.equal(e.effectiveCard(martini,s).blocker,true);
});

test('The total-cost mode charges for the chosen face and cannot select the same card twice',()=>{
 const s=table([JOHN,MARTINI,UNTOUCHABLE]),own=s.players[0],john=own.extra[0];
 cast(s,VICE);
 pick(s,0);
 assert.equal(s.decision.choices.filter(c=>c.value?.uid===john.uid).length,2);
 pickBack(s,john);
 assert.deepEqual(own.battle,[john]);
 assert.equal(e.card(john).cost,5);
 assert.equal(s.decision,null);
});

test('Jenny does not draw if a nonempty hand is protected or the discard is replaced',()=>{
 for(const protectedHand of [true,false]){
  const s=table(),own=s.players[0],opp=s.players[1],ryusei=inst('dmr02-s03');
  if(protectedHand)opp.battle.push(inst('dmr14-036'));
  opp.hand.push(ryusei);
  cast(s,JENNY);
  if(!protectedHand){
   pick(s,ryusei.uid);
   pick(s,true);
   assert.ok(opp.battle.includes(ryusei));
  }else{
   assert.ok(opp.hand.includes(ryusei));
  }
  assert.deepEqual(own.hand,[]);
  assert.deepEqual(values(s),[0,1]);
 }
});

test('promo prints map to the existing canonical card identities and current copy limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const id of [DRAVITA,VICE,JENNY,RAIDEN]){
  assert.equal(registry.get(id).id,id);
  assert.equal(registry.get(id).limit,4);
 }
 assert.equal(registry.get('promoy10-019'),registry.get(VICE));
 assert.equal(registry.get('promoy10-024'),registry.get(RAIDEN));
});
