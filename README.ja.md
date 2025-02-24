# Playwright MCP Server

[![smithery badge](https://smithery.ai/badge/@showfive/playwright-mcp-server)](https://smithery.ai/server/@showfive/playwright-mcp-server)

[English](README.md) | 日本語

このプロジェクトは、Model Context Protocol (MCP)を使用してPlaywrightのウェブページコンテンツ取得機能を提供するサーバーです。

## 機能

- ページナビゲーション
- ページ全体のコンテンツ取得
- 表示されているコンテンツの取得
- インタラクティブ要素の検出
- マウス操作のシミュレーション
- テスト用のエコー機能

## インストール

### Installing via Smithery

To install Playwright MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@showfive/playwright-mcp-server):

```bash
npx -y @smithery/cli install @showfive/playwright-mcp-server --client claude
```

### Manual Installation
```bash
npm install
```

## 使用方法

### サーバーの起動

```bash
npm run build
npm start
```

### MCPツール

以下のツールが利用可能です：

1. `navigate`
   - 指定したURLにページを移動
   - 引数: `{ url: string }`
   - 戻り値: ナビゲーション結果

2. `get_all_content`
   - ページ全体のコンテンツを取得
   - 引数: なし
   - 戻り値: ページの全テキストコンテンツ

3. `get_visible_content`
   - 現在表示されているコンテンツを取得
   - 引数: `{ minVisiblePercentage?: number }`
   - 戻り値: 表示されているテキストコンテンツ

4. `get_interactive_elements`
   - ページ内のインタラクティブ要素（ボタン、リンクなど）の位置情報を取得
   - 引数: なし
   - 戻り値: インタラクティブ要素の座標と範囲情報

5. `move_mouse`
   - マウスカーソルを指定座標に移動
   - 引数: `{ x: number, y: number }`
   - 戻り値: 操作結果

6. `mouse_click`
   - 指定座標でマウスクリックを実行
   - 引数: `{ x: number, y: number, button?: "left" | "right" | "middle", clickCount?: number }`
   - 戻り値: クリック操作結果

7. `mouse_wheel`
   - マウスホイールのスクロールを実行
   - 引数: `{ deltaY: number, deltaX?: number }`
   - 戻り値: スクロール操作結果

8. `drag_and_drop`
   - ドラッグアンドドロップ操作を実行
   - 引数: `{ sourceX: number, sourceY: number, targetX: number, targetY: number }`
   - 戻り値: ドラッグアンドドロップ操作結果

9. `echo`
   - テスト用のエコーツール
   - 引数: `{ message: string }`
   - 戻り値: 送信したメッセージ

## 開発

### テストの実行

```bash
# 全てのテストを実行
npm test

# テストをウォッチモードで実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage
```

### テストの構成

- `tools/*.test.ts`: 各ツールの機能テスト
- `mcp-server.test.ts`: MCPサーバーの機能テスト

## 実装の特徴

1. コンテンツ取得
   - ページ全体のコンテンツ取得
   - 表示されているコンテンツのみの取得
   - HTMLの適切なパース処理

2. インタラクション
   - インタラクティブ要素の検出と位置情報の取得
   - マウス操作のシミュレーション（移動、クリック、スクロール）
   - ドラッグアンドドロップのサポート

3. エラーハンドリング
   - ナビゲーションエラーの適切な処理
   - タイムアウト処理
   - 無効なURLの検出

4. 設定の柔軟性
   - ヘッドレス/ヘッドモードの選択
   - カスタムユーザーエージェント
   - ビューポートサイズの設定

## 注意事項

- MCPサーバーを使用する前に、必要な環境変数が設定されていることを確認してください。
- ウェブページのコンテンツ取得は対象のウェブサイトの利用規約に従って行ってください。
- 大量のリクエストを送信する場合は、適切な間隔を設けてください。
- マウス操作は実際のユーザーの操作をシミュレートするため、適切な間隔を設けて実行してください。

## ライセンス

ISC