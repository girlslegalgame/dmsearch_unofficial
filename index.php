<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

try {
    // Railwayの本番環境かどうかを判断
    if (getenv('RAILWAY_ENVIRONMENT')) {
        // 【本番環境】Railwayが提供する環境変数を読み込む
        $db_host = getenv('MYSQLHOST');
        $db_port = getenv('MYSQLPORT');
        $db_name = getenv('MYSQLDATABASE');
        $db_user = getenv('MYSQLUSER');
        $db_pass = getenv('MYSQLPASSWORD');
    } else {
        // 【ローカル環境】XAMPP用の設定
        $db_host = '127.0.0.1';
        $db_port = 3306;
        $db_name = 'dmsearch'; // あなたのローカルのDB名
        $db_user = 'root';
        $db_pass = '';
    }

    // 接続設定を組み立てる（dbnameを確実に含める）
    $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    // データベースに接続！
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);

} catch (PDOException $e) {
    // 接続に失敗したら、具体的なエラーを出して、ここで処理を完全に止める
    die("DATABASE CONNECTION FAILED: " . $e->getMessage());
}

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
            'ゔぁ'=>'03c01','ゔぃ'=>'03c02','ゔぇ'=>'03c04','ゔぉ'=>'03c05','ヴァ'=>'03c01','ヴィ'=>'03c02','ヴェ'=>'03c04','ヴォ'=>'03c05','ぁ'=>'01a','あ'=>'01b','ぃ'=>'02a','い'=>'02b','ぅ'=>'03a','う'=>'03b','ぇ'=>'04a','え'=>'04b','ぉ'=>'05a','お'=>'05b','か'=>'06a','が'=>'06b','き'=>'07a','ぎ'=>'07b','く'=>'08a','ぐ'=>'08b','け'=>'09a','げ'=>'09b','こ'=>'10a','ご'=>'10b','さ'=>'11a','ざ'=>'11b','し'=>'12a','じ'=>'12b','す'=>'13a','ず'=>'13b','せ'=>'14a','ぜ'=>'14b','そ'=>'15a','ぞ'=>'15b','た'=>'16a','だ'=>'16b','ち'=>'17a','ぢ'=>'17b','っ'=>'18a','つ'=>'18b','づ'=>'18b','て'=>'19a','で'=>'19b','と'=>'20a','ど'=>'20b','な'=>'21a','に'=>'22a','ぬ'=>'23a','ね'=>'24a','の'=>'25a','は'=>'26a','ば'=>'26b','ぱ'=>'26c','ひ'=>'27a','び'=>'27b','ぴ'=>'27c','ふ'=>'28a','ぶ'=>'28b','ぷ'=>'28c','へ'=>'29a','べ'=>'29b','ぺ'=>'29c','ほ'=>'30a','ぼ'=>'30b','ぽ'=>'30c','ま'=>'31a','み'=>'32a','む'=>'33a','め'=>'34a','も'=>'35a','ゃ'=>'36a','や'=>'36b','ゅ'=>'37a','ゆ'=>'37b','ょ'=>'38a','よ'=>'38b','ら'=>'39a','り'=>'40a','る'=>'41a','れ'=>'42a','ろ'=>'43a','わ'=>'44a','を'=>'45a','ん'=>'46a','ー'=>'47a','ゔ'=>'03c03', 'ヴ'=>'03c03','ァ'=>'01a','ア'=>'01b','ィ'=>'02a','イ'=>'02b','ゥ'=>'03a','ウ'=>'03b','ェ'=>'04a','エ'=>'04b','ォ'=>'05a','オ'=>'05b','カ'=>'06a','ガ'=>'06b','キ'=>'07a','ギ'=>'07b','ク'=>'08a','グ'=>'08b','ケ'=>'09a','ゲ'=>'09b','コ'=>'10a','ゴ'=>'10b','サ'=>'11a','ザ'=>'11b','シ'=>'12a','ジ'=>'12b','ス'=>'13a','ズ'=>'13b','セ'=>'14a','ゼ'=>'14b','ソ'=>'15a','ゾ'=>'15b','タ'=>'16a','ダ'=>'16b','チ'=>'17a','ヂ'=>'17b','ッ'=>'18a','ツ'=>'18b','ヅ'=>'18b','テ'=>'19a','デ'=>'19b','ト'=>'20a','ド'=>'20b','ナ'=>'21a','ニ'=>'22a','ヌ'=>'23a','ネ'=>'24a','ノ'=>'25a','ハ'=>'26a','バ'=>'26b','パ'=>'26c','ヒ'=>'27a','ビ'=>'27b','ピ'=>'27c','フ'=>'28a','ブ'=>'28b','プ'=>'28c','ヘ'=>'29a','ベ'=>'29b','ペ'=>'29c','ホ'=>'30a','ボ'=>'30b','ポ'=>'30c','マ'=>'31a','ミ'=>'32a','ム'=>'33a','メ'=>'34a','モ'=>'35a','ャ'=>'36a','ヤ'=>'36b','ュ'=>'37a','ユ'=>'37b','ョ'=>'38a','ヨ'=>'38b','ラ'=>'39a','リ'=>'40a','ル'=>'41a','レ'=>'42a','ロ'=>'43a','ワ'=>'44a','ヲ'=>'45a','ン'=>'46a',
        ];
    }
    $readingA_sortable = strtr($a['reading'], $charMap);
    $readingB_sortable = strtr($b['reading'], $charMap);
    return strcmp($readingA_sortable, $readingB_sortable);
}

