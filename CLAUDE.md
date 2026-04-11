# プロジェクト開発ルール

このプロジェクトは **Planner → Designer → Generator → Evaluator** の4エージェントパイプラインで開発する。

---

## エージェント起動ルール

### いつ何を呼ぶか

| ユーザーの発言 | 呼ぶエージェント |
|--------------|----------------|
| 「〇〇を作りたい」「仕様を作って」「新機能を追加して」 | **planner** |
| 「デザインして」「UIを設計して」「デザインレビューして」 | **designer** |
| 「スプリントNを実装して」「スプリントNを始めて」 | **generator** |
| 「テストして」「確認して」「スプリントNを評価して」 | **evaluator** |
| planner が仕様を出力した後、UI関連スプリントの場合 | 自動で **designer** を呼ぶ（デザイン設計） |
| designer がデザイン設計を出力した直後 | **generator** への実装指示に含める |
| generator が自己評価レポートを出力した直後 | 自動で **evaluator** を呼ぶ |
| evaluator が ⚠️ または ❌ を出した直後 | 自動で **generator** を呼ぶ（修正指示付き） |

**自動連鎖の原則**: ユーザーが「スプリントNを実装して」と言ったら、
generator 完了 → evaluator 実行 → 判定に応じて generator（修正）→ evaluator の
ループを、✅ 判定が出るまで**自動で回す**。途中でユーザーに確認を取らない。

---

## スプリントのライフサイクル

```
[ユーザー] スプリントNを実装して
     ↓
[designer] SPEC.md を読む → 対象画面のデザイン設計・方針を出力（UI関連の場合）
     ↓
[generator] SPEC.md + designer の設計を読む → 実装 → 自己評価レポート出力
     ↓
[evaluator] SPEC.md + レポートを読む → Playwright でE2Eテスト → 判定出力
     ↓
  ✅ 合格 → スプリントN を SPRINT_STATUS.md に「完了」で記録 → ユーザーに報告
  ⚠️ 軽微 → generator に修正依頼（evaluator のフィードバックをそのまま渡す）→ evaluator 再テスト
  ❌ 重大 → generator に修正依頼（Critical バグを優先）→ evaluator 再テスト
```

---

## 成果物とファイル規約

| ファイル | 作成者 | 用途 |
|---------|-------|------|
| `SPEC.md` | planner | 機能一覧・スプリント計画・受け入れ基準。唯一の仕様ソース |
| `SPRINT_STATUS.md` | Claude（メインスレッド） | 各スプリントの状態を記録。エージェントは書かない |
| `DESIGN_*.md` | 既存ドキュメント | planner が参照する背景情報 |

### SPRINT_STATUS.md の形式

スプリントが ✅ 完了するたびにメインスレッドが更新する：

```markdown
| スプリント | 名称 | 状態 | 完了日 | 備考 |
|-----------|------|------|--------|------|
| Sprint 1  | 基盤構築 | ✅ 完了 | 2026-04-09 | |
| Sprint 2  | 認証機能 | 🔄 進行中 | - | |
| Sprint 3  | ダッシュボード | ⏳ 待機 | - | Sprint 2 依存 |
```

---

## エージェント間の引き渡しルール

### designer → generator への渡し方
designer の出力した「ジェネレーターへの実装指示」セクションを**そのまま**
generator への指示に含める。デザイン方針・コンポーネント仕様・Tailwind CSSクラスをそのまま渡す。

### generator → evaluator への渡し方
generator の出力した「エバリュエーターへの確認依頼」セクションを**そのまま**
evaluator への指示として渡す。メインスレッドが要約・編集しない。

### evaluator → generator への渡し方
evaluator の出力した「ジェネレーターへのフィードバック」セクションを**そのまま**
generator への修正指示として渡す。「以下のフィードバックに基づいて修正してください」と付けるだけ。

---

## 禁止事項（メインスレッド）

- SPEC.md の内容を planner を通さずに直接編集しない
- generator の実装中に割り込んでコードを修正しない
- evaluator の判定が ❌ なのに次のスプリントへ進まない
- ループが3周しても ❌ のままなら、ユーザーに報告してから続ける

---

## 技術スタック（generator が参照）

このプロジェクトは Steam プレイ時間ビジュアライザー（`DESIGN_STEAM_TRACKER.md` 参照）。
技術選定は generator に委ねる。ただし以下を優先する：
- **フロントエンド**: モダンなWebフレームワーク（React / Vue / Svelte いずれか）
- **バックエンド**: Node.js または Python
- **DB**: SQLite（ローカル開発）→ 本番移行時は generator が判断
- **テスト**: Playwright（evaluator が使用するため必須）

---

## ループ制御

| 状況 | 対応 |
|------|------|
| generator が同じバグを3回直せない | ユーザーに状況報告して判断を仰ぐ |
| evaluator が起動できない（Playwright エラー） | バグ内容を手動で generator に伝えてテストをスキップ |
| SPEC.md に矛盾がある | planner を呼んで該当スプリントの仕様を修正してから generator を再実行 |
