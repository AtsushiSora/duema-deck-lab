import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const SHALION='dm15-016',TAKEO='dm36-106',SHIDOU='dm37-016';
const BODY='dm01-108',GEAR='dm15-008',CHEAP='dm14-110',TAKION='dm23ex1-058';
const PON='dm36-099',ARAGOTO='dm37-051',PLAIN='dm28-073',FIRE='dm01-097',LIGHT='dm01-075';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(BODY));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,x){
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
}
const action=(s,kind,x,target)=>e.getLegalActions(s).find(a=>a.kind===kind&&a.uid===x.uid&&(target===undefined||a.target===target));
const tapped=s=>s.players[0].mana.filter(x=>x.tapped).length;
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const breaks=(s,x)=>e.effectiveCard(x,s).breaker??1;

test('Phase 856 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-856.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[SHALION,TAKEO,SHIDOU]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:856}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:855}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:856}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

test('Shalion reduces generation and crossing onto another creature (QA 35327)',()=>{
 const s=field();
 const shalion=add(s,0,'battle',SHALION),ally=add(s,0,'battle',BODY),gear=add(s,0,'hand',GEAR);
 assert.equal(action(s,'play',gear).cost,2);
 play(s,gear);
 assert.equal(tapped(s),2);
 assert.equal(action(s,'crossGear',gear,shalion.uid).cost,2);
 assert.equal(action(s,'crossGear',gear,ally.uid).cost,2);
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===ally.uid);
 assert.equal(tapped(s),4);
 assert.equal(s.players[0].battle.find(x=>x.uid===gear.uid).crossedTo.uid,ally.uid);
});

test('Shalion stacks with Takion and leaves a one-mana floor without reducing creature costs',()=>{
 const s=field();
 add(s,0,'battle',SHALION);
 add(s,0,'battle',TAKION);
 add(s,1,'battle',SHALION);
 const ally=add(s,0,'hand',PLAIN),gear=add(s,0,'hand',GEAR),cheap=add(s,0,'hand',CHEAP);
 assert.equal(action(s,'play',ally).cost,3);
 assert.equal(action(s,'play',gear).cost,1);
 assert.equal(action(s,'play',cheap).cost,1);
 play(s,ally);
 play(s,cheap);
 assert.equal(action(s,'crossGear',cheap,ally.uid).cost,1);
});

test('Shalion does not reduce costs while its ability is ignored and does not waive civilization',()=>{
 const s=field();
 const shalion=add(s,0,'battle',SHALION),gear=add(s,0,'hand',GEAR);
 give(s,0,'mana',[FIRE,FIRE,FIRE]);
 assert.equal(action(s,'play',gear),undefined);
 give(s,0,'mana',[LIGHT,FIRE,FIRE]);
 assert.equal(action(s,'play',gear).cost,2);
 shalion.g35Ignored=s.turn;
 assert.equal(action(s,'play',gear).cost,3);
 const placed=add(s,0,'battle',CHEAP);
 assert.equal(action(s,'crossGear',placed,shalion.uid),undefined);
});

test('Takeo counts other friendly W Soul creatures only, including muted ones',()=>{
 const s=field(),takeo=add(s,0,'battle',TAKEO);
 const ally=add(s,0,'battle',ARAGOTO,{g35Ignored:s.turn});
 add(s,0,'battle',PON);
 add(s,0,'battle',BODY,{under:[inst(TAKEO)]});
 add(s,1,'battle',TAKEO);
 assert.equal(e.power(takeo,false,s),3000);
 const copy=add(s,0,'battle',TAKEO);
 assert.equal(e.power(takeo,false,s),4000);
 assert.equal(e.power(copy,false,s),4000);
 s.players[0].seals=[{...inst(BODY),sealOf:ally.uid}];
 act(s,'toAttack');
 assert.equal(e.power(takeo,false,s),3000);
 takeo.g35Ignored=s.turn;
 assert.equal(e.power(takeo,false,s),2000);
});

test('Shidou grants W-Breaker to itself and friendly K or W Soul creatures once',()=>{
 const s=field(),source=add(s,0,'battle',SHIDOU);
 const k=add(s,0,'battle',PON),w=add(s,0,'battle',TAKEO),both=add(s,0,'battle',ARAGOTO);
 const plain=add(s,0,'battle',BODY),enemy=add(s,1,'battle',PON);
 assert.deepEqual([source,k,w,both,plain,enemy].map(x=>breaks(s,x)),[2,2,2,2,1,1]);
 const other=add(s,0,'battle',SHIDOU);
 assert.equal(breaks(s,both),2);
 source.g35Ignored=s.turn;
 assert.equal(breaks(s,w),2);
 other.g35Ignored=s.turn;
 assert.equal(breaks(s,w),1);
 assert.equal(e.power(w,false,s),5000);
});

test('Shidou lets a qualifying creature choose W-Breaker when it has a higher breaker',()=>{
 let s=field();
 add(s,0,'battle',SHIDOU);
 const attacker=add(s,0,'battle',PON,{g34Grants:[{turn:s.turn,breaker:3}]});
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_GrantedBreaker633');
 assert.deepEqual(new Set(s.decision.choices.map(x=>x.value)),new Set([2,3]));
 s=structuredClone(s);
 pick(s,2);
 assert.equal(s.decision.type,'breakChoice');
 assert.equal(s.decision.count,2);
});
