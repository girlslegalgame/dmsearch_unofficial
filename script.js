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
    
    // --- ② メインの制御関数 ---
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
                    const urlParams = new URL(url, window.location.origin);
                    if (urlParams.search !== '' && urlParams.search !== '?') {
                         resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
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

    // --- モーダル設定ロジック ---
    function setupSearchModal(config) {
        const { modalType, hiddenInputName, displayClassName } = config; 
        const selectBox = document.getElementById(`${modalType}-select-box`);
        const modal = document.getElementById(`${modalType}-modal`);
        if (!selectBox || !modal) return;

        const modalClearBtn = document.getElementById(`${modalType}-modal-clear-btn`);
        const modalSearchInput = document.getElementById(`${modalType}-modal-search-input`);
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
                    .then(data => {
                        allItems = data;
                        renderList(allItems);
                    });
            } else {
                renderList(allItems);
            }
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

    let resetModalStates = [];
    setupSearchModal({ modalType: 'race', hiddenInputName: 'race_ids[]', displayClassName: 'selected-races-display' });
    setupSearchModal({ modalType: 'ability', hiddenInputName: 'ability_ids[]', displayClassName: 'selected-abilities-display' });
    setupSearchModal({ modalType: 'others', hiddenInputName: 'others_ids[]', displayClassName: 'selected-others-display' });
    setupSearchModal({ modalType: 'soul', hiddenInputName: 'soul_ids[]', displayClassName: 'selected-soul-display' });

    // --- ⑧ カード詳細モーダルのロジック ---
    const cardDetailModal = document.getElementById('card-modal');
    // 交差監視用オブジェクト（スクロール位置で名前を変えるため）
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

        // 前回の監視を解除
        if (modalObserver) modalObserver.disconnect();

        fetch(`get_card_details.php?id=${cardId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error || !data.cards || data.cards.length === 0) {
                    modalCardName.textContent = 'エラー';
                    modalCardsContainer.innerHTML = '<p style="text-align:center;">カード情報の取得に失敗しました。</p>';
                    return;
                }

                // IntersectionObserverの初期化
                modalObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        // 要素が半分以上(0.5)見えている場合にヘッダー名を更新
                        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                            modalCardName.textContent = entry.target.dataset.cardName;
                        }
                    });
                }, {
                    root: modalCardsContainer,
                    threshold: 0.5 // 半分見えたら切り替え
                });

                data.cards.forEach((cardInfo, index) => {
                    const templateClone = modalCardTemplate.content.cloneNode(true);
                    const cardInstance = templateClone.querySelector('.modal-card-instance');
                    
                    // 監視用のデータ属性をセット
                    cardInstance.dataset.cardName = cardInfo.card_name;
                    const part = String.fromCharCode(97 + index);

                    // 情報の埋め込み
                    templateClone.querySelector('.modal-card-type').textContent = cardInfo.card_type;
                    templateClone.querySelector('.modal-civilization').textContent = cardInfo.civilization;
                    templateClone.querySelector('.modal-rarity').textContent = cardInfo.rarity;
                    templateClone.querySelector('.modal-power').textContent = (cardInfo.pow == 2147483647) ? '∞' : (cardInfo.pow ?? '---');
                    templateClone.querySelector('.modal-cost').textContent = (cardInfo.cost == 2147483647) ? '∞' : (cardInfo.cost ?? '---');
                    templateClone.querySelector('.modal-mana').textContent = cardInfo.mana ?? '---';
                    templateClone.querySelector('.modal-race').textContent = cardInfo.race;
                    templateClone.querySelector('.modal-illustrator').textContent = cardInfo.illustrator;

                    // 画像設定
                    let imageUrl = 'path/to/placeholder.webp';
                    if (data.image_urls && data.image_urls[part]) {
                        imageUrl = data.image_urls[part];
                    } else if (cardInfo.modelnum) {
                        const parts = cardInfo.modelnum.split('-');
                        imageUrl = `card/${parts[0].toLowerCase()}/${cardInfo.modelnum}.webp`;
                    }
                    templateClone.querySelector('.modal-card-image').src = imageUrl;
                    templateClone.querySelector('.modal-card-image').alt = cardInfo.card_name;

                    // テキスト
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
                    // 追加した要素を監視対象にする
                    modalObserver.observe(cardInstance);
                });
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                modalCardName.textContent = 'エラー';
            });
    }

    // モーダルの閉じる処理
    if (cardDetailModal) {
        const closeModal = () => { 
            cardDetailModal.style.display = 'none';
            if (modalObserver) modalObserver.disconnect();
        };
        cardDetailModal.querySelector('.close-btn').addEventListener('click', closeModal);
        cardDetailModal.addEventListener('click', (e) => { if (e.target === cardDetailModal) closeModal(); });
    }

    // 画像クリックでモーダルを開く
    document.body.addEventListener('click', (e) => {
        const cardImage = e.target.closest('.card-image-item');
        if (cardImage) openCardDetailModal(cardImage.dataset.cardId);
    });
});
