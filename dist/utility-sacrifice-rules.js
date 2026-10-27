// Follow-up instructions remain queued when the first instruction has no valid target.
export function createUtilitySacrificeRules(api){
 const{card,effective,power,creatures,put,task,choice,opt,targetOptions}=api;
 const follow=(t,op,more={})=>({...t,op:'g68_'+op,...more});
 const currentPower=(s,x)=>power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 function run(s,t){if(!t.op.startsWith('g68_'))return false;const own=s.players[t.p];switch(t.op){
 case'g68_Wyvern':{const rows=[0,1].flatMap(p=>creatures(s,p).filter(x=>!x.sealed&&effective(x,s).blocker).map(x=>({player:p,uid:x.uid,to:'grave',destroy:true,controller:t.p})));if(rows.length)api.move(s,rows);break;}
 case'g68_Cross':put(s,follow(t,'CrossOpponent'));api.mill(s,t.p,2);break;
 case'g68_CrossOpponent':api.mill(s,1-t.p,2);break;
 case'g68_Flame':{put(s,task('g34_Draw',t.p,t.source,{n:2}));const rows=own.shields.filter(x=>api.shieldCards(x).some(y=>!y.g37ShieldHeld));if(rows.length)choice(s,t,'墓地に置く自分のシールドを1つ選ぶ（S・トリガーは使えません）',rows.map((x,i)=>opt('シールド '+(i+1)+'（カード'+api.shieldCards(x).length+'枚）',x.uid,-api.shieldCards(x).length)));break;}
 case'g68_Bakuretsu':put(s,follow(t,'BakuretsuTarget'),task('g66_ManaPick',t.p,t.source,{n:1,selected:[]}));break;
 case'g68_BakuretsuTarget':choice(s,t,'破壊するパワー5000以下の相手を1体選ぶ',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!x.sealed&&currentPower(s,x)<=5000)));break;
 default:throw Error('未実装のシールド・墓地効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g68_'))return false;switch(t.op){
 case'g68_Flame':if(v)api.moveShield(s,t.p,v,'grave');break;
 case'g68_BakuretsuTarget':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 default:throw Error('未実装のシールド・墓地選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g68Effect)return false;put(s,task('g68_'+c.g68Effect,p,c.id,{uid}));return true;}};
}
