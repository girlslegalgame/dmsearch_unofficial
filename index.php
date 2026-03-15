<?php
require_once 'db_connect.php';
require_once 'functions.php';

// === 設定とページネーション ===
$perPage = 50;
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$offset = ($page - 1) * $perPage;

// === GET入力の整理 ===
$get_params_for_check = $_GET;
unset($get_params_for_check['page'], $get_params_for_check['_t']); 
$is_submitted = count($get_params_for_check) > 0;

$search = $_GET['search'] ?? '';
$keyword_mode = $_GET['keyword_mode'] ?? 'AND'; // ★新機能：モード取得
$cost_min = $_GET['cost_min'] ?? '';
$cost_max = $_GET['cost_max'] ?? '';
$cost_zero = isset($_GET['cost_zero']);
$cost_infinity = isset($_GET['cost_infinity']);
$pow_min = $_GET['pow_min'] ?? '';
$pow_max = $_GET['pow_max'] ?? '';
$pow_infinity = isset($_GET['pow_infinity']);
$year_min = $_GET['year_min'] ?? '';
$year_max = $_GET['year_max'] ?? '';
$selected_char_id = intval($_GET['characteristics_id'] ?? 0);
$selected_cardtype_id = intval($_GET['cardtype_id'] ?? 0); 
$selected_race_ids = isset($_GET['race_ids']) ? array_map('intval', $_GET['race_ids']) : [];
$race_search_mode = ($_GET['race_search_mode'] ?? 'AND') === 'OR' ? 'OR' : 'AND';
$selected_ability_ids = isset($_GET['ability_ids']) ? array_map('intval', $_GET['ability_ids']) : [];
$ability_search_mode = ($_GET['ability_search_mode'] ?? 'AND') === 'OR' ? 'OR' : 'AND';
$selected_rarity_id = intval($_GET['rarity_id'] ?? 0);
$selected_twinpact = $_GET['twinpact_filter'] ?? '0';
$selected_treasure_id = $_GET['treasure_id_filter'] ?? '0';
$selected_regulation = $_GET['regulation_filter'] ?? '0';
$selected_others_ids = isset($_GET['others_ids']) ? array_map('intval', $_GET['others_ids']) : [];
$others_search_mode = ($_GET['others_search_mode'] ?? 'AND') === 'OR' ? 'OR' : 'AND';
$selected_soul_ids = isset($_GET['soul_ids']) ? array_map('intval', $_GET['soul_ids']) : [];
$soul_search_mode = ($_GET['soul_search_mode'] ?? 'AND') === 'OR' ? 'OR' : 'AND';
$selected_frame_id = intval($_GET['frame_id_filter'] ?? 0);
$selected_goods_id = intval($_GET['goods_id_filter'] ?? 0);
$selected_goodstype_id = intval($_GET['goodstype_id_filter'] ?? 0);
$selected_illus_id = intval($_GET['illus_id_filter'] ?? 0);
$selected_mana = $_GET['mana_filter'] ?? 'all';
$selected_sort = $_GET['sort_order'] ?? 'release_new';
$show_same_name = isset($_GET['show_same_name']) || !$is_submitted;
$is_advanced_open = ($_GET['advanced_open'] ?? '0') == '1';

if ($is_submitted) {
    $multi_search_type = $_GET['multi_search_type'] ?? 'or';
    $search_name = isset($_GET['search_name']); $search_reading = isset($_GET['search_reading']);
    $search_text = isset($_GET['search_text']); $search_race = isset($_GET['search_race']);
    $search_flavortext = isset($_GET['search_flavortext']); $search_illus = isset($_GET['search_illus']);
    $mono_color_status = intval($_GET['mono_color'] ?? 0);
    $multi_color_status = intval($_GET['multi_color'] ?? 0);
    $selected_main_civs = isset($_GET['main_civs']) ? array_values(array_filter($_GET['main_civs'], fn($v) => $v != 0)) : [];
    $selected_exclude_civs = isset($_GET['exclude_civs']) ? array_values(array_filter($_GET['exclude_civs'], fn($v) => $v != 0)) : [];
    if ($multi_search_type === 'exact' && count($selected_main_civs) >= 2) $selected_exclude_civs = [];
} else {
    $search_name = $search_reading = $search_text = true;
    $search_race = $search_flavortext = $search_illus = false;
    $mono_color_status = $multi_color_status = 1;
    $selected_main_civs = $selected_exclude_civs = [];
}

