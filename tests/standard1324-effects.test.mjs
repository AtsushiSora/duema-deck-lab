import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const JOE='dm26ex4-081',DORA='dm26ex3-017',SUI='dm26ex3-021',MEGA='dm26ex3-011',COCOA='dm26ex3-022';
const BASIC='dm01-108',WATER='dm01-083';
const DRAGON='dm01-008',LARGE='dmx13-s02',JOKER='dm26rp3-018',AOHARU='dm26ex3-070',STUDENT='dm26ex3-026';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('five verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1324.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[JOE,DORA,SUI,MEGA,COCOA]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1324}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations.filter(color=>color!=='無色'),4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.playFaces(c).length,faces.length);
  assert.deepEqual(e.playFaces(c).map(f=>[f.name,f.cost]),faces.map(f=>[f.name,f.cost]));
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('all seven alternate art IDs resolve to their existing name entries and keep the same abilities',()=>{
 const m=read('tools/support-phase-1324.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[
  ['dm26ex3-SEC007',DORA],['dm26ex3-SEC007CHO',DORA],['dm26ex3-SEC008',SUI],
  ['dm26ex3-SEC008CHO',SUI],['dm26ex3-SEC004',MEGA],['dm26ex3-SEC004CHO',MEGA],['dm26ex3-SSP002',MEGA]
 ]);
 for(const {id,canonicalId,name,image,source,faces,spec} of m.printAliases){
  const original=m.cards.find(c=>c.id===canonicalId);
  assert.equal(nameKey(name),nameKey(original.name));
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1324}),original.spec);
  assert.deepEqual(spec,original.spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1},{id:canonicalId,count:3}]),[{id:canonicalId,count:4}]);
 }
});

const play=(s,id)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
const top=(s,...ids)=>{
 const cards=ids.map(inst);s.players[0].deck.unshift(...cards);return cards;
};
const finishAttack=s=>{if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');drain(s);};

test('Joe Star charges into mana and colors only its own tap for a Joker creature summons',()=>{
 const s=field(),x=play(s,JOE);
 assert.ok(has(s,0,'mana',x)&&!has(s,0,'grave',x)&&!x.tapped);
 give(s,0,'mana',Array(6).fill(BASIC));
 s.players[0].mana.push(x);
 const joker=add(s,0,'hand',JOKER),notJoker=add(s,0,'hand',DRAGON),spell=add(s,0,'hand','dm01-092');
 const legal=y=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===y.uid);
 assert.ok(legal(joker)&&!legal(notJoker)&&!legal(spell));
 x.faceDown=true;assert.ok(!legal(joker));x.faceDown=false;
 x.tapped=true;assert.ok(!legal(joker));x.tapped=false;
 act(s,'play',a=>a.uid===joker.uid);
 assert.ok(has(s,0,'battle',joker)&&x.tapped);
 assert.deepEqual(e.manaColors(e.card(JOE),s,0),[]);
});

for(const id of [JOE,MEGA])test('G Strike is available from a broken shield '+id,()=>{
 const s=field();s.active=1;give(s,0,'shields',[id]);
 const first=add(s,1,'battle',BASIC),next=add(s,1,'battle',BASIC);
 attack(s,first.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);pick(s,next.uid);
 assert.ok(e.attackLocked(s,1,next)&&!next.tapped);
});

test('Dora can use Dragon Mechraid 10 and untaps only after its first attack',()=>{
 const s=field(),dora=add(s,0,'battle',DORA,{entered:s.turn}),foe=add(s,1,'battle',BASIC,{tapped:true});
 const [hit,high,wrong]=top(s,DRAGON,LARGE,JOE);
 attack(s,dora.uid,foe.uid);
 assert.ok(choices(s).includes(hit.uid)&&!choices(s).includes(high.uid)&&!choices(s).includes(wrong.uid));
 pick(s,hit.uid);pick(s,wrong.uid);
 finishAttack(s);
 assert.ok(has(s,0,'battle',hit)&&!dora.tapped);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[wrong.uid,high.uid]);
 attack(s,dora.uid);drain(s);
 assert.equal(dora.tapped,true);
});

