import {policyLook} from './champion-zone-policy.js';
import {policyRemove} from './champion-zone-policy.js';
// Original champion continuation: all decisions contain UIDs, never detached cards.
export function createChampionContinuationRules(api){
 const {card,faces,cost,colors,effective,creatures,put,task,choice,opt,skip,remove,clear,move,targetOptions}=api;
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g40_'+op,...more});
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('g40_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const fire=c=>colors(c).includes('火'),beat=c=>String(c.race).includes('ビートジョッキー');
 const summons=(s,p)=>(s.g40Summons||[]).filter(x=>x.p===p&&x.turn===s.turn&&x.fire).length;
 const live=(s,p,ids)=>creatures(s,p).find(x=>api.layers(x).some(y=>ids.some(r=>r.uid===y.uid&&r.incarnation===(y.incarnation||0))));
 function shieldPick(s,t){const rows=s.players[t.p].shields.filter(x=>!t.selected.includes(x.uid));if(t.selected.length>=t.n||!rows.length){for(const uid of t.selected)api.moveShield(s,t.p,uid,'hand');return;}choice(s,t,t.optional?'手札に加えるシールドを好きな数選ぶ（S・トリガー不可）':'手札に加えるシールドを1つ選ぶ（S・トリガー不可）',[...rows.map(x=>opt('シールド'+(s.players[t.p].shields.indexOf(x)+1),x.uid,t.selected.length===0?8:-8)),...(t.optional?[opt('ここまでで確定',null,0)]:[])]);}
 function run(s,t){if(!t.op.startsWith('g40_'))return false;const own=s.players[t.p];switch(t.op){
 case'g40_ShieldOne':queue(s,t,'ShieldPick',{selected:[],n:1,optional:false});break;
 case'g40_Drain':queue(s,t,'ShieldPick',{selected:[],n:own.shields.length,optional:true});break;
 case'g40_ShieldPick':shieldPick(s,t);break;
 case'g40_Dachi':choice(s,t,'次に召喚するビートジョッキーのコストをいくつ少なくする？',Array.from({length:4},(_,n)=>opt(n+'少なくする',n,n*5)));break;
 case'g40_Kumitate':if(own.hand.length)put(s,task('discard',t.p,t.source,{causedBy:t.p,n:1}));else{const x=own.battle.find(x=>x.uid===t.uid&&(x.incarnation||0)===t.incarnation);if(x)move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true}]);}break;
 case'g40_Sonkun':choice(s,t,'ソンクン：使う効果を選ぶ',[
  opt('相手のブロッカーを1体破壊',0,creatures(s,1-t.p).some(x=>effective(x,s).blocker)?20:-50),
  opt('相手のコスト3以下のクリーチャーを1体破壊',1,creatures(s,1-t.p).some(x=>cost(effective(x,s))<=3)?15:-50),
  opt('相手のコスト3以下のタマシードを1枚破壊',2,s.players[1-t.p].battle.some(x=>effective(x,s).type==='seed'&&cost(effective(x,s))<=3)?12:-50),
  opt('相手のシールドを1つブレイク',3,s.players[1-t.p].shields.length?18:-40)]);break;
 case'g40_SonkunTarget':{const rows=s.players[1-t.p].battle.filter(x=>t.mode===0?api.isCreature(s,x)&&effective(x,s).blocker:t.mode===1?api.isCreature(s,x)&&cost(effective(x,s))<=3:effective(x,s).type==='seed'&&cost(effective(x,s))<=3);choice(s,t,'破壊する相手のカードを選ぶ',targetOptions(s,t.p,rows));break;}
 case'g40_Break':choice(s,t,'ブレイクする相手のシールドを選ぶ',s.players[1-t.p].shields.map((x,i)=>opt('シールド'+(i+1),x.uid,0)));break;
 case'g40_UntapTeam':for(const x of creatures(s,t.p)){if(api.canUntap(x))x.tapped=false;x.gospelSpeed=s.turn;}break;
 case'g40_RecklessDeath':{const x=live(s,t.p,t.ids);if(x)move(s,[{player:t.p,uid:x.uid,to:'grave',destroy:true}]);break;}
 case'g40_BadDebt':choice(s,t,'マスターB・A・D：自分のクリーチャーを1体破壊する',creatures(s,t.p).map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));break;
 case'g40_Fiona':choice(s,t,'マナから出すフィールドを選ぶ？',[...own.mana.filter(x=>card(x).type==='field'&&api.canEnter(s,t.p,card(x),{origin:'mana',execution:false})).map(x=>opt(card(x).name,x.uid,40+cost(card(x)),x.cardId)),skip()]);break;
 case'g40_PlayerRamp':choice(s,t,'山札の上2枚をマナに置くプレイヤーを選ぶ',[opt('自分',t.p,own.deck.length>2?10:-100),opt('相手',1-t.p,s.players[1-t.p].deck.length<=2?100:-10)]);break;
 case'g40_Orzekia':queue(s,t,'OrzekiaEnemy',{selected:[]});choice(s,t,'オルゼキア：破壊する自分のクリーチャーを選ぶ',creatures(s,t.p).map(x=>opt(card(x).name,x.uid,x.cardId===t.source?10:-cost(card(x)),x.cardId)));break;
 case'g40_OrzekiaEnemy':{const rows=creatures(s,1-t.p),selected=t.selected.filter(uid=>rows.some(x=>x.uid===uid)),n=Math.min(2,rows.length);if(selected.length===n){if(n)move(s,selected.map(uid=>({player:1-t.p,uid,to:'grave',destroy:true,controller:t.p})));break;}choice(s,{...t,selected},'オルゼキア：破壊する自分のクリーチャーを2体選ぶ（'+selected.length+'/'+n+'）',rows.filter(x=>!selected.includes(x.uid)).map(x=>opt(card(x).name,x.uid,-cost(card(x)),x.cardId)));s.decision.player=1-t.p;break;}
 case'g40_Salvage':choice(s,{...t,selected:t.selected||[]},'墓地から手札に戻すクリーチャーを選ぶ（好きな数）',[...own.grave.filter(x=>card(x).type==='creature'&&!(t.selected||[]).includes(x.uid)).map(x=>opt(card(x).name,x.uid,10+cost(card(x)),x.cardId)),skip()]);break;
 case'g40_Sword':{const locked=api.deckLocked(s,t.p);if(!locked)api.log(s,t.p,'look','神秘の宝剣：自分の山札を確認',{cardId:t.source});choice(s,t,'タップしてマナに置く自然ではないカードを選ぶ？',[...(!locked?policyLook(s,t.p,own.deck.length,own.deck,api).filter(x=>!api.manaColors(card(x),s,t.p).includes('自然')).map(x=>opt(card(x).name,x.uid,card(x).g40Acashic&&!own.battle.some(y=>effective(y,s).g40Acashic)?100:10,x.cardId)):[]),skip()]);break;}
 case'g40_LastBurst':{const x=own.grave.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x&&api.canCast(s,t.p,faces(card(x))[1],'grave'))choice(s,t,'ラスト・バーストで'+faces(card(x))[1].name+'を唱える？',[opt(faces(card(x))[1].name+'を唱える',true,10,x.cardId),skip()]);break;}
 default:throw Error('未実装の優勝デッキ継続効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g40_'))return false;const own=s.players[t.p];switch(t.op){
 case'g40_ShieldPick':if(v)queue(s,t,'ShieldPick',{selected:[...t.selected,v]});else for(const uid of t.selected)api.moveShield(s,t.p,uid,'hand');break;
 case'g40_Dachi':if(v)(s.g40Dachi??=[]).push({p:t.p,turn:s.turn,n:v});break;
 case'g40_Sonkun':queue(s,t,v===3?'Break':'SonkunTarget',{mode:v});break;
 case'g40_SonkunTarget':move(s,[{player:1-t.p,uid:v,to:'grave',destroy:true}]);break;
 case'g40_Break':api.interruptBreak(s,1-t.p,[v],task('g40_Done',t.p,t.source));break;
 case'g40_Done':break;
 case'g40_BadDebt':move(s,[{player:t.p,uid:v,to:'grave',destroy:true}]);break;
 case'g40_Fiona':if(v)put(s,task('g34_Put',t.p,t.source,{origin:'mana',target:v,execution:false}));break;
 case'g40_PlayerRamp':put(s,task('g34_Ramp',v,t.source,{n:2,controller:t.p}));break;
 case'g40_Orzekia':move(s,[{player:t.p,uid:v,to:'grave',destroy:true}]);break;
 case'g40_OrzekiaEnemy':queue(s,t,'OrzekiaEnemy',{selected:[...t.selected,v]});break;
 case'g40_Salvage':if(v)queue(s,t,'Salvage',{selected:[...t.selected,v]});else for(const uid of t.selected){const x=policyRemove(s,t.p,'grave',uid,api);if(x){clear(x,'hand');api.addZone(s,t.p,'hand',x);}}break;
 case'g40_Sword':{const x=v&&own.deck.find(x=>x.uid===v);if(x){remove(own.deck,v);const to=api.deckRedirect(s,t.p)?'grave':'mana';clear(x,to);if(to==='mana')x.tapped=true;api.addZone(s,t.p,to,x);}api.shuffleLibrary(s,t.p,[],t.source);api.deckCheck(s,t.p);break;}
 case'g40_LastBurst':if(v)api.castBattleSpell(s,t.p,t.uid,0,t.source,'ラスト・バースト');break;
 default:throw Error('未実装の優勝デッキ継続選択：'+t.op);
 }return true;}
 return {run:(s,t)=>t.op==='g40_Done'||run(s,t),chosen,
 effect(s,p,c,uid,entry){if(!c.g40Effect)return false;put(s,task('g40_'+c.g40Effect,p,c.id,{uid,incarnation:entry?.incarnation||0}));return true;},
 discount(s,p,c){return c.type==='creature'&&beat(c)?creatures(s,p).filter(x=>effective(x,s).g40Chuchu).length+(s.g40Dachi||[]).filter(x=>x.p===p&&x.turn===s.turn).reduce((n,x)=>n+x.n,0):0;},
 summoned(s,p,x){const c=card(x);(s.g40Summons??=[]).push({p,turn:s.turn,fire:fire(c)});if(beat(c))s.g40Dachi=(s.g40Dachi||[]).filter(x=>x.p!==p||x.turn!==s.turn);},
 decorate(s,p,x,c){if(c.g40Kotatsu&&s.players[p].mana.filter(x=>card(x).type==='creature'&&(faces(card(x)).some(c=>fire(c))||s.players[p].battle.some(y=>(card(y).casablanca||card(y).g51Courtney)&&!api.ignored(s,y)))).length>=4)c={...c,attackBonus:(c.attackBonus||0)+4000,breaker:2};if(c.g40Kangoku&&s.players.reduce((n,p)=>n+p.shields.length,0)<=6)c={...c,power:c.power+3000};if(c.type==='creature'&&fire(c)&&s.players[p].battle.some(y=>card(y).g40FireSpeed&&!api.ignored(s,y)))c={...c,speedAttacker:true};if(x.g40Reckless?.turn===s.turn)c={...c,mustAttack:true};return c;},
 targetable(s,p,owner,x){if(p===owner)return true;const c=effective(x,s);if(String(c.race).includes('ドリームメイト')&&creatures(s,owner).some(y=>y.uid!==x.uid&&effective(y,s).g40Fiona))return false;if(c.g40Brella){const id=s.g35ChoosingSource||s.resolvingSpell?.source||s.extSpells?.at(-1)?.spell?.id,spell=s.extSpells?.findLast(f=>f.spell.id===id)?.spell;if(spell?.type==='spell'&&cost(spell)<=4)return false;}return true;},
 attack(s,p,x){const c=effective(x,s);if(c.g40Kotatsu)x.skipUntap=true;if(api.selfStopped(s,p))return;if(c.g40Kumitate){on(s,p,x,'Kumitate');if(s.players[p].battle.filter(y=>['creature','seed'].includes(effective(y,s).type)&&fire(effective(y,s))).length>=3)api.enqueue(s,p,{uid:x.uid,source:x.cardId,effect:'extended',task:task('draw',p,x.cardId,{n:1})});}if(c.g40Sonkun)on(s,p,x,'Sonkun');},
 attackStart(s,p,x){if(x.g40Reckless?.turn===s.turn&&s.attackLifecycle)s.attackLifecycle.g40Reckless={ids:api.layers(x).map(x=>({uid:x.uid,incarnation:x.incarnation||0})),n:x.g40Reckless.n,source:x.cardId};},
 attackEnd(s,a){if(a.g40Reckless)for(let i=0;i<a.g40Reckless.n;i++)api.enqueue(s,a.player,{source:a.g40Reckless.source,effect:'extended',task:task('g40_RecklessDeath',a.player,a.g40Reckless.source,{ids:a.g40Reckless.ids})});},
 inherit(s,a,b){if(a.g40Reckless)b.g40Reckless=structuredClone(a.g40Reckless);},
 snapshot(s,rows){return {sonkun:[0,1].map(p=>creatures(s,p).filter(x=>effective(x,s).g40Sonkun).map(x=>({uid:x.uid,cardId:x.cardId}))),gagaga:rows.filter(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return x&&effective(x,s).g40Gagaga;}).map(r=>r.uid),burst:rows.filter(r=>{const x=s.players[r.player].battle.find(x=>x.uid===r.uid);return x&&effective(x,s).g40LastBurst;}).map(r=>r.uid)};},
 leaving(s,p,x,snapshot,to,destroy){if(snapshot?.gagaga.includes(x.uid))on(s,p,x,'UntapTeam');if(to==='grave'&&destroy){for(const y of snapshot?.sonkun[p]||[])on(s,p,y,'Sonkun');if(snapshot?.burst.includes(x.uid))on(s,p,x,'LastBurst',{serial:(x.zoneSerial||0)+1});}},
 battleWins(s,p,w){if(!card(w.source).g40Yamata)return[];const x=creatures(s,p).find(x=>x.uid===w.uid);if(!x||!effective(x,s).g40Yamata)return[];return[{player:p,uid:w.uid,source:w.source,task:task('g34_Select',p,w.source,{origin:'mana',n:1,optional:true,deploy:true,filter:{creature:true,max:s.players[p].mana.length}})}];},
 mainActions(s,p){const out=[],own=s.players[p],noReduction=creatures(s,1-p).some(x=>effective(x,s).noCostReduction),freeSpells=own.battle.some(x=>card(x).g40Acashic&&!api.ignored(s,x));for(const x of own.hand){const c=card(x);for(const[face,f]of faces(c).entries())if(freeSpells&&f.type==='spell'&&api.canCast(s,p,f,'hand')&&api.canPay(s,p,{...f,g40PayNormally:true}))out.push({kind:'play',uid:x.uid,cardId:x.cardId,face,cost:api.summonCost(s,p,{...f,g40PayNormally:true}),alternative:'akashicPaid',label:f.name+'を通常のコストで唱える'});if(noReduction||!(c.g40Gagaga||c.g40MasterBad)||!api.canCast(s,p,c,'hand')||!api.canEnter(s,p,c,{origin:'hand',execution:true}))continue;const reduction=c.g40Gagaga?3+(summons(s,p)?3:0):2+summons(s,p)*2,payment={...c,g40Reduction:reduction};if(!api.canPay(s,p,payment))continue;for(const base of c.evolution?api.evolutionBases(s,p,c):[null])out.push({kind:'play',uid:x.uid,cardId:x.cardId,baseUid:base?.uid,origin:'hand',alternative:'championRush',g40Reduction:reduction,cost:api.summonCost(s,p,payment),label:c.name+'を'+(c.g40Gagaga?'軽減して召喚（攻撃後に破壊）':'マスターB・A・Dで召喚')});}return out;},
 alternative(s,p,a){if(a.alternative==='akashicPaid'){api.cast(s,p,a.uid,false,null,a.face||0,{cost:a.cost,fixedPayment:true,g40PayNormally:true});return;}const c=card(a.cardId);api.cast(s,p,a.uid,false,a.baseUid||null,0,{cost:a.cost,fixedPayment:true});const x=ownCreature(s,p,a.uid);if(c.g40MasterBad)(s.g40BadDebt??=[]).push({p,source:c.id,turn:s.turn});if(c.g40Gagaga&&x)x.g40Reckless={turn:s.turn,n:(x.g40Reckless?.turn===s.turn?x.g40Reckless.n:0)+1};},
 end(s){return[...creatures(s,s.active).filter(x=>effective(x,s).g40Kangoku).map(x=>({player:s.active,uid:x.uid,source:x.cardId,effect:'extended',task:task('g40_ShieldOne',s.active,x.cardId)})),...(s.g40BadDebt||[]).filter(x=>x.turn===s.turn).map(x=>({player:x.p,source:x.source,effect:'extended',task:task('g40_BadDebt',x.p,x.source)}))];},
 expire(s,when){if(when==='end'){s.g40Dachi=(s.g40Dachi||[]).filter(x=>x.turn!==s.turn);s.g40Summons=(s.g40Summons||[]).filter(x=>x.turn!==s.turn);s.g40BadDebt=(s.g40BadDebt||[]).filter(x=>x.turn!==s.turn);}},
 };
 function ownCreature(s,p,uid){return s.players[p].battle.find(x=>x.uid===uid);}
}
