import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const START='dmex08-135',SUMMER='dmex15-b039',CHESTER='dm23bd5-004';
const NATURE='dm01-108',FIRE='dm01-097',TWIN='dmrp05-011',QQ='dmrp07-m01';
const EXACT='dm12-021',LARGER='dm01-001',DISPECTOR='dm26rp3-042',FUTURE='dmex18-038';
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(15).fill(NATURE));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===(x?.uid??x));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function breakShield(s,id){
 give(s,0,'shields',[id]);
 const [shield]=s.players[0].shields;
 const attacker=add(s,1,'battle',FIRE);
 attack(s,attacker.uid);
 act(s,'noBlock');
 return {attacker,shield};
}

test('three official spell names and six print IDs resolve to three supported definitions',()=>{
 const manifest=read('support-phase-1186.json'),refs=read('image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[START,SUMMER,CHESTER]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[['dm23rp2-T02',SUMMER],['dm23rp2x-TF02',SUMMER],['dm24ex2-Cho035',CHESTER]]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[face]=row.faces;
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.manaValue,c.limit],['spell',face.cost,face.civilizations,face.race,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id)?.image,row.image);
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1186}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1186}));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
 }
});

test('Starter Deck uses the exact number of mana cards plus one and accepts either Twinpact cost',()=>{
 let s=field();
 give(s,0,'mana',['dm01-083',NATURE,NATURE,NATURE]);
 s.players[0].mana[2].tapped=true;
 s.players[0].mana[3].faceDown=true;
 give(s,0,'deck',[EXACT,TWIN,LARGER,FIRE,NATURE]);
 const [exact,twin,large,fire,nature]=s.players[0].deck;
 const spell=add(s,0,'hand',START),all=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(values(s),[exact.uid,twin.uid,null]);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[EXACT,TWIN,LARGER]);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&[EXACT,TWIN,LARGER].includes(x.cardId)));
 s=JSON.parse(JSON.stringify(s));
 pick(s,twin);
 assert.deepEqual(values(s),[exact.uid,large.uid]);
 pick(s,large);
 drain(s);
 assert.ok(has(s,0,'hand',twin));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[fire,nature,large,exact].map(x=>x.uid));
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[TWIN]);
 assert.equal(s.players[0].g34Protected?.length??0,0);
 assert.deepEqual(physical(s),all);
});

test('Starter Deck can decline, then order all three cards without revealing them',()=>{
 const s=field();
 give(s,0,'mana',['dm01-083',NATURE,NATURE,NATURE]);
 give(s,0,'deck',[TWIN,NATURE,EXACT,FIRE]);
 const [twin,nature,exact,fire]=s.players[0].deck;
 cast(s,START);
 pick(s,null);
 pick(s,exact);
 pick(s,twin);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[fire,exact,twin,nature].map(x=>x.uid));
 assert.equal(s.players[0].hand.length,0);
 assert.ok(!s.log.some(x=>x.type==='reveal'));
});

test('Starter Deck respects a deck-inspection lock',()=>{
 const s=field();
 give(s,0,'deck',[EXACT,TWIN,LARGER,FIRE]);
 const before=s.players[0].deck.map(x=>x.uid);
 add(s,1,'battle',QQ);
 cast(s,START);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);
});

test('Summer discards the old hand and puts a drawn card into mana before skipping the rest of its own turn',()=>{
 let s=field();
 give(s,0,'deck',[CHESTER,EXACT,TWIN,LARGER,FIRE,NATURE]);
 const own=s.players[0],drawn=own.deck.slice(0,4),turn=s.turn;
 const old=add(s,0,'hand',FIRE),spell=add(s,0,'hand',SUMMER),all=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(values(s),drawn.map(x=>x.uid));
 assert.ok(has(s,0,'grave',old));
 assert.equal(s.turn,turn);
 s=JSON.parse(JSON.stringify(s));
 pick(s,drawn[0]);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.find(x=>x.uid===drawn[0].uid)?.tapped,true);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),drawn.slice(1).map(x=>x.uid));
 assert.equal(s.active,1);
 assert.equal(s.turn,turn+1);
 assert.ok(s.log.some(x=>x.type==='skipTurn'&&x.cardId===SUMMER));
 assert.deepEqual(physical(s),all);
});

test('Summer resolves the hand exchange during the opponent’s turn without ending it',()=>{
 const s=field(),turn=s.turn;
 give(s,1,'deck',[NATURE,EXACT,TWIN,LARGER,FIRE,NATURE]);
 const drawn=s.players[1].deck.slice(0,4);
 const spell=add(s,1,'hand',SUMMER),old=add(s,1,'hand',FIRE);
 cast(s,FUTURE);
 assert.equal(s.decision.player,1);
 pick(s,spell);
 assert.deepEqual(values(s),drawn.map(x=>x.uid));
 assert.ok(has(s,1,'grave',old));
 pick(s,drawn[0]);
 assert.ok(has(s,1,'mana',drawn[0])&&has(s,1,'grave',spell));
 assert.equal(s.turn,turn);
 assert.equal(s.active,0);
 assert.ok(!s.log.some(x=>x.type==='skipTurn'&&x.cardId===SUMMER));
});

test('Chester offers either single mode and only an unsealed allied Dispector unlocks both',()=>{
 for(const mode of ['enemy','sealed','allied']){
  const s=field();
  const creature=add(s,mode==='enemy'?1:0,'battle',DISPECTOR,{sealed:mode==='sealed'});
  if(mode==='sealed')add(s,0,'seals',NATURE,{sealOf:creature.uid,faceDown:true});
  cast(s,CHESTER);
  assert.deepEqual(values(s),mode==='allied'?[0,1,2]:[0,1]);
 }
});

test('Chester uses both modes in print order and revives only an eligible graveyard card',()=>{
 const s=field(),ally=add(s,0,'battle',DISPECTOR);
 const enemy=add(s,1,'battle',EXACT,{cardOwner:0});
 const over=add(s,1,'battle','dmrp05-002');
 const revival=add(s,0,'grave','dm23rp2-S07');
 add(s,0,'grave','dmrp05-002');
 cast(s,CHESTER);
 pick(s,2);
 assert.deepEqual(values(s),[enemy.uid]);
 pick(s,enemy);
 assert.ok(has(s,0,'mana',enemy)&&has(s,1,'battle',over));
 assert.deepEqual(values(s),[revival.uid]);
 pick(s,revival);
 drain(s);
 assert.ok(has(s,0,'battle',revival)&&has(s,0,'battle',ally));
});

test('Chester can use its Shield Trigger and revive an evolution creature on a legal base',()=>{
 const s=field(1),base=add(s,0,'battle',NATURE),evo=add(s,0,'grave','dm02-s05');
 give(s,0,'mana',[]);
 const {attacker,shield}=breakShield(s,CHESTER);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,1);
 assert.deepEqual(values(s),[evo.uid]);
 pick(s,evo);
 assert.deepEqual(values(s),[base.uid]);
 pick(s,base);
 drain(s);
 assert.equal(s.players[0].battle.find(x=>x.uid===evo.uid)?.under[0].uid,base.uid);
 assert.ok(has(s,0,'grave',shield)&&has(s,1,'battle',attacker));
});
