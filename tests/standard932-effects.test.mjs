import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BLADE='dm16-014',REPRINT='dmc42-028',JET='dm16-017',FOREST='dm16-019';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const SLAYER='dm01-088',BOUNCE='dm01-086',APUL='dmrp22-042',GENMU='dmrp15-km1',ACE='dm22rp2-S8';
const THREE='dm15-048',ZERO='dmex08-174',FUSHA='dmex10-035',ZERORUPIA='dmx13-034',LARKAN='dmrp01-058';

const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const picks=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===(v?.uid??v));
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}


const attack=(s,x,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));};
const cross=(s,g,x)=>act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid);


test('Phase 932 supports three complete card definitions and resolves the Immortal Blade reprint to the original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-932.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[BLADE,JET,FOREST]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[REPRINT,BLADE]]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:932}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:932}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   ['gear',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.deepEqual(row.faces,original.faces);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase932',name:'クロスギア3種の検証',cards:[REPRINT,JET,FOREST,LIGHT,WATER,DARK,FIRE,NATURE,BOUNCE,SLAYER].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Immortal Blade grants Slayer to both sides, stacks with printed Slayer and resolves an actual battle',()=>{
 const s=field(),small=put(s,0,'battle',FIRE),large=put(s,1,'battle',APUL,{tapped:true});
 const native=put(s,0,'battle',SLAYER),own=play(s,BLADE),enemy=put(s,1,'battle',BLADE);
 assert.equal(e.effectiveCard(small,s).g208SlayerCount,2);
 assert.equal(e.effectiveCard(large,s).g208SlayerCount,2);
 assert.equal(e.effectiveCard(native,s).g208SlayerCount,3);
 enemy.g35Ignored=s.turn;
 assert.equal(e.effectiveCard(native,s).g208SlayerCount,2);
 cross(s,own,native);
 assert.equal(e.effectiveCard(large,s).slayer,undefined);
 assert.equal(e.effectiveCard(native,s).slayer,true);
 delete enemy.g35Ignored;
 small.g35Ignored=s.turn;
 assert.equal(e.effectiveCard(small,s).slayer,undefined);
 delete small.g35Ignored;
 attack(s,small,large);
 drain(s);
 assert.ok(find(s,0,'grave',small)&&find(s,1,'grave',large));
 assert.ok(find(s,1,'battle',enemy));
});

test('Immortal Blade recovers only a creature from its controller’s graveyard, before battle, even if the host is muted',()=>{
 let s=field();
 const host=put(s,0,'battle',FIRE),other=put(s,1,'battle',DARK,{tapped:true});
 const gear=play(s,BLADE);cross(s,gear,host);
 const unit=put(s,0,'grave',NATURE),spell=put(s,0,'grave',BOUNCE),enemyCard=put(s,1,'grave',NATURE);
 host.g35Ignored=s.turn;
 const all=physical(s);
 attack(s,host,other);
 assert.equal(s.decision.source,BLADE);
 assert.deepEqual(picks(s),[unit.uid,null]);
 s=restore(s);pick(s,unit);
 assert.ok(find(s,0,'hand',unit)&&find(s,0,'grave',spell)&&find(s,1,'grave',enemyCard));
 drain(s);
 assert.deepEqual(physical(s),all);
 assert.equal(find(s,0,'battle',gear).crossedTo,undefined);
 assert.equal(e.effectiveCard(put(s,1,'battle',NATURE),s).slayer,true);
});

test('Immortal Blade offers a decline and respects grave locks and ability suppression on the gear',()=>{
 for(const mode of ['decline','locked','muted']){
  const s=field(),host=put(s,0,'battle',FIRE),gear=play(s,BLADE),unit=put(s,0,'grave',NATURE);
  cross(s,gear,host);
  if(mode==='locked')put(s,1,'battle',APUL);
  if(mode==='muted')gear.g35Ignored=s.turn;
  attack(s,host);
  if(mode==='decline'){assert.deepEqual(picks(s),[unit.uid,null]);pick(s,null);}
  else assert.notEqual(s.decision?.source,BLADE);
  drain(s);
  assert.ok(find(s,0,'grave',unit),mode);
 }
});

test('Sky Jet lets newly entered creatures attack on either side, until crossed or ignored',()=>{
 const s=field(),gear=play(s,JET);
 const hosts=[put(s,0,'battle',FIRE,{entered:s.turn}),put(s,1,'battle',DARK,{entered:s.turn})];
 const canAttack=p=>{s.active=p;s.phase='attack';return legal(s,'attack',a=>a.uid===hosts[p].uid&&a.target==='player');};
 assert.ok(canAttack(0)&&canAttack(1));
 gear.g35Ignored=s.turn;
 assert.ok(!canAttack(0)&&!canAttack(1));
 delete gear.g35Ignored;
 s.active=0;s.phase='main';cross(s,gear,hosts[0]);
 assert.ok(!canAttack(0)&&!canAttack(1));
 assert.equal(e.power(hosts[0],true,s),6000);
});

