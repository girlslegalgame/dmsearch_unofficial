// === 定数・設定 ===
const CONFIG = {
    DM_INFINITY: 2147483647,
    SORT_MAP: {'ぁ':'01a','あ':'01b','ぃ':'02a','い':'02b','ぅ':'03a','う':'03b','ぇ':'04a','え':'04b','ぉ':'05a','お':'05b','か':'06a','が':'06b','き':'07a','ぎ':'07b','く':'08a','ぐ':'08b','け':'09a','げ':'09b','こ':'10a','ご':'10b','さ':'11a','ざ':'11b','し':'12a','じ':'12b','す':'13a','ず':'13b','せ':'14a','ぜ':'14b','そ':'15a','ぞ':'15b','た':'16a','だ':'16b','ち':'17a','ぢ':'17b','っ':'18a','つ':'18b','づ':'18b','て':'19a','で':'19b','と':'20a','ど':'20b','な':'21a','に':'22a','ぬ':'23a','ね':'24a','の':'25a','は':'26a','ば':'26b','ぱ':'26c','ひ':'27a','び':'27b','ぴ':'27c','ふ':'28a','ぶ':'28b','ぷ':'28c','へ':'29a','べ':'29b','ぺ':'29c','ほ':'30a','ぼ':'30b','ぽ':'30c','ま':'31a','み':'32a','む':'33a','め':'34a','も':'35a','ゃ':'36a','や':'36b','ゅ':'37a','ゆ':'37b','ょ':'38a','よ':'38b','ら':'39a','り':'40a','る':'41a','れ':'42a','ろ':'43a','わ':'44a','を':'45a','ん':'46a','ー':'47a'}
};

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function(m) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m];
    });
}

