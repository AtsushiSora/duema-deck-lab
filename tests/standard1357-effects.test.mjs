import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const COPY='dmex18-022',MEMOTTA='dm25rp4-002',DEDO='dmbd10-010',BIND='dm16-047',MANIFEST='dmrp20-s02';
const GALAXY='dm28-002',DEMON='dm01-027',BASIC='dm01-108',FLY='dm07-046';
const IWASHIN='dmrp03-036';
const GAIARL='dmr04-v03',RYUSEI='dmr04-v02',PRINN='dmr04-051';
const STAR='dmsd17-012',HYPER='dm24rp1-DM1';
const GOAT='dm25-011',TAURUS='dm25-018';
const add=(s,p,id,fields={})=>{
 const x=Object.assign(inst(id),fields);
 s.players[p].battle.push(x);
 return x;
};
const pick=(s,value)=>act(s,'extended',a=>{
 const selected=s.decision.choices[a.choice].value;
 return (selected?.uid??selected)===(value?.uid??value);
});
const end=s=>{s.phase='attack';act(s,'endTurn');};
function field(){
 const s=setup();
 s.active=0;s.turn=3;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(BASIC));
 return s;
}
function summonCopy(s,target){
 cast(s,COPY);
 const x=s.players[s.active].battle.find(x=>x.cardId===COPY);
 assert.equal(s.decision?.task.g1357Become,true);
 pick(s,target);
 return x;
}
function destroy(s,uid){
 cast(s,DEMON);
 act(s,'effect',a=>a.targets[0].uid===uid);
}

test('the three official prints use their canonical IDs and no duplicate name',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1357.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[COPY,MEMOTTA]);
 assert.equal(m.printAliases.length,1);
 for(const {id,canonicalId=id,name,image} of [...m.cards,...m.printAliases]){
  assert.equal(registry.get(id).id,canonicalId);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.card(canonicalId).limit,4);
 }
 assert.equal(e.card(COPY).g174Start[0].g1357Become,true);
});

test('Manifest enters untapped and keeps the existing Dedodam copy effect after evolution (QA40912)',()=>{
 const s=field(),dedo=add(s,1,DEDO);
 add(s,1,BIND);
 cast(s,COPY);
 pick(s,dedo);
 end(s);
 assert.equal(s.active,1);
 end(s);
 assert.equal(s.active,0);
 const base=s.players[0].battle.find(x=>x.cardId===COPY);
 pick(s,dedo);
 assert.equal(e.card(base).name,'天災 デドダム');
 const hand=s.players[0].hand.length;
 s.phase='main';
 cast(s,MANIFEST);
 act(s,'evolve',a=>a.baseUid===base.uid);
 const manifest=s.players[0].battle.find(x=>x.cardId===MANIFEST);
 assert.equal(manifest.tapped,false);
 assert.equal(e.card(manifest).name,'天災 デドダム');
 assert.equal(e.card(manifest.under[0]).id,COPY);
 assert.equal(e.isEvolution(manifest),false);
 assert.equal(s.decision.task.op,'g2_ChooseHand');
 drain(s);
 assert.equal(s.players[0].hand.length,hand+1);
 end(s);
 end(s);
 assert.equal(e.card(manifest).id,MANIFEST);
 assert.ok(e.isEvolution(manifest));
});

test('a copy of Shield Force Galaxy leaves without using the original creature’s chosen shield (QA40898)',()=>{
 const s=field();
 s.active=1;
 cast(s,GALAXY);
 const shield=s.players[1].shields[0];
 pick(s,shield);
 const galaxy=s.players[1].battle[0];
 assert.ok(e.effectiveCard(galaxy,s).g1304ShieldForceActive);
 s.active=0;s.phase='main';
 const copy=summonCopy(s,galaxy);
 assert.equal(e.card(copy).id,GALAXY);
 assert.ok(!e.effectiveCard(copy,s).blocker);
 assert.equal(e.effectiveCard(copy,s).breaker,2);
 s.active=1;s.phase='main';
 destroy(s,copy.uid);
 assert.ok(s.players[0].grave.some(x=>x.uid===copy.uid&&e.card(x).id===COPY));
 assert.ok(s.players[1].shields.some(x=>x.uid===shield.uid));
 assert.ok(e.effectiveCard(galaxy,s).g1304ShieldForceActive);
});

