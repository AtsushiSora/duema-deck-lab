// No.17: Giant mana permissions, protected looks and optional battle replacement.
export function createGiantRules(api){
 const {card,faces,cost,effective,creatures,put,task,choice,opt,skip,remove,clear,draw,move,enter,cast,targetOptions}=api;
 const giant=c=>String(c.race).includes('ジャイアント'),snow=c=>String(c.race).includes('スノーフェアリー'),key=x=>x.uid+'@'+(x.incarnation||0);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task(op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const canPut=(s,p,x,origin)=>!x.faceDown&&card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length);
 function ramp(s,p,n){for(let i=0;i<n&&s.winner===null&&!s.lossEvent;i++){const x=api.takeTop(s,p);if(x){const to=api.deckRedirect(s,p)?'grave':'mana';clear(x,to);api.addZone(s,s.players[p],to,x);}api.deckCheck(s,p);}}
 const protect=(own,n)=>{const uids=own.deck.slice(0,n).map(x=>x.uid);(own.g17Protected??=[]).push(...uids);return uids;};
 const unprotect=(own,uids)=>own.g17Protected=(own.g17Protected||[]).filter(x=>!uids.includes(x));
 function battleList(s,t,p){const row=t.rows.find(x=>x.p===p),x=row&&s.players[p].battle.find(x=>x.uid===row.uid&&(x.incarnation||0)===row.inc);return x&&api.isCreature(s,x)&&giant(effective(x,s))?creatures(s,p).filter(y=>y.uid!==x.uid&&effective(y,s).galacticBattle):[];}
 function finishBattle(s,t,sub=null){const rows=t.rows.map(x=>sub&&x.p===sub.p?{...x,uid:sub.uid,inc:sub.inc}:x),[a,b]=rows.map(r=>s.players[r.p].battle.find(x=>x.uid===r.uid&&(x.incarnation||0)===r.inc));if(a&&b&&api.isCreature(s,a)&&api.isCreature(s,b))api.battle(s,rows[0].p,a,rows[1].p,b,t.attacking,true);}
 function run(s,t){if(!t.op.startsWith('g17_'))return false;const own=s.players[t.p];switch(t.op){
 case'g17_Heavy':choice(s,t,'マナから出すコスト6以下のジャイアントを選ぶ',[...own.mana.filter(x=>canPut(s,t.p,x,'mana')&&giant(card(x))&&cost(card(x))<=6).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g17_Terminal':if(!s.g7TerminalUsed?.[t.p])choice(s,t,'終極宣言を使いますか？（ゲーム中1回）',[opt('終極宣言する',true,own.deck.length>own.hand.length+1?25:-20),skip()]);break;
 case'g17_TermDraw':choice(s,t,'手札と同じ'+own.hand.length+'枚を引きますか？',[opt(own.hand.length+'枚引く',true,own.deck.length>own.hand.length?15:-20),skip()]);break;
 case'g17_TermMana':choice(s,t,'マナと同じ'+own.mana.length+'枚を山札からマナに置きますか？',[opt(own.mana.length+'枚をマナへ',true,own.deck.length>own.mana.length?15:-20),skip()]);break;
 case'g17_Ramp':ramp(s,t.p,t.n??1);break;
 case'g17_Scarlet':choice(s,t,'他のジャイアントをマナに置いてメクレイド8する？',[...own.battle.filter(x=>['creature','seed'].includes(card(x).type)&&x.uid!==t.uid&&giant(effective(x,s))&&api.canLeave(s,t.p,x)&&!api.manaMoveForbidden(s,t.p,x)).map(x=>opt(card(x).name,x.uid,Math.max(1,15-cost(card(x))),x.cardId)),skip()]);break;
 case'g17_AfterScarlet':if(own.mana.some(x=>x.uid===t.moved))put(s,task('g17_Mekraid',t.p,t.source));break;
 case'g17_Mekraid':{const uids=protect(own,3),options=uids.flatMap(uid=>{const x=own.deck.find(x=>x.uid===uid);return faces(card(x)).flatMap((c,face)=>giant(c)&&cost(c)<=8&&api.canCast(s,t.p,c)&&(c.type==='spell'||api.canEnter(s,t.p,c,{origin:'deck',execution:true})&&(!c.evolution||api.evolutionBases(s,t.p,c).length))?[opt(c.name,{uid,face},20+cost(c),x.cardId)]:[]);});choice(s,{...t,uids},'上3枚からコスト8以下のジャイアントを使う',[...options,skip()]);break;}
 case'g17_MekUse':{const x=own.deck.find(x=>x.uid===t.uid),c=x&&faces(card(x))[t.face||0];if(!x)break;if(c.evolution||c.neoEvolution)choice(s,t,'メクレイドの進化元を選ぶ',[...(c.neoEvolution?[opt('進化せずに出す',null,1)]:[]),...api.evolutionBases(s,t.p,c).map(x=>opt(card(x).name,x.uid,5,x.cardId))]);else cast(s,t.p,x.uid,true,null,t.face||0,null,'deck','ジャイアント・メクレイド');break;}
 case'g17_Order':if(!t.uids.length){unprotect(own,t.protected);if(t.after)put(s,t.after);break;}if(t.uids.length===1){const x=remove(own.deck,t.uids[0]);if(x)own.deck.push(x);put(s,{...t,uids:[]});break;}choice(s,t,'残りを山札の下へ置く順序を選ぶ',t.uids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,0,x.cardId);}));break;
 case'g17_Lake':{const uids=protect(own,6);put(s,task('g17_LakePick',t.p,t.source,{uids,selected:[],max:Math.min(2,uids.length)}));break;}
 case'g17_LakePick':if(t.selected.length===t.max){for(const uid of t.selected){const x=remove(own.deck,uid);if(x){clear(x,'hand');own.hand.push(x);}}put(s,task('g17_Order',t.p,t.source,{uids:t.uids.filter(x=>!t.selected.includes(x)),protected:t.uids,after:task('g17_RevealHand',t.p,t.source)}));api.deckCheck(s,t.p);}else choice(s,t,'上6枚から手札へ加えるカードを選ぶ（'+t.selected.length+'/2）',t.uids.filter(x=>!t.selected.includes(x)).map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,10+cost(card(x)),x.cardId);}));break;
 case'g17_RevealHand':choice(s,t,'手札を1枚見せて同じコストの相手を戻す？',[...own.hand.map(x=>opt(card(x).name,x.uid,creatures(s,1-t.p).some(y=>faces(card(x)).some(c=>cost(c)===cost(card(y))))?20:-1,x.cardId)),skip()]);break;
 case'g17_RevealCost':{const x=own.hand.find(x=>x.uid===t.uid);if(x){const cs=[...new Set(faces(card(x)).map(cost))];if(cs.length>1)choice(s,t,'公開したカードのどちらのコストを使う？',cs.map(n=>opt(String(n),n===Infinity?'∞':n,creatures(s,1-t.p).some(x=>cost(card(x))===n)?10:0)));else put(s,task('g17_LakeBounce',t.p,t.source,{max:cs[0]===Infinity?'∞':cs[0]}));}break;}
 case'g17_LakeBounce':choice(s,t,'公開したカードと同じコストの相手を手札に戻す',targetOptions(s,t.p,creatures(s,1-t.p).filter(x=>cost(card(x))===(t.max==='∞'?Infinity:t.max))));break;
 case'g17_OrbShield':choice(s,t,'相手のシールドを1つマナに置きますか？',[...s.players[1-t.p].shields.map((x,i)=>opt('シールド'+(i+1),x.uid,10)),skip()]);break;
 case'g17_Touch':choice(s,t,'マナに置く相手のクリーチャーを選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g17_TouchDeploy':choice(s,t,'選んだ相手より小さいコストをマナから出す',[...own.mana.filter(x=>canPut(s,t.p,x,'mana')&&(t.max==='∞'||cost(card(x))<t.max)).map(x=>opt(card(x).name,x.uid,20+cost(card(x)),x.cardId)),skip()]);break;
 case'g17_YukiReturn':choice(s,t,'マナからクリーチャーを3体まで手札へ（'+t.selected.length+'/3）',[...own.mana.filter(x=>!x.faceDown&&card(x).type==='creature'&&!t.selected.includes(x.uid)&&t.selected.length<3).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),opt('この選択で戻す',null,t.selected.length?20:0)]);break;
 case'g17_YukiCharge':choice(s,t,'手札を3枚までタップしてマナへ（'+t.selected.length+'/3）',[...own.hand.filter(x=>!t.selected.includes(x.uid)&&t.selected.length<3).map(x=>opt(card(x).name,x.uid,own.mana.length<6?10:-2,x.cardId)),opt('この選択でマナへ',null,t.selected.length?20:0)]);break;
 case'g17_Space':{const uids=protect(own,2);if(uids.length)choice(s,{...t,uids},'上2枚から手札に加えるカードを選ぶ',uids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,10+cost(card(x)),x.cardId);}));break;}
 case'g17_WinRamp':choice(s,t,'バトル勝利：山札の上1枚をマナに置きますか？',[opt('1枚をマナへ',true,own.deck.length>1?10:-20),skip()]);break;
 case'g17_ReturnMana':choice(s,t,'マナを1枚手札に戻しますか？',[...own.mana.map(x=>opt(x.faceDown?'裏向きのマナ':card(x).name,x.uid,own.hand.length<3?10:cost(card(x))-5,x.cardId)),skip()]);break;
 case'g17_Sineraria':if(own.battle.some(x=>['creature','seed'].includes(card(x).type)&&x.uid!==t.uid&&giant(effective(x,s))))draw(s,t.p,1);break;
 case'g17_Firefly':put(s,task('g17_Bounce',t.p,t.source),task('g17_Lock',t.p,t.source));break;
 case'g17_Bounce':choice(s,t,'相手のクリーチャーを1体手札に戻す',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g17_Lock':choice(s,t,'次の自分のターンまで攻撃・ブロックできなくする相手を選ぶ',targetOptions(s,t.p,creatures(s,1-t.p)));break;
 case'g17_GalaxyLock':{const x=s.players[t.owner].battle.find(x=>x.uid===t.target&&(x.incarnation||0)===t.targetInc);if(x)for(const kind of['attack','block'])api.lock(s,t.p,{kind,player:t.owner,uid:x.uid,incarnation:x.incarnation||0});break;}
 case'g17_BattleReplace':{if(!t.owners.length){finishBattle(s,t);break;}const p=t.owners[0],list=battleList(s,t,p);if(list.length)choice(s,{...t,p},'銀河竜ゴルファンタジスタでバトルを肩代わりする？',[...list.map(x=>{const other=t.rows.find(r=>r.p!==p),y=s.players[other.p].battle.find(y=>y.uid===other.uid);return opt(card(x).name,x.uid,y&&api.power(x,false,s)>api.power(y,false,s)?20:-5,x.cardId);}),skip()]);else put(s,{...t,owners:t.owners.slice(1)});break;}
 default:throw Error('未実装のジャイアント効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g17_'))return false;const own=s.players[t.p];switch(t.op){
 case'g17_TouchDeploy':if(v)put(s,task('putCreature',t.p,t.source,{uid:v,origin:'mana'}));break;
 case'g17_Heavy':if(v)put(s,task('putCreature',t.p,t.source,{uid:v,origin:'mana'}));break;
 case'g17_Terminal':if(v&&!s.g7TerminalUsed?.[t.p]){(s.g7TerminalUsed??=[false,false])[t.p]=true;put(s,task('g17_TermDraw',t.p,t.source));}break;
 case'g17_TermDraw':put(s,task('g17_TermMana',t.p,t.source));if(v)draw(s,t.p,own.hand.length);break;
 case'g17_TermMana':if(v)ramp(s,t.p,own.mana.length);break;
 case'g17_Scarlet':if(v){put(s,task('g17_AfterScarlet',t.p,t.source,{moved:v}));move(s,[{player:t.p,uid:v,to:'mana'}]);}break;
 case'g17_Mekraid':{unprotect(own,v?[v.uid]:[]);put(s,...(v?[task('g17_MekUse',t.p,t.source,{uid:v.uid,face:v.face})]:[]),task('g17_Order',t.p,t.source,{uids:t.uids.filter(uid=>uid!==v?.uid),protected:t.uids}));break;}
 case'g17_MekUse':cast(s,t.p,t.uid,true,v||null,t.face||0,null,'deck','ジャイアント・メクレイド');break;
 case'g17_Order':{const x=remove(own.deck,v);if(x)own.deck.push(x);put(s,{...t,uids:t.uids.filter(uid=>uid!==v)});break;}
 case'g17_LakePick':put(s,{...t,selected:[...t.selected,v]});break;
 case'g17_RevealHand':if(v){const x=own.hand.find(x=>x.uid===v);api.log(s,t.p,'reveal','レイクポーチャーで公開：'+card(x).name,{cardId:x.cardId});put(s,task('g17_RevealCost',t.p,t.source,{uid:v}));}break;
 case'g17_RevealCost':put(s,task('g17_LakeBounce',t.p,t.source,{max:v}));break;
 case'g17_LakeBounce':case'g17_Bounce':move(s,[{player:1-t.p,uid:v,to:'hand'}]);break;
 case'g17_OrbShield':if(v)api.shieldTo(s,1-t.p,v,'mana');break;
 case'g17_Touch':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x){put(s,task('g17_TouchDeploy',t.p,t.source,{max:cost(card(x))===Infinity?'∞':cost(card(x))}));move(s,[{player:1-t.p,uid:v,to:'mana'}]);}break;}
 case'g17_YukiReturn':if(v)put(s,{...t,selected:[...t.selected,v]});else{for(const uid of t.selected){const x=remove(own.mana,uid);if(x){clear(x,'hand');own.hand.push(x);}}put(s,task('g17_YukiCharge',t.p,t.source,{selected:[]}));}break;
 case'g17_YukiCharge':if(v)put(s,{...t,selected:[...t.selected,v]});else for(const uid of t.selected){const x=remove(own.hand,uid);if(x){clear(x,'mana');x.tapped=true;api.addZone(s,own,'mana',x);}}break;
 case'g17_Space':{const x=remove(own.deck,v);if(x){clear(x,'hand');own.hand.push(x);}for(const uid of t.uids.filter(uid=>uid!==v)){const x=remove(own.deck,uid);if(x){const to=api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);api.addZone(s,own,to,x);}}unprotect(own,t.uids);api.deckCheck(s,t.p);break;}
 case'g17_WinRamp':if(v)ramp(s,t.p,1);put(s,task('g17_ReturnMana',t.p,t.source));break;
 case'g17_ReturnMana':if(v){const x=remove(own.mana,v);if(x){clear(x,'hand');own.hand.push(x);}}break;
 case'g17_Lock':{const x=s.players[1-t.p].battle.find(x=>x.uid===v);if(x)for(const kind of['attack','block'])api.lock(s,t.p,{kind,player:1-t.p,uid:v,incarnation:x.incarnation||0});break;}
 case'g17_BattleReplace':if(v){const x=own.battle.find(x=>x.uid===v);api.log(s,t.p,'battleReplace',card(x).name+'がかわりにバトルする',{cardId:x.cardId});finishBattle(s,t,{p:t.p,uid:v,inc:x.incarnation||0});}else put(s,{...t,p:t.rows[0].p,owners:t.owners.slice(1)});break;
 default:throw Error('未実装のジャイアント選択：'+t.op);
 }return true;}
 function manaPermissions(s,p,x){const own=s.players[p],out=[];if(card(x).manaSummon||x.g22ManaAllowed===s.turn)out.push(null);for(const y of creatures(s,p)){const c=effective(y,s),k=key(y);if(c.scarletMana&&giant(card(x))&&s.g17ManaUsed?.[k]!==s.turn)out.push('g17:'+k);if(c.manaOnce&&s.g22UsedMana?.[k]!==s.turn)out.push(k);if(c.hercules&&s.g16UsedMana?.[k]!==s.turn)out.push('g16:'+k);}return out;}
 return {run,chosen,
 effect(s,p,c,uid){const op={giantHeavy:'g17_Heavy',giantLake:'g17_Lake',giantTouch:'g17_Touch',giantYuki:'g17_YukiReturn',giantSpace:'g17_Space',giantSineraria:'g17_Sineraria',giantFirefly:'g17_Firefly'}[c.effect];if(!op)return false;put(s,task(op,p,c.id,{uid,...(c.effect==='giantYuki'?{selected:[]}:{} )}));return true;},
 discount(s,p,c){return giant(c)?creatures(s,p).filter(x=>effective(x,s).ultraGiant).length:0;},
 allowedCard(s,p,c){return c.type==='creature'||cost(c)>5||!creatures(s,1-p).some(x=>effective(x,s).giantOrb);},
 muteEntry(s,p){return s.players[1-p].battle.filter(x=>['creature','seed'].includes(card(x).type)&&snow(card(x))).length>=5&&creatures(s,1-p).some(x=>effective(x,s).mariMute);},
 entry(s,p,x){if(api.isCreature(s,x))for(const y of creatures(s,1-p))if(effective(y,s).galacticBattle)on(s,1-p,y,'g17_GalaxyLock',{owner:p,target:x.uid,targetInc:x.incarnation||0});},
 attack(s,p,x){if(effective(x,s).scarletMana&&!api.selfStopped(s,p))on(s,p,x,'g17_Scarlet');},
 start(s,p){return creatures(s,p).filter(x=>effective(x,s).giantTerminal&&!s.g7TerminalUsed?.[p]).map(x=>({uid:x.uid,source:x.cardId,effect:'extended',task:task('g17_Terminal',p,x.cardId)}));},
 played(s,p,c,x,origin,permit){if(origin==='mana'&&permit?.startsWith('g17:')){(s.g17ManaUsed??={})[permit.slice(4)]=s.turn;put(s,task('g17_Ramp',p,c.id));}},
 battleWins(s,p,w){const x=w&&s.players[p].battle.find(x=>x.uid===w.uid),c=x&&effective(x,s);return c?.giantOrb?[{player:p,uid:x.uid,source:x.cardId,task:task('g17_OrbShield',p,x.cardId)}]:c?.akaneWin?[{player:p,uid:x.uid,source:x.cardId,task:task('g17_WinRamp',p,x.cardId)}]:[];},
 replaceBattle(s,pa,a,pb,b,attacking){const rows=[{p:pa,uid:a.uid,inc:a.incarnation||0},{p:pb,uid:b.uid,inc:b.incarnation||0}],t={op:'g17_BattleReplace',p:pa,source:a.cardId,rows,attacking,owners:[s.active,1-s.active]};if(!t.owners.some(p=>battleList(s,t,p).length))return false;put(s,t);return true;},
 mainActions(s,p){const own=s.players[p],out=[];for(const origin of['hand','mana'])for(const x of own[origin].filter(x=>!x.faceDown&&card(x).type==='creature'&&api.canEnter(s,p,card(x),{origin,execution:true})&&(!card(x).evolution||api.evolutionBases(s,p,card(x)).length))){const c=card(x),perms=origin==='hand'?[null]:manaPermissions(s,p,x);for(const permit of perms){if(c.gZeroGiant&&creatures(s,p).filter(x=>giant(effective(x,s))).length>=4)out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin,cost:0,manaPermit:permit,freeSummon:'G・ゼロ',label:c.name+'をG・ゼロで召喚'});if(origin==='mana'&&permit?.startsWith('g17:')&&api.canPay(s,p,{...c,summonOrigin:'mana'}))out.push({kind:'play',uid:x.uid,cardId:x.cardId,origin,cost:api.summonCost(s,p,{...c,summonOrigin:'mana'}),manaPermit:permit,label:'アカネの能力でマナの'+c.name+'を召喚'});}}return out;},
 };
}
