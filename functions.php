<?php
// --- 定数 ---
if (!defined('DM_INFINITY')) define('DM_INFINITY', 2147483647);

/** シリーズフォルダ取得 */
function get_series_folder($modelnum) {
    if (!$modelnum || strpos($modelnum, '-') === false) return 'unknown';
    return strtolower(explode('-', $modelnum)[0]);
}

/** 画像URL取得 */
function get_card_image_url($modelnum, $part = '') {
    if (!$modelnum) return 'parts/no_image.webp';
    $series = get_series_folder($modelnum);
    $base = "card/{$series}/{$modelnum}";
    if ($part !== '') {
        $path = "{$base}/{$modelnum}{$part}.webp";
        return file_exists($path) ? $path : "parts/no_image.webp";
    }
    $single = "{$base}.webp";
    if (file_exists($single) && !is_dir($base)) return $single;
    $multi_a = "{$base}/{$modelnum}a.webp";
    return file_exists($multi_a) ? $multi_a : "parts/no_image.webp";
}

/** テキスト整形 */
function format_card_text($raw, $is_ability = true) {
    if (!$raw || trim($raw) === '') return $is_ability ? '（テキスト情報なし）' : null;
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
        '{VIC}' => '<img src="parts/card_list_victory.webp" alt="Victory" class="text-icon">',
        '{SC}' => '<img src="parts/card_list_spacecharge.webp" alt="Space-Charge" class="text-icon">',
    ];
    $lines = explode("\n", $raw);
    $res = [];
    foreach ($lines as $line) {
        $t = trim($line); if (!$t) continue;
        if ($is_ability) {
            $prefix = ''; $class = '';
            if (str_starts_with(strtoupper($t), '{TAB}')) {
                $class = ' class="indented-text"'; $t = trim(substr($t, 5));
                $has_ico = false;
                foreach (array_keys($icon_map) as $tag) { if (str_starts_with(strtoupper($t), strtoupper($tag))) { $has_ico = true; break; } }
                if (!$has_ico) $prefix = '▶';
            } else {
                $has_ico = false;
                foreach (array_keys($icon_map) as $tag) { if (str_starts_with(strtoupper($t), strtoupper($tag))) { $has_ico = true; break; } }
                if (!$has_ico && !(str_starts_with($t, '(') && str_ends_with($t, ')'))) $prefix = '■';
            }
            $f = str_ireplace(array_keys($icon_map), array_values($icon_map), htmlspecialchars($t));
            $res[] = "<span{$class}>{$prefix}{$f}</span>";
        } else { $res[] = htmlspecialchars($t); }
    }
    return $is_ability ? implode('<br>', $res) : nl2br(implode('<br>', $res));
}

/** 日本語ソート用変換 */
function get_sortable_reading($str) {
    static $map = ['ぁ'=>'01a','あ'=>'01b','ぃ'=>'02a','い'=>'02b','ぅ'=>'03a','う'=>'03b','ぇ'=>'04a','え'=>'04b','ぉ'=>'05a','お'=>'05b','か'=>'06a','が'=>'06b','き'=>'07a','ぎ'=>'07b','く'=>'08a','ぐ'=>'08b','け'=>'09a','げ'=>'09b','こ'=>'10a','ご'=>'10b','さ'=>'11a','ざ'=>'11b','し'=>'12a','じ'=>'12b','す'=>'13a','ず'=>'13b','せ'=>'14a','ぜ'=>'14b','そ'=>'15a','ぞ'=>'15b','た'=>'16a','だ'=>'16b','ち'=>'17a','ぢ'=>'17b','っ'=>'18a','つ'=>'18b','づ'=>'18b','て'=>'19a','で'=>'19b','と'=>'20a','ど'=>'20b','な'=>'21a','に'=>'22a','ぬ'=>'23a','ね'=>'24a','の'=>'25a','は'=>'26a','ば'=>'26b','ぱ'=>'26c','ひ'=>'27a','び'=>'27b','ぴ'=>'27c','ふ'=>'28a','ぶ'=>'28b','ぷ'=>'28c','へ'=>'29a','べ'=>'29b','ぺ'=>'29c','ほ'=>'30a','ぼ'=>'30b','ぽ'=>'30c','ま'=>'31a','み'=>'32a','む'=>'33a','め'=>'34a','も'=>'35a','ゃ'=>'36a','や'=>'36b','ゅ'=>'37a','ゆ'=>'37b','ょ'=>'38a','よ'=>'38b','ら'=>'39a','り'=>'40a','る'=>'41a','れ'=>'42a','ろ'=>'43a','わ'=>'44a','を'=>'45a','ん'=>'46a','ー'=>'47a','ゔ'=>'03c03', 'ヴ'=>'03c03','ァ'=>'01a','ア'=>'01b','ィ'=>'02a','イ'=>'02b','ゥ'=>'03a','ウ'=>'03b','ェ'=>'04a','え'=>'04b','ォ'=>'05a','オ'=>'05b','カ'=>'06a','ガ'=>'06b','キ'=>'07a','ギ'=>'07b','ク'=>'08a','グ'=>'08b','け'=>'09a','げ'=>'09b','こ'=>'10a','ご'=>'10b','さ'=>'11a','ざ'=>'11b','し'=>'12a','じ'=>'12b','す'=>'13a','ず'=>'13b','せ'=>'14a','ぜ'=>'14b','そ'=>'15a','ぞ'=>'15b','た'=>'16a','だ'=>'16b','ち'=>'17a','ヂ'=>'17b','ッ'=>'18a','ツ'=>'18b','ヅ'=>'18b','て'=>'19a','で'=>'19b','と'=>'20a','ど'=>'20b','な'=>'21a','に'=>'22a','ぬ'=>'23a','ね'=>'24a','ノ'=>'25a','ハ'=>'26a','バ'=>'26b','パ'=>'26c','ヒ'=>'27a','ビ'=>'27b','ピ'=>'27c','フ'=>'28a','ブ'=>'28b','ぷ'=>'28c','へ'=>'29a','べ'=>'29b','ぺ'=>'29c','ホ'=>'30a','ボ'=>'30b','ぽ'=>'30c','マ'=>'31a','み'=>'32a','む'=>'33a','め'=>'34a','も'=>'35a','ャ'=>'36a','ヤ'=>'36b','ュ'=>'37a','ユ'=>'37b','ョ'=>'38a','ヨ'=>'38b','ら'=>'39a','り'=>'40a','る'=>'41a','れ'=>'42a','ろ'=>'43a','わ'=>'44a','を'=>'45a','ん'=>'46a'];
    return strtr($str, $map);
}

/** 読みによる比較関数 */
function compare_by_reading($a, $b) {
    return strcmp(get_sortable_reading($a['reading'] ?? ''), get_sortable_reading($b['reading'] ?? ''));
}

/** 文明優先度 (6 → 1〜5 → 多色) */
function get_civ_priority($card) {
    $civ_count = $card['civ_count'] ?? 1;
    $min_id = $card['min_civ_id'] ?? 99;
    if ($civ_count > 1) return 7;
    if ($min_id == 6) return 0;
    return $min_id;
}
