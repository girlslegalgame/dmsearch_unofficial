<?php
// Railwayの本番環境かどうかを判断
if (getenv('RAILWAY_ENVIRONMENT')) {
    // 【本番環境】Railwayの環境変数を読み込む
    $db_host = getenv('MYSQLHOST');
    $db_port = getenv('MYSQLPORT');
    $db_name = getenv('MYSQLDATABASE');
    $db_user = getenv('MYSQLUSER');
    $db_pass = getenv('MYSQLPASSWORD');
} else {
    // 【ローカル環境】XAMPP用の設定
    $db_host = 'localhost';
    $db_port = 3306;
    $db_name = 'mysql'; // ★あなたのローカルDB名に合わせてください
    $db_user = 'root';
    $db_pass = '';
}

$dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    // 接続に失敗したら、具体的なエラーを投げて処理を止める
    throw new PDOException("Database connection failed: " . $e->getMessage(), (int)$e->getCode());
}
?>
