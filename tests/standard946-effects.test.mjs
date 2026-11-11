import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const THUNDER='dm32-s01',BOL='dm14-s07',RONDO='dm30-055',DEMO='dm29-012';
const THUNDER_PRINTS=['dmx12b-028','dm23ex2-006'];
const BOL_PRINTS=['dmc39-011','dmc66-013','dmx21-044','dmex15-a030'];
const PLAIN='dm01-108',TYLER='dm01-098',BASE='dm01-080',EVO='dm02-024',BIG='dm01-s01';
const GEAR='dm14-110',YES='dm31-019',BOUNCE='dm01-086',CHARGER='dm08-043',TWIN='dm22ex1-030';
const BLOCKER='dm22-038',GUARD='dmrp05-090',KNIGHT='dm28-057',NIGHTMARE='dmr19-070',APUL='dmrp22-042',GENMU='dmrp15-km1';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===(v?.uid??v));
const legal=(s,k,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===k&&pred(a));
const restore=s=>JSON.parse(JSON.stringify(s));
const power=(s,x)=>e.power(x,false,s);

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

function evolveThunder(s){
 const x=put(s,0,'hand',THUNDER),normal=put(s,0,'battle',BASE);
 put(s,1,'battle',EVO,{under:[inst(BASE)]});
 assert.ok(!legal(s,'play',a=>a.uid===x.uid));
 const base=put(s,0,'battle',EVO,{under:[inst(BASE)]});
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(!legal(s,'evolve',a=>a.baseUid===normal.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(has(s,0,'battle',x));
 assert.equal(x.under[0].uid,base.uid);
 return x;
}

function fight(s,x,target){
 attack(s,x.uid,target.uid);
 act(s,'noBlock');
}

test('Phase 946 enables four verified names and resolves six reprints to the existing IDs',()=>{
 const m=read('tools/support-phase-946.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[THUNDER,BOL,RONDO,DEMO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),
  [...THUNDER_PRINTS.map(id=>[id,THUNDER]),...BOL_PRINTS.map(id=>[id,BOL])]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],card=e.card(id),canonical=m.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:946}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:946}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.power,card.race,e.civilizations(card),card.manaValue,card.limit],
   [id===RONDO?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(card.supportBatch,'phase-946');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const cards=[THUNDER_PRINTS[0],BOL_PRINTS[3],RONDO,DEMO,PLAIN,BASE,EVO,GEAR,BOUNCE,BIG].map(id=>({id,count:4}));
 assert.deepEqual(e.validateDeck({name:'究極進化とクロスギア',cards:catalogue.resolveRows(cards)}),[]);
 assert.equal(catalogue.coverage({cards}).unsupported,0);
});

test('Thunder Moon casts an eligible own mana spell without further payment, sends it to grave and breaks three shields',()=>{
 let s=field();
 const spell=put(s,0,'mana',BOUNCE,{tapped:true}),hidden=put(s,0,'mana',BOUNCE,{faceDown:true});
 const enemy=put(s,1,'battle',BIG);
 put(s,1,'mana',BOUNCE);put(s,0,'hand',BOUNCE);
 const thunder=evolveThunder(s),tapped=s.players[0].mana.filter(x=>x.tapped).length;
 assert.deepEqual(choices(s),[spell.uid,null]);
 s=restore(s);pick(s,spell);
 act(s,'effect',a=>a.targets.some(t=>t.uid===enemy.uid));
 assert.ok(has(s,1,'hand',enemy)&&has(s,0,'grave',spell)&&has(s,0,'mana',hidden));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped-1);
 attack(s,thunder.uid);act(s,'noBlock');act(s,'breakShields',a=>a.shields.length===3);
 drain(s);assert.equal(s.players[1].shields.length,2);
});

