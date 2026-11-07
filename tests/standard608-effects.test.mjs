import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-608.json',import.meta.url)));
const CAT='dmr05-045', ATERUI='dm33-009', MOON='dmrp15-022', FIST='dmrp15-023';
const WATER='dm01-083', SMALL='dm01-076', BIG='dmrp05-002', EVO='dm14-s03', DEMON='dm01-027';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}

function place(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:608}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:607}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('ピュアキャット protects allied creatures with cost seven or more from enemy choices and still allows battle',()=>{
 const s=field(),attacker=place(s,0,'battle',WATER),cat=place(s,1,'battle',CAT),large=place(s,1,'battle',BIG),small=place(s,1,'battle',WATER);
 play(s,DEMON);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='effect'&&a.targets.some(t=>t.uid===cat.uid)));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='effect'&&a.targets.some(t=>t.uid===large.uid)));
 act(s,'effect',a=>a.targets.some(t=>t.uid===small.uid));
 large.tapped=true;
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===large.uid));
});

test('アテルイ uses current power, can protect itself, and does not stop effects that affect all creatures',()=>{
 const s=field(),aterui=place(s,1,'battle',ATERUI),small=place(s,1,'battle',WATER),large=place(s,1,'battle',BIG);
 aterui.powerModifiers=[{amount:1500}];
 assert.equal(e.power(aterui,false,s),6000);
 play(s,DEMON);
 const targets=e.getLegalActions(s).filter(a=>a.kind==='effect').flatMap(a=>a.targets.map(t=>t.uid));
 assert.deepEqual(targets,[small.uid]);
 act(s,'effect');
 play(s,'dm01-015');
 assert.ok(aterui.tapped&&large.tapped);
});

test('剥楯！月光MAX can use both modes with one Light/Dark creature and can return the newly added shield without its S・トリガー',()=>{
 const s=field(),enemy=place(s,1,'battle',EVO),ally=place(s,0,'battle','dmrp15-086');
 const sameColors=e.civilizations(e.card(ally));
 assert.ok(sameColors.includes('光')&&sameColors.includes('闇'));
 give(s,0,'deck',[DEMON,WATER,WATER]);
 const top=s.players[0].deck[0];
 play(s,MOON);
 assert.deepEqual(values(s),[0,1,2]);
 pick(s,2);pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'shields',top));
 pick(s,top.uid);
 assert.ok(has(s,0,'hand',top)&&!s.triggers);
 assert.equal(s.decision,null);
});

test('剥楯！月光MAX can still add a shield when the opponent has no creatures',()=>{
 const s=field(),top=s.players[0].deck[0];
 play(s,MOON);
 assert.deepEqual(values(s),[0,1]);
 pick(s,0);
 assert.ok(has(s,0,'shields',top)&&!top.faceUp);
});

test('殴厳！暴拳MAX sweeps small enemies and shields a non-evolution stack face up',()=>{
 const s=field(),small=place(s,1,'battle',SMALL),large=place(s,1,'battle',BIG),evo=place(s,1,'battle',EVO);
 const under=inst(WATER);
 large.under=[under];
 place(s,0,'battle','dm12-035');
 play(s,FIST);
 assert.deepEqual(values(s),[0,1,2]);
 pick(s,2);
 assert.ok(has(s,1,'mana',small));
 assert.deepEqual(values(s),[large.uid]);
 pick(s,large.uid);
 assert.ok(has(s,1,'battle',evo));
 assert.ok(has(s,1,'shields',large)&&large.faceUp);
 assert.ok(has(s,1,'shields',under)&&under.faceUp);
});

test('殴厳！暴拳MAX cannot use both modes without its civilization condition',()=>{
 const s=field(),large=place(s,1,'battle',BIG),small=place(s,1,'battle',SMALL);
 play(s,FIST);
 assert.deepEqual(values(s),[0,1]);
 pick(s,1);pick(s,large.uid);
 assert.ok(has(s,1,'battle',small)&&has(s,1,'shields',large));
});
