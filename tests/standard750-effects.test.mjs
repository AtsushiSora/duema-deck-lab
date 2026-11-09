import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-750.json',import.meta.url)));

test('Phase 750 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:750}));
  assert.throws(()=>standardCardSpec(detail,{phase:749}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:750}));
 }
});

const BAZ='dmr05-007',ROBIN='dmrp14-004',BOLT='dmrp05-s10';
const LOW='dm01-083',MED='dm01-108',FIRE='dm01-097',SEED='dm25rp4-013';
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const shield=(s,x)=>pick(s,v=>v===x.uid);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
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
function play(s,id){
 const x=inst(id);
 s.phase='main';
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
 act(s,'endTurn');drain(s);
}
const attacks=(s,x)=>e.getLegalActions({...s,phase:'attack'}).filter(a=>a.kind==='attack'&&a.uid===x.uid);

test('Bazagazy can attack an untapped enemy immediately, then grants this ability only to existing allies',()=>{
 const s=field(),ally=put(s,0,MED),enemy=put(s,1,LOW),other=put(s,1,MED),baz=play(s,BAZ),sick=play(s,MED);
 assert.equal(e.effectiveCard(baz,s).breaker,2);
 assert.ok(attacks(s,baz).some(a=>a.target===enemy.uid));
 assert.ok(!attacks(s,ally).some(a=>a.target===enemy.uid));
 fight(s,baz,enemy);drain(s);
 assert.ok(has(s,1,'grave',enemy));
 assert.ok(attacks(s,ally).some(a=>a.target===other.uid));
 assert.ok(!attacks(s,sick).some(a=>a.target===other.uid));
 const late=play(s,ROBIN);
 assert.ok(!attacks(s,late).some(a=>a.target===other.uid));
 end(s);end(s);
 assert.ok(!attacks(s,ally).some(a=>a.target===other.uid));
});

test('Robin untaps before choosing the shield, and its own break enables a saved Kirifuda Dash',()=>{
 let s=field(),robin=put(s,0,ROBIN),enemy=put(s,1,MED,{tapped:true});
 give(s,0,'mana',[FIRE,LOW,MED,LOW]);
 give(s,0,'hand',[ROBIN]);
 const follow=s.players[0].hand[0],[first,chosen]=s.players[1].shields;
 fight(s,robin,enemy);
 assert.equal(robin.tapped,false);
 assert.equal(s.decision.task.op,'g34_Break497');
 s=restore(s);shield(s,chosen);
 assert.ok(has(s,1,'hand',chosen));
 assert.ok(has(s,1,'shields',first));
 assert.equal(s.decision.task.op,'g14_DashDeclare');
 pick(s,v=>v===true);
 assert.equal(s.decision.task.op,'g14_DashResolve');
 pick(s,v=>v!==null);drain(s);
 assert.ok(has(s,0,'battle',follow));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.ok(attacks(s,follow).some(a=>a.target==='player'));
});

test('Robin can declare Kirifuda Dash, but cannot pay with four cards lacking a fire mana',()=>{
 const s=field(),robin=put(s,0,ROBIN),enemy=put(s,1,MED,{tapped:true});
 give(s,0,'mana',[LOW,LOW,LOW,LOW]);
 give(s,0,'hand',[ROBIN]);
 const follow=s.players[0].hand[0];
 fight(s,robin,enemy);shield(s,s.players[1].shields[0]);
 assert.equal(s.decision.task.op,'g14_DashDeclare');
 pick(s,v=>v===true);drain(s);
 assert.ok(has(s,0,'hand',follow));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Robin applies extra breaks to the creature effect and keeps the selected shields across restoration',()=>{
 let s=field(),robin=put(s,0,ROBIN),enemy=put(s,1,MED,{tapped:true});
 const [first,a,b]=s.players[1].shields;
 s.extLimits=[{kind:'g412ExtraBreak',player:0,ref:{uid:robin.uid,incarnation:0},amount:1,expires:'end',who:0}];
 fight(s,robin,enemy);shield(s,b);
 assert.ok(has(s,1,'shields',b));
 s=restore(s);shield(s,a);drain(s);
 assert.ok(has(s,1,'shields',first));
 assert.ok(has(s,1,'hand',a));
 assert.ok(has(s,1,'hand',b));
});

