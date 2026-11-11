import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DOL='dmr23-043',DOOM='dmr23-003',KATSU='dmr23-s06',EBI='dmr22-046',PIYO='dmr23-065';
const NATURE='dm01-108',FIRE='dm01-008',LIGHT_DRAGON='dmr17-058',LOW_DRAGON='dm08-049';
const MULTI='dm24ex2-019',COLORLESS='dmrp04s-057',RED_ZONE='dm25rp3-DM1';
const FIELD='dmrp08-005',D2='dmr21-036',APUL='dmrp22-042',HAND='dm01-027',DASH='dmsd14-011';
const TWINPACT='dm22ex1-030',SURFER='dm05-024',JAOUMON='dmrp15-028';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(22).fill(NATURE));give(s,p,'grave',[]);}
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
function change(s,attacker,target='player'){
 attack(s,attacker.uid,target);
 assert.equal(s.decision.task.op,'revDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'revResolve');
 pick(s,attacker.uid);
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Phase 1007 pins five complete definitions and resolves every reprint and the alternate delta glyph',()=>{
 const m=read('tools/support-phase-1007.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DOL,DOOM,KATSU,EBI,PIYO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmex06-088',DOL],['dmbd21-025',DOL],['dmex12-s17',KATSU]
 ]);
 for(const row of m.printAliases){
  assert.equal(snapshot.aliases[row.id],row.canonicalId);
  assert.equal(registry.get(row.id).id,row.canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1007}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
 assert.deepEqual(registry.resolveRows([{id:DOL,count:1},{id:'dmex06-088',count:1},{name:'終断δ ドルハカバ',count:2}]),[{id:DOL,count:4}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1007}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の追加能力。'}]},{phase:1007}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1007');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(registry.get(id).supported,true);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 assert.match(registry.get(DOOM).faces[0].abilityText,/−13000/);
 for(const {id,image,canonicalId=id,verification} of [...m.cards,...m.printAliases]){
  assert.equal(verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[canonicalId,image]]);
 }
});

for(const id of [DOL,KATSU,EBI,PIYO])test(id+' enters mana tapped',()=>{
 const s=field(),x=put(s,0,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
});

for(const id of [D2,FIELD])test('Dolhakaba pays both colors and can attack immediately after a grave summon with '+id,()=>{
 let s=field();
 put(s,0,'battle',id);
 give(s,0,'mana',['dm01-090',FIRE,NATURE,NATURE,NATURE]);
 const x=put(s,0,'grave',DOL),before=physical(s);
 const available=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.origin==='grave'&&a.uid===x.uid);
 assert.equal(available().cost,5);
 s.players[0].mana[1].tapped=true;
 s.players[0].mana.push(inst(NATURE));
 assert.equal(available(),undefined);
 s.players[0].mana[1].tapped=false;
 s=restore(s);
 const all=physical(s);
 act(s,'play',a=>a.uid===x.uid&&a.origin==='grave');
 assert.ok(has(s,0,'battle',x));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
 attack(s,x.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(all.length,before.length+1);
 assert.deepEqual(physical(s),all);
});

for(const mode of ['none','opponent','in-grave','movement-lock'])test('Dolhakaba grave permission excludes '+mode,()=>{
 const s=field(),x=put(s,0,'grave',DOL);
 if(mode==='opponent')put(s,1,'battle',D2);
 if(mode==='in-grave')put(s,0,'grave',FIELD);
 if(mode==='movement-lock'){put(s,0,'battle',FIELD);put(s,1,'battle',APUL);}
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
});

for(const accept of [true,false])test('Dooms optionally mills exactly six from its own library '+accept,()=>{
 const s=field(),before=physical(s),top=s.players[0].deck.slice(0,6).map(x=>x.uid);
 play(s,DOOM);
 assert.equal(s.decision.task.op,'g34_Mill');
 pick(s,accept?true:null);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),accept?top:[]);
 assert.equal(s.players[1].grave.length,0);
 assert.deepEqual(physical(s).filter(x=>before.includes(x)),before);
});

for(const threshold of [12,13])test('Dooms counts only own grave creatures and sweeps at '+threshold,()=>{
 const s=field(),dooms=put(s,0,'battle',DOOM),ally=put(s,0,'battle',NATURE);
 const weak=put(s,1,'battle','dmr15-s04'),large=put(s,1,'battle','dmr03-003');
 const untargetable=put(s,1,'battle','dmrp01-041'),enemyField=put(s,1,'battle',FIELD);
 assert.ok(e.card(TWINPACT).spellFace);
 give(s,0,'grave',[...Array(threshold-1).fill(NATURE),TWINPACT,HAND]);
 give(s,1,'grave',Array(13).fill(NATURE));
 const before=physical(s);
 attack(s,dooms.uid);
 drain(s);
 assert.equal(has(s,1,'grave',weak),threshold===13);
 assert.equal(has(s,1,'grave',untargetable),threshold===13);
 assert.equal(e.power(large,false,s),threshold===13?1000:14000);
 assert.equal(e.power(ally,false,s),2000);
 assert.ok(has(s,1,'battle',enemyField));
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),before);
 end(s);
 assert.equal(e.power(large,false,s),14000);
});

test('Katsuking adds a face-down shield, then allows an S-Trigger on its entry break',()=>{
 let s=field();
 give(s,1,'shields',[SURFER,NATURE]);
 const [trigger]=s.players[1].shields,top=s.players[0].deck[0],x=play(s,KATSU);
 assert.equal(s.decision.task.op,'g34_Break497');
 assert.deepEqual(s.players[0].shields.slice(-1).map(y=>[y.uid,!!y.faceUp]),[[top.uid,false]]);
 const before=physical(s);
 s=restore(s);
 pick(s,trigger.uid);
 act(s,'useTrigger',a=>a.cardId===SURFER);
 drain(s);
 assert.ok(has(s,1,'battle',trigger));
 assert.equal(s.players[1].shields.length,1);
 assert.ok(has(s,0,'hand',x));
 assert.deepEqual(physical(s),before);
});

