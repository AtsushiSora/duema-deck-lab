import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const COOK='dm14-032',RAISEN='dm20-050',REPRINT='promoy5-021',GRIMM='dm23-018',BARNIAN='dm20-037';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const MULTI='dm10-068',PIT='dm01-027',DRAKE='dm23-051',FRAPPE='dm24-047',CHUZA='dm20-031';
const ISOPP='dm24-010',STAR='dmrp18-065',UNATTACKABLE='dm07-051',GEAR='dm14-110';
const MELNIA='dm10-064',DIS_MELNIA='dmr02-052',RAPIA='dmx21-058',MECHA='dm20-001';
const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>{const row=s.decision.choices[a.choice].value;return (row?.uid??row)===(v?.uid??v);});
const picks=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const legal=(s,kind,predicate=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&predicate(a));
const canAttack=(s,x,t)=>legal(s,'attack',a=>a.uid===x.uid&&(t===undefined||a.target===(t.uid??t)));
const end=s=>{s.phase='attack';act(s,'endTurn');};
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function attack(s,x,target='player'){
 s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));
}

test('Phase 925 verifies five official prints and retains the original Raisen ID for the promotional print',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-925.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[COOK,RAISEN,GRIMM,BARNIAN]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,RAISEN]]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces,spec=m.cards.find(r=>r.id===id).spec;
  const detail={...details.cards.find(x=>x.id===id),id:row.id,faces:row.faces};
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:925}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:925}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(row.canonicalId)continue;
  assert.deepEqual(detail.faces,details.cards.find(x=>x.id===id).faces);
  assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
 }
 const deck={id:'phase925',name:'攻撃と進化の検証',cards:[COOK,REPRINT,GRIMM,BARNIAN,LIGHT,WATER,DARK,FIRE,NATURE,CHUZA]
  .map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Metal Cook lets creatures on either side attack untapped multicolor opponents while its ability applies',()=>{
 for(const active of [0,1]){
  const s=field();s.active=active;s.phase='attack';
  const cook=put(s,0,'battle',COOK,{tapped:true}),attacker=put(s,active,'battle',FIRE);
  const target=put(s,1-active,'battle',MULTI),mono=put(s,1-active,'battle',NATURE);
  const fresh=put(s,active,'battle',FIRE,{entered:s.turn});
  assert.ok(canAttack(s,attacker,target));
  assert.ok(!canAttack(s,attacker,mono)&&!canAttack(s,fresh,target));
  cook.g35Ignored=s.turn;
  assert.ok(!canAttack(s,attacker,target));
  delete cook.g35Ignored;
  assert.ok(canAttack(s,attacker,target));
  attack(s,attacker,target);drain(s);
  assert.ok(find(s,active,'grave',attacker)&&find(s,1-active,'battle',target));
 }
});

test('Metal Cook uses the target’s current colors and preserves attack protection and ordinary tapped targets',()=>{
 const s=field(),cook=put(s,0,'battle',COOK),attacker=put(s,0,'battle',FIRE);
 const light=put(s,1,'battle',LIGHT),mono=put(s,1,'battle',WATER,{tapped:true});
 const immune=put(s,1,'battle',UNATTACKABLE);
 const colorGrant=x=>({kind:'g805BattleColor',uid:x.uid,incarnation:0,color:'水',turn:s.turn});
 s.phase='attack';assert.ok(!canAttack(s,attacker,light)&&canAttack(s,attacker,mono));
 s.extLimits=[colorGrant(immune)];
 put(s,1,'battle',FRAPPE);
 assert.ok(canAttack(s,attacker,light)&&!canAttack(s,attacker,immune));
 cook.sealed=true;
 assert.ok(!canAttack(s,attacker,light)&&canAttack(s,attacker,mono));
});

test('Raisen needs a friendly Tyranno Drake attack this turn, even if that attacker is destroyed',()=>{
 let s=field(),x=put(s,0,'battle',RAISEN),drake=put(s,0,'battle',DRAKE),ordinary=put(s,0,'battle',FIRE);
 put(s,1,'battle',DRAKE);
 give(s,1,'shields',[NATURE,PIT,NATURE,NATURE]);
 const [first,trigger]=s.players[1].shields;
 const strikeShield=(attacker,shield)=>{
  s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.shield===shield.uid);
  if(legal(s,'noBlock'))act(s,'noBlock');
  if(legal(s,'breakShield'))act(s,'breakShield');
 };
 s.phase='attack';assert.ok(!canAttack(s,x));
 strikeShield(ordinary,first);drain(s);
 assert.ok(!canAttack(s,x));
 strikeShield(drake,trigger);
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===drake.uid));
 drain(s);
 assert.ok(find(s,0,'grave',drake));
 s=restore(s);
 assert.ok(canAttack(s,x,'player'));
 end(s);end(s);s.phase='attack';
 assert.ok(!canAttack(s,x));
});

