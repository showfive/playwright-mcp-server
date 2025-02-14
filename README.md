# Playwright MCP Server

[![smithery badge](https://smithery.ai/badge/@showfive/playwright-mcp-server)](https://smithery.ai/server/@showfive/playwright-mcp-server)

このプロジェクトは、Model Context Protocol (MCP)を使用してPlaywrightのブラウザ自動化機能を提供するサーバーです。

## 機能

- ブラウザの制御（起動・終了）
- ページナビゲーション
- 要素のクリック操作
- テキスト入力
- スクロール操作

各操作は人間らしい動作をエミュレートするように実装されています：

- クリック操作：ランダムな遅延を含む自然なクリック
- テキスト入力：人間らしい入力速度
- スクロール：スムーズなアニメーション

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

1. `create_browser`
   - 新しいブラウザコンテキストを作成
   - 引数: なし
   - 戻り値: `{ contextId: string }`

2. `navigate`
   - 指定したURLにページを移動
   - 引数: `{ contextId: string, url: string }`
   - 戻り値: ナビゲーション結果

3. `click`
   - 要素をクリック
   - 引数: `{ contextId: string, selector: string }`
   - 戻り値: クリック操作の結果

4. `type_text`
   - テキストを入力
   - 引数: `{ contextId: string, selector: string, text: string }`
   - 戻り値: 入力操作の結果

5. `scroll`
   - ページをスクロール
   - 引数: `{ contextId: string, y: number }`
   - 戻り値: スクロール操作の結果

6. `close_browser`
   - ブラウザコンテキストを閉じる
   - 引数: `{ contextId: string }`
   - 戻り値: 終了処理の結果

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

- `browser-manager.test.ts`: Playwrightの基本機能テスト
- `mcp-server.test.ts`: MCPサーバーの機能テスト

## 実装の特徴

1. 人間らしい操作
   - ランダムな遅延を含む自然な操作
   - スムーズなアニメーション
   - 適切な待機時間

2. エラーハンドリング
   - 要素が見つからない場合の適切なエラー処理
   - タイムアウト処理
   - コンテキスト管理の安全性

3. 設定の柔軟性
   - ヘッドレス/ヘッドモードの選択
   - カスタムユーザーエージェント
   - ビューポートサイズの設定

## 注意事項

- MCPサーバーを使用する前に、必要な環境変数が設定されていることを確認してください。
- ブラウザの自動操作は対象のウェブサイトの利用規約に従って行ってください。
- 大量のリクエストを送信する場合は、適切な間隔を設けてください。

## ライセンス

ISC
