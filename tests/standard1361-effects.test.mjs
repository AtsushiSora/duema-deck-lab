import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const WEAPON='dmr13-045',ROZIA='dmr16s-007',LINKWOOD='dmbd14-015';
const JASHIN='dm22sd1-001',GALAXY='dm28-002',GEAR='dm16-019',AURA='dmrp11-m02';
const DARK='dm01-090',LIGHT='dm01-075',FIRE='dm01-097',NATURE='dm01-108';
const PSYCHIC='dmr01-053',DEMON='dm01-027';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1361.json',import.meta.url)));

function table(){
 const s=setup();
 s.format='advance';
 s.turn=3;
 return s;
}
function add(s,p,zone,id){const x=inst(id);s.players[p][zone].push(x);return x;}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,uid)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===uid);
const options=s=>s.decision?.choices?.map(x=>x.value)??[];
const end=s=>{act(s,'toAttack');act(s,'endTurn');};
function arm(s,host){
 const weapon=add(s,0,'extra',WEAPON),spell=add(s,0,'hand',LINKWOOD);
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 pick(s,host.uid);
 assert.deepEqual(options(s),[weapon.uid]);
 pick(s,weapon.uid);
 return weapon;
}

test('three canonical cards and nine official alternate prints retain one definition each',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const row of manifest.cards){
  assert.deepEqual(details.cards.find(c=>c.id===row.id).faces,row.faces);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1361}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  for(const i of row.faces.keys()){
   const changed=structuredClone(row);
   changed.faces[i].abilityText+='\n未対応の能力';
   assert.throws(()=>standardCardSpec({...changed,status:'complete'},{phase:1361}));
  }
 }
 for(const row of manifest.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1361}),row.spec);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:1}]),[{id:row.canonicalId,count:2}]);
 }
});

test('the weapon starts as one Advance extra card and cannot enter a main deck',()=>{
 const a={...PRESETS[0],format:'advance',extraCards:[{id:WEAPON,count:1}]},b={...PRESETS[1],format:'advance'};
 const s=e.createGame([a,b]);
 assert.equal(e.card(s.players[0].extra[0]).type,'weapon');
 assert.equal(e.card(WEAPON).manaValue,0);
 assert.ok(e.validateDeck({...a,format:'original'}).length);
 assert.ok(e.validateDeck({...a,cards:[...a.cards.slice(1),{id:WEAPON,count:a.cards[0].count}]}).length);
});

test('Rozia uses its entry ability and never selects a Psychic as a Dragheart',()=>{
 const s=table(),weapon=add(s,0,'extra',WEAPON),psychic=add(s,0,'extra',PSYCHIC);
 cast(s,ROZIA);
 const rozia=s.players[0].battle.find(x=>x.cardId===ROZIA);
 assert.deepEqual(options(s),[weapon.uid]);
 pick(s,weapon.uid);
 assert.ok(has(s,0,'extra',psychic));
 assert.deepEqual(weapon.weaponTo,{uid:rozia.uid,incarnation:rozia.incarnation});
 assert.equal(rozia.under,undefined);
 assert.ok(e.effectiveCard(rozia,s).blocker);
});

test('Rozia grants Shield Saver only at five Light mana and the Galaxy is destroyed while Shield Force would protect it (QA40375)',()=>{
 let s=table();give(s,0,'mana',Array(7).fill(LIGHT));
 cast(s,ROZIA);
 for(const x of s.players[0].mana)x.tapped=false;
 cast(s,GALAXY);
 const shield=s.players[0].shields[0];
 pick(s,shield.uid);
 const galaxy=s.players[0].battle.find(x=>x.cardId===GALAXY);
 const dark=add(s,0,'battle',DARK);
 assert.ok(e.effectiveCard(galaxy,s).g1304ShieldForceActive);
 give(s,0,'mana',Array(4).fill(LIGHT));
 assert.deepEqual(e.shieldSaverSources(s,0),[]);
 add(s,0,'mana',LIGHT);
 assert.ok(e.shieldSaverSources(s,0).includes(galaxy));
 assert.ok(!e.shieldSaverSources(s,0).includes(dark));
 const attacker=add(s,1,'battle',FIRE);
 s.active=1;attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'shieldGuard');
 s=JSON.parse(JSON.stringify(s));
 act(s,'saveShield',a=>a.uid===galaxy.uid&&a.shield===shield.uid);
 if(s.decision?.type==='shieldGuard')act(s,'finishShieldGuards');
 assert.ok(has(s,0,'grave',galaxy));
 assert.ok(has(s,0,'shields',shield));
 assert.equal(s.players[0].shields.length,5);
});

test('Linkwood reveals one card and takes a Dragon or Draguner on its creature face',()=>{
 for(const [id,taken] of [[ROZIA,true],['dm06-s08',true],[DARK,false]]){
  const s=table(),top=inst(id);s.players[0].deck.unshift(top);
  const link=add(s,0,'hand',LINKWOOD);
  act(s,'play',a=>a.uid===link.uid&&!a.face);
  assert.equal(has(s,0,'hand',top),taken);
  assert.ok(s.log.some(l=>l.type==='reveal'&&l.cardId===LINKWOOD&&l.text.includes(e.card(id).name)));
  assert.equal(s.players[0].deck[0]===top,!taken);
 }
});