// === SQL構築 ===
$conditions = []; $params = []; $joins = [];

// ★新機能：スペース区切り AND/OR 検索
if ($search !== '') {
    $words = preg_split('/[\s　]+/u', $search, -1, PREG_SPLIT_NO_EMPTY);
    $all_word_conditions = [];
    
    foreach ($words as $idx => $word) {
        $kwd_parts = [];
        $p_suffix = "_{$idx}";
        
        if ($search_name) { $kwd_parts[] = "card.card_name LIKE :s_name{$p_suffix}"; $params[":s_name{$p_suffix}"] = "%$word%"; }
        if ($search_reading) { $kwd_parts[] = "card.reading LIKE :s_read{$p_suffix}"; $params[":s_read{$p_suffix}"] = "%$word%"; }
        if ($search_text) { $kwd_parts[] = "card.text LIKE :s_text{$p_suffix}"; $params[":s_text{$p_suffix}"] = "%$word%"; }
        if ($search_flavortext) { $kwd_parts[] = "card.flavortext LIKE :s_flavor{$p_suffix}"; $params[":s_flavor{$p_suffix}"] = "%$word%"; }
        if ($search_race) { 
            $joins['race'] = 'LEFT JOIN card_race ON card.card_id = card_race.card_id LEFT JOIN race ON card_race.race_id = race.race_id'; 
            $kwd_parts[] = "race.race_name LIKE :s_race{$p_suffix}"; $params[":s_race{$p_suffix}"] = "%$word%"; 
        }
        if ($search_illus) { 
            $joins['illus'] = 'LEFT JOIN card_illus ON card.card_id = card_illus.card_id LEFT JOIN illus ON card_illus.illus_id = illus.illus_id'; 
            $kwd_parts[] = "illus.illus_name LIKE :s_illus{$p_suffix}"; $params[":s_illus{$p_suffix}"] = "%$word%"; 
        }
        if ($kwd_parts) {
            $all_word_conditions[] = '(' . implode(' OR ', $kwd_parts) . ')';
        }
    }
    
    if ($all_word_conditions) {
        // AND/OR モードによって結合文字を変える
        $glue = ($keyword_mode === 'OR') ? ' OR ' : ' AND ';
        $conditions[] = '(' . implode($glue, $all_word_conditions) . ')';
    }
}

if ($cost_infinity) $conditions[] = 'card.cost = '.DM_INFINITY;
elseif ($cost_zero) $conditions[] = 'card.cost IS NULL';
else {
    if (is_numeric($cost_min)) { $conditions[] = 'card.cost >= :c_min'; $params[':c_min'] = intval($cost_min); }
    if (is_numeric($cost_max)) { $conditions[] = 'card.cost <= :c_max'; $params[':c_max'] = intval($cost_max); }
}
if ($pow_infinity) $conditions[] = 'card.pow = '.DM_INFINITY;
else {
    if (is_numeric($pow_min)) { $conditions[] = 'card.pow >= :p_min'; $params[':p_min'] = intval($pow_min); }
    if (is_numeric($pow_max)) { $conditions[] = 'card.pow <= :p_max'; $params[':p_max'] = intval($pow_max); }
}
if (is_numeric($year_min)) { $conditions[] = "cd.release_date >= :y_min"; $params[':y_min'] = "$year_min-01-01"; }
if (is_numeric($year_max)) { $conditions[] = "cd.release_date <= :y_max"; $params[':y_max'] = "$year_max-12-31"; }