test('Sky Jet stacks Power Attacker on the crossed creature, only while attacking and able to use the granted ability',()=>{
 const s=field(),host=put(s,0,'battle',FIRE),other=put(s,1,'battle',APUL,{tapped:true});
 const a=play(s,JET),b=play(s,JET);cross(s,a,host);cross(s,b,host);
 assert.equal(e.power(host,false,s),2000);
 assert.equal(e.power(host,true,s),10000);
 assert.equal(e.power(other,true,s),3000);
 const mute=put(s,1,'battle',GENMU);
 assert.equal(e.power(host,true,s),2000);
 s.players[1].battle.splice(s.players[1].battle.indexOf(mute),1);
 attack(s,host,other);drain(s);
 assert.ok(find(s,0,'battle',host)&&find(s,1,'grave',other));
});

test('Sky Jet does not restore haste while its crossed host is sealed, and Genmu ignores the haste grant',()=>{
 const s=field(),gear=play(s,JET),host=put(s,0,'battle',FIRE),fresh=put(s,0,'battle',DARK,{entered:s.turn});
 const mute=put(s,1,'battle',GENMU);
 assert.equal(e.effectiveCard(fresh,s).speedAttacker,undefined);
 s.players[1].battle.splice(s.players[1].battle.indexOf(mute),1);
 assert.equal(e.effectiveCard(fresh,s).speedAttacker,true);
 cross(s,gear,host);
 put(s,0,'seals',NATURE,{sealOf:host.uid,faceDown:true});host.sealed=true;
 s.phase='attack';
 assert.ok(!legal(s,'attack',a=>a.uid===fresh.uid));
 assert.equal(find(s,0,'battle',gear).crossedTo.uid,host.uid);
 assert.equal(e.effectiveCard(fresh,s).speedAttacker,undefined);
});

test('Mobile Forest discounts only its controller’s creature summons, down to one mana including printed zero',()=>{
 const s=field(),a=play(s,FOREST),b=play(s,FOREST),host=put(s,0,'battle',FIRE);
 assert.equal(e.summonCost(s,0,e.card(DARK)),1);
 assert.equal(e.summonCost(s,0,e.card(THREE)),1);
 a.g35Ignored=s.turn;
 assert.equal(e.summonCost(s,0,e.card(THREE)),2);
 delete a.g35Ignored;
 assert.equal(e.summonCost(s,0,e.card(ZERO)),1);
 assert.equal(e.summonCost(s,0,e.card(FUSHA)),1);
 assert.equal(e.summonCost(s,1,e.card(DARK)),2);
 assert.equal(e.summonCost(s,0,e.card(BOUNCE)),2);
 assert.equal(e.summonCost(s,0,e.card(FOREST)),4);
 assert.equal(e.getLegalActions(s).find(x=>x.kind==='crossGear'&&x.uid===a.uid).cost,4);
 const tapped=()=>s.players[0].mana.filter(x=>x.tapped).length;
 let before=tapped();play(s,NATURE);assert.equal(tapped()-before,1);
 cross(s,a,host);
 assert.equal(e.summonCost(s,0,e.card(THREE)),2);
 cross(s,b,host);
 assert.equal(e.summonCost(s,0,e.card(DARK)),2);
 assert.equal(e.summonCost(s,0,e.card(ZERO)),0);
 assert.equal(e.summonCost(s,0,e.card(FUSHA)),0);
 assert.equal(e.power(host,false,s),8000);
});

test('Mobile Forest enforces its minimum with Zero Lupia and adds external power even if the host is ignored',()=>{
 const s=field(),gear=play(s,FOREST),host=put(s,0,'battle',FIRE);
 put(s,0,'battle',ZERORUPIA);
 assert.equal(e.summonCost(s,0,e.card(LARKAN)),1);
 cross(s,gear,host);
 assert.equal(e.summonCost(s,0,e.card(LARKAN)),0);
 put(s,1,'battle',GENMU);
 assert.equal(e.power(host,false,s),5000);
 assert.equal(e.power(host,true,s),5000);
 gear.g35Ignored=s.turn;
 assert.equal(e.power(host,false,s),2000);
});

test('Mobile Forest detaches when its host ceases being a creature and immediately resumes the discount',()=>{
 const s=field(),gear=play(s,FOREST),host=put(s,0,'battle',ACE);
 put(s,0,'battle',NATURE);put(s,0,'battle',NATURE);const support=put(s,0,'battle',NATURE);
 assert.equal(e.isCreature(s,host),true);
 cross(s,gear,host);
 assert.equal(e.power(host,false,s),15000);
 assert.equal(e.summonCost(s,0,e.card(DARK)),2);
 play(s,BOUNCE);act(s,'effect',a=>a.targets[0]?.uid===support.uid);drain(s);
 assert.ok(find(s,0,'hand',support));
 assert.equal(e.isCreature(s,host),false);
 assert.equal(find(s,0,'battle',gear).crossedTo,undefined);
 assert.equal(e.summonCost(s,0,e.card(DARK)),1);
});