test('a copy of Victory Ryusei applies its mana rule and does not physically flip (QA40886 and QA40904)',()=>{
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:[GAIARL,RYUSEI,PRINN].map(id=>({id,count:1}))}));
 const s=e.createGame(decks,{seed:1357});
 s.active=0;s.turn=3;s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);give(s,p,'deck',Array(25).fill(BASIC));
  give(s,p,'mana',[BASIC,'dm01-083','dm01-090'].flatMap(id=>Array(4).fill(id)));
 }
 function deploy(p,id){
  const own=s.players[p];
  const [x]=own.extra.splice(own.extra.findIndex(x=>x.cardId===id),1);
  own.battle.push(x);
  return x;
 }
 deploy(0,GAIARL);deploy(0,PRINN);
 const ryusei=deploy(1,RYUSEI),copy=summonCopy(s,ryusei);
 assert.equal(s.players[0].battle.length,3);
 assert.equal(e.card(copy).name,e.card(ryusei).name);
 assert.ok(!s.players[0].battle.some(x=>x.psychicLinks));
 end(s);
 assert.equal(s.active,1);
 give(s,1,'hand',[BASIC]);
 const [charged]=s.players[1].hand;
 act(s,'charge',a=>a.uid===charged.uid);
 assert.equal(charged.tapped,true);
 destroy(s,copy.uid);
 assert.ok(s.players[0].grave.some(x=>x.uid===copy.uid&&e.card(x).id===COPY));
 assert.ok(!s.players[0].extra.some(x=>x.uid===copy.uid));
});

test('external power, phase, hyper state, and source choices are independent of the copied characteristics',()=>{
 const s=field(),target=add(s,1,HYPER,{tapped:true,hyperActive:true,powerModifiers:[{amount:9000}]});
 const copy=summonCopy(s,target);
 assert.equal(copy.tapped,false);
 assert.equal(e.power(copy,false,s),e.card(HYPER).power);
 assert.ok(e.power(target,false,s)>e.power(copy,false,s));
 const restored=JSON.parse(JSON.stringify(s));
 for(const board of [s,restored]){
  const x=board.players[0].battle.find(y=>y.uid===copy.uid);
  end(board);
  assert.equal(e.card(x).id,HYPER);
  end(board);
  pick(board,target);
  assert.equal(e.card(x).id,HYPER);
  assert.ok(!x.hyperActive);
 }
});

test('only battle-zone departure abilities are inherited when the physical card goes to the graveyard (QA40908 and QA40909)',()=>{
 for(const id of [FLY,IWASHIN]){
  const s=field(),target=add(s,1,id),copy=summonCopy(s,target);
  s.active=1;s.phase='main';
  give(s,1,'hand',[BASIC]);
  destroy(s,copy.uid);
  drain(s);
  assert.ok(s.players[0].grave.some(x=>x.uid===copy.uid&&e.card(x).id===COPY));
  assert.equal(s.players[1].hand.length,id===FLY?0:1);
  assert.equal(s.players[0].hand.length,0);
 }
});

test('copying a Star evolution creature permits an attack on the entry turn (QA40887)',()=>{
 const s=field(),target=add(s,1,STAR),copy=summonCopy(s,target);
 assert.ok(e.isEvolution(copy));
 attack(s,copy.uid);
 assert.equal(s.attack.attacker,copy.uid);
});

test('a supported God can link with a copy before the copy effect invalidates the link (QA40889)',()=>{
 const s=field(),taurus=add(s,1,TAURUS),copy=summonCopy(s,taurus);
 cast(s,GOAT);
 assert.equal(s.decision.task.op,'g31_Link');
 pick(s,copy);
 drain(s);
 assert.ok(!copy.godLinks);
 assert.equal(s.players[0].battle.length,2);
 const goat=s.players[0].battle.find(x=>x.cardId===GOAT);
 assert.equal(e.card(goat).id,TAURUS);
 assert.equal(e.card(copy).id,TAURUS);
 end(s);
 end(s);
 pick(s,taurus);
 assert.equal(e.card(goat).id,GOAT);
});

test('Memotta can copy as it enters, triggers the copied entry, and changes form at its own turn start (QA47916)',()=>{
 const s=field(),dedo=add(s,1,DEDO),target=add(s,1,HYPER);
 cast(s,MEMOTTA);
 assert.equal(s.decision.task.op,'g34_CopyOnEntry1357');
 assert.ok(!s.players[0].battle.length);
 const restored=JSON.parse(JSON.stringify(s));
 for(const board of [s,restored]){
  pick(board,dedo);
  const x=board.players[0].battle.find(x=>x.cardId===MEMOTTA);
  assert.equal(e.card(x).id,DEDO);
  assert.equal(board.decision.task.op,'g2_ChooseHand');
  drain(board);
  assert.equal(board.players[0].hand.length,1);
  end(board);
  assert.equal(e.card(x).id,MEMOTTA);
  end(board);
  pick(board,target);
  assert.equal(e.card(x).id,HYPER);
  end(board);
  assert.equal(e.card(x).id,MEMOTTA);
 }
});

test('Memotta may decline its pre-entry or start choice, or enter with no opponent creature',()=>{
 for(const opponent of [false,true]){
  const s=field();
  if(opponent)add(s,1,DEDO);
  cast(s,MEMOTTA);
  if(opponent)pick(s,null);
  const x=s.players[0].battle.find(x=>x.cardId===MEMOTTA);
  assert.equal(e.card(x).id,MEMOTTA);
  end(s);end(s);
  if(opponent)pick(s,null);
  assert.equal(e.card(x).id,MEMOTTA);
 }
});

