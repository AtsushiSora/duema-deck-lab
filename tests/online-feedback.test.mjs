import test from 'node:test';
import assert from 'node:assert/strict';
import {updateOnlineFeedback,onlineFeedbackHTML} from '../dist/online-feedback.js';

const event=(text,player=0)=>({text,player,turn:1,round:1});
const room=()=>({code:'test-room',seat:0,revision:1,events:[event('対戦開始')],game:{turn:1,round:1,players:[0,1].map(()=>({handCount:5,shieldCount:5,mana:[{uid:'m',tapped:false}],battle:[],grave:[],extra:[],abyss:[]}))}});
test('first load and a new room show only the latest public event, never replaying old results',()=>{
 const r=room();r.events.push(event('マナに置きました'));
 assert.deepEqual(updateOnlineFeedback(null,r),{items:[r.events[1]],index:0});
 const other=structuredClone(r);other.code='another';
 assert.deepEqual(updateOnlineFeedback(r,other,{items:[event('old')],index:0}),{items:[r.events[1]],index:0});
 assert.equal(updateOnlineFeedback(r,null),null);
});
test('both seats get observed changes and cannot mistake a search or hand return for a draw',()=>{
 for(const seat of [0,1]){
  const a=room(),b=structuredClone(a);a.seat=b.seat=seat;b.revision++;
  b.events.push(event('カードを使いました。',seat));
  b.game.players[seat].handCount+=2;
  b.game.players[1-seat].shieldCount--;
  const f=updateOnlineFeedback(a,b);
  assert.equal(f.items[0].text,'カードを使いました。');
  assert.ok(f.items.some(e=>e.player===seat&&e.text==='手札が2枚増えた'));
  assert.ok(f.items.some(e=>e.player===1-seat&&e.text==='シールドが1枚減った'));
  assert.doesNotMatch(JSON.stringify(f),/引いた|cardId|uid/);
  assert.equal(f.index,f.items.length-1);
 }
});
test('only committed tap transitions count; entering tapped and hidden mana never expose identities',()=>{
 const a=room(),b=structuredClone(a);b.revision++;
 b.game.players[1].mana=[{uid:'m',tapped:true,hidden:true,privateFace:{name:'secret'}},{uid:'new',tapped:true,hidden:true}];
 b.game.players[0].battle=[{uid:'arrival',name:'secret',tapped:true}];
 const f=updateOnlineFeedback(a,b);
 assert.ok(f.items.some(e=>e.player===1&&e.text==='マナを1枚タップした'));
 assert.ok(f.items.some(e=>e.player===0&&e.text==='バトルゾーンのカードが1枚増えた'));
 assert.ok(!f.items.some(e=>e.text==='バトルゾーンのカードを1枚タップした'));
 assert.doesNotMatch(JSON.stringify(f),/secret|privateFace|arrival|hidden/);
 const c=structuredClone(b);c.revision++;c.game.players[1].mana[0].tapped=false;
 assert.ok(updateOnlineFeedback(b,c,f).items.some(e=>e.text==='マナを1枚アンタップした'));
});
test('unchanged polling, private payment selection and reconnect preserve the cue under review',()=>{
 const a=room(),b=structuredClone(a);b.revision++;b.game.players[0].handCount++;
 const f=updateOnlineFeedback(a,b);f.index=0;
 assert.equal(updateOnlineFeedback(b,structuredClone(b),f),f);
 const c=structuredClone(b);c.revision++;c.game.manaPayment={amount:1};
 assert.equal(updateOnlineFeedback(b,c,f),f);
 const d=structuredClone(c);d.seat=1;
 assert.deepEqual(updateOnlineFeedback(c,d,f).items,[d.events.at(-1)]);
});
test('a rolling event window omits old entries, retains identical new events and catches up after a long gap',()=>{
 const a=room(),b=structuredClone(a);a.events=[event('one'),event('two')];b.events=[event('two'),event('two')];b.revision++;
 assert.deepEqual(updateOnlineFeedback(a,b).items,[event('two')]);
 b.events=[event('three'),event('four')];
 assert.deepEqual(updateOnlineFeedback(a,b).items,b.events);
});
test('cue is accessible, escaped and can be reviewed without any move control',()=>{
 const f={items:[event('<script>unsafe</script>'),event('カードが増えた',1)],index:0};
 let html=onlineFeedbackHTML(f,0);
 assert.match(html,/あなたの場の変化 · 1\/2/);assert.match(html,/role="status" aria-live="polite" aria-atomic="true"/);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|online-move/);
 assert.match(html,/data-action="online-feedback-prev"[^>]*disabled/);
 assert.doesNotMatch(html,/data-action="online-feedback-next"[^>]*disabled/);
 f.index=1;html=onlineFeedbackHTML(f,0);
 assert.match(html,/相手の場の変化 · 2\/2/);
 assert.match(html,/data-action="online-feedback-next"[^>]*disabled/);
 assert.match(onlineFeedbackHTML(null,0),/操作の結果をここに表示します/);
});