if ($selected_char_id > 0) { $joins[] = 'LEFT JOIN card_cardtype ON card.card_id = card_cardtype.card_id'; $conditions[] = "card_cardtype.characteristics_id = :char_id"; $params[':char_id'] = $selected_char_id; }
if ($selected_cardtype_id > 0) { $joins[] = 'LEFT JOIN card_cardtype ON card.card_id = card_cardtype.card_id'; $conditions[] = "card_cardtype.cardtype_id = :type_id"; $params[':type_id'] = $selected_cardtype_id; }
if ($selected_rarity_id > 0) { $joins[] = 'LEFT JOIN card_rarity ON card.card_id = card_rarity.card_id'; $conditions[] = "card_rarity.rarity_id = :rarity_id"; $params[':rarity_id'] = $selected_rarity_id; }
if ($selected_frame_id > 0) { $conditions[] = "cd.frame_id = :frame_id"; $params[':frame_id'] = $selected_frame_id; }
if ($selected_goods_id > 0) { $conditions[] = "cd.goods_id = :goods_id"; $params[':goods_id'] = $selected_goods_id; }
if ($selected_goodstype_id > 0) { $joins[] = 'LEFT JOIN goods ON cd.goods_id = goods.goods_id'; $conditions[] = "goods.goodstype_id = :goodstype_id"; $params[':goodstype_id'] = $selected_goodstype_id; }
if ($selected_illus_id > 0) { $joins[] = 'LEFT JOIN card_illus ON card.card_id = card_illus.card_id'; $conditions[] = "card_illus.illus_id = :illus_id"; $params[':illus_id'] = $selected_illus_id; }
if ($selected_twinpact !== '0') { $conditions[] = "cd.twinpact = :tp"; $params[':tp'] = ($selected_twinpact === '1' ? 1 : 0); }
if ($selected_regulation !== '0') { $regMap = ['1'=>'制限なし','2'=>'殿堂','3'=>'プレミアム殿堂']; if(isset($regMap[$selected_regulation])) { $conditions[] = "cd.regulation = :reg"; $params[':reg'] = $regMap[$selected_regulation]; } }
if ($selected_mana !== 'all') { if ($selected_mana === '-1') $conditions[] = "cd.mana IS NULL"; else { $conditions[] = "cd.mana = :mana"; $params[':mana'] = intval($selected_mana); } }
if ($selected_treasure_id != '0') { $joins[] = 'LEFT JOIN card_rarity ON card.card_id = card_rarity.card_id'; if ($selected_treasure_id == '-1') $conditions[] = "card_rarity.treasure_id IS NULL"; else { $conditions[] = "card_rarity.treasure_id = :tr_id"; $params[':tr_id'] = intval($selected_treasure_id); } }

foreach ([['ids'=>$selected_race_ids, 'mode'=>$race_search_mode, 'tbl'=>'card_race', 'col'=>'race_id'], ['ids'=>$selected_ability_ids, 'mode'=>$ability_search_mode, 'tbl'=>'card_ability', 'col'=>'ability_id'], ['ids'=>$selected_soul_ids, 'mode'=>$soul_search_mode, 'tbl'=>'card_soul', 'col'=>'soul_id'], ['ids'=>$selected_others_ids, 'mode'=>$others_search_mode, 'tbl'=>'card_others', 'col'=>'others_id']] as $group) {
    if (!$group['ids']) continue;
    $p_names = []; foreach ($group['ids'] as $i => $id) { $name = ":{$group['col']}_{$i}"; $p_names[] = $name; $params[$name] = $id; }
    if ($group['mode'] === 'AND') $conditions[] = "card.card_id IN (SELECT card_id FROM {$group['tbl']} WHERE {$group['col']} IN (".implode(',',$p_names).") GROUP BY card_id HAVING COUNT(DISTINCT {$group['col']}) = ".count($group['ids']).")";
    else { $joins[] = "LEFT JOIN {$group['tbl']} ON card.card_id = {$group['tbl']}.card_id"; $conditions[] = "{$group['tbl']}.{$group['col']} IN (".implode(',',$p_names).")"; }
}

