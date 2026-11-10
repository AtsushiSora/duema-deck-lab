import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const SCYTHE='dmex14-s02',WITCH='dmex13-074',FLASH='dmex14-016';
const SMALL='dm01-108',WATER='dm01-083',BIG='dm05-s04',BOUNCE='dm01-086';
const ONE='dm01-076',TWO='dm01-090',ST='dm01-027',GS='dmrp17-087',TAKE='dmrp21-040';
function field(p=0){
 const s=setup();
 s.active=p;
 for(const q of [0,1])give(s,q,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function breakOwn(s,p){
 const enemy=add(s,1-p,'battle',SMALL);
 s.active=1-p;
 attack(s,enemy.uid);
 act(s,'noBlock');
 return enemy;
}
function take(s,p){
 s.active=p;
 s.phase='main';
 play(s,TAKE);
 pick(s,s.players[p].shields[0]);
}

test('Phase 888 verifies complete official definitions, canonical IDs, art, restrictions and a supported forty',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-888.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[SCYTHE,WITCH,FLASH]);
 assert.deepEqual(m.printAliases,[]);
 const forty={id:'phase888',name:'月光王国',cards:[SCYTHE,WITCH,FLASH,SMALL,WATER,ONE,TWO,BOUNCE,ST,'dm02-024'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(forty),[]);
 assert.equal(registry.coverage(forty).unsupported,0);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:888}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:887}));
  const unknown=structuredClone(detail);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:888}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Scythe continuously buffs other friendly creatures, stacks with another copy, and loses the aura on bounce',()=>{
 const s=field(),first=add(s,0,'battle',SCYTHE),ally=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',SMALL);
 assert.equal(e.power(first,false,s),7000);
 assert.equal(e.power(ally,false,s),4000);
 assert.equal(e.power(enemy,false,s),2000);
 const second=add(s,0,'battle',SCYTHE);
 assert.equal(e.power(first,false,s),9000);
 assert.equal(e.power(second,false,s),9000);
 assert.equal(e.power(ally,false,s),6000);
 const late=add(s,0,'battle',WATER);
 assert.equal(e.power(late,false,s),5000);
 cast(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(t=>t.uid===second.uid));
 assert.equal(e.power(first,false,s),7000);
 assert.equal(e.power(ally,false,s),4000);
 assert.ok(has(s,0,'hand',second));
});

for(const p of [0,1])test('Scythe Moon applies -2000 once per physical card, destroys zero-power creatures and expires at turn end '+p,()=>{
 let s=field(p);
 add(s,p,'battle',SCYTHE);
 const ally=add(s,p,'battle',SMALL),big=add(s,1-p,'battle',BIG);
 give(s,p,'shields',[SMALL]);
 s.players[p].shields[0].shieldStack=[inst(WATER)];
 const attacker=breakOwn(s,p);
 act(s,'orderEffect',a=>a.cardId===SCYTHE);
 s=JSON.parse(JSON.stringify(s));
 drain(s);
 const survivor=s.players[1-p].battle.find(x=>x.uid===big.uid);
 assert.equal(e.power(survivor,false,s),11000);
 assert.ok(has(s,1-p,'grave',attacker));
 assert.equal(e.power(s.players[p].battle.find(x=>x.uid===ally.uid),false,s),4000);
 s.phase='main';
 const late=play(s,WATER);
 assert.equal(e.power(late,false,s),1000);
 end(s);
 assert.equal(e.power(survivor,false,s),15000);
});

test('Scythe really blocks and breaks two shields',()=>{
 const s=field(1),host=add(s,0,'battle',SCYTHE),enemy=add(s,1,'battle',SMALL);
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===host.uid);
 drain(s);
 assert.ok(host.tapped&&has(s,1,'grave',enemy));
 const t=field(),attacker=add(t,0,'battle',SCYTHE);
 attack(t,attacker.uid);
 act(t,'noBlock');
 act(t,'breakShields',a=>a.shields.length===2);
 drain(t);
 assert.equal(t.players[1].shields.length,3);
});

for(const p of [0,1])test('Witch optionally recovers a shield at own end, forbids its S Trigger and destroys only an exact cost-one opponent '+p,()=>{
 const s=field(p),witch=add(s,p,'battle',WITCH),target=add(s,1-p,'battle',ONE);
 const two=add(s,1-p,'battle',TWO),friend=add(s,p,'battle',ONE);
 give(s,p,'shields',[ST,SMALL]);
 const shield=s.players[p].shields[0];
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.decision.player,p);
 assert.ok(values(s).includes(null));
 pick(s,shield);
 assert.deepEqual(values(s),[target.uid]);
 assert.equal(s.decision.player,p);
 pick(s,target);
 drain(s);
 assert.ok(has(s,p,'hand',shield)&&!has(s,p,'grave',shield));
 assert.ok(has(s,1-p,'grave',target)&&has(s,1-p,'battle',two)&&has(s,p,'battle',friend)&&has(s,p,'battle',witch));
 assert.equal(s.active,1-p);
});

test('Witch can decline recovery, has no end trigger on the opponent turn, and can resolve without a legal victim',()=>{
 const s=field(),witch=add(s,0,'battle',WITCH);
 s.phase='attack';
 act(s,'endTurn');
 pick(s,null);
 assert.equal(s.active,1);
 assert.equal(s.players[0].shields.length,5);
 end(s);
 assert.equal(s.active,0);
 assert.ok(has(s,0,'battle',witch));
 give(s,0,'shields',[SMALL]);
 s.phase='attack';
 act(s,'endTurn');
 pick(s,s.players[0].shields[0]);
 drain(s);
 assert.equal(s.players[0].shields.length,0);
 assert.equal(s.active,1);
});

