import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {creatureStatusModel} from '../dist/battle-insights.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ELRA='dm22rp1-001',SONG='dm22rp1-014',VOL='dmex18-s10';
const LIGHT='dm01-075',FIRE='dm01-097',GREEN='dm01-108',FOX='dm22rp1-033',ACRUX='dm22rp1-052';
const GUARD='dm36-086',ACASHIC='dm23ex2-009',TWIN='dmbd16-009',FORCE='dm22rp1-6A',BAU='dm22rp1-4A';
const WHITE='dm06-s08',HEA='dmr06-v01',DOMINO='dmx19-s27',DEMON='dm01-027';
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(GREEN));
 return s;
};
const add=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v||s.decision.choices[a.choice].value?.uid===v);
const choices=s=>s.decision?.choices?.map(({value})=>value?.uid??value)??[];
const finish=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('four official printings use the original three IDs and keep their official images',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const m=read('support-phase-1226.json'),refs=read('image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ELRA,SONG,VOL]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm25sp2-002']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1226}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('Elra offers draw followed by tap on the first attack of either player, even if declined',()=>{
 for(const [active,accept] of [[0,false],[0,true],[1,true]]){
  const s=field(active);
  add(s,0,'battle',ELRA);
  const first=add(s,active,'battle',FIRE),later=add(s,active,'battle',FIRE);
  const victim=add(s,1,'battle',FIRE);
  attack(s,first.uid);assert.equal(s.decision?.player,0);
  pick(s,accept?true:null);
  if(accept)pick(s,victim.uid);
  assert.equal(s.players[0].hand.length,accept?1:0);
  finish(s);
  assert.equal(victim.tapped,accept);
  attack(s,later.uid);
  assert.notEqual(s.decision?.task?.op,'g34_Offer');
 }
});

test('Elra grants power and player attacks to blockers at three light elements (QA42045)',()=>{
 const s=field(),elra=add(s,0,'battle',ELRA),acrux=add(s,0,'battle',ACRUX),fox=add(s,0,'battle',FOX);
 const enemy=add(s,1,'battle',FIRE,{tapped:true});
 const actions=x=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
 s.phase='attack';
 assert.equal(actions(fox).length,0);
 const light=add(s,0,'battle',LIGHT);
 assert.equal(e.power(elra,false,s),12500);
 assert.equal(e.effectiveCard(elra,s).breaker,3);
 assert.equal(e.power(fox,false,s),e.card(FOX).power+6000);
 assert.equal(e.power(light,false,s),e.card(LIGHT).power);
 assert.ok(actions(acrux).includes('player'));assert.ok(actions(acrux).includes(enemy.uid));
 assert.deepEqual([...new Set(actions(fox))],['player']);
 const status=creatureStatusModel(s,0,fox.uid);
 assert.deepEqual(status.rows.find(([label])=>label==='攻撃'),['攻撃','攻撃可能']);
 assert.ok(status.effects.some(({name})=>name==='クリーチャーには攻撃できない'));
 assert.ok(status.effects.every(({name})=>name!=='相手プレイヤーには攻撃できない'));
 fox.entered=s.turn;
 assert.equal(actions(fox).length,0);
 light.faceDown=true;
 assert.equal(e.power(elra,false,s),6500);
});

test('Elra cannot restore a blocker’s attack through iZaq’s external restriction',()=>{
 const s=field(1),elra=add(s,0,'battle',ELRA);
 add(s,0,'battle',ACRUX);add(s,0,'battle',LIGHT);
 cast(s,'dm22rp1-035');pick(s,elra.uid);
 assert.equal(s.extLimits.filter(x=>x.uid===elra.uid&&x.g190Freeze).length,2);
 s.active=0;s.phase='attack';
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===elra.uid),false);
});

