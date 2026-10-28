// Own-creature and mana choices preserve hidden information and normal spell completion.
export function createUtilitySpellRules(api){
 const{card,cost,put,task,choice,opt}=api;
 const creatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const recoverable=x=>!x.faceDown&&card(x).type==='creature';
 const corridorColors=(s,p,x)=>api.manaColors(x.faceDown?{civilizations:[],civ:'無色'}:card(x),s,p).some(c=>['光','闇','火','自然'].includes(c));
 function run(s,t){if(!t.op.startsWith('g62_'))return false;const own=s.players[t.p];switch(t.op){
 case'g62_Corridor':if(api.canMoveZone(s,t.p,'mana'))choice(s,t,'マナから手札に戻す光・闇・火・自然のカードを1枚選ぶ',own.mana.filter(x=>!(own.g34ManaHeld||[]).includes(x.uid)&&corridorColors(s,t.p,x)).map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,(x.tapped?20:0)+(x.faceDown?10:Math.min(cost(card(x)),20)),x.faceDown?undefined:x.cardId)));break;
 case'g62_Torpedo':if(api.canMoveZone(s,t.p,'mana'))choice(s,t,'手札に戻す自分のマナを1枚選ぶ',own.mana.filter(x=>!(own.g34ManaHeld||[]).includes(x.uid)).map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,(x.tapped?20:0)+Math.min(cost(card(x)),20),x.faceDown?undefined:x.cardId)));break;
 case'g62_Booster':choice(s,t,'このターンのパワーを+4000する自分のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,t.p)));break;
 case'g62_Roar':if(api.canMoveZone(s,t.p,'mana'))choice(s,t,'マナから手札に戻すコスト6以上のクリーチャーを1体選ぶ',own.mana.filter(x=>recoverable(x)&&cost(card(x))>=6&&!(own.g34ManaHeld||[]).includes(x.uid)).map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),30),x.cardId)));break;
 case'g62_Celeb':if(api.canAddShield(s,t.p))put(s,task('g34_Select',t.p,t.source,{origin:'hand',owner:'self',to:'shields',n:1}));break;
 case'g62_Protect':choice(s,t,'このターンのパワーを+4000する自分のブロッカーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,t.p).filter(x=>api.effective(x,s).blocker)));break;
 case'g62_ManaShield':if(api.canMoveZone(s,t.p,'mana')&&api.canAddShield(s,t.p))choice(s,t,'裏向きでシールドに加える自分のマナを1枚選ぶ',own.mana.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,x.faceDown?10:10-Math.min(cost(card(x)),30),x.faceDown?undefined:x.cardId)));break;
 case'g62_Cocoon':if(api.canMoveZone(s,t.p,'mana'))choice(s,t,'マナから手札に戻すクリーチャーを1体選ぶ',own.mana.filter(recoverable).map(x=>opt(card(x).name,x.uid,10+Math.min(cost(card(x)),30),x.cardId)));break;
 case'g62_Energy':case'g62_Bloody':choice(s,t,t.op==='g62_Energy'?'このターンのパワーを+2000する自分の1体を選ぶ':'このターンスレイヤーを与える自分の1体を選ぶ',creatures(s,t.p).map(x=>opt(card(x).name,x.uid,x.tapped?5:20,x.cardId)));break;
 default:throw Error('未実装の補助呪文：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g62_'))return false;const own=s.players[t.p];switch(t.op){
 case'g62_Corridor':{const x=own.mana.find(x=>x.uid===v);if(x&&api.canMoveZone(s,t.p,'mana')&&corridorColors(s,t.p,x)){const hidden=!!x.faceDown,label=hidden?'裏向きのマナ':card(x).name;api.remove(own.mana,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'manaReturn',card(t.source).name+'：'+label+'をマナから手札へ',{cardId:hidden?t.source:x.cardId});}break;}
 case'g62_Torpedo':{const x=own.mana.find(x=>x.uid===v);if(x&&api.canMoveZone(s,t.p,'mana')){api.remove(own.mana,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'manaReturn',card(t.source).name+'：'+card(x).name+'をマナから手札へ',{cardId:x.cardId});}break;}
 case'g62_Booster':{const x=creatures(s,t.p).find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:4000,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});break;}
 case'g62_Roar':{const x=own.mana.find(x=>x.uid===v);if(x&&recoverable(x)&&cost(card(x))>=6&&api.canMoveZone(s,t.p,'mana')){api.remove(own.mana,x.uid);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);api.log(s,t.p,'manaReturn',card(t.source).name+'：'+card(x).name+'をマナから手札へ',{cardId:x.cardId});}break;}
 case'g62_Protect':{const x=creatures(s,t.p).find(x=>x.uid===v&&api.effective(x,s).blocker);if(x)(x.powerModifiers??=[]).push({amount:4000,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});break;}
 case'g62_ManaShield':case'g62_Cocoon':{const shield=t.op==='g62_ManaShield',x=own.mana.find(x=>x.uid===v);if(x&&api.canMoveZone(s,t.p,'mana')&&(shield?api.canAddShield(s,t.p):recoverable(x))){api.remove(own.mana,x.uid);const to=shield?'shields':'hand';api.clear(x,to);api.addZone(s,t.p,to,x);if(shield)api.notifyShieldAdded(s,t.p,x);}break;}
 case'g62_Energy':case'g62_Bloody':{const x=creatures(s,t.p).find(x=>x.uid===v);if(x){const scope={spellSource:t.source,spellCost:cost(card(t.source))};if(t.op==='g62_Energy')(x.powerModifiers??=[]).push({amount:2000,expires:'end',who:s.active,...scope});else(x.g34Grants??=[]).push({turn:s.turn,slayer:true,...scope});}break;}
 default:throw Error('未実装の補助呪文選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g62Effect)return false;put(s,task('g62_'+c.g62Effect,p,c.id,{uid}));return true;}};
}