test('Robin can win a defensive battle, untap, and break a shield without giving the attacker a dash',()=>{
 const s=field(1),robin=put(s,0,ROBIN,{tapped:true}),enemy=put(s,1,MED);
 give(s,1,'hand',[ROBIN]);
 fight(s,enemy,robin);
 assert.equal(robin.tapped,false);
 const chosen=s.players[1].shields.at(-1);
 shield(s,chosen);drain(s);
 assert.ok(has(s,1,'hand',chosen));
 assert.ok(!s.decision);
});

test('Bont counts both sides, excludes sealed cards and noncreatures, and cannot cost less than one',()=>{
 const s=field(),bolt=inst(BOLT);
 give(s,0,'mana',Array(12).fill(MED));
 s.players[0].hand.push(bolt);
 const cost=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===bolt.uid).cost;
 assert.equal(cost(),12);
 put(s,0,MED);put(s,1,LOW);put(s,1,LOW);
 put(s,0,MED,{sealed:true});put(s,1,SEED);
 assert.equal(cost(),9);
 for(let i=0;i<12;i++)put(s,i%2,MED);
 assert.equal(cost(),1);
 act(s,'play',a=>a.uid===bolt.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.equal(e.effectiveCard(bolt,s).breaker,3);
});

test('Bont Mach Fighter protects its player for just the next turn after a win, even after leaving',()=>{
 let s=field(),target=put(s,1,LOW),opponent=put(s,1,MED),ally=put(s,0,LOW,{tapped:true}),bolt=play(s,BOLT);
 assert.ok(attacks(s,bolt).some(a=>a.target===target.uid));
 assert.ok(!attacks(s,bolt).some(a=>a.target==='player'));
 fight(s,bolt,target);drain(s);
 assert.ok(s.extLimits.some(l=>l.kind==='g750CannotAttackPlayer'));
 s.players[0].grave.push(s.players[0].battle.splice(s.players[0].battle.findIndex(x=>x.uid===bolt.uid),1)[0]);
 s=restore(s);end(s);
 assert.ok(!attacks(s,opponent).some(a=>a.target==='player'));
 assert.ok(attacks(s,opponent).some(a=>a.target===ally.uid));
 end(s);end(s);
 assert.ok(attacks(s,opponent).some(a=>a.target==='player'));
});

test('Bont does not grant protection on an opposing-turn win, and a consecutive own turn uses the one-turn duration',()=>{
 const defense=field(1),bolt=put(defense,0,BOLT,{tapped:true});
 fight(defense,put(defense,1,LOW),bolt);drain(defense);
 assert.ok(!defense.extLimits?.some(l=>l.kind==='g750CannotAttackPlayer'));
 const s=field(),guard=put(s,0,BOLT),victim=put(s,1,LOW,{tapped:true}),opponent=put(s,1,MED);
 fight(s,guard,victim);drain(s);
 s.extraTurns=[{player:0,source:BOLT}];
 end(s);assert.equal(s.active,0);
 end(s);assert.equal(s.active,1);
 assert.ok(attacks(s,opponent).some(a=>a.target==='player'));
});

test('Bont player protection can be ignored by an opposing attack-permission effect',()=>{
 const s=field(),bolt=put(s,0,BOLT),target=put(s,1,LOW,{tapped:true}),opponent=put(s,1,MED);
 fight(s,bolt,target);drain(s);end(s);
 assert.ok(!attacks(s,opponent).some(a=>a.target==='player'));
 put(s,1,'dm25rp3-DM1');
 assert.ok(attacks(s,opponent).some(a=>a.target==='player'));
});