test('Linkwood requires a matching mana civilization for its spell',()=>{
 const s=table();give(s,0,'mana',Array(4).fill(FIRE));
 const host=add(s,0,'battle',DARK),weapon=add(s,0,'extra',WEAPON),link=add(s,0,'hand',LINKWOOD);
 act(s,'play',a=>a.uid===link.uid&&a.face===1);
 pick(s,host.uid);
 assert.ok(has(s,0,'extra',weapon));
 assert.ok(!e.effectiveCard(host,s).blocker);
});

test('Jashin loses the weapon and Aura when another Darkness creature leaves, while its gear remains (QA48115)',()=>{
 const s=table(),jashin=add(s,0,'battle',JASHIN),gear=add(s,0,'battle',GEAR);
 const [victim]=[0,1,2].map(()=>add(s,0,'battle',DARK));
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===jashin.uid);
 const weapon=arm(s,jashin);
 const aura=add(s,0,'battle',AURA);
 // The official question starts with an Aura already attached to the eligible creature.
 aura.auraTo1352={uid:jashin.uid,incarnation:jashin.incarnation||0};
 s.players[0].hasAuras1352=true;
 assert.ok(e.isCreature(s,jashin));
 assert.ok(e.effectiveCard(jashin,s).blocker);
 s.active=1;cast(s,DEMON);act(s,'effect',a=>a.targets[0].uid===victim.uid);
 assert.ok(has(s,0,'battle',jashin)&&!e.isCreature(s,jashin));
 assert.ok(has(s,0,'battle',gear)&&!gear.crossedTo);
 assert.ok(has(s,0,'grave',aura)&&!aura.auraTo1352);
 assert.ok(has(s,0,'extra',weapon)&&!weapon.weaponTo);
 assert.ok(s.log.some(l=>l.type==='leave'&&l.cardId===WEAPON&&l.text?.includes('墓地')));
 assert.ok(s.log.some(l=>l.type==='dragheartReturn'&&l.cardId===WEAPON));
});

test('Ultovelia flips in place when its host is tapped and returns front side up when removed',()=>{
 let s=table();const host=add(s,0,'battle',DARK),weapon=arm(s,host);
 assert.ok(e.effectiveCard(host,s).blocker);
 host.tapped=true;
 s=JSON.parse(JSON.stringify(s));
 end(s);
 const found=s.players[0].battle.find(y=>y.uid===weapon.uid);
 assert.equal(e.card(found).name,'神光の精霊龍 ウルティマリア');
 assert.equal(e.effectiveCard(found,s).power,7500);
 assert.ok(e.effectiveCard(found,s).blocker&&e.effectiveCard(found,s).noPlayerAttack);
 assert.ok(!found.tapped&&!found.weaponTo);
 assert.ok(!e.effectiveCard(s.players[0].battle.find(y=>y.uid===host.uid),s).blocker);
 s.active=1;s.phase='main';cast(s,DEMON);act(s,'effect',a=>a.targets[0].uid===weapon.uid);
 const returned=s.players[0].extra.find(y=>y.uid===weapon.uid);
 assert.equal(e.card(returned).type,'weapon');
});

test('a sealed host keeps the weapon but cannot satisfy its tapped condition (QA42077 and QA45080)',()=>{
 const s=table(),host=add(s,0,'battle',DARK),weapon=arm(s,host);
 host.tapped=true;
 s.players[0].seals.push({...inst(NATURE),faceDown:true,sealOf:host.uid});
 end(s);
 assert.ok(host.sealed);
 assert.equal(e.card(weapon).type,'weapon');
 assert.ok(has(s,0,'battle',weapon)&&weapon.weaponTo?.uid===host.uid);
 assert.equal(e.abilitiesIgnored(s,weapon),false);
});

test('Tokoshie redirects the weapon entering from extra and it returns without equipping',()=>{
 const s=table(),weapon=add(s,0,'extra',WEAPON);
 add(s,1,'battle','dmrp17-025');
 cast(s,ROZIA);pick(s,weapon.uid);
 assert.ok(has(s,0,'extra',weapon));
 assert.ok(!s.players[0].battle.some(x=>x.cardId===WEAPON));
 assert.ok(!s.players[0].mana.some(x=>x.cardId===WEAPON));
 assert.ok(!weapon.weaponTo);
 assert.ok(!e.effectiveCard(s.players[0].battle[0],s).blocker);
});

test('an untapped host keeps its weapon through the end of the turn',()=>{
 const s=table(),host=add(s,0,'battle',DARK),weapon=arm(s,host);
 end(s);
 assert.equal(e.card(weapon).type,'weapon');
 assert.ok(has(s,0,'battle',weapon));
 assert.ok(e.effectiveCard(host,s).blocker);
});

test('Ulto checks its host when its end-step ability resolves (rule 603.4)',()=>{
 const s=table(),host=add(s,0,'battle',DARK),weapon=arm(s,host);
 const mugen=add(s,0,'battle','dmr23-s01');
 assert.equal(host.tapped,false);
 end(s);
 const choose=e.getLegalActions(s).find(x=>x.cardId===mugen.cardId);
 assert.ok(choose,JSON.stringify(s.decision));
 act(s,choose.kind,x=>x.id===choose.id);
 pick(s,host.uid);
 assert.equal(host.tapped,true);
 assert.equal(e.card(weapon).name,'神光の精霊龍 ウルティマリア');
});
