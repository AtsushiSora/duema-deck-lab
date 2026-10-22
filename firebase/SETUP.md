# Googleアカウントを接続する初期設定

このアプリのアカウント機能は、GoogleログインにFirebase Authentication、デッキ保存にCloud Firestoreを使います。無料のSparkプランで始める構成です。Blazeへの変更、請求先のリンク、Cloud Functions、画像のCloud Storageへの保存は不要です。

2026-10-22、提供された画面から `duema-deck-lab` のWeb用公開設定を登録しました。公開設定APIの応答は `CONFIGURATION_NOT_FOUND` でした。次は「2. Googleログイン」からAuthenticationを初期設定します。実際のGoogleログイン・Firestore作成とルール適用は未確認です。

## 1. 無料プロジェクトとWebアプリ

1. [Firebaseコンソール](https://console.firebase.google.com/)をGoogleアカウントで開き、新しいプロジェクトを作成します。Google Analyticsは省略できます。
2. Sparkプランのままにします。請求先やクレジットカードは登録しません。
3. プロジェクトの概要からウェブアプリ `</>` を登録します。Firebase Hostingの設定は不要です。
4. 「プロジェクトの設定 → 全般 → マイアプリ」の `firebaseConfig` を確認します。`apiKey`、`authDomain`、`projectId`、`appId` のWeb用公開設定を、このチャットに渡してください。管理用サービスアカウントの秘密鍵・OAuthクライアントシークレットは不要です。
5. 開発者が `dist/account-config.json` に公開設定を反映して公開します。公開設定は閲覧可能な情報です。データへのアクセスは次のSecurity Rulesで制御します。

## 2. Googleログイン

1. Firebaseコンソールの「Authentication → 始める」を選びます。
2. ログイン方法の「Google」を有効にし、サポートメールアドレスを選んで保存します。
3. Authenticationの「設定 → 承認済みドメイン」に次を追加します。

```
duema-deck-lab.jolly-vole-4389.chatgpt.site
```

GitHubのコードを別の公開先で運用する場合は、その公開先のドメインも追加します。GitHubリポジトリのURLそのものを追加する必要はありません。

アプリは公式Firebase JavaScript SDK 12.19.0のGoogleポップアップを使います。スマホの埋込みブラウザで開けない場合は、SafariやChromeで公開URLを直接開きます。アプリ独自のパスワード・OAuthトークン交換・リダイレクトセッションは実装していません。

## 3. 自分だけが読めるデッキ保存

1. 「Firestore Database → データベースを作成」を選びます。
2. **Standard edition、データベースID `(default)`、本番モード**で1つ作成します。ロケーションは使う地域に合わせて選択します。
3. Firestoreの「ルール」を、[firestore.rules](../dist/firestore.rules)の全文に置き換えて公開します。全員が読めるテストモードや、ログインしていれば全データを読めるルールは使いません。
4. 必要に応じて、`deckLabAccounts` コレクションの `payload` フィールドを単一フィールドインデックスから除外します。対応する定義は `firebase/firestore.indexes.json` にあります。

保存先は `deckLabAccounts/{Firebase UID}` の1ドキュメントです。Googleでログインした所有者本人だけがそのUIDのデータを取得・更新できます。一覧検索・削除は許可していません。メールアドレスを識別キーにはしません。

既にFirebase CLIを利用している場合は、認証後に実際のプロジェクトIDを指定して、次の対象だけを反映できます。

```
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

`.firebaserc` に実在しないプロジェクトIDは用意していません。既存プロジェクトへルールを適用する場合は、そのプロジェクトの他のアプリで必要なルールを確認してください。このファイルは新規の専用プロジェクト用です。

## アプリの使い方

- ヘッダーの「アカウント」から「Googleで登録・ログイン」を選びます。初回のGoogleログインで登録されます。
- 「この端末のデッキを保存」でマイデッキ・相手デッキを保存します。最終確認の後に送信します。
- 別の端末で同じGoogleアカウントを使い、「保存したデッキを取り込む」を選びます。既存デッキを残して追加します。同じ名前と構成のデッキは重複させません。
- 別の端末が先に更新していた場合、保存を止めて再読込を案内します。通信の完了が不明な場合も、再読込するまで再保存しません。
- ログインやログアウトだけで端末のデッキを書き換えません。対戦履歴・写真・進行中の対戦は送信しません。
- 他の人のアカウント検索・公開デッキ閲覧・オンライン対戦はこの段階には含みません。

## 費用と確認範囲

Sparkは支払情報なしで開始でき、GoogleのようなソーシャルログインとFirestoreの無料枠を使えます。Firestoreには保存容量・読み書き・通信の無料枠があります。無料枠超過時は利用制限がかかるため、エラーを表示します。有料プランへ自動的に変更する処理はアプリにありません。請求先アカウントを利用者がリンクするとBlazeへ変更される場合があるため、無料運用ではリンクしません。

コードではアカウント切替、遅れて返る通信、保存競合、破損データの拒否、デッキの保持と取込みをテストしています。現時点のGoogle実ログインとFirestore本番ルールの動作確認は、Firebase初期設定の完了待ちです。ローカルのRules EmulatorはJava Runtimeがないため実行していません。Sitesのブラウザ確認はユーザーの希望に従い省略しています。

参考（2026-10-22確認）：[Firebase料金プラン](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)、[Firestore料金と無料枠](https://firebase.google.com/docs/firestore/pricing)、[Googleログイン](https://firebase.google.com/docs/auth/web/google-signin)、[Security Rules](https://firebase.google.com/docs/firestore/security/get-started)、[トランザクション](https://firebase.google.com/docs/firestore/manage-data/transactions)。
