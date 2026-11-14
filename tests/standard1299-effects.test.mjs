import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const SAM='dmrp01-003',HEAVEN='dmex12-032',KOV='dmex07-018';
const LIGHT='dm01-013',NATURE='dm01-108',FIRE='dm01-097',KILL='dm01-027';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=Object.assign(setup(),{active:0});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function cast(s,id,face=0){
 s.phase='main';
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
const value=({value})=>value?.uid??value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const destroy=(s,x)=>{
 cast(s,KILL);
 act(s,'effect',a=>a.targets?.[0]?.uid===x.uid);
};

test('the three official prints resolve to their original IDs and complete rules in legal decks',()=>{
 const m=read('tools/support-phase-1299.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[SAM,HEAVEN,KOV]);
 for(const {id,name,image,faces,source,spec} of m.cards){
  const c=e.card(id),official=details.cards.find(x=>x.id===id);
  assert.deepEqual(faces,official.faces);
  assert.deepEqual(spec,standardCardSpec(official,{phase:1299}));
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [faces[0].cost,Number(faces[0].powerText),1,faces[0].civilizations,faces[0].race,4]);
  assert.equal(c.text,faces.map(f=>f.abilityText).join('\n【呪文面】\n'));
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
 assert.deepEqual(e.card(KOV).spellFace.civilizations,['光']);
 assert.equal(e.card(KOV).spellFace.cost,3);
});

test('Samohan protects other creatures and offers exactly two cards after it is chosen and destroyed',()=>{
 for(const accept of [false,true]){
  const s=field(),sam=add(s,1,'battle',SAM),other=add(s,1,'battle',NATURE);
  cast(s,KILL);
  const actionTargets=e.getLegalActions(s).flatMap(a=>(a.targets??[]).map(t=>t.uid));
  assert.deepEqual(actionTargets,[sam.uid]);
  act(s,'effect',a=>a.targets?.[0]?.uid===sam.uid);
  assert.ok(has(s,1,'grave',sam)&&has(s,1,'battle',other));
  assert.equal(s.decision.player,1);
  assert.deepEqual(choices(s),[true,null]);
  pick(s,accept?true:null);
  assert.equal(s.players[1].hand.length,accept?2:0);
 }
});

test('two Samohans protect each other while own choices and normal combat remain available',()=>{
 const s=field();
 add(s,1,'battle',SAM,{tapped:true});
 add(s,1,'battle',SAM);
 cast(s,KILL);
 assert.ok(!e.getLegalActions(s).some(x=>x.targets?.length));
 const other=field(),sam=add(other,0,'battle',SAM);
 const ally=add(other,0,'battle',LIGHT);
 cast(other,'dm01-086');
 assert.ok(e.getLegalActions(other).some(x=>x.targets?.some(t=>t.uid===ally.uid)));
 assert.ok(e.getLegalActions(other).some(x=>x.targets?.some(t=>t.uid===sam.uid)));
 const combat=field(),enemy=add(combat,1,'battle',SAM,{tapped:true});
 add(combat,1,'battle',SAM);
 attack(combat,add(combat,0,'battle',FIRE).uid,enemy.uid);
 act(combat,'noBlock');
 assert.ok(!combat.decision?.choices?.some(x=>x.value===true));
 assert.equal(combat.players[1].hand.length,0);
});

test('Heaven chooses one entry mode and filters untapped enemies and legal Nightmare revivals',()=>{
 for(const mode of [0,1]){
  const s=field(),awake=add(s,1,'battle',NATURE),tapped=add(s,1,'battle',FIRE,{tapped:true});
  const match=add(s,0,'grave','dmr13-087'),wrongRace=add(s,0,'grave',NATURE);
  const tooMuch=add(s,0,'grave','dmr18-019');
  cast(s,HEAVEN);
  assert.deepEqual(choices(s),[0,1]);
  pick(s,mode);
  assert.deepEqual(choices(s),[mode===0?awake.uid:match.uid]);
  pick(s,mode===0?awake.uid:match.uid);
  drain(s);
  assert.equal(has(s,1,'grave',awake),mode===0);
  assert.equal(has(s,0,'battle',match),mode===1);
  assert.ok(has(s,1,'battle',tapped)&&has(s,0,'grave',wrongRace)&&has(s,0,'grave',tooMuch));
 }
});

test('Heaven is a shield-trigger blocker that cannot attack on later turns',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE);
 const heaven=inst(HEAVEN);
 s.players[1].shields=[heaven];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===heaven.uid);
 assert.equal(s.decision.player,1);
 pick(s,1);
 drain(s);
 assert.ok(has(s,1,'battle',heaven));
 const second=add(s,0,'battle',FIRE);
 attack(s,second.uid);
 act(s,'block',a=>a.uid===heaven.uid);
 drain(s);
 assert.ok(s.log.some(x=>x.type==='block'&&x.cardId===HEAVEN));
 const t=field(),unit=add(t,0,'battle',HEAVEN);
 add(t,1,'battle',FIRE,{tapped:true});
 t.phase='attack';
 assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'&&a.uid===unit.uid));
});

