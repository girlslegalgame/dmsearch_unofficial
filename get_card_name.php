<?php
    header('Content-Type: application/json');
    $pdo = new PDO('mysql:host=localhost;dbname=dmsearch;charset=utf8', 'dmuser', 'dmpass');

    $card_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($card_id === 0) {
        echo json_encode(['error' => 'Invalid ID']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT card_name FROM card WHERE card_id = ?");
    $stmt->execute([$card_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo json_encode($result);
    } else {
        echo json_encode(['card_name' => '（見つかりません）']);
    }
?>