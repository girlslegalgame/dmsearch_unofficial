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
            $where_reading = $has_reading_column ? 'OR reading LIKE :query' : '';
            $sql = "SELECT race_id AS id, race_name AS name {$select_reading} FROM race WHERE race_name LIKE :query {$where_reading} LIMIT 50";
            $stmt = $pdo->prepare($sql);
            // executeに、すべてのプレースホルダーに対応する値を一度に渡す
            $stmt->execute([':query' => '%' . $query . '%']);
        } else {
            // ★★★ 全件取得モード ★★★
            // queryが空の場合は、LIMITなしで全件を返す
            $sql = "SELECT race_id AS id, race_name AS name {$select_reading} FROM race";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
        }
        $stmt->execute();
        $response = $stmt->fetchAll(PDO::FETCH_ASSOC);
        break;
    case 'ability':
        // abilityテーブルにreadingカラムがあるかチェック
        try {
            $columns_stmt_ability = $pdo->query("SHOW COLUMNS FROM ability");
            $columns_ability = $columns_stmt_ability->fetchAll(PDO::FETCH_COLUMN);
            $has_reading_column_ability = in_array('reading', $columns_ability);
        } catch (PDOException $e) {
            echo json_encode(['error' => 'Database schema error for ability table: ' . $e->getMessage()]);
            exit;
        }

        $select_reading_ability = $has_reading_column_ability ? ', reading' : ', NULL AS reading';
        
        if (!empty($query)) {
            $where_reading_ability = $has_reading_column_ability ? 'OR reading LIKE :query' : '';
            $sql = "SELECT ability_id AS id, ability_name AS name {$select_reading_ability} FROM ability WHERE ability_name LIKE :query {$where_reading_ability} LIMIT 50";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':query' => '%' . $query . '%']);
        } else {
            $sql = "SELECT ability_id AS id, ability_name AS name {$select_reading_ability} FROM ability";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
        }
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
    case 'others':
        if (!empty($query)) {
            $sql = "SELECT others_id AS id, others_name AS name FROM others WHERE others_name LIKE :query ORDER BY others_id ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':query' => '%' . $query . '%']);
        } else {
            $sql = "SELECT others_id AS id, others_name AS name FROM others ORDER BY others_id ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
        }
        $response = $stmt->fetchAll(PDO::FETCH_ASSOC);
        break;
    case 'soul':
        // soulテーブルから一覧を取得
        if (!empty($query)) {
            $sql = "SELECT soul_id AS id, soul_name AS name FROM soul WHERE soul_name LIKE :query ORDER BY soul_id ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':query' => '%' . $query . '%']);
        } else {
            $sql = "SELECT soul_id AS id, soul_name AS name FROM soul ORDER BY soul_id ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
        }
        $response = $stmt->fetchAll(PDO::FETCH_ASSOC);
        break;
}

echo json_encode($response);

?>
