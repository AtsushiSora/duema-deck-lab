// Both kinds of Mekraid reveal three physical cards and execute a matching face.
// Reserved cards remain in the library until chosen and are released before execution.
export function createChampionRaid(api,prefix){
 const {card,faces,cost,put,choice,opt,skip,task}=api;
 const release=(s,p,uid)=>{s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(x=>x!==uid);};
 const usable=(s,p,x,c)=>api.canCast(s,p,c,'deck')&&(c.type==='spell'||api.canEnter(s,p,c,{origin:'deck',execution:true})&&(!c.evolution||api.evolutionBases(s,p,c).length));
 return {
 run(s,t){if(t.op!==prefix+'Raid'&&t.op!==prefix+'RaidPick')return false;const own=s.players[t.p];if(t.op===prefix+'Raid'){const n=api.lookCount?api.lookCount(s,t.p,3):api.deckLocked(s,t.p)?0:3,held=new Set(own.g34Protected||[]),ids=own.deck.filter(x=>!held.has(x.uid)).slice(0,n).map(x=>x.uid);(own.g34Protected??=[]).push(...ids);api.log(s,t.p,'reveal',t.race+'・メクレイド'+t.max+'：'+ids.map(uid=>card(own.deck.find(x=>x.uid===uid)).name).join('・'),{cardId:t.source});put(s,{...t,op:prefix+'RaidPick',ids});}else{const rows=t.ids.flatMap(uid=>{const x=own.deck.find(x=>x.uid===uid);return x?faces(card(x)).flatMap((c,face)=>String(c.race).includes(t.race)&&cost(c)<=t.max&&usable(s,t.p,x,c)?[opt(c.name,{uid,face},20+cost(c),x.cardId)]:[]):[];});choice(s,t,t.race+'・メクレイド'+t.max+'：実行するカードを1枚まで選ぶ',[...rows,skip()]);}return true;},
 chosen(s,t,v){if(t.op!==prefix+'RaidPick')return false;put(s,task('g34_Order',t.p,t.source,{ids:t.ids.filter(uid=>uid!==v?.uid),ordered:[],rest:'bottom'}));if(v){const x=s.players[t.p].deck.find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face];release(s,t.p,v.uid);if(c&&usable(s,t.p,x,c)){if(c.evolution||c.neoEvolution)put(s,task('g34_Put',t.p,t.source,{origin:'deck',target:v.uid,face:v.face,execution:true,reason:t.race+'・メクレイド'}));else api.cast(s,t.p,v.uid,true,null,v.face,null,'deck',t.race+'・メクレイド');}}return true;}
 };
}
