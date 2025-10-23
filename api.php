<?php
header('Content-Type: application/json');
require_once 'db_connect.php'; // ★ db_connect.php を使用

$type = isset($_GET['type']) ? $_GET['type'] : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

$response = [];

switch ($type) {
    case 'race':
        // ★★★ COALESCEを使って、NULLを安全に扱う ★★★
        $sql = "
            SELECT 
                race_id AS id, 
                race_name AS name, 
                reading 
            FROM race 
            WHERE 
                race_name LIKE :query 
                OR COALESCE(reading, '') LIKE :query 
            LIMIT 150
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':query', '%' . $query . '%');
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