$is_mono = ($mono_color_status == 1); $is_multi = ($multi_color_status == 1);
if (!$cost_zero && !$cost_infinity && !($is_mono && $is_multi && !$selected_exclude_civs && !$selected_main_civs)) {
    $civ_sub = "(SELECT card_id, COUNT(civilization_id) as cnt FROM card_civilization WHERE civilization_id != 6 GROUP BY card_id) AS temp_civ";
    if ($selected_main_civs) {
        $mc = count($selected_main_civs); $exact = ($multi_search_type === 'exact' && $mc >= 2);
        $mono_q = ""; $multi_q = "";
        $in_sql = "SELECT card_id FROM card_civilization WHERE civilization_id IN (".implode(',', array_map('intval', $selected_main_civs)).")";
        if ($is_mono) $mono_q = "(card.card_id IN ($in_sql) AND card.card_id IN (SELECT card_id FROM $civ_sub WHERE temp_civ.cnt = 1))";
        if ($is_multi) {
            if ($exact) {
                $multi_q = "card.card_id IN (SELECT card_id FROM $civ_sub WHERE temp_civ.cnt = $mc)";
                foreach($selected_main_civs as $id) $multi_q .= " AND card.card_id IN (SELECT card_id FROM card_civilization WHERE civilization_id = ".intval($id).")";
            } else {
                $multi_q = "(card.card_id IN ($in_sql) AND card.card_id IN (SELECT card_id FROM $civ_sub WHERE temp_civ.cnt > 1))";
                foreach($selected_exclude_civs as $id) $multi_q .= " AND card.card_id NOT IN (SELECT card_id FROM card_civilization WHERE civilization_id = ".intval($id).")";
            }
        }
        if ($mono_q && $multi_q) $conditions[] = "($mono_q OR $multi_q)"; else $conditions[] = $mono_q ?: ($multi_q ?: "1=0");
    } else {
        $c_cond = [];
        if ($is_mono) $c_cond[] = "card.card_id IN (SELECT card_id FROM $civ_sub WHERE temp_civ.cnt = 1) OR card.card_id NOT IN (SELECT card_id FROM card_civilization WHERE civilization_id != 6)";
        if ($is_multi) {
            $mq = "card.card_id IN (SELECT card_id FROM $civ_sub WHERE temp_civ.cnt > 1)";
            foreach($selected_exclude_civs as $id) $mq .= " AND card.card_id NOT IN (SELECT card_id FROM card_civilization WHERE civilization_id = ".intval($id).")";
            $c_cond[] = $mq;
        }
        if ($c_cond) $conditions[] = '('.implode(' OR ', $c_cond).')'; else $conditions[] = "1=0";
    }
}

// === データ取得 ===
$where = $conditions ? 'WHERE '.implode(' AND ', $conditions) : '';
$join_str = $joins ? implode(' ', array_unique($joins)) : '';
$stmt = $pdo->prepare("SELECT DISTINCT card.card_id FROM card JOIN card_detail cd ON card.card_id = cd.card_id $join_str $where");
$stmt->execute($params);
$ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

