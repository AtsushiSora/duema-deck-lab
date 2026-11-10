import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-826.json',import.meta.url)));
const SOLAR='dm35-039',BALM='dm35-027',BRAIN='dm34-043';
const NAT='dm01-108',WATER='dm01-083',DARK='dm01-090',ORIGIN='dm34-024',LIGHT_ORIGIN='dm32-076';
const EVO='dm02-033',NEO='dmrp01-087',HEAVY='dmex17-033',METAL='dmex17-059',DRAGON='dm01-s08';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

test('Phase 826 uses canonical deck IDs and checks the official print',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:826}));
  assert.throws(()=>standardCardSpec(detail,{phase:825}));
  const unknown=structuredClone(detail);
  unknown.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(unknown,{phase:826}));
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.deepEqual(printAliases,[]);
});

for(const mode of ['evolution','neo evolution','linked God','unlinked God','sealed evolution','none'])test('Solar Grace taps a second distinct creature only under its printed condition: '+mode,()=>{
 let s=setup();
 const first=put(s,1,'battle',NAT),second=put(s,1,'battle',NAT),sealed=put(s,1,'battle',NAT);
 s.players[1].seals=[{...inst(NAT),sealOf:sealed.uid,faceDown:true}];
 if(mode==='evolution'||mode==='sealed evolution'){
  const evolution=put(s,0,'battle',EVO);
  evolution.under=[inst(NAT)];
  if(mode==='sealed evolution')s.players[0].seals=[{...inst(NAT),sealOf:evolution.uid,faceDown:true}];
 }
 if(mode==='neo evolution')put(s,0,'battle',NEO).under=[inst(NAT)];
 if(mode.endsWith('God')){
  const god=put(s,0,'battle',HEAVY);
  if(mode==='linked God')god.godLinks=[inst(METAL)];
 }
 cast(s,SOLAR);
 assert.deepEqual(new Set(values(s)),new Set([first.uid,second.uid]));
 pick(s,first.uid);
 assert.equal(s.players[1].battle.find(x=>x.uid===first.uid).tapped,true);
 const bonus=['evolution','neo evolution','linked God'].includes(mode);
 if(bonus){
  assert.deepEqual(values(s),[second.uid]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,second.uid);
 }
 assert.equal(s.players[1].battle.find(x=>x.uid===second.uid).tapped,bonus);
 assert.equal(s.decision,null);
});

test('Solar Grace uses S-Trigger without mana and accepts already tapped creatures',()=>{
 const s=setup(),attacker=put(s,0,'battle',NAT),other=put(s,0,'battle',NAT);
 give(s,1,'mana',[]);
 const [shield]=give(s,1,'shields',[SOLAR]);
 put(s,1,'battle',EVO).under=[inst(NAT)];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,1);
 assert.ok(values(s).includes(attacker.uid));
 pick(s,attacker.uid);
 assert.deepEqual(values(s),[other.uid]);
 pick(s,other.uid);
 assert.ok(other.tapped&&has(s,1,'grave',shield));
 assert.equal(s.metrics[1].triggers,1);
});

