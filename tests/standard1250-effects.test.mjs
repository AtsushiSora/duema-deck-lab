import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {projectRoom} from '../server/duel-core.mjs';

const BRAIN='dmex18-018',RAKAN='dmrp18-036',WORLD='dmex12-011',INFINITY='dm23bd4-006';
const SMALL='dm01-108',DRAW='dm06-085',DARK='dm01-027',TWIN='dm23bd7-003',WATER='dm01-083';
const DOREMI='promoy15-063',DEMONS='dmr23-042',QX='dmrp07-m01',DRAGON='dm22-018';
const EVOLUTION='dm22ex1-007',AMECHI='dmr20-065',SEINAN='dmex16-004';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const choose=(s,choice)=>act(s,'extended',a=>a.choice===choice);
const mana=(s,p=0)=>s.players[p].mana.filter(x=>x.tapped).length;
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const end=s=>{s.phase='attack';act(s,'endTurn');};
function selectEffect(s,filter=()=>true){
 if(s.decision?.type==='effectOrder'){
  const match=s.pendingEffects.find(x=>x.source===RAKAN&&filter(x.task));
  assert.ok(match);
  act(s,'orderEffect',a=>a.effectId===match.effectId);
 }
}
const room=s=>({game:s,phase:'playing',hostUid:'a',guestUid:'b',decks:[],profiles:[{},{}],events:[],expiresAt:10000});

test('Nine official prints resolve to three battle definitions, including both spell faces',()=>{
 const manifest=read('tools/support-phase-1250.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[BRAIN,RAKAN,WORLD]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[
  'dmex16-002','dmrp22-TR10','dm23bd4-034','dm24rp1-TD2','dm25sp2-010','dm26ex3-067'
 ].map(id=>[id,WORLD]));
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1250}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
 assert.deepEqual(e.playFaces(e.card(BRAIN)).map(x=>[x.type,x.name,x.cost]),[
  ['spell','エターナル・ブレイン',2],['spell','ブレイン珊瑚の仙樹',8]
 ]);
 assert.equal(catalogue.get('dmrp05-018').id,'dmrp05-018');
 assert.equal(catalogue.get('dmr08-043').id,'dmr08-043');
});

test('Brain offers one face per use, privately reorders the same cards and retains a sideways card (QA40925, QA40926)',()=>{
 const s=field(),brain=add(s,0,'hand',BRAIN);
 give(s,0,'deck',[DARK,WATER,SMALL,SMALL]);
 const [first,second]=s.players[0].deck;
 second.g11Sideways=true;
 add(s,1,'battle',QX,{sealed:true});add(s,1,'seals',SMALL,{sealOf:s.players[1].battle[0].uid});
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===brain.uid).map(a=>a.face??0),[0,1]);
 play(s,brain,0);
 assert.equal(mana(s),2);assert.equal(s.metrics[0].played[BRAIN],1);
 assert.ok(!has(s,0,'hand',brain)&&!has(s,0,'grave',brain));
 assert.deepEqual(projectRoom(room(s),{uid:'a'},1).game.inspectedCards?.map(x=>x.id),[DARK,WATER]);
 const opposing=projectRoom(room(s),{uid:'b'},1).game;
 assert.equal(opposing.inspectedCards,undefined);
 assert.deepEqual(opposing.actions,[]);
 pick(s,second.uid);drain(s);
 assert.deepEqual(s.players[0].deck.slice(0,2),[second,first]);
 assert.equal(second.g11Sideways,true);
 assert.ok(has(s,0,'hand',brain)&&!has(s,0,'grave',brain));
});

test('Brain returns even when looking is blocked and Coral can use a seven-cost water spell after drawing',()=>{
 const blocked=field(),front=add(blocked,0,'hand',BRAIN),top=blocked.players[0].deck[0];
 add(blocked,1,'battle',QX);
 play(blocked,front);assert.equal(blocked.decision,null);
 assert.equal(blocked.players[0].deck[0],top);
 assert.ok(has(blocked,0,'hand',front));
 const s=field();give(s,0,'hand',[TWIN,DARK,WATER,DARK]);
 const [free,black,blue]=s.players[0].hand,coral=add(s,0,'hand',BRAIN);
 play(s,coral,1);
 assert.equal(s.players[0].hand.length,7);
 assert.deepEqual(values(s),[free.uid,blue.uid,null]);
 assert.equal(s.decision.choices[0].value.face,1);
 const paid=mana(s);
 pick(s,free.uid);drain(s);
 assert.equal(paid,8);
 assert.equal(mana(s),paid);
 assert.ok(has(s,0,'grave',free)&&has(s,0,'grave',coral)&&has(s,0,'hand',black));
});

