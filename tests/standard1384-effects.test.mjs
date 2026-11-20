import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {data,details,e,setup,inst,cast,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1384.json',import.meta.url))),GR='dmsd08-016';
const cases=[['dmsd11-018','spellOnly'],['dmrp09-099','entry'],['dmrp11-044','draw'],['dmrp11-050','mill'],['dmrp11-037','tap']];
for(const [id,effect] of cases)for(const blocked of [false,true])test(e.card(id).name+' resolves its complete effect with GR summon '+(blocked?'forbidden':'allowed'),()=>{
 const s=setup();s.active=0;s.format='advance';const top=inst(GR),next=inst('dmsd11-014'),enemy=inst('dm01-108');s.players[0].gr=[top,next];s.players[1].battle=[enemy];const mana=s.players[0].mana.length,deck=s.players[0].deck.length;
 if(blocked)s.extLimits=[{kind:'summon',player:0,max:4}];
 cast(s,id);drain(s);
 if(blocked){assert.equal(s.players[0].gr[0],top);assert.ok(!s.players[0].battle.includes(top));assert.ok(s.log.some(x=>x.type==='grPrevented'&&x.cardId===GR));}
 else{assert.ok(s.players[0].battle.includes(top));assert.equal(top.summonedTurn,s.turn);assert.equal(s.players[0].gr.length,1);}
 if(effect==='entry')assert.ok(s.players[0].battle.some(x=>x.cardId===id));
 else if(effect==='spellOnly'){assert.equal(s.players[0].mana.length,mana);assert.ok(s.players[0].grave.some(x=>x.cardId===id));}
 else{assert.equal(s.players[0].mana.length,mana+1);assert.ok(s.players[0].mana.some(x=>x.cardId===id));assert.ok(!s.players[0].grave.some(x=>x.cardId===id));}
 if(effect==='draw'){assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].deck.length,deck-1);}
 if(effect==='mill'){assert.equal(s.players[0].grave.length,3);assert.equal(s.players[0].deck.length,deck-3);}
 if(effect==='tap')assert.equal(enemy.tapped,true);
});
for(const [id] of cases)test(e.card(id).name+' completes normally when super GR is empty',()=>{const s=setup();s.active=0;s.format='advance';s.players[0].gr=[];s.players[1].battle=[inst('dm01-108')];cast(s,id);drain(s);assert.equal(s.decision,null);assert.equal(s.winner,null);});
test('new GR summon definitions reject changed clauses rather than enabling partial effects',()=>{for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.deepEqual(standardCardSpec(d,{phase:1384}),row.spec);d.faces[0].abilityText+='\n未対応の能力';assert.throws(()=>standardCardSpec(d,{phase:1384}));}});