document.addEventListener('DOMContentLoaded', () => {

    // --- ① 要素の取得 ---
    const searchForm = document.getElementById('searchForm');
    const resetButtons = document.querySelectorAll('.reset-button');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultsContainer = document.querySelector('.container');
    const paginationWrapper = document.getElementById('pagination-wrapper');
    const resultsSummary = document.querySelector('.search-results-summary p');
    const sortAreaElement = document.getElementById('sort-area');
    const backToTopBtn = document.getElementById('back-to-top');

    const toggleBtn = document.getElementById('toggleBtn');
    const searchCheckboxes = document.querySelectorAll('.checkbox-container input[type="checkbox"]');
    const advancedSearchArea = document.getElementById('advanced-search-area');
    const toggleAdvancedBtn = document.getElementById('toggle-advanced-btn');
    const advancedStateInput = document.getElementById('advanced-state');

    // 文明検索用
    const monoColorBtn = document.querySelector('[data-target-input="mono_color"]');
    const multiColorBtn = document.querySelector('[data-target-input="multi_color"]');
    const mainCivButtons = document.querySelectorAll('#main-civs-buttons .civ-btn');
    const excludeSection = document.getElementById('exclude-civs-section');
    const excludeCivWrappers = document.querySelectorAll('.exclude-civ-wrapper');
    const multiSearchTypeSection = document.getElementById('multi-search-type-section');
    const multiSearchTypeSelect = document.getElementById('multi_search_type');

    // 数値入力
    const costMinInput = document.getElementById('cost_min_input');
    const costMaxInput = document.getElementById('cost_max_input');
    const costZeroCheck = document.getElementById('cost_zero_check');
    const costInfinityCheck = document.getElementById('cost_infinity_check');
    const powMinInput = document.getElementById('pow_min_input');
    const powMaxInput = document.getElementById('pow_max_input');
    const powInfinityCheck = document.getElementById('pow_infinity_check');

    const goodsTypeSelect = document.querySelector('select[name="goodstype_id_filter"]');
    const goodsSelect = document.querySelector('select[name="goods_id_filter"]');
    const sortOrderSelect = document.getElementById('sort-order');
    const sortOrderHiddenInput = document.getElementById('sort-order-hidden');
    const showSameNameCheck = document.getElementById('show-same-name-check');

    // --- ② メイン制御関数 ---

    /**
     * 【復元】文明検索UIの連動制御（多色カードの検索対象ドロップダウン含む）
     */
    function updateCivilizationControls() {
        if (!multiColorBtn || mainCivButtons.length === 0) return;

        const isMultiOn = !multiColorBtn.classList.contains('is-off');
        
        // メイン文明（無色除く）の選択状況
        const selectedMainCivIds = [];
        mainCivButtons.forEach(btn => {
            if (!btn.classList.contains('is-off') && btn.dataset.civId !== '6') {
                selectedMainCivIds.push(btn.dataset.civId);
            }
        });
        const selectedCount = selectedMainCivIds.length;
        const isExactMode = (multiSearchTypeSelect && multiSearchTypeSelect.value === 'exact');

        // 1. 【復元】多色検索対象ドロップダウンの表示制御
        if (multiSearchTypeSection) {
            multiSearchTypeSection.style.display = (isMultiOn && selectedCount >= 2) ? 'block' : 'none';
        }

        // 2. 【復元】「多色に含めない文明」セクションの表示制御
        if (excludeSection) {
            if (isMultiOn && selectedCount >= 1 && (selectedCount < 2 || !isExactMode)) {
                excludeSection.style.display = 'block';
            } else {
                excludeSection.style.display = 'none';
            }
        }

        // 3. 除外文明ボタンの表示制御
        excludeCivWrappers.forEach(wrapper => {
            const civId = wrapper.id.replace('exclude-wrapper-', '');
            wrapper.style.display = selectedMainCivIds.includes(civId) ? 'none' : 'block';
        });
    }

    // 【復元】多色検索対象ドロップダウンの変更を監視
    if (multiSearchTypeSelect) {
        multiSearchTypeSelect.addEventListener('change', updateCivilizationControls);
    }

    // --- ③ 検索・UI処理 ---

    function performSearch(url) {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (resultsContainer) resultsContainer.style.opacity = '0.5';

        const fetchUrl = new URL(url, window.location.origin);
        fetchUrl.searchParams.set('_t', Date.now());

        fetch(fetchUrl)
            .then(response => response.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                if (resultsSummary) resultsSummary.innerHTML = doc.querySelector('.search-results-summary p').innerHTML;
                if (resultsContainer) resultsContainer.innerHTML = doc.querySelector('.container').innerHTML;
                if (paginationWrapper) {
                    const newPagiWrapper = doc.getElementById('pagination-wrapper');
                    paginationWrapper.innerHTML = newPagiWrapper ? newPagiWrapper.innerHTML : '';
                }
                const scrollTarget = sortAreaElement || resultsContainer;
                scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            })
            .finally(() => {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                if (resultsContainer) resultsContainer.style.opacity = '1';
            });
    }

    const triggerSearch = () => {
        if(searchForm) searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
    };

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(searchForm);
            formData.set('page', '1');
            const params = new URLSearchParams(formData);
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            history.pushState({path: newUrl}, '', newUrl);
            performSearch(newUrl);
        });

        searchForm.addEventListener('click', (e) => {
            const button = e.target.closest('.civ-btn');
            if (!button) return;
            const isTurningOff = !button.classList.contains('is-off');
            
            if (button === monoColorBtn && isTurningOff && multiColorBtn.classList.contains('is-off')) return;
            if (button === multiColorBtn && isTurningOff && monoColorBtn.classList.contains('is-off')) return;
            
            const targetInput = document.getElementById(button.dataset.targetInput);
            button.classList.toggle('is-off');
            const isNowOn = !button.classList.contains('is-off');

            if (targetInput) {
                targetInput.value = isNowOn ? (button.dataset.civId || '1') : '0';
            }

            if (isNowOn && button.closest('#main-civs-buttons')) {
                const civId = button.dataset.civId;
                const excludeInput = document.getElementById(`exclude_civ_${civId}`);
                const excludeButton = document.querySelector(`.exclude-civ-wrapper button[data-target-input="exclude_civ_${civId}"]`);
                if (excludeInput) excludeInput.value = '0';
                if (excludeButton) excludeButton.classList.add('is-off');
            }
            updateCivilizationControls();
        });
    }

    if (toggleAdvancedBtn && advancedSearchArea) {
        toggleAdvancedBtn.addEventListener('click', () => {
            const isOpen = advancedSearchArea.classList.toggle('is-open');
            toggleAdvancedBtn.textContent = isOpen ? '条件を隠す' : 'さらに条件をしぼる';
            if (advancedStateInput) advancedStateInput.value = isOpen ? '1' : '0';
        });
    }

    function updateToggleButtonLabel() {
        if (!toggleBtn) return;
        const anyChecked = Array.from(searchCheckboxes).some(cb => cb.checked);
        toggleBtn.textContent = anyChecked ? '全解除' : '全選択';
    }
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const anyChecked = Array.from(searchCheckboxes).some(cb => cb.checked);
            searchCheckboxes.forEach(cb => cb.checked = !anyChecked);
            updateToggleButtonLabel();
        });
    }
    searchCheckboxes.forEach(cb => cb.addEventListener('change', updateToggleButtonLabel));

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

    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', () => {
            if (sortOrderHiddenInput) sortOrderHiddenInput.value = sortOrderSelect.value;
            triggerSearch();
        });
    }
    if (showSameNameCheck) showSameNameCheck.addEventListener('change', triggerSearch);

    // --- ④ リセット・共通 ---
    let resetModalStates = []; 
    resetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            searchForm.reset();
            const keywordAnd = document.getElementById('keyword-and');
            if (keywordAnd) keywordAnd.checked = true;
            document.getElementsByName('search_name')[0].checked = true;
            document.getElementsByName('search_reading')[0].checked = true;
            document.getElementsByName('search_text')[0].checked = true;
            document.getElementsByName('search_race')[0].checked = false;
            document.getElementsByName('search_flavortext')[0].checked = false;
            document.getElementsByName('search_illus')[0].checked = false;
            updateToggleButtonLabel();
            [costMinInput, costMaxInput, powMinInput, powMaxInput].forEach(inp => { if(inp) { inp.disabled = false; inp.value = ''; } });
            document.querySelectorAll('select.styled-select').forEach(s => { if (s.name === 'mana_filter') s.value = 'all'; else s.value = '0'; });
            if (goodsTypeSelect) goodsTypeSelect.dispatchEvent(new Event('change'));
            if (multiSearchTypeSelect) multiSearchTypeSelect.value = 'or'; // 【復元】ドロップダウンリセット
            document.querySelectorAll('.civ-btn').forEach(b => {
                const isType = b.dataset.targetInput === 'mono_color' || b.dataset.targetInput === 'multi_color';
                b.classList.toggle('is-off', !isType);
                const input = document.getElementById(b.dataset.targetInput);
                if (input) input.value = isType ? '1' : '0';
            });
            sortOrderSelect.value = 'release_new';
            if (sortOrderHiddenInput) sortOrderHiddenInput.value = 'release_new';
            showSameNameCheck.checked = true;
            resetModalStates.forEach(f => f());
            updateCivilizationControls();
        });
    });

    if (backToTopBtn) {
        window.addEventListener('scroll', () => { backToTopBtn.style.display = (window.scrollY > 300) ? 'flex' : 'none'; });
        backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    // --- ⑤ モーダル関連 ---
    function getSortableString(str) { if (!str) return ''; return str.split('').map(char => CONFIG.SORT_MAP[char] || char).join(''); }
    
    function setupSearchModal(config) {
        const { modalType, hiddenInputName, displayClassName } = config;
        const selectBox = document.getElementById(`${modalType}-select-box`);
        const modal = document.getElementById(`${modalType}-modal`);
        if (!selectBox || !modal) return;
        const listEl = document.getElementById(`${modalType}-modal-list`);
        const searchInp = document.getElementById(`${modalType}-modal-search-input`);
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
                .map(item => `
                    <div class="race-list-item">
                        <label style="display:flex; justify-content:space-between; align-items:center; width:100%; cursor:pointer;">
                            <span>${escapeHTML(item.name)}</span>
                            <input type="checkbox" data-id="${item.id}" data-name="${escapeHTML(item.name)}" ${selectedItems.has(String(item.id)) ? 'checked' : ''}>
                        </label>
                    </div>`).join('');
        };

        selectBox.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (allItems.length === 0) fetch(`api.php?type=${modalType}`).then(res => res.json()).then(data => { allItems = data; render(data); });
            else render(allItems);
        });

        if (searchInp) {
            searchInp.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                render(allItems.filter(i => i.name.toLowerCase().includes(q) || (i.reading && i.reading.toLowerCase().includes(q))));
            });
        }

        modal.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const id = String(e.target.dataset.id);
                if (e.target.checked) selectedItems.set(id, e.target.dataset.name);
                else selectedItems.delete(id);
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
                clone.querySelector('.modal-card-instance').dataset.cardName = card.card_name;
                clone.querySelector('.modal-card-type').textContent = card.card_type;
                clone.querySelector('.modal-civilization').textContent = card.civilization;
                clone.querySelector('.modal-rarity').textContent = card.rarity;
                clone.querySelector('.modal-mana').textContent = card.mana ?? '---';
                clone.querySelector('.modal-illustrator').textContent = card.illustrator;
                clone.querySelector('.modal-power').textContent = card.pow == 2147483647 ? '∞' : (card.pow ?? '---');
                clone.querySelector('.modal-cost').textContent = card.cost == 2147483647 ? '∞' : (card.cost ?? '---');
                clone.querySelector('.modal-race').textContent = card.race;
                const dbg = clone.querySelector('.modal-debug-ability-names');
                if (dbg) dbg.textContent = (card.ability_names_debug || []).join('、') || '（なし）';
                clone.querySelector('.modal-card-image').src = card.image_url;
                if (card.text && card.text !== '（テキスト情報なし）') { clone.querySelector('.modal-text').innerHTML = card.text; clone.querySelector('.modal-ability-section').style.display = 'block'; }
                if (card.flavortext) { clone.querySelector('.modal-flavortext').innerHTML = card.flavortext; clone.querySelector('.modal-flavor-section').style.display = 'block'; }
                container.appendChild(clone);
                modalObserver.observe(container.lastElementChild);
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
    updateCivilizationControls(); // 初期化
});
