# デッキラボ

紙のデュエマのデッキ作成、AI対戦、対戦結果の分析を行う、スマホを優先したWebアプリです。

## 起動・検証

Node.js 22以上で、外部npm依存のインストールなしに起動できます。

```sh
npm run dev
# http://127.0.0.1:4173/
npm test
npm run check
```

`dist/`を静的サイトとして配信できます。対戦の計算はWeb Worker、OCRは端末内のTesseract.jsで処理します。写真・デッキ情報を外部APIへ送る処理はありません。

## 実装済み

- 公式カード名の全件取得、同名再録の集約、カード名検索、デッキ編集と端末内保存
- 全登録名での初手5枚・シールド5枚・ドロー練習、配り直し
- 初手と追加ドローで各カード1枚以上、または指定した最大5種類がすべてそろう確率（厳密値と最大10,000回の試行）
- 全登録カードの名前・文明・コスト・種類・能力文を公式ページから取得して保存、能力文を含む検索と絞り込み
- ツインパクト・裏面などを面ごとに表示し、文明・コスト・種類の組み合わせは同じ面で照合
- コスト0・∞・公式欄の空欄を区別し、コストバランスは面1の数値コストを集計
- 写真撮影・画像選択、日本語OCR、読み取り候補と枚数の確認・修正
- テキスト・JSONによるデッキ入力、JSON出力、構成を埋め込んだ共有リンク、友達のデッキ登録
- 3種類の練習用デッキの選択、個別または総当たりの自動対戦
- マイデッキの「環境」ボタンから公式DMGP2026-1st Day2入賞リスト3件を選択し、40枚をそのまま自動作成・端末保存。出典・使用者・成績・確認日を表示し、同じ40枚の既存デッキは重複追加しない
- 手動対戦、効果の対象選択、ブロック・S・トリガーの選択、練習モードのヒント・待った
- 実対戦から算出する勝率、先後別勝率、95% Wilson信頼区間、序盤のカード使用状況
- 履歴、対戦ログの再生、結果の書き出し
- 改良前後で相手・乱数・回数・先後を合わせた比較

## 対応範囲

**カード名の登録と、カード効果を処理できる範囲を区別します。** 公式検索の同名集約リストを全ページ取得し、名称を掲載しているカードをデッキ登録・初手確認に利用します。検索件数、名称取得件数、名称未掲載項目、同名集約後の件数は `dist/catalogue.json` に記録しています。NFKC、空白の連続、引用符の字体差を同名判定で整えます。カードの別名・能力面の異なるツインパクトを省略して結合することはありません。

各登録名について、公式の代表ページから名前・文明・コスト・種類・能力文を取得し、`dist/details.json` に保存します。能力の段落とS・トリガー等の記号を保持します。複数面では、それぞれの情報を独立して表示・検索します。情報が不足する場合は同名の再録ページも確認し、名前・面構成を照合して、情報が多く元の項目が欠けないページを採用します。採用した出典は `detailSource` に記録します。それでも公式欄が空欄の場合は推測で補わず「未掲載」と表示します。能力文を取得したことによって、対戦用の効果処理が実装された扱いにはしません。

対戦は公式DM-01の44種類の効果を個別に実装しています。各カードに公式情報へのリンクを記録しています。公式総合ゲームルールVer.1.53（2026-10-15）と2026-10-20確認の殿堂レギュレーションを基準に、対応カードで発生する処理を実装しています。公式・公認アプリではなく、全裁定の再現を保証しません。

効果未対応カードは使用制限が未確認のため、保存用として同名1〜40枚を受け付けます。これは大会での使用可否や合法な構築の判定ではありません。初手確認は40枚のメインデッキ専用で、別ゾーンを混ぜずに使います。効果によるドローやサーチ、マリガンは行いません。先攻・後攻のドロー枚数は自分で指定します。

マナ支払いは必要な文明を含む組み合わせを自動選択します。対戦AIは固定のルールに基づく判断で、非公開の相手手札、両者のシールド、山札の順番を判断材料にしません。自動対戦の勝率は、このAI・対応カード・相手構成の条件下の結果です。カード使用と勝率の相関を因果効果として表示しません。

### 未対応

- 44種類以外の効果、多色・進化・革命チェンジ等、アドバンスと外部ゾーン
- 効果未対応カードの使用制限・特殊構築条件の判定
- 環境ランキングの自動更新、任意のカードから大会デッキを生成する機能
- アカウント、端末間同期、オンライン対人戦、公開デッキ投稿と公開範囲設定
- 別の行動を選んだ分岐を再実行する分析

初期の相手は大会デッキの代用ではなく、対応機能を使った練習用です。画像認識はカード名のOCRで、イラストからの物体識別ではありません。未知カードを既知カードとして自動確定せず、候補確認を必須にしています。解像度や角度により読み取れない画像はリスト入力で補います。

「環境」から作成するデッキは、公式に掲載された大会当時の固定リストです。最新環境の順位や現在の大会での使用可否を保証しません。2026-10-20に公式リストを確認し、バイケン（Grimoire・優勝）、ドギラゴン王道（ピンキ→・準優勝）、光水闇邪眼帝（サラー・TOP8）を収録しています。すべて効果未対応カードを含むため、保存・編集・初手・ドローの確認に利用し、手動・自動対戦は既存の検証で拒否します。基本デッキ3つの一括追加機能はありません。

## 保存・共有

デッキ・最新16件の自動対戦結果はブラウザのlocalStorageに保存します。履歴の各相手について最大8戦の勝敗サンプルと再現用乱数を保持します。ページを閉じると進行中の手動対戦は失われます。写真は保存しません。端末やブラウザを変えてもデータは自動同期されません。

