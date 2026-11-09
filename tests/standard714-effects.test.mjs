import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-714.json',import.meta.url)));

test('Phase 714 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:714}));
  assert.throws(()=>standardCardSpec(detail,{phase:713}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:714}));
 }
 for(const row of printAliases){
  const canonical=cards.find(x=>x.id===row.canonicalId);
  assert.equal(row.name,canonical.name);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:714}),canonical.spec);
  assert.ok(row.verification.facesMatched);
  assert.match(row.image,/^https:\/\/dm\.takaratomy\.co\.jp\/.*\.jpg$/);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[canonical.id]);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

const GUTS='dm10-031',SURPRISE='dm15-019',GIGA='dm10-024';
const LIGHT='dm01-075',FIRE='dm01-097',NATURE='dm01-108',BLOCKER='dm01-076';
const MULTI='dmr02-054',APUL='dmrp22-042';
const restore=s=>JSON.parse(JSON.stringify(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const field=(active=0)=>Object.assign(setup(),{active,phase:'attack'});
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const finishAttack=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===(value?.uid??value);
});
function playGiga(s){
 s.phase='main';
 const x=inst(GIGA);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
}

test('Guts can attack an untapped creature after its entry turn (official ruling 31436)',()=>{
 const s=field(),x=put(s,0,GUTS,{entered:s.turn}),enemy=put(s,1,NATURE);
 const canAttack=()=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid);
 assert.equal(canAttack(),false);
 x.entered--;
 assert.equal(canAttack(),true);
});

for(const amount of [3999,4000])test('Guts checks the original defender’s current power at the boundary: '+amount,()=>{
 const s=field(),x=put(s,0,GUTS);
 const target=put(s,1,NATURE,{powerModifiers:[{amount,expires:'end',who:0}]});
 const blocker=put(s,1,BLOCKER);
 attack(s,x.uid,target.uid);
 assert.equal(s.decision.type,'block');
 assert.equal(e.power(x,false,s),amount===4000?10000:1000);
 if(amount===4000){
  act(s,'block',a=>a.uid===blocker.uid);
  drain(s);
  assert.ok(find(s,1,'grave',blocker));
  assert.ok(find(s,1,'battle',target));
  assert.equal(e.power(x,false,s),10000);
  end(s);
  assert.equal(e.power(x,false,s),1000);
 }
});

test('Guts does not get the bonus when attacking the player even if a large blocker intercepts',()=>{
 const s=field(),x=put(s,0,GUTS),blocker=put(s,1,BLOCKER,{powerModifiers:[{amount:4000,expires:'end',who:0}]});
 attack(s,x.uid);
 assert.equal(e.power(x,false,s),1000);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.ok(find(s,0,'grave',x));
 assert.ok(find(s,1,'battle',blocker));
});

test('Surprise chooses one tapped enemy and skips exactly that enemy’s next start untap',()=>{
 let s=field();
 const x=put(s,0,SURPRISE),ally=put(s,0,LIGHT,{tapped:true});
 const a=put(s,1,LIGHT,{tapped:true}),b=put(s,1,FIRE,{tapped:true});
 put(s,1,NATURE);
 attack(s,x.uid);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[a.uid,b.uid]);
 s=restore(s);
 pick(s,b);
 finishAttack(s);
 assert.equal(find(s,0,'battle',ally).skipUntap,undefined);
 assert.equal(find(s,1,'battle',b).skipUntap,true);
 end(s);
 assert.equal(find(s,1,'battle',a).tapped,false);
 assert.equal(find(s,1,'battle',b).tapped,true);
 assert.equal(find(s,1,'battle',b).skipUntap,undefined);
 end(s);
 end(s);
 assert.equal(find(s,1,'battle',b).tapped,false);
});

test('Surprise cannot choose an untapped enemy and does not interfere with untap from effects',()=>{
 const s=field(),x=put(s,0,SURPRISE);
 const target=put(s,1,NATURE,{tapped:true});
 attack(s,x.uid);
 pick(s,target);
 finishAttack(s);
 const useOnTarget=def=>{
  s.phase='main';
  s.extTasks=[{op:'g34_Sequence',p:0,source:LIGHT,defs:[def]}];
  act(s,'toAttack');
  pick(s,target);
 };
 useOnTarget({op:'Target',untap:true});
 assert.equal(target.tapped,false);
 assert.equal(target.skipUntap,true);
 useOnTarget({op:'Target',tap:true});
 end(s);
 assert.equal(target.tapped,true);

 const t=field(),y=put(t,0,SURPRISE);
 put(t,1,NATURE);
 attack(t,y.uid);
 assert.notEqual(t.decision?.task?.op,'g34_Target');
 finishAttack(t);
});