test('Kov replaces destruction with a face-up addition to the selected existing shield group',()=>{
 let s=field();
 const kov=add(s,1,'battle',KOV),source=add(s,1,'battle',NATURE);
 const chosen=s.players[1].shields[2],other=s.players[1].shields[0];
 chosen.shieldStack=[inst(NATURE)];
 add(s,0,'hand',KILL);
 const ids=physical(s);
 act(s,'play',a=>a.cardId===KILL);
 act(s,'effect',a=>a.targets?.[0]?.uid===kov.uid);
 assert.equal(s.decision.player,1);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='allowLeave'));
 assert.equal(e.getLegalActions(s).filter(a=>a.kind==='replaceShield842').length,5);
 s=JSON.parse(JSON.stringify(s));
 act(s,'replaceShield842',a=>a.shield===chosen.uid);
 assert.deepEqual(physical(s),ids);
 assert.equal(s.players[1].shields.length,5);
 const stored=s.players[1].shields.find(x=>x.uid===chosen.uid).shieldStack.at(-1);
 assert.equal(stored.uid,kov.uid);
 assert.equal(stored.faceUp,true);
 assert.ok(!s.players[1].shields.find(x=>x.uid===other.uid).shieldStack);
 assert.ok(has(s,1,'battle',source));
});

test('Kov uses ordinary destruction with no shield and ordinary bounce with shields',()=>{
 const s=field(),kov=add(s,1,'battle',KOV);
 s.players[1].shields=[];
 destroy(s,kov);
 assert.ok(has(s,1,'grave',kov));
 const t=field(),returned=add(t,1,'battle',KOV);
 cast(t,'dmr15-041');
 pick(t,returned.uid);
 assert.ok(has(t,1,'hand',returned));
 assert.equal(t.players[1].shields.length,5);
});

test('Kov blocks and optionally changes only an allied creature’s tap state at its controller’s end',()=>{
 for(const choice of ['tap','untap','pass']){
  const s=field();
  const kov=add(s,0,'battle',KOV),ally=add(s,0,'battle',LIGHT,{tapped:choice==='untap'});
  const enemy=add(s,1,'battle',NATURE);
  s.phase='attack';
  act(s,'endTurn');
  assert.deepEqual(choices(s),[kov.uid,ally.uid,null]);
  pick(s,choice==='pass'?null:ally.uid);
  if(choice!=='pass')pick(s,choice==='tap');
  assert.equal(ally.tapped,choice==='tap');
  assert.equal(enemy.tapped,false);
 }
 const s=field(),defender=add(s,1,'battle',KOV),attacker=add(s,0,'battle',NATURE);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===defender.uid);
 drain(s);
 assert.ok(s.log.some(x=>x.type==='block'&&x.cardId===KOV));
});

test('Light Hand Lightning taps an enemy and draws from hand and from a stacked shield trigger',()=>{
 const s=field(),ally=add(s,0,'battle',LIGHT),enemy=add(s,1,'battle',NATURE);
 const spell=cast(s,KOV,1);
 assert.deepEqual(choices(s),[enemy.uid]);
 pick(s,enemy.uid);
 assert.equal(enemy.tapped,true);
 assert.equal(ally.tapped,false);
 assert.equal(s.players[0].hand.length,1);
 assert.ok(has(s,0,'grave',spell));

 const t=field(),stored=inst(KOV),attacker=add(t,0,'battle',FIRE);
 const target=add(t,0,'battle',NATURE);
 t.players[1].shields=[{...inst(NATURE),shieldStack:[{...stored,faceUp:true,shieldCardOnly:true}]}];
 attack(t,attacker.uid);
 act(t,'noBlock');
 act(t,'useTrigger',a=>a.uid===stored.uid&&a.face===1);
 pick(t,target.uid);
 drain(t);
 assert.equal(target.tapped,true);
 assert.equal(t.players[1].hand.length,2);
 assert.ok(has(t,1,'grave',stored));
});

test('Light Hand Lightning draws even with no opposing creature to tap',()=>{
 const s=field();
 const spell=cast(s,KOV,1);
 drain(s);
 assert.equal(s.players[0].hand.length,1);
 assert.ok(has(s,0,'grave',spell));
});

test('simultaneous Kov replacements cannot reserve the same shield twice',()=>{
 const s=field(),first=add(s,1,'battle',KOV),second=add(s,1,'battle',KOV);
 s.players[1].shields.length=1;
 const [shield]=s.players[1].shields;
 cast(s,'dm38-013');
 assert.equal(s.decision.player,1);
 act(s,'replaceShield842',a=>a.shield===shield.uid);
 assert.equal(s.players[1].shields.length,1);
 assert.deepEqual(shield.shieldStack.map(x=>x.uid),[first.uid]);
 assert.ok(has(s,1,'grave',second));
 assert.equal(s.players[1].battle.length,0);
});
