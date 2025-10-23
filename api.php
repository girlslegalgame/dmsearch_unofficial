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
        // ★★★ ここからが、最後の修正 ★★★
        $sql_where_parts = ['race_name LIKE :query_name'];
        $params = [':query_name' => '%' . $query . '%'];

        if ($has_reading_column) {
            $sql_where_parts[] = 'reading LIKE :query_reading';
            $params[':query_reading'] = '%' . $query . '%'; // ★ reading用のパラメータを追加
        }

        $select_reading = $has_reading_column ? 'reading' : 'NULL AS reading';
        
        $sql = "SELECT race_id AS id, race_name AS name, {$select_reading} FROM race WHERE " . implode(' OR ', $sql_where_parts);
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
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
