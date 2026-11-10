import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const QUARTET='dmr04-012',REPRINT='dmex08-301',EMPEROR='dmr05-017',GEO='dmr01-040';
const BASE='dm34-024',BEAST='dm01-108',FIRE='dm01-097',LIGHT='dm01-075',LIGHT_FIRE='dmr04-048';
const HAND='dm01-027',KALEIKO='dm22ex1-086',QX='dmrp07-m01';

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(BEAST));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=xs=>xs.map(x=>x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));

test('Phase 871 registers three complete official definitions and a Quartet print alias',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-871.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[QUARTET,EMPEROR,GEO]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[[REPRINT,QUARTET]]);
 assert.deepEqual(registry.resolveRows([{id:REPRINT,count:2},{id:QUARTET,count:2}]),[{id:QUARTET,count:4}]);
 assert.deepEqual(standardCardSpec({...m.printAliases[0],status:'complete'},{phase:871}),m.cards[0].spec);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:871}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:870}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:871}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.manaValue,c.limit],
   [row.id===GEO?'spell':'creature',f.cost,f.civilizations,1,4]);
  if(c.type==='creature')assert.deepEqual([c.power,c.race],[Number(f.powerText),f.race]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Quartet enters mana tapped and replaces destruction with a mandatory hand return',()=>{
 const s=field(),charged=add(s,0,'hand',QUARTET),victim=add(s,1,'battle',QUARTET);
 s.phase='charge';
 act(s,'charge',a=>a.uid===charged.uid);
 assert.equal(s.players[0].mana.at(-1).uid,charged.uid);
 assert.equal(s.players[0].mana.at(-1).tapped,true);
 cast(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===victim.uid));
 assert.ok(has(s,1,'hand',victim));
 assert.ok(!has(s,1,'battle',victim)&&!has(s,1,'grave',victim));
});

test('Quartet wins at the start of its controller’s turn with four live allied names',()=>{
 for(const caseName of ['four','sealed','under','opponent']){
  const s=field();
  s.active=1;
  for(let i=0;i<3;i++)add(s,0,'battle',QUARTET);
  if(caseName==='under')add(s,0,'battle',BEAST,{under:[inst(QUARTET)]});
  else {
   const fourth=add(s,caseName==='opponent'?1:0,'battle',QUARTET);
   if(caseName==='sealed')add(s,0,'seals',BEAST,{sealOf:fourth.uid,faceDown:true});
  }
  s.phase='attack';
  act(s,'endTurn');
  drain(s);
  assert.equal(s.winner,caseName==='four'?0:null,caseName);
 }
 const s=field();
 for(let i=0;i<4;i++)add(s,0,'battle',QUARTET);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(s.winner,null);
 assert.equal(s.active,1);
});

test('Emperor evolves only on a Cyber Lord, returns all layers and can take the revealed creature',()=>{
 let s=field();
 const base=add(s,0,'battle',BASE,{under:[inst(FIRE)]}),bottom=base.under[0],emperor=add(s,0,'hand',EMPEROR);
 add(s,0,'battle',BEAST);
 add(s,1,'battle',BASE);
 give(s,0,'deck',[BEAST,LIGHT,FIRE]);
 const [top,next]=s.players[0].deck;
 act(s,'play',a=>a.uid===emperor.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 attack(s,emperor.uid);
 assert.deepEqual(ids(s.players[0].hand),ids([base,bottom]));
 assert.deepEqual(values(s),[true,null]);
 assert.equal(s.decision.choices[0].cardId,top.cardId);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===EMPEROR));
 s=restore(s);
 pick(s,true);
 assert.deepEqual(ids(s.players[0].battle.find(x=>x.uid===emperor.uid).under),[top.uid]);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.ok(!s.players[0].g34Protected.includes(top.uid));
});

test('Emperor reveals with no evolution source, keeps a declined creature or spell, and respects the reveal lock',()=>{
 for(const mode of ['decline','spell','lock','last']){
  const s=field(),source=add(s,0,'battle',EMPEROR);
  give(s,0,'deck',mode==='last'?[FIRE]:[mode==='spell'?GEO:FIRE,BEAST,LIGHT]);
  const [top]=s.players[0].deck;
  if(mode==='lock')add(s,1,'battle',QX);
  attack(s,source.uid);
  assert.equal(s.log.some(x=>x.type==='reveal'&&x.cardId===EMPEROR),mode!=='lock');
  if(mode==='decline')pick(s,null);
  if(mode==='last')pick(s,true);
  assert.equal(s.players[0].deck[0]?.uid,mode==='last'?undefined:top.uid);
  assert.ok(!s.players[0].g34Protected?.includes(top.uid));
  assert.equal(s.winner,mode==='last'?1:null);
 }
});

test('Emperor returns itself after an invasion and reloads the surviving attacker',()=>{
 const s=field(),source=add(s,0,'battle',EMPEROR,{under:[inst(BASE)]}),base=source.under[0];
 const invader=add(s,0,'hand','dmr18-050'),top=s.players[0].deck[0];
 attack(s,source.uid);
 pick(s,true);
 act(s,'orderEffect',a=>a.cardId===invader.cardId);
 act(s,'extended',a=>a.cardId===invader.cardId);
 assert.deepEqual(ids(s.players[0].hand),ids([source,base]));
 pick(s,true);
 const host=s.players[0].battle.find(y=>y.uid===invader.uid);
 assert.deepEqual(ids(host.under),[top.uid]);
});

test('Geo counts a light/fire card for both effects, taps distinct opponents, and grants attack-only power',()=>{
 let s=field();
 const ally=add(s,0,'battle',BEAST),enemies=[add(s,1,'battle',BEAST),add(s,1,'battle',FIRE)];
 give(s,0,'deck',[LIGHT_FIRE,LIGHT,BEAST,FIRE]);
 const [rainbow,light,next]=s.players[0].deck;
 cast(s,GEO);
 assert.deepEqual(ids(s.players[0].mana.slice(-2)),ids([rainbow,light]));
 assert.deepEqual(s.players[0].mana.slice(-2).map(x=>x.tapped),[true,false]);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.deepEqual(values(s),ids(enemies));
 pick(s,enemies[0]);
 if(s.decision?.type==='extended'&&values(s).includes(enemies[1].uid)){
  assert.deepEqual(values(s),[enemies[1].uid]);
  pick(s,enemies[1]);
 }
 assert.ok(s.players[1].battle.every(y=>y.tapped));
 s=restore(s);
 pick(s,ally);
 const live=s.players[0].battle[0],printed=e.card(BEAST).power;
 assert.equal(e.power(live,false,s),printed);
 assert.equal(e.power(live,true,s),printed+2000);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(live,true,s),printed);
});

test('Geo stacks fire grants on one creature and gives no bonus when the mana addition is replaced',()=>{
 for(const redirected of [false,true]){
  const s=field(),ally=add(s,0,'battle',BEAST);
  if(redirected)add(s,1,'battle',KALEIKO);
  give(s,0,'deck',[FIRE,FIRE,BEAST,LIGHT]);
  const drawn=s.players[0].deck.slice(0,2),mana=s.players[0].mana.length;
  cast(s,GEO);
  if(!redirected){pick(s,ally);pick(s,ally);}
  else assert.equal(s.decision,null);
  assert.equal(s.players[0].mana.length,mana+(redirected?0:2));
  assert.ok(drawn.every(x=>has(s,0,redirected?'grave':'mana',x)));
  assert.equal(e.power(ally,true,s),e.card(BEAST).power+(redirected?0:4000));
 }
});
