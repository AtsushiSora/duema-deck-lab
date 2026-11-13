import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SQUALL='dm25rp2-035',JACKSON='dm25rp2-041',BYAHA='dm25rp2-018';
const NATURE='dm01-108',FIRE='dm01-097',STRATO='dm22rp2-048',SHIELD='dm25rp2-064';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const play=(s,id)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
const powerId=power=>data.cards.find(x=>x.type==='creature'&&x.power===power&&x.id.startsWith('dm01-')).id;

test('five official prints match the three canonical names, stats, text, images and limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1127.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[SQUALL,JACKSON,BYAHA]);
 assert.equal(manifest.printAliases.length,2);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(detail,{phase:1127}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.get(row.id).supported,true);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1127}));
 }
});

test('Squall blocks and offers G Strike when added from a broken shield',()=>{
 const s=setup(),blocker=add(s,1,'battle',SQUALL),attacker=add(s,0,'battle',NATURE);
 const target=add(s,0,'battle',NATURE);
 give(s,1,'shields',[SQUALL]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,target.uid);
 drain(s);
 assert.ok(inZone(s,1,'hand',shield));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===target.uid));
});

test('Squall counts the carrier and every nested physical card at its own turn end',()=>{
 for(const mode of ['own three','own two','enemy end','decline','printed']){
  const s=setup(),layer=inst(SQUALL);
  const carrier=add(s,0,'battle',mode==='printed'?SQUALL:NATURE,{under:[layer]});
  if(mode!=='own two')layer.under=[{...inst(NATURE),faceDown:true}];
  if(mode==='enemy end')s.active=1;
  const before=s.players[0].hand.length;
  end(s);
  const legal=!['own two','enemy end'].includes(mode);
  if(legal){
   if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===SQUALL);
   assert.equal(s.decision.source,SQUALL);
   pick(s,mode==='decline'?null:true);
   if(mode==='printed'){
    if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===SQUALL);
    pick(s,null);
   }
  }else assert.notEqual(s.decision?.source,SQUALL);
  drain(s);
  assert.equal(s.players[0].hand.length,before+(mode==='enemy end'?1:legal&&mode!=='decline'?2:0));
  if(mode!=='printed')assert.ok(!e.effectiveCard(carrier,s).blocker&&!e.effectiveCard(carrier,s).gStrike);
 }
});

test('Jackson counts only opposing visible creatures, keeps printed cost and floors reduction at one',()=>{
 const s=setup(),c=e.card(JACKSON);
 add(s,0,'battle',FIRE);
 add(s,1,'battle',NATURE,{sealed:true});
 add(s,1,'battle',NATURE);
 add(s,1,'battle',NATURE);
 assert.equal(e.summonCost(s,0,c),5);
 assert.equal(c.cost,7);
 for(let i=0;i<8;i++)add(s,1,'battle',NATURE);
 assert.equal(e.summonCost(s,0,c),1);
 const source=play(s,JACKSON);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='evolve'&&!a.baseUid));
 act(s,'evolve',a=>!!a.baseUid);
 assert.equal(e.isEvolution(source),true);
 assert.equal(e.effectiveCard(source,s).breaker,2);
});

for(const mode of ['accept','decline','no base','Stratobag'])test('Jackson Meteorburn sweep: '+mode,()=>{
 const s=setup(),base=inst(NATURE),host=add(s,0,'battle',JACKSON);
 if(mode!=='no base')host.under=[base];
 const ally=add(s,0,'battle',NATURE),low=add(s,1,'battle',NATURE);
 const exactly=add(s,1,'battle',powerId(5000)),high=add(s,1,'battle',powerId(6000));
 const strato=mode==='Stratobag'?add(s,1,'battle',STRATO):null;
 attack(s,host.uid);
 const used=mode==='accept'||mode==='Stratobag';
 if(mode!=='no base'){
  assert.equal(s.decision.task.op,'g31_Meteor');
  pick(s,used?base.uid:null);
 }
 if(strato){
  assert.equal(s.decision.task.op,'g31_Meteor825Dest');
  pick(s,strato.uid);
 }
 while(s.decision&&s.leaving){
  if(s.decision.type==='leaveReplacement')act(s,'leaveNormal');
  else e.step(s,e.chooseAI(s));
 }
 assert.equal(inZone(s,0,strato?'mana':'grave',base),used);
 assert.equal(inZone(s,1,'grave',low),used);
 assert.equal(inZone(s,1,'grave',exactly),used);
 assert.ok(inZone(s,0,'battle',ally)&&inZone(s,1,'battle',high));
 drain(s);
});

function triggerByaha(s,baseUid){
 const attacker=add(s,0,'battle',NATURE);
 give(s,1,'shields',[BYAHA]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='triggerEvolve'))act(s,'triggerEvolve',a=>a.baseUid===baseUid);
 return {shield,attacker};
}

test('Byaha can enter normally on its own turn and optionally battle a chosen enemy',()=>{
 const s=setup(),enemy=add(s,1,'battle',NATURE),unit=play(s,BYAHA);
 if(s.decision?.type==='evolution')act(s,'evolve',a=>!a.baseUid);
 assert.equal(s.decision.source,BYAHA);
 pick(s,enemy.uid);
 drain(s);
 assert.ok(inZone(s,0,'battle',unit)&&inZone(s,1,'grave',enemy));
 assert.ok(!e.isEvolution(unit));
});

test('Byaha on the opponent turn resolves battle and self-destruction as separate abilities',()=>{
 const s=setup(),base=add(s,1,'battle',FIRE),{shield,attacker}=triggerByaha(s);
 assert.ok(base);
 assert.equal(s.decision.type,'entryOrder');
 act(s,'orderEntry',a=>a.cardId===BYAHA&&!a.label.includes('破壊する'));
 pick(s,attacker.uid);
 drain(s);
 assert.ok(inZone(s,1,'grave',shield)&&inZone(s,0,'grave',attacker));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});

test('Byaha can evolve with S-Trigger and survives its entry check',()=>{
 const s=setup(),base=add(s,1,'battle',FIRE),{shield}=triggerByaha(s,base.uid);
 drain(s);
 assert.ok(inZone(s,1,'battle',shield)&&e.isEvolution(shield));
 assert.equal(shield.under[0].uid,base.uid);
});

test('Byaha can resolve Threat Shield first and survive as an evolution creature',()=>{
 const s=setup(),base=add(s,1,'grave',SHIELD),{shield}=triggerByaha(s);
 assert.equal(s.decision.type,'entryOrder');
 act(s,'orderEntry',a=>a.cardId===SHIELD);
 pick(s,true);
 drain(s);
 assert.ok(inZone(s,1,'battle',shield)&&e.isEvolution(shield));
 assert.equal(shield.under[0].uid,base.uid);
});

test('Squall uses the last known stack size if an earlier end ability returns its carrier',()=>{
 const s=setup(),host=add(s,0,'battle',NATURE,{under:[inst(SQUALL),inst(FIRE)]});
 add(s,0,'battle','dm36-030');
 end(s);
 act(s,'orderEffect',a=>a.cardId==='dm36-030');
 pick(s,host.uid);
 assert.ok(inZone(s,0,'hand',host));
 assert.equal(s.decision.source,SQUALL);
 const before=s.players[0].hand.length;
 pick(s,true);
 assert.equal(s.players[0].hand.length-before,2);
});
