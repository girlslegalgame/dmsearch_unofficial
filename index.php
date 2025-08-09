<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * 種族リストを、PHPの機能だけで、特殊文字（ヴ、小文字）と清濁音を完全に考慮してソートする
 * @param array $a 比較する要素1
 * @param array $b 比較する要素2
 * @return int 比較結果
 */
function customRaceSort($a, $b) {
    // 五十音順と清濁音の順を定義した、完全な変換マップ
    static $charMap = null;
    if ($charMap === null) {
        $charMap = [
            'ゔぁ'=>'03c01','ゔぃ'=>'03c02','ゔぇ'=>'03c04','ゔぉ'=>'03c05',
            'ヴァ'=>'03c01','ヴィ'=>'03c02','ヴェ'=>'03c04','ヴォ'=>'03c05',
            'ぁ'=>'01a','あ'=>'01b','ぃ'=>'02a','い'=>'02b','ぅ'=>'03a','う'=>'03b','ぇ'=>'04a','え'=>'04b','ぉ'=>'05a','お'=>'05b',
            'か'=>'06a','が'=>'06b','き'=>'07a','ぎ'=>'07b','く'=>'08a','ぐ'=>'08b','け'=>'09a','げ'=>'09b','こ'=>'10a','ご'=>'10b',
            'さ'=>'11a','ざ'=>'11b','し'=>'12a','じ'=>'12b','す'=>'13a','ず'=>'13b','せ'=>'14a','ぜ'=>'14b','そ'=>'15a','ぞ'=>'15b',
            'た'=>'16a','だ'=>'16b','ち'=>'17a','ぢ'=>'17b','っ'=>'18a','つ'=>'18b','づ'=>'18b','て'=>'19a','で'=>'19b','と'=>'20a','ど'=>'20b',
            'な'=>'21a','に'=>'22a','ぬ'=>'23a','ね'=>'24a','の'=>'25a',
            'は'=>'26a','ば'=>'26b','ぱ'=>'26c','ひ'=>'27a','び'=>'27b','ぴ'=>'27c','ふ'=>'28a','ぶ'=>'28b','ぷ'=>'28c','へ'=>'29a','べ'=>'29b','ぺ'=>'29c','ほ'=>'30a','ぼ'=>'30b','ぽ'=>'30c',
            'ま'=>'31a','み'=>'32a','む'=>'33a','め'=>'34a','も'=>'35a',
            'ゃ'=>'36a','や'=>'36b','ゅ'=>'37a','ゆ'=>'37b','ょ'=>'38a','よ'=>'38b',
            'ら'=>'39a','り'=>'40a','る'=>'41a','れ'=>'42a','ろ'=>'43a',
            'わ'=>'44a','を'=>'45a','ん'=>'46a','ー'=>'47a',
            'ゔ'=>'03c03', 'ヴ'=>'03c03',
            'ァ'=>'01a','ア'=>'01b','ィ'=>'02a','イ'=>'02b','ゥ'=>'03a','ウ'=>'03b','ェ'=>'04a','エ'=>'04b','ォ'=>'05a','オ'=>'05b',
            'カ'=>'06a','ガ'=>'06b','キ'=>'07a','ギ'=>'07b','ク'=>'08a','グ'=>'08b','ケ'=>'09a','ゲ'=>'09b','コ'=>'10a','ゴ'=>'10b',
            'サ'=>'11a','ザ'=>'11b','シ'=>'12a','ジ'=>'12b','ス'=>'13a','ズ'=>'13b','セ'=>'14a','ゼ'=>'14b','ソ'=>'15a','ゾ'=>'15b',
            'タ'=>'16a','ダ'=>'16b','チ'=>'17a','ヂ'=>'17b','ッ'=>'18a','ツ'=>'18b','ヅ'=>'18b','テ'=>'19a','デ'=>'19b','ト'=>'20a','ド'=>'20b',
            'ナ'=>'21a','ニ'=>'22a','ヌ'=>'23a','ネ'=>'24a','ノ'=>'25a',
            'ハ'=>'26a','バ'=>'26b','パ'=>'26c','ヒ'=>'27a','ビ'=>'27b','ピ'=>'27c','フ'=>'28a','ブ'=>'28b','プ'=>'28c','ヘ'=>'29a','ベ'=>'29b','ペ'=>'29c','ホ'=>'30a','ボ'=>'30b','ポ'=>'30c',
            'マ'=>'31a','ミ'=>'32a','ム'=>'33a','メ'=>'34a','モ'=>'35a',
            'ャ'=>'36a','ヤ'=>'36b','ュ'=>'37a','ユ'=>'37b','ョ'=>'38a','ヨ'=>'38b',
            'ラ'=>'39a','リ'=>'40a','ル'=>'41a','レ'=>'42a','ロ'=>'43a',
            'ワ'=>'44a','ヲ'=>'45a','ン'=>'46a',
        ];
    }
    
    $readingA_sortable = strtr($a['reading'], $charMap);
    $readingB_sortable = strtr($b['reading'], $charMap);

    return strcmp($readingA_sortable, $readingB_sortable);
}