test('Rakan draws on arrival and may replay the same hand spell from the grave for free or decline',()=>{
 for(const accept of [true,false]){
  const s=field(),watcher=add(s,0,'hand',RAKAN);
  play(s,watcher);assert.equal(s.players[0].hand.length,1);
  const other=add(s,0,'grave',DRAW),spell=add(s,0,'hand',DRAW);
  play(s,spell);
  assert.ok(has(s,0,'grave',spell));assert.equal(s.players[0].hand.length,3);
  const paid=mana(s);
  assert.deepEqual(values(s),[true,null]);pick(s,accept?true:null);drain(s);
  assert.equal(mana(s),paid);
  assert.equal(s.players[0].hand.length,accept?5:3);
  assert.ok(has(s,0,accept?'grave':'battle',watcher));
  assert.ok(has(s,0,'grave',spell)&&has(s,0,'grave',other));
  assert.equal(s.metrics[0].played[DRAW],accept?2:1);
 }
});

test('Two Rakan copies can each recast one hand spell; one Rakan cannot pay for two casts (QA39856, QA39857)',()=>{
 const s=field(),copies=[add(s,0,'battle',RAKAN),add(s,0,'battle',RAKAN)],spell=add(s,0,'hand',DRAW);
 play(s,spell);
 selectEffect(s);pick(s,true);selectEffect(s);pick(s,true);drain(s);
 assert.equal(s.metrics[0].played[DRAW],3);
 assert.ok(copies.every(x=>has(s,0,'grave',x))&&has(s,0,'grave',spell));
 const n=field(),one=add(n,0,'battle',RAKAN),outer=add(n,0,'hand',DOREMI),inner=add(n,0,'hand',DEMONS);
 play(n,outer);
 choose(n,1);
 pick(n,inner.uid);
 assert.equal(n.pendingEffects.filter(x=>x.source===RAKAN).length,2);
 selectEffect(n,t=>t.target===inner.uid);pick(n,true);selectEffect(n);drain(n);
 assert.equal(n.metrics[0].played[DOREMI],1);assert.equal(n.metrics[0].played[DEMONS],2);
 assert.ok(has(n,0,'grave',one)&&has(n,0,'grave',outer)&&has(n,0,'grave',inner));
});

test('Rakan sees S-Trigger hand casts, but cannot recast spells sent to mana or spells cast by its opponent (QA39858, QA39859)',()=>{
 const s=field(1),watcher=add(s,0,'battle',RAKAN);
 give(s,0,'shields',[DARK]);
 const shield=s.players[0].shields[0],attacker=add(s,1,'battle',SMALL),other=add(s,1,'battle',SMALL);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===DARK);
 act(s,'effect',a=>a.targets[0].uid===attacker.uid);
 pick(s,true);act(s,'effect',a=>a.targets[0].uid===other.uid);drain(s);
 assert.ok(has(s,0,'grave',shield)&&has(s,0,'grave',watcher));
 assert.equal(s.metrics[0].played[DARK],2);
 const m=field(),spare=add(m,0,'battle',RAKAN),charger=add(m,0,'hand','dm23ex2-098');
 play(m,charger,1);pick(m,spare.uid);
 assert.ok(has(m,0,'mana',charger));pick(m,true);drain(m);
 assert.ok(has(m,0,'grave',spare)&&has(m,0,'mana',charger));
 assert.equal(m.metrics[0].played[charger.cardId],1);
 const o=field(1);add(o,0,'battle',RAKAN);
 play(o,add(o,1,'hand',DRAW));assert.equal(o.decision,null);
});

