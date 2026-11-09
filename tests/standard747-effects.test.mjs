import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-747.json',import.meta.url)));

test('Phase 747 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:747}));
  assert.throws(()=>standardCardSpec(detail,{phase:746}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:747}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:747}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const PAROTTA='dm23rp1-005',ROSE='dm24rp2-026',EAGLE='dmr11-047';
const LOW='dm01-083',MED='dm01-108',HIGH='dm01-007',DRAGON='dmbd09-004',SLAYER='dm01-088';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const select=(s,x)=>pick(s,v=>v?.uid===x.uid||v===x.uid);
const skip=s=>pick(s,v=>v===null);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(MED));
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}

test('Parotta discounts only Dragon summons, stacks, and respects the minimum cost',()=>{
 const s=field();
 put(s,0,PAROTTA);
 give(s,0,'hand',[DRAGON,MED,'dmex06-026']);
 const [dragon,nonDragon,oneCost]=s.players[0].hand;
 const cost=x=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&!a.alternative)?.cost;
 assert.equal(cost(dragon),7);
 assert.equal(cost(nonDragon),2);
 assert.equal(cost(oneCost),1);
 put(s,0,PAROTTA);
 assert.equal(cost(dragon),6);
 act(s,'play',a=>a.uid===dragon.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
});

test('Parotta can decline then fight once, including after restoring the decision',()=>{
 let s=field(),parotta=put(s,0,PAROTTA),dragon=put(s,0,DRAGON);
 const [a,b,c,d]=[0,1,2,3].map(()=>put(s,1,MED,{tapped:true}));
 attack(s,dragon.uid,a.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 skip(s);drain(s);
 assert.ok(inZone(s,1,'grave',a));
 assert.equal(s.players[0].battle.find(x=>x.uid===dragon.uid).tapped,false);
 attack(s,dragon.uid,b.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 s=restore(s);
 select(s,c);drain(s);
 assert.ok(inZone(s,1,'grave',c));
 assert.ok(inZone(s,1,'grave',b));
 assert.equal(s.players[0].battle.find(x=>x.uid===dragon.uid).tapped,false);
 s=restore(s);
 attack(s,dragon.uid,d.uid);
 assert.notEqual(s.decision?.task?.op,'g34_FightEnemy240');
 drain(s);
 assert.ok(inZone(s,1,'grave',d));
 assert.ok(inZone(s,0,'battle',parotta));
 for(let i=0;i<2;i++){s.phase='attack';act(s,'endTurn');drain(s);}
 const target=put(s,1,MED,{tapped:true});
 attack(s,dragon.uid,target.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
});

test('Parotta reacts to allied Dragon wins on defense and ignores non-Dragons',()=>{
 const s=field(1);
 put(s,0,PAROTTA);
 const dragon=put(s,0,DRAGON,{tapped:true}),other=put(s,0,HIGH,{tapped:true});
 attack(s,put(s,1,MED).uid,dragon.uid);drain(s);
 assert.equal(dragon.tapped,false);
 attack(s,put(s,1,MED).uid,other.uid);drain(s);
 assert.equal(other.tapped,true);
});

test('Rose only grants a creature that entered this turn Mach Fighter until turn end',()=>{
 const s=field(),rose=put(s,0,ROSE),old=put(s,0,MED);
 const ally=put(s,0,MED,{entered:s.turn}),enemy=put(s,1,LOW,{entered:s.turn});
 const target=put(s,1,LOW,{tapped:true});
 attack(s,rose.uid,target.uid);
 assert.equal(s.decision.task.op,'g34_Target');
 assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[ally.uid]);
 select(s,ally);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_Offer');
 const before=s.players[0].hand.length;
 pick(s,v=>v===true);drain(s);
 assert.equal(s.players[0].hand.length,before+1);
 const actions=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===ally.uid);
 assert.ok(actions.some(a=>a.target===enemy.uid));
 assert.ok(!actions.some(a=>a.target==='player'));
 assert.equal(e.effectiveCard(old,s).machFighter,undefined);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.effectiveCard(ally,s).machFighter,undefined);
});

test('Rose may decline the draw when another allied creature wins, and does not draw for enemies',()=>{
 const s=field(),rose=put(s,0,ROSE),ally=put(s,0,HIGH),opponent=put(s,1,LOW,{tapped:true});
 attack(s,ally.uid,opponent.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_Offer');
 const before=s.players[0].hand.length;
 pick(s,v=>!v);drain(s);
 assert.equal(s.players[0].hand.length,before);
 attack(s,rose.uid,put(s,1,HIGH,{tapped:true}).uid);
 drain(s);
 assert.equal(s.players[0].hand.length,before);
 assert.ok(inZone(s,0,'grave',rose));
});

test('Eagle uses Guardman and breaks the exact shield chosen on the opposing turn',()=>{
 const s=field(1),eagle=put(s,0,EAGLE),ally=put(s,0,LOW,{tapped:true}),enemy=put(s,1,MED);
 const [first,chosen]=s.players[1].shields;
 attack(s,enemy.uid,ally.uid);
 act(s,'guardman',a=>a.uid===eagle.uid);
 assert.equal(s.decision.task.op,'g34_Break497');
 assert.equal(s.decision.player,0);
 select(s,chosen);drain(s);
 assert.ok(inZone(s,1,'hand',chosen));
 assert.ok(inZone(s,1,'shields',first));
 assert.ok(inZone(s,1,'grave',enemy));
 assert.ok(inZone(s,0,'battle',ally));
 assert.equal(eagle.tapped,true);
});

test('Eagle applies additional effect breaks, preserves the selected UIDs after restore and caps at shields left',()=>{
 for(const count of [0,1,4]){
  let s=field(),eagle=put(s,0,EAGLE),enemy=put(s,1,MED,{tapped:true});
  give(s,1,'shields',Array(count).fill(MED));
  const targets=s.players[1].shields.slice(-2).reverse();
  s.extLimits=[{kind:'g412ExtraBreak',player:0,ref:{uid:eagle.uid,incarnation:0},amount:1,expires:'end',who:0}];
  attack(s,eagle.uid,enemy.uid);
  act(s,'noBlock');
  if(count){
   assert.equal(s.decision.task.op,'g34_Break497');
   select(s,targets[0]);
   if(count===4){
    assert.ok(inZone(s,1,'shields',targets[0]));
    s=restore(s);select(s,targets[1]);
   }
  }
  drain(s);
  assert.deepEqual(new Set(s.players[1].hand.map(x=>x.uid)),new Set(targets.map(x=>x.uid)));
  assert.equal(s.players[1].shields.length,Math.max(0,count-2));
  assert.equal(s.winner,null);
 }
});

test('Eagle resolves the shield break before the defeated Slayer destroys it',()=>{
 const s=field(),eagle=put(s,0,EAGLE),slayer=put(s,1,SLAYER,{tapped:true});
 const chosen=s.players[1].shields.at(-1);
 attack(s,eagle.uid,slayer.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_Break497');
 assert.ok(inZone(s,0,'battle',eagle));
 select(s,chosen);drain(s);
 assert.ok(inZone(s,1,'hand',chosen));
 assert.ok(inZone(s,0,'grave',eagle));
});
