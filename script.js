// === 定数・設定の集約 ===
const CONFIG = {
    DM_INFINITY: 2147483647,
    SORT_MAP: { 'ぁ':'01a','あ':'01b','ぃ':'02a','い':'02b','ぅ':'03a','う':'03b','ぇ':'04a','え':'04b','ぉ':'05a','お':'05b','か':'06a','が':'06b','き':'07a','ぎ':'07b','く':'08a','ぐ':'08b','け':'09a','げ':'09b','こ':'10a','ご':'10b','さ':'11a','ざ':'11b','し':'12a','じ':'12b','す':'13a','ず':'13b','せ':'14a','ぜ':'14b','そ':'15a','ぞ':'15b','た':'16a','だ':'16b','ち':'17a','ぢ':'17b','っ':'18a','つ':'18b','づ':'18b','て':'19a','で':'19b','と':'20a','ど':'20b','な':'21a','に':'22a','ぬ':'23a','ね':'24a','の':'25a','は':'26a','ば':'26b','ぱ':'26c','ひ':'27a','び':'27b','ぴ':'27c','ふ':'28a','ぶ':'28b','ぷ':'28c','へ':'29a','べ':'29b','ぺ':'29c','ほ':'30a','ぼ':'30b','ぽ':'30c','ま':'31a','み':'32a','む':'33a','め':'34a','も':'35a','ゃ':'36a','や':'36b','ゅ':'37a','ゆ':'37b','ょ':'38a','よ':'38b','ら':'39a','り':'40a','る':'41a','れ':'42a','ろ':'43a','わ':'44a','を':'45a','ん':'46a','ー':'47a' }
};

