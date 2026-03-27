<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'functions.php';

$card_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($card_id === 0) {
    echo json_encode(['error' => 'Invalid ID']);
    exit;
}
$response = [];

// 1. カード構成（ツインパクト等）の確認
$stmt = $pdo->prepare("SELECT combination_id FROM card_combination WHERE card_id = ? LIMIT 1");
$stmt->execute([$card_id]);
$combination_info = $stmt->fetch(PDO::FETCH_ASSOC);

if ($combination_info) {
    $response['is_combination'] = true;
    $stmt = $pdo->prepare("
        SELECT c.*, cd.* 
        FROM card_combination cc 
        JOIN card c ON cc.card_id = c.card_id 
        JOIN card_detail cd ON c.card_id = cd.card_id 
        WHERE cc.combination_id = ? 
        ORDER BY cc.card_id ASC
    ");
    $stmt->execute([$combination_info['combination_id']]);
    $response['cards'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} else {
    $response['is_combination'] = false;
    $stmt = $pdo->prepare("SELECT c.*, cd.* FROM card c JOIN card_detail cd ON c.card_id = cd.card_id WHERE c.card_id = ?");
    $stmt->execute([$card_id]);
    $card_data = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$card_data) {
        echo json_encode(['error' => 'Card not found']);
        exit;
    }
    $response['cards'] = [$card_data];
}

// 2. 各カードの詳細情報を取得・整形
foreach ($response['cards'] as $index => &$card) {
    $current_id = $card['card_id'];
    $modelnum = $card['modelnum'];
    $series = get_series_folder($modelnum);
    $part_char = $response['is_combination'] ? chr(97 + $index) : "";

    // --- 【修正箇所】カードの種類 (card_cardtypeテーブルのtypenameを取得) ---
    $stmt = $pdo->prepare("SELECT typename FROM card_cardtype WHERE card_id = ? LIMIT 1");
    $stmt->execute([$current_id]);
    $card['card_type'] = $stmt->fetchColumn() ?: '---';

    // 文明
    $stmt = $pdo->prepare("SELECT c.civilization_name FROM card_civilization cc JOIN civilization c ON cc.civilization_id = c.civilization_id WHERE cc.card_id = ?");
    $stmt->execute([$current_id]);
    $card['civilization'] = implode(' / ', $stmt->fetchAll(PDO::FETCH_COLUMN)) ?: '---';

    // 種族
    $stmt = $pdo->prepare("SELECT r.race_name FROM card_race cr JOIN race r ON cr.race_id = r.race_id WHERE cr.card_id = ?");
    $stmt->execute([$current_id]);
    $card['race'] = implode(' / ', $stmt->fetchAll(PDO::FETCH_COLUMN)) ?: '---';

    // イラストレーター
    $stmt = $pdo->prepare("SELECT i.illus_name FROM card_illus ci JOIN illus i ON ci.illus_id = i.illus_id WHERE ci.card_id = ?");
    $stmt->execute([$current_id]);
    $card['illustrator'] = implode(' / ', $stmt->fetchAll(PDO::FETCH_COLUMN)) ?: '---';

    // レアリティ
    $stmt = $pdo->prepare("SELECT r.rarity_name FROM card_rarity cr JOIN rarity r ON cr.rarity_id = r.rarity_id WHERE cr.card_id = ? LIMIT 1");
    $stmt->execute([$current_id]);
    $card['rarity'] = $stmt->fetchColumn() ?: '---';

    // --- 外部テキスト読み込み ---
    $text_content = $card['text'] ?? '';
    $flavor_content = $card['flavortext'] ?? '';
    
    $path1 = "text/{$series}/{$modelnum}/{$modelnum}{$part_char}.txt";
    $path2 = "text/{$series}/{$modelnum}{$part_char}.txt";
    if (file_exists($path1)) $text_content = file_get_contents($path1);
    elseif (file_exists($path2)) $text_content = file_get_contents($path2);

    $fpath1 = "flavortext/{$series}/{$modelnum}/{$modelnum}{$part_char}.txt";
    $fpath2 = "flavortext/{$series}/{$modelnum}{$part_char}.txt";
    if (file_exists($fpath1)) $flavor_content = file_get_contents($fpath1);
    elseif (file_exists($fpath2)) $flavor_content = file_get_contents($fpath2);

    $card['text'] = format_card_text($text_content, true);
    $card['flavortext'] = format_card_text($flavor_content, false);

    // --- 画像パス ---
    $card['image_url'] = get_card_image_url($modelnum, $part_char);

    // --- デバッグ用 ---
    $stmt = $pdo->prepare("SELECT a.ability_name FROM card_ability ca JOIN ability a ON ca.ability_id = a.ability_id WHERE ca.card_id = ?");
    $stmt->execute([$current_id]);
    $card['ability_names_debug'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
}
unset($card);

echo json_encode($response);
