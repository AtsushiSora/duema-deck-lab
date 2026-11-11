import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
const NETA='dmrp15-093',GRU='dmrp15-070',ARROW='dmrp16-016';
const SMALL='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIGHT='dm01-075',DARK='dm01-090',BIG='dm05-s04',DRAW='dm06-085',DON='dmrp07-s10';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(24).fill(SMALL));return s;}
function add(s,p,z,id,props){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
const vals=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>typeof v==='function'?v(s.decision.choices[a.choice].value):vals(s)[a.choice]===(v?.uid??v));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:GRU,defs}];act(s,'toAttack');}
function free(s,p,x,origin='hand'){invoke(s,p,[{op:'Execute',origin,creatureOnly:true,max:20,optional:false}]);pick(s,v=>v?.uid===x.uid);drain(s);}
function deploy(s,p,x,origin='hand'){invoke(s,p,[{op:'Put',origin,target:x.uid}]);drain(s);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',SMALL,{sealOf:x.uid,faceDown:true});}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function cost(s,p,id){return e.summonCost(s,p,e.card(id));}
function attacks(s,x){s.phase='attack';return e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);}

test('Phase 896 verifies three complete original definitions, images and legal saved-deck IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-896.json',import.meta.url))),cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[NETA,GRU,ARROW]);assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:896}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:895}));const changed=structuredClone(d);changed.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(changed,{phase:896}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(row.verification.facesMatched);assert.equal(m.regulationVerification.limits[row.id],4);assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);assert.deepEqual(cat.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
 const deck={id:'phase896',name:'王国とワーム',cards:[NETA,GRU,ARROW,SMALL,WATER,FIRE,LIGHT,DARK,BIG,DRAW].map(id=>({id,count:4}))};assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);
});

for(const p of [0,1])test('Netanaraku counts its own summon and keeps creature and spell histories separate '+p,()=>{
 const s=field(p),source=play(s,NETA);drain(s);assert.equal(s.players[p].mana.filter(x=>x.tapped).length,2);
 assert.equal(cost(s,p,WATER),1);assert.equal(cost(s,p,DRAW),3);const before=s.players[p].mana.filter(x=>x.tapped).length;play(s,WATER);drain(s);assert.equal(s.players[p].mana.filter(x=>x.tapped).length,before+1);
 play(s,DRAW);drain(s);assert.equal(cost(s,p,DRAW),2);play(s,DRAW);drain(s);assert.equal(cost(s,p,DRAW),2);assert.ok(has(s,p,'battle',source));assert.equal(s.g463Summons[p].n,2);assert.equal(s.players[p].spellsThisTurn,2);
});

test('Netanaraku has no reduction on either first use, even when it entered without summoning',()=>{
 const s=field(),source=add(s,0,'hand',NETA);deploy(s,0,source);assert.equal(cost(s,0,WATER),2);assert.equal(cost(s,0,DRAW),3);
 const entry=add(s,0,'grave',WATER);deploy(s,0,entry,'grave');assert.equal(cost(s,0,WATER),2);play(s,DRAW);drain(s);assert.equal(cost(s,0,DRAW),2);assert.equal(cost(s,0,WATER),2);
});

test('Netanaraku counts prior summons and spells while absent, ignored or sealed',()=>{
 for(const mode of ['absent','ignored','sealed','genmu']){
  const s=field();let source=mode==='absent'?null:add(s,0,'battle',NETA),lock;
  if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed')seal(s,0,source);if(mode==='genmu')lock=add(s,1,'battle',GEN);
  play(s,WATER);drain(s);play(s,DRAW);drain(s);
  if(mode==='absent')source=add(s,0,'battle',NETA);if(mode==='ignored')delete source.g35Ignored;if(mode==='sealed'){source.sealed=false;s.players[0].seals=[];}if(lock){s.players[1].battle=[];s.players[1].grave.push(lock);}
  assert.equal(cost(s,0,WATER),1,mode);assert.equal(cost(s,0,DRAW),2,mode);
 }
});

test('Netanaraku stacks with other copies, respects cost one and a real reduction prohibition',()=>{
 const s=field();add(s,0,'battle',NETA);add(s,0,'battle',NETA);play(s,WATER);drain(s);play(s,DRAW);drain(s);assert.equal(cost(s,0,DRAW),1);assert.equal(cost(s,0,FIRE),1);
 add(s,1,'battle','dmrp22-027');assert.equal(cost(s,0,WATER),2);assert.equal(cost(s,0,DRAW),3);
});

