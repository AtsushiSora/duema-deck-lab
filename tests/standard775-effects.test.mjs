import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-775.json',import.meta.url)));
const FOKK='dm23rp3-008',PIKA='dm24rp4-047',MARU='dm24rp4-050';
const BODY='dm01-108',SPELL='dm01-110',TWIN='dmbd16-009',BIG='dm01-007';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
test('Phase 775 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:775}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:775}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:775}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const options=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function fokkDeck(s,top=[PIKA,SPELL,TWIN,SPELL]){
 give(s,0,'deck',[...top,BODY,BODY,BODY,BODY]);
 return s.players[0].deck.slice(0,4);
}
for(const destination of ['hand','mana'])test('Fokk chooses one revealed creature and moves the rest together to grave ('+destination+')',()=>{
 let s=setup();
 const top=fokkDeck(s),chosen=destination==='mana'?top[0]:top[2];
 play(s,FOKK);
 assert.deepEqual(options(s),[top[0].uid,top[2].uid]);
 assert.equal(s.log.at(-1).type,'reveal');
 pick(s,chosen.uid);
 assert.deepEqual(ids(s,0,'deck').slice(0,4),top.map(x=>x.uid));
 assert.ok(!s.players[0].grave.length);
 s=restore(s);
 assert.deepEqual(options(s),['hand','mana']);
 pick(s,destination);
 assert.ok(has(s,0,destination,chosen));
 assert.deepEqual(ids(s,0,'grave'),top.filter(x=>x!==chosen).map(x=>x.uid));
 if(destination==='mana')assert.equal(s.players[0].mana.find(x=>x.uid===chosen.uid).tapped,true);
});
test('Fokk with no creature moves all four to grave without a destination prompt',()=>{
 const s=setup(),top=fokkDeck(s,Array(4).fill(SPELL));
 play(s,FOKK);
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s,0,'grave'),top.map(x=>x.uid));
});
for(const blocker of ['dm22ex1-086','dmrp22-033'])test('Fokk respects the existing deck-to-grave replacement '+blocker,()=>{
 const s=setup(),top=fokkDeck(s,[SPELL,SPELL,SPELL,PIKA]);
 put(s,1,'battle',blocker);
 play(s,FOKK);
 assert.deepEqual(options(s),['hand','mana']);
 pick(s,'mana');
 assert.ok(!has(s,0,'mana',top[3]));
 assert.deepEqual(ids(s,0,'grave').sort(),top.map(x=>x.uid).sort());
});
test('Fokk does not blindly pick a creature under a deck-look lock',()=>{
 const s=setup();
 fokkDeck(s);
 const before=ids(s,0,'deck');
 put(s,1,'battle','dmrp07-m01');
 play(s,FOKK);
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s,0,'deck'),before);
 assert.deepEqual(ids(s,0,'grave'),[]);
});
test('Fokk exchanges with an attacking Abyss and still resolves its entry ability',()=>{
 const s=setup(),top=fokkDeck(s,[SPELL,SPELL,SPELL,PIKA]);
 const abyss=put(s,0,'battle','dm22sd1-010'),fokk=put(s,0,'hand',FOKK);
 attack(s,abyss.uid);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'revResolve');
 pick(s,abyss.uid);
 pick(s,'hand');
 assert.ok(has(s,0,'battle',fokk));
 assert.ok(has(s,0,'hand',abyss));
 assert.ok(has(s,0,'hand',top[3]));
 assert.deepEqual(ids(s,0,'grave'),top.slice(0,3).map(x=>x.uid));
});
test('Fokk has the Abyss Rush attack permission and leaves for the bottom at turn end',()=>{
 const s=setup();
 fokkDeck(s,[SPELL,SPELL,SPELL,PIKA]);
 const fokk=put(s,0,'grave',FOKK);
 act(s,'play',a=>a.uid===fokk.uid&&a.origin==='grave');
 pick(s,'hand');
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===fokk.uid&&a.target==='player'));
 end(s);
 assert.equal(s.players[0].deck.at(-1).uid,fokk.uid);
});
test('Picador taps a selected creature and skips only its next turn-start untap',()=>{
 const s=setup(),other=put(s,1,'battle',BODY),target=put(s,1,'battle',BODY);
 play(s,PIKA);
 pick(s,0);
 pick(s,target.uid);
 assert.equal(target.tapped,true);
 assert.equal(other.tapped,false);
 end(s);
 assert.equal(s.active,1);
 assert.equal(target.tapped,true);
 end(s);
 end(s);
 assert.equal(target.tapped,false);
});
test('Picador privately looks at two and leaves the unchosen card on top after restoring',()=>{
 let s=setup();
 give(s,0,'deck',[BODY,SPELL,BIG,BODY,BODY]);
 const [left,right,...rest]=ids(s,0,'deck');
 play(s,PIKA);
 pick(s,1);
 assert.equal(s.log.at(-1).type,'look');
 s=restore(s);
 pick(s,right);
 assert.deepEqual(ids(s,0,'hand'),[right]);
 assert.deepEqual(ids(s,0,'deck'),[left,...rest]);
});
test('Marupia breaks the selected nonleading shield UID after restoring',()=>{
 let s=setup();
 const before=ids(s,1,'shields'),chosen=before[2];
 play(s,MARU);
 pick(s,0);
 assert.equal(s.decision.task.op,'g34_Break497');
 s=restore(s);
 pick(s,chosen);
 assert.deepEqual(ids(s,1,'shields'),before.filter(uid=>uid!==chosen));
 assert.deepEqual(ids(s,1,'hand'),[chosen]);
});
for(const count of [1,3])test('Marupia applies an additional break and caps it at remaining shields ('+count+')',()=>{
 const s=setup();
 put(s,0,'battle','dm26-002');
 give(s,1,'shields',Array(count).fill(BODY));
 const before=ids(s,1,'shields'),chosen=before.slice(-2).reverse();
 play(s,MARU);
 pick(s,0);
 for(const uid of chosen)pick(s,uid);
 assert.deepEqual(ids(s,1,'shields'),before.filter(uid=>!chosen.includes(uid)));
 assert.deepEqual(ids(s,1,'hand').sort(),chosen.sort());
});
test('Marupia cannot directly win by choosing its break mode against zero shields',()=>{
 const s=setup();
 give(s,1,'shields',[]);
 play(s,MARU);
 pick(s,0);
 assert.equal(s.decision,null);
 assert.equal(s.winner,null);
});
test('Marupia destroys at zero power and temporary reduction expires on the current turn',()=>{
 for(const [id,destroyed] of [['dm01-047',true],[BIG,false]]){
  const s=setup(),target=put(s,1,'battle',id),before=e.power(target,false,s);
  play(s,MARU);
  pick(s,1);
  pick(s,target.uid);
  assert.equal(has(s,1,'grave',target),destroyed);
  if(!destroyed){
   assert.equal(e.power(target,false,s),before-4000);
   end(s);
   assert.equal(e.power(target,false,s),before);
  }
 }
});
for(const id of [PIKA,MARU])test(id+' triggers from a broken shield and resolves during the attacking player’s turn',()=>{
 const s=setup(),attacker=put(s,1,'battle',BODY);
 s.active=1;
 give(s,0,'shields',[id,BODY]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.uid===s.players[0].shields[0].uid||!a.uid);
 act(s,'useTrigger',a=>a.cardId===id);
 assert.equal(s.active,1);
 assert.equal(s.players[0].battle[0].cardId,id);
 pick(s,id===PIKA?0:1);
 pick(s,attacker.uid);
 if(id===PIKA){
  assert.ok(attacker.skipUntap);
  end(s);
  end(s);
  assert.equal(attacker.tapped,true);
 }else assert.ok(has(s,1,'grave',attacker));
});
