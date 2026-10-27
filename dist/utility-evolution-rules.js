// Mandatory shield-count draws resolve before the independent optional bounce.
export function createUtilityEvolutionRules(api){
 const{card,effective,creatures,put,task,choice,opt,targetOptions}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const follow=(t,op,more={})=>({...t,op:'g79_'+op,...more});
 function run(s,t){if(!t.op.startsWith('g79_'))return false;switch(t.op){
 case'g79_Rush':{const n=Math.max(0,3-s.players[t.p].shields.length);put(s,...(n?[task('g34_Draw',t.p,t.source,{n})]:[]),follow(t,'Bounce'));break;}
 case'g79_Bounce':choice(s,t,'手札に戻すクリーチャーを1体まで選ぶ',[...targetOptions(s,t.p,[t.p,1-t.p].flatMap(p=>living(s,p))).map(o=>({...o,label:(s.players[t.p].battle.some(x=>x.uid===o.value)?'自分：':'相手：')+o.label,score:s.players[t.p].battle.some(x=>x.uid===o.value)?-10-o.score:15+o.score})),opt('戻さない',null,0)]);break;
 case'g79_Barom':{const rows=[0,1].flatMap(p=>living(s,p).filter(x=>!api.colors(effective(x,s)).includes('闇')).map(x=>({player:p,uid:x.uid,to:'grave',destroy:true,controller:t.p})));if(rows.length)api.move(s,rows);break;}
 default:throw Error('未実装の進化クリーチャー効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g79_'))return false;switch(t.op){
 case'g79_Bounce':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'hand',destroy:false,controller:t.p}]);}break;
 default:throw Error('未実装の進化クリーチャー選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g79Effect)return false;put(s,task('g79_'+c.g79Effect,p,c.id,{uid}));return true;},
 attack(s,p,x){if(effective(x,s).g79Bajura&&!api.selfStopped(s,p))api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g77_Fortress',p,x.cardId)});}};
}
