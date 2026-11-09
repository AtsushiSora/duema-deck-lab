import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-722.json',import.meta.url)));

test('Phase 722 validates five complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:722}));
  assert.throws(()=>standardCardSpec(detail,{phase:721}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:722}));
 }
});

const GAL='dm19-025', RAOOM='dm19-056', RAY='dm16-052', GRAN='dm16-022', TAG='dm10-040';
const CLAW='dm14-110', SUIT='dm14-086', WATER='dm01-083', DARK='dm01-090', NATURE='dm01-108';
const LANCER='dm02-024', MULTI='dm10-064', COURTNEY='dm13-015', BLOCKER='dm01-011';
const MAROKU='dm23ex1-033', TAKION='dm23ex1-058';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);

function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}

function play(s,id,pred=()=>true){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&pred(a));
 return x;
}

const cross=(s,gear,host)=>act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid);
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
const ramped=(s,p)=>s.players[p].mana.filter(x=>x.tapped);

test('the verified Galmajias and Tagtap reprints share each original battle ID',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(printAliases.map(x=>x.canonicalId),[GAL,TAG]);
 const stats=faces=>faces.map(({abilityText,civilizationText,powerText,...face})=>({...face,power:Number(powerText.replace(/\+$/,''))}));
 for(const print of printAliases){
  const original=cards.find(x=>x.id===print.canonicalId);
  assert.deepEqual(stats(print.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:722}),original.spec);
  assert.ok(print.verification.facesMatched);
  assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[original.id]);
  assert.equal(catalogue.get(print.id).id,original.id);
  assert.deepEqual(catalogue.resolveRows([{id:original.id,count:1},{id:print.id,count:3}]),[{id:original.id,count:4}]);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
});

test('Galmajias breaks two chosen shields and then restricts only other allies',()=>{
 let s=field();
 const gal=put(s,0,GAL),ally=put(s,0,NATURE);
 const shields=s.players[1].shields.map(x=>x.uid);
 attack(s,gal.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 s=restore(s);
 const selected=[shields[1],shields[3]];
 act(s,'breakShields',a=>a.shields.join()===selected.join());
 drain(s);
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),[shields[0],shields[2],shields[4]]);
 assert.equal(attacks(s,ally).length,0);
 s.players[0].battle[0].tapped=false;
 assert.ok(attacks(s,gal).length>0);
});

test('Raoom slays a stronger blocker even when it loses and its attack restriction persists',()=>{
 const s=field();
 const raoom=put(s,0,RAOOM),ally=put(s,0,NATURE),blocker=put(s,1,BLOCKER);
 attack(s,raoom.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.ok(s.players[0].grave.some(x=>x.uid===raoom.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===blocker.uid));
 assert.equal(attacks(s,ally).length,0);
 act(s,'endTurn');
 assert.ok(!e.attackLocked(s,0,ally));
});

test('Raylin can return one selected mana card on own gear entry, and does not trigger on crossing or enemy entry',()=>{
 let s=field();
 const ray=put(s,0,RAY),otherRay=put(s,1,RAY);
 const [mana]=s.players[0].mana;
 play(s,WATER);
 assert.equal(s.decision,null);
 const gear=play(s,CLAW);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_Select');
 s=restore(s);
 pick(s,mana.uid);
 drain(s);
 assert.ok(s.players[0].hand.some(x=>x.uid===mana.uid));
 assert.ok(!s.players[0].mana.some(x=>x.uid===mana.uid));
 cross(s,gear,ray);
 assert.equal(s.decision,null);
 s.active=1;
 play(s,SUIT);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.source,otherRay.cardId);
 pick(s,null);
 assert.equal(s.decision,null);
});

