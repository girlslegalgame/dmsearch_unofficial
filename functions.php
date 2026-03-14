<?php
/**
 * デュエル・マスターズ非公式カード検索サイト 共通関数集
 */

// --- 定数定義 ---
if (!defined('DM_INFINITY')) {
    define('DM_INFINITY', 2147483647);
}

/**
 * モデル番号からシリーズフォルダ名を取得 (例: dm36-s01 -> dm36)
 */
function get_series_folder($modelnum) {
    if (!$modelnum || strpos($modelnum, '-') === false) return 'unknown';
    $parts = explode('-', $modelnum);
    return strtolower($parts[0]);
}

/**
 * カードの画像URLを決定する
 * 
 * @param string $modelnum モデル番号 (例: dm01-1)
 * @param string $part ツインパクト等の枝番 (例: a, b)
 * @return string 画像パス
 */
function get_card_image_url($modelnum, $part = '') {
    if (!$modelnum) return 'parts/no_image.webp';

    $series_folder = get_series_folder($modelnum);
    $base_path = "card/{$series_folder}/{$modelnum}";
    
    // 枝番（a, bなど）が指定されている場合（モーダル表示時など）
    if ($part !== '') {
        $path_with_part = "{$base_path}/{$modelnum}{$part}.webp";
        return file_exists($path_with_part) ? $path_with_part : "parts/no_image.webp";
    }

    // 検索一覧表示用のデフォルト判定
    $single_file = "{$base_path}.webp";
    $folder_path = $base_path; // フォルダそのもの

    // ファイルとして存在し、かつディレクトリでないなら単一画像
    if (file_exists($single_file) && !is_dir($folder_path)) {
        return $single_file;
    } 
    
    // フォルダ形式（ツインパクト等）の場合は、とりあえず 'a' を返す
    $multi_file_a = "{$base_path}/{$modelnum}a.webp";
    if (file_exists($multi_file_a)) {
        return $multi_file_a;
    }

    return "parts/no_image.webp";
}

/**
 * 特殊能力・フレーバーテキストの整形（アイコン置換・インデント・箇条書き）
 * 
 * @param string $raw_text 生テキスト
 * @param bool $is_ability 特殊能力ならtrue、フレーバーならfalse
 * @return string HTML整形済みテキスト
 */
function format_card_text($raw_text, $is_ability = true) {
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
        '{T3}' => '<img src="parts/card_list_thrillingthree.webp" alt="Thrilling-Three" class="text-icon">',
        '{OD}' => '<img src="parts/card_list_overdrive.webp" alt="Over-Drive" class="text-icon">',
        '{SF}' => '<img src="parts/card_list_shieldforce.webp" alt="Shield-Force" class="text-icon">',
        '{KM}' => '<img src="parts/card_list_knightmagic.webp" alt="Knight-Magic" class="text-icon">',
        '{BB}' => '<img src="parts/card_list_breakbonus.webp" alt="Break-Bonus" class="text-icon">',
        '{HF}' => '<img src="parts/card_list_holyfield.webp" alt="Holy-Field" class="text-icon">',
        '{SR}' => '<img src="parts/card_list_soulrecall.webp" alt="Soul-Recall" class="text-icon">',
        '{MT}' => '<img src="parts/card_list_marshalltouch.webp" alt="Marshall-Touch" class="text-icon">',
        '{HSO}' => '<img src="parts/card_list_holysoul.webp" alt="Holy-Soul" class="text-icon">',
        '{MSO}' => '<img src="parts/card_list_magicsoul.webp" alt="Magic-Soul" class="text-icon">',
        '{ESO}' => '<img src="parts/card_list_evilsoul.webp" alt="Evil-Soul" class="text-icon">',
        '{KSO}' => '<img src="parts/card_list_kungfusoul.webp" alt="Kung-Fu-Soul" class="text-icon">',
        '{WSO}' => '<img src="parts/card_list_wildsoul.webp" alt="Wild-Soul" class="text-icon">',
        '{BSO}' => '<img src="parts/card_list_bloodysoul.webp" alt="Bloody-Soul" class="text-icon">',
        '{NC}' => '<img src="parts/card_list_nochoice.webp" alt="No-Choice" class="text-icon">',
        '{SD}' => '<img src="parts/card_list_solemnduty.webp" alt="Solemn-Duty" class="text-icon">',
    ];

    $lines = explode("\n", $raw_text);
    $processed_lines = [];

    foreach ($lines as $line) {
        $trimmed_line = trim($line);
        if (empty($trimmed_line)) continue;
        
        if ($is_ability) {
            $prefix = '';
            $wrapper_class = '';
            $line_content = $trimmed_line;

            if (str_starts_with(strtoupper($line_content), '{TAB}')) {
                $wrapper_class = ' class="indented-text"';
                $line_content = trim(substr($line_content, 5));
                $has_icon = false;
                foreach (array_keys($icon_map) as $icon_tag) {
                    if (str_starts_with(strtoupper($line_content), strtoupper($icon_tag))) {
                        $has_icon = true;
                        break;
                    }
                }
                if (!$has_icon) $prefix = '▶';
            } else {
                $startsWithIcon = false;
                foreach (array_keys($icon_map) as $icon_tag) {
                    if (str_starts_with(strtoupper($line_content), strtoupper($icon_tag))) {
                        $startsWithIcon = true;
                        break;
                    }
                }
                $isParenthetical = str_starts_with($line_content, '(') && str_ends_with($line_content, ')');
                if (!$startsWithIcon && !$isParenthetical) $prefix = '■';
            }

            $escaped_line = htmlspecialchars($line_content);
            $formatted_line = str_ireplace(array_keys($icon_map), array_values($icon_map), $escaped_line);
            $processed_lines[] = "<span{$wrapper_class}>{$prefix}{$formatted_line}</span>";
        } else {
            $processed_lines[] = htmlspecialchars($trimmed_line);
        }
    }
    
    $final_text = implode('<br>', $processed_lines);
    return $is_ability ? $final_text : nl2br($final_text);
}