test('Song permits a single paid reuse of only the chosen physical spell (QA42146)',()=>{
 const s=field(),spell=add(s,0,'grave',GUARD),other=add(s,0,'grave',GUARD);
 cast(s,SONG);pick(s,spell.uid);
 const available=()=>e.getLegalActions(s).filter(a=>a.origin==='grave'&&a.manaPermit==='g1226GraveUse');
 assert.deepEqual(available().map(x=>x.uid),[spell.uid]);
 const tapped=()=>s.players[0].mana.filter(x=>x.tapped).length;
 const paid=tapped();
 act(s,'play',a=>a.uid===spell.uid&&a.origin==='grave');
 assert.equal(tapped(),paid+1);
 assert.ok(has(s,0,'grave',spell)&&has(s,0,'grave',other));
 assert.equal(available().length,0);
});

test('Song permits only the spell face of a Twinpact and can use Acashic’s free cast (QA42147, QA43956)',()=>{
 const s=field(),spell=add(s,0,'grave',TWIN),target=add(s,1,'battle',FIRE);
 cast(s,SONG);pick(s,spell.uid);
 add(s,0,'battle',ACASHIC);
 const actions=e.getLegalActions(s).filter(a=>a.uid===spell.uid&&a.origin==='grave');
 assert.deepEqual(actions.map(a=>[a.face,a.cost]),[[1,0]]);
 const tapped=s.players[0].mana.filter(x=>x.tapped).length;
 act(s,'play',a=>a.uid===spell.uid&&a.face===1);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===target.uid));
 assert.ok(has(s,1,'grave',target));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped);
 assert.equal(e.getLegalActions(s).some(a=>a.uid===spell.uid&&a.origin==='grave'),false);
});

test('Song can reuse a spell with an existing alternate tap cost',()=>{
 const s=field(),spiral=add(s,0,'grave','dmrp03-038'),enemy=add(s,1,'battle',FIRE);
 const first=add(s,0,'battle','dm01-083'),second=add(s,0,'battle','dm01-083');
 cast(s,SONG);pick(s,spiral.uid);
 const paid=s.players[0].mana.filter(x=>x.tapped).length;
 act(s,'play',a=>a.uid===spiral.uid&&a.role==='tapCast976'&&a.origin==='grave');
 pick(s,first.uid);pick(s,second.uid);pick(s,enemy.uid);
 assert.ok(first.tapped&&second.tapped&&has(s,1,'hand',enemy));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,paid);
 assert.equal(e.getLegalActions(s).some(a=>a.uid===spiral.uid&&a.origin==='grave'),false);
});

test('Song can use a Tamaseed/creature but loses the permission when the turn ends',()=>{
 for(const immediately of [false,true]){
  const s=field(),seed=add(s,0,'grave',BAU);
  cast(s,SONG);pick(s,seed.uid);
  if(immediately){act(s,'play',a=>a.uid===seed.uid&&a.origin==='grave');pick(s,null);}
  else{end(s);end(s);s.phase='main';}
  assert.ok(has(s,0,immediately?'battle':'grave',seed));
  assert.equal(e.getLegalActions(s).some(a=>a.uid===seed.uid&&a.origin==='grave'),false);
 }
});

test('Voljaaku cannot use the power of a non-creature Force Dragon (QA42059)',()=>{
 const s=field(),enemy=add(s,1,'battle',DOMINO);
 add(s,0,'battle',VOL);cast(s,FORCE);
 assert.equal(e.isCreature(s,s.players[0].battle.find(x=>x.cardId===FORCE)),false);
 drain(s);
 assert.ok(has(s,1,'battle',enemy));
});

