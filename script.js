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

    // --- 非同期更新で差し替える要素 ---
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

    // --- 非同期検索の心臓部 ---
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
    document.body.addEventListener('click', (e) => {
        const paginationLink = e.target.closest('.pagination a');
        if(!paginationLink || paginationLink.classList.contains('current-page')) return;
        e.preventDefault();
        const newUrl = paginationLink.href;
        history.pushState({path: newUrl}, '', newUrl);
        performSearch(newUrl);
    });
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

    // --- ④ リセットボタンのイベントリスナー (安定版) ---
    function resetSearch() {
        const searchInput = document.querySelector('input[name="search"]');
        if (searchInput) searchInput.value = "";
        if (costMinInput) { costMinInput.value = ""; costMinInput.disabled = false; }
        if (costMaxInput) { costMaxInput.value = ""; costMaxInput.disabled = false; }
        if (costZeroCheck) costZeroCheck.checked = false;
        if (costInfinityCheck) costInfinityCheck.checked = false;
        if (powMinInput) { powMinInput.value = ""; powMinInput.disabled = false; }
        if (powMaxInput) { powMaxInput.value = ""; powMaxInput.disabled = false; }
        if (powInfinityCheck) powInfinityCheck.checked = false;
        const yearMinInput = document.querySelector('input[name="year_min"]');
        const yearMaxInput = document.querySelector('input[name="year_max"]');
        if (yearMinInput) yearMinInput.value = "";
        if (yearMaxInput) yearMaxInput.value = "";
        document.querySelectorAll('select.styled-select, select.is-empty2').forEach(select => {
             if (select.id !== 'sort-order') {
                 if (select.name === 'mana_filter') { select.value = 'all'; } 
                 else { select.value = '0'; }
             }
        });
        const searchName = document.querySelector('input[name="search_name"]');
        const searchReading = document.querySelector('input[name="search_reading"]');
        const searchText = document.querySelector('input[name="search_text"]');
        if(searchName) searchName.checked = true;
        if(searchReading) searchReading.checked = true;
        if(searchText) searchText.checked = true;
        document.querySelectorAll('input[name="search_race"], input[name="search_flavortext"], input[name="search_illus"]').forEach(cb => cb.checked = false);
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
        updateToggleButtonLabel();
        updateCivilizationControls();
        if (goodsTypeSelect) goodsTypeSelect.dispatchEvent(new Event('change'));
    }
    if (resetButtons.length > 0) {
        resetButtons.forEach(button => {
            button.addEventListener('click', () => {
                resetSearch();
                // triggerSearch(); // リセット後に検索するかどうかは要件次第
            });
        });
    }
    
    // --- ⑤ 初期化処理 ---
    updateToggleButtonLabel();
    updateCivilizationControls();

    // --- ⑥ モーダル機能 ---
    const modal = document.getElementById('card-modal');
    if (modal) {
        const modalCloseBtn = document.getElementById('modal-close-btn');
        const modalOverlay = document.querySelector('.modal-overlay');
        const modalCardName = document.getElementById('modal-card-name');
        const modalCardsContainer = document.getElementById('modal-cards-container');
        const modalCardTemplate = document.getElementById('modal-card-template');
        let scrollTimeout;
        const updateModalHeaderOnScroll = () => {
            const cardInstances = modalCardsContainer.querySelectorAll('.modal-card-instance');
            if (cardInstances.length <= 1) return;
            let topVisibleCardName = '';
            for (const instance of cardInstances) {
                const rect = instance.getBoundingClientRect();
                const modalRect = modalCardsContainer.getBoundingClientRect();
                if (rect.top >= modalRect.top && rect.top < modalRect.bottom) {
                    topVisibleCardName = instance.dataset.cardName;
                    break;
                }
            }
            if (topVisibleCardName) {
                modalCardName.textContent = topVisibleCardName;
            }
        };
        modalCardsContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(updateModalHeaderOnScroll, 50);
        });
        
        document.body.addEventListener('click', (e) => {
            const cardImage = e.target.closest('.card-image-item');
            if (!cardImage) return;
            const cardId = cardImage.dataset.cardId;
            if (!cardId) return;
            
            modalCardsContainer.innerHTML = ''; 
            modalCardName.textContent = '読み込み中...';
            modal.style.display = 'flex';
            fetch(`get_card_details.php?id=${cardId}`)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    if (data.error || !data.cards || data.cards.length === 0) {
                        console.error('API Error:', data.error || 'No cards found');
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
        });
        
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
                
                // 1. 各種フラグをチェック (大文字小文字を区別しない)
                const isIndented = trimmed.toUpperCase().startsWith('{TAB}');
                if (isIndented) {
                    trimmed = trimmed.substring(5).trim();
                }
        
                const startsWithIcon = iconTags.some(tag => trimmed.toUpperCase().startsWith(tag.toUpperCase()));
                const isParenthetical = trimmed.startsWith('(') && trimmed.endsWith(')');
        
                // 2. HTMLエスケープとアイコン置換 (大文字小文字を区別しない)
                let processedLine = trimmed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                for (const tag of iconTags) {
                    processedLine = processedLine.replace(new RegExp(tag.replace(/\{/g, '\\{').replace(/\}/g, '\\}'), 'gi'), iconMap[tag.toLowerCase()] || iconMap[tag.toUpperCase()]);
                }
                
                // 3. 行頭記号と字下げクラスを決定
                let prefix = '';
                let wrapperClass = '';
        
                if (isIndented) {
                    wrapperClass = ' class="indented-text"';
                    if (!startsWithIcon) {
                        prefix = '▶ ';
                    }
                } else if (!startsWithIcon && !isParenthetical) {
                    prefix = '■ ';
                }
        
                // 4. 最終的なHTMLを組み立てる
                return `<span${wrapperClass}>${prefix}${processedLine}</span>`;
        
            }).filter(line => line !== null).join('<br>');
        }
        function formatFlavorText(rawText) {
             if (!rawText || rawText.trim() === '') return null;
             const escaped = rawText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
             return escaped.replace(/\n/g, '<br>');
        }
        
        const closeModal = () => {
            if (modal) modal.style.display = 'none';
        };
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
        if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
                closeModal();
            }
        });
    }
});