test('Raylin also triggers for a gear generated for free by Mekraid',()=>{
 const s=field(),ray=put(s,0,RAY),maroku=put(s,0,MAROKU);
 put(s,0,CLAW,{crossedTo:{uid:maroku.uid,incarnation:0}});
 give(s,0,'deck',[TAKION,WATER,NATURE,NATURE,NATURE,NATURE]);
 const [gear]=s.players[0].deck, [mana]=s.players[0].mana;
 s.extTasks=[{op:'g18_Maroku',p:0,source:MAROKU,uid:maroku.uid,incarnation:0}];
 act(s,'toAttack');
 pick(s,gear.uid);
 if(s.decision?.task?.op==='g18_FreeCross')pick(s,ray.uid);
 if(s.decision?.task?.op==='g18_Order')act(s,'extended');
 assert.equal(s.decision.task.op,'g34_Select');
 pick(s,mana.uid);
 drain(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===gear.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===mana.uid));
});

test('Gran G-Zero needs a real cross on either side and spends no mana',()=>{
 const s=field(),enemy=put(s,1,WATER),gear=put(s,1,CLAW);
 const gran=inst(GRAN);
 s.players[0].hand.push(gran);
 const free=()=>e.getLegalActions(s).find(a=>a.uid===gran.uid&&a.freeSummon==='G・ゼロ');
 assert.ok(!free());
 s.active=1;
 cross(s,gear,enemy);
 s.active=0;
 assert.ok(free());
 e.step(s,free());
 drain(s);
 assert.ok(s.players[0].battle.includes(gran));
 assert.equal(ramped(s,0).length,0);
 assert.equal(e.power(enemy,false,s),4000);
});

test('each Gran buffs both sides once per crossed creature and keeps the bonus through evolution',()=>{
 const s=field(),first=put(s,0,GRAN),second=put(s,1,GRAN),own=put(s,0,WATER),opp=put(s,1,WATER);
 const gear=put(s,0,CLAW),suit=put(s,0,SUIT),enemyGear=put(s,1,CLAW);
 cross(s,gear,own);
 cross(s,suit,own);
 s.active=1;
 cross(s,enemyGear,opp);
 s.active=0;
 assert.equal(e.power(own,false,s),6000);
 assert.equal(e.power(opp,false,s),5000);
 assert.equal(e.power(first,false,s),2000);
 const evo=play(s,LANCER);
 act(s,'evolve',a=>a.base===own.uid||a.baseUid===own.uid);
 drain(s);
 assert.equal(gear.crossedTo.uid,evo.uid);
 assert.equal(e.power(evo,false,s),e.card(LANCER).power+5000);
 second.g35Ignored=s.turn;
 assert.equal(e.power(evo,false,s),e.card(LANCER).power+4000);
 cross(s,suit,first);
 assert.equal(e.power(first,false,s),4000);
});

test('Tagtap counts opposing Water mana, including multicolor and granted Water (QA 35178)',()=>{
 const s=field(),tag=put(s,0,TAG);
 const breaker=()=>e.effectiveCard(tag,s).breaker??1;
 give(s,1,'mana',[DARK,DARK,MULTI]);
 assert.equal(e.power(tag,false,s),4000);
 assert.equal(breaker(),1);
 s.players[1].mana.push(inst(WATER),inst(WATER));
 s.players[1].mana.at(-2).tapped=true;
 assert.equal(e.power(tag,false,s),6000);
 assert.equal(breaker(),2);
 s.players[1].mana.at(-1).faceDown=true;
 assert.equal(e.power(tag,false,s),5000);
 assert.equal(breaker(),1);
 put(s,1,COURTNEY);
 assert.equal(e.power(tag,false,s),8000);
 assert.ok(s.players[1].mana.at(-1).faceDown);
 s.players[1].mana.push(...Array.from({length:4},()=>inst(DARK)));
 assert.equal(e.power(tag,false,s),12000);
 assert.equal(breaker(),2);
 tag.g35Ignored=s.turn;
 assert.equal(e.power(tag,false,s),3000);
 assert.equal(breaker(),1);
});

test('Tagtap goes into mana tapped and its attack uses the power-based W-Breaker',()=>{
 const s=field(),charged=inst(TAG);
 s.phase='charge';
 s.players[0].hand.push(charged);
 act(s,'charge',a=>a.uid===charged.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===charged.uid).tapped);
 const tag=put(s,0,TAG);
 give(s,1,'mana',[WATER,MULTI,WATER]);
 attack(s,tag.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});
