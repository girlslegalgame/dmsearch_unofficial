<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

// ★★★ ヘルパー関数は、ファイルの最初に一度だけ定義する ★★★
function get_series_folder_from_modelnum($modelnum) {
    if (!$modelnum || strpos($modelnum, '-') === false) {
        return ''; // ハイフンがなければ、商品型番フォルダはないと判断
    }
    $parts = explode('-', $modelnum);
    return strtolower($parts[0]);
}

function process_files_from_folder($modelnum, $file_type) {
    if (!$modelnum) return [];

    // ★★★ここからが新しいロジック★★★
    // modelnumから商品型番（例: 'dm01'）を抽出する
    $parts = explode('-', $modelnum);
    $series_folder = strtolower($parts[0]);
    if (empty($series_folder)) return []; // 抽出できなければ終了

    $folder_path = $file_type . "/" . $series_folder . "/" . $modelnum;
    // ★★★ここまでが新しいロジック★★★

    if (!is_dir($folder_path)) return [];
    
    $parts = [];
    foreach (range('a', 'z') as $char) {
        $file_path = $folder_path . "/" . $modelnum . $char . ".txt";
        if (file_exists($file_path)) {
            $content = file_get_contents($file_path);
            $parts[$char] = ($content !== false) ? trim($content) : '';
        } else {
            break;
        }
    }
    return $parts;
}

// ★★★ すべてのテキスト処理を、この一つの関数に統合する (真の最終版) ★★★
function format_text_for_display($raw_text, $is_ability) {
    if (!$raw_text || trim($raw_text) === '') {
        return $is_ability ? '（テキスト情報なし）' : null;
    }
    
    $icon_map = [
        '{ST}' => '<img src="parts/card_list_strigger.webp" alt="S-Trigger" class="text-icon">',
        '{BR}' => '<img src="parts/card_list_block.webp" alt="Blocker" class="text-icon">',
        '{SV}' => '<img src="parts/card_list_survivor.webp" alt="Survivor" class="text-icon">',
        '{TT}' => '<img src="parts/card_list_taptrigger.webp" alt="Tap-Trigger" class="text-icon">',
        '{TR}' => '<img src="parts/card_list_turborush.webp" alt="Turbo-Rush" class="text-icon">',
        '{SS}' => '<img src="parts/card_list_silentskill.webp" alt="Silent_Skill" class="text-icon">',
        '{WS}' => '<img src="parts/card_list_wavestriker.webp" alt="Wave_Striker" class="text-icon">',
        '{MM}' => '<img src="parts/card_list_metamorph.webp" alt="Metamorph" class="text-icon">',
        '{AC}' => '<img src="parts/card_list_accel.webp" alt="Accel" class="text-icon">',
        '{SB}' => '<img src="parts/card_list_strike_back.webp" alt="Strike-Back" class="text-icon">',
        '{FE}' => '<img src="parts/card_list_fortenergy.webp" alt="Fort-Energy" class="text-icon">',
    ];

    $lines = explode("\n", $raw_text);
    $processed_lines = [];
    foreach ($lines as $line) {
        $trimmed_line = trim($line);
        if (empty($trimmed_line)) continue;
        
        $line_to_process = $trimmed_line; 
        
        if ($is_ability) {
            // --- 能力テキストの場合の処理 ---
            $isIndented = str_starts_with(strtoupper($line_to_process), '{TAB}'); // 大文字小文字を区別しない
            if ($isIndented) {
                $line_to_process = trim(substr($line_to_process, 5));
            }
            
            $startsWithIcon = false;
            foreach (array_keys($icon_map) as $icon_tag) {
                if (str_starts_with(strtoupper($line_to_process), strtoupper($icon_tag))) { // 大文字小文字を区別しない
                    $startsWithIcon = true;
                    break;
                }
            }
            $isParenthetical = str_starts_with($line_to_process, '(') && str_ends_with($line_to_process, ')');
            
            $escaped_line = htmlspecialchars($line_to_process);
            
            $formatted_line = $escaped_line;
            foreach($icon_map as $tag => $img) {
                 $formatted_line = str_ireplace($tag, $img, $formatted_line); // 大文字小文字を区別せずに置換
            }

            $prefix = '';
            $wrapper_class = '';
            if ($isIndented) {
                $wrapper_class = ' class="indented-text"';
                if (!$startsWithIcon) {
                    $prefix = '▶ ';
                }
            } elseif (!$startsWithIcon && !$isParenthetical) {
                $prefix = '■ ';
            }
            
            $processed_lines[] = '<span' . $wrapper_class . '>' . $prefix . $formatted_line . '</span>';

        } else {
            // --- フレーバーテキストの場合の処理 ---
            $processed_lines[] = htmlspecialchars($trimmed_line);
        }
    }
    
    $final_text = implode('<br>', $processed_lines);
    return $is_ability ? $final_text : nl2br($final_text);
}
// ★★★ ヘルパー関数の定義はここまで ★★★