test('Giga inspects privately, moves the chosen multicolor card tapped and returns a chosen opponent mana card',()=>{
 let s=field();
 give(s,1,'hand',[LIGHT,MULTI]);
 give(s,1,'mana',[NATURE,FIRE]);
 const [hidden,moved]=s.players[1].hand,[stay,returned]=s.players[1].mana;
 playGiga(s);
 assert.deepEqual(s.decision.task.seen,[LIGHT,MULTI]);
 assert.equal(e.observation(s,0).decision.task,undefined);
 assert.deepEqual(e.observation(s,0).players[1].hand,[{hidden:true},{hidden:true}]);
 assert.ok(!s.log.some(row=>row.text.includes(e.card(LIGHT).name)));
 s=restore(s);
 pick(s,moved);
 assert.equal(find(s,1,'mana',moved).tapped,true);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[stay.uid,returned.uid,moved.uid]);
 s=restore(s);
 pick(s,returned);
 assert.deepEqual(s.players[1].hand.map(c=>c.uid),[hidden.uid,returned.uid]);
 assert.deepEqual(s.players[1].mana.map(c=>c.uid),[stay.uid,moved.uid]);
});

test('Giga can return the same card just placed when it is the only available mana',()=>{
 const s=field(1);
 give(s,0,'mana',[]);
 give(s,0,'hand',[FIRE]);
 const x=s.players[0].hand[0];
 playGiga(s);
 assert.equal(s.decision.player,1);
 pick(s,x);
 assert.equal(x.tapped,false);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[x.uid]);
 pick(s,x);
 assert.ok(find(s,0,'hand',x));
 assert.equal(s.players[0].mana.length,0);
});

test('Giga cannot return mana if the hand is empty or moving a card is declined',()=>{
 for(const hasHand of [false,true]){
  const s=field();
  give(s,1,'mana',[NATURE]);
  give(s,1,'hand',hasHand?[LIGHT]:[]);
  playGiga(s);
  if(hasHand)pick(s,null);
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[1].mana.map(x=>x.cardId),[NATURE]);
  assert.deepEqual(s.players[1].hand.map(x=>x.cardId),hasHand?[LIGHT]:[]);
 }
});

test('Giga can add a hand card to mana while a mana movement lock prevents returning a card',()=>{
 const s=field();
 put(s,0,APUL);
 give(s,1,'hand',[LIGHT]);
 give(s,1,'mana',[NATURE]);
 const x=s.players[1].hand[0];
 playGiga(s);
 pick(s,x);
 assert.equal(s.decision,null);
 assert.ok(find(s,1,'mana',x));
 assert.equal(s.players[1].hand.length,0);
});

test('Giga exposes the inspected card choices only to the acting friend-duel player',async()=>{
 const {projectRoom}=await import('../server/duel-core.mjs');
 const s=field();
 give(s,1,'hand',[LIGHT,MULTI]);
 playGiga(s);
 const host={uid:'host',name:'Host'},guest={uid:'guest',name:'Guest'};
 const room={game:s,hostUid:host.uid,guestUid:guest.uid,profiles:[host,guest],phase:'playing',expiresAt:100,events:[]};
 const {game:choosing}=projectRoom(room,host,0),{game:waiting}=projectRoom(room,guest,0);
 assert.deepEqual(choosing.players[1].hand,[]);
 assert.equal(choosing.players[1].handCount,2);
 assert.ok(choosing.actions.some(action=>action.label.includes(e.card(LIGHT).name)));
 assert.ok(choosing.actions.some(action=>action.label.includes(e.card(MULTI).name)));
 assert.deepEqual(waiting.actions,[]);
 assert.equal(waiting.decision,null);
 assert.equal(waiting.inspectedCards,undefined);
 pick(s,null);
 assert.deepEqual(projectRoom(room,host,0).game.players[1].hand,[]);
 assert.ok(!projectRoom(room,host,0).game.actions.some(action=>action.label.includes(e.card(MULTI).name)));
});
