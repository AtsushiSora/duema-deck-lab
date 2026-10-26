// Count both graveyards before selecting the blind, simultaneous hand discard.
export function createUtilityClassicRules(api){
 const{card,put,task,choice,opt}=api;
 function discard(s,t,n){put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n,random:true}));}
 return{
 effect(s,p,c,uid){if(!c.g64Effect)return false;put(s,task('g64_'+c.g64Effect,p,c.id,{uid}));return true;},
 run(s,t){if(!t.op.startsWith('g64_'))return false;switch(t.op){
 case'g64_CloneVice':{const n=s.players[1-t.p].hand.length,copies=s.players.reduce((n,p)=>n+p.grave.filter(x=>card(x).name===card(t.source).name).length,0),max=Math.min(n,1+copies);if(max===1)discard(s,t,1);else if(max>1)choice(s,t,'見ないで選んで捨てさせる枚数を選ぶ（最低1枚）',Array.from({length:max},(_,i)=>opt((i+1)+'枚',i+1,(i+1)*10)));break;}
 case'g64_Reef':{const own=s.players[t.p],win=own.battle.some(x=>!x.sealed&&api.effective(x,s).shako),safe=own.deck.length>3;choice(s,t,'アストラル・リーフ：カードを3枚引く？',[opt('3枚引く',true,safe?20:win?100:-100),opt('引かない',false,0)]);break;}
 default:throw Error('未実装の定番効果：'+t.op);
 }return true;},
 chosen(s,t,v){if(!t.op.startsWith('g64_'))return false;switch(t.op){case'g64_CloneVice':discard(s,t,v);break;case'g64_Reef':if(v)put(s,task('g34_Draw',t.p,t.source,{n:3}));break;default:throw Error('未実装の定番選択：'+t.op);}return true;}
 };
}
