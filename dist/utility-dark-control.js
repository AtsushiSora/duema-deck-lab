// Choice ownership is separate from effect control; death watchers retain simultaneous-event LKI.
export function createUtilityDarkControl(api){
 const{card,effective,creatures,put,task,choice,opt,targetOptions}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed),key=x=>x.uid+'@'+(x.incarnation||0);
 const follow=(t,op,more={})=>({...t,op:'g78_'+op,...more});
 const queue=(s,p,x,t)=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:t});
 function destroy(s,t){const refs=t.selected.filter(r=>s.players[t.p].battle.some(x=>key(x)===key(r)));if(refs.length)api.move(s,refs.map(r=>({player:t.p,uid:r.uid,to:'grave',destroy:true,controller:t.controller})));}
 function finishOrder(s,t,ids){const own=s.players[t.p],xs=ids.map(uid=>api.remove(own.deck,uid)).filter(Boolean);own.deck.push(...xs);}
 function run(s,t){if(!t.op.startsWith('g78_'))return false;const own=s.players[t.p];switch(t.op){
 case'g78_Orzekia':put(s,follow(t,'Sacrifice',{n:1,selected:[]}),follow(t,'Sacrifice',{p:1-t.p,n:2,selected:[]}));break;
 // The latest printed wording destroys the controller's creature first, then the opponent's.
 case'g78_Dio':put(s,follow(t,'Sacrifice',{controller:t.p,n:1,selected:[]}),follow(t,'Sacrifice',{controller:t.p,p:1-t.p,n:1,selected:[]}));break;
 case'g78_Sacrifice':{const options=targetOptions(s,t.p,living(s,t.p).filter(x=>!t.selected.some(r=>r.uid===x.uid)));if(t.selected.length>=t.n||!options.length){destroy(s,t);break;}choice(s,t,'破壊する自分のクリーチャーを'+t.n+'体選ぶ（'+t.selected.length+'/'+t.n+'）',options.map(o=>({...o,score:-o.score+(card(o.cardId).g78Fly?15:0)})));break;}
 case'g78_Gajira':choice(s,t,'墓地に置く相手のシールドを1つ選ぶ（S・トリガーは使えません）',s.players[1-t.p].shields.filter(x=>!api.shieldCards(x).some(y=>y.g37ShieldHeld)).map((x,i)=>opt('シールド '+(i+1)+'（カード'+api.shieldCards(x).length+'枚）',x.uid,api.shieldCards(x).length)));break;
 case'g78_Alexei':{const options=targetOptions(s,t.p,[t.p,1-t.p].flatMap(p=>s.players[p].battle.filter(x=>!x.sealed&&(card(x).type==='gear'||/サムライ/.test(effective(x,s).race||'')))));choice(s,t,'山札の一番下に戻すサムライまたはクロスギアを1つまで選ぶ',[...options.map(o=>({...o,label:(own.battle.some(x=>x.uid===o.value)?'自分：':'相手：')+o.label,score:own.battle.some(x=>x.uid===o.value)?-10-o.score:15+o.score})),opt('戻さない',null,0)]);break;}
 case'g78_BottomOrder':{const rows=t.rows.filter(r=>own.deck.some(x=>x.uid===r.uid)&&!t.ordered.includes(r.uid));if(rows.length>1)choice(s,t,'山札の下に置く順に選ぶ（新しく置くカードのみ）',rows.map(r=>opt(r.label,r.uid,0,r.cardId)));else finishOrder(s,t,[...t.ordered,...rows.map(r=>r.uid)]);break;}
 default:throw Error('未実装の闇の妨害効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g78_'))return false;switch(t.op){
 case'g78_Sacrifice':{const x=s.players[t.p].battle.find(x=>x.uid===v);if(x)put(s,follow(t,'Sacrifice',{selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}]}));break;}
 case'g78_Gajira':if(v)api.moveShield(s,1-t.p,v,'grave');break;
 case'g78_Alexei':if(v){const p=s.players.findIndex(p=>p.battle.some(x=>x.uid===v)),x=s.players[p]?.battle.find(x=>x.uid===v);if(x){const rows=api.allLayers(x).map((y,i)=>({uid:y.uid,label:y.faceDown?'裏向きのカード '+(i+1):card(y).name,cardId:y.faceDown?null:y.cardId}));put(s,follow(t,'BottomOrder',{p,rows,ordered:[],newCards:true}));api.move(s,[{player:p,uid:v,to:'deck',destroy:false,controller:t.p}]);}}break;
 case'g78_BottomOrder':put(s,follow(t,'BottomOrder',{ordered:[...t.ordered,v]}));break;
 default:throw Error('未実装の闇の妨害選択：'+t.op);
 }return true;}
 function snapshot(s){return [0,1].flatMap(p=>living(s,p).map(x=>({p,uid:x.uid,incarnation:x.incarnation||0,cardId:x.cardId,fly:!!effective(x,s).g78Fly,flyCount:Number(effective(x,s).g78Fly)||0,train:!!effective(x,s).g78Train})));}
 return{run,chosen,snapshot,effect(s,p,c,uid){if(!c.g78Effect)return false;put(s,task('g78_'+c.g78Effect,p,c.id,{uid}));return true;},
 attack(s,p,x){if(effective(x,s).g78Jelly&&!api.selfStopped(s,p))queue(s,p,x,task('discard',1-p,x.cardId,{n:1,random:true,causedBy:p}));},
 leaving(s,p,x,before,to,destroy){if(to!=='grave'||!destroy)return;const rows=before||snapshot(s),victim=rows.find(y=>y.p===p&&key(y)===key(x));if(!victim)return;if(victim.fly)queue(s,p,victim,task('discard',1-p,x.cardId,{n:victim.flyCount||1,random:true,causedBy:p}));
  // A Star evolution may reveal a previously ignored watcher as its top leaves.
  const watchers=[...rows.filter(y=>y.train),...snapshot(s).filter(y=>y.train&&!rows.some(r=>r.p===y.p&&key(r)===key(y)))];
  for(const y of watchers)if(y.p!==p||key(y)!==key(x))queue(s,y.p,y,task('g34_Draw',y.p,y.cardId,{n:1,optional:true}));
 }};
}