共有リンクにはデッキ名と構成が含まれます。パスワードや友達限定のアクセス制御はありません。Site本体が非公開の場合、リンク先を開くにはSiteへのアクセス権も必要です。デッキの持ち運びにはJSON出力も利用できます。

## 構成

- `dist/app.js`：画面、入力、OCR、端末内保存、共有
- `dist/styles.css`：スマホ・PCの共通UI
- `dist/engine.js`：対戦状態、合法手、カード処理、公開情報に基づくAI、集計
- `dist/worker.js`：自動対戦のバックグラウンド実行
- `dist/cards.json`：対戦で効果を処理できる44種類のデータ
- `dist/catalogue.json`、`dist/catalogue.js`：全登録名、再録IDの移行、登録検証と対戦対応率
- `dist/details.json`：公式ページのカード情報、各面の文明・コスト・種類・能力文・確認日・空欄の状態
- `dist/card-info.js`：表示と検索、同じ面での複合条件による絞り込み
- `tools/detail-parser.mjs`、`tools/sync-details.mjs`：公式カード詳細の解析とキャッシュ付き取得
- `tools/detail-validation.mjs`、`tests/card-info.test.mjs`：全件取得とID照合、能力文・複数面・特殊コストの検証
- `dist/draw.js`：初手、ドロー、包除原理による厳密確率、シード付き反復試行
- `dist/deck-import.js`：カード名完全一致のリスト入力
- `tools/sync-catalogue.mjs`：公式一覧の全ページ照合・名称同期（キャッシュから再開可能）
- `tests/catalogue-draw.test.mjs`：再録集約、保存互換性、カード保存則、確率、未対応効果の拒否
- `dist/decks.js`：練習用デッキ3種類
- `dist/environment.js`：出典付き大会リスト、40枚の照合、既存デッキを保つコピーと構成による重複防止
- `tests/environment.test.mjs`：大会リストの全名照合、40枚制約、未対応効果の拒否、コピーと重複防止
- `tests/engine.test.mjs`：ゲームルール・非公開情報・再現性・全カード保存の検証
- `tools/fetch-cards.mjs`、`tools/prepare-data.mjs`：公式情報の取得とOCR配布物の準備

## カード名の更新

```sh
npm run sync:catalogue
npm run sync:details
npm run check
```

公式検索の同名集約結果をすべて読み、8接続以内・リトライと待機を含めて名前を取り込みます。取得済み情報はGit対象外の`tools/research/catalogue/`に保存し、中断から再開できます。検索件数が変わった場合はキャッシュを別の場所へ退避して再実行します。全件を照合できるまで配布用JSONを置き換えません。名前のない公式項目はIDと出典を記録し、存在しない名前を補いません。チェックは取り込み途中のプレビューを拒否します。新しいカード効果は自動実装しません。

カード詳細も8接続以内で取得し、公式ページのHTMLを圧縮したキャッシュと解析済みデータをGit対象外の `tools/research/details/` に保存します。途中で中断しても取得済みページから再開できます。全登録名を照合できるまで配布用JSONを更新しません。公式欄に空欄のある項目は `missingFields` と `partialCount` で分かるようにし、空欄の能力文と未掲載の能力文欄も区別します。数値以外のコストを0に変換しません。

公式の更新情報を取り直す場合は `npm run sync:details -- --refresh` を実行します。通常の再実行では取得済みデータを再利用し、確認日は元の取得日を維持します。

## 出典・素材

- [公式総合ルール](https://dm.takaratomy.co.jp/rule/rulechange/)
- [殿堂レギュレーション](https://dm.takaratomy.co.jp/rule/regulation/)
- [DMGP2026-1st Day2 決勝戦・デッキリスト](https://dm.takaratomy.co.jp/coverage/dmgp2026b_final/)、[TOP8デッキリスト](https://dm.takaratomy.co.jp/coverage/dmgp2026b_decklist/)
- 各カードの出典は`dist/cards.json`、`dist/catalogue.json`、`dist/details.json`の`source`
- [Tesseract.js](https://github.com/naptha/tesseract.js)、[ライセンス](dist/vendor/TESSERACT-LICENSE.md)
- Tesseractコアと日本語学習データを配布物に同梱
- カードの絵は識別補助用の生成画像。実物カードの絵は収録していません

### 画像生成の記録

使用方法：内蔵image_gen（CLI不使用）。保存先：`dist/assets/civilizations.png`。

生成に使ったプロンプト：

> Create one wide 5:2 landscape illustration strip with FIVE equal-width vertical panels in a single row, seamless within each panel and clear boundaries between panels. These are original miniature fantasy illustration assets for a trading card deck simulator web app, not actual trading cards. Do not include any text, numbers, card frame, logo or lettering. Panel 1: crimson armored volcanic dragon amid sparks, fire civilization, dark red and gold. Panel 2: blue translucent aquatic mechanical spirit under water amid luminous waves, cyan and deep navy. Panel 3: emerald giant forest beast with bronze leaf armor and roots, green and gold. Panel 4: golden radiant celestial armored guardian with white wings, ivory and gold. Panel 5: violet shadow armored demon silhouette amid dark mist, purple and charcoal. Rich hand-painted high-detail fantasy style, dynamic expressive silhouettes legible at tiny scale, sophisticated dark palette, each creature centered in its own panel, no cross-panel creature overlap. Artwork only, edge to edge, no decorative outer border. Use visually varied compositions.
