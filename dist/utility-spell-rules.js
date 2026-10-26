// Own-creature and mana choices preserve hidden information and normal spell completion.
export function createUtilitySpellRules(api){
 const{card,cost,put,task,choice,opt}=api;
 const creatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const recoverable=x=>!x.faceDown&&card(x).type==='creature';
 function run(s,t){if(!t.op.startsWith('g62_'))return false;const own=s.players[t.p];switch(t.op){
 case'g62_ManaShield':if(api.canMoveZone(s,t.p,'mana')&&api.canAddShield(s,t.p))choice(s,t,'裏向きでシールドに加える自分のマナを1枚選ぶ',own.mana.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?10:10-Math.min(cost(card(x)),30),x.faceDown?undefined:x.cardId)));break;
 case'g62_Cocoon':if(api.canMoveZone(s,t.p,'mana'))choice(s,t,'マナから手札に戻すクリーチャーを1体選ぶ',own.mana.filter(recoverable).map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),30),x.cardId)));break;
 case'g62_Energy':case'g62_Bloody':choice(s,t,t.op==='g62_Energy'?'このターンのパワーを+2000する自分の1体を選ぶ':'このターンスレイヤーを与える自分の1体を選ぶ',creatures(s,t.p).map(x=>opt(card(x).name,x.uid,x.tapped?5:20,x.cardId)));break;
 default:throw Error('未実装の補助呪文：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g62_'))return false;const own=s.players[t.p];switch(t.op){
 case'g62_ManaShield':case'g62_Cocoon':{const shield=t.op==='g62_ManaShield',x=own.mana.find(x=>x.uid===v);if(x&&api.canMoveZone(s,t.p,'mana')&&(shield?api.canAddShield(s,t.p):recoverable(x))){api.remove(own.mana,x.uid);const to=shield?'shields':'hand';api.clear(x,to);api.addZone(s,t.p,to,x);if(shield)api.notifyShieldAdded(s,t.p,x);}break;}
 case'g62_Energy':case'g62_Bloody':{const x=creatures(s,t.p).find(x=>x.uid===v);if(x){const scope={spellSource:t.source,spellCost:cost(card(t.source))};if(t.op==='g62_Energy')(x.powerModifiers??=[]).push({amount:2000,expires:'end',who:s.active,...scope});else(x.g34Grants??=[]).push({turn:s.turn,slayer:true,...scope});}break;}
 default:throw Error('未実装の補助呪文選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g62Effect)return false;put(s,task('g62_'+c.g62Effect,p,c.id,{uid}));return true;}};
}