/**
 * 日本語（読み）をソート可能な文字列に変換する
 */
function get_sortable_reading($str) {
    static $charMap = [
        'ゔぁ'=>'03c01','ゔぃ'=>'03c02','ゔぇ'=>'03c04','ゔぉ'=>'03c05','ヴァ'=>'03c01','ヴィ'=>'03c02','ヴェ'=>'03c04','ヴォ'=>'03c05','ぁ'=>'01a','あ'=>'01b','ぃ'=>'02a','い'=>'02b','ぅ'=>'03a','う'=>'03b','ぇ'=>'04a','え'=>'04b','ぉ'=>'05a','お'=>'05b','か'=>'06a','が'=>'06b','き'=>'07a','ぎ'=>'07b','く'=>'08a','ぐ'=>'08b','け'=>'09a','げ'=>'09b','こ'=>'10a','ご'=>'10b','さ'=>'11a','ざ'=>'11b','し'=>'12a','じ'=>'12b','す'=>'13a','ず'=>'13b','せ'=>'14a','ぜ'=>'14b','そ'=>'15a','ぞ'=>'15b','た'=>'16a','だ'=>'16b','ち'=>'17a','ぢ'=>'17b','っ'=>'18a','つ'=>'18b','づ'=>'18b','て'=>'19a','で'=>'19b','と'=>'20a','ど'=>'20b','な'=>'21a','に'=>'22a','ぬ'=>'23a','ね'=>'24a','の'=>'25a','は'=>'26a','ば'=>'26b','ぱ'=>'26c','ひ'=>'27a','び'=>'27b','ぴ'=>'27c','ふ'=>'28a','ぶ'=>'28b','ぷ'=>'28c','へ'=>'29a','べ'=>'29b','ぺ'=>'29c','ほ'=>'30a','ぼ'=>'30b','ぽ'=>'30c','ま'=>'31a','み'=>'32a','む'=>'33a','め'=>'34a','も'=>'35a','ゃ'=>'36a','や'=>'36b','ゅ'=>'37a','ゆ'=>'37b','ょ'=>'38a','よ'=>'38b','ら'=>'39a','り'=>'40a','る'=>'41a','れ'=>'42a','ろ'=>'43a','わ'=>'44a','を'=>'45a','ん'=>'46a','ー'=>'47a','ゔ'=>'03c03', 'ヴ'=>'03c03','ァ'=>'01a','ア'=>'01b','ィ'=>'02a','イ'=>'02b','ゥ'=>'03a','ウ'=>'03b','ェ'=>'04a','エ'=>'04b','ォ'=>'05a','オ'=>'05b','カ'=>'06a','ガ'=>'06b','キ'=>'07a','ギ'=>'07b','ク'=>'08a','グ'=>'08b','ケ'=>'09a','ゲ'=>'09b','コ'=>'10a','ゴ'=>'10b','サ'=>'11a','ザ'=>'11b','シ'=>'12a','ジ'=>'12b','ス'=>'13a','ズ'=>'13b','セ'=>'14a','ゼ'=>'14b','ソ'=>'15a','ゾ'=>'15b','タ'=>'16a','ダ'=>'16b','チ'=>'17a','ヂ'=>'17b','ッ'=>'18a','ツ'=>'18b','ヅ'=>'18b','テ'=>'19a','デ'=>'19b','ト'=>'20a','ド'=>'20b','な'=>'21a','に'=>'22a','ぬ'=>'23a','ね'=>'24a','ノ'=>'25a','ハ'=>'26a','バ'=>'26b','パ'=>'26c','ヒ'=>'27a','ビ'=>'27b','ピ'=>'27c','フ'=>'28a','ブ'=>'28b','プ'=>'28c','ヘ'=>'29a','ベ'=>'29b','ペ'=>'29c','ホ'=>'30a','ボ'=>'30b','ポ'=>'30c','マ'=>'31a','ミ'=>'32a','ム'=>'33a','メ'=>'34a','モ'=>'35a','ャ'=>'36a','ヤ'=>'36b','ュ'=>'37a','ユ'=>'37b','ョ'=>'38a','ヨ'=>'38b','ら'=>'39a','り'=>'40a','る'=>'41a','れ'=>'42a','ロ'=>'43a','ワ'=>'44a','ヲ'=>'45a','ん'=>'46a',
    ];
    return strtr($str, $charMap);
}

/**
 * 読みによるカスタムソート関数
 */
function compare_by_reading($a, $b) {
    $readingA = get_sortable_reading($a['reading'] ?? '');
    $readingB = get_sortable_reading($b['reading'] ?? '');
    return strcmp($readingA, $readingB);
}
