# Netlifyへの反映方針

ユーザー指示（2026-11-20）：今回の版をGitHub PagesとNetlifyに公開し、今後の通常のカード追加・pushではNetlifyを更新しない。

- GitHub Pagesはmainへのpushで更新する。
- `.github/workflows/netlify.yml` は手動実行（workflow_dispatch）だけにする。
- GitHubのNetlify向けpushフックを停止し、Netlify側の自動ビルドもStopped buildsにする。
- 公開済みのNetlifyサイトと友だち対戦は、その公開版のカード・ルールで維持する。
- Netlifyを更新するのは、ユーザーが明示的に反映を指示した場合だけ。その際は画面・カード・対戦サーバーを同じコミットで一緒に更新する。
- 今回の公開後に追加するカードは、次の明示的なNetlify反映まで友だち対戦では利用できない。
- `.netlify/` は既存のgitignoreを維持する。認証情報や秘密鍵をコミットしない。
- 自動更新の停止は、対戦中の通信・サーバー使用量をなくすものではない。

公開前に対象版のチェックと必要な回帰テストを行う。一括npm testの過去の中断結果やユーザー保留中の公式照合は、公開操作をもって解消扱いにしない。
