// Printed costs remain intact; grave counts are evaluated when the ability resolves.
export function createUtilityGraveKnights(api){
 const{card,faces,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const spells=(s,p)=>s.players[p].grave.filter(x=>faces(card(x)).some(c=>c.type==='spell')).length;
 const weaken=(s,x,n)=>(x.powerModifiers??=[]).push({amount:-n,expires:'end',who:s.active});
 function run(s,t){if(!t.op.startsWith('g86_'))return false;switch(t.op){
 case'g86_Fernando':{const n=spells(s,t.p)*1000;choice(s,{...t,amount:n},'パワーを-'+n+'する相手のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,living(s,1-t.p)).map(o=>({...o,score:(api.power(s.players[1-t.p].battle.find(x=>x.uid===o.value),false,s)<=n?40:0)+o.score})));break;}
 case'g86_Sazan':for(const x of living(s,1-t.p))weaken(s,x,1000);break;
 default:throw Error('未実装の墓地・ナイト補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g86_'))return false;switch(t.op){
 case'g86_Fernando':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)weaken(s,x,t.amount);break;}
 default:throw Error('未実装の墓地・ナイト補助選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g86Effect)return false;put(s,task('g86_'+c.g86Effect,p,c.id,{uid}));return true;},
 decorate(s,p,x,c){return c.g86Abzo?{...c,power:c.power+s.players[p].grave.filter(x=>card(x).type==='creature').length*2000}:c;},
 discount:(s,p,c)=>c.g86Fernando?spells(s,p):0,
 attack(s,p,x){if(api.selfStopped(s,p))return;const c=effective(x,s);if(c.g86Fernando)api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g86_Fernando',p,x.cardId)});if(c.g86Zangiras)api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g34_Select',p,x.cardId,{origin:'grave',n:1,optional:true,deploy:true,filter:{creature:true,color:'闇',max:3},title:'墓地から出す闇のコスト3以下のクリーチャーを1体まで選ぶ'})});}};
}