test('copied evolution characteristics require no evolution base and permit an immediate attack (QA47912)',()=>{
 const s=field(),target=add(s,1,STAR);
 cast(s,MEMOTTA);
 pick(s,target);
 const x=s.players[0].battle[0];
 assert.equal(e.card(x).id,STAR);
 assert.equal(x.under?.length||0,0);
 assert.ok(e.isEvolution(x));
 attack(s,x.uid);
 assert.equal(s.attack.attacker,x.uid);
});

test('delivery into battle uses the original card for Dragon King and VAN and does not copy EX Life (QA47914–47916)',()=>{
 const dragon='dmx16-001',van='dmx13-s02',dolf='dmrp17-km2';
 for(const id of [dragon,van,dolf]){
  const s=field(),target=add(s,1,id),shields=s.players[0].shields.length;
  cast(s,MEMOTTA);
  if(id===dragon){
   assert.ok(!s.decision);
   assert.ok(s.players[0].grave.some(x=>x.cardId===MEMOTTA));
   continue;
  }
  pick(s,target);
  const x=s.players[0].battle.find(x=>x.cardId===MEMOTTA);
  assert.equal(e.card(x).id,id);
  assert.equal(s.players[0].shields.length,shields);
  assert.ok(!x.exLifeShieldUid);
  drain(s);
  if(id===van)assert.ok(s.players[1].hand.some(x=>x.uid===target.uid));
 }
});

test('Memotta as a trigger keeps its physical identity and does not assume the copied Galaxy’s shield (QA40898)',()=>{
 const s=field(),attacker=add(s,0,BASIC);
 cast(s,GALAXY);
 const shield=s.players[0].shields[0];
 pick(s,shield);
 const galaxy=s.players[0].battle.find(x=>x.cardId===GALAXY);
 give(s,1,'shields',[MEMOTTA]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===MEMOTTA);
 assert.equal(s.decision.task.op,'g34_CopyOnEntry1357');
 pick(s,galaxy);
 const x=s.players[1].battle.find(x=>x.cardId===MEMOTTA);
 assert.equal(e.card(x).id,GALAXY);
 assert.ok(!e.effectiveCard(x,s).g1304ShieldForceActive);
 s.phase='main';
 destroy(s,x.uid);
 assert.ok(s.players[1].grave.some(y=>y.uid===x.uid&&e.card(y).id===MEMOTTA));
 assert.ok(e.effectiveCard(galaxy,s).g1304ShieldForceActive);
});

test('a Dedodam copy keeps its summon sickness when evolved into Dead Damned (QA47911)',()=>{
 const s=field(),target=add(s,1,DEDO),damned='dmbd10-002';
 cast(s,MEMOTTA);
 pick(s,target);
 drain(s);
 const base=s.players[0].battle.find(x=>x.cardId===MEMOTTA);
 cast(s,damned);
 act(s,'evolve',a=>a.baseUid===base.uid);
 drain(s);
 const x=s.players[0].battle.find(x=>x.cardId===damned);
 assert.equal(e.card(x).id,DEDO);
 assert.equal(e.card(x.under[0]).id,MEMOTTA);
 assert.ok(!e.isEvolution(x));
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
 end(s);
 assert.equal(e.card(x).id,damned);
});

test('Memotta remains the copied Perfect throughout end-step abilities (QA47913)',()=>{
 const s=field(),target=add(s,1,'dm23ex2-005');
 give(s,1,'hand',['dm25rp1-S07']);
 cast(s,BASIC);
 cast(s,BASIC);
 cast(s,MEMOTTA);
 pick(s,target);
 const copy=s.players[0].battle.find(x=>x.cardId===MEMOTTA);
 assert.equal(s.creaturesEntered,3);
 end(s);
 act(s,'declareGaia');
 pick(s,1);
 pick(s,2);
 assert.equal(s.decision.task.op,'shieldCreature');
 assert.equal(e.card(copy).id,target.cardId);
 pick(s,copy);
 drain(s);
 assert.equal(e.card(copy).id,MEMOTTA);
 assert.ok(s.players[0].battle.includes(copy));
 assert.ok(!s.players[0].shields.includes(copy));
});

test('a short copy that expires during an extra turn reveals the earlier copy still in effect',()=>{
 const s=field(),memotta=add(s,1,MEMOTTA),target=add(s,1,HYPER),copy=summonCopy(s,memotta);
 s.extraTurns=[{player:0}];
 end(s);
 assert.equal(s.active,0);
 pick(s,target);
 assert.equal(e.card(copy).id,HYPER);
 end(s);
 assert.equal(s.active,1);
 assert.equal(e.card(copy).id,MEMOTTA);
 pick(s,null);
 end(s);
 assert.equal(e.card(copy).id,COPY);
});
