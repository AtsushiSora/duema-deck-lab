// Reusable spells and defensive choices retain exact physical card identities.
export function createUtilityTacticsRules(api){
 const{card,faces,cost,put,task,choice,opt}=api;
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g57_'+op,...more});
 const liveCreatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 function nextOrder(s,t){const own=s.players[t.p],remaining=t.ids.filter(uid=>!t.ordered.includes(uid)&&own.hand.some(x=>x.uid===uid));
  if(remaining.length>1){choice(s,t,'山札の下に置く手札を順に選ぶ（'+t.ordered.length+'/'+t.ids.length+'）',remaining.map(uid=>{const x=own.hand.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));return;}
  const xs=[...t.ordered,...remaining].map(uid=>api.remove(own.hand,uid)).filter(Boolean);for(const x of xs)api.clear(x,'deck');own.deck.push(...xs);api.log(s,t.p,'handExchange',card(t.source).name+'：手札'+xs.length+'枚を山札の下へ戻した',{cardId:t.source});api.draw(s,t.p,xs.length);
 }
 function eternalRows(s,t){return [0,1].flatMap(p=>api.visibleBattleCards(s,p).flatMap(top=>api.layers(top).filter(x=>(x.faceDown||!api.isEvolution(x))&&(x.faceDown?0:Math.min(...(x===top?[api.effective(x,s)]:faces(card(x))).map(cost)))<=6).filter(x=>x!==top||x.faceDown||api.targetable(s,t.p,p,top)).map(x=>({p,x,top}))));}
 function run(s,t){if(!t.op.startsWith('g57_'))return false;const own=s.players[t.p];switch(t.op){
 case'g57_Cyclika':{const rows=api.canMoveZone(s,t.p,'grave')?own.grave.flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&cost(c)<=7&&api.canCast(s,t.p,c,'grave')?[opt(c.name,{uid:x.uid,face},20+cost(c),x.cardId)]:[])):[];if(rows.length)choice(s,t,'墓地からコスト7以下の呪文を1枚まで無料で唱える',[...rows,opt('唱えない',null,0)]);break;}
 case'g57_Janit':{const rows=[0,1].flatMap(p=>liveCreatures(s,p).filter(x=>x.uid!==t.uid&&cost(api.effective(x,s))<=3));const options=api.targetOptions(s,t.p,rows).map(o=>({...o,score:s.players[t.p].battle.some(x=>x.uid===o.value)?-10:o.score+10}));if(options.length)choice(s,t,'手札へ戻すコスト3以下の他のクリーチャーを1体まで選ぶ',[...options,opt('戻さない',null,0)]);break;}
 case'g57_Deadly':{const rows=liveCreatures(s,t.p);if(rows.length)choice(s,t,'自分のクリーチャーを1体破壊して、相手の1体を破壊する？',[...rows.map(x=>opt(card(x).name,x.uid,s.players[1-t.p].battle.length?20-cost(card(x)):-20,x.cardId)),opt('破壊しない',null,0)]);break;}
 case'g57_DeadlyTarget':choice(s,t,'破壊する相手のクリーチャーを1体選ぶ',api.targetOptions(s,t.p,liveCreatures(s,1-t.p)));break;
 case'g57_Next':if(own.hand.length)choice(s,t,'手札すべてを山札の下へ戻し、同じ枚数引く？',[opt('手札を入れ替える',true,own.deck.length>own.hand.length?10:-20),opt('入れ替えない',null,0)]);break;
 case'g57_NextOrder':nextOrder(s,t);break;
 case'g57_Doubletail':{const angel=liveCreatures(s,t.p).some(x=>String(api.effective(x,s).race).includes('エンジェル・コマンド'));choice(s,t,'ヘブンズ・ダブルテイル：効果を選ぶ',[opt('相手を2体までタップ','tap',liveCreatures(s,1-t.p).filter(x=>!x.tapped).length*8),opt('シールドを1つ追加','shield',own.deck.length>1?15:-100),...(angel?[opt('両方を使う','both',own.deck.length>1?30:-100)]:[])]);break;}
 case'g57_DoubleTap':{const rows=liveCreatures(s,1-t.p).filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=2||!rows.length){for(const uid of t.selected){const x=s.players[1-t.p].battle.find(x=>x.uid===uid);if(x)api.tap(s,1-t.p,x);}break;}choice(s,t,'タップする相手を2体まで選ぶ（'+t.selected.length+'/2）',[...api.targetOptions(s,t.p,rows).map(o=>({...o,score:s.players[1-t.p].battle.find(x=>x.uid===o.value)?.tapped?-5:o.score+10})),opt('この内容でタップ',null,t.selected.length?5:0)]);break;}
 case'g57_Shield':api.shieldTop(s,t.p,card(t.source));break;
 case'g57_Eternal':{let rows=eternalRows(s,t);const forced=rows.filter(r=>r.p!==t.p&&r.x===r.top&&!r.x.faceDown&&api.isCreature(s,r.x)&&api.effective(r.x,s).forceTarget);if(forced.length)rows=forced;choice(s,t,'シールドにするコスト6以下の進化ではないカードを1枚選ぶ',rows.map(({p,x,top})=>{const c=x.faceDown?card('face-down-seal'):card(x);return opt(c.name,{p,uid:x.uid,top:top.uid},p===t.p?-10:15+cost(c),c.id);}));break;}
 default:throw Error('未実装の戦術ユーティリティ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g57_'))return false;const own=s.players[t.p];switch(t.op){
 case'g57_Cyclika':{const x=v&&own.grave.find(x=>x.uid===v.uid),c=x&&faces(card(x))[v.face];if(x&&c?.type==='spell'&&cost(c)<=7&&api.canMoveZone(s,t.p,'grave')&&api.canCast(s,t.p,c,'grave')){x.finishTo='hand';api.cast(s,t.p,x.uid,true,null,v.face,null,'grave','スペルサイクリカ');}break;}
 case'g57_Janit':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v));if(p>=0)api.move(s,[{player:p,uid:v,to:'hand',destroy:false,controller:t.p}]);}break;
 case'g57_Deadly':if(v&&own.battle.some(x=>x.uid===v&&!x.sealed)){queue(s,t,'DeadlyTarget');api.move(s,[{player:t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);}break;
 case'g57_DeadlyTarget':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true,controller:t.p}]);break;
 case'g57_Next':if(v)queue(s,t,'NextOrder',{ids:own.hand.map(x=>x.uid),ordered:[]});break;
 case'g57_NextOrder':queue(s,t,'NextOrder',{ordered:[...t.ordered,v]});break;
 case'g57_Doubletail':put(s,...(['tap','both'].includes(v)?[{...t,op:'g57_DoubleTap',selected:[]}]:[]),...(['shield','both'].includes(v)?[{...t,op:'g57_Shield'}]:[]));break;
 case'g57_DoubleTap':if(v)queue(s,t,'DoubleTap',{selected:[...t.selected,v]});else for(const uid of t.selected){const x=s.players[1-t.p].battle.find(x=>x.uid===uid);if(x)api.tap(s,1-t.p,x);}break;
 case'g57_Eternal':{const r=v&&eternalRows(s,t).find(r=>r.p===v.p&&r.x.uid===v.uid&&r.top.uid===v.top);if(r)api.moveBattleCard(s,r.p,r.x.uid,'shields');break;}
 default:throw Error('未実装の戦術ユーティリティ選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid,entry){if(!c.g57Effect)return false;put(s,task('g57_'+c.g57Effect,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;}};
}
