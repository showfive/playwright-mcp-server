# Playwright MCP Server

[![smithery badge](https://smithery.ai/badge/@showfive/playwright-mcp-server)](https://smithery.ai/server/@showfive/playwright-mcp-server)

このプロジェクトは、Model Context Protocol (MCP)を使用してPlaywrightのウェブページコンテンツ取得機能を提供するサーバーです。

## 機能

- ページナビゲーション
- ページ全体のコンテンツ取得
- 表示されているコンテンツの取得
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
   - 引数: なし
   - 戻り値: 表示されているテキストコンテンツ

4. `echo`
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

2. エラーハンドリング
   - ナビゲーションエラーの適切な処理
   - タイムアウト処理
   - 無効なURLの検出

3. 設定の柔軟性
   - ヘッドレス/ヘッドモードの選択
   - カスタムユーザーエージェント
   - ビューポートサイズの設定

## 注意事項

- MCPサーバーを使用する前に、必要な環境変数が設定されていることを確認してください。
- ウェブページのコンテンツ取得は対象のウェブサイトの利用規約に従って行ってください。
- 大量のリクエストを送信する場合は、適切な間隔を設けてください。

## ライセンス

ISC