$cards = []; $total = 0;
if ($ids) {
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT c.card_id, c.card_name, c.reading, c.cost, c.pow, cd.modelnum, cd.release_date, cr.rarity_id, (SELECT COUNT(*) FROM card_civilization cc WHERE cc.card_id = c.card_id) as civ_count, (SELECT MIN(civilization_id) FROM card_civilization cc WHERE cc.card_id = c.card_id) as min_civ_id FROM card c JOIN card_detail cd ON c.card_id = cd.card_id LEFT JOIN card_rarity cr ON c.card_id = cr.card_id WHERE c.card_id IN ($ph)");
    $stmt->execute($ids);
    $details = $stmt->fetchAll();

    $unique = [];
    if ($show_same_name) { foreach ($details as $c) if (!isset($unique[$c['modelnum']])) $unique[$c['modelnum']] = $c; }
    else { foreach ($details as $c) if (!isset($unique[$c['card_name']]) || $c['release_date'] > $unique[$c['card_name']]['release_date']) $unique[$c['card_name']] = $c; }
    $unique = array_values($unique);
    $total = count($unique);

    usort($unique, function($a, $b) use ($selected_sort) {
        switch ($selected_sort) {
            case 'release_old': $m = strcmp($a['release_date'], $b['release_date']); break;
            case 'cost_desc':   $m = ($b['cost']??-1) <=> ($a['cost']??-1); break;
            case 'cost_asc':    $m = ($a['cost']??-1) <=> ($b['cost']??-1); break;
            case 'name_asc':    $m = strcmp(get_sortable_reading($a['reading']), get_sortable_reading($b['reading'])); break;
            case 'name_desc':   $m = strcmp(get_sortable_reading($b['reading']), get_sortable_reading($a['reading'])); break;
            case 'power_desc':  $m = ($b['pow']??-1) <=> ($a['pow']??-1); break;
            case 'power_asc':   $m = ($a['pow']??-1) <=> ($b['pow']??-1); break;
            default:            $m = strcmp($b['release_date'], $a['release_date']); break;
        }
        if ($m !== 0) return $m;
        $rarity_cmp = ($b['rarity_id'] ?? 0) <=> ($a['rarity_id'] ?? 0);
        if ($rarity_cmp !== 0) return $rarity_cmp;
        $civ_cmp = get_civ_priority($a) <=> get_civ_priority($b);
        return $civ_cmp ?: strcmp($a['modelnum'] ?? '', $b['modelnum'] ?? '');
    });

    $page_cards = array_slice($unique, $offset, $perPage);
    foreach ($page_cards as $c) {
        $c['image_url'] = get_card_image_url($c['modelnum']);
        $cards[] = $c;
    }
}

// === 表示用データ取得 ===
$civilization_list = $pdo->query("SELECT * FROM civilization ORDER BY civilization_id")->fetchAll();
$characteristics_list = $pdo->query("SELECT * FROM characteristics ORDER BY characteristics_id")->fetchAll();
$cardtype_list = $pdo->query("SELECT * FROM cardtype ORDER BY cardtype_id")->fetchAll();
$race_list = $pdo->query("SELECT * FROM race")->fetchAll(); usort($race_list, 'compare_by_reading');
$rarity_list = $pdo->query("SELECT * FROM rarity ORDER BY rarity_id")->fetchAll();
$ability_list = $pdo->query("SELECT * FROM ability ORDER BY reading")->fetchAll();
$treasure_list = $pdo->query("SELECT * FROM treasure ORDER BY treasure_id")->fetchAll();
$soul_list = $pdo->query("SELECT * FROM soul ORDER BY soul_id")->fetchAll();
$frame_list = $pdo->query("SELECT * FROM frame ORDER BY frame_id")->fetchAll();
$goodstype_list = $pdo->query("SELECT * FROM goodstype ORDER BY goodstype_id")->fetchAll();
$goods_list = ($selected_goodstype_id > 0) ? (function($pdo, $id){ $s = $pdo->prepare("SELECT * FROM goods WHERE goodstype_id = ? ORDER BY goods_id"); $s->execute([$id]); return $s->fetchAll(); })($pdo, $selected_goodstype_id) : $pdo->query("SELECT * FROM goods ORDER BY goods_id")->fetchAll();
$illustrator_list = $pdo->query("SELECT * FROM illus ORDER BY reading")->fetchAll();
$others_list = $pdo->query("SELECT * FROM others ORDER BY others_id")->fetchAll();
$totalPages = ceil($total / $perPage);

include 'template.html';