// === 初期設定 ===
$perPage = 50;
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$offset = ($page - 1) * $perPage;

// === フォームからの入力値の受け取り ===
$search = isset($_GET['search']) ? $_GET['search'] : '';
$is_submitted = array_key_exists('search', $_GET) || count(array_filter(array_keys($_GET), fn($k) => $k !== 'page')) > 0;
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
$selected_sort = isset($_GET['sort_order']) ? $_GET['sort_order'] : 'release_new';
$show_same_name = isset($_GET['show_same_name']) || !$is_submitted;

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
$is_advanced_open = !empty($_GET['advanced_open']) && $_GET['advanced_open'] == '1';
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

if ($search !== '') {
    $keyword_conditions = [];
    if ($search_name) { $keyword_conditions[] = 'card.card_name LIKE :search_keyword_name'; $params[':search_keyword_name'] = '%' . $search . '%'; }
    if ($search_reading) { $keyword_conditions[] = 'card.reading LIKE :search_keyword_reading'; $params[':search_keyword_reading'] = '%' . $search . '%'; }
    if ($search_text) { $keyword_conditions[] = 'card.text LIKE :search_keyword_text'; $params[':search_keyword_text'] = '%' . $search . '%'; }
    if ($search_flavortext) { $keyword_conditions[] = 'card.flavortext LIKE :search_keyword_flavor'; $params[':search_keyword_flavor'] = '%' . $search . '%'; }
    if ($search_race) {
        $joins['card_race'] = 'LEFT JOIN card_race ON card.card_id = card_race.card_id';
        $joins['race'] = 'LEFT JOIN race ON card_race.race_id = race.race_id';
        $keyword_conditions[] = 'race.race_name LIKE :search_keyword_race';
        $params[':search_keyword_race'] = '%' . $search . '%';
    }
    if ($search_illus) {
        $joins['card_illus_search'] = 'LEFT JOIN card_illus ON card.card_id = card_illus.card_id';
        $joins['illus_search'] = 'LEFT JOIN illus ON card_illus.illus_id = illus.illus_id';
        $keyword_conditions[] = 'illus.illus_name LIKE :search_keyword_illus';
        $params[':search_keyword_illus'] = '%' . $search . '%';
    }
    if (!empty($keyword_conditions)) { $conditions[] = '(' . implode(' OR ', $keyword_conditions) . ')'; }
}
if ($cost_infinity) { $conditions[] = 'card.cost = 2147483647';
} elseif ($cost_zero) { $conditions[] = 'card.cost IS NULL';
} else {
    if ($cost_min !== '' && is_numeric($cost_min)) { $conditions[] = 'card.cost >= :cost_min'; $params[':cost_min'] = intval($cost_min); }
    if ($cost_max !== '' && is_numeric($cost_max)) { $conditions[] = 'card.cost <= :cost_max'; $params[':cost_max'] = intval($cost_max); }
}
if ($pow_infinity) { $conditions[] = 'card.pow = 2147483647';
} else {
    if ($pow_min !== '' && is_numeric($pow_min)) { $conditions[] = 'card.pow >= :pow_min'; $params[':pow_min'] = intval($pow_min); }
    if ($pow_max !== '' && is_numeric($pow_max)) { $conditions[] = 'card.pow <= :pow_max'; $params[':pow_max'] = intval($pow_max); }
}
if ($year_min !== '' && is_numeric($year_min)) { $conditions[] = "cd.release_date >= :date_min"; $params[':date_min'] = $year_min . '-01-01'; }
if ($year_max !== '' && is_numeric($year_max)) { $conditions[] = "cd.release_date <= :date_max"; $params[':date_max'] = $year_max . '-12-31'; }
if ($selected_char_id > 0) { $joins['card_cardtype_char'] = 'LEFT JOIN card_cardtype ON card.card_id = card_cardtype.card_id'; $conditions[] = "card_cardtype.characteristics_id = :characteristics_id"; $params[':characteristics_id'] = $selected_char_id; }
if ($selected_cardtype_id > 0) { $joins['card_cardtype_type'] = 'LEFT JOIN card_cardtype ON card.card_id = card_cardtype.card_id'; $conditions[] = "card_cardtype.cardtype_id = :cardtype_id"; $params[':cardtype_id'] = $selected_cardtype_id; }
if ($selected_race_id > 0) { $joins['card_race_race'] = 'LEFT JOIN card_race ON card.card_id = card_race.card_id'; $conditions[] = "card_race.race_id = :race_id"; $params[':race_id'] = $selected_race_id; }
if ($selected_rarity_id > 0) { $joins['card_rarity_rarity'] = 'LEFT JOIN card_rarity ON card.card_id = card_rarity.card_id'; $conditions[] = "card_rarity.rarity_id = :rarity_id"; $params[':rarity_id'] = $selected_rarity_id; }
if ($selected_soul_id != 0) {
    $joins['card_race_soul'] = 'LEFT JOIN card_race ON card.card_id = card_race.card_id';
    if ($selected_soul_id == -1) { $conditions[] = "card_race.soul_id IS NULL"; } else { $conditions[] = "card_race.soul_id = :soul_id"; $params[':soul_id'] = $selected_soul_id; }
}
if ($selected_frame_id > 0) { $conditions[] = "cd.frame_id = :frame_id"; $params[':frame_id'] = $selected_frame_id; }
if ($selected_ability_id != 0) {
    if ($selected_ability_id == -1) { $conditions[] = "(card.text IS NULL OR card.text = '')"; } else { $joins['card_ability_ability'] = 'LEFT JOIN card_ability ON card.card_id = card_ability.card_id'; $conditions[] = "card_ability.ability_id = :ability_id"; $params[':ability_id'] = $selected_ability_id; }
}
if ($selected_illus_id > 0) { $joins['card_illus_illus'] = 'LEFT JOIN card_illus ON card.card_id = card_illus.card_id'; $conditions[] = "card_illus.illus_id = :illus_id"; $params[':illus_id'] = $selected_illus_id; }
if ($selected_twinpact !== '0') { $conditions[] = "cd.twinpact = :twinpact"; $params[':twinpact'] = ($selected_twinpact === '1') ? 1 : 0; }
if ($selected_treasure_id != '0') {
    $joins['card_rarity_treasure'] = 'LEFT JOIN card_rarity ON card.card_id = card_rarity.card_id';
    if ($selected_treasure_id == '-1') { $conditions[] = "card_rarity.treasure_id IS NULL"; } else { $conditions[] = "card_rarity.treasure_id = :treasure_id"; $params[':treasure_id'] = intval($selected_treasure_id); }
}
if ($selected_regulation !== '0') {
    $regulation_map = ['1' => '制限なし', '2' => '殿堂', '3' => 'プレミアム殿堂'];
    if (array_key_exists($selected_regulation, $regulation_map)) { $conditions[] = "cd.regulation = :regulation"; $params[':regulation'] = $regulation_map[$selected_regulation]; }
}
if ($selected_secret !== '0') { $joins['card_rarity_secret'] = 'LEFT JOIN card_rarity ON card.card_id = card_rarity.card_id'; $conditions[] = "card_rarity.secret = :secret"; $params[':secret'] = ($selected_secret === '1') ? 1 : 0; }
if ($selected_goods_id > 0) { $conditions[] = "cd.goods_id = :goods_id"; $params[':goods_id'] = $selected_goods_id; }
if ($selected_goodstype_id > 0) { $joins['goods_goodstype'] = 'LEFT JOIN goods ON cd.goods_id = goods.goods_id'; $conditions[] = "goods.goodstype_id = :goodstype_id"; $params[':goodstype_id'] = $selected_goodstype_id; }
if ($selected_mana !== 'all') {
    if ($selected_mana === '-1') { $conditions[] = "cd.mana IS NULL"; } else { $conditions[] = "cd.mana = :mana"; $params[':mana'] = intval($selected_mana); }
}
$civ_summary_subquery = "(SELECT card_id, COUNT(civilization_id) as civ_count FROM card_civilization GROUP BY card_id)";
$civ_type_conditions = [];
if (!$cost_zero && !$cost_infinity) {
    if ($mono_color_status == 1) { $civ_type_conditions[] = "card.card_id IN (SELECT card_id FROM {$civ_summary_subquery} AS civ_summary WHERE civ_summary.civ_count = 1)"; }
    if ($multi_color_status == 1) {
        $multi_cond = "card.card_id IN (SELECT card_id FROM {$civ_summary_subquery} AS civ_summary WHERE civ_summary.civ_count > 1)";
        if(!empty($selected_exclude_civs)) {
            foreach($selected_exclude_civs as $exclude_id) { $multi_cond .= " AND card.card_id NOT IN (SELECT card_id FROM card_civilization WHERE civilization_id = " . intval($exclude_id) . ")"; }
        }
        $civ_type_conditions[] = $multi_cond;
    }
}
$civ_select_conditions = [];
if (!empty($selected_main_civs)) {
    foreach($selected_main_civs as $main_id) { $civ_select_conditions[] = "card.card_id IN (SELECT card_id FROM card_civilization WHERE civilization_id = " . intval($main_id) . ")"; }
}
if (!empty($civ_type_conditions)) { $conditions[] = '(' . implode(' OR ', $civ_type_conditions) . ')'; }
if (!empty($civ_select_conditions)) { $conditions[] = '(' . implode(' OR ', $civ_select_conditions) . ')'; }
if (!$cost_zero && !$cost_infinity && empty($civ_type_conditions) && empty($civ_select_conditions)) { $conditions[] = "1 = 0"; }

