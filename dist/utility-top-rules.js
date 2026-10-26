// Continuous support and private top-deck ordering use physical cards and serializable choices.
export function createUtilityTopRules(api){
 const{card,cost,put,task,choice,opt}=api;
 const dragon=c=>c.type==='creature'&&String(c.race).includes('ドラゴン');
 const creatures=(s,p)=>api.creatures(s,p).filter(x=>!x.sealed);
 const active=(s,p,flag)=>creatures(s,p).filter(x=>card(x)[flag]&&!api.ignored(s,x));
 const held=own=>new Set(Object.entries(own).filter(([k,v])=>Array.isArray(v)&&/Protected$|Reveals$/.test(k)).flatMap(([,v])=>v));
 const available=own=>{const skip=held(own);return own.deck.filter(x=>!skip.has(x.uid));};
 const queue=(s,t,op,more={})=>put(s,{...t,op:'g63_'+op,...more});
 function look(s,t,n){const xs=available(s.players[t.p]).slice(0,api.lookCount(s,t.p,n));if(!xs.length)return;(s.players[t.p].g34Protected??=[]).push(...xs.map(x=>x.uid));api.log(s,t.p,api.lookPublic(s,t.p)?'reveal':'look',card(t.source).name+'：山札の上'+xs.length+'枚を確認'+(api.lookPublic(s,t.p)?'：'+xs.map(x=>card(x).name).join('・'):''),{cardId:t.source});queue(s,t,'Order',{ids:xs.map(x=>x.uid),ordered:[]});}
 function watch(s,p,x,o){if(!api.isCreature(s,x))return;for(const q of[0,1]){if(q===p&&(o.selfMuted||api.selfStopped(s,p)))continue;for(const y of active(s,q,'g63Mist'))if(y.uid!==x.uid)api.enqueue(s,q,{uid:y.uid,incarnation:y.incarnation||0,source:y.cardId,effect:'extended',task:task('g34_Draw',q,y.cardId,{n:1,optional:true,uid:y.uid,incarnation:y.incarnation||0})});}}
 function run(s,t){if(!t.op.startsWith('g63_'))return false;const own=s.players[t.p];switch(t.op){
 case'g63_Analyze':{const n=Math.min(5,available(own).length,api.lookCount(s,t.p,5));if(n)choice(s,t,'見る枚数を選ぶ（上から5枚まで）',Array.from({length:n+1},(_,n)=>opt(n+'枚を見る',n,n)));break;}
 case'g63_Synapse':look(s,t,4);break;
 case'g63_Order':{const ids=t.ids.filter(uid=>own.deck.some(x=>x.uid===uid));if(ids.length>1)choice(s,{...t,ids},'山札の上から'+(t.ordered.length+1)+'枚目に戻すカードを選ぶ',ids.map(uid=>{const x=own.deck.find(x=>x.uid===uid);return opt(card(x).name,uid,Math.min(cost(card(x)),30),x.cardId);}));else{const all=[...t.ordered,...ids],xs=all.map(uid=>api.remove(own.deck,uid)).filter(Boolean);own.g34Protected=(own.g34Protected||[]).filter(uid=>!all.includes(uid));own.deck.unshift(...xs);}break;}
 case'g63_Stone':{const x=api.takeTop(s,t.p);if(!x){api.deckCheck(s,t.p);break;}const creature=card(x).type==='creature',to=api.deckRedirect(s,t.p)?'grave':'mana';api.clear(x,to);api.addZone(s,t.p,to,x);if(creature)for(const y of creatures(s,t.p))(y.powerModifiers??=[]).push({amount:2000,expires:'end',who:s.active,spellSource:t.source,spellCost:cost(card(t.source))});api.deckCheck(s,t.p);break;}
 default:throw Error('未実装の山札補助効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g63_'))return false;switch(t.op){case'g63_Analyze':look(s,t,v);break;case'g63_Order':queue(s,t,'Order',{ids:t.ids.filter(uid=>uid!==v),ordered:[...t.ordered,v]});break;default:throw Error('未実装の山札補助選択：'+t.op);}return true;}
 return{run,chosen,
 effect(s,p,c,uid){if(!c.g63Effect)return false;put(s,task('g63_'+c.g63Effect,p,c.id,{uid}));return true;},
 rupias:(s,p,c)=>dragon(c)?active(s,p,'g63Rupia').length:0,
 decorate(s,p,x,c){return dragon(c)&&[0,1].some(q=>active(s,q,'g63Citta').length)?{...c,attackUntapped:true}:c;},
 entry(s,p,x,o){if(s.g25DeployBatch||s.g32DeployBatch||s.g34DeployBatch){(s.g63Entries??=[]).push({p,uid:x.uid,incarnation:x.incarnation||0,selfMuted:!!o.selfMuted});}else watch(s,p,x,o);},
 flush(s){if(!s.g63Entries?.length)return;const events=s.g63Entries;delete s.g63Entries;for(const r of events){const x=s.players[r.p].battle.find(x=>x.uid===r.uid&&(x.incarnation||0)===r.incarnation);if(x)watch(s,r.p,x,{selfMuted:r.selfMuted||s.players[1-r.p].battle.some(y=>api.effective(y,s).entrySilence)});}}
 };
}
