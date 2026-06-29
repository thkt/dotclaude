# 検証手順

/research の Phase 4 の検証と Phase 5 の sweep から参照する手順を定義する。

## Cross-method 検証

各トリガーは構造的に適用し、自己判断による finding 除外は認めない。「該当の caller が無い」「X が唯一の Y」「X が Y の網羅的な一覧」「[repo set] で未使用」のような finding が、後段の PR スコープを駆動する、または repo を跨ぐとき、ugrep / bfs、Task(Explore)、対象を絞った Read のうち少なくとも 2 つで検証する。結果が食い違うときは差異をフラグし、ツールエラーを特定してから記録する。単一ツールでの 0 件結果は疑わしい状態であって、決定的ではない。

## 一次ソース検証

外部挙動の claim を一次ソースで検証する。

1. Source が「このセッションで実行していない外部システムの振る舞い」(hook 発火タイミング、action / parser の要求 schema、ライブラリ API 挙動、引用文献の主張) を参照し、かつ動作を左右する (結論 / Next Action / Disconfirmation のいずれかがその claim の正しさに依存) な finding を抽出する
2. 抽出した claim を一括で一次ソースと突合する。web docs は `scout fetch <公式 docs URL>`、GitHub 上のソースは `scout repo-read` / `scout repo-overview` を使う (コマンドの正典は use-cli-scout)。scout が使えないときは WebFetch / WebSearch にフォールバックする
3. 一次ソースが辿れない場合 (paywall、docs 不在、fetch 失敗) は finding を残して `unverified external claim` とマークし、Disconfirmation の根拠や Next Action の前提には使わない

## Same-origin sweep

Bug investigation で root cause を確定した後、同じ origin を共有する artifact 群を sweep して兄弟欠陥を探す。

1. root cause ファイルの導入コミットを特定し (`git log --follow --diff-filter=A`)、そのコミットの全ファイルを列挙する (`git show --stat`)
2. コミットメッセージやファイルヘッダに生成元表記 (`auto-generated from X`、template / deploy 注記) があれば、X 由来の全ファイルも sweep 対象に加える
3. 各兄弟について consumer (それを読む action / parser / loader) を特定し、consumer の要求仕様をその場で fetch して (上記の一次ソース検証と同じ scout 手順)、兄弟を突合する
4. 兄弟同士が値を参照し合う場合 (config の keys / block-list とフォームの options 等)、値集合同士を diff し、自滅的な整合 (block-list が選択可能な全値を含む、どの兄弟も定義しない値への参照) をフラグする
5. 兄弟ごとに pass / 同種欠陥 / 別種欠陥を根拠付きで記録する
