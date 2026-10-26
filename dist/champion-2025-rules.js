import {policyRemove} from './champion-zone-policy.js';
// Exact 2025 champion lists: zone choices and delayed targets retain physical identities.
export function createChampion2025Rules(api){
 const {card,faces,cost,colors,effective,power,creatures,put,task,choice,opt,skip}=api;
 const live=(s,p,uid,incarnation)=>s.players[p].battle.find(x=>x.uid===uid&&(x.incarnation||0)===incarnation);
 const big=(s,p)=>creatures(s,p).some(x=>power(x,false,s)>=12000);
 const on=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g42_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const release=(s,p,uid)=>{s.players[p].g34Protected=(s.players[p].g34Protected||[]).filter(x=>x!==uid);};
 function run(s,t){if(!t.op.startsWith('g42_'))return false;const own=s.players[t.p];switch(t.op){
 case'g42_Shields':{const ids=own.shields.map(x=>x.uid);let n=0;for(const uid of ids)if(api.moveShield(s,t.p,uid,'grave').length)n++;for(let i=0;i<n&&s.winner===null;i++)api.shieldTop(s,t.p,card(t.source));api.deckCheck(s,t.p);break;}
 case'g42_BigGuard':{api.shuffleLibrary(s,t.p,[],t.source);if(api.deckLocked(s,t.p))break;const x=own.deck[0];if(!x){api.deckCheck(s,t.p);break;}api.log(s,t.p,'reveal',card(t.source).spellFace.name+'：'+card(x).name,{cardId:x.cardId});if(card(x).type==='creature'&&power(x,false,s)>=12000){(own.g34Protected??=[]).push(x.uid);choice(s,{...t,target:x.uid,targetIncarnation:(x.incarnation||0)+1},'公開したパワー12000以上のクリーチャーをタップして出す？',[opt('タップして出す',true,30,x.cardId),skip()]);}break;}
 case'g42_Lure':if(live(s,t.p,t.target,t.targetIncarnation)&&api.isCreature(s,live(s,t.p,t.target,t.targetIncarnation)))(s.g42Lures??=[]).push({p:t.p,uid:t.target,incarnation:t.targetIncarnation,source:t.source,cost:7});release(s,t.p,t.target);api.deckCheck(s,t.p);break;
 case'g42_MinoAttack':{const rows=creatures(s,t.p).filter(x=>faces(card(x))[1]&&api.canCast(s,t.p,faces(card(x))[1],'battle'));choice(s,t,'バトルゾーンに置いたまま唱えるツインパクトの呪文側を選ぶ',[...rows.map(x=>opt(faces(card(x))[1].name,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId},20+cost(faces(card(x))[1]),x.cardId)),skip()]);break;}
 case'g42_MinoReturn':{const x=own.grave.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x&&big(s,t.p))choice(s,t,'墓地の大虹帝 ミノガミを手札に戻す？',[opt('手札に戻す',true,10,x.cardId),skip()]);break;}
 default:throw Error('未実装の2025優勝デッキ効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g42_'))return false;switch(t.op){
 case'g42_BigGuard':if(v)put(s,task('g34_Put',t.p,t.source,{origin:'deck',target:t.target,tapped:true,execution:false}),{...t,op:'g42_Lure'});else release(s,t.p,t.target);break;
 case'g42_MinoAttack':if(v&&live(s,t.p,v.uid,v.incarnation))api.castBattleSpell(s,t.p,v.uid,v.incarnation,v.source,'大虹帝 ミノガミ');break;
 case'g42_MinoReturn':if(v&&big(s,t.p)){const x=s.players[t.p].grave.find(x=>x.uid===t.uid&&(x.zoneSerial||0)===t.serial);if(x){policyRemove(s,t.p,'grave',x.uid,api);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}}break;
 default:throw Error('未実装の2025優勝デッキ選択：'+t.op);
 }return true;}
 return {run,chosen,
 effect(s,p,c){if(!c.g42Effect)return false;put(s,task('g42_'+c.g42Effect,p,c.id));return true;},
 discount(s,p,c){return c.type==='creature'&&/ディスペクター|ディスタス/.test(c.race)?Math.min(c.g42Reduction??Infinity,s.players[p].battle.filter(x=>card(x).g42DisReduce&&!api.ignored(s,x)&&api.isCreature(s,x)).length*2):0;},
 variants(s,p,actions){if(!s.players[p].battle.some(x=>card(x).g42DisReduce&&!api.ignored(s,x))||s.players[1-p].battle.some(x=>card(x).noCostReduction&&!api.ignored(s,x)))return actions;const out=[...actions];for(const a of actions){if(a.kind!=='play'||a.freeSummon||a.alternative||a.g42Reduction!==undefined)continue;const c=faces(card(a.cardId))[a.face||0],max=this.discount(s,p,c);for(let n=0;n<max;n++){const pay={...c,summonOrigin:a.origin||'hand',g42Reduction:n,...(a.g7Payment?{g7Payment:a.g7Payment}:{}),...(a.snowReducers?{snowReducers:a.snowReducers}:{}),...(a.magicReducers?{magicReducers:a.magicReducers}:{}),...(a.g18Reducers!==undefined?{g18Reducers:a.g18Reducers}:{}),...(a.g26Reducers?{g26Reducers:a.g26Reducers}:{})};if(api.canPay(s,p,pay))out.push({...a,g42Reduction:n,requiresMethod:true,cost:api.summonCost(s,p,pay),label:c.name+'をシデンシーザーの軽減'+n+'で召喚'});}}return out;},
 decorate(s,p,x,c){if(c.type==='creature'&&api.isEvolution(x)&&s.players[p].battle.some(x=>card(x).g42Lab&&!api.ignored(s,x)))return {...c,unblockable:true};return c;},
 canAttack(s,p,x){return x.entered!==s.turn||!api.isEvolution(x)||!s.players[1-p].battle.some(x=>card(x).g42Lab&&!api.ignored(s,x));},
 canLeave(s,p,x,{battleLoss=false}={}){return battleLoss||!api.isCreature(s,x)||!s.players[p].battle.some(y=>card(y).g42Jista&&!api.ignored(s,y)&&api.isCreature(s,y))||power(x,x.uid===s.attack?.attacker,s)<12000;},
 d2Entry(s,p,x){if(!card(x).d2Field)return;const rows=[0,1].flatMap(p=>s.players[p].battle.filter(y=>y.uid!==x.uid&&card(y).d2Field).map(y=>({player:p,uid:y.uid,to:'grave',destroy:false,stateBased:true})));if(rows.length)api.move(s,rows);},
 spellCast(s,p,c,x){if(x&&c.g42Bottom&&!api.spellIgnored(s,c))x.finishTo='deck';},
 attack(s,p,x){if(card(x).g42Mino&&!api.ignored(s,x)&&!api.selfStopped(s,p))on(s,p,x,'MinoAttack');},
 start(s,p){if(!big(s,p))return[];return s.players[p].grave.filter(x=>card(x).g42Mino).map(x=>({player:p,source:x.cardId,uid:x.uid,effect:'extended',task:task('g42_MinoReturn',p,x.cardId,{uid:x.uid,serial:x.zoneSerial||0})}));},
 forceActions(s,p,actions){const lures=(s.g42Lures||[]).filter(l=>l.p!==p&&!api.spellIgnored(s,{type:'spell',cost:l.cost,spellSource:l.source}));if(!lures.length)return actions;const possible=new Set(actions.filter(a=>a.kind==='attack'&&s.players[1-p].battle.some(x=>x.uid===a.target&&api.layers(x).some(y=>lures.some(l=>l.uid===y.uid&&l.incarnation===(y.incarnation||0))))).map(a=>a.uid));return actions.filter(a=>a.kind!=='attack'||!possible.has(a.uid)||s.players[1-p].battle.some(x=>x.uid===a.target&&api.layers(x).some(y=>lures.some(l=>l.uid===y.uid&&l.incarnation===(y.incarnation||0)))));},
 stateCheck(s){if(s.winner!==null||s.lossEvent)return;for(const p of[s.active,1-s.active]){const sources=s.players[p].battle.filter(x=>card(x).g42Eleven&&!api.ignored(s,x)&&api.isCreature(s,x));if(sources.length&&creatures(s,p).filter(x=>colors(effective(x,s)).includes('水')).length>=11){api.finish(s,p,'サイバー・J・イレブン：水のクリーチャー11体以上で勝利');return;}}},
 expire(s,when,p){if(when==='start')s.g42Lures=(s.g42Lures||[]).filter(l=>l.p!==p);},
 };
}
