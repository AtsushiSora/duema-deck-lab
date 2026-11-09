import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-752.json',import.meta.url)));

test('Phase 752 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:752}));
  assert.throws(()=>standardCardSpec(detail,{phase:751}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:752}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:752}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const MESSER='dmex03-g01',YOSANO='dm22rp1-032',KOJERI='dm22rp2-057',TANE='dmr17-093';
const WATER='dm01-083',NATURE='dm01-108',FIRE='dm01-097',HIGH='dm03-s03',BLOCK='dm26-038';
const SEED='dmrp21-057',HIGH_SEED='dmrp21-014',SPELL='dm01-110';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{
 const option=s.decision.choices[a.choice].value;
 return (option?.uid??option)===value;
});
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){
  give(s,p,'deck',Array(20).fill(NATURE));
  give(s,p,'mana',[WATER,NATURE,FIRE,WATER,NATURE,FIRE,NATURE,NATURE,NATURE,NATURE]);
 }
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function fight(s,attacker,target){
 attack(s,attacker.uid,target.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const attacks=(s,x)=>e.getLegalActions({...s,phase:'attack'}).filter(a=>a.kind==='attack'&&a.uid===x.uid);

test('Messer can win against 11000 on the turn it arrives, then draws on both battles and offers only one follow-up',()=>{
 let s=field(),messer=play(s,MESSER);
 const a=put(s,1,HIGH),b=put(s,1,HIGH),c=put(s,1,WATER);
 const [first,second]=s.players[0].deck;
 assert.equal(e.power(messer,false,s),8000);
 assert.equal(e.effectiveCard(messer,s).breaker,2);
 fight(s,messer,a);
 assert.ok(has(s,1,'grave',a));
 assert.ok(has(s,0,'hand',first));
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 s=restore(s);
 pick(s,b.uid);
 assert.ok(has(s,1,'grave',b));
 assert.ok(has(s,0,'hand',second));
 assert.ok(has(s,1,'battle',c));
 assert.equal(s.decision,null);
});

test('Messer can decline the follow-up on defense, draws on subsequent wins and can offer it again next turn',()=>{
 const s=field(1),messer=put(s,0,MESSER,{tapped:true});
 const a=put(s,1,WATER),b=put(s,1,WATER),c=put(s,1,WATER,{tapped:true});
 fight(s,a,messer);
 assert.equal(s.decision.player,0);
 pick(s,null);
 fight(s,b,messer);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.decision,null);
 end(s);
 put(s,1,WATER);

 fight(s,messer,c);
 assert.equal(s.players[0].hand.length,4);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
});

for(const type of ['creature','seed'])test('Yosano returns exactly one eligible enemy '+type+' before its optional draw',()=>{
 let s=field();
 put(s,0,SEED);
 const low=put(s,1,WATER),seed=put(s,1,SEED);
 put(s,1,HIGH);
 put(s,1,HIGH_SEED);
 const top=s.players[0].deck[0];
 play(s,YOSANO);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[low.uid,seed.uid]);
 const target=type==='seed'?seed:low;
 pick(s,target.uid);
 assert.ok(has(s,1,'hand',target));
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.decision.task.op,'g34_Offer');
 s=restore(s);
 pick(s,true);
 assert.ok(has(s,0,'hand',top));
});

test('Yosano offers the draw with no bounce targets, and checks only its own seeds',()=>{
 const s=field();
 put(s,0,SEED);
 play(s,YOSANO);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,null);
 assert.equal(s.players[0].deck.length,20);
 const t=field(),enemy=put(t,1,SEED);
 play(t,YOSANO);
 pick(t,enemy.uid);
 assert.equal(t.decision,null);
 assert.equal(t.players[0].deck.length,20);
});

test('Kojeri cannot be attacked at three water units, and a sealed or non-water ally cannot satisfy the threshold',()=>{
 const s=field(1),kojeri=put(s,0,KOJERI,{tapped:true});
 put(s,0,WATER);
 put(s,0,NATURE);
 const seed=put(s,0,SEED),enemy=put(s,1,FIRE);
 assert.ok(!attacks(s,enemy).some(a=>a.target===kojeri.uid));
 seed.sealed=true;
 assert.ok(attacks(s,enemy).some(a=>a.target===kojeri.uid));
});

test('Kojeri ignores blockers at three water units and can be blocked when the threshold is lost',()=>{
 for(const enough of [true,false]){
  const s=field(),kojeri=put(s,0,KOJERI),blocker=put(s,1,BLOCK);
  put(s,0,WATER);
  if(enough)put(s,0,SEED);
  attack(s,kojeri.uid);
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid),!enough);
  if(s.decision?.type==='block')act(s,'noBlock');
  drain(s);
  assert.equal(s.players[1].shields.length,4);
 }
});

test('Tanetarou checks the opposing shield groups at attack time and allows declining the whole effect',()=>{
 for(const n of [2,3]){
  const s=field(),tane=put(s,0,TANE),target=put(s,1,WATER,{tapped:true});
  give(s,1,'shields',Array(n).fill(NATURE));
  s.players[1].shields[0].shieldStack=[inst(NATURE)];
  attack(s,tane.uid,target.uid);
  if(n===2){
   assert.equal(s.decision.task.op,'g34_Offer');
   pick(s,null);
  }else assert.notEqual(s.decision?.task?.op,'g34_Offer');
  drain(s);
  assert.equal(s.players[0].mana.length,10);
  assert.equal(s.players[0].deck.length,20);
 }
});

test('Tanetarou places exactly two top cards and requires returning a creature, including the newly placed card',()=>{
 let s=field(),tane=put(s,0,TANE);
 give(s,1,'shields',[NATURE,NATURE]);
 give(s,0,'mana',[SPELL]);
 give(s,0,'deck',[NATURE,SPELL,WATER,FIRE]);
 const [creature,spell,next]=s.players[0].deck;
 attack(s,tane.uid);
 pick(s,true);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.ok(has(s,0,'mana',spell));
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid??c.value),[creature.uid]);
 s=restore(s);
 pick(s,creature.uid);
 assert.ok(has(s,0,'hand',creature));
 assert.ok(!has(s,0,'mana',creature));
});
