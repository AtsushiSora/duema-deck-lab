// Cyberex lets the opponent choose just one lowest-power creature; tied minima are not all destroyed.
export function createUtility161Rules(api){
 const{card,power,put,task,choice,opt}=api,living=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 function run(s,t){if(!t.op.startsWith('g161_'))return false;const enemy=1-t.p;switch(t.op){
 case'g161_Cyber':{const rows=living(s,enemy),targets=api.targetOptions(s,t.p,rows);choice(s,t,'ボルシャック・サイバーエクス：使う効果を1つ選ぶ',[opt('相手が一番パワーの小さい1体を選んで破壊する','destroy',rows.length?25:0),opt('相手のクリーチャー1体を手札に戻す','bounce',targets.length?Math.max(...targets.map(o=>15+api.cost(card(o.cardId))*3)):0)]);break;}
 case'g161_Min':{const rows=living(s,enemy);if(!rows.length)break;const min=Math.min(...rows.map(x=>power(x,x.uid===s.attack?.attacker,s)));choice(s,{...t,p:enemy,owner:enemy,controller:t.p},'サイバーエクス：一番パワーの小さい自分のクリーチャーを1体選び、破壊する',api.targetOptions(s,enemy,rows.filter(x=>power(x,x.uid===s.attack?.attacker,s)===min)).map(o=>({...o,score:api.canLeave(s,enemy,rows.find(x=>x.uid===o.value))?20-api.cost(card(o.cardId)):100})));break;}
 default:throw Error('未対応の指定カード効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g161_'))return false;if(t.op==='g161_Cyber')put(s,v==='bounce'?task('g34_Target',t.p,t.source,{to:'hand',title:'手札に戻す相手のクリーチャー1体を選ぶ'}):task('g161_Min',t.p,t.source));else if(t.op==='g161_Min'&&v)api.move(s,[{player:t.owner,uid:v,to:'grave',destroy:true,controller:t.controller}]);return true;}
 return{run,chosen,effect(s,p,c,uid){if(c.g161Role!=='cyberex')return false;put(s,task('g161_Cyber',p,c.id,{uid}));return true;}};
}
