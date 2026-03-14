// === 定数・設定 ===
const CONFIG = {
    DM_INFINITY: 2147483647,
    SORT_MAP: {'ぁ':'01a','あ':'01b','ぃ':'02a','い':'02b','ぅ':'03a','う':'03b','ぇ':'04a','え':'04b','ぉ':'05a','お':'05b','か':'06a','が':'06b','き':'07a','ぎ':'07b','く':'08a','ぐ':'08b','け':'09a','げ':'09b','こ':'10a','ご':'10b','さ':'11a','ざ':'11b','し':'12a','じ':'12b','す':'13a','ず':'13b','せ':'14a','ぜ':'14b','そ':'15a','ぞ':'15b','た':'16a','だ':'16b','ち':'17a','ぢ':'17b','っ':'18a','つ':'18b','づ':'18b','て':'19a','で':'19b','と':'20a','ど':'20b','な':'21a','に':'22a','ぬ':'23a','ね':'24a','の':'25a','は':'26a','ば':'26b','ぱ':'26c','ひ':'27a','び':'27b','ぴ':'27c','ふ':'28a','ぶ':'28b','ぷ':'28c','へ':'29a','べ':'29b','ぺ':'29c','ほ':'30a','ぼ':'30b','ぽ':'30c','ま':'31a','み':'32a','む':'33a','め':'34a','も':'35a','ゃ':'36a','や':'36b','ゅ':'37a','ゆ':'37b','ょ':'38a','よ':'38b','ら':'39a','り':'40a','る':'41a','れ':'42a','ろ':'43a','わ':'44a','を':'45a','ん':'46a','ー':'47a'}
};

