export {historicalProfile,historicalMetadata} from './historical-regulations.js';
import {nameKey} from './catalogue.js';

// Fixed tournament snapshots, not a live ranking or generated card combinations.
const event='DMGP2026-1st Day2（オリジナル）';
const checkedAt='2026-10-20';
const finalSource='https://dm.takaratomy.co.jp/coverage/dmgp2026b_final/';
const listSource='https://dm.takaratomy.co.jp/coverage/dmgp2026b_decklist/';
const rows=list=>list.map(([count,name])=>({count,name}));
export const GOLGY_TARGET='env-nationals2025-denne';
export const ENVIRONMENT_LISTS=[
 {id:'env-gp2026-grimoire',name:'バイケン',player:'Grimoire',result:'優勝',source:finalSource,
  cards:rows([[4,'カクラリコ'],[4,'裏斬隠 テンサイ・ハート'],[1,'コッコ・武・ルピア'],[4,'斬隠将撃龍ニバイケン'],[4,'斬隠蒼頭龍バイケン'],[2,'轟く邪道 レッドゾーン'],[1,'聖カオスマントラ'],[2,'紅き団長 ドギラゴン悪'],[2,'飛翔龍 5000VT'],[1,'時の法皇 ミラダンテXII'],[2,'音卿の精霊龍 ラフルル・ラブ / 「未来から来る、だからミラクル」'],[4,'虚ト成リシ古ノ蛇神ノ咆哮'],[3,'我竜塔第八層 バルザーク'],[4,'氷柱と炎弧の決断'],[2,'真気楼と誠偽感の決断']])},
 {id:'env-gp2026-pinky',name:'ドギラゴン王道',player:'ピンキ→',result:'準優勝',source:finalSource,
  cards:rows([[2,'友情地龍 ルピア・ターン'],[2,'世界のY チャクラ・デル・フィン'],[4,'宿禰マロン'],[4,'偽りの希望 鬼丸「終斗」'],[4,'～輝きは奇跡そのもの～'],[4,'頂上連結 ロッド・ゾージア5th'],[4,'ボルシャック・ドリーム・ドラゴン'],[4,'剣轟の団長 ドギラゴン王道'],[1,'暴龍のT ミリオンベジータ'],[1,'超竜バジュラズテラ'],[1,'「GG」-001'],[1,'∞龍 ゲンムエンペラー'],[4,'R.S.F.K. / オールイン・チャージャー'],[4,'メンデルスゾーン']])},
 {id:'env-gp2026-sara',name:'光水闇邪眼帝',player:'サラー',result:'TOP8',source:listSource,
  cards:rows([[4,'改竄の炎 ボルメテウス・ハック'],[4,'煌ノ裁徒 ダイヤモン星'],[2,'旋略のS アドミラル・アレグル'],[4,'終止の時計 ザ・ミュート'],[4,'冥土人形ヴァミリア・バレル'],[3,'「大蛇」の鬼 ジャドク丸'],[3,'世界のY チャクラ・デル・フィン'],[4,'～世紀末の善悪～'],[3,'アーテル・ゴルギーニ'],[1,'切札竜 ボルメテウス・リバース・ドラゴン'],[4,'～邪眼帝～'],[4,'ウルの天宝']])},
 {id:'env-nationals2025-dotto',name:'ドギラゴン王道',player:'dotto',event:'全国大会2025 日本一決定戦（オリジナル）',result:'出場',checkedAt:'2026-10-21',source:'https://dm.takaratomy.co.jp/coverage/dmnt25_deck1/',
  cards:rows([[2,'友情地龍 ルピア・ターン'],[4,'宿禰マロン'],[4,'偽りの希望 鬼丸「終斗」'],[2,'流星のガイアッシュ・カイザー'],[4,'頂上連結 ロッド・ゾージア5th'],[4,'ボルシャック・ドリーム・ドラゴン'],[3,'～輝きは奇跡そのもの～'],[4,'剣轟の団長 ドギラゴン王道'],[2,'超竜バジュラズテラ'],[1,'∞龍 ゲンムエンペラー'],[2,'ボルシャック・スーパーヒーロー / 超英雄タイム'],[4,'R.S.F.K. / オールイン・チャージャー'],[4,'メンデルスゾーン']])},
 {"id":"env-viride-practice","name":"白緑ウィリデ","player":"シン@nkg","event":"超CSⅨ新潟","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmscs09a_top4-1/","historicalId":"env-viride-practice",cards:rows([[1,"とこしえの超人"],[4,"楯教の求道者 ザゼ・ゼーン"],[3,"クイーン&かぼちゃうちゃう"],[2,"一音の妖精"],[4,"世界のY チャクラ・デル・フィン"],[2,"ポッピ・冠・ラッキー"],[4,"ウィリデ・ゴル・ゲルス"],[4,"天V王 エバーラスト"],[4,"烈しき切札 ドギラゴン逆"],[4,"我竜塔第一層 セイント・キャッスル"],[4,"魂が休む庭園 グリーン・グランドクロス"],[4,"我竜塔第七層 ハッスル・キャッスル"]])},
 {id:GOLGY_TARGET,name:'光水自然ゴルギーオージャー',player:'デンネ',result:'TOP8',event:'全国大会2025 日本一決定戦（オリジナル）',checkedAt:'2026-10-24',source:'https://dm.takaratomy.co.jp/coverage/dmnt25_bd4/',cards:rows([[2,'ベイB セガーレ'],[4,'ソウルサンライト コハク'],[4,'一音の妖精'],[4,'大集合！アカネ&アサギ&コハク'],[1,'吟弾の妖精'],[4,'華謡の精霊カンツォーネ'],[4,'観覧！ホールインランド・ヘラクレス'],[3,'巨魔天 アオフェシー'],[4,'～西方より来る激流の竜騎公～'],[1,'飛翔龍 5000VT'],[4,'轟䡛合体 ゴルギーオージャー'],[4,'ジャスミンの地版'],[1,'超魂設計図']])},
 {"id":"env-scs9-niigata-rose","name":"墓地ソース","player":"ろーず","event":"超CSⅨ新潟（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmscs09a_deck/",cards:rows([[4,"百万超邪 クロスファイア"],[1,"樹食の超人"],[1,"暴龍のT ミリオンベジータ"],[3,"超神星DOOM・ドラゲリオン"],[2,"大樹王 ギガンディダノス"],[4,"「業流」の頂 ゾロ・ア・スタート"],[4,"ハニー＝マーガニー / 「こっちは甘いぞー」"],[4,"雷撃の冥将クーゼン / ダーク・ライフ"],[4,"超時空罠 デンジャデオン / 「トラップ？ちがうわ、お願いしてるだけ！」"],[4,"レレディ・バ・グーバ / ツインパクト・マップ"],[4,"大長老 アプル / 「わたしが自然文明のプリンセス？」"],[4,"龍装鬼 オブザ08号 / 終焉の開闢"],[1,"超七極 Gio / 巨大設計図"]])},
 {"id":"env-nationals2025-kikurage","name":"4色アルファディオス","player":"きくらげ","event":"全国大会2025 日本一決定戦（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt25_deck1/",cards:rows([[4,"大集合！アカネ&アサギ&コハク"],[4,"天彩の精霊ミルディアス"],[3,"天革の騎令嬢 ミラクルステラ"],[2,"偽りの希望 鬼丸「終斗」"],[4,"王導聖霊 アルファディオス"],[4,"頂上連結 ロッド・ゾージア5th"],[4,"剣轟の団長 ドギラゴン王道"],[3,"滝川るる＆ラフルル ー閃光のヒロインー"],[3,"ボルシャック・スーパーヒーロー / 超英雄タイム"],[4,"支配の精霊ペルフェクト / ギャラクシー・チャージャー"],[1,"音卿の精霊龍 ラフルル・ラブ / 「未来から来る、だからミラクル」"],[4,"ジャスミンの地版"]])},
 {"id":"env-gp2026-yoshikawa","name":"ゴルギーオージャー・シャコガイル","player":"いんふぃにてぃ吉川","event":"DMGP2026-1st Day2（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmgp2026b_decklist/",cards:rows([[4,"ソウルサンライト コハク"],[4,"一音の妖精"],[4,"大集合！アカネ&アサギ&コハク"],[2,"TAKASUGI-死合乱闘3000"],[4,"華謡の精霊カンツォーネ"],[4,"観覧！ホールインランド・ヘラクレス"],[3,"～進封せし大悪魔～"],[2,"巨魔天 アオフェシー"],[4,"～西方より来る激流の竜騎公～"],[4,"轟䡛合体 ゴルギーオージャー"],[1,"水上第九院 シャコガイル"],[4,"ジャスミンの地版"]])},
 {"id":"env-complex-practice","name":"青黒COMPLEX","player":"カルマ","event":"DMGP2025-1st Day2（オリジナル）大会当時の構成","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmgp2025b_decklist/",cards:rows([[1,"DARK MATERIAL COMPLEX"],[4,"異端流し オニカマス"],[1,"貴布人 テブルカッケ＝エディ"],[4,"終止の時計 ザ・ミュート"],[4,"冥土人形ヴァミリア・バレル"],[2,"奇天烈 シャッフ"],[4,"アーテル・ゴルギーニ"],[4,"忍蛇の聖沌 c0br4"],[3,"飛翔龍 5000VT"],[1,"∞龍 ゲンムエンペラー"],[3,"ボン・キゴマイム / ♪やせ蛙 ラッキーナンバー ここにあり"],[4,"修羅の死神フミシュナ / 「この先は修羅の道ぞ」"],[3,"カレイコの黒像"],[2,"絶望と反魂と滅殺の決断"]])},
 {"id":"env-heavens-practice","name":"4色天門","player":"さくやま","event":"全国大会2025 日本一決定戦（オリジナル）大会当時の構成","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt25_deck1/",cards:rows([[4,"天災 デドダム"],[4,"天彩の精霊ミルディアス"],[4,"～世紀末の善悪～"],[4,"流星のガイアッシュ・カイザー"],[1,"S級宇宙 アダムスキー"],[1,"CRYMAX ジャオウガ"],[3,"砕慄接続 グレイトフル・ベン"],[2,"飛翔龍 5000VT"],[1,"ブラキオ龍樹"],[2,"大樹王 ギガンディダノス"],[1,"ブルー・インパルス / 「真実を見極めよ、ジョニー！」"],[4,"♪立ち上がる 悪魔に天使 堕ちるかな"],[4,"真気楼と誠偽感の決断"],[1,"ホーガン・ブラスター"],[4,"ヘブンズ・ゲート"]])},
 {"id":"env-gospel-practice","name":"水晶ゴスペル","player":"無視無視ノンノン","event":"DMGP2024-2nd Day2（オリジナル）大会当時の構成","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmgp2024-2ndb_decklist/",cards:rows([[1,"時の法皇 ミラダンテXII"],[4,"水晶の王 ゴスペル"],[1,"音卿の精霊龍 ラフルル・ラブ / 「未来から来る、だからミラクル」"],[2,"ブルー・インパルス / 「真実を見極めよ、ジョニー！」"],[4,"キリモミ・ヤマアラシ"],[1,"セイレーン・コンチェルト"],[4,"最期の竜炎"],[1,"バッドドッグ・マニアクス"],[1,"ラッキー・ダーツ"],[2,"ロスト・ウォーターゲイト"],[1,"オリオティス・ジャッジ"],[3,"バーニング・フィンガー"],[4,"勇愛の天秤"],[1,"♪なぜ離れ どこへ行くのか 君は今"],[4,"氷柱と炎弧の決断"],[2,"ファイナル・ストップ"],[1,"エンドレス・フローズン・カーニバル"],[3,"月下卍壊 ガ・リュミーズ 卍"]])},
 {"id":"env-magic-practice","name":"赤青マジック","player":"いっぺこ","event":"全国大会2023 日本一決定戦（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt23_decklist_o/","historicalId":"env-magic-practice",cards:rows([[4,"AQvibrato"],[1,"単騎連射 マグナム"],[3,"灼熱の演奏 テスタ・ロッサ"],[4,"芸魔隠狐 カラクリバーシ"],[4,"芸魔王将 カクメイジン"],[2,"飛翔龍 5000VT"],[4,"歌舞音愛 ヒメカット / ♪蛙の子 遭えるの何処？好きと謂ひて"],[2,"同期の妖精 / ド浮きの動悸"],[4,"ボン・キゴマイム / ♪やせ蛙 ラッキーナンバー ここにあり"],[2,"Napo獅子-Vi無粋 / ♪オレの歌 聞けよ聞かなきゃ 殴り合い"],[2,"♪なぜ離れ どこへ行くのか 君は今"],[4,"氷柱と炎弧の決断"],[4,"瞬閃と疾駆と双撃の決断"]])},
 {"id":"env-abyss-practice","name":"黒緑アビス","player":"ミノミー","event":"全国大会2023 日本一決定戦（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt23_decklist_o/","historicalId":"env-abyss-practice",cards:rows([[2,"アビスベル=ジャシン帝"],[4,"深淵の壊炉 マーダン=ロウ"],[4,"ア:エヌ:マクア"],[4,"邪幽 ジャガイスト"],[4,"謀遠 テレスコ=テレス"],[4,"アビスベル＝覇＝ロード"],[4,"フットレス＝トレース / 「力が欲しいか？」"],[4,"ドミー=ゾー / 「倒したいか？」"],[2,"ヨービリン=リリン / 「……誰を呼びたい？」"],[1,"フェアリー・ギフト"],[2,"フェアリー・ライフ"],[4,"フェアリー・Re:ライフ"],[1,"秩序の意志"]])},
 {"id":"env-water-mado-practice","name":"水魔導具","player":"デデ","event":"全国大会2023 日本一決定戦（オリジナル）大会当時の構成","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt23_decklist_o/",cards:rows([[1,"ガル・ラガンザーク"],[2,"水上第九院 シャコガイル"],[1,"「無月」の頂 ＄スザーク＄"],[3,"頂上混成 ガリュディアス・モモミーズ’22"],[3,"凶鬼98号 ガシャゴン / 堕呪 ブラッドゥ"],[1,"卍月 ガ・リュザーク 卍 / 「すべて見えているぞ！」"],[4,"堕呪 ゾメンザン"],[4,"卍 新世壊 卍"],[1,"堕呪 ギャプドゥ"],[4,"堕呪 ゴンパドゥ"],[4,"堕呪 バレッドゥ"],[3,"堕呪 ボックドゥ"],[1,"堕呪 カージグリ"],[1,"ゴゴゴ・Cho絶・ラッシュ"],[4,"堕呪 エアヴォ"],[3,"月下卍壊 ガ・リュミーズ 卍"]])},
 {"id":"env-giant-practice","name":"青緑ジャイアント","player":"デデンネ","event":"全国大会2024 日本一決定戦（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt24_decklist1/","historicalId":"env-giant-practice",cards:rows([[4,"とこしえの超人"],[4,"キャディ・ビートル"],[4,"アシステスト・シネラリア"],[1,"完璧妖精マリニャンX"],[1,"五番龍 レイクポーチャー ParZero"],[3,"チアスカーレット アカネ"],[4,"チアスペース アカネ"],[2,"爆翠月 アカネ"],[3,"蒼神龍トライクラブ・トライショット"],[2,"銀河竜 ゴルファンタジスタ"],[4,"超重竜 ゴルファンタジスタ"],[1,"終の怒流牙 ドルゲユキムラ"],[4,"同期の妖精 / ド浮きの動悸"],[1,"フェアリー・ギフト"],[2,"豊潤フォージュン"]])},
 {"id":"env-zard-practice","name":"5色ザーディクリカ","player":"西高/じゃんぜ界隈","event":"全国大会2023 日本一決定戦（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt23_decklist_o/","historicalId":"env-zard-practice",cards:rows([[4,"天災 デドダム"],[4,"謀遠 テレスコ=テレス"],[4,"龍風混成 ザーディクリカ"],[3,"聖魔連結王 ドルファディロム"],[1,"天命龍装 ホーリーエンド / ナウ・オア・ネバー"],[3,"闘争類拳嘩目 ステゴロ・カイザー / お清めシャラップ"],[1,"黒豆だんしゃく / 白米男しゃく"],[1,"フェアリー・ギフト"],[2,"豊潤フォージュン"],[1,"秩序の意志"],[4,"ドラゴンズ・サイン"],[4,"ドンドン火噴くナウ"],[4,"ブレイン・スラッシュ"],[4,"ロスト・Re:ソウル"]])},
 {"id":"env-anadark-jaouga-practice","name":"水闇自然ジャオウガ","player":"幸あれ","event":"DMGP2026-1st Day2（オリジナル）大会当時の構成","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmgp2026b_decklist/",cards:rows([[4,"大集合！アカネ&アサギ&コハク"],[4,"天災 デドダム"],[3,"裏斬隠 テンサイ・ハート"],[3,"宇宙妖精エリンギ"],[3,"～世紀末の善悪～"],[2,"切札竜 ボルメテウス・リバース・ドラゴン"],[4,"流星のガイアッシュ・カイザー"],[3,"忍蛇の聖沌 c0br4"],[3,"CRYMAX ジャオウガ"],[3,"飛翔龍 5000VT"],[1,"逆転の剣スカイソード"],[1,"逆転の影ガレック"],[1,"大樹王 ギガンディダノス"],[1,"幻緑の双月 / 母なる星域"],[4,"真気楼と誠偽感の決断"]])},
 {"id":"env-kenji-gp2024-maiken","name":"闇自然ケンジ・キングダム","player":"Maiken","event":"DMGP2024-1st Day2 ローグデッキピックアップ（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmgp2024b_roguedeck/",cards:rows([[4,"ツクっちょ ＜メイ様.Star＞"],[4,"とこしえの超人"],[4,"星空に浮かぶニンギョ"],[4,"晴舞龍 ズンドコ・モモキング"],[4,"神羅ケンジ・キングダム"],[2,"アーテル・ゴルギーニ"],[3,"超神羅ギュンター・ペガサス"],[4,"CRYMAX ジャオウガ"],[1,"聖魔連結王 ドルファディロム"],[3,"地封龍 ギャイア"],[4,"ヘルコプ太の心絵"],[3,"進化設計図"]])},
 {"id":"env-dark-mado-practice","name":"水闇魔導具","player":"キナリ","event":"全国大会2024 日本一決定戦（オリジナル）大会当時の構成","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt24_decklist1/",cards:rows([[4,"堕魔 ドゥポイズ"],[4,"堕∞魔 ヴォゲンム"],[2,"追憶人形ラビリピト"],[1,"ガル・ラガンザーク"],[2,"飛翔龍 5000VT"],[1,"「無月」の頂 ＄スザーク＄"],[4,"凶鬼98号 ガシャゴン / 堕呪 ブラッドゥ"],[2,"卍月 ガ・リュザーク 卍 / 「すべて見えているぞ！」"],[4,"堕呪 ゴンパドゥ"],[4,"堕呪 バレッドゥ"],[4,"堕呪 ボックドゥ"],[4,"堕呪 エアヴォ"],[2,"秩序の意志"],[2,"絶望と反魂と滅殺の決断"]])},
 {"id":"env-bande-practice","name":"4色バンデ","player":"カルマ","event":"DMGP2026-1st Day2（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmgp2026b_decklist/","historicalId":"env-bande-practice",cards:rows([[4,"改竄の炎 ボルメテウス・ハック"],[4,"大集合！アカネ&アサギ&コハク"],[4,"俳句爵 Drache der’Bande"],[4,"ピザスターのアンティハムト"],[4,"轟腕のR ダグラジャパニカン"],[3,"世界のY チャクラ・デル・フィン"],[1,"単騎連射 マグナム"],[2,"偽りの希望 鬼丸「終斗」"],[1,"飛翔龍 5000VT"],[1,"同期の妖精 / ド浮きの動悸"],[2,"煙幕の聖沌 k3mur1 / 聖沌忍法 メカくしの術"],[1,"攻守の天秤"],[1,"瞬閃と疾駆と双撃の決断"],[4,"キユリのASMラジオ"],[4,"心転地と透幻郷の決断"]])},
 {"id":"env-barom-practice","name":"水闇自然バロム","player":"おんそく","event":"全国大会2024 日本一決定戦（オリジナル）大会当時の構成","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt24_decklist1/",cards:rows([[4,"魔令嬢バロメアレディ"],[2,"流星のガイアッシュ・カイザー"],[3,"悪魔龍 ダークマスターズ"],[3,"悪夢神バロム・ナイトメア"],[2,"SSS級天災 デッドダムド"],[1,"悪魔神ドルバロム"],[3,"悪魔神バロム・クエイク"],[2,"修羅の死神フミシュナ / 「この先は修羅の道ぞ」"],[4,"雷撃の冥将クーゼン / ダーク・ライフ"],[4,"混沌の獅子デスライガー / カオス・チャージャー"],[3,"従獄の死神シンベロス / 「地獄まで我に従え」"],[4,"ドアノッカ＝ノアドッカ / 「…開けるか？」"],[4,"フェアリー・Re:ライフ"],[1,"環嵐！ホールインワン・ヘラクレス"]])},
 {"id":"env-maruru-practice","name":"水闇自然マルル","player":"ZweiLance","event":"全国大会2024 日本一決定戦（オリジナル）","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmnt24_decklist1/","historicalId":"env-maruru-practice",cards:rows([[4,"天災 デドダム"],[2,"終末の監視者 ジ・ウォッチ"],[2,"ティンパニ＝シンバリー"],[4,"ヨビニオン・マルル"],[4,"流星のガイアッシュ・カイザー"],[4,"飛翔龍 5000VT"],[2,"CRYMAX ジャオウガ"],[1,"九番龍 ジゴクバンカー Par459"],[4,"修羅の死神フミシュナ / 「この先は修羅の道ぞ」"],[1,"フェアリー・ギフト"],[2,"地龍神の魔陣"],[4,"フェアリー・ライフ"],[4,"フェアリー・Re:ライフ"],[2,"ロスト・Re:ソウル"]])},
 {"id":"env-lionel-practice","name":"光水ライオネル.Star","player":"サンジェルマン","event":"超CSⅤ大阪（オリジナル）大会当時の構成","result":"掲載","checkedAt":"2026-10-25","source":"https://dm.takaratomy.co.jp/coverage/dmscs05b_decklist/",cards:rows([[4,"AQ NETWORK"],[4,"「正義星帝」 ＜ライオネル.Star＞"],[3,"アルカディアス・モモキング"],[3,"MAX・ザ・ジョニー"],[2,"飛翔龍 5000VT"],[4,"DG-パルテノン ～龍の創り出される地～"],[4,"♪なぜ離れ どこへ行くのか 君は今"],[2,"カーネンの心絵"],[4,"護天！銀河MAX"],[3,"サイバー・ブレイン"],[4,"スロットンの心絵"],[3,"ジョーカーズの心絵"]])},
];

