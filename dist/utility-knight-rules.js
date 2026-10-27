// Knight Magic repeats the effect during the same spell resolution, without recasting.
export function createUtilityKnightRules(api){
 const{card,cost,effective,power,creatures,put,task,choice,opt,targetOptions}=api;
 const follow=(t,op,more={})=>({...t,op:'g70_'+op,...more});
 const hasRace=(s,p,race)=>s.players[p].battle.some(x=>!x.sealed&&String(effective(x,s).race||'').includes(race));
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const currentPower=(s,x)=>power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 const winsDraw=(s,p)=>living(s,p).some(x=>effective(x,s).shako);
 const drawScore=(s,p,n)=>!n?0:n<s.players[p].deck.length?n*5:winsDraw(s,p)&&n>0?100:-100;
 function bounce(s,t){const moves=t.selected.filter(r=>s.players[r.p].battle.some(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation)).map(r=>({player:r.p,uid:r.uid,to:'hand',destroy:false,controller:t.p}));if(moves.length)api.move(s,moves);}
 function run(s,t){if(!t.op.startsWith('g70_'))return false;const own=s.players[t.p];switch(t.op){
 case'g70_Phantom':choice(s,t,'このターン、パワーを2000下げる相手を1体選ぶ',targetOptions(s,t.p,living(s,1-t.p)).map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,score:o.score+(currentPower(s,x)<=2000?25:0)};}));break;
 case'g70_Mirage':if(hasRace(s,t.p,'サイバーロード'))choice(s,t,'ミラージュ・マーメイド：カードを3枚引く？',[opt('3枚引く',true,drawScore(s,t.p,3)),opt('引かない',false,0)]);break;
 case'g70_Open':put(s,follow(t,'Draw',{n:2}),follow(t,'Knight',{mode:'Open'}));break;
 case'g70_Bullet':put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:1}),follow(t,'Knight',{mode:'Bullet'}));break;
 case'g70_Draw':choice(s,t,'魔弾オープン・ブレイン：カードを2枚まで引く',Array.from({length:t.n+1},(_,n)=>opt(n+'枚',n,drawScore(s,t.p,n))));break;
 case'g70_Knight':if(hasRace(s,t.p,'ナイト'))choice(s,t,'ナイト・マジック：効果をもう一度使う？',[opt('もう一度使う',true,t.mode==='Open'?(own.deck.length>1||winsDraw(s,t.p)?10:0):s.players[1-t.p].hand.length?10:0),opt('使わない',false,0)]);break;
 case'g70_Clone':{const copies=s.players.reduce((n,p)=>n+p.grave.filter(x=>card(x).name===card(t.source).name).length,0);put(s,follow(t,'ClonePick',{max:1+copies,selected:[]}));break;}
 case'g70_ClonePick':{const list=[t.p,1-t.p].flatMap(p=>living(s,p)).filter(x=>!t.selected.some(r=>r.uid===x.uid)),options=targetOptions(s,t.p,list);if(t.selected.length>=t.max||!options.length){bounce(s,t);break;}choice(s,t,'手札に戻すクリーチャーを選ぶ（'+t.selected.length+'/'+t.max+'、最低1体）',[...options.map(o=>{const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value));return{...o,label:(owner===t.p?'自分':'相手')+' '+o.label,score:owner===t.p?-5-o.score:10+o.score};}),...(t.selected.length?[opt('ここまでで確定',null,0)]:[])]);break;}
 default:throw Error('未実装のナイト・選択効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g70_'))return false;switch(t.op){
 case'g70_Phantom':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:-2000,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});break;}
 case'g70_Mirage':if(v)api.draw(s,t.p,3);break;
 case'g70_Draw':api.draw(s,t.p,v);break;
 case'g70_Knight':if(v)put(s,...(t.mode==='Open'?[follow(t,'Draw',{n:2})]:[task('discard',1-t.p,t.source,{causedBy:t.p,n:1})]));break;
 case'g70_ClonePick':if(v){const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===v)),x=s.players[owner]?.battle.find(x=>x.uid===v);if(x)put(s,follow(t,'ClonePick',{selected:[...t.selected,{p:owner,uid:x.uid,incarnation:x.incarnation||0}]}));}else bounce(s,t);break;
 default:throw Error('未実装のナイト・対象選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g70Effect)return false;put(s,task('g70_'+c.g70Effect,p,c.id,{uid}));return true;}};
}
