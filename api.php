<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
$type = isset($_GET['type']) ? $_GET['type'] : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

$response = [];

switch ($type) {
    case 'race': // ★★★ 新しいcaseを追加 ★★★
        $orderBy = "ORDER BY reading COLLATE utf8mb4_unicode_ci ASC";
        $sql = "SELECT race_id AS id, race_name AS name FROM race WHERE race_name LIKE :query OR reading LIKE :query {$orderBy} LIMIT 50";
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
            // goodstype_idが0の場合は全件返す
            $sql = "SELECT goods_id AS id, goods_name AS name FROM goods ORDER BY goods_id ASC";
            $stmt = $pdo->prepare($sql);
        }
        $stmt->execute();
        $response = $stmt->fetchAll(PDO::FETCH_ASSOC);
        break;
}

echo json_encode($response);
?>