// === SQLクエリの実行 (最終版: 高度なソート対応) ===
$join_str = !empty($joins) ? implode(' ', array_unique($joins)) : '';
$where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

// --- ステップ1: 条件に合うcard_idを全て取得 ---
$id_sql = "
    SELECT DISTINCT card.card_id
    FROM card
    JOIN card_detail cd ON card.card_id = cd.card_id
    {$join_str}
    {$where}
";
$stmt = $pdo->prepare($id_sql);
$stmt->execute($params);
$all_matching_card_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

$cards = [];
$total = 0;

if (!empty($all_matching_card_ids)) {
    // --- ステップ2: 取得したIDを元に、表示とソートに必要な全情報を取得 ---
    $placeholders = implode(',', array_fill(0, count($all_matching_card_ids), '?'));
    $details_sql = "
        SELECT 
            c.card_id, c.card_name, c.reading, c.cost, c.pow,
            cd.modelnum, cd.release_date,
            cr.rarity_id,
            (SELECT COUNT(cc.civilization_id) FROM card_civilization cc WHERE cc.card_id = c.card_id) as civ_count,
            (SELECT MIN(cc.civilization_id) FROM card_civilization cc WHERE cc.card_id = c.card_id) as min_civ_id
        FROM card c
        JOIN card_detail cd ON c.card_id = cd.card_id
        LEFT JOIN card_rarity cr ON c.card_id = cr.card_id
        WHERE c.card_id IN ({$placeholders})
    ";
    $stmt = $pdo->prepare($details_sql);
    $stmt->execute($all_matching_card_ids);
    $all_card_details = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // --- ステップ3: PHPで重複排除 ---
    $unique_cards = [];
    if ($show_same_name) {
        $unique_cards_by_modelnum = [];
        foreach ($all_card_details as $card) {
            if (!isset($unique_cards_by_modelnum[$card['modelnum']])) {
                $unique_cards_by_modelnum[$card['modelnum']] = $card;
            }
        }
        $unique_cards = array_values($unique_cards_by_modelnum);
    } else {
        $latest_cards_by_name = [];
        foreach ($all_card_details as $card) {
            $card_name = $card['card_name'];
            if (!isset($latest_cards_by_name[$card_name]) || $card['release_date'] > $latest_cards_by_name[$card_name]['release_date']) {
                $latest_cards_by_name[$card_name] = $card;
            }
        }
        $unique_cards = array_values($latest_cards_by_name);
    }
    
    // --- ステップ4: 総件数の確定と、PHPでの高度なソート ---
    $total = count($unique_cards);
    usort($unique_cards, function($a, $b) use ($selected_sort) {
        $rarity_cmp = ($b['rarity_id'] ?? 0) <=> ($a['rarity_id'] ?? 0);
        $a_civ_count = $a['civ_count'] ?? 99;
        $b_civ_count = $b['civ_count'] ?? 99;
        $civ_count_cmp = ($a_civ_count > 1 ? 1 : 0) <=> ($b_civ_count > 1 ? 1 : 0); // 単色(0)を多色(1)より優先
        if ($a_civ_count == 1 && $b_civ_count == 1) { // 両方単色なら
             $min_civ_id_cmp = ($a['min_civ_id'] ?? 99) <=> ($b['min_civ_id'] ?? 99);
        } else {
             $min_civ_id_cmp = 0; // 多色同士や単色vs多色ではID比較はしない
        }
        $civ_cmp = $civ_count_cmp ?: $min_civ_id_cmp;
        $id_cmp = $a['card_id'] <=> $b['card_id'];

        switch ($selected_sort) {
            case 'release_old': $main_cmp = strcmp($a['release_date'], $b['release_date']); break;
            case 'cost_desc': $main_cmp = ($b['cost'] ?? -1) <=> ($a['cost'] ?? -1); break;
            case 'cost_asc': $main_cmp = ($a['cost'] ?? -1) <=> ($b['cost'] ?? -1); break;
            case 'name_asc': $main_cmp = strcmp($a['reading'], $b['reading']); break;
            case 'name_desc': $main_cmp = strcmp($b['reading'], $a['reading']); break;
            case 'power_desc': $main_cmp = ($b['pow'] ?? -1) <=> ($a['pow'] ?? -1); break;
            case 'power_asc': $main_cmp = ($a['pow'] ?? -1) <=> ($b['pow'] ?? -1); break;
            default: $main_cmp = strcmp($b['release_date'], $a['release_date']); break;
        }
        return $main_cmp ?: $rarity_cmp ?: $civ_cmp ?: $id_cmp;
    });

    // --- ステップ5: PHPでのページネーションと、表示用文明情報の後付け ---
    $cards_on_page = array_slice($unique_cards, $offset, $perPage);
    if (!empty($cards_on_page)) {
        $card_ids_on_page = array_column($cards_on_page, 'card_id');
        $civ_placeholders = implode(',', array_fill(0, count($card_ids_on_page), '?'));
        $civ_sql = "SELECT card_id, GROUP_CONCAT(DISTINCT civilization_id ORDER BY civilization_id ASC SEPARATOR '') AS civ_ids FROM card_civilization WHERE card_id IN ({$civ_placeholders}) GROUP BY card_id";
        $stmt = $pdo->prepare($civ_sql);
        $stmt->execute($card_ids_on_page);
        $civ_map = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        foreach ($cards_on_page as $card) {
            $card['civ_ids'] = $civ_map[$card['card_id']] ?? '';
            $cards[] = $card;
        }
    }
} // ★★★ ここに、抜けていた閉じカッコ `}` を追加 ★★★
// --- カード画像のパスを事前に処理する ---
foreach ($cards as $key => &$card) { // ★参照渡し(&)に変更
    $modelnum = $card['modelnum'];
    $image_url = ''; // デフォルトは空

    if ($modelnum) {
        // modelnumから商品型番（例: 'dm01'）を抽出
        $parts = explode('-', $modelnum);
        $series_folder = strtolower($parts[0]);
        
        $image_path = "card/" . $series_folder . "/" . $modelnum . ".webp";
        $folder_path = "card/" . $series_folder . "/" . $modelnum;
        
        // modelnumに対応する画像ファイルが存在しないか、またはそれがフォルダである場合（＝セットカード）
        if (!file_exists($image_path) || is_dir($folder_path)) {
            $image_url = $folder_path . "/" . $modelnum . "a.webp";
        } else {
            // 通常のカードの場合
            $image_url = $image_path;
        }
    }
    $card['image_url'] = $image_url;
}
unset($card); // ループ後の参照を解除

