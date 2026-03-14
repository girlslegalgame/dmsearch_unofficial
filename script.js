// === 定数・設定の集約 ===
const CONFIG = {
    DM_INFINITY: 2147483647,
    // 日本語ソート用マップ
    SORT_MAP: {'ぁ':'01a','あ':'01b','ぃ':'02a','い':'02b','ぅ':'03a','う':'03b','ぇ':'04a','え':'04b','ぉ':'05a','お':'05b','か':'06a','が':'06b','き':'07a','ぎ':'07b','く':'08a','ぐ':'08b','け':'09a','げ':'09b','こ':'10a','ご':'10b','さ':'11a','ざ':'11b','し':'12a','じ':'12b','す':'13a','ず':'13b','せ':'14a','ぜ':'14b','そ':'15a','ぞ':'15b','た':'16a','だ':'16b','ち':'17a','ぢ':'17b','っ':'18a','つ':'18b','づ':'18b','て':'19a','で':'19b','と':'20a','ど':'20b','な':'21a','に':'22a','ぬ':'23a','ね':'24a','の':'25a','は':'26a','ば':'26b','ぱ':'26c','ひ':'27a','び':'27b','ぴ':'27c','ふ':'28a','ぶ':'28b','ぷ':'28c','へ':'29a','べ':'29b','ぺ':'29c','ほ':'30a','ぼ':'30b','ぽ':'30c','ま':'31a','み':'32a','む':'33a','め':'34a','も':'35a','ゃ':'36a','や':'36b','ゅ':'37a','ゆ':'37b','ょ':'38a','よ':'38b','ら':'39a','り':'40a','る':'41a','れ':'42a','ろ':'43a','わ':'44a','を':'45a','ん':'46a','ー':'47a'}
};