$card_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($card_id === 0) {
    echo json_encode(['error' => 'Invalid ID']);
    exit;
}
$response = [];

$stmt = $pdo->prepare("SELECT sets_id FROM card_sets WHERE card_id = ? LIMIT 1");
$stmt->execute([$card_id]);
$set_info = $stmt->fetch(PDO::FETCH_ASSOC);

if ($set_info) {
    // === セットカードの処理 ===
    $response['is_set'] = true;
    $stmt = $pdo->prepare("SELECT sets_name FROM sets WHERE sets_id = ?");
    $stmt->execute([$set_info['sets_id']]);
    $response['set_name'] = $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT c.*, cd.* FROM card_sets cs JOIN card c ON cs.card_id = c.card_id JOIN card_detail cd ON c.card_id = cd.card_id WHERE cs.sets_id = ? ORDER BY cs.card_id ASC");
    $stmt->execute([$set_info['sets_id']]);
    $response['cards'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($response['cards'])) {
        $modelnum = $response['cards'][0]['modelnum'] ?? null;
        $series_folder = get_series_folder_from_modelnum($modelnum);
        
        $response['texts'] = process_files_from_folder($modelnum, 'text');
        $response['flavortexts'] = process_files_from_folder($modelnum, 'flavortext');
        
        $image_urls = [];
        if ($modelnum && $series_folder) {
            $folder_path = "card/" . $series_folder . "/" . $modelnum;
            foreach (range('a', 'z') as $char) {
                $file_path = $folder_path . "/" . $modelnum . $char . ".webp";
                if (file_exists($file_path)) { $image_urls[$char] = $file_path; } 
                else { break; }
            }
        }
        $response['image_urls'] = $image_urls;
    }

} else {
    // === 通常カードの処理 ===
    $response['is_set'] = false;
    $stmt = $pdo->prepare("SELECT c.*, cd.* FROM card c JOIN card_detail cd ON c.card_id = cd.card_id WHERE c.card_id = ?");
    $stmt->execute([$card_id]);
    $card_data = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$card_data) {
        echo json_encode(['error' => 'Card not found']);
        exit;
    }
    $response['cards'] = [$card_data];
}

