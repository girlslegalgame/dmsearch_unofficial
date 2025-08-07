<?php
header('Content-Type: application/json');
$pdo = new PDO('mysql:host=localhost;dbname=dmsearch;charset=utf8', 'dmuser', 'dmpass');

$card_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($card_id === 0) {
    echo json_encode(['error' => 'Invalid ID']);
    exit;
}

$response = [];

// ★★★ card と card_detail をJOINして、基本情報を一度に取得 ★★★
$stmt = $pdo->prepare("
    SELECT 
        c.card_name, c.cost, c.pow,
        cd.modelnum, cd.mana
    FROM card c
    JOIN card_detail cd ON c.card_id = cd.card_id
    WHERE c.card_id = ?
    LIMIT 1
");
$stmt->execute([$card_id]);
$card_data = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$card_data) {
    echo json_encode(['error' => 'Card not found']);
    exit;
}

// --- 基本情報とマナを$responseに格納 ---
$response['card_name'] = $card_data['card_name'] ?? '---';
$response['cost'] = ($card_data['cost'] == 2147483647) ? '∞' : ($card_data['cost'] ?? '---');
$response['pow'] = ($card_data['pow'] == 2147483647) ? '∞' : ($card_data['pow'] ?? '---');
$response['mana'] = $card_data['mana'] ?? '---'; // NULLの場合は'---'を表示

$modelnum = $card_data['modelnum'] ?? null;


// --- カードの種類 (card_cardtype) ---
$stmt = $pdo->prepare("
    SELECT t.cardtype_name, c.characteristics_name, cc.characteristics_id
    FROM card_cardtype cc
    JOIN cardtype t ON cc.cardtype_id = t.cardtype_id 
    LEFT JOIN characteristics c ON cc.characteristics_id = c.characteristics_id 
    WHERE cc.card_id = ?
");
$stmt->execute([$card_id]);
$type_info = $stmt->fetch(PDO::FETCH_ASSOC);

$type_parts = [];
if ($type_info && $type_info['characteristics_id'] != 1 && !empty($type_info['characteristics_name'])) {
    $type_parts[] = $type_info['characteristics_name'];
}
if ($type_info && !empty($type_info['cardtype_name'])) {
    $type_parts[] = $type_info['cardtype_name'];
}
$response['card_type'] = !empty($type_parts) ? implode('', $type_parts) : '---';


// --- 文明 (card_civilization) ---
$stmt = $pdo->prepare("SELECT c.civilization_name FROM card_civilization cc JOIN civilization c ON cc.civilization_id = c.civilization_id WHERE cc.card_id = ?");
$stmt->execute([$card_id]);
$civs = $stmt->fetchAll(PDO::FETCH_COLUMN);
$response['civilization'] = !empty($civs) ? implode(' / ', $civs) : '---';

// --- レアリティ (card_rarity) ---
$stmt = $pdo->prepare("SELECT r.rarity_name FROM card_rarity cr JOIN rarity r ON cr.rarity_id = r.rarity_id WHERE cr.card_id = ? LIMIT 1");
$stmt->execute([$card_id]);
$response['rarity'] = $stmt->fetchColumn() ?: '---';

// --- 種族 (card_race) ---
$stmt = $pdo->prepare("SELECT r.race_name FROM card_race cr JOIN race r ON cr.race_id = r.race_id WHERE cr.card_id = ?");
$stmt->execute([$card_id]);
$races = $stmt->fetchAll(PDO::FETCH_COLUMN);
$response['race'] = !empty($races) ? implode(' / ', $races) : '---';

// --- イラストレーター (card_illus) ---
$stmt = $pdo->prepare("SELECT i.illus_name FROM card_illus ci JOIN illus i ON ci.illus_id = i.illus_id WHERE ci.card_id = ?");
$stmt->execute([$card_id]);
$illustrators = $stmt->fetchAll(PDO::FETCH_COLUMN);
$response['illustrator'] = !empty($illustrators) ? implode(' / ', $illustrators) : '---';

// --- 特殊能力テキスト (textファイル) ---
$response['text'] = '（テキスト情報なし）';
if ($modelnum) {
    $text_file_path = 'text/' . $modelnum . '.txt';
    if (file_exists($text_file_path)) {
        $raw_text = file_get_contents($text_file_path);
        $lines = explode("\n", $raw_text);
        $processed_lines = [];
        foreach ($lines as $line) {
            $trimmed_line = trim($line);
            if (empty($trimmed_line)) {
                continue;
            }
            $escaped_line = htmlspecialchars($trimmed_line);
            if (strpos($escaped_line, '{br}') === false && strpos($escaped_line, '{st}') === false) {
                $processed_lines[] = '■ ' . $escaped_line;
            } else {
                $processed_lines[] = $escaped_line;
            }
        }
        $formatted_text = implode('<br>', $processed_lines);
        $final_replacements = [
            '{br}' => '<img src="parts/card_list_block.webp" alt="Blocker" class="text-icon">',
            '{st}' => '<img src="parts/card_list_strigger.webp" alt="S-Trigger" class="text-icon">',
        ];
        $final_text = str_replace(array_keys($final_replacements), array_values($final_replacements), $formatted_text);
        $response['text'] = $final_text;
    }
}

echo json_encode($response);
?>