test('Dora checks each Aoharu attacker independently and leaves an off-race ally tapped',()=>{
 const s=field();add(s,0,'battle',DORA);
 const a=add(s,0,'battle',AOHARU),b=add(s,0,'battle',AOHARU),off=add(s,0,'battle',BASIC);
 for(const x of [a,b,off]){attack(s,x.uid);finishAttack(s);}
 assert.ok(!a.tapped&&!b.tapped&&off.tapped);
 s.players[1].shields.push(inst(BASIC));
 attack(s,a.uid);finishAttack(s);
 assert.equal(a.tapped,true);
});

test('Suisho adds every revealed spell or Jack-Pot, leaving the other card at the bottom',()=>{
 const s=field(),[spell,jack,wrong]=top(s,JOE,SUI,DORA);
 const x=play(s,SUI);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'hand',spell)&&has(s,0,'hand',jack));
 assert.equal(s.players[0].deck.at(-1).uid,wrong.uid);
});

for(const n of [4,5])test('Suisho uses the current Dragon count and only allows the printed execution choices '+n,()=>{
 const s=field(),x=add(s,0,'battle',SUI),foe=add(s,1,'battle',BASIC,{tapped:true});
 give(s,0,'mana',Array(n).fill(DRAGON));
 add(s,0,'mana',DRAGON,{faceDown:true});
 const jack=add(s,0,'hand',SUI),legal=add(s,0,'hand',JOE),high=add(s,0,'hand','dmrp04m-001'),wrong=add(s,0,'hand',DORA);
 attack(s,x.uid,foe.uid);
 if(n===5){
  assert.deepEqual(new Set(choices(s)),new Set([jack.uid,legal.uid,null]));
  pick(s,legal.uid);assert.ok(has(s,0,'mana',legal));
 }else assert.equal(s.decision.type,'block');
 assert.ok(has(s,0,'hand',high)&&has(s,0,'hand',wrong));
 finishAttack(s);
});

test('Mega has its own speed, boosts allies and can fight once after any of its Dragons enters',()=>{
 const s=field();
 const enemy=add(s,1,'battle',BASIC),later=add(s,1,'battle',WATER);
 const mega=play(s,MEGA);
 const ally=add(s,0,'battle',STUDENT,{entered:s.turn});
 assert.equal(e.power(mega,false,s),12000);
 assert.ok(e.effectiveCard(mega,s).speedAttacker&&e.effectiveCard(ally,s).speedAttacker);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 pick(s,enemy.uid);drain(s);
 assert.ok(has(s,1,'grave',enemy));
 play(s,DRAGON);drain(s);assert.ok(!s.decision&&has(s,1,'battle',later));
 s.active=1;assert.equal(e.power(mega,false,s),6000);
});

test('Cocoa resists bounce but can be destroyed',()=>{
 const s=field(),cocoa=add(s,0,'battle',COCOA);s.active=1;
 play(s,'dm01-086');act(s,'effect',a=>a.targets[0].uid===cocoa.uid);drain(s);
 assert.ok(has(s,0,'battle',cocoa));
 play(s,'dm01-027');act(s,'effect',a=>a.targets[0].uid===cocoa.uid);drain(s);
 assert.ok(has(s,0,'grave',cocoa));
});

for(const yes of [true,false])test('Cocoa’s controller selects an opposing hand creature and its owner decides '+yes,()=>{
 const s=field(),cocoa=add(s,0,'battle',COCOA),choice=add(s,1,'hand',BASIC);
 const other=add(s,1,'hand',WATER),spell=add(s,1,'hand',JOE);
 s.phase='attack';act(s,'endTurn');
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[choice.uid,other.uid]);
 assert.ok(s.decision.task.seen.includes(spell.cardId));
 pick(s,choice.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[choice.uid,null]);
 const resumed=JSON.parse(JSON.stringify(s));
 pick(resumed,yes?choice.uid:null);
 assert.equal(has(resumed,1,'battle',choice),yes);
 assert.equal(has(resumed,1,'hand',choice),!yes);
 assert.ok(has(resumed,0,'battle',cocoa)&&has(resumed,1,'hand',other));
});