// --- 各カードの共通詳細情報と、通常カードのテキストを処理 ---
foreach ($response['cards'] as &$card) {
    $current_card_id = $card['card_id'];
    $modelnum = $card['modelnum'] ?? null;
    $series_folder = get_series_folder_from_modelnum($modelnum);
    
    // (中略: 種族、文明などの取得ロジックは変更なし)
    $stmt = $pdo->prepare("SELECT t.cardtype_name, c.characteristics_name, cc.characteristics_id FROM card_cardtype cc JOIN cardtype t ON cc.cardtype_id = t.cardtype_id LEFT JOIN characteristics c ON cc.characteristics_id = c.characteristics_id WHERE cc.card_id = ?");
    $stmt->execute([$current_card_id]);
    $type_info = $stmt->fetch(PDO::FETCH_ASSOC);
    $type_parts = [];
    if ($type_info && $type_info['characteristics_id'] != 1 && !empty($type_info['characteristics_name'])) { $type_parts[] = $type_info['characteristics_name']; }
    if ($type_info && !empty($type_info['cardtype_name'])) { $type_parts[] = $type_info['cardtype_name']; }
    $card['card_type'] = !empty($type_parts) ? implode('', $type_parts) : '---';
    $stmt = $pdo->prepare("SELECT c.civilization_name FROM card_civilization cc JOIN civilization c ON cc.civilization_id = c.civilization_id WHERE cc.card_id = ?");
    $stmt->execute([$current_card_id]);
    $card['civilization'] = implode(' / ', $stmt->fetchAll(PDO::FETCH_COLUMN)) ?: '---';
    $stmt = $pdo->prepare("SELECT r.rarity_name FROM card_rarity cr JOIN rarity r ON cr.rarity_id = r.rarity_id WHERE cr.card_id = ? LIMIT 1");
    $stmt->execute([$current_card_id]);
    $card['rarity'] = $stmt->fetchColumn() ?: '---';
    $stmt = $pdo->prepare("SELECT r.race_name FROM card_race cr JOIN race r ON cr.race_id = r.race_id WHERE cr.card_id = ?");
    $stmt->execute([$current_card_id]);
    $card['race'] = implode(' / ', $stmt->fetchAll(PDO::FETCH_COLUMN)) ?: '---';
    $stmt = $pdo->prepare("SELECT i.illus_name FROM card_illus ci JOIN illus i ON ci.illus_id = i.illus_id WHERE ci.card_id = ?");
    $stmt->execute([$current_card_id]);
    $card['illustrator'] = implode(' / ', $stmt->fetchAll(PDO::FETCH_COLUMN)) ?: '---';


    // 通常カードの場合のみ、テキストとフレーバーをここでフォーマット
    if (!$response['is_set']) {
        $text_from_file = null;
        $single_text_file = ($modelnum && $series_folder) ? "text/" . $series_folder . "/" . $modelnum . ".txt" : null;
        if ($single_text_file && file_exists($single_text_file)) {
            $text_from_file = file_get_contents($single_text_file);
        }
        $card['text'] = format_text_for_display($text_from_file ?: ($card['text'] ?? ''), true);

        $flavor_from_file = null;
        $single_flavor_file = ($modelnum && $series_folder) ? "flavortext/" . $series_folder . "/" . $modelnum . ".txt" : null;
        if ($single_flavor_file && file_exists($single_flavor_file)) {
            $flavor_from_file = file_get_contents($single_flavor_file);
        }
        $card['flavortext'] = format_text_for_display($flavor_from_file ?: ($card['flavortext'] ?? ''), false);
    }
}
unset($card);
// ★★★ここからが最後のデバッグコード★★★
$debug_info = [];
$first_card = $response['cards'][0] ?? null;
if ($first_card) {
    $modelnum = $first_card['modelnum'];
    $series_folder = get_series_folder_from_modelnum($modelnum);

    $debug_info['message'] = "--- DEBUGGING FILE PATHS ---";
    $debug_info['modelnum_used'] = $modelnum;
    $debug_info['series_folder_detected'] = $series_folder;
    
    // 通常カードのパス
    $text_path_single = "text/" . $series_folder . "/" . $modelnum . ".txt";
    $flavor_path_single = "flavortext/" . $series_folder . "/" . $modelnum . ".txt";
    $debug_info['path_check_single_text'] = "[PATH] " . $text_path_single . " [EXISTS?] " . (file_exists($text_path_single) ? 'Yes' : 'No');
    $debug_info['path_check_single_flavor'] = "[PATH] " . $flavor_path_single . " [EXISTS?] " . (file_exists($flavor_path_single) ? 'Yes' : 'No');

    // セットカードのパス
    $text_folder_path_set = "text/" . $series_folder . "/" . $modelnum;
    $text_path_set_a = $text_folder_path_set . "/" . $modelnum . "a.txt";
    $debug_info['path_check_set_text_folder'] = "[PATH] " . $text_folder_path_set . " [IS_DIR?] " . (is_dir($text_folder_path_set) ? 'Yes' : 'No');
    $debug_info['path_check_set_text_file_a'] = "[PATH] " . $text_path_set_a . " [EXISTS?] " . (file_exists($text_path_set_a) ? 'Yes' : 'No');
}
// 最終的なレスポンスに、デバッグ情報を追加する
$response['DEBUG_INFO'] = $debug_info;
// ★★★ここまでが最後のデバッグコード★★★

echo json_encode($response);
?>
