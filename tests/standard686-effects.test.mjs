import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-686.json',import.meta.url)));

test('Phase 686 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:686}));
  assert.throws(()=>standardCardSpec(detail,{phase:685}));
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
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:686}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const WING='dmr18-046',CHEER='dmr15-033',CASTLE='dmr22-018';
const SMALL='dm01-108',LARGE='dmex12-s16',TOO_LARGE='dmrp04s-s10',MULTI='dm22ex1-128',GENMU='dmrp15-km1';
const field=(p=0)=>Object.assign(setup(),{active:p});
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const play=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const values=s=>(s.decision?.choices||[]).map(x=>x.value?.uid??x.value);
const pick=(s,uid)=>act(s,'extended',a=>values(s)[a.choice]===uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const resume=s=>JSON.parse(JSON.stringify(s));
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const attackTargets=(s,uid)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===uid).map(a=>a.target);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('Cansam must choose another ally and gives only that creature power and an end-of-turn untap',()=>{
 let s=field();
 const ally=put(s,0,SMALL),other=put(s,0,SMALL),enemy=put(s,1,SMALL);
 ally.tapped=other.tapped=enemy.tapped=true;
 play(s,WING);
 const base=e.power(ally,false,s);
 assert.deepEqual(values(s),[ally.uid,other.uid]);
 s=resume(s);
 pick(s,ally.uid);
 const unit=uid=>s.players[0].battle.find(x=>x.uid===uid);
 assert.equal(e.power(unit(ally.uid),false,s),base+1000);
 assert.equal(e.power(unit(other.uid),false,s),base);
 assert.ok(unit(ally.uid).tapped);
 s.players[0].hand.push(s.players[0].battle.pop());
 put(s,1,GENMU);
 end(s);
 assert.equal(unit(ally.uid).tapped,false);
 assert.ok(unit(other.uid).tapped);
 assert.equal(e.power(unit(ally.uid),false,s),base);
});

test('Cansam has no target alone and its delayed untap does not follow a re-entered card',()=>{
 const solo=field();
 play(solo,WING);
 assert.equal(solo.decision,null);
 assert.equal(solo.g501EndDelays?.length??0,0);
 const s=field(),ally=put(s,0,SMALL);
 play(s,WING);
 pick(s,ally.uid);
 ally.incarnation=(ally.incarnation??0)+1;
 ally.tapped=true;
 end(s);
 assert.equal(ally.tapped,true);
});

test('Cheer limits both players while only boosting friendly creatures in play at resolution',()=>{
 let s=field();
 const ally=put(s,0,SMALL),enemy=put(s,1,SMALL),target=put(s,1,SMALL);
 target.tapped=true;
 const power=e.power(ally,false,s);
 play(s,CHEER);
 const late=put(s,0,SMALL);
 assert.equal(e.power(ally,false,s),power+2000);
 assert.equal(e.power(enemy,false,s),power);
 assert.equal(e.power(late,false,s),power);
 for(const x of [ally,late,enemy])assert.equal(e.effectiveCard(x,s).noPlayerAttack,true);
 s=resume(s);
 s.phase='attack';
 assert.deepEqual(attackTargets(s,ally.uid),[target.uid]);
 end(s);
 s.phase='attack';
 assert.ok(attackTargets(s,enemy.uid).includes('player'));
 assert.equal(e.power(s.players[0].battle[0],false,s),power);
});

test('Cheer as a Shield Trigger keeps the attack already declared and stops later player attacks',()=>{
 const s=field(1);
 const ally=put(s,0,SMALL),attacker=put(s,1,SMALL),next=put(s,1,SMALL);
 ally.tapped=true;
 give(s,0,'shields',[CHEER,SMALL]);
 const shield=s.players[0].shields[0],before=physical(s);
 attack(s,attacker.uid);
 noBlock(s);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.equal(s.attack,null);
 assert.equal(s.players[0].shields.length,1);
 assert.ok(s.players[0].grave.includes(shield));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
 assert.deepEqual(attackTargets(s,next.uid),[ally.uid]);
 assert.deepEqual(physical(s),before);
});

for(const multicolored of [3,4])test('Ryuteibujin applies its second destruction only with four face-up multicolored mana: '+multicolored,()=>{
 let s=field();
 for(let n=0;n<4;n++)s.players[0].mana.push(Object.assign(inst(MULTI),{faceDown:n>=multicolored,tapped:true}));
 const small=put(s,1,SMALL),large=put(s,1,LARGE),tooLarge=put(s,1,TOO_LARGE);
 play(s,CASTLE);
 assert.deepEqual(values(s),[small.uid]);
 s=resume(s);
 pick(s,small.uid);
 const has=(z,uid)=>s.players[1][z].some(x=>x.uid===uid);
 assert.ok(has('grave',small.uid));
 if(multicolored===4){
  assert.deepEqual(values(s),[large.uid]);
  pick(s,large.uid);
  assert.ok(has('grave',large.uid));
 }else assert.ok(has('battle',large.uid));
 assert.ok(has('battle',tooLarge.uid));
 assert.equal(s.decision,null);
});

test('Ryuteibujin still destroys an eligible larger creature if the first selection has no target',()=>{
 const s=field(1),attacker=put(s,1,LARGE);
 s.players[0].mana.push(...Array.from({length:4},()=>inst(MULTI)));
 give(s,0,'shields',[CASTLE]);
 const shield=s.players[0].shields[0];
 attack(s,attacker.uid);
 noBlock(s);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.deepEqual(values(s),[attacker.uid]);
 pick(s,attacker.uid);
 assert.ok(s.players[1].grave.includes(attacker));
 assert.ok(s.players[0].grave.includes(shield));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
 assert.equal(s.decision,null);
});
