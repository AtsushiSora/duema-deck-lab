import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ENTRY='dm24rp2-065',SCISSOR='dm24rp2-037',FOUNTAIN='dm24rp1-S06',VOL='dm24rp2-S07';
const NON='dm01-108',HIGH='dm01-s06',SPELL='dm01-110',APURU='dmrp22-042';
const ABYSS='dm22rp1-1B',DARK='dm01-090',DARK2='dm01-091',DARK3='dm01-089';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(p=0){
 const s=setup();s.active=p;
 for(const who of [0,1]){give(s,who,'deck',Array(20).fill(NON));give(s,who,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function pick(s,wanted){
 act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return typeof wanted==='function'?wanted(value):(value?.uid??value)===wanted;
 });
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const choices=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];

test('the official versions preserve the three original IDs and link both Fountain reprints',()=>{
 const m=read('tools/support-phase-1234.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ENTRY,SCISSOR,FOUNTAIN]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm24ex3-rp1S06','dm24ex3-Sec04']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1234}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Super Invasion requires the opponent to destroy one of their untapped creatures, then releases an allied Hyper creature',()=>{
 const s=field(),ready=add(s,1,'battle',NON),other=add(s,1,'battle',HIGH),tapped=add(s,1,'battle',NON,{tapped:true});
 const vol=add(s,0,'battle',VOL),ally=add(s,0,'battle',NON);
 cast(s,ENTRY);
 assert.equal(s.decision.player,1);assert.deepEqual(choices(s),[ready.uid,other.uid]);
 pick(s,ready.uid);assert.equal(s.decision.player,0);assert.deepEqual(choices(s),[vol.uid]);pick(s,vol.uid);
 assert.ok(has(s,1,'grave',ready)&&has(s,1,'battle',tapped)&&has(s,1,'battle',other));
 assert.ok(vol.hyperActive&&!ally.hyperActive&&!vol.tapped);
 end(s);assert.ok(vol.hyperActive);
 end(s);assert.ok(!vol.hyperActive);
});
test('Super Invasion resolves from the shield with a tapped attacker and no creature available to destroy',()=>{
 const s=field(1),vol=add(s,0,'battle',VOL),attacker=add(s,1,'battle',NON);
 give(s,0,'shields',[ENTRY]);attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 assert.equal(s.decision.player,0);pick(s,vol.uid);
 assert.ok(vol.hyperActive&&has(s,1,'battle',attacker)&&s.players[0].grave.some(x=>x.cardId===ENTRY));
 end(s);assert.ok(!vol.hyperActive);
});
test('Super Invasion still destroys the chosen creature with no allied Hyper creature',()=>{
 const s=field(),ready=add(s,1,'battle',NON);
 cast(s,ENTRY);pick(s,ready.uid);
 assert.ok(has(s,1,'grave',ready)&&!s.decision);
});
test('Scissor reduces only a selected opposing creature by 4000 and the reduction expires',()=>{
 const s=field(),target=add(s,1,'battle',HIGH),other=add(s,1,'battle',NON),ally=add(s,0,'battle',NON);
 cast(s,SCISSOR);assert.deepEqual(choices(s),[target.uid,other.uid]);pick(s,target.uid);
 assert.equal(e.power(target,false,s),3000);assert.equal(e.power(other,false,s),2000);
 assert.equal(e.power(ally,false,s),2000);end(s);assert.equal(e.power(target,false,s),7000);
});
test('Scissor revives optionally on an allied Hyper attack and the revived copy applies its entrance effect',()=>{
 const s=field(),vol=add(s,0,'battle',VOL),source=add(s,0,'grave',SCISSOR),target=add(s,1,'battle',NON);
 cast(s,ENTRY);pick(s,target.uid);pick(s,vol.uid);
 const victim=add(s,1,'battle',NON);
 attack(s,vol.uid);
 assert.equal(s.decision.task.source,SCISSOR);pick(s,true);pick(s,victim.uid);
 assert.ok(has(s,0,'battle',source)&&has(s,1,'grave',victim));
});
test('Scissor can decline and cannot revive on a regular attack, enemy attack, or through Apuru',()=>{
 for(const [active,hyper,lock] of [[0,true,false],[0,false,false],[1,true,false],[0,true,true]]){
  const s=field(active),vol=add(s,active,'battle',VOL,{hyperActive:hyper}),source=add(s,0,'grave',SCISSOR);
  if(lock)add(s,1,'battle',APURU);
  attack(s,vol.uid);
  if(active===0&&hyper&&!lock){assert.equal(s.decision.task.source,SCISSOR);pick(s,null);}
  assert.notEqual(s.decision?.task?.source,SCISSOR);
  assert.ok(has(s,0,'grave',source));
 }
});
const alt=(s,origin='hand')=>e.getLegalActions(s).filter(a=>a.cardId===FOUNTAIN&&a.role==='paidAlt568'&&a.origin===origin);
test('Fountain counts only own grave creature cards for the two-mana summon and requires darkness',()=>{
 const s=field();add(s,0,'hand',FOUNTAIN);
 give(s,0,'grave',[NON,NON,NON,NON,NON,SPELL]);give(s,1,'grave',[NON]);
 assert.deepEqual(alt(s),[]);assert.ok(e.getLegalActions(s).some(x=>x.cardId===FOUNTAIN&&x.cost===8));
 add(s,0,'grave',NON);give(s,0,'mana',[NON,NON]);assert.deepEqual(alt(s),[]);
 give(s,0,'mana',[DARK,NON]);assert.equal(alt(s)[0].cost,2);
 e.step(s,alt(s)[0]);const [fountain]=s.players[0].battle;
 assert.equal(fountain.cardId,FOUNTAIN);assert.equal(e.effectiveCard(fountain,s).breaker,2);
 assert.ok(e.effectiveCard(fountain,s).blocker&&s.players[0].mana.every(x=>x.tapped));
});
test('Fountain can put up to two eligible darkness creatures from its grave and cannot take an enemy card',()=>{
 for(const amount of [0,1,2]){
  const s=field(),legal=[DARK,DARK2,DARK3].map(id=>add(s,0,'grave',id));
  add(s,0,'grave',SCISSOR);add(s,0,'grave',NON);add(s,0,'grave',SPELL);add(s,1,'grave',DARK);
  cast(s,FOUNTAIN);
  assert.deepEqual(choices(s),[...legal.map(x=>x.uid),null]);
  for(const x of legal.slice(0,amount))pick(s,x.uid);
  if(amount<2)pick(s,null);
  assert.deepEqual(legal.filter(x=>has(s,0,'battle',x)),legal.slice(0,amount));
  assert.deepEqual(legal.filter(x=>has(s,0,'grave',x)),legal.slice(amount));
 }
});
test('Fountain itself can be the sixth grave creature, and Abyss Rush plus the discount results in one paid mana',()=>{
 const s=field(),fountain=add(s,0,'grave',FOUNTAIN);
 give(s,0,'mana',[DARK]);for(let n=0;n<4;n++)add(s,0,'grave',NON);
 assert.deepEqual(alt(s,'grave'),[]);
 add(s,0,'battle',ABYSS);assert.deepEqual(alt(s,'grave'),[]);
 add(s,0,'grave',NON);const [a]=alt(s,'grave');
 assert.equal(a.cost,1);assert.equal(a.manaPermit,'abyssRush');
 e.step(s,a);assert.ok(s.players[0].mana[0].tapped&&has(s,0,'battle',fountain));
 attack(s,fountain.uid);drain(s);end(s);
 assert.equal(s.players[0].deck.at(-1)?.uid,fountain.uid);
});

test('a separate non-Rush permission lets Fountain count itself and pay two without the Rush effects',()=>{
 const s=field(),fountain=add(s,0,'grave',FOUNTAIN);
 give(s,0,'mana',[DARK,NON]);for(let n=0;n<5;n++)add(s,0,'grave',NON);
 assert.deepEqual(alt(s,'grave'),[]);
 add(s,0,'battle','dm26rp1-003');
 const [a]=alt(s,'grave');
 assert.equal(a.cost,2);assert.match(a.manaPermit,/^g450:/);
 e.step(s,a);assert.ok(has(s,0,'battle',fountain)&&s.players[0].mana.every(x=>x.tapped));
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='attack'&&x.uid===fountain.uid));
 end(s);assert.ok(has(s,0,'battle',fountain));
});
