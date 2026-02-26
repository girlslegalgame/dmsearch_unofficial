// === ページの読み込み完了後に実行される処理 ===
document.addEventListener('DOMContentLoaded', () => {

    // --- ① 操作する要素をまとめて取得 ---
    const searchForm = document.getElementById('searchForm');
    const resetButtons = document.querySelectorAll('.reset-button');
    const toggleAdvancedBtn = document.getElementById('toggle-advanced-btn');
    const advancedSearchArea = document.getElementById('advanced-search-area');
    const advancedStateInput = document.getElementById('advanced-state');
    const toggleBtn = document.getElementById('toggleBtn');
    const searchCheckboxes = document.querySelectorAll('.checkbox-container input[type="checkbox"]');
    const monoColorBtn = document.querySelector('[data-target-input="mono_color"]');
    const multiColorBtn = document.querySelector('[data-target-input="multi_color"]');
    const mainCivButtons = document.querySelectorAll('#main-civs-buttons .civ-btn');
    const excludeSection = document.getElementById('exclude-civs-section');
    const excludeCivWrappers = document.querySelectorAll('.exclude-civ-wrapper');
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
    const resultsContainer = document.querySelector('.container');
    const paginationContainer = document.querySelector('.pagination');
    const resultsSummary = document.querySelector('.search-results-summary p');
    
    // スクロール先のターゲット（ならびかえエリア）
    const sortAreaElement = document.getElementById('sort-area');
    
    // --- ② メインの制御関数と、共有される変数 ---
    function updateCivilizationControls() {
        if (!multiColorBtn || mainCivButtons.length === 0) return;
        const isMultiOn = !multiColorBtn.classList.contains('is-off');
        const isAnyMainCivOnExcludingColorless = [...mainCivButtons].some(btn => !btn.classList.contains('is-off') && btn.dataset.civId !== '6');
        if (excludeSection) {
            excludeSection.style.display = (isMultiOn && isAnyMainCivOnExcludingColorless) ? 'block' : 'none';
        }
        const mainCivStatus = {};
        mainCivButtons.forEach(btn => { mainCivStatus[btn.dataset.civId] = !btn.classList.contains('is-off'); });
        excludeCivWrappers.forEach(wrapper => {
            const civId = wrapper.id.replace('exclude-wrapper-', '');
            wrapper.style.display = mainCivStatus[civId] === false ? 'block' : 'none';
        });
    }

    function performSearch(url) {
        if (resultsContainer) { resultsContainer.style.opacity = '0.5'; }
        fetch(url)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newResultsContainer = doc.querySelector('.container');
                const newPagination = doc.querySelector('.pagination');
                const newSummary = doc.querySelector('.search-results-summary p');
                if (resultsSummary && newSummary) { resultsSummary.innerHTML = newSummary.innerHTML; }
                if (resultsContainer && newResultsContainer) { resultsContainer.innerHTML = newResultsContainer.innerHTML; }
                if (paginationContainer) {
                    if (newPagination) {
                        paginationContainer.innerHTML = newPagination.innerHTML;
                        paginationContainer.style.display = 'block';
                    } else {
                        paginationContainer.innerHTML = '';
                        paginationContainer.style.display = 'none';
                    }
                }
                if (resultsContainer) {
                    // スムーズスクロール実行（ならびかえエリアをターゲットにする）
                    const scrollTarget = sortAreaElement || resultsContainer;
                    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    resultsContainer.style.opacity = '1';
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                if(resultsContainer) {
                    resultsContainer.innerHTML = "<p style='text-align:center; color: red;'>検索中にエラーが発生しました。</p>";
                    resultsContainer.style.opacity = '1';
                }
            });
    }
    const triggerSearch = () => {
        if(searchForm) searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
    };

    // --- ③ イベントリスナーの設定 ---
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

        // 【文明検索機能のイベントリスナー】
        searchForm.addEventListener('click', (e) => {
            const button = e.target.closest('.civ-btn');
            if (!button) return;
            const isTurningOff = !button.classList.contains('is-off');
            if (button === monoColorBtn && isTurningOff && multiColorBtn.classList.contains('is-off')) return;
            if (button === multiColorBtn && isTurningOff && monoColorBtn.classList.contains('is-off')) return;
            const targetInput = document.getElementById(button.dataset.targetInput);
            button.classList.toggle('is-off');
            if (targetInput) {
                targetInput.value = button.classList.contains('is-off') ? '0' : (button.dataset.civId || '1');
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
    if (showSameNameCheck) {
        showSameNameCheck.addEventListener('change', triggerSearch);
    }
    if (toggleAdvancedBtn) {
        toggleAdvancedBtn.addEventListener('click', () => {
            const isOpen = advancedSearchArea.classList.toggle('is-open');
            toggleAdvancedBtn.textContent = isOpen ? '条件を隠す' : 'さらに条件をしぼる';
            if(advancedStateInput) advancedStateInput.value = isOpen ? '1' : '0';
        });
    }
    if (goodsTypeSelect) {
        goodsTypeSelect.addEventListener('change', () => {
            fetch(`api.php?type=goods&goodstype_id=${goodsTypeSelect.value}`)
                .then(response => response.json())
                .then(data => {
                    if (goodsSelect) {
                        goodsSelect.innerHTML = '<option value="0">指定なし</option>';
                        data.forEach(goods => { goodsSelect.add(new Option(goods.name, goods.id)); });
                    }
                });
        });
    }

    const setupCheckboxToggle = (check1, check2, input1, input2) => {
        const toggleInputs = () => {
            const disable = (check1 && check1.checked) || (check2 && check2.checked);
            if(input1) input1.disabled = disable;
            if(input2) input2.disabled = disable;
            if (disable) {
                if(input1) input1.value = '';
                if(input2) input2.value = '';
            }
        };
        if(check1) check1.addEventListener('change', () => { if (check1.checked && check2) check2.checked = false; toggleInputs(); });
        if(check2) check2.addEventListener('change', () => { if (check2.checked && check1) check1.checked = false; toggleInputs(); });
        toggleInputs();
    };

    if (costZeroCheck && costInfinityCheck && costMinInput && costMaxInput) setupCheckboxToggle(costZeroCheck, costInfinityCheck, costMinInput, costMaxInput);
    if (powInfinityCheck && powMinInput && powMaxInput) setupCheckboxToggle(powInfinityCheck, null, powMinInput, powMaxInput);

    function updateToggleButtonLabel() {
        if (!toggleBtn) return;
        toggleBtn.textContent = [...searchCheckboxes].some(cb => cb.checked) ? '全解除' : '全選択';
    }
    function toggleCheckboxes() {
        const anyChecked = [...searchCheckboxes].some(cb => cb.checked);
        searchCheckboxes.forEach(cb => cb.checked = !anyChecked);
        updateToggleButtonLabel();
    }
    if (toggleBtn) toggleBtn.addEventListener('click', toggleCheckboxes);
    searchCheckboxes.forEach(cb => cb.addEventListener('change', updateToggleButtonLabel));

    // --- ④ グローバルなクリックイベントの司令塔 ---
    document.body.addEventListener('click', (e) => {
        const paginationLink = e.target.closest('.pagination a');
        if (paginationLink && !paginationLink.classList.contains('current-page')) {
            e.preventDefault();
            performSearch(paginationLink.href);
            return;
        }
        const cardImage = e.target.closest('.card-image-item');
        if (cardImage) {
            openCardDetailModal(cardImage.dataset.cardId);
            return;
        }
    });

    // --- ⑤ リセットボタンのイベントリスナー ---
    let resetModalStates = []; 
    function resetSearch() {
        const searchInput = document.querySelector('input[name="search"]');
        if (searchInput) searchInput.value = "";
        
        searchForm.reset(); // 標準要素のリセット

        // 文明ボタンの状態を手動リセット
        document.querySelectorAll('.civ-btn').forEach(button => {
            const targetInput = document.getElementById(button.dataset.targetInput);
            const buttonId = button.dataset.targetInput;
            if (buttonId === 'mono_color' || buttonId === 'multi_color') {
                button.classList.remove('is-off');
                if (targetInput) targetInput.value = '1';
            } else {
                button.classList.add('is-off');
                if (targetInput) targetInput.value = '0';
            }
        });

        // AND/ORラジオボタンのリセット
        ['race', 'ability', 'others', 'soul'].forEach(type => {
            const andRadio = document.getElementById(`${type}-and`);
            if(andRadio) andRadio.checked = true;
        });

        resetModalStates.forEach(resetFunc => resetFunc());
        updateToggleButtonLabel();
        updateCivilizationControls();
        if (goodsTypeSelect) goodsTypeSelect.dispatchEvent(new Event('change'));
        // triggerSearch(); // 指示により自動検索は行わない
    }
    if (resetButtons.length > 0) {
        resetButtons.forEach(button => { button.addEventListener('click', resetSearch); });
    }
    
    // --- ⑥ 初期化処理 ---
    updateToggleButtonLabel();
    updateCivilizationControls();

    // --- ⑦ 汎用ソート関数 と 検索モーダル設定のロジック ---
    function setupSearchModal(config) {
        const { modalType, hiddenInputName, displayClassName } = config; 
        const selectBox = document.getElementById(`${modalType}-select-box`);
        const modal = document.getElementById(`${modalType}-modal`);
        if (!selectBox || !modal) return;

        const modalClearBtn = document.getElementById(`${modalType}-modal-clear-btn`);
        const modalList = document.getElementById(`${modalType}-modal-list`);
        const modalCancelBtn = document.getElementById(`${modalType}-modal-cancel-btn`);
        const modalConfirmBtn = document.getElementById(`${modalType}-modal-confirm-btn`);
        const selectedDisplay = document.querySelector(`.${displayClassName}`); 
        const placeholder = selectBox.querySelector('.placeholder');

        let allItems = [];
        let selectedItems = new Map();

        function renderList(items) {
            if (!modalList) return;
            modalList.innerHTML = '';
            items.forEach(item => {
                const isChecked = selectedItems.has(String(item.id));
                const listItem = document.createElement('div');
                listItem.className = 'race-list-item';
                listItem.innerHTML = `<label for="${modalType}-${item.id}" style="flex-grow: 1; cursor: pointer; padding: 5px;">${item.name}</label><input type="checkbox" id="${modalType}-${item.id}" data-id="${item.id}" data-name="${item.name}" ${isChecked ? 'checked' : ''}>`;
                modalList.appendChild(listItem);
            });
        }

        const updateSelectedDisplay = function() {
            const itemNames = Array.from(selectedItems.values());
            if (itemNames.length > 0) {
                if(selectedDisplay) selectedDisplay.textContent = itemNames.join('、');
                if (placeholder) placeholder.style.display = 'none';
            } else {
                if(selectedDisplay) selectedDisplay.textContent = '';
                if (placeholder) placeholder.style.display = 'block';
            }
            const existingHiddenFields = searchForm.querySelectorAll(`input[name="${hiddenInputName}"]`);
            existingHiddenFields.forEach(field => field.remove());
            selectedItems.forEach((name, id) => {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = hiddenInputName;
                hiddenInput.value = id;
                searchForm.appendChild(hiddenInput);
            });
        }

        selectBox.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (allItems.length === 0) {
                fetch(`api.php?type=${modalType}&query=`)
                    .then(response => response.json())
                    .then(data => { allItems = data; renderList(allItems); });
            } else { renderList(allItems); }
        });

        const closeModal = () => { if (modal) modal.style.display = 'none'; };        
        if(modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
        if(modalConfirmBtn) modalConfirmBtn.addEventListener('click', () => { updateSelectedDisplay(); closeModal(); });

        if (modalList) {
            modalList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const id = String(e.target.dataset.id);
                    const name = e.target.dataset.name;
                    if (e.target.checked) selectedItems.set(id, name);
                    else selectedItems.delete(id);
                }
            });
        }
        resetModalStates.push(() => { selectedItems.clear(); updateSelectedDisplay(); });
    }

    setupSearchModal({ modalType: 'race', hiddenInputName: 'race_ids[]', displayClassName: 'selected-races-display' });
    setupSearchModal({ modalType: 'ability', hiddenInputName: 'ability_ids[]', displayClassName: 'selected-abilities-display' });
    setupSearchModal({ modalType: 'others', hiddenInputName: 'others_ids[]', displayClassName: 'selected-others-display' });
    setupSearchModal({ modalType: 'soul', hiddenInputName: 'soul_ids[]', displayClassName: 'selected-soul-display' });

    // --- ⑧ カード詳細モーダルのロジック ---
    const cardDetailModal = document.getElementById('card-modal');
    let modalObserver = null;

    function openCardDetailModal(cardId) {
        if (!cardId || !cardDetailModal) return;
        const modalCardsContainer = document.getElementById('modal-cards-container');
        const modalCardName = document.getElementById('modal-card-name');
        const modalCardTemplate = document.getElementById('modal-card-template');
        if(!modalCardsContainer || !modalCardName || !modalCardTemplate) return;

        modalCardsContainer.innerHTML = ''; 
        modalCardName.textContent = '読み込み中...';
        cardDetailModal.style.display = 'flex';

        if (modalObserver) modalObserver.disconnect();

        fetch(`get_card_details.php?id=${cardId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error || !data.cards || data.cards.length === 0) {
                    modalCardName.textContent = 'エラー';
                    modalCardsContainer.innerHTML = '<p style="text-align:center;">カード情報の取得に失敗しました。</p>';
                    return;
                }

                // IntersectionObserverの初期化（表示部分によって名前を変える）
                modalObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                            modalCardName.textContent = entry.target.dataset.cardName;
                        }
                    });
                }, { root: modalCardsContainer, threshold: 0.5 });

                data.cards.forEach((cardInfo, index) => {
                    const templateClone = modalCardTemplate.content.cloneNode(true);
                    const cardInstance = templateClone.querySelector('.modal-card-instance');
                    cardInstance.dataset.cardName = cardInfo.card_name;
                    const part = String.fromCharCode(97 + index);

                    templateClone.querySelector('.modal-card-type').textContent = cardInfo.card_type;
                    templateClone.querySelector('.modal-civilization').textContent = cardInfo.civilization;
                    templateClone.querySelector('.modal-rarity').textContent = cardInfo.rarity;
                    templateClone.querySelector('.modal-power').textContent = (cardInfo.pow == 2147483647) ? '∞' : (cardInfo.pow ?? '---');
                    templateClone.querySelector('.modal-cost').textContent = (cardInfo.cost == 2147483647) ? '∞' : (cardInfo.cost ?? '---');
                    templateClone.querySelector('.modal-mana').textContent = cardInfo.mana ?? '---';
                    templateClone.querySelector('.modal-race').textContent = cardInfo.race;
                    templateClone.querySelector('.modal-illustrator').textContent = cardInfo.illustrator;

                    // 【能力名表示の修正】
                    const abilityNamesDebugEl = templateClone.querySelector('.modal-debug-ability-names');
                    if (abilityNamesDebugEl) {
                        abilityNamesDebugEl.textContent = (cardInfo.ability_names_debug && cardInfo.ability_names_debug.length > 0) 
                            ? cardInfo.ability_names_debug.join('、') : '（なし）';
                    }

                    let imageUrl = 'path/to/placeholder.webp';
                    if (data.image_urls && data.image_urls[part]) {
                        imageUrl = data.image_urls[part];
                    } else if (cardInfo.modelnum) {
                        const parts = cardInfo.modelnum.split('-');
                        imageUrl = `card/${parts[0].toLowerCase()}/${cardInfo.modelnum}.webp`;
                    }
                    templateClone.querySelector('.modal-card-image').src = imageUrl;
                    templateClone.querySelector('.modal-card-image').alt = cardInfo.card_name;

                    const textSection = templateClone.querySelector('.modal-ability-section');
                    if (cardInfo.text && cardInfo.text !== '（テキスト情報なし）') {
                        templateClone.querySelector('.modal-text').innerHTML = cardInfo.text;
                        textSection.style.display = 'block';
                    }
                    const flavorSection = templateClone.querySelector('.modal-flavor-section');
                    if (cardInfo.flavortext) {
                        templateClone.querySelector('.modal-flavortext').innerHTML = cardInfo.flavortext;
                        flavorSection.style.display = 'block';
                    }

                    modalCardsContainer.appendChild(templateClone);
                    modalObserver.observe(cardInstance);
                });
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                modalCardName.textContent = 'エラー';
            });
    }

    if (cardDetailModal) {
        const closeModal = () => { 
            cardDetailModal.style.display = 'none';
            if (modalObserver) modalObserver.disconnect();
        };
        cardDetailModal.querySelector('.close-btn').addEventListener('click', closeModal);
        cardDetailModal.addEventListener('click', (e) => { if (e.target === cardDetailModal) closeModal(); });
    }
});