test('Netanaraku records free summons from each zone and summons whose entry is replaced',()=>{
 for(const origin of ['hand','mana','grave']){
  const s=field();add(s,0,'battle',NETA);const x=add(s,0,origin,LIGHT);free(s,0,x,origin);assert.equal(cost(s,0,WATER),1);assert.equal(cost(s,0,DRAW),3);
 }
 const s=field();add(s,0,'battle',NETA);add(s,1,'battle','dm22rp1-049');give(s,0,'mana',[]);const x=add(s,0,'hand',LIGHT);free(s,0,x);assert.ok(has(s,0,'mana',x));assert.equal(cost(s,0,WATER),1);
});

test('Netanaraku excludes seeds and gear uses and counts the actual twinpact face',()=>{
 const s=field();add(s,0,'battle',NETA);play(s,'dmsd20-016');drain(s);assert.equal(cost(s,0,WATER),2);assert.equal(cost(s,0,DRAW),3);
 const x=add(s,0,'hand','dm22ex1-059');s.phase='main';act(s,'play',a=>a.uid===x.uid&&a.face===1);drain(s);assert.equal(cost(s,0,WATER),2);assert.equal(cost(s,0,DRAW),2);
 const y=add(s,0,'hand','dm22ex1-059');s.phase='main';act(s,'play',a=>a.uid===y.uid&&!a.face&&!a.alternative);drain(s);assert.equal(cost(s,0,WATER),1);assert.equal(s.players[0].spellsThisTurn,1);
});

test('Netanaraku only reduces its owner and resets both histories at each turn boundary through JSON',()=>{
 let s=field();add(s,0,'battle',NETA);play(s,LIGHT);drain(s);play(s,DRAW);drain(s);s=JSON.parse(JSON.stringify(s));assert.equal(cost(s,0,WATER),1);assert.equal(cost(s,0,DRAW),2);
 end(s);assert.equal(cost(s,0,WATER),2);assert.equal(cost(s,0,DRAW),3);assert.equal(cost(s,1,WATER),2);assert.equal(cost(s,1,DRAW),3);
 const x=add(s,0,'hand',WATER);free(s,0,x);assert.equal(cost(s,0,WATER),1);assert.equal(cost(s,0,DRAW),3);end(s);assert.equal(cost(s,0,WATER),2);
});

test('Netanaraku costs and AI are pure and independent of hidden enemy cards',()=>{
 const s=field();add(s,0,'battle',NETA);play(s,WATER);drain(s);play(s,DRAW);drain(s);give(s,0,'hand',[WATER,DRAW]);const before=JSON.stringify(s),a=e.chooseAI(s);e.analyzeAI(s);assert.equal(JSON.stringify(s),before);const t=JSON.parse(before);for(const z of ['hand','deck','shields'])t.players[1][z].forEach(x=>x.cardId=BIG);assert.deepEqual(e.chooseAI(t),a);
});

for(const p of [0,1])test('Grulje mills two on entry and revives all own matching grave creatures at its end step '+p,()=>{
 let s=field(p),one=add(s,p,'grave',GRU),two=add(s,p,'grave',GRU),other=add(s,p,'grave',WATER),opposing=add(s,1-p,'grave',GRU),before=ids(s),source=play(s,GRU);drain(s);
 assert.equal(s.players[p].deck.length,22);s.phase='attack';act(s,'endTurn');assert.equal(s.decision.task.op,'g34_Select');assert.deepEqual(new Set(vals(s)),new Set([one.uid,two.uid]));s=JSON.parse(JSON.stringify(s));pick(s,one);pick(s,two);drain(s);
 assert.ok([one,two,source].every(x=>has(s,p,'battle',x)));assert.ok(has(s,p,'grave',other)&&has(s,1-p,'grave',opposing));assert.equal(s.players[p].deck.length,18);assert.deepEqual(ids(s),[...before,source.uid].sort());
});

test('Grulje does not revive newly milled copies in the same resolution or retrigger their end ability',()=>{
 const s=field(),source=add(s,0,'battle',GRU),first=add(s,0,'grave',GRU);give(s,0,'deck',[GRU,SMALL,...Array(18).fill(SMALL)]);const newCopy=s.players[0].deck[0];end(s);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'battle',source));assert.ok(has(s,0,'grave',newCopy));assert.equal(s.players[0].deck.length,18);
});