test('Rakan recasts only the used spell face after a destruction attempt that is replaced',()=>{
 const s=field(),watcher=add(s,0,'battle',RAKAN),brain=add(s,0,'hand',BRAIN);
 add(s,0,'battle','dmr19-s02');
 give(s,1,'shields',[SMALL,SMALL]);
 play(s,brain,1);
 assert.deepEqual(values(s),[true,null]);
 pick(s,true);drain(s);
 assert.ok(has(s,0,'battle',watcher)&&has(s,0,'grave',brain));
 assert.equal(s.metrics[0].played[BRAIN],2);
 assert.equal(s.players[0].hand.length,6);
});

test('Dragon World mills on its own turn only and can trade for the exact milled non-evolution Dragon (QA38640)',()=>{
 for(const [topId,accept] of [[DRAGON,true],[WORLD,true],[DRAGON,false],[EVOLUTION,false],[SMALL,false]]){
  const s=field(),world=add(s,0,'hand',WORLD),old=add(s,0,'grave',DRAGON);
  play(s,world);
  give(s,0,'deck',[topId,SMALL,SMALL,SMALL]);
  const top=s.players[0].deck[0];
  end(s);assert.equal(s.active,1);assert.equal(s.players[0].deck[0],top);assert.equal(s.decision,null);
  end(s);assert.equal(s.active,0);assert.ok(has(s,0,'grave',top));
  if(topId===DRAGON||topId===WORLD){assert.deepEqual(values(s),[true,null]);pick(s,accept?true:null);}
  else assert.equal(s.decision,null);
  drain(s);
  assert.ok(has(s,0,accept?'battle':'grave',top)&&has(s,0,accept?'grave':'battle',world));
  assert.ok(has(s,0,'grave',old));
 }
});

test('Both official Dragon Savers can replace the Dragon World destruction while its milled Dragon enters (QA38631, QA41125)',()=>{
 for(const saverId of [AMECHI,SEINAN]){
  const s=field(1),world=add(s,0,'battle',WORLD),saver=add(s,0,'battle',saverId);
  give(s,0,'deck',[DRAGON,SMALL,SMALL,SMALL]);const top=s.players[0].deck[0];
  end(s);pick(s,true);
  act(s,'replaceUltra',a=>a.uid===saver.uid);
  drain(s);
  assert.ok(has(s,0,'battle',world)&&has(s,0,'battle',top)&&has(s,0,'grave',saver));
 }
});

test('A Dragon World under an evolution cannot be protected by the Dragon Saver (QA41123)',()=>{
 const s=field(1),under=inst(WORLD),host=add(s,0,'battle',EVOLUTION,{under:[under]});
 const saver=add(s,0,'battle',SEINAN),jack=add(s,1,'hand','dmbd01-008');
 play(s,jack);
 const selected=e.getLegalActions(s).find(a=>s.decision?.targets?.[a.choice]?.uid===under.uid||
  a.targets?.[0]?.uid===under.uid||a.label?.includes(e.card(WORLD).name));
 assert.ok(selected,JSON.stringify(s.decision));
 e.step(s,selected);drain(s);
 assert.ok(has(s,0,'battle',host)&&has(s,0,'battle',saver)&&has(s,0,'grave',under));
 assert.ok(!s.log.some(l=>l.type==='ultraSaver'));
});

test('Infinity can reveal and deploy the actual Dragon World after another Dragon leaves (QA44370)',()=>{
 const s=field(),dragon=add(s,0,'battle',DRAGON);
 add(s,0,'battle',INFINITY);
 give(s,0,'deck',[WORLD,DRAGON,SMALL,SMALL,SMALL]);
 const [world,top]=s.players[0].deck;
 s.extTasks=[{op:'g34_ExactMove',p:1,source:DARK,owner:0,target:dragon.uid,to:'hand'}];
 act(s,'toAttack');pick(s,true);drain(s);
 assert.ok(has(s,0,'hand',dragon)&&has(s,0,'battle',world)&&!has(s,0,'mana',world));
 end(s);end(s);pick(s,true);drain(s);
 assert.ok(has(s,0,'grave',world)&&has(s,0,'battle',top));
});