// === 初期設定 ===
$pdo = new PDO('mysql:host=localhost;dbname=mysql;charset=utf8', 'dmuser', 'dmpass');
$perPage = 50;
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$offset = ($page - 1) * $perPage;


// === フォームからの入力値の受け取り ===
$search = isset($_GET['search']) ? $_GET['search'] : '';
$is_submitted = array_key_exists('search', $_GET);

// --- 各種検索条件の取得 ---
$cost_min = isset($_GET['cost_min']) ? $_GET['cost_min'] : '';
$cost_max = isset($_GET['cost_max']) ? $_GET['cost_max'] : '';
$cost_zero = isset($_GET['cost_zero']);
$cost_infinity = isset($_GET['cost_infinity']);
$pow_min = isset($_GET['pow_min']) ? $_GET['pow_min'] : '';
$pow_max = isset($_GET['pow_max']) ? $_GET['pow_max'] : '';
$pow_infinity = isset($_GET['pow_infinity']);
$year_min = isset($_GET['year_min']) ? $_GET['year_min'] : '';
$year_max = isset($_GET['year_max']) ? $_GET['year_max'] : '';
$selected_char_id = isset($_GET['characteristics_id']) ? intval($_GET['characteristics_id']) : 0;
$selected_cardtype_id = isset($_GET['cardtype_id']) ? intval($_GET['cardtype_id']) : 0; 
$selected_race_id = isset($_GET['race_id']) ? intval($_GET['race_id']) : 0;
$selected_rarity_id = isset($_GET['rarity_id']) ? intval($_GET['rarity_id']) : 0;
$selected_ability_id = isset($_GET['ability_id']) ? intval($_GET['ability_id']) : 0;
$selected_twinpact = isset($_GET['twinpact_filter']) ? $_GET['twinpact_filter'] : '0';
$selected_treasure_id = isset($_GET['treasure_id_filter']) ? $_GET['treasure_id_filter'] : '0';
$selected_regulation = isset($_GET['regulation_filter']) ? $_GET['regulation_filter'] : '0';
$selected_secret = isset($_GET['secret_filter']) ? $_GET['secret_filter'] : '0';
$selected_soul_id = isset($_GET['soul_id_filter']) ? intval($_GET['soul_id_filter']) : 0;
$selected_frame_id = isset($_GET['frame_id_filter']) ? intval($_GET['frame_id_filter']) : 0;
$selected_goods_id = isset($_GET['goods_id_filter']) ? intval($_GET['goods_id_filter']) : 0;
$selected_goodstype_id = isset($_GET['goodstype_id_filter']) ? intval($_GET['goodstype_id_filter']) : 0;
$selected_illus_id = isset($_GET['illus_id_filter']) ? intval($_GET['illus_id_filter']) : 0;
$selected_mana = isset($_GET['mana_filter']) ? $_GET['mana_filter'] : 'all';

// 並び替え順の値を受け取る
$selected_sort = isset($_GET['sort_order']) ? $_GET['sort_order'] : 'release_new';

// --- チェックボックスの状態管理 ---
if ($is_submitted) {
    $search_name = isset($_GET['search_name']);
    $search_reading = isset($_GET['search_reading']);
    $search_text = isset($_GET['search_text']);
    $search_race = isset($_GET['search_race']);
    $search_flavortext = isset($_GET['search_flavortext']);
    $search_illus = isset($_GET['search_illus']);
} else {
    $search_name = true; $search_reading = true; $search_text = true;
    $search_race = false; $search_flavortext = false; $search_illus = false;
}

// --- 折りたたみ状態の管理 ---
$is_advanced_open = false; 
if (!empty($_GET['advanced_open']) && $_GET['advanced_open'] == '1') {
    $is_advanced_open = true;
}

// --- 文明ボタンの状態管理 ---
$mono_color_status = 1; $multi_color_status = 1;
$selected_main_civs = []; $selected_exclude_civs = [];
if ($is_submitted) {
    $mono_color_status = isset($_GET['mono_color']) ? intval($_GET['mono_color']) : 0;
    $multi_color_status = isset($_GET['multi_color']) ? intval($_GET['multi_color']) : 0;
    if (!empty($_GET['main_civs'])) { $selected_main_civs = array_values(array_filter($_GET['main_civs'], fn($v) => $v != 0)); }
    if (!empty($_GET['exclude_civs'])) { $selected_exclude_civs = array_values(array_filter($_GET['exclude_civs'], fn($v) => $v != 0)); }
}


