1. 概要
    日常の「今日って傘いるんだっけ？」「どんな服を着ていけばいい？」という小さなストレスを解決する、AIアシスタント機能付きのお天気LINE通知ボットです。
    ユーザーの現在地（GPS）の天気を取得し、指定した時間に、ユーザーが選んだお好みのAIキャラクターがパーソナライズされたアドバイス（服装や持ち物など）をLINEで通知します。


2. 課題解決のストーリー (Problem & Solution)
    課題： 天気予報アプリを毎朝開くのが面倒。また、気温（例：20度）だけ見ても「結局どの服を着れば快適なのか」が直感的に分かりにくい。

    解決策： 毎朝自動でLINEに通知が届く。さらに、AIが天気と気温を分析し、「オカン風」「執事風」などの口調で「上着を持っていきや！」と具体的な行動ベースのアドバイスをくれるため、直感的に準備ができる。


3. 技術スタック (Tech Stack)
    モダンな開発構成と、個人開発におけるコスト最適化（無料枠の最大活用）を両立した構成にします。

    フロントエンド: Next.js (App Router), TypeScript, Tailwind CSS

    バックエンド: Go (または Python/FastAPI) ※どちらが良いか後述のステップで決定

    データベース/認証: Supabase (PostgreSQL / Supabase Auth)

    インフラ/デプロイ: Vercel (フロント), Render/Railway (バックエンド), GitHub Actions (CI/CD)

    外部API: OpenWeatherMap API, OpenAI API (GPT-4o mini), LINE Messaging API


4. システム構成・処理の流れ (Architecture)
    まずは一番シンプルな処理の流れ（通知タイミング）の設計です。

    [ユーザー]
        ↑ (1日3回 LINE通知)
    [LINE Messaging API]
        ▲
        │ (メッセージ送信)
    [バックエンド (Go/Python)] ──(プロンプト＋天気情報)──> [OpenAI API]
        │
        ├─(定期実行 / Cron)
        ├─(ユーザーの設定・位置情報を取得) ──> [Supabase DB]
        └─(最新の天気を取得) ──> [OpenWeatherMap API]


5. 実装ロードマップ (Roadmap)
    今回は以下のマイルストーンで進めます。

    [🍿] Phase 1: 設計の確定とREADME作成

    [🍿] Phase 2: フロントエンド(Next.js)のモック作成 (設定画面のUI)

    [ ] Phase 3: Supabaseのセットアップ (ログイン機能と、設定を保存するDB)

    [ ] Phase 4: バックエンド(Go/Python)の作成 (天気・AI・LINEのAPI連携ロジック)

    [ ] Phase 5: 定期実行(Cron)とインフラ自動デプロイの設定

    [ ] Phase 6: READMEの最終ブラッシュアップと公開


    7/9 LINE側の位置情報を保持して天気の出力までOK
        つぎは、LINE上でキャラクター選択と通知時間の設定がしたい

    7/11 位置情報保存、キャラクター切り替え、通知時間設定、ルールブック機能を追加
         つぎは、ユーザごとにデータを保存できるように