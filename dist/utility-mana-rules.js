// Optional ramp resolves as a single instruction; upkeep belongs to each surviving creature.
export function createUtilityManaRules(api){
 const{put,task,choice,opt}=api;
 const creatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 function run(s,t){if(!t.op.startsWith('g59_'))return false;switch(t.op){
 case'g59_Romanesque':choice(s,t,'山札の上4枚をマナゾーンに置く？',[opt('4枚を置く',true,s.players[t.p].deck.length>4?25:-100),opt('置かない',null,0)]);break;
 case'g59_Wild':{const evolved=creatures(s,t.p).some(api.isEvolution),n=creatures(s,1-t.p).filter(x=>!api.isEvolution(x)).length,safe=s.players[t.p].deck.length>3;choice(s,t,'爆進イントゥ・ザ・ワイルド：効果を選ぶ',[opt('山札の上3枚をマナゾーンへ','ramp',safe?25:-100),opt('相手の進化ではない1体をマナゾーンへ','remove',n?30:-10),...(evolved?[opt('両方を使う','both',safe?50:-100)]:[])]);break;}
 case'g59_WildTarget':choice(s,t,'マナゾーンに置く相手の進化ではないクリーチャーを1体選ぶ',api.targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>!api.isEvolution(x))));break;
 default:throw Error('未実装のマナユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g59_'))return false;switch(t.op){
 case'g59_Romanesque':if(v)put(s,task('g34_Ramp',t.p,t.source,{n:4}));break;
 case'g59_Wild':put(s,...(['ramp','both'].includes(v)?[task('g34_Ramp',t.p,t.source,{n:3})]:[]),...(['remove','both'].includes(v)?[{...t,op:'g59_WildTarget'}]:[]));break;
 case'g59_WildTarget':if(v)api.move(s,[{player:1-t.p,uid:v,to:'mana',destroy:false,controller:t.p}]);break;
 default:throw Error('未実装のマナユーティリティ選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid){if(!c.g59Effect)return false;put(s,task('g59_'+c.g59Effect,p,c.id,{uid}));return true;},
 end(s){return creatures(s,s.active).filter(x=>api.effective(x,s).g59Romanesque).map(x=>({player:s.active,uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Select',s.active,x.cardId,{origin:'mana',to:'grave',n:1,optional:false,title:'ロマネスク：墓地に置く自分のマナを1枚選ぶ'})}));}
 };
}
