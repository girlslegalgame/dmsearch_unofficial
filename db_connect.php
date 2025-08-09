<?php
// エラーを画面に表示するための設定（開発中のみ有効にすると便利）
ini_set('display_errors', 1);
error_reporting(E_ALL);

// まずローカル(XAMPP)用のデータベース設定を定義します
$db_host = 'localhost';
$db_port = 3306;
$db_name = 'mysql'; // ★あなたのローカル環境のデータベース名に書き換えてください
$db_user = 'root';
$db_pass = '';      // XAMPPのデフォルトは空パスワードです

// もしRailwayの本番環境変数があれば、そちらの設定を優先して使います
// このif文のおかげで、ローカルでも本番でもコードを書き換える必要がなくなります
if (getenv('RAILWAY_ENVIRONMENT')) {
    $db_host = getenv('MYSQLHOST');
    $db_port = getenv('MYSQLPORT');
    $db_name = getenv('MYSQLDATABASE');
    $db_user = getenv('MYSQLUSER');
    $db_pass = getenv('MYSQLPASSWORD');
}

// データベースに接続するための設定（DSN）
$dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";

// 接続オプション
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // エラーを例外としてスロー
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // 結果を連想配列として取得
    PDO::ATTR_EMULATE_PREPARES   => false,                  // SQLインジェクション対策
];

// PDOインスタンスを作成してデータベースに接続します
try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    // 接続に失敗した場合、ログにエラーを記録してプログラムを停止させます
    error_log("Database Connection Error: " . $e->getMessage());
    // 実際のユーザーには、単純なエラーメッセージのみを表示します
    throw new PDOException($e->getMessage(), (int)$e->getCode());
}

// これで、他のファイルからこのファイルを読み込むと、$pdoという変数でデータベース操作ができるようになります。
?>