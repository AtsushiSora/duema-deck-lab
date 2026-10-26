// Saga recursion, deck evolution and spell ownership are tracked by physical UID.
export function createSagaChampionRules(api){
 const{card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,targetOptions}=api;
 const race=(c,q)=>String(c.race).includes(q),queue=(s,t,op,more={})=>put(s,{...t,op:'g45_'+op,...more});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g45_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const live=(s,t)=>s.players[t.p].battle.find(x=>api.layers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)));
 const manaCount=(s,p,color)=>s.players[p].mana.filter(y=>(s.players[p].battle.some(z=>(card(z).casablanca||card(z).g51Courtney)&&!api.ignored(s,z))?['光','水','闇','火','自然']:api.manaColors(card(y))).includes(color)).length;
 const allowed=(s,p,z)=>!api.canMoveZone||api.canMoveZone(s,p,z),count=(s,p,n)=>api.lookCount?api.lookCount(s,p,n):api.deckLocked(s,p)?0:n;
 const reserved=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 function reveal(s,t,n){const own=s.players[t.p],held=reserved(own),xs=own.deck.filter(x=>!held.has(x.uid)).slice(0,count(s,t.p,n));(own.g34Protected??=[]).push(...xs.map(x=>x.uid));api.log(s,t.p,'reveal',card(t.source).name+'で公開：'+xs.map(x=>card(x).name).join('・'),{cardId:t.source});return xs.map(x=>x.uid);}
 const release=(s,p,ids)=>s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(uid=>!ids.includes(uid));
 const canPut=(s,p,x,z)=>card(x).type==='creature'&&allowed(s,p,z)&&api.canEnter(s,p,card(x),{origin:z,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 function deploy(s,t,base=null){const own=s.players[t.p],x=own[t.origin||'grave'].find(x=>x.uid===t.target);if(!x||!canPut(s,t.p,x,t.origin||'grave'))return false;remove(own[t.origin||'grave'],x.uid);clear(x,'battle');api.enter(s,t.p,x,base,{origin:t.origin||'grave',execution:false});return true;}
 function optionsNumber(s,t,spell){const costs=[...new Set([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,99,...s.players[1-t.p].battle.map(x=>cost(effective(x,s)))])].filter(Number.isFinite).sort((a,b)=>a-b);choice(s,{...t,op:'g9Number',g45Mode:spell?'Number':'Deal'},'数字を1つ選ぶ（数字の入力もできます）',[...costs.map(n=>opt(n==='∞'?'無限':String(n),n,spell?(n===3?10:0):creatures(s,1-t.p).filter(x=>cost(effective(x,s))===n).reduce((v,x)=>v+10+cost(card(x)),0))),opt('無限を宣言','∞',0)]);}
 function run(s,t){if(!t.op.startsWith('g45_'))return false;const own=s.players[t.p],opp=s.players[1-t.p],x=live(s,t);switch(t.op){
 case'g45_Saga':put(s,task('draw',t.p,t.source,{n:1}),task('discard',t.p,t.source,{n:1,causedBy:t.p}),{...t,op:'g45_SagaPick'});break;
 case'g45_SagaPick':if(own.grave.filter(y=>card(y).type==='creature').length>=3){const rows=own.grave.filter(y=>cost(card(y))<=5&&(race(card(y),'ゴッド')||race(card(y),'オリジン'))&&canPut(s,t.p,y,'grave'));choice(s,t,'サガ：墓地からコスト5以下のゴッドかオリジンを出す？',[...rows.map(y=>opt(card(y).name,y.uid,card(y).g45MDeck?70:card(y).g45Babylonia&&!own.battle.some(y=>effective(y,s).g45Babylonia)?55:card(y).g45Saga?own.deck.length>6?30:-100:25+cost(card(y)),y.cardId)),skip()]);}break;
 case'g45_Put':{const y=own[t.origin||'grave'].find(y=>y.uid===t.target);if(y&&canPut(s,t.p,y,t.origin||'grave')){if(card(y).evolution&&!card(y).g45MDeck)choice(s,t,'出すクリーチャーの進化元を選ぶ',api.evolutionBases(s,t.p,card(y)).map(b=>opt(card(b).name,b.uid,10,b.cardId)));else deploy(s,t);}break;}
 case'g45_SagaAfter':if(x&&own.battle.some(y=>api.layers(y).some(z=>z.uid===t.target&&(z.incarnation||0)>t.targetIncarnation)))move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true}]);break;
 case'g45_Babylonia':choice(s,t,'相手の手札を見て、山札の下に戻すカードを1枚選ぶ',opp.hand.map(y=>opt(card(y).name,y.uid,20+cost(card(y)),y.cardId)));if(!opp.hand.length)api.draw(s,1-t.p,1);break;
 case'g45_BruceRevive':{const rows=own.grave.filter(y=>cost(card(y))<=3&&canPut(s,t.p,y,'grave'));choice(s,t,'墓地からコスト3以下のクリーチャーを1体出す',rows.map(y=>opt(card(y).name,y.uid,30+cost(card(y)),y.cardId)));break;}
 case'g45_Interrogate':api.log(s,t.p,'look','相手の手札を確認：'+opp.hand.map(y=>card(y).name).join('・'),{cardId:t.source});choice(s,t,'相手のコスト3以下の手札を1枚選ぶ',opp.hand.filter(y=>faces(card(y)).some(c=>cost(c)<=3)).map(y=>opt(card(y).name,y.uid,20+Math.min(...faces(card(y)).map(cost)),y.cardId)));break;
 case'g45_Typhoon':put(s,task('draw',t.p,t.source,{n:2}),task('discard',t.p,t.source,{n:1,causedBy:t.p}));break;
 case'g45_Deal':optionsNumber(s,t,false);break;
 case'g45_Number':optionsNumber(s,t,true);break;
 case'g45_Dinner':choice(s,t,'破壊する自分のクリーチャーを1体選ぶ',creatures(s,t.p).map(y=>opt(card(y).name,{uid:y.uid,cost:cost(effective(y,s))},own.grave.some(z=>cost(card(z))===cost(effective(y,s))+1)?35-cost(card(y)):-cost(card(y)),y.cardId)));break;
 case'g45_DinnerPick':{const rows=own.grave.filter(y=>cost(card(y))===t.cost+1&&canPut(s,t.p,y,'grave'));choice(s,t,'破壊したクリーチャーよりコストが1大きいクリーチャーを墓地から出す',rows.map(y=>opt(card(y).name,y.uid,30+cost(card(y)),y.cardId)));break;}
 case'g45_Shaper':{const ids=reveal(s,t,4),all=ids.map(uid=>remove(own.deck,uid)).filter(Boolean),hand=all.filter(y=>api.manaColors(card(y),s,t.p).includes('水')),grave=all.filter(y=>!hand.includes(y));for(const y of hand)clear(y,'hand');for(const y of grave)clear(y,'grave');release(s,t.p,ids);if(hand.length)api.addZone(s,t.p,'hand',...hand);if(grave.length)api.addZone(s,t.p,'grave',...grave);api.deckCheck(s,t.p);break;}
 case'g45_Invitation':put(s,task('g34_Target',t.p,t.source,{element:true,filter:{max:4},to:'deck',title:'山札の下に置く相手のコスト4以下のエレメントを選ぶ'}));break;
 case'g45_Woz':queue(s,t,'WozPick',{selected:[]});break;
 case'g45_WozPick':{const rows=[0,1].flatMap(owner=>allowed(s,owner,'grave')?s.players[owner].grave.flatMap(y=>faces(card(y)).flatMap((c,face)=>c.type==='spell'&&cost(c)<=3&&!(t.selected||[]).some(r=>r.uid===y.uid)&&api.canCast(s,t.p,c,owner===t.p?'grave':null)?[{y,c,face,owner}]:[])):[]);if(t.selected.length>=2||!rows.length){queue(s,t,'WozNext');break;}choice(s,t,'両プレイヤーの墓地からコスト3以下の呪文を2枚まで選ぶ',[...rows.map(({y,c,face,owner})=>opt((owner===t.p?'自分：':'相手：')+c.name,{uid:y.uid,face,owner},25+cost(c),y.cardId)),opt('この内容で唱える',null,0)]);break;}
 case'g45_WozNext':{const rows=t.selected.filter(r=>s.players[r.owner].grave.some(y=>y.uid===r.uid)&&allowed(s,r.owner,'grave'));if(!rows.length)break;choice(s,{...t,selected:rows},'次に唱える呪文を選ぶ',rows.map(r=>{const y=s.players[r.owner].grave.find(y=>y.uid===r.uid);return opt(faces(card(y))[r.face].name,r,20,y.cardId);}));break;}
 case'g45_MDeck':{const held=own.g31Holding.find(y=>y.uid===t.uid);if(!held)break;const ids=reveal(s,t,3),rows=ids.map(uid=>own.deck.find(y=>y.uid===uid)).filter(y=>card(y).type==='creature');if(!rows.length){finishMDeck(s,{...t,ids},null);break;}choice(s,{...t,ids},'Mデッキ進化：公開した3枚から進化元クリーチャーを1体選ぶ',rows.map(y=>opt(card(y).name,y.uid,10+cost(card(y)),y.cardId)));break;}
 case'g45_MLink':{const rows=creatures(s,t.p).filter(y=>![y,...(y.godLinks||[])].some(z=>card(z.cardId).g45MDeck)&&[y,...(y.godLinks||[])].some(z=>['邪神R・ロマノフ','邪神C・ロマノフ'].includes(card(z.cardId).name)));if(rows.length)choice(s,t,'ロマノフとG・リンクして出す？',[...rows.map(y=>opt(card(y).name+'とG・リンク',y.uid,35,y.cardId)),skip()]);else finishMEntry(s,t,null);break;}
 case'g45_Meteor':{if(!x)break;const parts=[x,...(x.godLinks||[])],rows=parts.flatMap(y=>(y.under||[]).flatMap(api.layers));if(rows.length)choice(s,t,'メテオバーン：M・ロマノフの下のカードを1枚墓地に置く？',[...rows.map(y=>opt(card(y).name,y.uid,30,y.cardId)),skip()]);break;}
 case'g45_ManaSpell':{const rows=allowed(s,t.p,'mana')?own.mana.flatMap(y=>faces(card(y)).flatMap((c,face)=>c.type==='spell'&&cost(c)<=6&&colors(c).some(c=>['火','闇'].includes(c))&&api.canCast(s,t.p,c,'mana')?[{y,c,face}]:[])):[];choice(s,t,'マナから唱える火または闇のコスト6以下の呪文を選ぶ',rows.map(({y,c,face})=>opt(c.name,{uid:y.uid,face},30+cost(c),y.cardId)));break;}
 case'g45_Lemming':if(x){(x.powerModifiers??=[]).push({amount:4000,expires:'end',who:s.active});x.g45LemmingBreaker=s.turn;}break;
 default:throw Error('未実装のサガ大会効果：'+t.op);
 }return true;}
 function finishMDeck(s,t,base){const own=s.players[t.p],rows=t.ids.map(uid=>remove(own.deck,uid)).filter(Boolean),under=rows.find(y=>y.uid===base),grave=rows.filter(y=>y!==under);release(s,t.p,t.ids);for(const y of grave)clear(y,'grave');if(grave.length)api.addZone(s,t.p,'grave',...grave);const x=own.g31Holding.find(y=>y.uid===t.uid);if(!x)return;if(!under){remove(own.g31Holding,x.uid);clear(x,'hand');api.addZone(s,t.p,'hand',x);api.deckCheck(s,t.p);return;}clear(under,'battle');(x.under??=[]).push(under);queue(s,t,'MLink',{base:under.uid});}
 function finishMEntry(s,t,partner){const own=s.players[t.p],x=remove(own.g31Holding,t.uid);if(!x)return;const base=x.under?.[0];delete x.under;api.enter(s,t.p,x,null,{...t.options,g45MDeckReady:true,g45MDeckBase:base,g31Linked:true,g45MPartner:partner});api.deckCheck(s,t.p);}
 function chosen(s,t,v){if(t.op==='g9Number'&&t.g45Mode)t={...t,op:'g45_'+t.g45Mode};if(!t.op.startsWith('g45_'))return false;const own=s.players[t.p];switch(t.op){
 case'g45_SagaPick':if(v){const y=own.grave.find(y=>y.uid===v);if(y)put(s,{...t,op:'g45_Put',target:v},{...t,op:'g45_SagaAfter',target:v,targetIncarnation:y.incarnation||0});}break;
 case'g45_Put':deploy(s,t,v);break;
 case'g45_Babylonia':{const y=remove(s.players[1-t.p].hand,v);if(y){clear(y,'deck');api.addZone(s,1-t.p,'deck',y);}api.draw(s,1-t.p,1);break;}
 case'g45_BruceRevive':case'g45_DinnerPick':queue(s,t,'Put',{target:v});break;
 case'g45_Interrogate':put(s,task('discardChosen',1-t.p,t.source,{uid:v,n:1,causedBy:t.p}));break;
 case'g45_Deal':move(s,creatures(s,1-t.p).filter(y=>cost(effective(y,s))===(v==='∞'?Infinity:v)).map(y=>({player:1-t.p,uid:y.uid,to:'hand',destroy:false})));break;
 case'g45_Number':(s.extLimits??=[]).push({kind:'numberCast',g45Lucky:true,player:1-t.p,cost:v,expires:'start',who:t.p,active:true,source:t.source});break;
 case'g45_Dinner':queue(s,t,'DinnerPick',{cost:v.cost});move(s,[{player:t.p,uid:v.uid,to:'grave',destroy:true}]);break;
 case'g45_WozPick':if(v)queue(s,t,'WozPick',{selected:[...t.selected,v]});else queue(s,t,'WozNext');break;
 case'g45_WozNext':{const y=s.players[v.owner].grave.find(y=>y.uid===v.uid);if(!y)break;const face=faces(card(y))[v.face],origin=v.owner===t.p?'grave':'g31Holding';if(v.owner!==t.p){remove(s.players[v.owner].grave,y.uid);(own.g31Holding??=[]).push(y);}y.cardOwner=v.owner;y.finishTo='deck';put(s,{...t,op:'g45_WozNext',selected:t.selected.filter(r=>r.uid!==v.uid)});api.cast(s,t.p,y.uid,true,null,v.face,null,origin,'ウォズレックの能力');break;}
 case'g45_MDeck':finishMDeck(s,t,v);break;
 case'g45_MLink':finishMEntry(s,t,v);break;
 case'g45_Meteor':if(v){api.moveBattleCard(s,t.p,v,'grave');queue(s,t,'ManaSpell');}break;
 case'g45_ManaSpell':if(v)api.cast(s,t.p,v.uid,true,null,v.face,null,'mana','メテオバーン');break;
 default:throw Error('未実装のサガ大会選択：'+t.op);
 }return true;}
 return{run,chosen,
 linkM(s,p,x,options={}){if(!options.g45MPartner)return x;const own=s.players[p],base=own.battle.find(y=>y.uid===options.g45MPartner);if(!base||[base,...(base.godLinks||[])].some(y=>card(y.cardId).g45MDeck))return x;remove(own.battle,x.uid);(base.godLinks??=[]).push(x);api.log(s,p,'godLink',card(base).name+'とM・ロマノフをG・リンク',{cardId:x.cardId});return base;},
 allowedCast(s,p,c){return !['creature','spell'].includes(c.type)||!(s.extLimits||[]).some(l=>l.g45Lucky&&l.player===p&&cost(c)===(l.cost==='∞'?Infinity:l.cost));},
 effect(s,p,c,uid,entry){if(!c.g45Effect)return false;put(s,task('g45_'+c.g45Effect,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 beginMDeck(s,p,x,base,options={}){if(!card(x).g45MDeck||options.g45MDeckReady)return false;(s.players[p].g31Holding??=[]).push(x);put(s,task('g45_MDeck',p,x.cardId,{uid:x.uid,options}));return true;},
 start(s,p){return creatures(s,p).filter(x=>effective(x,s).g45Saga).map(x=>({player:p,uid:x.uid,source:x.cardId,effect:'extended',task:task('g45_Saga',p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0})}));},
 end(s){return creatures(s,s.active).filter(x=>effective(x,s).g45Bruce).map(x=>({player:s.active,uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Mill',s.active,x.cardId,{n:1,optional:true})}));},
 decorate(s,p,x,c){if(p<0)return c;if(c.g45Bruce&&s.players[p].grave.length<13)c={...c,noAttack:true};if(c.g45Kubrick&&manaCount(s,p,'火')>=3)c={...c,speedAttacker:true};if(x.g45LemmingBreaker===s.turn)c={...c,breaker:Math.max(2,Number(c.breaker)||1)};return c;},
 graveAdded(s,p,all){if(manaCount(s,p,'水')<3)return;for(const x of all)if(card(x).g45Kubrick)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g34_Target',p,x.cardId,{anyOwner:true,to:'hand',optional:true,title:'キューブリック：手札に戻すクリーチャーを1体まで選ぶ'})});},
 discarded(s,t,x,actual){if(actual)for(const y of creatures(s,t.p))if(effective(y,s).g45Lemming)on(s,t.p,y,'Lemming');},
 attack(s,p,x){if(api.selfStopped(s,p)||api.ignored(s,x))return;for(const y of [x,...(x.godLinks||[])])if(card(y.cardId).g45MDeck)on(s,p,x,'Meteor',{mUid:y.uid});},
 };
}
