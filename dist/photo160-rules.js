import{createPhoto160NatureRules}from'./photo160-nature-rules.js?v=0.227.0';
import{createPhoto160SpellRules}from'./photo160-spell-rules.js?v=0.227.0';
import{createPhoto160FireRules}from'./photo160-fire-rules.js?v=0.227.0';
export function createPhoto160Rules(api){
 const entries=[['nature',createPhoto160NatureRules(api)],['spell',createPhoto160SpellRules(api)],['fire',createPhoto160FireRules(api)]],modules=entries.map(([,m])=>m);
 const call=(name,...args)=>{for(const m of modules)m[name]?.(...args);},collect=(name,...args)=>modules.flatMap(m=>m[name]?.(...args)||[]),consume=(name,...args)=>modules.some(m=>m[name]?.(...args));
 const out={run:(...a)=>consume('run',...a),chosen:(...a)=>consume('chosen',...a),effect:(...a)=>consume('effect',...a),
 decorate(s,p,x,c){for(const m of modules)if(m.decorate)c=m.decorate(s,p,x,c);return c;},
 discount:(...a)=>modules.reduce((n,m)=>n+(m.discount?.(...a)||0),0),
 forceActions(s,p,actions){for(const m of modules)if(m.forceActions)actions=m.forceActions(s,p,actions);return actions;},
 allowedEntry:(...a)=>modules.every(m=>!m.allowedEntry||m.allowedEntry(...a)),canAttackPlayer:(...a)=>modules.every(m=>!m.canAttackPlayer||m.canAttackPlayer(...a)),
 snapshot(s,rows){return Object.fromEntries(entries.map(([name,m])=>[name,m.snapshot?.(s,rows)]));},
 leaving(s,p,x,snapshot,to,destroy){for(const[name,m]of entries)m.leaving?.(s,p,x,snapshot?.[name],to,destroy);}};
 for(const name of['entry','attack','attackEnd','spellCast','played','shieldLeft','shieldAdded','graveAdded','manaAdded','alternative','expire','discarded'])out[name]=(...args)=>call(name,...args);
 for(const name of['start','end','battleWins','mainActions'])out[name]=(...args)=>collect(name,...args);
 return out;
}
