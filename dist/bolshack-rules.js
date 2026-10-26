import {policyRemove,policyLook} from './champion-zone-policy.js';
// Photo-deck effects: physical continuations, independent choices and delayed grants.
export function createBolshackRules(api){
 const{card,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,enter,cast,move,log,targetOptions}=api;
 const dragon=c=>String(c.race).includes('ドラゴン'),armored=c=>String(c.race).includes('アーマード');
 const key=x=>x.uid+'@'+(x.incarnation||0),live=(s,t)=>s.players[t.p].battle.find(x=>!x.sealed&&api.allLayers(x).some(y=>y.uid===t.uid&&(y.incarnation||0)===(t.incarnation||0)));
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const reserved=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 const release=(s,p,ids)=>{s.players[p].g29Protected=(s.players[p].g29Protected||[]).filter(x=>!ids.includes(x));};
 const pool=(s,t)=>(t.ids||[]).map(uid=>s.players[t.p].deck.find(x=>x.uid===uid)).filter(Boolean);
 function reveal(s,t,n,publicly=true){const own=s.players[t.p],skip=reserved(own),all=policyLook(s,t.p,n,own.deck.filter(x=>!skip.has(x.uid)),api);own.g29Protected=[...(own.g29Protected||[]),...all.map(x=>x.uid)];log(s,t.p,publicly?'reveal':'look',card(t.source).name+(publicly?'で公開：'+all.map(x=>card(x).name).join('・'):'：山札の上'+all.length+'枚を確認'),{cardId:t.source});return all.map(x=>x.uid);}
 const bases=(s,p,c)=>[...(!c.evolution||c.graveEvolution?[null]:[]),...(!c.graveEvolution&&(c.evolution||c.neoEvolution)?api.evolutionBases(s,p,c):[])];
 const canPut=(s,p,x,origin)=>card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&bases(s,p,card(x)).length>0&&(!card(x).graveEvolution||s.players[p].grave.some(y=>y.uid!==x.uid&&card(y).type==='creature')); 
 const delay=(s,p,x,kind,source)=>(s.g29Delays??=[]).push({p,uid:x.uid,incarnation:x.incarnation||0,turn:s.turn,kind,source});
 function doPut(s,t,base=null){const own=s.players[t.p],x=own[t.zone||t.origin]?.find(x=>x.uid===t.uid);if(!x||!canPut(s,t.p,x,t.origin))return;remove(own[t.zone||t.origin],x.uid);if(t.origin==='deck')release(s,t.p,[x.uid]);clear(x,'battle');enter(s,t.p,x,base,{origin:t.origin,execution:false,ignoreEntry:!!t.ignoreEntry,...(t.land?{g29LandTurn:s.turn,g29LandSource:t.source}:{})});if(t.origin==='deck')api.deckCheck(s,t.p);}
 function beginPut(s,p,x,base,options){x.g29Origin=options.origin||'hand';(s.players[p].g29Holding??=[]).push(x);put(s,task('g29_Bases',p,x.cardId,{mode:'put',uid:x.uid,selected:base?[base]:[],options}));}
 function beginCast(s,p,args){const x=s.players[p][args[5]].find(x=>x.uid===args[0]);put(s,task('g29_Bases',p,x.cardId,{mode:'cast',uid:x.uid,selected:args[2]?[args[2]]:[],args}));}
 function restoreHeld(s,t){const own=s.players[t.p],x=remove(own.g29Holding||[],t.uid);if(x){const z=x.g29Origin||'hand';delete x.g29Origin;own[z].push(x);}}
 function canSequence(s,p,list){const ids=new Set(list.map(x=>x.uid));let virtual={...s,players:s.players.map((x,i)=>i===p?{...x,battle:[...x.battle],grave:x.grave.filter(x=>!ids.has(x.uid))}:x)},left=[...list];for(let n=0;left.length&&n<list.length;n++){const i=left.findIndex(x=>canPut(virtual,p,x,'grave'));if(i<0)return false;const[x]=left.splice(i,1),c=card(x);if(c.graveEvolution)virtual.players[p].grave.shift();else if(c.evolution){const base=api.evolutionBases(virtual,p,c);let chosen=[];if(c.ultraEvolution){let total=0;for(const b of base){chosen.push(b.uid);total+=cost(effective(b,virtual));if(total>=20)break;}}else chosen=[base[0].uid];virtual.players[p].battle=virtual.players[p].battle.filter(y=>!chosen.includes(y.uid));}virtual.players[p].battle.push(x);}return !left.length;}
 function run(s,t){if(!t.op.startsWith('g29_'))return false;const own=s.players[t.p];switch(t.op){
 case'g29_Bases':{const list=api.ultraBases(s,t.p,card(t.source)),selected=list.filter(x=>t.selected.includes(x.uid)),total=selected.reduce((n,x)=>n+cost(effective(x,s)),0),valid=selected.length===t.selected.length&&total>=20,payable=t.mode==='put'||t.args[1]||api.canPay(s,t.p,{...card(t.source),summonOrigin:t.args[5]});if(!valid&&!list.some(x=>!t.selected.includes(x.uid))){if(t.mode==='put')restoreHeld(s,t);break;}choice(s,t,'超無限進化：進化元のコスト合計 '+total+'/20',[...list.filter(x=>!t.selected.includes(x.uid)).map(x=>opt(card(x).name+'（コスト'+cost(effective(x,s))+'）',x.uid,10+cost(card(x)),x.cardId)),...(valid&&payable?[opt('この進化元で出す',false,100,t.source)]:[]),...(t.selected.length?[opt('進化元を選び直す','reset',-100)]:[]),...(t.mode==='cast'&&!t.args[1]?[opt('召喚をやめる',null,-100)]:[])]);break;}
 case'g29_BaroOffer':{const x=own.hand.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x&&canPut(s,t.p,x,'hand'))choice(s,t,'バロXGXディアスを手札から出す？',[opt('超無限進化で出す',true,60,x.cardId),skip()]);break;}
 case'g29_Destroy':choice(s,t,'破壊する相手クリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g29_BT':put(s,{...t,op:'g29_BTSelect',ids:reveal(s,t,4),selected:[]});break;
 case'g29_BTSelect':{const list=pool(s,t).filter(x=>!t.selected.includes(x.uid)&&card(x).type==='creature'&&Number(card(x).power)<=5000&&canPut(s,t.p,x,'deck'));if(!list.length){put(s,...t.selected.map(uid=>({...t,op:'g29_Deploy',uid,origin:'deck'})),{...t,op:'g29_Order',ids:t.ids.filter(x=>!t.selected.includes(x))},{...t,op:'g29_BTBounce'});break;}choice(s,t,'パワー5000以下で出すクリーチャーを選ぶ',[...list.map(x=>opt(card(x).name,x.uid,25+cost(card(x)),x.cardId)),opt('選択を確定',null,0)]);break;}
 case'g29_BTBounce':{const list=creatures(s,1-t.p).filter(x=>api.power(x,false,s)>=6000);if(list.length)move(s,list.map(x=>({player:1-t.p,uid:x.uid,to:'hand',destroy:false})));break;}
 case'g29_Deploy':{const x=own[t.zone||t.origin]?.find(x=>x.uid===t.uid);if(!x||!canPut(s,t.p,x,t.origin)){if(t.origin==='deck')put(s,{...t,op:'g29_Order',ids:[t.uid]});break;}const c=card(x),b=bases(s,t.p,c);if(c.ultraEvolution||b.length===1&&!b[0])doPut(s,t);else choice(s,t,'出し方と進化元を選ぶ',b.map(x=>opt(x?card(x).name+'の上に置く':'進化させずに出す',x?.uid||null,x?10:1,x?.cardId)));break;}
 case'g29_Order':{const list=pool(s,t);if(list.length<=1){for(const x of list){remove(own.deck,x.uid);own.deck.push(x);}release(s,t.p,t.ids);api.deckCheck(s,t.p);break;}choice(s,t,'山札の下に置く順序を選ぶ（先に選ぶカードが上）',list.map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;}
 case'g29_Agony':put(s,{...t,op:'g29_RevivePick',selected:[],next:1-t.p});break;
 case'g29_RevivePick':{const list=own.grave.filter(x=>card(x).type==='creature'&&!t.selected.includes(x.uid)&&api.canEnter(s,t.p,card(x),{origin:'grave',execution:false})),selected=t.selected.map(uid=>own.grave.find(x=>x.uid===uid)).filter(Boolean),eligible=list.filter(x=>canSequence(s,t.p,[...selected,x]));choice(s,t,'ACE-Agony：墓地から出すクリーチャーを選ぶ',[...eligible.map(x=>opt(card(x).name,x.uid,30+cost(card(x)),x.cardId)),...(canSequence(s,t.p,selected)?[opt('この内容で出す',false,0)]:[]),...(t.selected.length?[opt('選び直す','reset',-100)]:[])]);break;}
 case'g29_ReviveNext':{const held=own.g29Reviving||[],list=held.filter(x=>canPut(s,t.p,x,'grave'));if(!list.length){own.grave.push(...held);own.g29Reviving=[];if(t.next!==undefined)put(s,{...t,p:t.next,op:'g29_RevivePick',selected:[],next:undefined});break;}choice(s,t,'ACE-Agony：次に出す順序を選ぶ',list.map(x=>opt(card(x).name,x.uid,30+cost(card(x)),x.cardId)));break;}
 case'g29_Loot':api.draw(s,t.p,3);put(s,task('discard',t.p,t.source,{n:3,causedBy:t.p}));break;
 case'g29_Mol':{const list=[0,1].flatMap(p=>creatures(s,p).filter(x=>!dragon(effective(x,s))).map(x=>({player:p,uid:x.uid,to:'grave'})));if(list.length)move(s,list);break;}
 case'g29_MolAttack':{const ids=reveal(s,t,1),x=ids.length?own.deck.find(x=>x.uid===ids[0]):null;if(x&&dragon(card(x))&&canPut(s,t.p,x,'deck'))put(s,{...t,op:'g29_Deploy',uid:x.uid,origin:'deck'});else put(s,{...t,op:'g29_Order',ids});break;}
 case'g29_Untap':{const x=live(s,t);if(x&&api.canUntap(x))x.tapped=false;break;}
 case'g29_Invincible':put(s,{...t,p:1-t.p,op:'g29_InvPick',selected:[]});break;
 case'g29_InvPick':{const rows=[...own.mana.map(x=>({uid:x.uid,zone:'mana',label:card(x).name,cardId:x.cardId})),...own.shields.flatMap((root,i)=>api.shieldCards(root).map((x,j)=>({uid:x.uid,zone:'shields',label:'シールド'+(i+1)+(api.shieldCards(root).length>1?'の'+(j+1)+'枚目':'')})))].filter(x=>!t.selected.some(y=>y.uid===x.uid));if(t.selected.length>=2||!rows.length){for(const x of t.selected)if(x.zone==='shields')api.moveShield(s,t.p,x.uid,'grave',{cardOnly:true});else{const y=policyRemove(s,t.p,'mana',x.uid,api);if(y){clear(y,'grave');api.addZone(s,t.p,'grave',y);}}break;}choice(s,t,'墓地に置く自分のマナ・シールドを合計2枚選ぶ（'+t.selected.length+'/2）',rows.map(x=>opt(x.label,{uid:x.uid,zone:x.zone},x.zone==='mana'?-cost(card(x.cardId)):-10,x.cardId)));break;}
 case'g29_Land':api.shuffleLibrary(s,t.p,[],t.source);put(s,{...t,op:'g29_LandPick',ids:reveal(s,t,5)});break;
 case'g29_LandPick':{const list=pool(s,t).filter(x=>card(x).type==='creature'&&(dragon(card(x))||card(x).neoEvolution)&&canPut(s,t.p,x,'deck'));if(!list.length)put(s,{...t,op:'g29_Order'});else choice(s,t,'王闘の大地：出すドラゴンまたはNEOを選ぶ',list.map(x=>opt(card(x).name,x.uid,30+cost(card(x)),x.cardId)));break;}
 case'g29_EndMove':{const x=live(s,t);if(x)move(s,[{player:t.p,uid:x.uid,to:t.kind==='mana'?'mana':'grave',destroy:t.kind!=='mana'}]);break;}
 case'g29_Jura':choice(s,t,'ジュラ子：墓地に置く山札の枚数を選ぶ',Array.from({length:Math.min(3,own.deck.length)+1},(_,n)=>opt(n+'枚',n,n<own.deck.length?n*4:-100)));break;
 case'g29_JuraPick':{const list=['hand','grave'].flatMap(origin=>own[origin].filter(x=>cost(card(x))<=5&&dragon(card(x))&&canPut(s,t.p,x,origin)).map(x=>opt((origin==='hand'?'手札：':'墓地：')+card(x).name,{uid:x.uid,origin},30+cost(card(x)),x.cardId)));choice(s,t,'コスト5以下のドラゴンを出す？',[...list,skip()]);break;}
 case'g29_Duel':{const ids=reveal(s,t,3),selected=pool(s,{...t,ids}).filter(x=>card(x).name.includes('ボルシャック'));for(const x of selected){remove(own.deck,x.uid);release(s,t.p,[x.uid]);clear(x,'hand');api.addZone(s,t.p,'hand',x);}put(s,{...t,op:'g29_Order',ids:ids.filter(uid=>!selected.some(x=>x.uid===uid))});api.deckCheck(s,t.p);break;}
 case'g29_Danger':choice(s,t,'タップまたはアンタップする他の1体を選ぶ',targetOptions(s,t.p,[...creatures(s,t.p),...creatures(s,1-t.p)].filter(x=>x.uid!==live(s,t)?.uid)));break;
 case'g29_DangerMode':{const p=s.players.findIndex(x=>x.battle.some(y=>y.uid===t.target)),x=p<0?null:s.players[p].battle.find(x=>x.uid===t.target);if(x)choice(s,t,card(x).name+'をどうする？',[opt('タップする',true,p===t.p?-1:15),opt('アンタップする',false,p===t.p?15:-1)]);break;}
 case'g29_Arc':choice(s,t,'手札のコスト5以下のアーマードを出す？',[...own.hand.filter(x=>cost(card(x))<=5&&armored(card(x))&&canPut(s,t.p,x,'hand')).map(x=>opt(card(x).name,x.uid,25+cost(card(x)),x.cardId)),skip()]);break;
 case'g29_ArcLeave':choice(s,t,'アークゼオスNEX：山札の上1枚をシールド化する？',[opt('シールド化する',true,own.deck.length>1?15:-100),skip()]);break;
 case'g29_Bird':{const ids=reveal(s,t,1,false),x=ids.length?own.deck.find(x=>x.uid===ids[0]):null;if(x)choice(s,{...t,ids},dragon(card(x))?'ボルバディ：ドラゴンを公開して手札へ加える？':'ボルバディ：山札の上を確認',[...(dragon(card(x))?[opt(card(x).name+'を公開して手札へ',true,20,x.cardId)]:[]),opt(card(x).name+'を確認して山札の上に戻す',null,0,x.cardId)]);else release(s,t.p,ids);break;}
 default:throw Error('未実装の画像デッキ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g29_'))return false;const own=s.players[t.p];switch(t.op){
 case'g29_Bases':if(v==='reset')put(s,{...t,selected:[]});else if(v){put(s,{...t,selected:[...t.selected,v]});}else if(v===false){if(t.mode==='cast'){const args=[...t.args];args[2]=t.selected;cast(s,t.p,...args);}else{const x=remove(own.g29Holding,t.uid);if(x){delete x.g29Origin;enter(s,t.p,x,t.selected,t.options);}}}break;
 case'g29_BaroOffer':if(v)put(s,{...t,op:'g29_Deploy',origin:'hand'});break;
 case'g29_Destroy':move(s,[{player:1-t.p,uid:v,to:'grave'}]);break;
 case'g29_BTSelect':if(v)put(s,{...t,selected:[...t.selected,v]});else put(s,...t.selected.map(uid=>({...t,op:'g29_Deploy',uid,origin:'deck'})),{...t,op:'g29_Order',ids:t.ids.filter(x=>!t.selected.includes(x))},{...t,op:'g29_BTBounce'});break;
 case'g29_Deploy':doPut(s,t,v);break;
 case'g29_Order':{const x=remove(own.deck,v);if(x)own.deck.push(x);release(s,t.p,[v]);put(s,{...t,ids:t.ids.filter(x=>x!==v)});break;}
 case'g29_RevivePick':if(v==='reset')put(s,{...t,selected:[]});else if(v)put(s,{...t,selected:[...t.selected,v]});else{own.g29Reviving=t.selected.map(uid=>policyRemove(s,t.p,'grave',uid,api)).filter(Boolean);put(s,{...t,op:'g29_ReviveNext'});}break;
 case'g29_ReviveNext':put(s,{...t,op:'g29_Deploy',zone:'g29Reviving',origin:'grave',uid:v,ignoreEntry:true},t);break;
 case'g29_InvPick':put(s,{...t,selected:[...t.selected,v]});break;
 case'g29_LandPick':put(s,{...t,op:'g29_Deploy',uid:v,origin:'deck',land:true},{...t,op:'g29_Order',ids:t.ids.filter(uid=>uid!==v)});break;
 case'g29_Jura':api.mill(s,t.p,v);put(s,{...t,op:'g29_JuraPick'});break;
 case'g29_JuraPick':if(v)put(s,{...t,op:'g29_Deploy',...v});break;
 case'g29_Danger':put(s,{...t,op:'g29_DangerMode',target:v});break;
 case'g29_DangerMode':{const p=s.players.findIndex(x=>x.battle.some(y=>y.uid===t.target)),x=p<0?null:s.players[p].battle.find(x=>x.uid===t.target);if(x){if(v)api.tap(s,p,x);else if(api.canUntap(x))x.tapped=false;}break;}
 case'g29_Arc':if(v)put(s,{...t,op:'g29_Deploy',uid:v,origin:'hand'});break;
 case'g29_ArcLeave':if(v)api.shieldTop(s,t.p,card(t.source));break;
 case'g29_Bird':{const x=pool(s,t)[0];if(v&&x){remove(own.deck,x.uid);clear(x,'hand');api.addZone(s,t.p,'hand',x);log(s,t.p,'reveal','ボルバディで公開：'+card(x).name,{cardId:x.cardId});api.deckCheck(s,t.p);}release(s,t.p,t.ids);break;}
 default:throw Error('未実装の画像デッキ選択：'+t.op);
 }return true;}
 return {run,chosen,beginCast,beginPut,
 effect(s,p,c,uid,entry){const op={bolBaro:'g29_Destroy',bolBT:'g29_BT',bolAgony:'g29_Agony',bolLoot:'g29_Loot',bolMol:'g29_Mol',bolLand:'g29_Land',bolJura:'g29_Jura',bolDuel:'g29_Duel',bolBird:'g29_Bird'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 entry(s,p,x,options={}){if(options.g29LandTurn===s.turn){(s.g29Grants??=[]).push({p,uid:x.uid,incarnation:x.incarnation||0,turn:s.turn});delay(s,p,x,'mana',options.g29LandSource);}if(card(x).type==='creature'&&/コマンド|ドラゴン/.test(String(card(x).race)))for(const y of s.players[p].hand)if(card(y).g29Baro)on(s,p,y,'g29_BaroOffer',{serial:y.zoneSerial||0});},
 attack(s,p,x){const c=effective(x,s);if(api.selfStopped(s,p))return;if(c.g29Baro)on(s,p,x,'g29_Destroy');if(c.g29Invincible)on(s,p,x,'g29_Invincible');if(c.g29Mol){on(s,p,x,'g29_MolAttack');if(s.attackLifecycle?.number===1&&s.players[p].mana.filter(x=>card(x).type==='creature'&&dragon(card(x))).length>=5)(s.g29MolReady??=[]).push({p,uid:x.uid,incarnation:x.incarnation||0,turn:s.turn});}if(c.g29Danger)on(s,p,x,'g29_Danger');if(c.g29Arc)on(s,p,x,'g29_Arc');},
 attackEnd(s,a){const list=s.g29MolReady||[],i=list.findIndex(x=>x.p===a.player&&x.uid===a.uid&&x.incarnation===a.incarnation&&x.turn===s.turn);if(i>=0){const[t]=list.splice(i,1),x=live(s,t);if(x)on(s,t.p,x,'g29_Untap');}},
 grants:(s,p,x)=>(s.g29Grants||[]).some(t=>t.p===p&&t.turn===s.turn&&live(s,t)?.uid===x.uid),
 snapshot(s,rows){return rows.filter(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return x&&effective(x,s).g29Arc;}).map(x=>x.uid);},
 leaving(s,p,x,snapshot){if(snapshot?.includes(x.uid))on(s,p,x,'g29_ArcLeave');},
 mainActions(s,p){return s.players[p].hand.filter(x=>card(x).bad===3&&!creatures(s,1-p).some(x=>effective(x,s).noCostReduction)&&api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})&&api.canPay(s,p,{...card(x),cost:Math.max(1,cost(card(x))-3)})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,alternative:'bad',cost:api.summonCost(s,p,{...card(x),cost:Math.max(1,cost(card(x))-3)}),label:card(x).name+'をB・A・D 3で召喚（終了時に破壊）'}));},
 alternative(s,p,a){const x=s.players[p].hand.find(x=>x.uid===a.uid);cast(s,p,a.uid,false,null,0,{cost:Math.max(1,cost(card(x))-3)});delay(s,p,x,'destroy',x.cardId);},
 end(s){const list=(s.g29Delays||[]).filter(x=>x.turn===s.turn);s.g29Delays=(s.g29Delays||[]).filter(x=>x.turn!==s.turn);return list.map(t=>({player:t.p,uid:t.uid,source:t.source,effect:'extended',task:{...t,op:'g29_EndMove'}}));},
 expire(s,when){if(when==='end')s.g29Grants=(s.g29Grants||[]).filter(x=>x.turn!==s.turn);}
 };
}
