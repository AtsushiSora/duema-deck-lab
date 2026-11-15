import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const Z='dmrp11-s06',GR='dmrp09-m01',XX='dmrp20-009',SW='dm23rp4-046',
 HATCH='dmex14-021',PARA='dmr10-013',DELETE='dmx21-026',KILL='dm01-027',WATER='dm01-083',NATURE='dm01-108';
const RAGNAROK='dmrp16-006';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(){
 const s=setup();s.format='advance';s.active=0;
 for(const p of [0,1]){give(s,p,'deck',Array(24).fill(NATURE));s.players[p].gr=[];s.players[p].extra=[];s.players[p].seals=[];}
 return s;
}
const add=(s,p,zone,id,extra={})=>{const x=Object.assign(inst(id),{cardOwner:p},extra);s.players[p][zone].push(x);return x;};
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const exact=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,v)=>act(s,'extended',a=>(s.decision?.choices?.[a.choice]?.value?.uid??s.decision?.choices?.[a.choice]?.value)===v);
function aura(s,{summon=false,draw=0,host=null}={}){
 if(summon)host=add(s,0,'gr',GR);
 else host??=add(s,0,'battle',GR);
 const aura=add(s,0,'hand',Z);
 act(s,'play',a=>a.uid===aura.uid);
 assert.equal(s.decision.type,'aura1352');
 act(s,summon?'grAura1352':'attachAura1352',a=>summon||a.uid===host.uid);
 pick(s,draw);
 return {host,aura};
}

test('canonical and reprint resolve to one fully verified aura',()=>{
 const m=read('tools/support-phase-1352.json'),registry=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1352}),m.cards[0].spec);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:Z,count:1}]);
 }
 const card=e.card(Z);assert.equal(card.type,'aura');assert.equal(card.power,0);assert.equal(card.auraPower,4000);
 assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(card.name)).length,1);
 assert.equal(CARD_IMAGES[Z],m.cards[0].image);
});

for(const summon of [false,true])test('attaching to an existing or new GR grants power and an optional draw: '+summon,()=>{
 const s=field(),before=s.players[0].deck[0],{host,aura:z}=aura(s,{summon,draw:1});
 assert.ok(inZone(s,0,'battle',host)&&inZone(s,0,'battle',z));
 assert.equal(z.auraTo1352.uid,host.uid);
 assert.equal(e.power(host,false,s),7000);
 assert.equal(e.effectiveCard(host,s).breaker,2);
 assert.ok(inZone(s,0,'hand',before));
 const ids=exact(s),loaded=JSON.parse(JSON.stringify(s));
 assert.deepEqual(exact(loaded),ids);
 assert.equal(e.power(loaded.players[0].battle.find(x=>x.uid===host.uid),false,loaded),7000);
});

test('attaching a second aura triggers both, and destroying their host moves both to the grave',()=>{
 const s=field(),{host,aura:first}=aura(s),second=add(s,0,'hand',Z);
 act(s,'play',a=>a.uid===second.uid);
 act(s,'attachAura1352',a=>a.uid===host.uid);
 assert.equal(s.decision.type,'effectOrder');
 const trigger=s.pendingEffects.find(x=>x.uid===first.uid);
 act(s,'orderEffect',a=>a.effectId===trigger.effectId);
 pick(s,1);pick(s,0);
 assert.equal(e.power(host,false,s),11000);
 s.active=1;s.phase='main';cast(s,KILL);act(s,'effect',a=>a.targets[0].uid===host.uid);
 assert.ok(inZone(s,0,'gr',host));
 for(const z of [first,second])assert.ok(inZone(s,0,'grave',z));
});

test('310.2a: a GR creature destroyed before attachment leaves the aura in its original hand slot',()=>{
 const s=field();
 add(s,1,'shields',PARA,{faceUp:true});
 const host=add(s,0,'gr',GR);
 const before=add(s,0,'hand',NATURE),a=add(s,0,'hand',Z),after=add(s,0,'hand',NATURE);
 act(s,'play',x=>x.uid===a.uid);act(s,'grAura1352');
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[before.uid,a.uid,after.uid]);
 assert.ok(inZone(s,0,'gr',host));
 assert.ok(!s.decision);
});

test('310.7: the aura stays attached after its GR creature evolves',()=>{
 const s=field(),host=add(s,0,'battle','dmsd11-014');
 const {aura:z}=aura(s,{host});
 const evo=add(s,0,'hand','dm25rp2-012');
 act(s,'play',x=>x.uid===evo.uid);act(s,'evolve',x=>x.baseUid===host.uid);
 assert.equal(z.auraTo1352.uid,evo.uid);
 assert.equal(e.power(evo,false,s),6500);
 assert.equal(e.effectiveCard(evo,s).breaker,2);
});