document.addEventListener('DOMContentLoaded', () => {

    // --- ① 要素の取得 ---
    const searchForm = document.getElementById('searchForm');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultsContainer = document.querySelector('.container');
    const paginationContainer = document.querySelector('.pagination');
    const resultsSummary = document.querySelector('.search-results-summary p');
    const sortAreaElement = document.getElementById('sort-area');

    // 検索・文明ボタン関係
    const monoColorBtn = document.querySelector('[data-target-input="mono_color"]');
    const multiColorBtn = document.querySelector('[data-target-input="multi_color"]');
    const mainCivButtons = document.querySelectorAll('#main-civs-buttons .civ-btn');
    const multiSearchTypeSelect = document.getElementById('multi_search_type');

    // --- ② 共通処理（検索・UI制御） ---

    function performSearch(url) {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (resultsContainer) resultsContainer.style.opacity = '0.5';

        fetch(url)
            .then(response => response.text())
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                if (resultsSummary) resultsSummary.innerHTML = doc.querySelector('.search-results-summary p').innerHTML;
                if (resultsContainer) resultsContainer.innerHTML = doc.querySelector('.container').innerHTML;
                
                const newPagi = doc.querySelector('.pagination');
                if (paginationContainer) {
                    paginationContainer.innerHTML = newPagi ? newPagi.innerHTML : '';
                    paginationContainer.style.display = newPagi ? 'block' : 'none';
                }
                (sortAreaElement || resultsContainer).scrollIntoView({ behavior: 'smooth', block: 'start' });
            })
            .finally(() => {
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                if (resultsContainer) resultsContainer.style.opacity = '1';
            });
    }

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

        // 文明ボタンのクリック制御
        searchForm.addEventListener('click', (e) => {
            const btn = e.target.closest('.civ-btn');
            if (!btn) return;
            const target = document.getElementById(btn.dataset.targetInput);
            btn.classList.toggle('is-off');
            if (target) target.value = btn.classList.contains('is-off') ? '0' : (btn.dataset.civId || '1');
            updateCivilizationControls();
        });
    }

    // --- ④ モーダル内ソート・検索ロジック ---

    function getSortableString(str) {
        if (!str) return '';
        return str.split('').map(char => CONFIG.SORT_MAP[char] || char).join('');
    }

    function setupSearchModal(config) {
        const { modalType, hiddenInputName, displayClassName } = config;
        const selectBox = document.getElementById(`${modalType}-select-box`);
        const modal = document.getElementById(`${modalType}-modal`);
        if (!selectBox || !modal) return;

        let allItems = [];
        let selectedItems = new Map();

        const updateDisplay = () => {
            const display = document.querySelector(`.${displayClassName}`);
            const names = Array.from(selectedItems.values());
            display.textContent = names.length > 0 ? names.join('、') : '';
            selectBox.querySelector('.placeholder').style.display = names.length > 0 ? 'none' : 'block';
            
            // Hidden Inputの更新
            searchForm.querySelectorAll(`input[name="${hiddenInputName}"]`).forEach(el => el.remove());
            selectedItems.forEach((name, id) => {
                const input = document.createElement('input');
                input.type = 'hidden'; input.name = hiddenInputName; input.value = id;
                searchForm.appendChild(input);
            });
        };

        selectBox.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (allItems.length === 0) {
                fetch(`api.php?type=${modalType}`).then(res => res.json()).then(data => {
                    allItems = data;
                    renderList(data);
                });
            }
        });

        function renderList(items) {
            const listEl = document.getElementById(`${modalType}-modal-list`);
            listEl.innerHTML = items.sort((a, b) => getSortableString(a.reading).localeCompare(getSortableString(b.reading)))
                .map(item => `
                    <div class="race-list-item">
                        <label style="flex-grow:1; cursor:pointer;">${item.name}
                            <input type="checkbox" data-id="${item.id}" data-name="${item.name}" ${selectedItems.has(String(item.id)) ? 'checked' : ''}>
                        </label>
                    </div>
                `).join('');
        }

        modal.addEventListener('change', (e) => {
            const cb = e.target;
            if (cb.type === 'checkbox') {
                if (cb.checked) selectedItems.set(String(cb.dataset.id), cb.dataset.name);
                else selectedItems.delete(String(cb.dataset.id));
            }
        });

        modal.querySelector('.btn-primary').addEventListener('click', () => {
            updateDisplay();
            modal.style.display = 'none';
        });
        
        // クリア・キャンセル処理は適宜追加
    }

    setupSearchModal({ modalType: 'race', hiddenInputName: 'race_ids[]', displayClassName: 'selected-races-display' });
    setupSearchModal({ modalType: 'ability', hiddenInputName: 'ability_ids[]', displayClassName: 'selected-abilities-display' });
    setupSearchModal({ modalType: 'others', hiddenInputName: 'others_ids[]', displayClassName: 'selected-others-display' });
    setupSearchModal({ modalType: 'soul', hiddenInputName: 'soul_ids[]', displayClassName: 'selected-soul-display' });

    // --- ⑤ カード詳細モーダル ---

    function openCardDetailModal(cardId) {
        const modal = document.getElementById('card-modal');
        const container = document.getElementById('modal-cards-container');
        const title = document.getElementById('modal-card-name');
        const template = document.getElementById('modal-card-template');

        modal.style.display = 'flex';
        container.innerHTML = '';
        title.textContent = '読み込み中...';

        fetch(`get_card_details.php?id=${cardId}`)
            .then(res => res.json())
            .then(data => {
                data.cards.forEach(cardInfo => {
                    const clone = template.content.cloneNode(true);
                    
                    // 文字情報の埋め込み
                    clone.querySelector('.modal-card-type').textContent = cardInfo.card_type;
                    clone.querySelector('.modal-civilization').textContent = cardInfo.civilization;
                    clone.querySelector('.modal-power').textContent = cardInfo.pow == CONFIG.DM_INFINITY ? '∞' : (cardInfo.pow ?? '---');
                    clone.querySelector('.modal-cost').textContent = cardInfo.cost == CONFIG.DM_INFINITY ? '∞' : (cardInfo.cost ?? '---');
                    clone.querySelector('.modal-race').textContent = cardInfo.race;
                    clone.querySelector('.modal-debug-ability-names').textContent = (cardInfo.ability_names_debug || []).join('、') || '（なし）';
                    
                    // 画像
                    clone.querySelector('.modal-card-image').src = cardInfo.image_url;

                    // テキスト
                    if (cardInfo.text) {
                        clone.querySelector('.modal-text').innerHTML = cardInfo.text;
                        clone.querySelector('.modal-ability-section').style.display = 'block';
                    }
                    
                    container.appendChild(clone);
                });
                title.textContent = data.cards[0].card_name;
            });
    }

    document.body.addEventListener('click', (e) => {
        const img = e.target.closest('.card-image-item');
        if (img) openCardDetailModal(img.dataset.cardId);
        
        const close = e.target.closest('.close-btn');
        if (close) document.getElementById('card-modal').style.display = 'none';
    });
});
