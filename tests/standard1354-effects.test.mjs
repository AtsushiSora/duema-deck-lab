import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,cast,data,details,e,drain,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ENDE='dmbd12-g01',GAMMA='dmrp09-m01',VOL='dmex18-s10',
 ZAHA='dmrp11-s06',CODE='dmrp11-m02',BASE='dm01-108',LOW='dmr08-036',EXACT='dmr10-013';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(){
 const s=Object.assign(setup(),{active:0,format:'advance'});
 for(const p of [0,1]){
  give(s,p,'deck',Array(24).fill(BASE));
  for(const zone of ['gr','extra','seals'])s.players[p][zone]=[];
 }
 return s;
}
function add(s,p,zone,id,props={}){
 const x={...inst(id),cardOwner:p,...props};
 s.players[p][zone].push(x);
 return x;
}
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
function enterFromHand(s){
 const aura=add(s,0,'hand',ENDE);
 act(s,'play',a=>a.uid===aura.uid);
 return aura;
}

test('the verified Endezaark print has one battle definition',()=>{
 const [row]=read('tools/support-phase-1354.json').cards,registry=createCatalogue(snapshot,data.cards,details),c=e.card(ENDE);
 assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1354}),row.spec);
 assert.equal(c.limit,4);
 assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:ENDE,count:1}]);
 assert.equal(CARD_IMAGES[ENDE],row.image);
 assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).length,1);
});

test('QA40828: Voljaaku triggers separately for Endezaark and Gamma Master',()=>{
 const s=field(),vol=add(s,0,'battle',VOL),host=add(s,0,'gr',GAMMA);
 const low=add(s,1,'battle',LOW),exact=add(s,1,'battle',EXACT),aura=enterFromHand(s);
 act(s,'grAura1352');
 assert.equal(e.power(host,false,s),7000);
 assert.equal(aura.auraTo1352.uid,host.uid);
 assert.equal(s.decision.type,'effectOrder');
 const effects=s.pendingEffects.filter(x=>x.uid===vol.uid&&x.task?.op==='g34_DragonEntryPower1226');
 assert.deepEqual(effects.map(x=>x.task.g1226Dragon.uid),[host.uid,aura.uid]);
 act(s,'orderEffect',a=>a.effectId===effects[1].effectId);
 assert.ok(inZone(s,1,'battle',low));
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.effectId===effects[0].effectId);
 assert.equal(s.decision?.task?.op,'g34_Select');
 assert.equal(s.decision.task.g506PowerBudget,7000);
 assert.ok(!values(s).includes(exact.uid));
 pick(s,low.uid);drain(s);
 assert.ok(inZone(s,1,'grave',low));
 assert.ok(inZone(s,1,'battle',exact));
});

test('attachment requires choosing a cost-seven-or-lower aura in one’s own grave',()=>{
 const s=field(),host=add(s,0,'battle',GAMMA),code=add(s,0,'grave',CODE),zaha=add(s,0,'grave',ZAHA);
 add(s,1,'grave',CODE);add(s,0,'grave',BASE);
 const aura=enterFromHand(s);
 act(s,'attachAura1352',a=>a.uid===host.uid);
 assert.deepEqual(values(s),[code.uid,zaha.uid]);
 pick(s,code.uid);
 assert.equal(code.auraTo1352.uid,host.uid);
 assert.equal(aura.auraTo1352.uid,host.uid);
 assert.equal(e.power(host,false,s),11000);
 assert.ok(inZone(s,0,'grave',zaha));
});

test('the optional turn-start ability needs two distinct friendly creatures',()=>{
 const s=field(),aura=add(s,0,'grave',ENDE),host=add(s,0,'gr',GAMMA);
 const first=add(s,0,'battle',BASE),second=add(s,0,'battle',BASE);
 add(s,1,'battle',BASE);
 end(s);assert.equal(s.active,1);assert.ok(inZone(s,0,'grave',aura));
 end(s);assert.equal(s.active,0);
 assert.deepEqual(values(s),[first.uid,second.uid,null]);
 pick(s,first.uid);
 assert.deepEqual(values(s),[second.uid,null]);
 pick(s,second.uid);
 assert.ok(inZone(s,0,'grave',first)&&inZone(s,0,'grave',second));
 assert.equal(s.decision.type,'aura1352');
 act(s,'grAura1352');
 assert.equal(aura.auraTo1352.uid,host.uid);
 assert.ok(inZone(s,0,'battle',aura));
});

test('declining the turn-start sacrifice leaves both creatures and the aura in their zones',()=>{
 const s=field(),aura=add(s,0,'grave',ENDE);
 add(s,0,'battle',GAMMA);add(s,0,'battle',BASE);
 end(s);end(s);pick(s,null);
 assert.ok(inZone(s,0,'grave',aura));
 assert.equal(s.players[0].battle.length,2);
});