test('Grulje rechecks the original source after queuing, including every source departing (QA34237)',()=>{
 for(const mode of ['allLeft','newIncarnation','sealed']){
  let s=field(),a=add(s,0,'battle',GRU),b=add(s,0,'battle',GRU),grave=add(s,0,'grave',GRU);s.phase='attack';act(s,'endTurn');assert.equal(s.decision.type,'effectOrder');
  if(mode==='allLeft'){s.players[0].battle=[];s.players[0].grave.push(a,b);}else if(mode==='newIncarnation'){a.incarnation=1;b.incarnation=1;}else{seal(s,0,a);seal(s,0,b);}
  s=JSON.parse(JSON.stringify(s));drain(s);assert.ok(has(s,0,'grave',grave));assert.equal(s.players[0].deck.length,24);
 }
});

test('Grulje can resolve one surviving source after another left, and each original source resolves independently',()=>{
 const s=field(),a=add(s,0,'battle',GRU),b=add(s,0,'battle',GRU),first=add(s,0,'grave',GRU);give(s,0,'deck',[GRU,SMALL,...Array(18).fill(SMALL)]);const milled=s.players[0].deck[0];s.phase='attack';act(s,'endTurn');act(s,'orderEffect',x=>x.uid===a.uid);pick(s,first);act(s,'orderEffect',x=>x.uid===first.uid);drain(s);
 assert.ok([a,b,first,milled].every(x=>has(s,0,'battle',x)));assert.equal(s.players[0].deck.length,16);
 const t=field(),left=add(t,0,'battle',GRU),live=add(t,0,'battle',GRU),revive=add(t,0,'grave',GRU);t.phase='attack';act(t,'endTurn');t.players[0].grave.push(t.players[0].battle.shift());drain(t);assert.ok([left,live,revive].every(x=>has(t,0,'battle',x)));
});

test('Grulje observes grave movement and entry prohibitions without summoning the returned creatures',()=>{
 for(const mode of ['grave','entry']){
  const s=field();add(s,0,'battle',GRU);const x=add(s,0,'grave',GRU);
  if(mode==='grave')add(s,1,'battle','dmrp22-042');else invoke(s,1,[{op:'Lock',limit:{kind:'entryCost',player:0,max:4}}]);end(s);
  assert.ok(has(s,0,'grave',x));assert.equal(s.g463Summons?.[0]?.n||0,0);
 }
 const t=field();add(t,0,'battle',GRU);add(t,0,'grave',GRU);add(t,1,'battle','dm22rp2-016');end(t);assert.equal(t.g463Summons?.[0]?.n||0,0);assert.equal(t.players[0].deck.length,22);assert.ok(t.players[0].grave.some(x=>x.cardId===GRU));
});

test('Grulje suppressed sources do not revive, GG only suppresses entry mill, and empty graves are harmless',()=>{
 for(const mode of ['ignored','sealed','genmu','opponentTurn','empty','gg']){
  const s=field(mode==='opponentTurn'?1:0),source=add(s,0,'battle',GRU),x=mode==='empty'?null:add(s,0,'grave',GRU);
  if(mode==='ignored')source.g35Ignored=s.turn;if(mode==='sealed')seal(s,0,source);if(mode==='genmu')add(s,1,'battle',GEN);if(mode==='gg')add(s,1,'battle',GG).under=[inst(SMALL)];end(s);
  if(x)assert.equal(has(s,0,'battle',x),mode==='gg',mode);assert.equal(s.players[0].deck.length,mode==='opponentTurn'?23:24,mode);
 }
});

test('Grulje mandatory mill can empty the library on entry',()=>{
 const s=field();give(s,0,'deck',[WATER,SMALL]);play(s,GRU);assert.equal(s.winner,1);assert.equal(s.players[0].deck.length,0);
});

for(const p of [0,1])test('Arrow directs attacks toward its controller without requiring an attack '+p,()=>{
 const s=field(p),attacker=add(s,p,'battle',BIG),worm=add(s,1-p,'battle',ARROW,{tapped:true});add(s,1-p,'battle',SMALL,{tapped:true});assert.deepEqual(attacks(s,attacker),['player']);assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 let t=JSON.parse(JSON.stringify(s));attack(t,attacker.uid);act(t,'noBlock');drain(t);assert.equal(t.players[1-p].shields.length,2);assert.ok(has(t,1-p,'battle',worm));
});