test('Witch returning a G Strike card permits its revealed defense',()=>{
 const s=field(),witch=add(s,0,'battle',WITCH),enemy=add(s,1,'battle',TWO);
 give(s,0,'shields',[GS]);
 const gs=s.players[0].shields[0];
 s.phase='attack';
 act(s,'endTurn');
 pick(s,gs);
 act(s,'orderEffect',a=>a.cardId===GS);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,enemy);
 drain(s);
 assert.ok(has(s,0,'hand',gs)&&has(s,0,'battle',witch)&&has(s,1,'battle',enemy));
});

test('Witch ignores cost-zero and cost-two bodies when its opponent also has a cost-one body',()=>{
 const s=field();
 add(s,0,'battle',WITCH);
 add(s,1,'battle',SCYTHE);
 const zero=add(s,1,'battle','dm23ex2-065'),one=add(s,1,'battle',ONE),two=add(s,1,'battle',TWO);
 give(s,0,'shields',[SMALL]);
 take(s,0);
 assert.deepEqual(values(s),[one.uid]);
 pick(s,one);
 assert.ok(has(s,1,'battle',zero)&&has(s,1,'battle',two)&&has(s,1,'grave',one));
});

for(const p of [0,1])test('Flash may decline its entry shield sacrifice, or choose a whole stack and discard only to one opposing card (QA 39428) '+p,()=>{
 const s=field(p);
 give(s,p,'shields',[SMALL]);
 const root=s.players[p].shields[0],a=inst(WATER),b=inst(TWO);
 root.shieldStack=[a,b];
 give(s,1-p,'hand',[SMALL,WATER,TWO]);
 const [keep,...discard]=s.players[1-p].hand;
 const host=play(s,FLASH);
 assert.ok(values(s).includes(null));
 pick(s,root);
 act(s,'orderEffect',a=>a.cardId===FLASH);
 assert.equal(s.decision.player,1-p);
 pick(s,discard[0]);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===FLASH);
 assert.equal(s.decision.player,1-p);
 pick(s,discard[1]);
 drain(s);
 assert.deepEqual(s.players[1-p].hand.map(x=>x.uid),[keep.uid]);
 assert.ok([root,a,b].every(x=>has(s,p,'grave',x)));
 assert.ok(has(s,p,'battle',host));
 assert.equal(s.players[p].shields.length,0);

 const t=field(p),target=add(t,1-p,'hand',SMALL);
 add(t,1-p,'hand',WATER);
 play(t,FLASH);
 pick(t,null);
 assert.ok(has(t,1-p,'hand',target));
 assert.equal(t.players[p].shields.length,5);
 assert.equal(t.decision,null);
});

for(const n of [0,1,2])test('Flash rechecks the opposing hand condition for a shield loss with '+n+' cards',()=>{
 const s=field();
 add(s,0,'battle',FLASH);
 give(s,1,'hand',Array(n).fill(WATER));
 const before=s.players[1].hand.map(x=>x.uid);
 give(s,0,'shields',[SMALL]);
 take(s,0);
 if(n===2){
  assert.equal(s.decision.player,1);
  pick(s,s.players[1].hand[1]);
 }
 assert.equal(s.players[1].hand.length,n===2?1:n);
 if(n<2)assert.deepEqual(s.players[1].hand.map(x=>x.uid),before);
 assert.equal(s.decision,null);
});

test('Flash resolves with no shield on entry, and saved discard choices conserve every physical identity',()=>{
 const s=field();
 give(s,0,'shields',[]);
 play(s,FLASH);
 assert.equal(s.decision,null);
 assert.ok(!s.pendingEffects?.length);
 let t=field();
 add(t,0,'battle',FLASH);
 give(t,1,'hand',[WATER,TWO]);
 give(t,0,'shields',[SMALL]);
 take(t,0);
 const ids=e.physicalCards(t).map(x=>x.uid).sort(),discard=t.players[1].hand[1];
 t=JSON.parse(JSON.stringify(t));
 pick(t,discard);
 assert.ok(has(t,1,'grave',discard));
 assert.deepEqual(e.physicalCards(t).map(x=>x.uid).sort(),ids);
});

for(const id of [SCYTHE,WITCH,FLASH])test(e.card(id).name+' ignores opposing shield loss and has no Moon while sealed or ignored',()=>{
 for(const mode of ['opposing','sealed','ignored']){
  const s=field(),host=add(s,0,'battle',id),target=add(s,1,'battle',ONE);
  give(s,1,'hand',[WATER,TWO]);
  if(mode==='sealed'){
   host.sealed=true;
   add(s,0,'seals',SMALL,{sealOf:host.uid,faceDown:true});
  }
  if(mode==='ignored'){if(id===SCYTHE)host.g35Ignored=s.turn;else add(s,1,'battle',GEN);}
  if(mode==='opposing'){
   const attacker=add(s,0,'battle',SMALL);
   attack(s,attacker.uid);
   act(s,'noBlock');
   drain(s);
  }else{
   give(s,0,'shields',[SMALL]);
   breakOwn(s,0);
  }
  assert.ok(has(s,1,'battle',target));
  assert.equal(e.power(target,false,s),2000);
  assert.equal(s.players[1].hand.length,mode==='opposing'?3:2);
  assert.equal(s.decision,null);
 }
});

for(const id of [SCYTHE,WITCH,FLASH])test(e.card(id).name+' charges as its printed one mana with the correct color orientation',()=>{
 const s=field();
 s.phase='charge';
 give(s,0,'hand',[id]);
 const x=s.players[0].hand[0];
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x));
 assert.equal(x.tapped,id===SCYTHE);
 assert.equal(e.card(x).manaValue,1);
});
