import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ELUS='dm24-043',FRAPPE='dm24-047',ZENOBIA='dm24-050',LILLIAN='dm24-059',KARS='dm24-025',REPRINT='dmex12-057';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const MULTI='dmrp20-027',ZERO='dmrp07-001',SEED='dmsd20-016',ACE='dm22rp2-S8',RALFAS='dm25-042';
const MOMO='dm26ex4-017',ELEVEN='dm25ex1-021',BELT='dmx07-003',SURFER='dm05-024';
const colors=(s,x)=>e.civilizations(e.effectiveCard(x,s)).slice().sort();
const power=(s,x)=>e.power(x,false,s);
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function put(s,p,z,id,attrs){
 const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;
}
function choose(s,value){
 act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
}

test('Phase 920 verifies the complete four-card cycle and the Frappe reprint without duplicate deck entries',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-920.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[ELUS,FRAPPE,ZENOBIA,LILLIAN]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[REPRINT,FRAPPE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),original=m.cards.find(x=>x.id===id),[f]=row.faces;
  assert.equal(cat.get(row.id).id,id);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  const detail={...details.cards.find(c=>c.id===id),id:row.id,faces:row.faces};
  assert.deepEqual(standardCardSpec(detail,{phase:920}),original.spec);
  const changed=structuredClone(detail);changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:920}));
  for(const [key,value] of Object.entries(original.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  const ref=refs.find(c=>c.id===row.id);
  assert.deepEqual([ref.canonicalId,ref.image],[id,row.image]);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(row.faces,details.cards.find(c=>c.id===id).faces);
   for(const source of [data,snapshot,details])
    assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  }
 }
 const deck={id:'phase920',name:'五文明のクリーチャー',cards:[ELUS,REPRINT,ZENOBIA,LILLIAN,KARS,LIGHT,WATER,DARK,FIRE,NATURE]
  .map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

for(const [id,first,second,native,unrelated,add] of [
 [ELUS,WATER,NATURE,LIGHT,DARK,'光'],[FRAPPE,LIGHT,DARK,WATER,FIRE,'水'],
 [ZENOBIA,WATER,FIRE,DARK,LIGHT,'闇'],[LILLIAN,FIRE,LIGHT,NATURE,WATER,'自然']
]){
 test(e.card(id).name+' applies both civilization and other-creature power only to its own battlefield',()=>{
  const s=field(1),one=put(s,1,'battle',first),two=put(s,1,'battle',second),printed=put(s,1,'battle',native);
  const outsider=put(s,1,'battle',unrelated),enemy=put(s,0,'battle',first);
  const mana=put(s,1,'mana',first),hand=put(s,1,'hand',second),deck=put(s,1,'deck',first);
  const grave=put(s,1,'grave',second),seed=put(s,1,'battle',SEED),gear=put(s,1,'battle','dm14-110');
  const a=play(s,id);
  assert.equal(s.players[1].mana.filter(x=>x.tapped).length,e.card(id).cost);
  for(const x of [one,two,printed]){
   const c=e.card(x);
   assert.deepEqual(colors(s,x),[...new Set([...e.civilizations(c),add])].sort());
   assert.equal(power(s,x),c.power+1000);
  }
  for(const x of [a,outsider,enemy]){assert.deepEqual(colors(s,x),e.civilizations(e.card(x)));assert.equal(power(s,x),e.card(x).power);}
  for(const [zone,x] of [['mana',mana],['hand',hand],['deck',deck],['grave',grave],['battle',seed],['battle',gear]])
   assert.deepEqual(e.civilizations(e.zoneCard(s,1,x,zone)),e.civilizations(e.card(x)));
 });
}

test('All five auras follow newly added civilizations regardless of order and do not color a colorless creature',()=>{
 const expected=['光','水','闇','火','自然'].sort();
 for(const ids of [[KARS,ELUS,FRAPPE,ZENOBIA,LILLIAN],[LILLIAN,ZENOBIA,FRAPPE,ELUS,KARS]]){
  let s=field(),unit=put(s,0,'battle',LIGHT),neutral=put(s,0,'battle',ZERO),multi=put(s,0,'battle',MULTI);
  const sources=ids.map(id=>put(s,0,'battle',id));
  const all=physical(s);
  assert.deepEqual(colors(s,unit),expected);
  assert.equal(power(s,unit),7000);
  assert.deepEqual(colors(s,multi),expected);
  assert.deepEqual(colors(s,neutral),[]);
  for(const x of sources)assert.equal(power(s,x),e.card(x).power+4000);
  s=JSON.parse(JSON.stringify(s));
  const reloaded=find(s,0,'battle',unit);
  assert.deepEqual(colors(s,reloaded),expected);
  assert.equal(power(s,reloaded),7000);
  assert.deepEqual(physical(s),all);
 }
});

test('Civilization and power update when a source leaves, is sealed or has its ability ignored',()=>{
 const s=field(),unit=put(s,0,'battle',LIGHT),a=put(s,0,'battle',FRAPPE),b=put(s,0,'battle',FRAPPE),e1=put(s,0,'battle',ELUS);
 assert.equal(power(s,unit),5000);
 assert.equal(power(s,a),3000);
 const surfer=play(s,SURFER);
 act(s,'effect',action=>action.targets.some(t=>t.uid===b.uid));
 assert.ok(find(s,0,'battle',surfer)&&find(s,0,'hand',b));
 assert.equal(power(s,unit),4000);
 a.sealed=true;put(s,0,'seals',DARK,{faceDown:true,sealOf:a.uid});
 assert.deepEqual(colors(s,unit),['光']);
 assert.equal(power(s,unit),3000);
 e1.g35Ignored=s.turn;
 assert.equal(power(s,unit),2000);
});

test('Added nature can qualify an ACE without granting civilizations to a Tamaseed that is not a creature',()=>{
 const s=field(),ace=put(s,0,'battle',ACE),l=put(s,0,'battle',LILLIAN),seed=put(s,0,'battle',SEED);
 assert.equal(e.isCreature(s,ace),false);
 assert.deepEqual(colors(s,ace),['自然']);
 const fire=put(s,0,'battle',FIRE);
 assert.equal(e.natureElements(s,0),4);
 assert.equal(e.isCreature(s,ace),true);
 assert.equal(power(s,ace),13000);
 assert.deepEqual(colors(s,fire),['火','自然'].sort());
 assert.deepEqual(colors(s,seed),['自然']);
 l.g35Ignored=s.turn;
 assert.equal(e.isCreature(s,ace),false);
});

test('A separately added civilization can enable a source under Momomugen without circular self-enabling',()=>{
 const s=field(),a=put(s,0,'battle',FRAPPE),b=put(s,0,'battle',ELUS),r=put(s,0,'battle',RALFAS),x=put(s,0,'battle',LIGHT);
 const momo=put(s,1,'battle',MOMO);
 assert.equal(e.abilitiesIgnored(s,a),true);
 assert.equal(e.abilitiesIgnored(s,b),true);
 assert.deepEqual(colors(s,x),['光']);
 s.players[1].battle.pop();s.players[1].hand.push(momo);
 s.phase='attack';act(s,'tapAbility',c=>c.uid===r.uid);choose(s,a.uid);choose(s,'光');drain(s);
 s.players[1].hand.pop();s.players[1].battle.push(momo);
 assert.equal(e.abilitiesIgnored(s,a),false);
 assert.equal(e.abilitiesIgnored(s,b),false);
 assert.deepEqual(colors(s,x),['光','水'].sort());
 assert.equal(power(s,x),4000);
});

test('Frappe can be summoned as a shield trigger without spending mana and applies its ability immediately',()=>{
 const s=field(),a=put(s,0,'battle',NATURE),target=put(s,1,'battle',DARK);
 give(s,1,'shields',[FRAPPE]);
 const source=s.players[1].shields[0],before=physical(s);
 s.phase='attack';act(s,'attack',x=>x.uid===a.uid&&x.target==='player');act(s,'noBlock');
 assert.equal(s.decision.uid,source.uid);
 act(s,'useTrigger',x=>x.uid===source.uid);
 drain(s);
 assert.ok(find(s,1,'battle',source));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
 assert.deepEqual(colors(s,target),['闇','水'].sort());
 assert.equal(power(s,target),3000);
 assert.deepEqual(physical(s),before);
});

test('QA 36173: Frappe supplies the eleventh Water creature even if a continuous penalty would destroy it',()=>{
 const s=field(),a=put(s,0,'battle',BELT);
 put(s,1,'battle',ELEVEN);
 for(let i=0;i<9;i++)put(s,1,'battle',i%2===0?DARK:LIGHT);
 give(s,1,'shields',[FRAPPE]);
 s.phase='attack';act(s,'attack',x=>x.uid===a.uid&&x.target==='player');act(s,'noBlock');
 assert.equal(s.winner,null);
 act(s,'useTrigger');
 assert.equal(s.winner,1);
 assert.match(s.reason,/イレブン/);
});

test('Genmu disables the auras without preventing Frappe from using its creature shield trigger',()=>{
 const s=field(),a=put(s,0,'battle',NATURE),ally=put(s,1,'battle',LIGHT);
 put(s,0,'battle',GEN);
 put(s,1,'battle',ELUS);put(s,1,'battle',LILLIAN);put(s,1,'battle',ZENOBIA);
 give(s,1,'shields',[FRAPPE]);
 const source=s.players[1].shields[0];
 s.phase='attack';act(s,'attack',x=>x.uid===a.uid&&x.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.ok(find(s,1,'battle',source));
 assert.deepEqual(colors(s,ally),['光']);
 assert.equal(power(s,ally),2000);
});