for(const id of [LIGHT_DRAGON,FIRE])test('Katsuking changes from a qualifying Dragon and entry plus W Breaker break three '+id,()=>{
 const s=field(),base=put(s,0,'battle',id),x=put(s,0,'hand',KATSU);
 const top=s.players[0].deck[0];
 change(s,base);
 drain(s);
 assert.ok(has(s,0,'hand',base)&&has(s,0,'battle',x));
 assert.deepEqual(s.players[0].shields.slice(-1).map(y=>[y.uid,!!y.faceUp]),[[top.uid,false]]);
 assert.equal(s.players[1].shields.length,2);
});

for(const id of [NATURE,LOW_DRAGON])test('Katsuking cannot change from a nonqualifying attacker '+id,()=>{
 const s=field(),a=put(s,0,'battle',id);
 put(s,0,'hand',KATSU);
 attack(s,a.uid);
 assert.notEqual(s.decision?.task?.op,'revDeclare');
});

test('Katsuking attack-effect break alone enables Kirifuda Dash when attacking a creature',()=>{
 const s=field(),x=put(s,0,'battle',KATSU),foe=put(s,1,'battle',NATURE,{tapped:true});
 const dash=put(s,0,'hand',DASH),top=s.players[0].deck[0];
 attack(s,x.uid,foe.uid);
 assert.equal(s.decision.task.op,'g34_Break497');
 pick(s,s.players[1].shields[0].uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g14_DashDeclare');
 assert.deepEqual(s.players[0].shields.slice(-1).map(y=>[y.uid,!!y.faceUp]),[[top.uid,false]]);
 assert.equal(s.players[1].shields.length,4);
 pick(s,true);
 act(s,'extended',a=>s.decision.choices[a.choice].value!==null);
 drain(s);
 assert.ok(has(s,0,'battle',dash)&&has(s,1,'grave',foe));
});

test('Katsuking can break the last shield and expose the defending Oni-End declaration',()=>{
 const s=field(),x=put(s,0,'battle',KATSU);
 give(s,1,'shields',[JAOUMON]);
 const [shield]=s.players[1].shields;
 attack(s,x.uid);
 pick(s,shield.uid);
 assert.ok(has(s,1,'hand',shield));
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g3_Declare');
 pick(s,true);
 pick(s,true);
 assert.ok(has(s,1,'grave',shield));
 assert.equal(s.winner,null);
});

test('Katsuking keeps its queued effect break after changing into Ebikatsu',()=>{
 const s=field(),x=put(s,0,'battle',KATSU),ebi=put(s,0,'hand',EBI);
 const foe=put(s,1,'battle',NATURE,{tapped:true}),shield=s.players[1].shields[0];
 attack(s,x.uid,foe.uid);
 pick(s,true);
 act(s,'orderEffect',a=>a.uid===ebi.uid);
 pick(s,x.uid);
 assert.ok(has(s,0,'hand',x)&&has(s,0,'battle',ebi));
 assert.equal(s.decision.task.op,'g34_Break497');
 pick(s,shield.uid);
 drain(s);
 assert.equal(s.players[0].shields.length,6);
 assert.equal(s.players[1].shields.length,4);
});

for(const id of [NATURE,FIRE])test('Ebikatsu changes from the printed civilization, including a low-cost non-Dragon '+id,()=>{
 const s=field(),a=put(s,0,'battle',id),x=put(s,0,'hand',EBI);
 change(s,a);
 drain(s);
 assert.ok(has(s,0,'hand',a)&&has(s,0,'battle',x));
 assert.equal(s.players[1].shields.length,4);
});

test('Ebikatsu allows multicolor attacks, and opposing Red Zone can bypass the restriction',()=>{
 const s=field(),ebi=put(s,1,'battle',EBI,{tapped:true});
 const mono=put(s,0,'battle',FIRE),none=put(s,0,'battle',COLORLESS),multi=put(s,0,'battle',MULTI);
 s.phase='attack';
 const can=x=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===ebi.uid);
 assert.ok(!can(mono)&&!can(none)&&can(multi));
 put(s,0,'battle',RED_ZONE);
 assert.ok(can(mono)&&can(none));
});

test('Boot Camp chooses only one ally and expires power at next own start, extra break at turn end',()=>{
 const s=field(),x=put(s,0,'battle',NATURE),other=put(s,0,'battle',NATURE);
 put(s,1,'battle',NATURE);
 const spell=play(s,PIYO);
 assert.deepEqual(s.decision.choices.map(value),[x.uid,other.uid]);
 pick(s,x.uid);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(e.power(x,false,s),7000);
 assert.equal(e.power(other,false,s),2000);
 attack(s,x.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 end(s);
 assert.equal(s.active,1);
 assert.equal(e.power(x,false,s),7000);
 assert.equal(e.effectiveCard(x,s).extraBreak??0,0);
 end(s);
 assert.equal(s.active,0);
 assert.equal(e.power(x,false,s),2000);
});

test('Boot Camp adds a shield to each Katsuking effect and combat break',()=>{
 const s=field(),x=put(s,0,'battle',KATSU);
 play(s,PIYO);
 pick(s,x.uid);
 attack(s,x.uid);
 assert.equal(s.decision.task.op,'g34_Break497');
 pick(s,s.players[1].shields[0].uid);
 pick(s,s.players[1].shields[1].uid);
 assert.equal(s.players[1].shields.length,3);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[0].shields.length,6);
});
