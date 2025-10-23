<?php
header('Content-Type: application/json');
require_once 'db_connect.php'; // ★ db_connect.php を使用

$type = isset($_GET['type']) ? $_GET['type'] : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

$response = [];

try {
    $columns_stmt = $pdo->query("SHOW COLUMNS FROM race");
    $columns = $columns_stmt->fetchAll(PDO::FETCH_COLUMN);
    $has_reading_column = in_array('reading', $columns);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database schema error: ' . $e->getMessage()]);
    exit;
}

switch ($type) {
    case 'race':
        // readingカラムの有無で、SELECT句とWHERE句を動的に変更
        $select_reading = $has_reading_column ? ', reading' : ', NULL AS reading';
        $where_reading = $has_reading_column ? 'OR reading LIKE :query' : '';

        if (!empty($query)) {
            // ★★★ サジェスト検索モード ★★★
            // queryに文字が入っている場合は、絞り込んで返す
            $sql = "SELECT race_id AS id, race_name AS name {$select_reading} FROM race WHERE race_name LIKE :query {$where_reading} LIMIT 50";
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':query', '%' . $query . '%');
        } else {
            // ★★★ 全件取得モード ★★★
            // queryが空の場合は、LIMITなしで全件を返す
            $sql = "SELECT race_id AS id, race_name AS name {$select_reading} FROM race";
            $stmt = $pdo->prepare($sql);
        }
        $stmt->execute();
        $response = $stmt->fetchAll(PDO::FETCH_ASSOC);
        break;
    
    case 'goods':
        $goodstype_id = isset($_GET['goodstype_id']) ? intval($_GET['goodstype_id']) : 0;
        if ($goodstype_id > 0) {
            $sql = "SELECT goods_id AS id, goods_name AS name FROM goods WHERE goodstype_id = :goodstype_id ORDER BY goods_id ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':goodstype_id', $goodstype_id);
        } else {
            $sql = "SELECT goods_id AS id, goods_name AS name FROM goods ORDER BY goods_id ASC";
            $stmt = $pdo->prepare($sql);
        }
        $stmt->execute();
        $response = $stmt->fetchAll(PDO::FETCH_ASSOC);
        break;
}

// echo json_encode($response);
// ★★★ここからが最後のデバッグコード★★★
header('Content-Type: text/plain; charset=utf-8'); // JSONではなく、ただのテキストとして表示
echo "--- DEBUGGING API RESPONSE ---\n\n";

echo "Received parameters:\n";
echo "type: " . htmlspecialchars($type) . "\n";
echo "query: " . htmlspecialchars($query) . "\n\n";

if (isset($sql)) {
    echo "Executed SQL:\n";
    echo $sql . "\n\n";
}

echo "Response Data (before json_encode):\n";
print_r($response);

echo "\n\n--- END OF DEBUG ---";
// ★★★ここまでが最後のデバッグコード★★★
?>
