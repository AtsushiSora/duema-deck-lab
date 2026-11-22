// Transient zone provenance. Rebuilt for each action, including after JSON restore.
// Kept out of card objects, saved decks and serialized game state.
const positions=new WeakMap(),lists=new WeakMap();
const physical=x=>[x,...['under','godLinks','psychicLinks','shieldStack'].flatMap(k=>(x[k]||[]).flatMap(physical))];
export function noteZone1653(s,p,zone,...cards){const map=positions.get(s);if(!map)return;for(const x of cards)if(x?.uid)for(const y of physical(x))map.set(y.uid,{zone,p});}
export function trackManaOrigins1653(s){
 const map=new Map();positions.set(s,map);
 for(const[p,own]of s.players.entries()){
  for(const zone of['deck','hand','grave','mana','battle','shields','extra','gr','seals','abyss']){
   const rows=own[zone]||[];if(!Array.isArray(rows))continue;lists.set(rows,{s,p,zone});noteZone1653(s,p,zone,...rows);
  }
  for(const[k,rows]of Object.entries(own))if(/Holding|Pending|Reviving/.test(k)&&Array.isArray(rows))for(const x of rows)if(x?.uid&&!map.has(x.uid)){
   const t=(s.extTasks||[]).find(t=>(t.uid===x.uid||t.target===x.uid)&&t.origin);
   noteZone1653(s,p,x.g5Origin||x.g29Origin||x.g20Origin||t?.origin||'unknown',x);
  }
 }
 // Rule 409.1c: a resolving spell still belongs to its original zone.
 const seen=new Set();function spell(f){if(!f||seen.has(f))return;seen.add(f);if(f.inst&&!f.virtual&&!f.g1647EarlyMoved){const p=f.owner??f.player??f.caster;noteZone1653(s,p,f.shieldCast?'shields':f.origin||f.spell?.summonOrigin||'hand',f.inst);}spell(f.previous);spell(f.parent);}
 spell(s.resolvingSpell);for(const f of s.extSpells||[])spell(f);
}
export function removedZone1653(list,x){const row=lists.get(list);if(row)noteZone1653(row.s,row.p,row.zone,x);}
export function manaOrigins1653(s,cards){const map=positions.get(s);return cards.map(x=>({uid:x.uid,...map?.get(x.uid)}));}
