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
    let selectedRaces = new Map();
    let updateSelectedRacesDisplay = () => {};

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
        if(check1) {
            check1.addEventListener('change', () => {
                if (check1.checked && check2) check2.checked = false;
                toggleInputs();
            });
        }
        if (check2) {
            check2.addEventListener('change', () => {
                if (check2.checked && check1) check1.checked = false;
                toggleInputs();
            });
        }
        toggleInputs();
    };
    if (costZeroCheck && costInfinityCheck && costMinInput && costMaxInput) {
        setupCheckboxToggle(costZeroCheck, costInfinityCheck, costMinInput, costMaxInput);
    }
    if (powInfinityCheck && powMinInput && powMaxInput) {
        setupCheckboxToggle(powInfinityCheck, null, powMinInput, powMaxInput);
    }
    if (searchForm) {
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

// --- ⑤ リセットボタンのイベントリスナー (真の最終版) ---

    function resetSearch() {
        // 1. テキスト入力
        const searchInput = document.querySelector('input[name="search"]');
        if (searchInput) searchInput.value = "";

        // 2. 検索対象チェックボックス
        const searchName = document.querySelector('input[name="search_name"]');
        const searchReading = document.querySelector('input[name="search_reading"]');
        const searchText = document.querySelector('input[name="search_text"]');
        if(searchName) searchName.checked = true;
        if(searchReading) searchReading.checked = true;
        if(searchText) searchText.checked = true;
        document.querySelectorAll('input[name="search_race"], input[name="search_flavortext"], input[name="search_illus"]').forEach(cb => { if(cb) cb.checked = false; });

        // 3. 文明ボタン
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

        // 4. コスト
        if (costMinInput) { costMinInput.value = ""; costMinInput.disabled = false; }
        if (costMaxInput) { costMaxInput.value = ""; costMaxInput.disabled = false; }
        if (costZeroCheck) costZeroCheck.checked = false;
        if (costInfinityCheck) costInfinityCheck.checked = false;

        // 5. パワー
        if (powMinInput) { powMinInput.value = ""; powMinInput.disabled = false; }
        if (powMaxInput) { powMaxInput.value = ""; powMaxInput.disabled = false; }
        if (powInfinityCheck) powInfinityCheck.checked = false;

        // 6. 発売年
        const yearMinInput = document.querySelector('input[name="year_min"]');
        const yearMaxInput = document.querySelector('input[name="year_max"]');
        if (yearMinInput) yearMinInput.value = "";
        if (yearMaxInput) yearMaxInput.value = "";
        
        // 7. その他詳細条件のドロップダウン (ならびかえは除く)
        document.querySelectorAll('select.styled-select, .select01 select, .is-empty2').forEach(select => {
             if (select.id !== 'sort-order') {
                 if (select.name === 'mana_filter') {
                    select.value = 'all';
                 } else {
                    select.value = '0';
                 }
             }
        });

        // 8. 種族選択UI
        if (typeof selectedRaces !== 'undefined' && selectedRaces.clear) {
            selectedRaces.clear();
        }
        if (typeof updateSelectedRacesDisplay !== 'undefined') {
            updateSelectedRacesDisplay();
        }
        
        // 9. 最後にUIの状態を更新
        updateToggleButtonLabel();
        updateCivilizationControls();
        if (goodsTypeSelect) {
            goodsTypeSelect.dispatchEvent(new Event('change'));
        }
    }

    if (resetButtons.length > 0) {
        resetButtons.forEach(button => {
            // ★★★ 再検索をトリガーしないように修正 ★★★
            button.addEventListener('click', resetSearch);
        });
    }    


// --- ⑥ 種族選択モーダルのロジック (真の最終版) ---
    const raceSelectBox = document.getElementById('race-select-box');
    const raceModal = document.getElementById('race-modal');
    if (raceSelectBox && raceModal) {
        const raceModalCloseBtn = raceModal.querySelector('.modal-header .close-btn');
        const raceModalClearBtn = document.getElementById('race-modal-clear-btn');
        const raceModalSearchInput = document.getElementById('race-modal-search-input');
        const raceModalList = document.getElementById('race-modal-list');
        const raceModalCancelBtn = document.getElementById('race-modal-cancel-btn');
        const raceModalConfirmBtn = document.getElementById('race-modal-confirm-btn');
        const selectedRacesDisplay = document.querySelector('.selected-races-display');
        const racePlaceholder = document.querySelector('.race-select-group .placeholder');
        
        let allRaces = []; // 全種族リストをキャッシュする場所
        let selectedRaces = new Map();

        // PHPのcustomRaceSortをJavaScriptで再現
        const sortMap = {'ゔぁ':'03c01','ゔぃ':'03c02','ゔぇ':'03c04','ゔぉ':'03c05','ヴァ':'03c01','ヴィ':'03c02','ヴェ':'03c04','ヴォ':'03c05','ぁ':'01a','あ':'01b','ぃ':'02a','い':'02b','ぅ':'03a','う':'03b','ぇ':'04a','え':'04b','ぉ':'05a','お':'05b','か':'06a','が':'06b','き':'07a','ぎ':'07b','く':'08a','ぐ':'08b','け':'09a','げ':'09b','こ':'10a','ご':'10b','さ':'11a','ざ':'11b','し':'12a','じ':'12b','す':'13a','ず':'13b','せ':'14a','ぜ':'14b','そ':'15a','ぞ':'15b','た':'16a','だ':'16b','ち':'17a','ぢ':'17b','っ':'18a','つ':'18b','づ':'18b','て':'19a','で':'19b','と':'20a','ど':'20b','な':'21a','に':'22a','ぬ':'23a','ね':'24a','の':'25a','は':'26a','ば':'26b','ぱ':'26c','ひ':'27a','び':'27b','ぴ':'27c','ふ':'28a','ぶ':'28b','ぷ':'28c','へ':'29a','べ':'29b','ぺ':'29c','ほ':'30a','ぼ':'30b','ぽ':'30c','ま':'31a','み':'32a','む':'33a','め':'34a','も':'35a','ゃ':'36a','や':'36b','ゅ':'37a','ゆ':'37b','ょ':'38a','よ':'38b','ら':'39a','り':'40a','る':'41a','れ':'42a','ろ':'43a','わ':'44a','を':'45a','ん':'46a','ー':'47a','ゔ':'03c03','ヴ':'03c03','ァ':'01a','ア':'01b','ィ':'02a','イ':'02b','ゥ':'03a','ウ':'03b','ェ':'04a','エ':'04b','ォ':'05a','オ':'05b','カ':'06a','ガ':'06b','キ':'07a','ギ':'07b','ク':'08a','グ':'08b','ケ':'09a','ゲ':'09b','コ':'10a','ゴ':'10b','サ':'11a','ザ':'11b','シ':'12a','ジ':'12b','ス':'13a','ズ':'13b','セ':'14a','ゼ':'14b','ソ':'15a','ゾ':'15b','タ':'16a','ダ':'16b','チ':'17a','ヂ':'17b','ッ':'18a','ツ':'18b','ヅ':'18b','テ':'19a','デ':'19b','ト':'20a','ド':'20b','ナ':'21a','ニ':'22a','ヌ':'23a','ネ':'24a','ノ':'25a','ハ':'26a','バ':'26b','パ':'26c','ヒ':'27a','ビ':'27b','ピ':'27c','フ':'28a','ブ':'28b','プ':'28c','ヘ':'29a','ベ':'29b','ペ':'29c','ホ':'30a','ボ':'30b','ポ':'30c','マ':'31a','ミ':'32a','ム':'33a','メ':'34a','モ':'35a','ャ':'36a','ヤ':'36b','ュ':'37a','ユ':'37b','ョ':'38a','ヨ':'38b','ラ':'39a','リ':'40a','ル':'41a','レ':'42a','ロ':'43a','ワ':'44a','ヲ':'45a','ン':'46a'};
        function getSortableString(str) {
            if (!str) return '';
            return str.split('').map(char => sortMap[char] || char).join('');
        }
        function customRaceSortJS(a, b) {
            const readingA = a.reading || '';
            const readingB = b.reading || '';
            const sortA = getSortableString(readingA);
            const sortB = getSortableString(readingB);
            return sortA.localeCompare(sortB);
        }

        function renderRaceList(races) {
            if (!raceModalList) return;
            raceModalList.innerHTML = '';
            races.sort(customRaceSortJS);
            races.forEach(race => {
                const isChecked = selectedRaces.has(String(race.id));
                const item = document.createElement('div');
                item.className = 'race-list-item';
                item.innerHTML = `<label for="race-${race.id}" style="flex-grow: 1; cursor: pointer; padding: 5px;">${race.name}</label><input type="checkbox" id="race-${race.id}" data-id="${race.id}" data-name="${race.name}" ${isChecked ? 'checked' : ''}>`;
                raceModalList.appendChild(item);
            });
        }
        updateSelectedRacesDisplay = function() {
            const raceNames = Array.from(selectedRaces.values());
            if (raceNames.length > 0) {
                if(selectedRacesDisplay) selectedRacesDisplay.textContent = raceNames.join('、');
                if (racePlaceholder) racePlaceholder.style.display = 'none';
            } else {
                if(selectedRacesDisplay) selectedRacesDisplay.textContent = '';
                if (racePlaceholder) racePlaceholder.style.display = 'block';
            }
            const existingHiddenFields = searchForm.querySelectorAll('input[name="race_ids[]"]');
            existingHiddenFields.forEach(field => field.remove());
            selectedRaces.forEach((name, id) => {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'race_ids[]';
                hiddenInput.value = id;
                searchForm.appendChild(hiddenInput);
            });
        }
        
        // ★★★ サジェスト検索とリスト表示を担う、唯一の関数 ★★★
        function updateRaceList() {
            const query = raceModalSearchInput ? raceModalSearchInput.value.toLowerCase() : '';
            const filteredRaces = allRaces.filter(r => {
                const nameMatch = r.name.toLowerCase().includes(query);
                const readingMatch = r.reading ? r.reading.toLowerCase().includes(query) : false;
                return nameMatch || readingMatch;
            });
            renderRaceList(filteredRaces);
        }

        raceSelectBox.addEventListener('click', () => {
            raceModal.style.display = 'flex';
            if (allRaces.length === 0) {
                fetch('api.php?type=race&query=')
                    .then(response => response.json())
                    .then(data => {
                        allRaces = data;
                        updateRaceList();
                    });
            } else {
                updateRaceList();
            }
        });
        
        const closeRaceModal = () => { if(raceModal) raceModal.style.display = 'none'; };
        if(raceModalCloseBtn) raceModalCloseBtn.addEventListener('click', closeRaceModal);
        if(raceModalCancelBtn) raceModalCancelBtn.addEventListener('click', closeRaceModal);
        const raceModalOverlay = raceModal.closest('.modal-overlay');
        if(raceModalOverlay) {
            raceModalOverlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) closeRaceModal();
            });
        }

        if (raceModalClearBtn) {
            raceModalClearBtn.addEventListener('click', () => {
                selectedRaces.clear();
                updateRaceList();
            });
        }
        if (raceModalConfirmBtn) {
            raceModalConfirmBtn.addEventListener('click', () => {
                updateSelectedRacesDisplay();
                closeRaceModal();
            });
        }
        if (raceModalList) {
            raceModalList.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const id = String(e.target.dataset.id);
                    const name = e.target.dataset.name;
                    if (e.target.checked) {
                        selectedRaces.set(id, name);
                    } else {
                        selectedRaces.delete(id);
                    }
                }
            });
        }

        let debounceTimeout;
        if (raceModalSearchInput) {
            raceModalSearchInput.addEventListener('input', () => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(updateRaceList, 250);
            });
            raceModalSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            });
        }
        
        const initialRaceFields = document.querySelectorAll('input[name="race_ids[]"]');
        if (initialRaceFields.length > 0) {
            if (allRaces.length === 0) {
                 fetch('api.php?type=race&query=')
                    .then(response => response.json())
                    .then(data => {
                        allRaces = data;
                        const raceMap = new Map(allRaces.map(r => [String(r.id), r.name]));
                        initialRaceFields.forEach(field => {
                            const id = field.value;
                            if (raceMap.has(id)) {
                                selectedRaces.set(id, raceMap.get(id));
                            }
                        });
                        updateSelectedRacesDisplay();
                    });
            }
        } else {
            updateSelectedRacesDisplay();
        }
    }
    // --- ⑧ カード詳細モーダルのロジック ---
    const cardDetailModal = document.getElementById('card-modal');
    function openCardDetailModal(cardId) {
        if (!cardId || !cardDetailModal) return;
        const modalCardsContainer = document.getElementById('modal-cards-container');
        const modalCardName = document.getElementById('modal-card-name');
        const modalCardTemplate = document.getElementById('modal-card-template');
        if(!modalCardsContainer || !modalCardName || !modalCardTemplate) return;
        modalCardsContainer.innerHTML = ''; 
        modalCardName.textContent = '読み込み中...';
        cardDetailModal.style.display = 'flex';
        fetch(`get_card_details.php?id=${cardId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error || !data.cards || data.cards.length === 0) {
                    modalCardName.textContent = 'エラー';
                    modalCardsContainer.innerHTML = '<p style="text-align:center;">カード情報の取得に失敗しました。</p>';
                    return;
                }
                modalCardName.textContent = data.set_name || data.cards[0].card_name;
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
                    let imageUrl = 'path/to/placeholder.webp';
                    if (cardInfo.modelnum) {
                        const parts = cardInfo.modelnum.split('-');
                        const seriesFolder = parts.length > 0 ? parts[0].toLowerCase() : '';
                        if (seriesFolder) {
                            if (data.is_set && data.image_urls && data.image_urls[part]) {
                                imageUrl = data.image_urls[part];
                            } else {
                                imageUrl = `card/${seriesFolder}/${cardInfo.modelnum}.webp`;
                            }
                        }
                    }
                    templateClone.querySelector('.modal-card-image').src = imageUrl;
                    templateClone.querySelector('.modal-card-image').alt = cardInfo.card_name;
                    const textSection = templateClone.querySelector('.modal-ability-section');
                    let abilityText = data.is_set ? 
                        ((data.texts && data.texts[part]) ? formatAbilityText(data.texts[part]) : '（テキスト情報なし）') : 
                        cardInfo.text;
                    if (abilityText && abilityText !== '（テキスト情報なし）') {
                        templateClone.querySelector('.modal-text').innerHTML = abilityText;
                        textSection.style.display = 'block';
                    }
                    const flavorSection = templateClone.querySelector('.modal-flavor-section');
                    let flavorText = data.is_set ? 
                        ((data.flavortexts && data.flavortexts[part]) ? formatFlavorText(data.flavortexts[part]) : null) :
                        cardInfo.flavortext;
                    if (flavorText) {
                        templateClone.querySelector('.modal-flavortext').innerHTML = flavorText;
                        flavorSection.style.display = 'block';
                    }
                    modalCardsContainer.appendChild(templateClone);
                });
                if (data.is_set && data.cards.length > 0) {
                    modalCardName.textContent = data.cards[0].card_name;
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                modalCardName.textContent = 'エラー';
                modalCardsContainer.innerHTML = '<p style="text-align:center;">通信エラーが発生しました。</p>';
            });
    }
    if (cardDetailModal) {
        const modalCloseBtn = cardDetailModal.querySelector('.modal-header .close-btn');
        const modalOverlay = cardDetailModal.closest('.modal-overlay');
        const closeModal = () => {
            if (cardDetailModal) cardDetailModal.style.display = 'none';
        };
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
        if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cardDetailModal && cardDetailModal.style.display !== 'none') {
                closeModal();
            }
        });
    }
    function formatAbilityText(rawText) {
        if (!rawText || rawText.trim() === '') return '（テキスト情報なし）';
        const iconMap = {
                '{ST}' : '<img src="parts/card_list_strigger.webp" alt="S-Trigger" class="text-icon">',
                '{BR}' : '<img src="parts/card_list_block.webp" alt="Blocker" class="text-icon">',
                '{SV}' : '<img src="parts/card_list_survivor.webp" alt="Survivor" class="text-icon">',
                '{TT}' : '<img src="parts/card_list_taptrigger.webp" alt="Tap-Trigger" class="text-icon">',
                '{TR}' : '<img src="parts/card_list_turborush.webp" alt="Turbo-Rush" class="text-icon">',
                '{SS}' : '<img src="parts/card_list_silentskill.webp" alt="Silent_Skill" class="text-icon">',
                '{WS}' : '<img src="parts/card_list_wavestriker.webp" alt="Wave_Striker" class="text-icon">',
                '{MM}' : '<img src="parts/card_list_metamorph.webp" alt="Metamorph" class="text-icon">',
                '{AC}' : '<img src="parts/card_list_accel.webp" alt="Accel" class="text-icon">',
                '{SB}' : '<img src="parts/card_list_strike_back.webp" alt="Strike-Back" class="text-icon">',
                '{FE}' : '<img src="parts/card_list_fortenergy.webp" alt="Fort-Energy" class="text-icon">'
        };
        const iconTags = Object.keys(iconMap);
        return rawText.split('\n').map(line => {
            let trimmed = line.trim();
            if (trimmed === '') return null;
            const isIndented = trimmed.toUpperCase().startsWith('{TAB}');
            if (isIndented) { trimmed = trimmed.substring(5).trim(); }
            const startsWithIcon = iconTags.some(tag => trimmed.toUpperCase().startsWith(tag.toUpperCase()));
            const isParenthetical = trimmed.startsWith('(') && trimmed.endsWith(')');
            let processedLine = trimmed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            for (const tag of iconTags) {
                processedLine = processedLine.replace(new RegExp(tag.replace(/\{/g, '\\{').replace(/\}/g, '\\}'), 'gi'), iconMap[tag]);
            }
            let prefix = '';
            let wrapperClass = '';
            if (isIndented) {
                wrapperClass = ' class="indented-text"';
                if (!startsWithIcon) { prefix = '▶ '; }
            } else if (!startsWithIcon && !isParenthetical) {
                prefix = '■ ';
            }
            return `<span${wrapperClass}>${prefix}${processedLine}</span>`;
        }).filter(line => line !== null).join('<br>');
    }
    function formatFlavorText(rawText) {
         if (!rawText || rawText.trim() === '') return null;
         const escaped = rawText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
         return escaped.replace(/\n/g, '<br>');
    }
});