document.addEventListener('DOMContentLoaded', () => {

    // --- ① 要素の取得 ---
    const searchForm = document.getElementById('searchForm');
    const resetButtons = document.querySelectorAll('.reset-button');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultsContainer = document.querySelector('.container');
    const paginationContainer = document.querySelector('.pagination');
    const resultsSummary = document.querySelector('.search-results-summary p');
    const sortAreaElement = document.getElementById('sort-area');
    
    // 検索対象チェックボックス関連
    const toggleBtn = document.getElementById('toggleBtn');
    const searchCheckboxes = document.querySelectorAll('.checkbox-container input[type="checkbox"]');

    // 文明
    const monoColorBtn = document.querySelector('[data-target-input="mono_color"]');
    const multiColorBtn = document.querySelector('[data-target-input="multi_color"]');
    const mainCivButtons = document.querySelectorAll('#main-civs-buttons .civ-btn');
    const excludeSection = document.getElementById('exclude-civs-section');
    const excludeCivWrappers = document.querySelectorAll('.exclude-civ-wrapper');
    const multiSearchTypeSection = document.getElementById('multi-search-type-section');
    const multiSearchTypeSelect = document.getElementById('multi_search_type');

    // 数値・入力制限用
    const costMinInput = document.getElementById('cost_min_input');
    const costMaxInput = document.getElementById('cost_max_input');
    const costZeroCheck = document.getElementById('cost_zero_check');
    const costInfinityCheck = document.getElementById('cost_infinity_check');
    const powMinInput = document.getElementById('pow_min_input');
    const powMaxInput = document.getElementById('pow_max_input');
    const powInfinityCheck = document.getElementById('pow_infinity_check');

    // その他
    const advancedSearchArea = document.getElementById('advanced-search-area');
    const toggleAdvancedBtn = document.getElementById('toggle-advanced-btn');
    const advancedStateInput = document.getElementById('advanced-state');
    const goodsTypeSelect = document.querySelector('select[name="goodstype_id_filter"]');
    const goodsSelect = document.querySelector('select[name="goods_id_filter"]');
    const sortOrderSelect = document.getElementById('sort-order');
    const sortOrderHiddenInput = document.getElementById('sort-order-hidden');
    const showSameNameCheck = document.getElementById('show-same-name-check');

    // --- ② 制御ロジック ---

    // 検索対象の全解除/全選択ボタンのテキスト更新
    function updateToggleButtonLabel() {
        if (!toggleBtn) return;
        const anyChecked = Array.from(searchCheckboxes).some(cb => cb.checked);
        toggleBtn.textContent = anyChecked ? '全解除' : '全選択';
    }

    // 検索対象ボタンのクリックイベント
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const anyChecked = Array.from(searchCheckboxes).some(cb => cb.checked);
            searchCheckboxes.forEach(cb => cb.checked = !anyChecked);
            updateToggleButtonLabel();
        });
    }

    // 各チェックボックス変更時にラベル更新
    searchCheckboxes.forEach(cb => cb.addEventListener('change', updateToggleButtonLabel));

    // コスト・パワー入力制限
    const setupCheckboxToggle = (check1, check2, input1, input2) => {
        const toggleInputs = () => {
            const disable = (check1 && check1.checked) || (check2 && check2.checked);
            if(input1) { input1.disabled = disable; if(disable) input1.value = ''; }
            if(input2) { input2.disabled = disable; if(disable) input2.value = ''; }
        };
        if(check1) check1.addEventListener('change', () => { if (check1.checked && check2) check2.checked = false; toggleInputs(); });
        if(check2) check2.addEventListener('change', () => { if (check2.checked && check1) check1.checked = false; toggleInputs(); });
        toggleInputs();
    };
    setupCheckboxToggle(costZeroCheck, costInfinityCheck, costMinInput, costMaxInput);
    setupCheckboxToggle(powInfinityCheck, null, powMinInput, powMaxInput);

    // 文明制御
    function updateCivilizationControls() {
        if (!multiColorBtn || mainCivButtons.length === 0) return;
        const isMultiOn = !multiColorBtn.classList.contains('is-off');
        const selectedMainCivIds = [];
        mainCivButtons.forEach(btn => { if (!btn.classList.contains('is-off') && btn.dataset.civId !== '6') selectedMainCivIds.push(btn.dataset.civId); });
        const selectedCount = selectedMainCivIds.length;
        const isExactMode = (multiSearchTypeSelect && multiSearchTypeSelect.value === 'exact');

        if (multiSearchTypeSection) multiSearchTypeSection.style.display = (isMultiOn && selectedCount >= 2) ? 'block' : 'none';
        if (excludeSection) excludeSection.style.display = (isMultiOn && selectedCount >= 1 && (selectedCount < 2 || !isExactMode)) ? 'block' : 'none';
        excludeCivWrappers.forEach(wrapper => {
            const civId = wrapper.id.replace('exclude-wrapper-', '');
            wrapper.style.display = selectedMainCivIds.includes(civId) ? 'none' : 'block';
        });
    }

    // 商品名の絞り込み
    if (goodsTypeSelect) {
        goodsTypeSelect.addEventListener('change', () => {
            fetch(`api.php?type=goods&goodstype_id=${goodsTypeSelect.value}`)
                .then(res => res.json())
                .then(data => {
                    if (goodsSelect) {
                        goodsSelect.innerHTML = '<option value="0">指定なし</option>';
                        data.forEach(g => goodsSelect.add(new Option(g.name, g.id)));
                        goodsSelect.value = "0";
                    }
                });
        });
    }

    // --- ③ 検索実行 ---
    function performSearch(url) {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (resultsContainer) resultsContainer.style.opacity = '0.5';
        fetch(url).then(res => res.text()).then(html => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            if (resultsSummary) resultsSummary.innerHTML = doc.querySelector('.search-results-summary p').innerHTML;
            if (resultsContainer) resultsContainer.innerHTML = doc.querySelector('.container').innerHTML;
            if (paginationContainer) {
                const newPagi = doc.querySelector('.pagination');
                paginationContainer.innerHTML = newPagi ? newPagi.innerHTML : '';
                paginationContainer.style.display = newPagi ? 'block' : 'none';
            }
            (sortAreaElement || resultsContainer).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }).finally(() => {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (resultsContainer) resultsContainer.style.opacity = '1';
        });
    }

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(searchForm);
            formData.set('page', '1');
            const newUrl = `${window.location.pathname}?${new URLSearchParams(formData).toString()}`;
            history.pushState({path: newUrl}, '', newUrl);
            performSearch(newUrl);
        });
        
        searchForm.addEventListener('click', (e) => {
            const btn = e.target.closest('.civ-btn');
            if (!btn) return;
            const isTurningOff = !btn.classList.contains('is-off');
            if (btn === monoColorBtn && isTurningOff && multiColorBtn.classList.contains('is-off')) return;
            if (btn === multiColorBtn && isTurningOff && monoColorBtn.classList.contains('is-off')) return;
            btn.classList.toggle('is-off');
            const input = document.getElementById(btn.dataset.targetInput);
            if (input) input.value = btn.classList.contains('is-off') ? '0' : (btn.dataset.civId || '1');
            if (!btn.classList.contains('is-off') && btn.closest('#main-civs-buttons')) {
                const civId = btn.dataset.civId;
                const exIn = document.getElementById(`exclude_civ_${civId}`);
                const exBtn = document.querySelector(`.exclude-civ-wrapper button[data-target-input="exclude_civ_${civId}"]`);
                if (exIn) exIn.value = '0';
                if (exBtn) exBtn.classList.add('is-off');
            }
            updateCivilizationControls();
        });
    }

    // --- ④ リセットボタンの挙動 ---
    let resetModalStates = []; 
    resetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            searchForm.reset();
            // 検索対象の初期化
            document.getElementsByName('search_name')[0].checked = true;
            document.getElementsByName('search_reading')[0].checked = true;
            document.getElementsByName('search_text')[0].checked = true;
            document.getElementsByName('search_race')[0].checked = false;
            document.getElementsByName('search_flavortext')[0].checked = false;
            document.getElementsByName('search_illus')[0].checked = false;
            updateToggleButtonLabel(); // ボタンの文字を更新

            // 数値入力の有効化
            costMinInput.disabled = false; costMaxInput.disabled = false;
            powMinInput.disabled = false; powMaxInput.disabled = false;

            // 各種セレクトボックスを「指定なし」へ
            document.querySelectorAll('select.styled-select').forEach(s => {
                if (s.name === 'mana_filter') s.value = 'all';
                else s.value = '0';
            });
            // 商品名絞り込みの解除
            if (goodsTypeSelect) goodsTypeSelect.dispatchEvent(new Event('change'));

            // 文明ボタン（単色多色ON、それ以外OFF）
            document.querySelectorAll('.civ-btn').forEach(b => {
                const isType = b.dataset.targetInput === 'mono_color' || b.dataset.targetInput === 'multi_color';
                b.classList.toggle('is-off', !isType);
                const input = document.getElementById(b.dataset.targetInput);
                if (input) input.value = isType ? '1' : '0';
            });

            // ソート順と同名表示
            sortOrderSelect.value = 'release_new';
            if (sortOrderHiddenInput) sortOrderHiddenInput.value = 'release_new';
            showSameNameCheck.checked = true;

            // モーダルデータのクリア
            resetModalStates.forEach(f => f());
            updateCivilizationControls();
        });
    });

    // --- ⑤ その他機能 ---
    function getSortableString(str) { if (!str) return ''; return str.split('').map(char => CONFIG.SORT_MAP[char] || char).join(''); }
    
    function setupSearchModal(config) {
        const { modalType, hiddenInputName, displayClassName } = config;
        const selectBox = document.getElementById(`${modalType}-select-box`);
        const modal = document.getElementById(`${modalType}-modal`);
        if (!selectBox || !modal) return;
        const listEl = document.getElementById(`${modalType}-modal-list`);
        let allItems = [], selectedItems = new Map();

        const updateDisp = () => {
            const names = Array.from(selectedItems.values());
            document.querySelector(`.${displayClassName}`).textContent = names.join('、');
            selectBox.querySelector('.placeholder').style.display = names.length > 0 ? 'none' : 'block';
            searchForm.querySelectorAll(`input[name="${hiddenInputName}"]`).forEach(el => el.remove());
            selectedItems.forEach((name, id) => {
                const input = document.createElement('input');
                input.type = 'hidden'; input.name = hiddenInputName; input.value = id;
                searchForm.appendChild(input);
            });
        };

        const render = (items) => {
            listEl.innerHTML = items.sort((a,b) => getSortableString(a.reading).localeCompare(getSortableString(b.reading)))
                .map(item => `<div class="race-list-item"><label style="flex-grow:1;cursor:pointer;">${item.name}<input type="checkbox" data-id="${item.id}" data-name="${item.name}" ${selectedItems.has(String(item.id)) ? 'checked' : ''}></label></div>`).join('');
        };

        selectBox.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (allItems.length === 0) fetch(`api.php?type=${modalType}`).then(res => res.json()).then(data => { allItems = data; render(data); });
            else render(allItems);
        });

        modal.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                if (e.target.checked) selectedItems.set(String(e.target.dataset.id), e.target.dataset.name);
                else selectedItems.delete(String(e.target.dataset.id));
            }
        });

        modal.querySelector('.btn-primary').addEventListener('click', () => { updateDisp(); modal.style.display = 'none'; });
        modal.querySelector('.btn-secondary').addEventListener('click', () => modal.style.display = 'none');
        modal.querySelector('.modal-clear-btn').addEventListener('click', () => { selectedItems.clear(); render(allItems); });
        resetModalStates.push(() => { selectedItems.clear(); updateDisp(); });
    }

    setupSearchModal({ modalType: 'race', hiddenInputName: 'race_ids[]', displayClassName: 'selected-races-display' });
    setupSearchModal({ modalType: 'ability', hiddenInputName: 'ability_ids[]', displayClassName: 'selected-abilities-display' });
    setupSearchModal({ modalType: 'others', hiddenInputName: 'others_ids[]', displayClassName: 'selected-others-display' });
    setupSearchModal({ modalType: 'soul', hiddenInputName: 'soul_ids[]', displayClassName: 'selected-soul-display' });

    let modalObserver = null;
    function openCardDetailModal(cardId) {
        const container = document.getElementById('modal-cards-container');
        const title = document.getElementById('modal-card-name');
        const template = document.getElementById('modal-card-template');
        document.getElementById('card-modal').style.display = 'flex';
        container.innerHTML = ''; title.textContent = '読み込み中...';
        if (modalObserver) modalObserver.disconnect();

        fetch(`get_card_details.php?id=${cardId}`).then(res => res.json()).then(data => {
            modalObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => { if (entry.isIntersecting && entry.intersectionRatio >= 0.5) title.textContent = entry.target.dataset.cardName; });
            }, { root: container, threshold: 0.5 });

            data.cards.forEach(card => {
                const clone = template.content.cloneNode(true);
                const inst = clone.querySelector('.modal-card-instance');
                inst.dataset.cardName = card.card_name;
                clone.querySelector('.modal-card-type').textContent = card.card_type;
                clone.querySelector('.modal-civilization').textContent = card.civilization;
                clone.querySelector('.modal-rarity').textContent = card.rarity;
                clone.querySelector('.modal-mana').textContent = card.mana ?? '---';
                clone.querySelector('.modal-illustrator').textContent = card.illustrator;
                clone.querySelector('.modal-power').textContent = card.pow == CONFIG.DM_INFINITY ? '∞' : (card.pow ?? '---');
                clone.querySelector('.modal-cost').textContent = card.cost == CONFIG.DM_INFINITY ? '∞' : (card.cost ?? '---');
                clone.querySelector('.modal-race').textContent = card.race;
                const dbg = clone.querySelector('.modal-debug-ability-names');
                if (dbg) dbg.textContent = (card.ability_names_debug || []).join('、') || '（なし）';
                clone.querySelector('.modal-card-image').src = card.image_url;
                if (card.text && card.text !== '（テキスト情報なし）') { clone.querySelector('.modal-text').innerHTML = card.text; clone.querySelector('.modal-ability-section').style.display = 'block'; }
                if (card.flavortext) { clone.querySelector('.modal-flavortext').innerHTML = card.flavortext; clone.querySelector('.modal-flavor-section').style.display = 'block'; }
                container.appendChild(clone);
                modalObserver.observe(inst);
            });
        });
    }

    document.body.addEventListener('click', (e) => {
        const img = e.target.closest('.card-image-item');
        if (img) openCardDetailModal(img.dataset.cardId);
        const pag = e.target.closest('.pagination a');
        if (pag && !pag.classList.contains('current-page')) { e.preventDefault(); performSearch(pag.href); }
        if (e.target.closest('.close-btn') || e.target.id === 'card-modal') {
            document.getElementById('card-modal').style.display = 'none';
            if (modalObserver) modalObserver.disconnect();
        }
    });

    updateToggleButtonLabel();
    updateCivilizationControls();
});