for(const id of [CHARGER,TWIN])test('Thunder Moon can cast a Charger face from mana and preserves its prior position state '+id,()=>{
 const s=field(),spell=put(s,0,'mana',id,{tapped:true,zoneSerial:41}),count=s.players[0].mana.length;
 evolveThunder(s);
 assert.deepEqual(choices(s),[spell.uid,null]);
 assert.equal(s.decision.choices[0].value.face,id===TWIN?1:0);
 pick(s,spell);drain(s);
 const returned=s.players[0].mana.find(x=>x.uid===spell.uid);
 assert.ok(returned?.tapped);
 assert.equal(returned.zoneSerial,41);
 assert.equal(s.players[0].mana.length,count);
 assert.ok(!has(s,0,'grave',spell));
});

test('Thunder Moon can decline, and respects a prohibition on casting from mana',()=>{
 for(const blocked of [false,true]){
  const s=field(),spell=put(s,0,'mana',BOUNCE);
  if(blocked)put(s,1,'battle',APUL);
  evolveThunder(s);
  if(blocked)assert.ok(!s.decision||!choices(s).includes(spell.uid));
  if(s.decision)pick(s,null);
  assert.ok(has(s,0,'mana',spell)&&!has(s,0,'grave',spell));
 }
});

test('Bolberg uses normal cross timing and can cross or recross multiple friendly gears with zero mana',()=>{
 const s=field(),other=put(s,0,'battle',PLAIN),bol=play(s,BOL),gear=play(s,GEAR),second=play(s,YES);
 const enemyGear=put(s,1,'battle',GEAR);
 const options=(g,x)=>e.getLegalActions(s).filter(a=>a.kind==='crossGear'&&a.uid===g.uid&&a.target===x.uid);
 assert.deepEqual(options(gear,bol).map(a=>a.cost),[0,1]);
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===other.uid);
 for(const mana of s.players[0].mana)mana.tapped=true;
 assert.ok(!options(enemyGear,bol).length);
 for(const item of [gear,second])act(s,'crossGear',a=>a.uid===item.uid&&a.target===bol.uid&&a.cost===0);
 assert.equal(power(s,other),2000);
 assert.equal(power(s,bol),13000);
 assert.equal(e.effectiveCard(bol,s).blocker,true);
 assert.ok(!options(gear,bol).length);
 attack(s,bol.uid);
 assert.ok(!legal(s,'crossGear'));
 act(s,'noBlock');act(s,'breakShields',a=>a.shields.length===2);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Bolberg loses the free option while its own abilities are ignored',()=>{
 const s=field(),bol=play(s,BOL),gear=play(s,GEAR);
 bol.g35Ignored=s.turn;
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='crossGear'&&a.uid===gear.uid&&a.target===bol.uid).map(a=>a.cost),[1]);
 s.phase='attack';
 assert.ok(!legal(s,'attack',a=>a.uid===bol.uid));
});

for(const accept of [true,false])test('Rondo adds 2000 to the chosen ally and offers untap only on its first victory '+accept,()=>{
 let s=field();
 const ally=put(s,0,'battle',PLAIN),other=put(s,0,'battle',BIG);
 const first=put(s,1,'battle',PLAIN,{tapped:true}),second=put(s,1,'battle',PLAIN,{tapped:true});
 play(s,RONDO);assert.deepEqual(choices(s),[ally.uid,other.uid]);pick(s,ally);
 assert.deepEqual([power(s,ally),power(s,other)],[4000,9500]);
 fight(s,ally,first);
 assert.equal(s.decision.source,RONDO);
 s=restore(s);pick(s,accept?true:null);
 const host=s.players[0].battle.find(x=>x.uid===ally.uid);
 assert.equal(host.tapped,!accept);
 if(!accept)host.tapped=false;
 fight(s,host,second);
 assert.equal(s.decision,null);
 assert.equal(host.tapped,true);
 assert.ok(has(s,1,'grave',first)&&has(s,1,'grave',second));
 act(s,'endTurn');
 assert.equal(power(s,host),2000);
});

