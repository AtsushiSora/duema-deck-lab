import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const VIOLA='dmsd21-008',VOL='dmex18-s10',DEAD='dmr19-s05',EX='dmrp17-s07';
const PLAIN='dm01-108',SEVEN='dm01-s04',SIX='dmx22b-006';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const values=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===(x?.uid??x));
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(PLAIN));
 return s;
}
test('Viola’s official prints use one seed ID and have the same rules and shared limit',()=>{
 const m=read('tools/support-phase-1325.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints,original=m.cards[0];
 assert.equal(original.id,VIOLA);
 assert.equal(m.printAliases.length,7);
 assert.equal(data.cards.filter(c=>nameKey(c.name)===nameKey(original.name)).length,1);
 assert.equal(e.card(VIOLA).shinkalize,true);
 assert.equal(e.card(VIOLA).type,'seed');
 assert.equal(CARD_IMAGES[VIOLA],original.image);
 for(const row of [original,...m.printAliases]){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1325}),original.spec);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id:VIOLA,count:1}]);
  assert.deepEqual(refs.find(x=>x.id===row.id),{id:row.id,canonicalId:VIOLA,name:row.name,image:row.image,source:row.source});
 }
 const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id:m.printAliases.at(-1).id,count:1});
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
});

for(const accept of [true,false])test('Viola may deploy a lower-cost creature after destroying a chosen target '+accept,()=>{
 const s=field(),target=add(s,1,'battle',SEVEN),small=add(s,0,'grave',SIX),same=add(s,0,'grave',SEVEN);
 cast(s,VIOLA);pick(s,target);
 assert.ok(has(s,1,'grave',target));
 assert.deepEqual(values(s),[small.uid,null]);
 pick(s,accept?small:null);drain(s);
 assert.equal(has(s,0,'battle',small),accept);
 assert.ok(has(s,0,'grave',same));
});

test('Viola revives using the original target cost after EX Life replaces destruction (QA42529)',()=>{
 const s=field();
 s.active=1;cast(s,EX);drain(s);
 const target=s.players[1].battle.find(x=>x.cardId===EX);
 assert.ok(target);
 const shields=s.players[1].shields.length;
 s.active=0;const small=add(s,0,'grave',SIX);
 cast(s,VIOLA);pick(s,target);assert.ok(values(s).includes(small.uid));pick(s,small);drain(s);
 assert.ok(has(s,1,'battle',target)&&has(s,0,'battle',small));
 assert.equal(s.players[1].shields.length,shields-1);
});

test('Viola can use its shield trigger and does not deploy when no enemy can be chosen',()=>{
 const s=field(),enemy=add(s,1,'battle',PLAIN),small=add(s,0,'grave',SIX);
 give(s,0,'shields',[VIOLA]);s.active=1;
 attack(s,enemy.uid);act(s,'noBlock');act(s,'useTrigger');
 pick(s,enemy);drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'grave',small));
 const t=field(),other=add(t,0,'grave',SIX);cast(t,VIOLA);drain(t);
 assert.ok(has(t,0,'grave',other));
});

test('Voljaaku cannot use the power of Dead Zone placed on Viola (QA47325)',()=>{
 const s=field(),target=add(s,1,'battle',SEVEN),stays=add(s,1,'battle',PLAIN),deadZoneTarget=add(s,1,'battle',PLAIN);
 const vol=add(s,0,'battle',VOL),dead=add(s,0,'grave',DEAD);
 cast(s,VIOLA);
 assert.ok(s.pendingEffects.some(x=>x.source===VOL));
 act(s,'orderEffect',a=>a.cardId===VIOLA);pick(s,target);pick(s,dead);
 const layer=s.players[0].battle.find(x=>x.cardId===VIOLA);
 if(layer)pick(s,layer);
 assert.ok(has(s,0,'battle',dead)&&dead.under.some(x=>x.cardId===VIOLA));
 assert.ok(!e.effectiveCard(dead,s).race.includes('ドラゴン'));
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===VOL);
 assert.equal(s.decision.source,DEAD);pick(s,deadZoneTarget);drain(s);
 assert.ok(!s.pendingEffects.some(x=>x.source===VOL));
 assert.ok(has(s,1,'battle',stays)&&has(s,0,'battle',vol));
});