document.addEventListener('DOMContentLoaded', () => {

    // --- ① 操作要素の取得 ---
    const searchForm = document.getElementById('searchForm');
    const resetButtons = document.querySelectorAll('.reset-button');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultsContainer = document.querySelector('.container');
    const paginationContainer = document.querySelector('.pagination');
    const resultsSummary = document.querySelector('.search-results-summary p');
    const sortAreaElement = document.getElementById('sort-area');
    
    // 文明検索用
    const monoColorBtn = document.querySelector('[data-target-input="mono_color"]');
    const multiColorBtn = document.querySelector('[data-target-input="multi_color"]');
    const mainCivButtons = document.querySelectorAll('#main-civs-buttons .civ-btn');
    const excludeSection = document.getElementById('exclude-civs-section');
    const excludeCivWrappers = document.querySelectorAll('.exclude-civ-wrapper');
    const multiSearchTypeSection = document.getElementById('multi-search-type-section');
    const multiSearchTypeSelect = document.getElementById('multi_search_type');

    // 数値入力・詳細設定
    const advancedSearchArea = document.getElementById('advanced-search-area');
    const toggleAdvancedBtn = document.getElementById('toggle-advanced-btn');
    const advancedStateInput = document.getElementById('advanced-state');
    const toggleBtn = document.getElementById('toggleBtn');
    const searchCheckboxes = document.querySelectorAll('.checkbox-container input[type="checkbox"]');
    const sortOrderSelect = document.getElementById('sort-order');
    const sortOrderHiddenInput = document.getElementById('sort-order-hidden');
    const showSameNameCheck = document.getElementById('show-same-name-check');

    // --- ② メイン制御関数 ---

    /**
     * 文明ボタンの表示・矛盾制御
     */
    function updateCivilizationControls() {
        if (!multiColorBtn || mainCivButtons.length === 0) return;

        const isMultiOn = !multiColorBtn.classList.contains('is-off');
        const selectedMainCivIds = [];
        mainCivButtons.forEach(btn => {
            if (!btn.classList.contains('is-off') && btn.dataset.civId !== '6') {
                selectedMainCivIds.push(btn.dataset.civId);
            }
        });
        const selectedCount = selectedMainCivIds.length;
        const isExactMode = (multiSearchTypeSelect && multiSearchTypeSelect.value === 'exact');

        if (multiSearchTypeSection) {
            multiSearchTypeSection.style.display = (isMultiOn && selectedCount >= 2) ? 'block' : 'none';
        }

        if (excludeSection) {
            if (isMultiOn && selectedCount >= 1 && (selectedCount < 2 || !isExactMode)) {
                excludeSection.style.display = 'block';
            } else {
                excludeSection.style.display = 'none';
            }
        }

        excludeCivWrappers.forEach(wrapper => {
            const civId = wrapper.id.replace('exclude-wrapper-', '');
            wrapper.style.display = selectedMainCivIds.includes(civId) ? 'none' : 'block';
        });
    }

    /**
     * 非同期検索実行
     */
    function performSearch(url) {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (resultsContainer) resultsContainer.style.opacity = '0.5';

        fetch(url)
            .then(response => response.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const newResults = doc.querySelector('.container');
                const newPagination = doc.querySelector('.pagination');
                const newSummary = doc.querySelector('.search-results-summary p');
                
                if (resultsSummary && newSummary) resultsSummary.innerHTML = newSummary.innerHTML;
                if (resultsContainer && newResults) resultsContainer.innerHTML = newResults.innerHTML;
                
                if (paginationContainer) {
                    paginationContainer.innerHTML = newPagination ? newPagination.innerHTML : '';
                    paginationContainer.style.display = newPagination ? 'block' : 'none';
                }
                
                const scrollTarget = sortAreaElement || resultsContainer;
                scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            })
            .catch(err => console.error('Fetch Error:', err))
            .finally(() => {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                if (resultsContainer) resultsContainer.style.opacity = '1';
            });
    }

    const triggerSearch = () => {
        if(searchForm) searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
    };

    // --- ③ イベントリスナー ---

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
            // 単色多色の最低片方はONにする
            if (button === monoColorBtn && isTurningOff && multiColorBtn.classList.contains('is-off')) return;
            if (button === multiColorBtn && isTurningOff && monoColorBtn.classList.contains('is-off')) return;
            
            button.classList.toggle('is-off');
            const targetInput = document.getElementById(button.dataset.targetInput);
            if (targetInput) {
                targetInput.value = button.classList.contains('is-off') ? '0' : (button.dataset.civId || '1');
            }

            // メイン文明がONになったら除外文明をOFFにする
            if (!button.classList.contains('is-off') && button.closest('#main-civs-buttons')) {
                const civId = button.dataset.civId;
                const exInput = document.getElementById(`exclude_civ_${civId}`);
                const exBtn = document.querySelector(`.exclude-civ-wrapper button[data-target-input="exclude_civ_${civId}"]`);
                if (exInput) exInput.value = '0';
                if (exBtn) exBtn.classList.add('is-off');
            }
            updateCivilizationControls();
        });
    }

    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', () => {
            if (sortOrderHiddenInput) sortOrderHiddenInput.value = sortOrderSelect.value;
            triggerSearch();
        });
    }
    if (showSameNameCheck) showSameNameCheck.addEventListener('change', triggerSearch);

    if (toggleAdvancedBtn) {
        toggleAdvancedBtn.addEventListener('click', () => {
            const isOpen = advancedSearchArea.classList.toggle('is-open');
            toggleAdvancedBtn.textContent = isOpen ? '条件を隠す' : 'さらに条件をしぼる';
            if(advancedStateInput) advancedStateInput.value = isOpen ? '1' : '0';
        });
    }

    // --- ④ モーダル関連 (種族・能力選択) ---

    let resetModalStates = []; 
    function getSortableString(str) {
        if (!str) return '';
        return str.split('').map(char => CONFIG.SORT_MAP[char] || char).join('');
    }

    function setupSearchModal(config) {
        const { modalType, hiddenInputName, displayClassName } = config; 
        const selectBox = document.getElementById(`${modalType}-select-box`);
        const modal = document.getElementById(`${modalType}-modal`);
        if (!selectBox || !modal) return;

        const modalSearchInput = document.getElementById(`${modalType}-modal-search-input`);
        const modalList = document.getElementById(`${modalType}-modal-list`);
        const displayArea = document.querySelector(`.${displayClassName}`); 
        const placeholder = selectBox.querySelector('.placeholder');

        let allItems = [];
        let selectedItems = new Map();

        const updateDisplay = () => {
            const names = Array.from(selectedItems.values());
            displayArea.textContent = names.length > 0 ? names.join('、') : '';
            placeholder.style.display = names.length > 0 ? 'none' : 'block';
            
            searchForm.querySelectorAll(`input[name="${hiddenInputName}"]`).forEach(el => el.remove());
            selectedItems.forEach((name, id) => {
                const input = document.createElement('input');
                input.type = 'hidden'; input.name = hiddenInputName; input.value = id;
                searchForm.appendChild(input);
            });
        };

        const render = (items) => {
            modalList.innerHTML = items.sort((a,b) => getSortableString(a.reading).localeCompare(getSortableString(b.reading)))
                .map(item => `
                    <div class="race-list-item">
                        <label style="flex-grow:1; cursor:pointer;">${item.name}
                            <input type="checkbox" data-id="${item.id}" data-name="${item.name}" ${selectedItems.has(String(item.id)) ? 'checked' : ''}>
                        </label>
                    </div>
                `).join('');
        };

        selectBox.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (allItems.length === 0) {
                fetch(`api.php?type=${modalType}`).then(res => res.json()).then(data => {
                    allItems = data; render(data);
                });
            } else { render(allItems); }
        });

        modal.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const id = String(e.target.dataset.id);
                if (e.target.checked) selectedItems.set(id, e.target.dataset.name);
                else selectedItems.delete(id);
            }
        });

        if (modalSearchInput) {
            modalSearchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = allItems.filter(i => i.name.toLowerCase().includes(query) || (i.reading && i.reading.toLowerCase().includes(query)));
                render(filtered);
            });
        }

        modal.querySelector('.btn-primary').addEventListener('click', () => {
            updateDisplay();
            modal.style.display = 'none';
        });
        
        modal.querySelector('.btn-secondary').addEventListener('click', () => modal.style.display = 'none');
        modal.querySelector('.modal-clear-btn').addEventListener('click', () => {
            selectedItems.clear(); render(allItems);
        });

        resetModalStates.push(() => { selectedItems.clear(); updateDisplay(); });
    }

    setupSearchModal({ modalType: 'race', hiddenInputName: 'race_ids[]', displayClassName: 'selected-races-display' });
    setupSearchModal({ modalType: 'ability', hiddenInputName: 'ability_ids[]', displayClassName: 'selected-abilities-display' });
    setupSearchModal({ modalType: 'others', hiddenInputName: 'others_ids[]', displayClassName: 'selected-others-display' });
    setupSearchModal({ modalType: 'soul', hiddenInputName: 'soul_ids[]', displayClassName: 'selected-soul-display' });

    // --- ⑤ カード詳細モーダル ---

    let modalObserver = null;
    const cardDetailModal = document.getElementById('card-modal');

    function openCardDetailModal(cardId) {
        const container = document.getElementById('modal-cards-container');
        const title = document.getElementById('modal-card-name');
        const template = document.getElementById('modal-card-template');

        cardDetailModal.style.display = 'flex';
        container.innerHTML = '';
        title.textContent = '読み込み中...';
        if (modalObserver) modalObserver.disconnect();

        fetch(`get_card_details.php?id=${cardId}`).then(res => res.json()).then(data => {
            if (data.error) { title.textContent = 'エラー'; return; }

            modalObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        title.textContent = entry.target.dataset.cardName;
                    }
                });
            }, { root: container, threshold: 0.5 });

            data.cards.forEach(cardInfo => {
                const clone = template.content.cloneNode(true);
                const instance = clone.querySelector('.modal-card-instance');
                instance.dataset.cardName = cardInfo.card_name;

                // 表データの代入
                clone.querySelector('.modal-card-type').textContent = cardInfo.card_type;
                clone.querySelector('.modal-civilization').textContent = cardInfo.civilization;
                clone.querySelector('.modal-rarity').textContent = cardInfo.rarity;
                clone.querySelector('.modal-mana').textContent = cardInfo.mana ?? '---';
                clone.querySelector('.modal-illustrator').textContent = cardInfo.illustrator;
                clone.querySelector('.modal-power').textContent = cardInfo.pow == CONFIG.DM_INFINITY ? '∞' : (cardInfo.pow ?? '---');
                clone.querySelector('.modal-cost').textContent = cardInfo.cost == CONFIG.DM_INFINITY ? '∞' : (cardInfo.cost ?? '---');
                clone.querySelector('.modal-race').textContent = cardInfo.race;
                
                // デバッグ特殊能力
                const debugEl = clone.querySelector('.modal-debug-ability-names');
                if (debugEl) debugEl.textContent = (cardInfo.ability_names_debug || []).join('、') || '（なし）';
                
                clone.querySelector('.modal-card-image').src = cardInfo.image_url;

                // テキストセクション
                if (cardInfo.text && cardInfo.text !== '（テキスト情報なし）') {
                    clone.querySelector('.modal-text').innerHTML = cardInfo.text;
                    clone.querySelector('.modal-ability-section').style.display = 'block';
                }
                if (cardInfo.flavortext) {
                    clone.querySelector('.modal-flavortext').innerHTML = cardInfo.flavortext;
                    clone.querySelector('.modal-flavor-section').style.display = 'block';
                }
                
                container.appendChild(clone);
                modalObserver.observe(instance);
            });
        });
    }

    // --- ⑥ 共通クリック・リセット処理 ---

    document.body.addEventListener('click', (e) => {
        // カードクリック
        const img = e.target.closest('.card-image-item');
        if (img) openCardDetailModal(img.dataset.cardId);
        
        // ページネーション
        const pag = e.target.closest('.pagination a');
        if (pag && !pag.classList.contains('current-page')) {
            e.preventDefault(); performSearch(pag.href);
        }

        // モーダル閉じる
        if (e.target.closest('.close-btn') || e.target === cardDetailModal) {
            cardDetailModal.style.display = 'none';
            if (modalObserver) modalObserver.disconnect();
        }
    });

    resetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            searchForm.reset();
            // 文明ボタンの初期化
            document.querySelectorAll('.civ-btn').forEach(b => {
                const isStatus = b.dataset.targetInput === 'mono_color' || b.dataset.targetInput === 'multi_color';
                b.classList.toggle('is-off', !isStatus);
                const input = document.getElementById(b.dataset.targetInput);
                if (input) input.value = isStatus ? '1' : '0';
            });
            resetModalStates.forEach(f => f());
            updateCivilizationControls();
            triggerSearch();
        });
    });

    // 初期化
    updateCivilizationControls();
});
