# 原則の関係性

原則がどのように関連し、互いに構築されているかを理解することで、一貫して適用できます。

## 依存グラフ

```mermaid
graph TD
    %% メタ原則をトップに
    OR[オッカムの剃刀<br/>メタ原則<br/>'最もシンプルな解決策が勝つ']

    %% レベル1: 普遍的原則
    OR -->|影響を与える| PE[プログレッシブ<br/>エンハンスメント<br/>'シンプルに構築<br/>→ 強化']
    OR -->|影響を与える| RC[可読性のあるコード<br/>'人間のための<br/>コード']
    OR -->|影響を与える| DRY[DRY<br/>"繰り返すな"]

    %% 可読性のあるコードをサポートする原則
    RC -->|サポートされる| ML[ミラーの法則<br/>'7±2の認知<br/>限界']

    %% レベル2: 適用された実践（プログレッシブエンハンスメントから）
    PE -->|通知する| TDD[TDD/Baby Steps<br/>'Red-Green-<br/>Refactor']

    %% レベル2: 適用された実践（可読性のあるコード & DRYから）
    RC -->|通知する| CP[Container/<br/>Presentational<br/>'ロジックとUIを<br/>分離']
    DRY -->|通知する| TIDY[TIDYINGS<br/>'開発しながら<br/>整理']

    %% 別の階層としてのSOLID
    SOLID[SOLID<br/>原則<br/>'変更のための<br/>設計']
    OR -->|バランス| SOLID
    SOLID -->|通知する| CP
    SOLID -->|通知する| LOD[デメテルの法則<br/>'直接の友達<br/>とだけ話す']

    %% 漏れのある抽象化
    OR -->|受け入れる| LA[漏れのある<br/>抽象化<br/>'実用的 over<br/>完璧']

    %% 異なる原則タイプのスタイリング
    classDef metaPrinciple fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff
    classDef universalPrinciple fill:#4dabf7,stroke:#1971c2,stroke-width:2px,color:#fff
    classDef appliedPractice fill:#51cf66,stroke:#2f9e44,stroke-width:2px,color:#fff
    classDef contextual fill:#ffd43b,stroke:#fab005,stroke-width:2px,color:#000
    classDef scientific fill:#e599f7,stroke:#ae3ec9,stroke-width:2px,color:#fff

    class OR metaPrinciple
    class PE,RC,DRY universalPrinciple
    class TDD,CP,TIDY,LOD,LA appliedPractice
    class SOLID contextual
    class ML scientific
```

## グラフの凡例

| 色 | タイプ | 説明 |
| --- | --- | --- |
| 🔴 赤 | メタ原則 | オッカムの剃刀 - すべての複雑さに疑問を投げかける |
| 🔵 青 | 普遍的 | デフォルトですべての決定に適用 |
| 🟢 緑 | 適用された実践 | 具体的な実装パターン |
| 🟡 黄 | 文脈的 | 状況が要求する時に適用 |
| 🟣 紫 | 科学的 | 認知科学的裏付け |

## 主要な関係

| # | 関係 | 説明 |
| --- | --- | --- |
| 1 | **オッカムの剃刀 → すべて** | すべての複雑さに疑問を投げかけるメタ原則 |
| 2 | **オッカムの剃刀 → プログレッシブエンハンスメント** | シンプルに始め、必要な時のみ複雑さを追加 |
| 3 | **オッカムの剃刀 → DRY** | 抽象化（DRY）とシンプルさ（オッカムの剃刀）のバランス |
| 4 | **オッカムの剃刀 ⟷ SOLID** | バランス関係 - 構造のためのSOLID、過度な設計を防ぐオッカムの剃刀 |
| 5 | **プログレッシブエンハンスメント → TDD/Baby Steps** | 両方とも段階的開発を強調 |
| 6 | **可読性のあるコード → ミラーの法則** | 可読性限界（7±2項目）の認知科学的裏付け |
| 7 | **SOLID → Container/Presentational** | SRP（単一責任原則）がUI/ロジック分離を駆動 |
| 8 | **SOLID → デメテルの法則** | 両方とも依存関係と結合を管理 |
| 9 | **可読性のあるコード + DRY → TIDYINGS** | コードをクリーンに保つ実践的適用 |
| 10 | **オッカムの剃刀 → 漏れのある抽象化** | シンプルさのために不完全な抽象化を受け入れる |

## このグラフの使い方

1. **開始点**: すべての決定でオッカムの剃刀（赤）から始める
2. **構築**: 普遍的原則（青）を適用 - プログレッシブエンハンスメント、可読性のあるコード、DRY
3. **実装**: 適用された実践（緑）を使用 - TDD、Container/Presentational、TIDYINGS
4. **特定の文脈**: 文脈的原則（黄）を適用 - 必要な時のみSOLID、デメテルの法則
5. **競合解決**: 原則が競合する時は、トップのオッカムの剃刀まで遡る

## 関連ドキュメント

- [@./PRINCIPLES_GUIDE.md](./PRINCIPLES_GUIDE.md) - 完全な原則ガイド
- [@./development/](./development/) - 個別の原則ファイル