test('310.8b: Sixfall lets the owner order the GR creature and its aura under another creature',()=>{
 for(const first of ['aura','gr']){
  const s=field(),{host:gr,aura:z}=aura(s),host=add(s,0,'battle',WATER),before=exact(s);
  s.extTasks=[{op:'g35_Custom',p:1,source:'dm25rp2-S02',name:'sixfall',owner:0}];
  act(s,'toAttack');pick(s,host.uid);pick(s,gr.uid);
  assert.equal(s.decision.player,0);
  pick(s,first==='aura'?z.uid:gr.uid);
  assert.deepEqual(host.under.map(x=>x.uid),first==='aura'?[z.uid,gr.uid]:[gr.uid,z.uid]);
  assert.equal(z.auraTo1352,undefined);
  assert.deepEqual(exact(s),before);
 }
});

test('QA40665: XXDDZ keeps its linked shield and still prohibits opposing spells',()=>{
 const s=field();aura(s);cast(s,XX);
 const dragon=s.players[0].battle.find(x=>x.cardId===XX),[shield]=e.exLifeShields(s,0,dragon);
 assert.ok(shield);
 attack(s,dragon.uid);pick(s,shield.uid);
 assert.ok(inZone(s,0,'shields',shield));assert.ok(!inZone(s,0,'grave',shield));
 assert.equal(e.canCastSpell(s,1,e.card(KILL)),false);
});

test('Schwarzring continues after attempting to put its protected shield into the grave',()=>{
 const s=field();aura(s);const target=add(s,1,'battle',NATURE),shield=s.players[0].shields[0];
 cast(s,SW);pick(s,shield.uid);
 assert.equal(s.decision.player,1);pick(s,target.uid);
 assert.ok(inZone(s,1,'grave',target));
 assert.ok(inZone(s,0,'shields',shield));
});

test('QA39077: Ragnarok counts only the shield cards that actually moved',()=>{
 for(const outcome of ['stay','grave']){
  const s=field();aura(s);
  const shield=add(s,0,'shields',PARA,{faceUp:true});
  const before=s.players[0].shields.length,deck=s.players[0].deck.length;
  cast(s,RAGNAROK);
  assert.equal(s.decision?.type,'shieldStay1352');
  const restored=JSON.parse(JSON.stringify(s));
  act(restored,'chooseShieldStay1352',a=>a.choice===outcome);
  const departed=outcome==='grave';
  assert.equal(inZone(restored,0,'grave',shield),departed);
  assert.equal(inZone(restored,0,'shields',shield),!departed);
  assert.equal(restored.players[0].deck.length,deck-(departed?2:1));
  assert.equal(restored.players[0].shields.length,before+1);
 }
});

for(const path of [HATCH,DELETE])for(const outcome of ['stay','grave'])test('QA40456: the owner chooses between Shield Go and keeping the shield: '+path+' '+outcome,()=>{
 const s=field();aura(s);
 const shield=add(s,0,'shields',PARA,{faceUp:true}),other=s.players[0].shields[0];
 if(path===HATCH){
  const host=add(s,0,'battle',HATCH);attack(s,host.uid);pick(s,shield.uid);
 }else{
  s.active=1;s.phase='main';cast(s,DELETE);
 }
 assert.equal(s.decision?.type,'shieldStay1352');assert.equal(s.decision.player,0);
 act(s,'chooseShieldStay1352',a=>a.choice===outcome);
 assert.equal(inZone(s,0,'shields',shield),outcome==='stay');
 assert.equal(inZone(s,0,'grave',shield),outcome==='grave');
 assert.ok(inZone(s,0,'shields',other));
 assert.ok(!inZone(s,0,'battle',shield));
});

test('rule 310.8 moves an attached aura with a GR creature chosen by Rakujo no Kei',()=>{
 const s=field(),{host,aura:attached}=aura(s);
 s.active=1;s.phase='main';
 cast(s,'dmr15-041');
 pick(s,host.uid);
 assert.ok(inZone(s,0,'hand',attached));
 assert.ok(inZone(s,0,'gr',host));
 assert.ok(!inZone(s,0,'grave',attached));
});

test('Jokers Heart counts the GR and its aura before the GR returns to the extra deck',()=>{
 const s=field(),{host,aura:attached}=aura(s),n=s.players[0].shields.length;
 cast(s,'dmex19-023');
 const heart=s.players[0].battle.find(x=>x.cardId==='dmex19-023');
 pick(s,heart.uid);pick(s,null);
 assert.equal(s.players[0].shields.length,n+2);
 assert.ok(inZone(s,0,'gr',host));
 assert.ok(inZone(s,0,'deck',attached)||inZone(s,0,'shields',attached));
});
