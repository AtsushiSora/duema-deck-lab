import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const NASU='dmrp13-080',FLOWER='dmrp09-056',NITRO='dmr17-049',YAP='dm24ex1-040';
const NATURE='dm01-108',DARK='dm01-090',FIRE='dm01-097',SEED='dmrp22-048';
const REPLACEMENT='dm22ex1-086',MULTI='dm24ex4-038',TRIGGER='dm23-051',COMPLEX='dm23rp4-S02';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

function add(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function shieldAttack(s,attacker){
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
}
function sonicCommandCount(s,x){
 return e.effectiveCard(x,s).race.split('/').filter(r=>r==='ソニック・コマンド').length;
}

test('Four official prints have one supported canonical ID, the verified image, and no deck limits',()=>{
 const manifest=read('tools/support-phase-1046.json');
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[NASU,FLOWER,NITRO,YAP]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.equal(catalogue.get(row.id).id,row.id);
  assert.ok(catalogue.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1046}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
});

test('Fashion Nasuo ramps and then requires one mana card on its own entry and an allied dark creature entry',()=>{
 const s=field(),nasu=add(s,0,'hand',NASU),dark=add(s,0,'hand',DARK);
 const nature=add(s,0,'hand',NATURE),seed=add(s,0,'hand',REPLACEMENT);
 const enemy=add(s,1,'hand',DARK),all=physical(s);
 const mana=s.players[0].mana.length;
 for(const x of [nasu,dark]){
  const top=s.players[0].deck[0];
  play(s,x);
  assert.ok(has(s,0,'mana',top));
  assert.ok(choices(s).includes(top.uid)&&!choices(s).includes(null));
  pick(s,top.uid);
  assert.ok(has(s,0,'grave',top));
  assert.equal(s.players[0].mana.length,mana);
 }
 const top=s.players[0].deck[0];
 play(s,nature);
 play(s,seed);
 s.active=1;
 play(s,enemy);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0],top);
 assert.deepEqual(physical(s),all);
});

test('Fashion Nasuo still moves existing mana to the grave after an opponent redirects the ramp',()=>{
 const s=field(),nasu=add(s,0,'hand',NASU);
 add(s,1,'battle',REPLACEMENT);
 const top=s.players[0].deck[0],mana=s.players[0].mana[0],all=physical(s);
 play(s,nasu);
 assert.ok(has(s,0,'grave',top)&&!choices(s).includes(top.uid));
 pick(s,mana.uid);
 assert.ok(has(s,0,'grave',mana));
 assert.deepEqual(physical(s),all);
});

test('Hanamida Don adds power and one shield per allied creature, with both effects expiring at turn end',()=>{
 const s=field(),flower=add(s,0,'hand',FLOWER);
 play(s,flower);
 assert.equal(e.power(flower,false,s),4000);
 flower.entered=s.turn-1;
 play(s,add(s,0,'hand',SEED));
 assert.equal(e.power(flower,false,s),4000);
 play(s,add(s,0,'hand',NATURE));
 play(s,add(s,0,'hand',FIRE));
 assert.equal(e.power(flower,false,s),12000);
 shieldAttack(s,flower);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(flower,false,s),4000);
 assert.ok(!s.extLimits.some(x=>x.kind==='g412ExtraBreak'&&x.ref.uid===flower.uid));
});

test('Nitro Air counts multicolor Fire allies, stacks power, adds the race once and expires at turn end',()=>{
 const s=field(),nitro=add(s,0,'hand',NITRO);
 play(s,nitro);
 play(s,add(s,0,'hand',NATURE));
 assert.equal(e.power(nitro,false,s),3000);
 assert.equal(sonicCommandCount(s,nitro),0);
 play(s,add(s,0,'hand',FIRE));
 assert.equal(e.power(nitro,false,s),5000);
 assert.equal(sonicCommandCount(s,nitro),1);
 play(s,add(s,0,'hand',MULTI));
 drain(s);
 assert.equal(e.power(nitro,false,s),7000);
 assert.equal(sonicCommandCount(s,nitro),1);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(nitro,false,s),3000);
 assert.equal(sonicCommandCount(s,nitro),0);
});

test('Both watchers can trigger from an allied Fire shield trigger during the opponent’s turn',()=>{
 const s=Object.assign(field(),{active:1});
 const flower=add(s,0,'battle',FLOWER),nitro=add(s,0,'battle',NITRO);
 give(s,0,'shields',[TRIGGER,NATURE]);
 const trigger=s.players[0].shields[0];
 shieldAttack(s,add(s,1,'battle',FIRE));
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 drain(s);
 assert.ok(has(s,0,'battle',trigger));
 assert.equal(e.power(flower,false,s),8000);
 assert.equal(e.power(nitro,false,s),5000);
 assert.equal(sonicCommandCount(s,nitro),1);
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(flower,false,s),4000);
 assert.equal(e.power(nitro,false,s),3000);
 assert.equal(sonicCommandCount(s,nitro),0);
});

test('Yappupp destroys an allied element first, then both choices resolve together after a save and restore',()=>{
 let s=field();
 const yap=add(s,0,'hand',YAP),first=add(s,0,'battle',SEED),second=add(s,0,'battle',NATURE);
 const enemy=add(s,1,'battle',REPLACEMENT),all=physical(s);
 play(s,yap);
 assert.ok(choices(s).includes(first.uid)&&!choices(s).includes(enemy.uid));
 pick(s,first.uid);
 assert.ok(has(s,0,'grave',first));
 assert.equal(s.decision.player,0);
 pick(s,second.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[enemy.uid]);
 assert.ok(has(s,0,'battle',second)&&has(s,1,'battle',enemy));
 s=decodeBattleData(encodeBattleData(s));
 pick(s,enemy.uid);
 assert.ok(has(s,0,'grave',second)&&has(s,1,'grave',enemy)&&has(s,0,'battle',yap));
 assert.deepEqual(physical(s),all);
 const source=s.players[0].battle.find(x=>x.uid===yap.uid);
 source.entered=s.turn-1;
 shieldAttack(s,source);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Yappupp can destroy itself first and the opponent still chooses when no allied elements remain',()=>{
 const s=field(),yap=add(s,0,'hand',YAP),enemy=add(s,1,'battle',NATURE);
 play(s,yap);
 pick(s,yap.uid);
 assert.equal(s.decision.player,1);
 pick(s,enemy.uid);
 assert.ok(has(s,0,'grave',yap)&&has(s,1,'grave',enemy));
});

test('Yappupp can select the same immovable Complex in both separate instructions',()=>{
 const s=field(),yap=add(s,0,'hand',YAP),complex=add(s,0,'battle',COMPLEX);
 play(s,yap);
 pick(s,complex.uid);
 assert.ok(has(s,0,'battle',complex)&&choices(s).includes(complex.uid));
 pick(s,complex.uid);
 assert.ok(has(s,0,'battle',complex)&&has(s,0,'battle',yap));
 assert.equal(s.decision,null);
});
