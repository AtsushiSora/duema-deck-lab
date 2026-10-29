import{createPhoto159ResourceRules}from'./photo159-resource-rules.js?v=0.220.0';
import{createPhoto159ShieldRules}from'./photo159-shield-rules.js?v=0.220.0';
import{createPhoto159CombatRules}from'./photo159-combat-rules.js?v=0.220.0';
import{createPhoto159DispectorRules}from'./photo159-dispector-rules.js?v=0.220.0';
// Keep the photographed-card families independent while using normal engine hooks.
export function createPhoto159Rules(api){
 const modules=[createPhoto159ResourceRules(api),createPhoto159ShieldRules(api),createPhoto159CombatRules(api),createPhoto159DispectorRules(api)];
 const call=(name,...args)=>{for(const m of modules)m[name]?.(...args);};
 const collect=(name,...args)=>modules.flatMap(m=>m[name]?.(...args)||[]);
 const consume=(name,...args)=>modules.some(m=>m[name]?.(...args));
 const out={run:(...a)=>consume('run',...a),chosen:(...a)=>consume('chosen',...a),effect:(...a)=>consume('effect',...a),beforeBreak:(...a)=>consume('beforeBreak',...a),decorate(s,p,x,c){for(const m of modules)if(m.decorate)c=m.decorate(s,p,x,c);return c;}};
 for(const name of['entry','attack','attackEnd','broken','spellCast','played','shieldLeft','shieldAdded','graveAdded','manaAdded','alternative','expire'])out[name]=(...args)=>call(name,...args);
 for(const name of['start','end','battleWins','mainActions'])out[name]=(...args)=>collect(name,...args);
 return out;
}
