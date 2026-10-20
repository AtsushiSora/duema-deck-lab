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

- 一覧検索、文明・種類・コストによる絞り込み、枚数チェック、デッキ編集と端末内保存
- 写真撮影・画像選択、日本語OCR、読み取り候補と枚数の確認・修正
- テキスト・JSONによるデッキ入力、JSON出力、構成を埋め込んだ共有リンク、友達のデッキ登録
- 3種類の練習用デッキの選択、個別または総当たりの自動対戦
- 手動対戦、効果の対象選択、ブロック・S・トリガーの選択、練習モードのヒント・待った
- 実対戦から算出する勝率、先後別勝率、95% Wilson信頼区間、序盤のカード使用状況
- 履歴、対戦ログの再生、結果の書き出し
- 改良前後で相手・乱数・回数・先後を合わせた比較

## 対応範囲

**全カード対応版ではありません。** 現在は公式DM-01のカード44種類に対応します。各カードに公式情報へのリンクを記録しています。公式総合ゲームルールVer.1.53（2026-10-15）と2026-10-20確認の殿堂レギュレーションを基準に、対応カードで発生する処理を実装しています。公式・公認アプリではなく、全裁定の再現を保証しません。

マナ支払いは必要な文明を含む組み合わせを自動選択します。対戦AIは固定のルールに基づく判断で、非公開の相手手札、両者のシールド、山札の順番を判断材料にしません。自動対戦の勝率は、このAI・対応カード・相手構成の条件下の結果です。カード使用と勝率の相関を因果効果として表示しません。

### 未対応

- 全カード、多色・進化・革命チェンジ等、アドバンスと外部ゾーン
- 環境・大会デッキの収集と更新
- アカウント、端末間同期、オンライン対人戦、公開デッキ投稿と公開範囲設定
- 別の行動を選んだ分岐を再実行する分析

初期の相手は大会デッキの代用ではなく、対応機能を使った練習用です。画像認識はカード名のOCRで、イラストからの物体識別ではありません。未知カードを既知カードとして自動確定せず、候補確認を必須にしています。解像度や角度により読み取れない画像はリスト入力で補います。

## 保存・共有

デッキ・最新16件の自動対戦結果はブラウザのlocalStorageに保存します。履歴の各相手について最大8戦の勝敗サンプルと再現用乱数を保持します。ページを閉じると進行中の手動対戦は失われます。写真は保存しません。端末やブラウザを変えてもデータは自動同期されません。

共有リンクにはデッキ名と構成が含まれます。パスワードや友達限定のアクセス制御はありません。Site本体が非公開の場合、リンク先を開くにはSiteへのアクセス権も必要です。デッキの持ち運びにはJSON出力も利用できます。

## 構成

- `dist/app.js`：画面、入力、OCR、端末内保存、共有
- `dist/styles.css`：スマホ・PCの共通UI
- `dist/engine.js`：対戦状態、合法手、カード処理、公開情報に基づくAI、集計
- `dist/worker.js`：自動対戦のバックグラウンド実行
- `dist/cards.json`：公式情報を確認したカードデータと対応能力
- `dist/decks.js`：練習用デッキ3種類
- `tests/engine.test.mjs`：ゲームルール・非公開情報・再現性・全カード保存の検証
- `tools/fetch-cards.mjs`、`tools/prepare-data.mjs`：公式情報の取得とOCR配布物の準備

## 出典・素材

- [公式総合ルール](https://dm.takaratomy.co.jp/rule/rulechange/)
- [殿堂レギュレーション](https://dm.takaratomy.co.jp/rule/regulation/)
- 各カードの出典は`dist/cards.json`の`source`
- [Tesseract.js](https://github.com/naptha/tesseract.js)、[ライセンス](dist/vendor/TESSERACT-LICENSE.md)
- Tesseractコアと日本語学習データを配布物に同梱
- カードの絵は識別補助用の生成画像。実物カードの絵は収録していません

### 画像生成の記録

使用方法：内蔵image_gen（CLI不使用）。保存先：`dist/assets/civilizations.png`。

生成に使ったプロンプト：

> Create one wide 5:2 landscape illustration strip with FIVE equal-width vertical panels in a single row, seamless within each panel and clear boundaries between panels. These are original miniature fantasy illustration assets for a trading card deck simulator web app, not actual trading cards. Do not include any text, numbers, card frame, logo or lettering. Panel 1: crimson armored volcanic dragon amid sparks, fire civilization, dark red and gold. Panel 2: blue translucent aquatic mechanical spirit under water amid luminous waves, cyan and deep navy. Panel 3: emerald giant forest beast with bronze leaf armor and roots, green and gold. Panel 4: golden radiant celestial armored guardian with white wings, ivory and gold. Panel 5: violet shadow armored demon silhouette amid dark mist, purple and charcoal. Rich hand-painted high-detail fantasy style, dynamic expressive silhouettes legible at tiny scale, sophisticated dark palette, each creature centered in its own panel, no cross-panel creature overlap. Artwork only, edge to edge, no decorative outer border. Use visually varied compositions.