test('Voljaaku uses current power, and the exact threshold is excluded (QA40830)',()=>{
 const s=field(),exact=add(s,1,'battle',DOMINO);
 const low=add(s,1,'battle',FIRE),medium=add(s,1,'battle',FIRE),third=add(s,1,'battle',FIRE);
 add(s,0,'battle',VOL);
 for(const x of [low,medium,third])x.powerModifiers=[{amount:500,expires:'end',who:0}];
 cast(s,WHITE);
 assert.ok(!choices(s).includes(exact.uid));
 pick(s,low.uid);pick(s,medium.uid);
 assert.ok(!choices(s).includes(third.uid));
 drain(s);
 assert.ok(has(s,1,'grave',low)&&has(s,1,'grave',medium));
 assert.ok(has(s,1,'battle',exact)&&has(s,1,'battle',third));
});

test('Voljaaku removes up to three selected shield groups into their owners’ graveyards',()=>{
 const s=field(1),v=add(s,0,'battle',VOL);
 const stolen=add(s,1,'shields',GUARD,{cardOwner:0});
 const two=s.players[1].shields[0];
 cast(s,DEMON);act(s,'effect',a=>a.targets?.some(t=>t.uid===v.uid));
 assert.ok(has(s,0,'grave',v));
 pick(s,stolen.uid);pick(s,two.uid);pick(s,null);
 assert.ok(has(s,0,'grave',stolen));assert.ok(has(s,1,'grave',two));
 assert.equal(s.players[1].shields.length,4);
 assert.ok(!s.triggers);
});

test('Voljaaku uses the evolved Dragon’s current power for both entries (QA47324)',()=>{
 const s=field(),tooBig=add(s,1,'battle',FIRE),below=add(s,1,'battle',FIRE);
 tooBig.powerModifiers=[{amount:3000,expires:'end',who:0}];
 add(s,0,'battle',VOL);
 const evol=add(s,0,'grave','dmc62-008');
 cast(s,'dm25sp2-013');
 const pending=()=>s.pendingEffects.find(x=>x.source===VOL);
 act(s,'orderEffect',a=>a.cardId==='dm25sp2-013');
 pick(s,0);pick(s,evol.uid);
 const base=s.players[0].battle.find(x=>x.cardId==='dm25sp2-013');
 if(base)pick(s,base.uid);
 assert.ok(has(s,0,'battle',evol));
 assert.equal(s.pendingEffects.filter(x=>x.source===VOL).length,2);
 for(let i=0;i<2;i++){
  if(s.decision?.type==='effectOrder'){
   const entry=pending();
   act(s,'orderEffect',a=>a.effectId===entry.effectId);
  }
  assert.equal(s.decision?.task?.g506PowerBudget,5000);
  assert.ok(!choices(s).includes(tooBig.uid));
  pick(s,i===0?null:below.uid);
 }
 drain(s);assert.ok(has(s,1,'grave',below));assert.ok(has(s,1,'battle',tooBig));
});

test('Voljaaku cannot select an opponent’s infinite-power creature even for an infinite budget (QA40829)',()=>{
 const s=field(),genmu='dmrp15-km1';
 const enemy=add(s,1,'battle',genmu),finite=add(s,1,'battle',DOMINO);
 add(s,0,'battle',VOL);add(s,0,'hand',genmu);
 for(let i=0;i<3;i++)add(s,0,'battle',WHITE);
 act(s,'mugenStart');for(let i=0;i<4;i++)act(s,'mugenTap');
 assert.equal(s.decision?.task?.g506PowerBudget,'∞');
 assert.ok(!choices(s).includes(enemy.uid));
 pick(s,finite.uid);drain(s);
 assert.ok(has(s,1,'battle',enemy)&&has(s,1,'grave',finite));
});

test('GG suppresses the entering creature’s triggers and not its ally Voljaaku (QA47382)',()=>{
 const s=field(),gg=add(s,1,'battle','dm25rp3-S09',{under:[inst(FIRE)]});
 const enemy=add(s,1,'battle',FIRE);
 add(s,0,'battle',VOL);cast(s,HEA);
 assert.equal(e.isEvolution(gg),true);
 assert.equal(s.decision?.task?.g506PowerBudget,9000);
 pick(s,enemy.uid);drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,1,'battle',gg));
});
