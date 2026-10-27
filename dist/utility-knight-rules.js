// Knight Magic repeats the effect during the same spell resolution, without recasting.
export function createUtilityKnightRules(api){
 const{card,cost,effective,power,creatures,put,task,choice,opt,targetOptions}=api;
 const follow=(t,op,more={})=>({...t,op:'g70_'+op,...more});
 const hasRace=(s,p,race)=>s.players[p].battle.some(x=>!x.sealed&&String(effective(x,s).race||'').includes(race));
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed);
 const currentPower=(s,x)=>power(x,x.uid===s.attack?.attacker||s.attackLifecycle?.uid===x.uid&&(s.attackLifecycle.incarnation||0)===(x.incarnation||0),s);
 const winsDraw=(s,p)=>living(s,p).some(x=>effective(x,s).shako);
 const drawScore=(s,p,n)=>!n?0:n<s.players[p].deck.length?n*5:winsDraw(s,p)&&n>0?100:-100;
 const magic={
  Zanzibar:[{op:'g70_Phantom'}],
  Soul:[{op:'g34_Select',origin:'grave',to:'hand',n:1,filter:{creature:true},title:'墓地から手札に戻すクリーチャーを1体選ぶ'}],
  Glory:[{op:'g34_Look',n:3,public:true,stages:[{to:'hand',n:1,filter:{race:'ナイト'}}]}],
  Panda:[{op:'g34_Ramp',n:1}],
  Stream:[{op:'g70_StreamPick'}],
  Chain:[{op:'g70_ChainPick'}]
 };
 const body=(t,mode)=>magic[mode].map(d=>task(d.op,t.p,t.source,{uid:t.uid,...d}));
 const streamTargets=(s,p)=>targetOptions(s,p,[p,1-p].flatMap(q=>s.players[q].battle.filter(x=>!x.sealed&&(api.isCreature(s,x)||card(x).type==='gear'))));
 function repeatScore(s,t){switch(t.mode){
  case'Zanzibar':return targetOptions(s,t.p,living(s,1-t.p)).length?15:-10;
  case'Soul':return api.canMoveZone(s,t.p,'grave')&&s.players[t.p].grave.some(x=>card(x).type==='creature')?15:-10;
  case'Glory':return !api.deckLocked(s,t.p)&&s.players[t.p].deck.length>1?12:-10;
  case'Panda':return s.players[t.p].deck.length>1?12:-100;
  case'Stream':return streamTargets(s,t.p).some(o=>s.players[1-t.p].battle.some(x=>x.uid===o.value))?15:-10;
  case'Chain':return targetOptions(s,t.p,living(s,1-t.p)).some(o=>!s.players[1-t.p].battle.find(x=>x.uid===o.value).tapped)?12:-10;
  case'Open':return s.players[t.p].deck.length>1||winsDraw(s,t.p)?10:0;
  default:return s.players[1-t.p].hand.length?10:0;
 }}
 function bounce(s,t){const moves=t.selected.filter(r=>s.players[r.p].battle.some(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation)).map(r=>({player:r.p,uid:r.uid,to:'hand',destroy:false,controller:t.p}));if(moves.length)api.move(s,moves);}
 function run(s,t){if(!t.op.startsWith('g70_'))return false;const own=s.players[t.p];switch(t.op){
 case'g70_Phantom':choice(s,t,'このターン、パワーを2000下げる相手を1体選ぶ',targetOptions(s,t.p,living(s,1-t.p)).map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,score:o.score+(currentPower(s,x)<=2000?25:0)};}));break;
 case'g70_Mirage':if(hasRace(s,t.p,'サイバーロード'))choice(s,t,'ミラージュ・マーメイド：カードを3枚引く？',[opt('3枚引く',true,drawScore(s,t.p,3)),opt('引かない',false,0)]);break;
 case'g70_Open':put(s,follow(t,'Draw',{n:2}),follow(t,'Knight',{mode:'Open'}));break;
 case'g70_Bullet':put(s,task('discard',1-t.p,t.source,{causedBy:t.p,n:1}),follow(t,'Knight',{mode:'Bullet'}));break;
 case'g70_Zanzibar':case'g70_Soul':case'g70_Glory':case'g70_Panda':case'g70_Stream':case'g70_Chain':{const mode=t.op.slice(4);put(s,...body(t,mode),follow(t,'Knight',{mode}));break;}
 case'g70_StreamPick':choice(s,t,'手札に戻すクリーチャーまたはクロスギアを1つ選ぶ',streamTargets(s,t.p).map(o=>{const own=s.players[t.p].battle.some(x=>x.uid===o.value);return{...o,label:(own?'自分':'相手')+' '+o.label,score:own?-5-o.score:10+o.score};}));break;
 case'g70_ChainPick':choice(s,t,'タップする相手のクリーチャーを1体選ぶ',targetOptions(s,t.p,living(s,1-t.p)).map(o=>{const x=s.players[1-t.p].battle.find(x=>x.uid===o.value);return{...o,label:o.label+'（'+(x.tapped?'タップ中':'アンタップ')+'）',score:x.tapped?-5:10+o.score};}));break;
 case'g70_Draw':choice(s,t,'魔弾オープン・ブレイン：カードを2枚まで引く',Array.from({length:t.n+1},(_,n)=>opt(n+'枚',n,drawScore(s,t.p,n))));break;
 case'g70_Knight':if(hasRace(s,t.p,'ナイト'))choice(s,t,'ナイト・マジック：効果をもう一度使う？',[opt('もう一度使う',true,repeatScore(s,t)),opt('使わない',false,0)]);break;
 case'g70_Clone':{const copies=s.players.reduce((n,p)=>n+p.grave.filter(x=>card(x).name===card(t.source).name).length,0);put(s,follow(t,'ClonePick',{max:1+copies,selected:[]}));break;}
 case'g70_ClonePick':{const list=[t.p,1-t.p].flatMap(p=>living(s,p)).filter(x=>!t.selected.some(r=>r.uid===x.uid)),options=targetOptions(s,t.p,list);if(t.selected.length>=t.max||!options.length){bounce(s,t);break;}choice(s,t,'手札に戻すクリーチャーを選ぶ（'+t.selected.length+'/'+t.max+'、最低1体）',[...options.map(o=>{const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===o.value));return{...o,label:(owner===t.p?'自分':'相手')+' '+o.label,score:owner===t.p?-5-o.score:10+o.score};}),...(t.selected.length?[opt('ここまでで確定',null,0)]:[])]);break;}
 default:throw Error('未実装のナイト・選択効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g70_'))return false;switch(t.op){
 case'g70_Phantom':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)(x.powerModifiers??=[]).push({amount:-2000,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});break;}
 case'g70_Mirage':if(v)api.draw(s,t.p,3);break;
 case'g70_Draw':api.draw(s,t.p,v);break;
 case'g70_Knight':if(v)put(s,...(magic[t.mode]?body(t,t.mode):t.mode==='Open'?[follow(t,'Draw',{n:2})]:[task('discard',1-t.p,t.source,{causedBy:t.p,n:1})]));break;
 case'g70_StreamPick':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'hand',destroy:false,controller:t.p}]);}break;
 case'g70_ChainPick':if(v)api.tap(s,1-t.p,s.players[1-t.p].battle.find(x=>x.uid===v));break;
 case'g70_ClonePick':if(v){const owner=s.players.findIndex(p=>p.battle.some(x=>x.uid===v)),x=s.players[owner]?.battle.find(x=>x.uid===v);if(x)put(s,follow(t,'ClonePick',{selected:[...t.selected,{p:owner,uid:x.uid,incarnation:x.incarnation||0}]}));}else bounce(s,t);break;
 default:throw Error('未実装のナイト・対象選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid){if(!c.g70Effect)return false;put(s,task('g70_'+c.g70Effect,p,c.id,{uid}));return true;}};
}