test('Arrow and tapped Don Jungle allow either compulsory target, never an unrelated creature (QA39086)',()=>{
 const s=field(),attacker=add(s,0,'battle',BIG),don=add(s,1,'battle',DON,{tapped:true});add(s,1,'battle',ARROW);add(s,1,'battle',SMALL,{tapped:true});assert.deepEqual(new Set(attacks(s,attacker)),new Set(['player',don.uid]));assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});

test('Arrow cannot grant a prohibited player attack, so legal creature attacks remain available (QA39085 principle)',()=>{
 const s=field(),a=add(s,0,'battle',BIG),worm=add(s,1,'battle',ARROW,{tapped:true}),other=add(s,1,'battle',SMALL,{tapped:true});invoke(s,0,[{op:'Target',owner:'self',grant:{noPlayerAttack:true}}]);pick(s,a);assert.deepEqual(new Set(attacks(s,a)),new Set([worm.uid,other.uid]));assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});

test('Arrow does not force an illegal creature attack or permit a summoning-sick creature to attack',()=>{
 const s=field(),noPlayer=add(s,0,'battle','dm01-076'),worm=add(s,1,'battle',ARROW,{tapped:true});assert.deepEqual(attacks(s,noPlayer),[worm.uid]);
 const fresh=add(s,0,'battle',SMALL,{entered:s.turn});assert.deepEqual(attacks(s,fresh),[]);
});

test('Arrow stops constraining targets when ignored, sealed, absent, or on the attacking side',()=>{
 for(const mode of ['ignored','sealed','genmu','left','own']){
  const s=field(),a=add(s,0,'battle',BIG),worm=add(s,mode==='own'?0:1,'battle',ARROW,{tapped:true}),other=add(s,1,'battle',SMALL,{tapped:true});
  if(mode==='ignored')worm.g35Ignored=s.turn;if(mode==='sealed')seal(s,1,worm);if(mode==='genmu')add(s,0,'battle',GEN);if(mode==='left')s.players[1].grave.push(s.players[1].battle.shift());
  assert.ok(attacks(s,a).includes(other.uid),mode);assert.ok(attacks(s,a).includes('player'),mode);
 }
});

test('Arrow updates attack targets immediately on source arrival and departure through JSON',()=>{
 let s=field(),a=add(s,0,'battle',BIG),other=add(s,1,'battle',SMALL,{tapped:true});assert.ok(attacks(s,a).includes(other.uid));const worm=add(s,1,'hand',ARROW);deploy(s,1,worm);assert.deepEqual(attacks(s,a),['player']);s=JSON.parse(JSON.stringify(s));s.players[1].grave.push(s.players[1].battle.splice(s.players[1].battle.findIndex(x=>x.uid===worm.uid),1)[0]);assert.ok(attacks(s,a).includes(other.uid));
});

test('Grulje already queued end ability survives ability ignoring while the original unit still exists',()=>{
 const s=field(),a=add(s,0,'battle',GRU),b=add(s,0,'battle',GRU),x=add(s,0,'grave',GRU);s.phase='attack';act(s,'endTurn');a.g35Ignored=b.g35Ignored=s.turn;drain(s);assert.ok(has(s,0,'battle',x));assert.equal(s.players[0].deck.length,22);
});

test('Grulje end ability follows its source underneath an evolution of the same physical unit',()=>{
 const s=field(),a=add(s,0,'battle',GRU),b=add(s,0,'battle',GRU),x=add(s,0,'grave',GRU);s.phase='attack';act(s,'endTurn');const top=inst(BIG);top.under=[a];s.players[0].battle[0]=top;s.players[0].grave.push(s.players[0].battle.pop());drain(s);assert.ok(has(s,0,'battle',x)&&has(s,0,'battle',b));assert.ok(s.players[0].battle.includes(top));
});

test('Arrow preserves the separate obligation of a creature that must attack the player',()=>{
 const s=field(),attacker=add(s,0,'battle','dmrp16-094');add(s,1,'battle',ARROW);assert.deepEqual(attacks(s,attacker),['player']);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});