// === SQLクエリの組み立て ===
$conditions = [];
$params = [];
$joins = [];

// --- Part 1: キーワード検索 ---
if ($search !== '') {
    $keyword_conditions = [];
    if ($search_name) { $keyword_conditions[] = 'card.card_name LIKE :search_keyword'; }
    if ($search_reading) { $keyword_conditions[] = 'card.reading LIKE :search_keyword'; }
    if ($search_text) { $keyword_conditions[] = 'card.text LIKE :search_keyword'; }
    if ($search_flavortext) { $keyword_conditions[] = 'card.flavortext LIKE :search_keyword'; }
    if ($search_race) {
        $joins['card_race'] = 'LEFT JOIN card_race ON card.card_id = card_race.card_id';
        $joins['race'] = 'LEFT JOIN race ON card_race.race_id = race.race_id';
        $keyword_conditions[] = 'race.race_name LIKE :search_keyword';
    }
    if ($search_illus) {
        $joins['card_illus_search'] = 'LEFT JOIN card_illus ON card.card_id = card_illus.card_id';
        $joins['illus_search'] = 'LEFT JOIN illus ON card_illus.illus_id = illus.illus_id';
        $keyword_conditions[] = 'illus.illus_name LIKE :search_keyword';
    }
    if (!empty($keyword_conditions)) {
        $conditions[] = '(' . implode(' OR ', $keyword_conditions) . ')';
        $params[':search_keyword'] = '%' . $search . '%';
    }
}

// --- Part 2: 数値範囲などの検索 ---
if ($cost_infinity) {
    $conditions[] = 'card.cost = 2147483647';
} elseif ($cost_zero) {
    $conditions[] = 'card.cost IS NULL';
} else {
    if ($cost_min !== '' && is_numeric($cost_min)) {
        $conditions[] = 'card.cost >= :cost_min';
        $params[':cost_min'] = intval($cost_min);
    }
    if ($cost_max !== '' && is_numeric($cost_max)) {
        $conditions[] = 'card.cost <= :cost_max';
        $params[':cost_max'] = intval($cost_max);
    }
}
if ($pow_infinity) {
    $conditions[] = 'card.pow = 2147483647';
} else {
    if ($pow_min !== '' && is_numeric($pow_min)) {
        $conditions[] = 'card.pow >= :pow_min';
        $params[':pow_min'] = intval($pow_min);
    }
    if ($pow_max !== '' && is_numeric($pow_max)) {
        $conditions[] = 'card.pow <= :pow_max';
        $params[':pow_max'] = intval($pow_max);
    }
}
if ($year_min !== '' && is_numeric($year_min)) {
    $conditions[] = "cd.release_date >= :date_min";
    $params[':date_min'] = $year_min . '-01-01';
}
if ($year_max !== '' && is_numeric($year_max)) {
    $conditions[] = "cd.release_date <= :date_max";
    $params[':date_max'] = $year_max . '-12-31';
}

// --- Part 3: JOINを使った各種IDによる絞り込み ---
if ($selected_char_id > 0) {
    $joins['card_cardtype_char'] = 'LEFT JOIN card_cardtype ON card.card_id = card_cardtype.card_id';
    $conditions[] = "card_cardtype.characteristics_id = :characteristics_id";
    $params[':characteristics_id'] = $selected_char_id;
}
if ($selected_cardtype_id > 0) {
    $joins['card_cardtype_type'] = 'LEFT JOIN card_cardtype ON card.card_id = card_cardtype.card_id';
    $conditions[] = "card_cardtype.cardtype_id = :cardtype_id";
    $params[':cardtype_id'] = $selected_cardtype_id;
}
if ($selected_race_id > 0) {
    $joins['card_race_race'] = 'LEFT JOIN card_race ON card.card_id = card_race.card_id';
    $conditions[] = "card_race.race_id = :race_id";
    $params[':race_id'] = $selected_race_id;
}
if ($selected_rarity_id > 0) {
    $joins['card_rarity_rarity'] = 'LEFT JOIN card_rarity ON card.card_id = card_rarity.card_id';
    $conditions[] = "card_rarity.rarity_id = :rarity_id";
    $params[':rarity_id'] = $selected_rarity_id;
}
if ($selected_soul_id != 0) {
    $joins['card_race_soul'] = 'LEFT JOIN card_race ON card.card_id = card_race.card_id';
    if ($selected_soul_id == -1) {
        $conditions[] = "card_race