test('Rondo cast after a victory adds power without repeating the first-win trigger',()=>{
 const s=field(),ally=put(s,0,'battle',BIG);
 const enemies=[0,1].map(()=>put(s,1,'battle',PLAIN,{tapped:true}));
 fight(s,ally,enemies[0]);
 assert.equal(s.decision,null);
 s.phase='main';ally.tapped=false;
 play(s,RONDO);pick(s,ally);
 fight(s,ally,enemies[1]);
 assert.equal(power(s,ally),11500);
 assert.ok(ally.tapped&&has(s,1,'grave',enemies[1]));
 assert.equal(s.decision,null);
});

test('Genmu suppresses Rondo’s power and delayed untap after the spell resolved',()=>{
 const s=field(),ally=put(s,0,'battle',BIG),enemy=put(s,1,'battle',PLAIN,{tapped:true});
 play(s,RONDO);pick(s,ally);
 put(s,1,'battle',GENMU);
 assert.equal(power(s,ally),9500);
 fight(s,ally,enemy);
 assert.ok(ally.tapped&&has(s,1,'grave',enemy));
 assert.equal(s.decision,null);
});

for(const [p,accept] of [[0,true],[1,false]])test('Demotory publicly reveals and may recover a Knight when its ally is blocked or blocks '+p,()=>{
 let s=field();
 put(s,p,'battle',DEMO);
 const a=put(s,0,'battle',TYLER),blocker=put(s,1,'battle',BLOCKER);
 const top=inst(KNIGHT);
 s.players[p].deck.unshift(top);
 attack(s,a.uid);act(s,'block',x=>x.uid===blocker.uid);
 assert.equal(s.decision.source,DEMO);
 assert.equal(s.decision.player,p);
 assert.deepEqual(choices(s),[top.uid,null]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.text.includes(e.card(KNIGHT).name)));
 assert.ok(!s.log.some(x=>x.type==='battle'));
 s=restore(s);pick(s,accept?top:null);drain(s);
 assert.equal(has(s,p,'hand',top),accept);
 if(!accept)assert.equal(s.players[p].deck[0].uid,top.uid);
});

test('Demotory resolves simultaneous block triggers in turn player order',()=>{
 const s=field(),a=put(s,0,'battle',DEMO),blocker=put(s,1,'battle',BLOCKER);
 put(s,1,'battle',DEMO);
 const tops=[inst(KNIGHT),inst(KNIGHT)];
 for(const p of [0,1])s.players[p].deck.unshift(tops[p]);
 attack(s,a.uid);act(s,'block',x=>x.uid===blocker.uid);
 for(const p of [0,1]){
  assert.equal(s.decision.source,DEMO);
  assert.equal(s.decision.player,p);
  pick(s,tops[p]);
 }
 drain(s);
 for(const p of [0,1])assert.ok(has(s,p,'hand',tops[p]));
});

test('Demotory leaves a Funky Nightmare revealed at the top, with no Knight option',()=>{
 const s=field(),a=put(s,0,'battle',DEMO),blocker=put(s,1,'battle',BLOCKER),top=inst(NIGHTMARE);
 s.players[0].deck.unshift(top);
 attack(s,a.uid);act(s,'block',x=>x.uid===blocker.uid);drain(s);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.text.includes(e.card(NIGHTMARE).name)));
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.ok(!has(s,0,'hand',top));
});

test('Demotory watches neither Guardman nor an unblocked attack and breaks two shields',()=>{
 const s=field(),a=put(s,0,'battle',DEMO),victim=put(s,1,'battle',PLAIN,{tapped:true}),guard=put(s,1,'battle',GUARD);
 put(s,1,'battle',DEMO);
 attack(s,a.uid,victim.uid);act(s,'guardman',x=>x.uid===guard.uid);drain(s);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===DEMO));
 assert.ok(has(s,0,'battle',a));
 a.tapped=false;
 attack(s,a.uid);act(s,'noBlock');act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===DEMO));
});
