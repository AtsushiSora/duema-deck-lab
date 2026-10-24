import {HERO_IDS} from './hero-draw.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function resolveHeroDecks(data,registry){
 if(data?.schemaVersion!==1||data.heroes?.length!==4)throw Error('主人公データの形式が正しくありません');
 const ids=new Set();return data.heroes.map(h=>{if(!HERO_IDS.includes(h.id)||ids.has(h.id))throw Error('主人公IDが正しくありません');ids.add(h.id);
 const d={id:'hero-'+h.id,name:h.name+' · '+h.title,format:'original',category:'主人公',cards:h.cards.map(x=>({...x})),hero:{...h,cards:undefined}};
 const errors=registry.validate(d);if(errors.length||registry.coverage(d).unsupported||!h.signature.length||h.signature.some(id=>!d.cards.some(x=>x.id===id)))throw Error('主人公の40枚構成を確認してください：'+h.name);return d;
 });
}
export function challengeOptions(deck){return {heroId:deck.hero.id,seat:1,signature:[...deck.hero.signature]};}
export function recordHeroResult(progress,heroId,gameId,winner){
 if(!HERO_IDS.includes(heroId)||![0,1].includes(winner)||!gameId)return progress||{};
 const old=progress?.[heroId]||{wins:0,losses:0,games:[]};if(old.games?.includes(gameId))return progress;
 return {...progress,[heroId]:{wins:(old.wins||0)+(winner===0?1:0),losses:(old.losses||0)+(winner===1?1:0),games:[gameId,...old.games||[]].slice(0,64)}};
}
export function heroChallengeHTML(decks,progress,{art=()=>'',ready=true}={}){
 return `<section class="hero-challenge" aria-label="主人公チャレンジ"><div class="hero-intro"><span class="eyebrow">HERO CHALLENGE</span><h2>歴代主人公に挑め。</h2><p>あなたのデッキで、4人の切り札を攻略しよう。</p></div><div class="hero-grid">${decks.map(d=>{const h=d.hero,r=progress?.[h.id]||{},wins=r.wins||0;return `<article class="hero-card" style="--hero-accent:${esc(h.accent)}"><div class="hero-art" aria-hidden="true">${art(h.signature[0])}</div><div class="hero-content"><div class="row spread"><span class="hero-number">CHALLENGER ${HERO_IDS.indexOf(h.id)+1}</span>${wins?'<span class="badge green">撃破済み ✓</span>':''}</div><h3>${esc(h.name)}</h3><strong>${esc(h.title)}</strong><p>${esc(h.description)}</p><small>${wins}勝 · ${r.losses||0}敗</small><div class="hero-buttons"><button class="btn primary" data-action="hero-start" data-id="${esc(d.id)}" ${ready?'':'disabled'}>${wins?'もう一度挑む':'挑む'}</button><button class="btn" data-action="hero-deck" data-id="${esc(d.id)}">40枚を見る</button></div></div></article>`;}).join('')}</div></section>`;
}