// === テンプレート表示のための準備 ===
$totalPages = ceil($total / $perPage);
$civ_stmt = $pdo->query("SELECT civilization_id, civilization_name FROM civilization ORDER BY civilization_id ASC");
$civilization_list = $civ_stmt->fetchAll(PDO::FETCH_ASSOC);
$char_stmt = $pdo->query("SELECT characteristics_id, characteristics_name FROM characteristics ORDER BY characteristics_id ASC");
$characteristics_list = $char_stmt->fetchAll(PDO::FETCH_ASSOC);
$type_stmt = $pdo->query("SELECT cardtype_id, cardtype_name FROM cardtype ORDER BY cardtype_id ASC");
$cardtype_list = $type_stmt->fetchAll(PDO::FETCH_ASSOC);
$race_stmt = $pdo->query("SELECT race_id, race_name, reading FROM race");
$race_list = $race_stmt->fetchAll(PDO::FETCH_ASSOC);
usort($race_list, 'customRaceSort');
$rarity_stmt = $pdo->query("SELECT rarity_id, rarity_name FROM rarity ORDER BY rarity_id ASC");
$rarity_list = $rarity_stmt->fetchAll(PDO::FETCH_ASSOC);
$ability_stmt = $pdo->query("SELECT ability_id, ability_name, reading FROM ability ORDER BY reading COLLATE utf8mb4_unicode_ci ASC");
$ability_list = $ability_stmt->fetchAll(PDO::FETCH_ASSOC);
$treasure_stmt = $pdo->query("SELECT treasure_id, treasure_name FROM treasure ORDER BY treasure_id ASC");
$treasure_list = $treasure_stmt->fetchAll(PDO::FETCH_ASSOC);
$soul_stmt = $pdo->query("SELECT soul_id, soul_name FROM soul ORDER BY soul_id ASC");
$soul_list = $soul_stmt->fetchAll(PDO::FETCH_ASSOC);
$frame_stmt = $pdo->query("SELECT frame_id, frame_name FROM frame ORDER BY frame_id ASC");
$frame_list = $frame_stmt->fetchAll(PDO::FETCH_ASSOC);
if ($selected_goodstype_id > 0) {
    $goods_stmt = $pdo->prepare("SELECT goods_id, goods_name FROM goods WHERE goodstype_id = ? ORDER BY goods_id ASC");
    $goods_stmt->execute([$selected_goodstype_id]);
} else {
    $goods_stmt = $pdo->query("SELECT goods_id, goods_name FROM goods ORDER BY goods_id ASC");
}
$goods_list = $goods_stmt->fetchAll(PDO::FETCH_ASSOC);
$goodstype_stmt = $pdo->query("SELECT goodstype_id, goodstype_name FROM goodstype ORDER BY goodstype_id ASC");
$goodstype_list = $goodstype_stmt->fetchAll(PDO::FETCH_ASSOC);
$illustrator_stmt = $pdo->query("SELECT illus_id, illus_name FROM illus ORDER BY reading COLLATE utf8mb4_unicode_ci ASC");
$illustrator_list = $illustrator_stmt->fetchAll(PDO::FETCH_ASSOC);

// === HTMLテンプレートの読み込み ===
include 'template.html';
?>