for(const [mode,amount] of [['self',2000],['nested',6000],['linked',4000]])test('Balmantis counts only the physical cards in the chosen friendly creature: '+mode,()=>{
 let s=setup();
 give(s,0,'mana',Array(6).fill(DARK));
 const target=put(s,1,'battle',DRAGON),protectedTarget=put(s,1,'battle',NAT);
 protectedTarget.justDiverActive=true;
 const gear=put(s,0,'battle','dm14-110');
 let ally;
 if(mode==='nested'){
  ally=put(s,0,'battle',EVO);
  ally.under=[{...inst(EVO),under:[{...inst(NAT),faceDown:true}]}];
 }
 if(mode==='linked'){
  ally=put(s,0,'battle',HEAVY);
  ally.godLinks=[inst(METAL)];
 }
 cast(s,BALM);
 ally??=s.players[0].battle.find(x=>x.cardId===BALM);
 gear.crossedTo={uid:ally.uid,incarnation:ally.incarnation||0};
 assert.ok(values(s).includes(ally.uid));
 assert.ok(!values(s).includes(target.uid)&&!values(s).includes(gear.uid));
 pick(s,ally.uid);
 assert.deepEqual(values(s),[target.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,target.uid);
 if(amount===6000)assert.ok(has(s,1,'grave',target));
 else{
  const live=s.players[1].battle.find(x=>x.uid===target.uid);
  assert.equal(e.power(live,false,s),6000-amount);
  s.phase='attack';
  act(s,'endTurn');
  drain(s);
  assert.equal(e.power(live,false,s),6000);
 }
 assert.ok(has(s,1,'battle',protectedTarget)&&has(s,0,'battle',gear));
});

test('Balmantis cannot apply a modifier with no legal opposing target',()=>{
 const s=setup();
 give(s,0,'mana',Array(6).fill(DARK));
 cast(s,BALM);
 const own=s.players[0].battle.find(x=>x.cardId===BALM);
 if(s.decision)pick(s,own.uid);
 assert.equal(s.decision,null);
 assert.equal(own.powerModifiers?.length??0,0);
});

const playAction=(s,id)=>e.getLegalActions(s).find(x=>x.kind==='play'&&x.cardId===id);
for(const count of [0,1,2])test('Original Brain pays six with three Origins, then privately chooses up to two and orders the rest: '+count,()=>{
 let s=setup();
 const mana=give(s,0,'mana',[ORIGIN,LIGHT_ORIGIN,'dm33-053']);
 const top=give(s,0,'deck',[NAT,WATER,DARK,EVO,DRAGON]);
 assert.equal(e.card(BRAIN).cost,6);
 assert.ok(e.paymentPool(s,0,[],e.card(BRAIN)).every(x=>x.paymentValue===2));
 assert.ok(mana.every(x=>e.manaValueAt(s,0,x)===1));
 cast(s,BRAIN);
 const source=s.extSpells.find(x=>x.spell.id===BRAIN).inst;
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.deepEqual(new Set(values(s)),new Set([null,...top.slice(0,4).map(x=>x.uid)]));
 assert.ok(!('choices' in e.observation(s,1).decision));
 s=JSON.parse(JSON.stringify(s));
 const chosen=top.slice(0,count);
 for(const x of chosen)pick(s,x.uid);
 if(count<2)pick(s,null);
 const bottom=top.slice(count,4).reverse();
 for(const x of bottom.slice(0,-1))pick(s,x.uid);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),chosen.map(x=>x.uid));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[top[4],...bottom].map(x=>x.uid));
 assert.ok(has(s,0,'grave',source));
});

test('Original Brain still needs water and ignores a face-down Origin',()=>{
 const s=setup();
 give(s,0,'hand',[BRAIN]);
 give(s,0,'mana',[LIGHT_ORIGIN,LIGHT_ORIGIN,LIGHT_ORIGIN]);
 assert.equal(playAction(s,BRAIN),undefined);
 const [water,hidden]=give(s,0,'mana',[ORIGIN,LIGHT_ORIGIN,LIGHT_ORIGIN]);
 hidden.faceDown=true;
 assert.equal(playAction(s,BRAIN),undefined);
 hidden.faceDown=false;
 water.tapped=true;
 assert.equal(playAction(s,BRAIN),undefined);
});

test('Original Brain manual payment rejects seven and can resume before paying six',()=>{
 let s=setup();
 const [water,light,nature,extra]=give(s,0,'mana',[ORIGIN,LIGHT_ORIGIN,'dm33-053',NAT]);
 give(s,0,'hand',[BRAIN]);
 e.step(s,playAction(s,BRAIN),{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 s=JSON.parse(JSON.stringify(s));
 for(const x of [water,light,nature])act(s,'selectMana',a=>a.uid===x.uid);
 assert.equal(e.manaSelectionStatus(s.decision).amount,6);
 assert.ok(e.manaSelectionStatus(s.decision).valid);
 assert.equal(e.manaSelectionStatus({...s.decision,selected:[water.uid,light.uid,nature.uid,extra.uid]}).valid,false);
 act(s,'confirmMana');
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.ok(s.players[0].mana.filter(x=>x.tapped).length===3);
});

test('Solar Grace cannot choose the only opposing creature twice',()=>{
 const s=setup(),target=put(s,1,'battle',NAT);
 put(s,0,'battle',EVO).under=[inst(NAT)];
 cast(s,SOLAR);
 pick(s,target.uid);
 assert.ok(target.tapped);
 assert.equal(s.decision,null);
});

test('Original Brain can also pay six with ordinary mana',()=>{
 const s=setup();
 give(s,0,'mana',Array(6).fill(WATER));
 cast(s,BRAIN);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 assert.equal(s.decision.task.op,'g34_LookPick');
});
