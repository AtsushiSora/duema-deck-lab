import test from 'node:test';
import assert from 'node:assert/strict';
import {data,e,setup,inst,act,cast,drain} from './target-fixture.mjs';
const GR='dmsd08-016',cases=[['dmrp11-055','burn'],['dmrp09-069','tap'],['dmrp09-013','all'],['dmsd11-013','freeze'],['dmsd11-017','bounce']];
for(const [id,effect] of cases)for(const blocked of [false,true])test(e.card(id).name+' keeps its full non-GR effect when GR summon is '+(blocked?'blocked':'available'),()=>{
 const s=setup();s.active=0;s.format='advance';const top=inst(GR),first=inst(effect==='freeze'?'dmrp09-064':'dm01-108'),second=inst('dm01-108');s.players[0].gr=[top,inst('dmsd11-014')];s.players[1].battle=effect==='freeze'?[first]:[first,second];if(effect==='freeze'){const target=inst('dm01-108');target.tapped=true;s.players[0].battle=[target];}
 const limit=effect==='burn'?3000:7000;if(['burn','bounce'].includes(effect)){first.powerModifiers=[{amount:limit-e.power(first,false,s)}];second.powerModifiers=[{amount:limit+1-e.power(second,false,s)}];}
 if(blocked)s.extLimits=[{kind:'summon',player:0,max:4}];const mana=s.players[0].mana.length;cast(s,id);drain(s);
 if(blocked){assert.equal(s.players[0].gr[0],top);assert.ok(!s.players[0].battle.includes(top));}else assert.ok(s.players[0].battle.includes(top));
 if(effect==='burn'){assert.ok(s.players[1].grave.includes(first));assert.ok(s.players[1].battle.includes(second));assert.ok(s.players[0].mana.some(x=>x.cardId===id));assert.equal(s.players[0].mana.length,mana+1);}
 if(effect==='bounce'){assert.ok(s.players[1].hand.includes(first));assert.ok(s.players[1].battle.includes(second));}
 if(effect==='tap')assert.equal(s.players[1].battle.filter(x=>x.tapped).length,1);
 if(effect==='all')assert.ok(s.players[1].battle.every(x=>x.tapped));
 if(effect==='freeze'){assert.ok(s.extLimits.some(x=>x.g190Freeze&&(x.ref?.uid||x.uid)===first.uid));s.active=1;s.phase='attack';top.tapped=true;assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===first.uid));if(!blocked){s.active=0;top.tapped=false;top.entered=0;act(s,'attack',a=>a.uid===top.uid&&a.target==='player');assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===first.uid));}}
});
for(const id of ['dmrp09-069','dmrp09-013','dmsd11-013'])test(e.card(id).name+' can be used from a shield without mana and GR summons for the defending player',()=>{
 const s=setup();s.active=0;s.format='advance';s.players[0].battle=[inst('dm01-108')];s.players[1].battle=[];s.players[1].mana=[];s.players[1].shields=[inst(id)];const gr=inst(GR);s.players[1].gr=[gr,inst('dmsd11-014')];s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.ok(s.players[1].battle.includes(gr));assert.equal(s.players[1].mana.length,0);assert.ok(s.players[1].grave.some(x=>x.cardId===id));assert.equal(s.winner,null);
});
