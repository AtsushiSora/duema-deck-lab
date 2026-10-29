// Verified photographed Dispectors. Choices retain identities across save/resume.
export function createPhoto159DispectorRules(api){
 const {card,cost,colors,effective,put,task,choice,opt}=api;
 const key=x=>x.uid+'@'+(x.incarnation||0),living=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const currentPower=(s,x)=>api.power(x,x.uid===s.attack?.attacker||x.uid===s.attackLifecycle?.uid&&(x.incarnation||0)===(s.attackLifecycle.incarnation||0),s);
 const unit=(s,t)=>s.players[t.p].battle.find(x=>key(x)===key(t));
 const event=(p,x,op,more={})=>({player:p,uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g159D_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,event(p,x,op,more));
 const next=(s,t,op,more={})=>put(s,{...t,op:'g159D_'+op,...more});
 const held=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 const release=(s,p,ids)=>s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(x=>!ids.includes(x));
 const pool=(s,t)=>t.ids.map(uid=>s.players[t.p].deck.find(x=>x.uid===uid)).filter(Boolean);
 const element=c=>['creature','seed','gear','field'].includes(c.type);
 const canPut=(s,p,x)=>element(card(x))&&api.canMoveZone(s,p,'deck')&&api.canEnter(s,p,card(x),{origin:'deck',execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 function rampRest(s,t){const own=s.players[t.p];for(const x of pool(s,t)){if(!api.canMoveZone(s,t.p,'deck'))continue;api.remove(own.deck,x.uid);const to=api.deckRedirect(s,t.p)||api.manaRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);}release(s,t.p,t.ids);api.deckCheck(s,t.p);}
 function finishMaid(s,t){put(s,{...t,op:'g159D_MaidAfter'});const rows=t.selected.filter(r=>s.players[1-t.p].battle.some(x=>key(x)===key(r)));if(rows.length)api.move(s,rows.map(r=>({player:1-t.p,uid:r.uid,to:'hand',destroy:false,controller:t.p})));}
 function run(s,t){if(!t.op.startsWith('g159D_'))return false;const own=s.players[t.p];switch(t.op){
 case'g159D_Trio':{const rows=living(s,1-t.p).map(x=>({player:1-t.p,uid:x.uid,to:'hand',destroy:false,controller:t.p}));if(rows.length)api.move(s,rows);break;}
 case'g159D_TrioJudge':api.singleJudge(s,t.p,t.source,t.uid,task('g5ExtraTurn',t.p,t.source));break;
 case'g159D_PuchoFinal':{if(s.finalUsed?.[t.p])break;(s.finalUsed??=[false,false])[t.p]=true;(s.finalHistory??=[false,false])[t.p]=true;const x=unit(s,t),limit=x?currentPower(s,x):t.power,rows=living(s,1-t.p).filter(y=>currentPower(s,y)<limit).map(y=>({player:1-t.p,uid:y.uid,to:'mana',destroy:false,controller:t.p}));if(rows.length)api.move(s,rows);break;}
 case'g159D_PuchoLook':{if(api.deckLocked(s,t.p))break;const excluded=held(own),xs=own.deck.filter(x=>!excluded.has(x.uid)).slice(0,api.lookCount(s,t.p,3)),ids=xs.map(x=>x.uid);(own.g34Protected??=[]).push(...ids);if(xs.length)api.log(s,t.p,api.lookPublic(s,t.p)?'reveal':'look',card(t.source).name+'：山札の上'+xs.length+'枚を確認'+(api.lookPublic(s,t.p)?'：'+xs.map(x=>card(x).name).join('・'):''),{cardId:t.source});next(s,t,'PuchoElement',{ids});break;}
 case'g159D_PuchoElement':{const xs=pool(s,t).filter(x=>canPut(s,t.p,x));if(!xs.length){next(s,t,'PuchoShield');break;}choice(s,t,'上から見たカードから出すエレメントを1つまで選ぶ',[...xs.map(x=>opt(card(x).name,x.uid,25+Math.min(20,cost(card(x))),x.cardId)),opt('出さずに進む',null,0)]);break;}
 case'g159D_PuchoShield':{const xs=pool(s,t);if(!xs.length||!api.canAddShield(s,t.p)||!api.canMoveZone(s,t.p,'deck')){rampRest(s,t);break;}choice(s,t,'シールド化するカードを1枚選ぶ',xs.map(x=>opt(card(x).name,x.uid,api.faces(card(x)).some(c=>c.trigger)?30:20-Math.min(20,cost(card(x))),x.cardId)));break;}
 case'g159D_Krai':put(s,task('g34_Draw',t.p,t.source,{n:2,optional:true}));break;
 case'g159D_KraiSkip':choice(s,t,'クライアッシュでターンの残りを飛ばしますか？',[opt('ターンの残りを飛ばす',true,s.active===t.p?-10:50),opt('飛ばさない',null,0)]);break;
 case'g159D_BadEnd':{const x=unit(s,t);if(x)api.move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true,controller:t.p}]);break;}
 case'g159D_Maid':next(s,t,'MaidPick',{selected:[],evolved:unit(s,t)?api.isEvolution(unit(s,t)):!!s.g159DMaidEvolution?.[key(t)]});break;
 case'g159D_MaidPick':{const xs=s.players[1-t.p].battle.filter(x=>!x.sealed&&element(card(x))&&!t.selected.some(r=>key(r)===key(x))),options=api.targetOptions(s,t.p,xs);if(t.selected.length>=5||!options.length){finishMaid(s,t);break;}choice(s,t,'手札へ戻す相手のエレメントを5つまで選ぶ（'+t.selected.length+'/5）',[...options,opt('この内容で戻す',null,0)]);break;}
 case'g159D_MaidAfter':{const x=unit(s,t);if(x?api.isEvolution(x):t.evolved)put(s,task('discard',1-t.p,t.source,{n:5,random:true,causedBy:t.p}));break;}
 default:throw Error('未実装の写真ディスペクター効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g159D_'))return false;const own=s.players[t.p];switch(t.op){
 case'g159D_PuchoElement':{const x=v&&pool(s,t).find(x=>x.uid===v);if(x&&canPut(s,t.p,x)){release(s,t.p,[x.uid]);put(s,{...t,op:'g34_Put',origin:'deck',owner:t.p,target:x.uid},{...t,op:'g159D_PuchoShield',ids:t.ids.filter(uid=>uid!==x.uid)});}else next(s,t,'PuchoShield');break;}
 case'g159D_PuchoShield':{const x=pool(s,t).find(x=>x.uid===v);if(x&&api.canAddShield(s,t.p)&&api.canMoveZone(s,t.p,'deck')){api.remove(own.deck,x.uid);release(s,t.p,[x.uid]);const to=api.deckRedirect(s,t.p)?'grave':'shields';api.clear(x,to);api.addZone(s,t.p,to,x);if(to==='shields')api.notifyShieldAdded(s,t.p,x);}rampRest(s,{...t,ids:t.ids.filter(uid=>uid!==v)});break;}
 case'g159D_KraiSkip':if(v)api.skipTurn(s,t.p,t.source);break;
 case'g159D_MaidPick':{const x=v&&s.players[1-t.p].battle.find(x=>x.uid===v);if(x)next(s,t,'MaidPick',{selected:[...t.selected,{uid:x.uid,incarnation:x.incarnation||0}]});else finishMaid(s,t);break;}
 default:throw Error('未実装の写真ディスペクター選択：'+t.op);
 }return true;}
 return{run,chosen,
 effect(s,p,c,uid,entry){const op={trio:'Trio',krai:'Krai',maid:'Maid'}[c.g159D];if(!op)return false;put(s,task('g159D_'+op,p,c.id,{uid,incarnation:entry?.incarnation||s.players[p].battle.find(x=>x.uid===uid)?.incarnation||0}));return true;},
 entry(s,p,x,options={}){const c=effective(x,s);if(card(x).g159D==='maid')(s.g159DMaidEvolution??={})[key(x)]=api.isEvolution(x);if(c.g159D==='pucho'&&options.revolution&&!options.selfMuted&&!api.selfStopped(s,p)&&!s.finalUsed?.[p])on(s,p,x,'PuchoFinal',{power:currentPower(s,x)});if(api.isCreature(s,x)&&!options.paidMana)for(const w of living(s,1-p))if(effective(w,s).g159D==='krai')on(s,1-p,w,'KraiSkip');},
 attack(s,p,x){if(!api.selfStopped(s,p)&&effective(x,s).g159D==='trio')on(s,p,x,'TrioJudge');},
 attackEnd(s,a,x){if(x&&effective(x,s).g159D==='pucho')on(s,a.player,x,'PuchoLook');},
 mainActions(s,p){return s.players[p].hand.filter(x=>card(x).g159D==='krai'&&!living(s,1-p).some(x=>effective(x,s).noCostReduction)&&api.canCast(s,p,card(x),'hand')&&api.canEnter(s,p,card(x),{origin:'hand',execution:true})&&api.canPay(s,p,{...card(x),printedCost:cost(card(x)),cost:Math.max(1,cost(card(x))-4)})).map(x=>({kind:'play',uid:x.uid,cardId:x.cardId,origin:'hand',alternative:'photo159Bad',cost:api.summonCost(s,p,{...card(x),printedCost:cost(card(x)),cost:Math.max(1,cost(card(x))-4)}),label:card(x).name+'をB・A・D 4で召喚（終了時に破壊）'}));},
 alternative(s,p,a){const x=s.players[p].hand.find(x=>x.uid===a.uid);if(!x)return;api.cast(s,p,x.uid,false,null,0,{cost:Math.max(1,cost(card(x))-4)});(s.g159DBad??=[]).push({p,uid:x.uid,incarnation:x.incarnation||0,turn:s.turn,source:x.cardId});},
 end(s){const rows=(s.g159DBad||[]).filter(x=>x.turn===s.turn);s.g159DBad=(s.g159DBad||[]).filter(x=>x.turn!==s.turn);return rows.map(t=>({player:t.p,uid:t.uid,source:t.source,effect:'extended',task:{...t,op:'g159D_BadEnd'}}));}
 };
}
