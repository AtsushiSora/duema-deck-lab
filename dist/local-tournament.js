const copy=x=>structuredClone(x);
export const TOURNAMENT_SIZES=[4,8,16,32];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function tournamentRandom(seed){let n=seed>>>0;return ()=>{n=(n+0x6D2B79F5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffled(values,random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeRound(ids,round,random){return Array.from({length:ids.length/2},(_,i)=>({id:`r${round}-m${i}`,players:ids.slice(i*2,i*2+2),seed:Math.floor(random()*4294967296),first:Math.floor(random()*2),winner:null,reason:''}));}
export function selectTournamentParticipants({candidates,selected,size,seed,randomKeys=null}){
 if(!TOURNAMENT_SIZES.includes(size)||!Array.isArray(selected)||selected.length!==size)throw Error('参加数を確認してください');
 const byKey=new Map(candidates.map(c=>[c.key,c.deck])),fixed=selected.filter(k=>k!=null);
 if(fixed.some(k=>!byKey.has(k)))throw Error('選択したデッキを確認してください');
 if(new Set(fixed).size!==fixed.length)throw Error('同じ構成のデッキは重複して参加できません');
 const used=new Set(fixed),allowed=randomKeys===null?null:new Set(randomKeys),pool=shuffled(candidates.filter(c=>!used.has(c.key)&&(!allowed||allowed.has(c.key))),tournamentRandom(seed));
 const needed=size-fixed.length;if(pool.length<needed)throw Error('ランダム枠に使えるデッキは'+pool.length+'件です。参加数を減らすか、候補範囲を広げるか、枠ごとにデッキを選んでください');
 let i=0;return selected.map(k=>copy(k==null?pool[i++].deck:byKey.get(k)));
}
export function createLocalTournament({id,deck,opponents=[],participants=null,size=8,seed,first='random',mode='human'}){
 if(!TOURNAMENT_SIZES.includes(size)||!id||!['human','cpu'].includes(mode)||!['random','first','second'].includes(first))throw Error('参加デッキと参加数を確認してください');
 const random=tournamentRandom(seed);let entrants=participants;
 if(!entrants){if(mode==='human'&&!deck||opponents.length<size-(mode==='human'?1:0))throw Error('参加デッキと参加数を確認してください');entrants=[...(mode==='human'?[deck]:[]),...shuffled(opponents,random).slice(0,size-(mode==='human'?1:0))];}
 if(entrants.length!==size||entrants.some(d=>!d||!Array.isArray(d.cards)))throw Error('参加デッキを確認してください');
 const players=entrants.map((d,i)=>({id:mode==='human'&&i===0?'human':'cpu-'+i,deck:copy(d)}));
 return {formatVersion:1,id,created:new Date().toISOString(),size,seed:seed>>>0,first,mode,players,rounds:[makeRound(shuffled(players.map(p=>p.id),random),0,random)],champion:null};
}
export const currentTournamentRound=t=>t?.rounds.find(r=>r.some(m=>m.winner===null))||null;
export const humanTournamentMatch=t=>currentTournamentRound(t)?.find(m=>m.winner===null&&m.players.includes('human'))||null;
export function recordTournamentMatch(t,matchId,winner,reason=''){
 const old=t.rounds.flat().find(m=>m.id===matchId);if(!old||!old.players.includes(winner))throw Error('トーナメントの対戦結果を確認してください');if(old.winner!==null)return t;
 const next=copy(t),match=next.rounds.flat().find(m=>m.id===matchId);match.winner=winner;match.reason=String(reason);
 const round=next.rounds.at(-1);if(round.every(m=>m.winner!==null)){if(round.length===1)next.champion=round[0].winner;else next.rounds.push(makeRound(round.map(m=>m.winner),next.rounds.length,tournamentRandom((next.seed+next.rounds.length*2654435761)>>>0)));}
 return next;
}
export function validLocalTournament(t){
 if(!t||t.formatVersion!==1||typeof t.id!=='string'||!TOURNAMENT_SIZES.includes(t.size)||!Number.isSafeInteger(t.seed)||!['random','first','second'].includes(t.first)||!Array.isArray(t.players)||t.players.length!==t.size||!Array.isArray(t.rounds)||!t.rounds.length||t.rounds.length>Math.log2(t.size))return false;
 const mode=t.mode??'human';if(!['human','cpu'].includes(mode))return false;const ids=t.players.map(p=>p.id);if(new Set(ids).size!==t.size||ids.filter(id=>id==='human').length!==(mode==='cpu'?0:1)||t.players.some(p=>!p.deck||typeof p.deck.name!=='string'||!Array.isArray(p.deck.cards)))return false;
 let expected=ids;for(let r=0;r<t.rounds.length;r++){const matches=t.rounds[r];if(!Array.isArray(matches)||matches.length!==t.size/2**(r+1))return false;
  const entrants=[];for(let i=0;i<matches.length;i++){const m=matches[i];if(!m||m.id!==`r${r}-m${i}`||!Array.isArray(m.players)||m.players.length!==2||m.players[0]===m.players[1]||!Number.isSafeInteger(m.seed)||![0,1].includes(m.first)||!(m.winner===null||m.players.includes(m.winner)))return false;entrants.push(...m.players);}
  if([...entrants].sort().join('|')!==[...expected].sort().join('|'))return false;
  if(r>0&&matches.some((m,i)=>m.players.some((id,j)=>id!==t.rounds[r-1][i*2+j].winner)))return false;
  if(r<t.rounds.length-1&&matches.some(m=>m.winner===null))return false;expected=matches.map(m=>m.winner);
 }
 const last=t.rounds.at(-1),finished=last.every(m=>m.winner!==null);return finished?last.length===1&&t.champion===last[0].winner:t.champion===null;
}
export const tournamentRoundName=(size,r)=>size/2**r===2?'決勝':size/2**r===4?'準決勝':`${r+1}回戦`;
export function localTournamentHTML(t,{busy=false,checkpoint=false}={}){
 const cpuOnly=t.mode==='cpu',player=id=>t.players.find(p=>p.id===id),human=player('human'),next=humanTournamentMatch(t),round=t.rounds.findIndex(r=>r.some(m=>m.winner===null)),humanLost=t.rounds.flat().some(m=>m.players.includes('human')&&m.winner!==null&&m.winner!=='human');
 return `<section class="panel tournament-summary"><span class="badge green">${t.size}デッキ · ${cpuOnly?'すべてCPU':'勝ち抜き戦'}</span><h2>${t.champion?(t.champion==='human'?'優勝おめでとう！':'大会終了'):cpuOnly?tournamentRoundName(t.size,round)+' · CPU対戦':humanLost?'敗退 · 残りの試合を見届けよう':tournamentRoundName(t.size,round)+'に挑戦'}</h2><p>${t.champion?'優勝：'+esc(player(t.champion).deck.name):cpuOnly?'全'+t.size+'デッキをCPUが操作します':'使用デッキ：'+esc(human.deck.name)}</p><div class="row wrap gap8">${!t.champion?`<button class="btn primary" data-action="tournament-next" ${busy?'disabled':''}>${busy?'CPU対戦 '+(currentTournamentRound(t)?.filter(m=>!m.players.includes('human')&&m.winner!==null).length||0)+' / '+(currentTournamentRound(t)?.filter(m=>!m.players.includes('human')).length||0)+' 完了':cpuOnly?'決勝まで自動で進める':checkpoint?'中断した対戦を再開':next?tournamentRoundName(t.size,round)+'を始める':'残りの試合を自動で進める'}</button>`:''}<button class="btn" data-action="tournament-new" ${busy?'disabled':''}>新しいトーナメント</button>${busy?'<button class="btn" data-action="tournament-stop">自動進行を中止</button>':''}<button class="btn danger" data-action="tournament-delete" data-id="${esc(t.id)}">トーナメントを削除</button></div><p class="small mt16">${cpuOnly?'全試合をCPU同士で進めます。いつでも中止・続きから再開できます。':'自分の試合は手動、CPU同士は自動対戦。'}参加デッキは大会中固定です。途中経過はこの端末に保存します。</p></section><div class="tournament-rounds" aria-label="トーナメント表">${Array.from({length:Math.log2(t.size)},(_,r)=>`<section class="panel tournament-round"><h3>${tournamentRoundName(t.size,r)}</h3>${Array.from({length:t.size/2**(r+1)},(_,i)=>{const m=t.rounds[r]?.[i];return `<article class="tournament-pair ${m?.players.includes('human')?'has-human':''}">${[0,1].map(j=>{const p=m?player(m.players[j]):null;return `<div class="tournament-entrant ${p&&m?.winner===p.id?'winner':''}"><span>${p?esc(p.deck.name):'前の試合の勝者'}${p?.id==='human'?'<small>あなた</small>':''}</span><b>${p&&m?.winner===p.id?'勝':m?.winner?'敗':''}</b></div>`;}).join('')}${m?.reason?`<small class="tournament-match-reason">${esc(m.reason)}</small>`:''}</article>`;}).join('')}</section>`).join('')}</div>`;
}