export const VIRIDE_TARGET='env-viride-practice';
export const ENVIRONMENT_TARGET='env-gp2026-pinky';
// Tournament names use the event year/season, never the catalogue verification date.
// Super CS V Osaka: https://dm.takaratomy.co.jp/coverage/dmscs05b_photo/ (2023-07-29).
// Super CS IX Niigata: https://dm.takaratomy.co.jp/coverage/dmscs09a_bd3/ (2026).
export function environmentYear(deck){
 const tournament=deck.tournament||deck,label=tournament.event||'',match=label.match(/(?:^|[^0-9])(20[0-9]{2})(?![0-9])/);
 if(match)return Number(match[1]);
 const slug=String(tournament.source||'').match(/^https:\/\/dm\.takaratomy\.co\.jp\/coverage\/([^/]+)\//)?.[1];
 if(slug?.startsWith('dmscs09a_'))return 2026;
 if(slug?.startsWith('dmscs05b_'))return 2023;
 return null;
}
export function groupEnvironmentDecks(decks){
 const groups=new Map();for(const deck of decks){const year=environmentYear(deck);if(!groups.has(year))groups.set(year,[]);groups.get(year).push(deck);}
 return [...groups].sort(([a],[b])=>(b??0)-(a??0)).map(([year,decks])=>({year,decks}));
}
// Count physical copies and distinct names; partial support never enables a battle.
export function environmentSupport(deck,registry){
 const rows=registry.resolveRows(deck.cards),supported=rows.filter(r=>registry.get(r.id).supported),unsupported=rows.filter(r=>!registry.get(r.id).supported);
 return {supportedCopies:supported.reduce((n,r)=>n+r.count,0),totalCopies:rows.reduce((n,r)=>n+r.count,0),supportedTypes:supported.length,totalTypes:rows.length,unsupported};
}

export function resolveEnvironmentDecks(registry,lists=ENVIRONMENT_LISTS){
 return lists.map(list=>{
  const seen=new Set();
  const cards=list.cards.map(row=>{
   const c=registry.byName.get(nameKey(row.name));
   if(!c)throw Error('大会リストのカードが未登録です：'+row.name);
   if(seen.has(c.id)||!Number.isSafeInteger(row.count)||row.count<1||row.count>4)throw Error('大会リストの枚数が正しくありません：'+row.name);
   seen.add(c.id);return {id:c.id,count:row.count};
  });
  const deck={id:list.id,name:list.name+'（'+list.player+'）',cards,format:'original',category:'環境',description:(list.event||event)+' / '+list.result+' / '+list.player+(list.practice?'。使用制限を反映した練習用の40枚です。':'。大会当時の40枚です。'),tournament:{event:list.event||event,player:list.player,result:list.result,source:list.source,checkedAt:list.checkedAt||checkedAt,...(list.practice?{practice:true,adjustments:list.adjustments,regulation:list.regulation}:{})}};
  if(list.historicalId)deck.historicalId=list.historicalId;
  const errors=registry.validate(deck);if(errors.length)throw Error(errors.join(' / '));
  if(!/^https:\/\/dm\.takaratomy\.co\.jp\/coverage\//.test(list.source))throw Error('大会リストの出典が正しくありません');
  return deck;
 });
}

export {prepareDeckCopy as prepareEnvironmentCopy} from './deck-copy.js';
