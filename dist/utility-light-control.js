import{RECOVERY_RACES}from'./utility-recovery-races.js?v=0.119.0';
// Race boosts follow their surviving source; attack restrictions check pre-attack power.
export function createUtilityLightControl(api){
 const{card,faces,cost,effective,creatures,put,task,choice,opt}=api;
 const living=(s,p)=>creatures(s,p).filter(x=>!x.sealed),key=x=>x.uid+'@'+(x.incarnation||0),follow=(t,op,more={})=>({...t,op:'g89_'+op,...more});
 const queue=(s,p,x,op,more={})=>api.enqueue(s,p,{uid:x.uid,incarnation:x.incarnation||0,source:x.cardId,effect:'extended',task:task('g89_'+op,p,x.cardId,{uid:x.uid,incarnation:x.incarnation||0,...more})});
 const graveSpells=(s,p)=>api.canMoveZone(s,p,'grave')?s.players[p].grave.filter(x=>faces(card(x)).some(c=>c.type==='spell')):[];
 const gears=(s,p)=>api.targetOptions(s,p,s.players[1-p].battle.filter(x=>!x.sealed&&card(x).type==='gear'));
 const ulfeus=(s,p)=>s.players[p].grave.some(x=>card(x).type==='creature'&&/エンジェル・コマンド|ドラゴン/.test(card(x).race||''));
 const spells=(s,p)=>s.players[p].hand.flatMap(x=>faces(card(x)).flatMap((c,face)=>c.type==='spell'&&(c.trigger||c.triggerPlus||c.superTrigger)&&api.canCast(s,p,c,'hand')?[{x,c,face}]:[]));
 const locked=(s,x)=>{const sources=s.players.flatMap(p=>p.battle.filter(y=>!y.sealed&&(card(y).g89Mariel||card(y).g89Adel)&&api.isCreature(s,y)&&!api.ignored(s,y)));if(!sources.length)return false;const n=api.power(x,false,s);return sources.some(y=>card(y).g89Mariel&&n>=3000||card(y).g89Adel&&n<api.power(y,false,s));};
 function run(s,t){if(!t.op.startsWith('g89_'))return false;const own=s.players[t.p];switch(t.op){
 case'g89_Petrova':{const value=r=>{const matched=[t.p,1-t.p].flatMap(p=>living(s,p).filter(x=>String(effective(x,s).race||'').includes(r)).map(x=>({p,x})));if(!matched.length)return 0;const view={...s,players:s.players.map(p=>({...p,battle:p.battle.map(x=>key(x)===key(t)?{...x,g89Race:r}:x)}))};return matched.reduce((n,{p,x})=>n+(p===t.p?1:-1)*(10+Math.min(30,cost(effective(x,s)))),0)+[t.p,1-t.p].reduce((n,p)=>n+living(s,p).reduce((v,x)=>{const before=locked(s,x),after=locked(view,x);return v+(before===after?0:p===t.p?(after?-50:20):(after?30:-30));},0),0);},options=RECOVERY_RACES.filter(r=>r!=='メカ・デル・ソル').map(r=>opt(r,r,value(r)));options.sort((a,b)=>b.score-a.score);choice(s,t,'強化する種族を1つ選ぶ（メカ・デル・ソル以外）',options);break;}
 case'g89_Ulfeus':if(ulfeus(s,t.p))choice(s,t,'手札から無料で唱えるS・トリガー呪文を1枚まで選ぶ',[...spells(s,t.p).map(({x,c,face})=>opt(c.name,{uid:x.uid,face},15+Math.min(30,cost(c)),x.cardId)),opt('唱えない',null,0)]);break;
 case'g89_Julius':{const recover=graveSpells(s,t.p),remove=gears(s,t.p);choice(s,t,'ユリウスの攻撃時能力を選ぶ',[...(recover.length?[opt('墓地の呪文を1枚手札に戻す','recover',20)]:[]),...(remove.length?[opt('相手のクロスギアを1枚墓地に置く','gear',25)]:[]),opt('使わない',null,0)]);break;}
 case'g89_Recover':choice(s,t,'墓地から手札に戻す呪文を1枚選ぶ',graveSpells(s,t.p).map(x=>opt(card(x).name,x.uid,10+Math.min(30,cost(card(x))),x.cardId)));break;
 case'g89_Gear':choice(s,t,'墓地に置く相手のクロスギアを1枚選ぶ',gears(s,t.p));break;
 case'g89_Amore':for(const player of[0,1])(s.extLimits??=[]).push({kind:'attack',player,expires:'end',who:s.active,controller:t.p,source:t.source});break;
 default:throw Error('未実装の光の制御効果：'+t.op);
 }return true;}
 function chosen(s,t,v){if(!t.op.startsWith('g89_'))return false;const own=s.players[t.p];switch(t.op){
 case'g89_Petrova':{const x=own.battle.find(x=>key(x)===key(t));if(x)x.g89Race=v;break;}
 case'g89_Ulfeus':if(v&&ulfeus(s,t.p)){const row=spells(s,t.p).find(r=>r.x.uid===v.uid&&r.face===v.face);if(row)api.cast(s,t.p,row.x.uid,true,null,row.face,null,'hand','龍聖霊ウルフェウス');}break;
 case'g89_Julius':if(v)put(s,follow(t,v==='recover'?'Recover':'Gear'));break;
 case'g89_Recover':{const x=graveSpells(s,t.p).find(x=>x.uid===v);if(x){api.remove(own.grave,v);api.clear(x,'hand');api.addZone(s,t.p,'hand',x);}break;}
 case'g89_Gear':if(v)api.move(s,[{player:1-t.p,uid:v,to:'grave',destroy:false,controller:t.p}]);break;
 default:throw Error('未実装の光の制御選択：'+t.op);
 }return true;}
 return{run,chosen,effect(s,p,c,uid,entry){if(!c.g89Effect)return false;put(s,task('g89_'+c.g89Effect,p,c.id,{uid,incarnation:entry?.incarnation??s.players[p].battle.find(x=>x.uid===uid)?.incarnation??0}));return true;},
 power(s,x,c){if(c.type!=='creature'||x.sealed)return 0;const sources=s.players.flatMap(p=>p.battle.filter(y=>y.g89Race&&!y.sealed));if(!sources.length||!s.players.some(p=>p.battle.some(y=>y.uid===x.uid)))return 0;return sources.filter(y=>String(c.race).includes(y.g89Race)&&api.isCreature(s,y)&&!api.ignored(s,y)).length*4000;},
 locked,
 attack(s,p,x){if(effective(x,s).g89Julius&&!api.selfStopped(s,p))queue(s,p,x,'Julius');},
 snapshot(s){return[0,1].flatMap(p=>living(s,p).filter(x=>effective(x,s).g89Amore).map(x=>({p,uid:x.uid,incarnation:x.incarnation||0,cardId:x.cardId})));},
 leaving(s,p,x,before,to,destroy){if(to==='grave'&&destroy&&before?.some(y=>y.p===p&&key(y)===key(x)))queue(s,p,x,'Amore');}};
}