test('Raisen accepts a Drake attack on a creature but keeps normal summoning sickness',()=>{
 const s=field(),x=put(s,0,'battle',RAISEN,{entered:s.turn}),drake=put(s,0,'battle',DRAKE);
 const target=put(s,1,'battle',WATER,{tapped:true});
 attack(s,drake,target);drain(s);
 assert.ok(!canAttack(s,x));
 x.entered=0;
 assert.ok(canAttack(s,x,'player'));
});

test('Grimm requires a Dreammate and may move an entire opposing evolution stack to mana',()=>{
 let s=field();
 const grimm=put(s,0,'hand',GRIMM),wrong=put(s,0,'battle',FIRE),base=put(s,0,'battle',CHUZA,{tapped:true});
 const first=inst(MULTI),second=inst(NATURE);
 const enemy=put(s,1,'battle',ISOPP,{under:[first,second]}),ordinary=put(s,1,'battle',MULTI);
 act(s,'play',a=>a.uid===grimm.uid);
 assert.ok(legal(s,'evolve',a=>a.baseUid===base.uid)&&!legal(s,'evolve',a=>a.baseUid===wrong.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(find(s,0,'battle',grimm).tapped);
 assert.deepEqual(picks(s),[enemy.uid,null]);
 const physical=e.physicalCards(s).map(x=>x.uid).sort();
 s=restore(s);pick(s,enemy);drain(s);
 assert.ok([enemy,first,second].every(x=>find(s,1,'mana',x)));
 assert.ok(find(s,1,'mana',enemy).tapped&&find(s,1,'mana',first).tapped);
 assert.ok(find(s,1,'battle',ordinary)&&!find(s,1,'battle',enemy));
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),physical);
});

test('Grimm can decline or move only the Star Evolution top when departure is replaced',()=>{
 for(const use of [false,true]){
  const s=field(),base=put(s,0,'battle',CHUZA);
  const layer=inst(WATER),star=put(s,1,'battle',STAR,{under:[layer],tapped:true});
  play(s,GRIMM);act(s,'evolve',a=>a.baseUid===base.uid);
  assert.deepEqual(picks(s),[star.uid,null]);pick(s,use?star:null);drain(s);
  if(use)assert.ok(find(s,1,'mana',star)&&find(s,1,'battle',layer)&&!find(s,1,'mana',layer));
  else assert.ok(find(s,1,'battle',star).under.some(x=>x.uid===layer.uid));
 }
});

test('Barnian counts the distinct enemy races, including both races of Melnia, once each',()=>{
 const s=field(),x=put(s,0,'battle',BARNIAN);
 put(s,0,'battle',NATURE);put(s,1,'battle',GEAR);
 assert.equal(e.power(x,false,s),2000);
 const melnia=put(s,1,'battle',MELNIA);
 assert.equal(e.power(x,false,s),6000);
 put(s,1,'battle',MELNIA);
 assert.equal(e.power(x,false,s),6000);
 const dis=put(s,1,'battle',DIS_MELNIA);
 assert.equal(e.power(x,false,s),8000);
 dis.sealed=true;
 assert.equal(e.power(x,false,s),6000);
 assert.ok(find(s,1,'battle',melnia));
});

test('Barnian recalculates changed races, ignores evolution sources, and loses the bonus when its ability is ignored',()=>{
 const s=field(),x=put(s,0,'battle',BARNIAN);
 put(s,1,'battle',MECHA,{under:[inst(MELNIA)]});
 assert.equal(e.power(x,false,s),4000);
 const rapia=put(s,1,'battle',RAPIA);
 assert.equal(e.power(x,false,s),8000);
 rapia.sealed=true;
 assert.equal(e.power(x,false,s),4000);
 put(s,0,'battle',GEN);
 assert.equal(e.power(x,false,s),2000);
});
