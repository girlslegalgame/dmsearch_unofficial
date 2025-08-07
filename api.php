<?php
header('Content-Type: application/json');
$pdo = new PDO('mysql:host=localhost;dbname=dmsearch;charset=utf8', 'dmuser', 'dmpass');

$type = isset($_GET['type']) ? $_GET['type'] : '';
$query = isset($_GET['query']) ? trim($_GET['query']) : '';

$response = [];

switch ($type) {
    case 'race':
        $orderBy = "ORDER BY reading COLLATE utf8mb4_unicode_ci ASC";

        if (!empty($query)) {
            // サジェスト検索時は20件に絞る
            $sql = "SELECT race_id AS id, race_name AS name FROM race WHERE reading LIKE :query {$orderBy} LIMIT 20";
            $stmt = $pdo->prepare($sql);
            $stmt->bindValue(':query', '%' . $query . '%');
        } else {
            // ★★★ 全件取得時の上限を、より安全な値(150件)に見直す ★★★
            $sql = "SELECT race_id AS id, race_name AS name FROM race {$orderBy} LIMIT 150";
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