import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const KABORD='dm23rp1-004',IMPACT='dm16-008',FIRE='dm01-097',SINGLE='dmd09-007',MULTI='dm01-007';
const RSFK='dm22ex1-030',KABUTO='dmrp05-m01',ABYSS='dm22rp1-1B',HIGH='dm01-027';
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));

test('the one official Kabord print retains its canonical ID, print image and limit',()=>{
 const manifest=read('support-phase-1342.json'),[row]=manifest.cards,c=e.card(KABORD);
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(row.id,KABORD);
 assert.deepEqual(manifest.printAliases,[]);
 assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id:KABORD,count:1}]);
 assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[KABORD]);
 assert.deepEqual([c.cost,c.power,c.race,c.civ,c.limit,c.breaker,c.abyssRush],[8,12000,'アビスロイヤル','闇',4,3,true]);
 assert.equal(CARD_IMAGES[row.id],row.image);
});

test('Kabord reduces tapped enemies and grants power and Powered Breaker only to its other Abyss',()=>{
 const s=setup(),kabord=add(s,0,'battle',KABORD),ally=add(s,0,'battle',ABYSS);
 const own=add(s,0,'battle',SINGLE),foe=add(s,1,'battle',MULTI);
 assert.equal(e.power(kabord,false,s),12000);
 assert.equal(e.power(ally,false,s),e.card(ally).power+5000);
 assert.equal(e.effectiveCard(ally,s).poweredBreaker,true);
 assert.equal(e.power(own,false,s),6000);
 assert.equal(e.power(foe,false,s),7000);
 foe.tapped=true;assert.equal(e.power(foe,false,s),2000);
 const duplicate=add(s,0,'battle',KABORD);
 assert.equal(e.power(kabord,false,s),17000);
 assert.equal(e.power(duplicate,false,s),17000);
 assert.equal(e.power(foe,false,s),-3000);
});

test('an ordinary attack breaks zero shields with Kabord and uncrossed Impact Absorber (QA43069)',()=>{
 const s=setup(),x=add(s,0,'battle',SINGLE);
 add(s,1,'battle',KABORD);add(s,1,'battle',IMPACT);
 const shields=s.players[1].shields.map(y=>y.uid);
 attack(s,x.uid);act(s,'noBlock');drain(s);
 assert.ok(has(s,0,'battle',x));
 assert.deepEqual(s.players[1].shields.map(y=>y.uid),shields);
 assert.equal(e.power(x,false,s),1000);
});

test('R.S.F.K. breaks five after dying from Kabord before the judge resolves (QA43222)',()=>{
 const s=setup(),x=add(s,0,'battle',RSFK);
 add(s,1,'battle',KABORD);
 give(s,0,'deck',Array(12).fill(HIGH));give(s,1,'deck',Array(12).fill(FIRE));
 attack(s,x.uid);
 assert.ok(has(s,0,'grave',x));
 for(let i=1;i<5;i++)act(s,'judgeAgain');
 act(s,'stopJudge');
 assert.equal(s.judge.remaining,5);
 for(let i=0;i<5;i++)act(s,'judgeBreak');
 assert.equal(s.players[1].shields.length,0);
});

test('a live tapped Kabuto is reduced to eight shield breaks after its battle win (QA43224)',()=>{
 const s=setup(),x=add(s,0,'battle',KABUTO),victim=add(s,1,'battle',FIRE,{tapped:true});
 add(s,1,'battle',KABORD);
 give(s,1,'shields',Array(9).fill(FIRE));
 attack(s,x.uid,victim.uid);act(s,'noBlock');
 assert.ok(has(s,1,'grave',victim));
 assert.equal(s.decision.task.op,'g21BreakChoose');
 assert.equal(s.decision.task.n,8);
 for(let i=0;i<8;i++)act(s,'extended');
 assert.equal(s.players[1].shields.length,1);
});

test('its own Abyss Rush permits a player attack and sends the card to the deck bottom at end of turn',()=>{
 const s=setup(),x=add(s,0,'grave',KABORD),own=s.players[0];
 act(s,'play',a=>a.uid===x.uid&&a.origin==='grave');
 assert.ok(has(s,0,'battle',x));
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));
 act(s,'endTurn');drain(s);
 assert.equal(own.deck.at(-1).uid,x.uid);
 assert.ok(!has(s,0,'battle',x));
});
