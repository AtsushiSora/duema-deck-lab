// Selecting a name in mana does not target any creature in the battle zone.
export function createUtilityNatureDeployment(api){
 const{card,cost,creatures,effective,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const attacking=(s,x)=>x.uid===s.attack?.attacker||x.uid===s.attackLifecycle?.uid&&(x.incarnation||0)===(s.attackLifecycle.incarnation||0);
 const name=c=>c.spellFace?c.name.split(/\s*[／/]\s*/)[0]:c.name;
 function run(s,t){if(!t.op.startsWith('g90_'))return false;const enemy=1-t.p;switch(t.op){
 case'g90_Gamila':put(s,task('g34_Select',enemy,t.source,{controller:t.controller??t.p,origin:'hand',n:1,optional:true,deploy:true,filter:{creature:true},title:'手札からバトルゾーンに出すクリーチャーを1体まで選ぶ'}));break;
 case'g90_Radia':{const names=new Set(),rows=[];for(const x of s.players[enemy].mana){const c=card(x),n=name(c);if(x.faceDown||c.type!=='creature'||api.isEvolution(x)||names.has(n))continue;names.add(n);const score=living(s,enemy).filter(y=>name(effective(y,s))===n).reduce((sum,y)=>sum+15+Math.min(cost(effective(y,s)),30),0);rows.push(opt(n,n,score,x.cardId));}choice(s,t,'相手のマナから進化ではないクリーチャーの名前を1つ選ぶ',rows);break;}
 case'g90_Bear':{const rows=living(s,enemy).filter(x=>api.power(x,attacking(s,x),s)<=2000).map(x=>({player:enemy,uid:x.uid,to:'mana',destroy:false,controller:t.controller??t.p}));if(rows.length)api.move(s,rows);break;}
 default:throw Error('未実装の自然の展開効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g90_'))return false;switch(t.op){
 case'g90_Radia':{const rows=living(s,1-t.p).filter(x=>name(effective(x,s))===v).map(x=>({player:1-t.p,uid:x.uid,to:'mana',destroy:false,controller:t.controller??t.p}));if(rows.length)api.move(s,rows);break;}
 default:throw Error('未実装の自然の展開選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g90Effect)return false;put(s,task('g90_'+c.g90Effect,p,c.id,{uid}));return true;}};
}
