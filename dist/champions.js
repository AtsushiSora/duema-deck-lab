import {historicalProfile} from './historical-regulations.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=rows=>rows.reduce((n,r)=>n+r.count,0);
export const isOriginalChampion=r=>String(r?.format||'').includes('オリジナル')&&r.mainCount===40&&r.extraCount===0&&r.extraZones.length===0;
export function originalChampions(data){return {...data,records:data.records.filter(isOriginalChampion),gaps:data.gaps.filter(r=>String(r.format||'').includes('オリジナル'))};}
export const officialChampionSource=url=>/^https:\/\/dm\.takaratomy\.co\.jp\/(?:coverage(?:_cat)?\/|product\/dmex06\/\d{3}\/)/.test(url);
export function officialArchiveSource(archive,source){
 if(!archive)return true;
 const match=archive.match(/^https:\/\/web\.archive\.org\/web\/(\d{14})id_\/(https?:\/\/dm\.takaratomy\.co\.jp\/[^?#]+)$/);
 return !!match&&match[2].replace(/^http:/,'https:').replace(/\/$/,'')===source.replace(/\/$/,'');
}
export function resolveChampions(data,registry){
 if(data?.schemaVersion!==1||!Array.isArray(data.records)||!Array.isArray(data.gaps))throw Error('優勝デッキの形式が正しくありません');
 for(const gap of data.gaps)if(!officialChampionSource(gap.source)||!gap.reason)throw Error('未収録資料の出典を確認してください');
 const seen=new Set();
 const records=data.records.map(r=>{
  if(!r.id||seen.has(r.id)||!Number.isSafeInteger(r.year)||!r.player||!r.event||r.result!=='優勝'||r.complete!==true)throw Error('優勝デッキの情報が正しくありません');seen.add(r.id);
  for(const url of[r.source,r.resultSource])if(!officialChampionSource(url))throw Error('公式の出典が必要です');
  if(!officialArchiveSource(r.archiveSource,r.source))throw Error('公式ページの保存記録を確認してください');
  for(const c of r.sourceCorrections||[])if(!/^https:\/\/dm\.takaratomy\.co\.jp\/product\/img\/main\d+\.jpg$/.test(c.imageSource)||!Number.isSafeInteger(c.index)||c.index<0||!registry.get(c.id)||!c.name||!Number.isSafeInteger(c.count)||c.count<1||!/^[a-f0-9]{64}$/.test(c.imageSha256))throw Error('公式掲載画像の転記記録を確認してください');
  const rows=[r.cards,...r.extraZones.map(z=>z.cards)];
  for(const list of rows)for(const row of list)if(!row.name||!Number.isSafeInteger(row.count)||row.count<1||row.count>40||!registry.get(row.id))throw Error('公式構成のカードを確認できません：'+row.name);
  if(count(r.cards)!==r.mainCount||r.extraZones.reduce((n,z)=>n+count(z.cards),0)!==r.extraCount)throw Error('公式構成の枚数が一致しません');
  const deck=r.mainCount===40&&!r.extraCount?{id:r.id,name:r.player+' · '+r.event,cards:registry.resolveRows(r.cards),format:'original',category:'大会優勝',historicalId:r.id,tournament:{event:r.event,player:r.player,result:'優勝',source:r.source,resultSource:r.resultSource,checkedAt:r.checkedAt}}:null;
  if(deck&&(!historicalProfile(deck)||registry.validate(deck).length))throw Error('当時の固定構成を確認できません');
  const unsupportedCopies=r.cards.filter(c=>!registry.get(c.id).supported).reduce((n,c)=>n+c.count,0);
  return {...r,deck,unsupportedCopies,playable:!!deck&&!unsupportedCopies};
 });
 return {...data,records:records.sort((a,b)=>b.year-a.year||a.event.localeCompare(b.event,'ja')||a.player.localeCompare(b.player,'ja'))};
}
export function championRowsHTML(recipe){
 const zone=(label,rows)=>`<section class="champion-zone"><h4>${esc(label)} <span>${count(rows)}枚</span></h4><ul>${rows.map(r=>`<li><button class="details-link" data-action="card-detail" data-id="${esc(r.id)}">${esc(r.name)}</button><b>×${r.count}</b></li>`).join('')}</ul></section>`;
 return zone('メインデッキ',recipe.cards)+recipe.extraZones.map(z=>zone(z.name,z.cards)).join('');
}
export function championStatus(recipe){
 if(recipe.playable)return '対戦可能';
 if(!recipe.deck)return `${recipe.mainCount!==40?'特殊な枚数・':''}${recipe.extraCount?'追加ゾーンの':''}対戦対応待ち`;
 return `効果対応待ち · ${recipe.unsupportedCopies}枚`;
}
export function championsHTML(data,{role='opponent',year='all',series='all',availability='all',art=()=>'',mark=()=>''}={}){
 data=originalChampions(data);
 const years=[...new Set([...data.records,...data.gaps].map(r=>r.year).filter(Number.isSafeInteger))].sort((a,b)=>b-a),shown=data.records.filter(r=>(availability!=='ready'||r.playable)&&(year==='all'||String(r.year)===year)&&(series==='all'||r.series===series));
 const groups=[...new Set(shown.map(r=>r.year))],gaps=data.gaps.filter(r=>(year==='all'||String(r.year)===year)&&(series==='all'||(r.slug==='saikyoiketteisen'?'最強位決定戦':/^dmnt/.test(r.slug)?'全国大会':/^dmscs/.test(r.slug)?'超CS':/^dmjp|^dmjunior/.test(r.slug)?'ジュニアGP':'GP')===series));
 return `<section class="champions-library" aria-label="歴代大会の優勝デッキ"><div class="environment-intro"><span class="badge green">オリジナルの公式優勝デッキ ${data.records.length}件</span><h2>歴代大会の1位を、そのまま。</h2><p>オリジナル構築の優勝デッキを、当時のカードと枚数のまま掲載しています。チーム戦は優勝チームの各メンバーの構成です。</p><small>全国大会・GP・超CS・ジュニアGPなどの公式資料で確認した構成です。大会名の年度と実際の開催年は区別しています。地域予選・店舗大会は未収録です。</small><p class="small mt8">対戦可能 ${data.records.filter(r=>r.playable).length}件。対応待ちの構成は差し替えず、リストを確認できます。</p></div><div class="champion-filters"><div role="group" aria-label="優勝デッキの対戦対応">${[['all','すべての構成'],['ready','対戦可能だけ（'+data.records.filter(r=>r.playable).length+'件）']].map(([id,label])=>`<button class="btn sm ${availability===id?'primary':''}" data-action="champion-availability" data-availability="${id}" aria-pressed="${availability===id}">${label}</button>`).join('')}</div><div role="group" aria-label="優勝デッキの年代">${[['all','すべて'],...years.map(y=>[String(y),y+'年'])].map(([id,label])=>`<button class="btn sm ${year===id?'primary':''}" data-action="champion-year" data-year="${id}" aria-pressed="${year===id}">${label}</button>`).join('')}</div><div role="group" aria-label="優勝デッキの大会">${['all','全国大会','最強位決定戦','GP','超CS','ジュニアGP'].map(id=>`<button class="btn sm ${series===id?'primary':''}" data-action="champion-series" data-series="${id}" aria-pressed="${series===id}">${id==='all'?'全大会':id}</button>`).join('')}</div></div><p class="small">${shown.length}件を表示 · 年は大会名の年度です</p>${groups.map(y=>`<section class="champion-year-group" aria-label="${y}年の優勝デッキ"><h3>${y}年</h3><div class="champion-grid">${shown.filter(r=>r.year===y).map(r=>`<article class="panel champion-card"><div class="row spread wrap gap8"><span class="badge ${r.playable?'green':'amber'}">${championStatus(r)}</span>${role==='opponent'&&r.deck?mark(r.deck):''}</div><h3>${esc(r.event)}</h3><p class="champion-winner">優勝：${esc(r.player)}</p>${r.team?`<p class="small">優勝チーム：${esc(r.team)}</p>`:''}${r.heldOn?`<p class="small">開催日：${esc(r.heldOn)}</p>`:''}${r.deckName?`<p class="small">${esc(r.deckName)}</p>`:''}<small>${esc(r.format||'大会当時の構成')} · メイン${r.mainCount}枚${r.extraZones.map(z=>' / '+esc(z.name)+count(z.cards)+'枚').join('')}</small><div class="champion-preview" aria-hidden="true">${r.cards.slice(0,3).map(row=>art(row.id,{mini:true})).join('')}</div><details><summary>公式の全構成を見る</summary>${championRowsHTML(r)}</details><div class="champion-actions">${r.deck?`<button class="btn ${r.playable?'primary':'soft'}" data-action="pick-champion" data-id="${esc(r.id)}" data-role="${role}">${r.playable?(role==='opponent'?'相手に選ぶ':'自分に選ぶ'):'公式構成で登録'}</button>`:'<p class="small">追加ゾーンや特殊な枚数を省略せず保存しています。現在は一覧での確認とファイルへの保存が使えます。</p>'}<button class="btn" data-action="export-champion" data-id="${esc(r.id)}">リストを書き出す</button></div><div class="champion-sources"><a class="details-link" href="${esc(r.source)}" target="_blank" rel="noopener">公式デッキリスト ↗</a><a class="details-link" href="${esc(r.resultSource)}" target="_blank" rel="noopener">優勝結果の出典 ↗</a>${r.archiveSource?`<a class="details-link" href="${esc(r.archiveSource)}" target="_blank" rel="noopener">当時の公式ページ保存記録 ↗</a>`:''}${(r.sourceCorrections||[]).map(c=>`<a class="details-link" href="${esc(c.imageSource)}" target="_blank" rel="noopener">全構成の公式掲載画像 ↗</a>`).join('')}</div></article>`).join('')}</div></section>`).join('')}${!shown.length?'<p class="small mt16">この条件で全構成を確認できたリストはまだありません。</p>':''}${gaps.length?`<details class="champion-gaps"><summary>全構成を確認できていない大会・部門（${gaps.length}件）</summary><p class="small">公式ページでカード名が空欄になっている場合などは、推測でカードを埋めていません。以下はデッキ未収録です。</p>${gaps.map(r=>`<article><strong>${esc(r.event)}</strong>${r.player?`<p>優勝：${esc(r.player)}</p>`:''}<p class="small">${esc(r.reason)}</p><a class="details-link" href="${esc(r.source)}" target="_blank" rel="noopener">公式資料を確認 ↗</a></article>`).join('')}</details>`:''}</section>`;
}
