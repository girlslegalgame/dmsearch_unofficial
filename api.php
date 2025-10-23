<?php
header('Content-Type: application/json');
require_once 'db_connect.php'; // ★ db_connect.php を使用

$type = isset($_GET['type']) ? $_GET['type'] : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

$response = [];

switch ($type) {
    case 'race':
        // readingカラムの有無に応じて、SQL文を動的に切り替える
        if ($has_reading_column) {
            $sql = "SELECT race_id AS id, race_name AS name, reading FROM race WHERE race_name LIKE :query OR reading LIKE :query LIMIT 150";
        } else {
            $sql = "SELECT race_id AS id, race_name AS name, NULL AS reading FROM race WHERE race_name LIKE :query LIMIT 150";
        }
        
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

echo json_encode($response);
?>
