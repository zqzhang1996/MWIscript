// ==UserScript==
// @name         MWI_Expected_Quantity_Helper
// @namespace    http://tampermonkey.net/
// @version      4.9.9
// @description  对三采和烹饪冲泡，添加一个数量栏显示期望产物数量，也可输入期望数量反推期望采集次数。
// @author       zqzhang1996
// @icon         https://www.milkywayidle.com/favicon.svg
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @require      https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js
// @require      https://update.greasyfork.org/scripts/550719/1677027/MWI_Toolkit.js
// @grant        none
// @run-at       document-body
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 硬编码加工表
    const processingItems = {
        "milk": "cheese",
        "verdant_milk": "verdant_cheese",
        "azure_milk": "azure_cheese",
        "burble_milk": "burble_cheese",
        "crimson_milk": "crimson_cheese",
        "rainbow_milk": "rainbow_cheese",
        "holy_milk": "holy_cheese",
        "log": "lumber",
        "birch_log": "birch_lumber",
        "cedar_log": "cedar_lumber",
        "purpleheart_log": "purpleheart_lumber",
        "ginkgo_log": "ginkgo_lumber",
        "redwood_log": "redwood_lumber",
        "arcane_log": "arcane_lumber",
        "cotton": "cotton_fabric",
        "flax": "linen_fabric",
        "bamboo_branch": "bamboo_fabric",
        "cocoon": "silk_fabric",
        "radiant_fiber": "radiant_fabric"
    };

    function insertQuantityInput() {
        const skillType = getCurrentSkillType();
        // 仅处理五种情况，其余直接返回
        if (!['milking', 'foraging', 'woodcutting', 'cooking', 'brewing'].includes(skillType)) return;

        const origBlocks = document.querySelectorAll('[class^="SkillActionDetail_maxActionCountInput"]');
        if (origBlocks.length != 1) return; // 大于1说明已经插入过
        const origBlock = origBlocks[0];

        // 获取所有产出物品
        const items = getAllDropItems();
        if (!items.length) return;

        // 对所有产出物品都插入数量栏，并与“次数”栏联动
        let lastBlock = origBlock;
        // 获取“次数”输入框和按钮
        const timesInput = origBlock.querySelector('input');
        const buttons = origBlock.querySelectorAll('button');
        // 联动循环保护
        let linking = false;
        // 保存所有数量栏及其对应的averageCount
        const qtyInputs = [];
        items.forEach((item, idx) => {
            const { newBlock, input: qtyInput } = createQuantityRowBlock(item);
            if (newBlock && qtyInput) {
                lastBlock.parentNode.insertBefore(newBlock, lastBlock.nextSibling);
                lastBlock = newBlock;
                qtyInputs.push({ input: qtyInput, avg: item.averageCount });
            }
        });

        // “次数”栏内容变化时，更新所有“数量”栏
        function updateQtyFromTimes() {
            if (linking) return;
            linking = true;
            let times = timesInput.value;
            if (times === '∞' || times === '' || times === undefined || times === null) {
                qtyInputs.forEach(({ input }) => input.value = '∞');
                linking = false;
                return;
            }
            times = parseTimes(times);
            if (!isFinite(times) || times <= 0) {
                qtyInputs.forEach(({ input }) => input.value = '');
                linking = false;
                return;
            }
            qtyInputs.forEach(({ input, avg }) => {
                const expected = times * (avg || 1);
                if (!isFinite(expected)) {
                    input.value = '∞';
                } else {
                    input.value = Math.round(expected);
                }
            });
            linking = false;
        }
        // “数量”栏变化时，更新“次数”栏和所有数量栏（完全联动）
        function updateTimesFromQty(e) {
            if (linking) return;
            linking = true;
            // 找到当前触发的input
            const idx = qtyInputs.findIndex(q => q.input === e.target);
            if (idx === -1) {
                linking = false;
                return;
            }
            let qty = e.target.value;
            if (qty === '∞' || qty === '' || qty === undefined || qty === null) {
                reactInputTriggerHack(timesInput, '∞');
                qtyInputs.forEach(({ input }) => { if (input !== e.target) input.value = '∞'; });
                linking = false;
                return;
            }
            qty = parseQty(qty);
            if (!isFinite(qty) || qty <= 0) {
                reactInputTriggerHack(timesInput, '');
                qtyInputs.forEach(({ input }) => { if (input !== e.target) input.value = ''; });
                linking = false;
                return;
            }
            const avg = qtyInputs[idx].avg || 1;
            const times = Math.max(Math.ceil(qty / avg - 1e-6), 1);
            reactInputTriggerHack(timesInput, times.toString());
            // 重新计算所有数量栏
            qtyInputs.forEach(({ input, avg: otherAvg }, i) => {
                if (i !== idx) {
                    const expected = times * (otherAvg || 1);
                    input.value = Math.round(expected);
                }
            });
            linking = false;
        }

        // “次数”输入框联动
        timesInput.addEventListener('input', updateQtyFromTimes);
        // “数量”输入框联动
        qtyInputs.forEach(({ input }) => {
            input.addEventListener('input', updateTimesFromQty);
        });
        // 按钮联动监听
        for (const btn of buttons) {
            btn.addEventListener('click', () => {
                setTimeout(() => {
                    updateQtyFromTimes();
                }, 20);
            });
        }
        // 初次填充
        setTimeout(updateQtyFromTimes, 120);
    }

    // 创建一个数量栏，返回 {newBlock, input}
    function createQuantityRowBlock(item) {
        const origBlock = document.querySelector('[class^="SkillActionDetail_maxActionCountInput"]');
        if (!origBlock) return null;

        // 克隆外层div（不带子内容）
        const newBlock = origBlock.cloneNode(false);

        // 图标
        const origIconContainer = document.querySelector('[class^="SkillActionDetail_drop"] [class*="Item_iconContainer"]');
        const iconContainer = origIconContainer.cloneNode(true);
        const svg = iconContainer.querySelector('svg');
        if (svg) {
            svg.setAttribute('aria-label', item.displayName); // 修改 aria-label
            const use = svg.querySelector('use');
            if (use) {
                use.setAttribute('href', item.iconHref); // 修改 href
            }
        }
        const originalActionLabel = document.querySelector('[class^="SkillActionDetail_actionContainer"] [class^="SkillActionDetail_label"]');
        const label = originalActionLabel.cloneNode(false); // 不带原内容
        iconContainer.style.width = window.getComputedStyle(originalActionLabel).width;
        iconContainer.style.height = window.getComputedStyle(originalActionLabel).height;

        if (Object.values(processingItems).includes(item.name)) {
            const tab = iconContainer.cloneNode(false);
            tab.className = 'SkillActionDetail_tab';
            tab.textContent = '┗';
            newBlock.appendChild(tab);
        }

        label.appendChild(iconContainer);
        newBlock.appendChild(label);

        // 输入框
        const origInputWrap = origBlock.querySelector('[class^="SkillActionDetail_input"]');
        const inputWrap = origInputWrap.cloneNode(true);
        const origInput = origInputWrap.querySelector('input');
        const input = inputWrap.querySelector('input');
        input.addEventListener('focus', function () {
            setTimeout(() => {
                input.select();
            }, 0);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                if (origInput) {
                    const event = new KeyboardEvent('keydown', {
                        bubbles: true,
                        cancelable: true,
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13
                    });
                    origInput.dispatchEvent(event);
                }
            }
        });
        newBlock.appendChild(inputWrap);

        if (!Object.values(processingItems).includes(item.name)) {
            // 快捷填充按钮
            const btns = [
                { val: 1000, txt: '1k' },
                { val: 2000, txt: '2k' },
                { val: 5000, txt: '5k' }
            ];
            const origButtons = origBlock.querySelectorAll('button');
            let buttonClass = '';
            if (origButtons.length > 0) buttonClass = origButtons[0].className;

            btns.forEach(({ val, txt }) => {
                const btn = document.createElement('button');
                btn.className = buttonClass;
                btn.textContent = txt;
                btn.addEventListener('click', () => {
                    input.value = val;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                });
                newBlock.appendChild(btn);
            });
        }

        return { newBlock, input };
    }

    // 获取所有产出物品，返回数组 [{name, iconHref, averageCount}]
    function getAllDropItems() {
        const skillType = getCurrentSkillType();
        if (!['milking', 'foraging', 'woodcutting', 'cooking', 'brewing'].includes(skillType)) return [];

        const SkillActionDetail = document.querySelector('[class^="SkillActionDetail_outputItems"]') || document.querySelector('[class^="SkillActionDetail_dropTable"]');
        const itemContainers = SkillActionDetail?.querySelectorAll('[class^="Item_itemContainer"]');
        if (!itemContainers || itemContainers.length === 0) return [];

        const drinkSlots = getDrinkSlots();
        const drinkConcentration = getDrinkConcentration();

        const items = [];
        itemContainers.forEach(itemContainer => {
            const iconHref = itemContainer.querySelector('svg use').getAttribute('href');
            const name = iconHref.split('#')[1];

            if (skillType === "cooking" || skillType === "brewing") {
                // 美食茶
                let avg = 1;
                if (drinkSlots.includes("gourmet_tea")) {
                    avg += 0.12 * drinkConcentration;
                }
                items.push({ name, iconHref, averageCount: avg });
                return;
            }

            // 采集/伐木/挤奶
            let dropCount = processingItems.hasOwnProperty(name) ? 2 : (() => {
                const init_client_data = window.MWI_Toolkit.init_client_data;
                const actionDetail = init_client_data?.actionDetailMap?.[`/actions/foraging/${name}`];
                const minCount = actionDetail?.dropTable[0]?.minCount;
                const maxCount = actionDetail?.dropTable[0]?.maxCount;
                return (minCount + maxCount) / 2;
            })();

            // 概率修正
            const probability = itemContainers.length === 1 ? 1 : 1.2 / itemContainers.length;
            dropCount *= probability;

            // 数量加成
            let multiplier = 1.0 + getGatheringQuantity();
            const communityLevel = getCommunityGatheringBuffLevel();
            if (communityLevel) multiplier += 0.20 + (communityLevel - 1) * 0.005;
            if (drinkSlots.includes("gathering_tea")) multiplier += 0.15 * drinkConcentration;

            // 加工茶修正
            let processedMultiplier = 0;
            if (drinkSlots.includes("processing_tea") && processingItems.hasOwnProperty(name)) {
                processedMultiplier = multiplier * 0.15 * drinkConcentration;
                multiplier -= processedMultiplier;
            }

            // 原物品
            items.push({
                name,
                iconHref,
                averageCount: dropCount * multiplier
            });

            // 加工产物
            if (processingItems.hasOwnProperty(name)) {
                items.push({
                    name: processingItems[name],
                    iconHref: iconHref.replace(name, processingItems[name]),
                    averageCount: dropCount * multiplier / 1.8 + dropCount * processedMultiplier / 2
                });
            }
        });
        return items;
    }

    // 获取操作类型
    function getCurrentSkillType() {
        const valDiv = document.querySelector('[class^="SkillActionDetail_value"]');
        if (!valDiv) return null;
        const use = valDiv.querySelector('svg use');
        if (!use) return null;
        const href = use.getAttribute('href') || '';
        const match = href.match(/#([a-zA-Z0-9_]+)$/);
        return match ? match[1] : null;
    }

    // 获取社区采集buff等级
    function getCommunityGatheringBuffLevel() {
        const buffDivs = document.querySelectorAll('[class^="CommunityBuff_communityBuff"]');
        for (const buffDiv of buffDivs) {
            const useEl = buffDiv.querySelector('svg use');
            if (!useEl) continue;
            const href = useEl.getAttribute('href') || '';
            if (href.includes('gathering')) {
                const levelDiv = buffDiv.querySelector('[class^="CommunityBuff_level"]');
                if (levelDiv) {
                    const match = levelDiv.textContent.match(/Lv\.(\d+)/);
                    if (match) return parseInt(match[1], 10);
                }
            }
        }
        return null;
    }

    // 获取茶列表
    function getDrinkSlots() {
        const teaContainers = document.querySelectorAll('[class^="ItemSelector_itemContainer"]');
        if (!teaContainers) return [];
        const teaList = [];
        for (const container of teaContainers) {
            const useEl = container.querySelector('svg use');
            if (useEl) {
                const href = useEl.getAttribute('href') || '';
                const countDiv = container.querySelector('[class^="Item_count"]');
                const count = countDiv ? parseInt(countDiv.textContent.replace(/,/g, ''), 10) : 0;
                if (count > 0) {
                    teaList.push(href.split('#')[1]);
                }
            }
        }
        return teaList;
    }

    // 获取饮料浓度
    function getDrinkConcentration() {
        let drinkConcentration = 1;
        const init_client_data = window.MWI_Toolkit.init_client_data;
        const init_character_data = window.MWI_Toolkit.init_character_data;
        if (init_client_data && init_character_data) {
            const guzzling_pouch = init_character_data.characterItems.find(item => item.itemHrid === "/items/guzzling_pouch");
            if (guzzling_pouch) {
                const enhancementLevel = guzzling_pouch.enhancementLevel || 0;
                drinkConcentration += init_client_data.itemDetailMap?.[`/items/guzzling_pouch`].equipmentDetail.noncombatStats.drinkConcentration
                    + init_client_data.itemDetailMap?.[`/items/guzzling_pouch`].equipmentDetail.noncombatEnhancementBonuses.drinkConcentration
                    * init_client_data.enhancementLevelTotalBonusMultiplierTable[enhancementLevel];
            }
        }
        return drinkConcentration;
    }

    // 获取首饰采集数量加成
    function getGatheringQuantity() {
        let gatheringQuantity = 0;
        const init_client_data = window.MWI_Toolkit.init_client_data;
        const init_character_data = window.MWI_Toolkit.init_character_data;
        if (init_client_data && init_character_data) {
            // 检查耳环
            const philosophers_earrings = init_character_data.characterItems.find(item => item.itemHrid === "/items/philosophers_earrings");
            const earrings_of_gathering = init_character_data.characterItems.find(item => item.itemHrid === "/items/earrings_of_gathering");
            if (philosophers_earrings) {
                const enhancementLevel = philosophers_earrings.enhancementLevel || 0;
                gatheringQuantity += init_client_data.itemDetailMap?.[`/items/philosophers_earrings`].equipmentDetail.noncombatStats.gatheringQuantity
                    + init_client_data.itemDetailMap?.[`/items/philosophers_earrings`].equipmentDetail.noncombatEnhancementBonuses.gatheringQuantity
                    * init_client_data.enhancementLevelTotalBonusMultiplierTable[enhancementLevel];
            }
            else if (earrings_of_gathering) {
                const enhancementLevel = earrings_of_gathering.enhancementLevel || 0;
                gatheringQuantity += init_client_data.itemDetailMap?.[`/items/earrings_of_gathering`].equipmentDetail.noncombatStats.gatheringQuantity
                    + init_client_data.itemDetailMap?.[`/items/earrings_of_gathering`].equipmentDetail.noncombatEnhancementBonuses.gatheringQuantity
                    * init_client_data.enhancementLevelTotalBonusMultiplierTable[enhancementLevel];
            }

            // 检查戒指
            const philosophers_ring = init_character_data.characterItems.find(item => item.itemHrid === "/items/philosophers_ring");
            const ring_of_gathering = init_character_data.characterItems.find(item => item.itemHrid === "/items/ring_of_gathering");
            if (philosophers_ring) {
                const enhancementLevel = philosophers_ring.enhancementLevel || 0;
                gatheringQuantity += init_client_data.itemDetailMap?.[`/items/philosophers_ring`].equipmentDetail.noncombatStats.gatheringQuantity
                    + init_client_data.itemDetailMap?.[`/items/philosophers_ring`].equipmentDetail.noncombatEnhancementBonuses.gatheringQuantity
                    * init_client_data.enhancementLevelTotalBonusMultiplierTable[enhancementLevel];
            }
            else if (ring_of_gathering) {
                const enhancementLevel = ring_of_gathering.enhancementLevel || 0;
                gatheringQuantity += init_client_data.itemDetailMap?.[`/items/ring_of_gathering`].equipmentDetail.noncombatStats.gatheringQuantity
                    + init_client_data.itemDetailMap?.[`/items/ring_of_gathering`].equipmentDetail.noncombatEnhancementBonuses.gatheringQuantity
                    * init_client_data.enhancementLevelTotalBonusMultiplierTable[enhancementLevel];
            }
        }
        return gatheringQuantity;
    }

    // React input hack
    function reactInputTriggerHack(inputElem, value) {
        let lastValue = inputElem.value;
        inputElem.value = value;
        let event = new Event("input", { bubbles: true });
        event.simulated = true;
        let tracker = inputElem._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }
        inputElem.dispatchEvent(event);
    }

    function parseTimes(val) {
        if (val === '∞' || val === '' || val === undefined || val === null) return Infinity;
        return parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    }

    function parseQty(val) {
        if (val === '' || val === undefined || val === null) return 0;
        if (val === '∞') return Infinity;
        return parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    }

    observePanel();
    setTimeout(insertQuantityInput, 500);

    // 监听页面变化
    function observePanel() {
        let lastPanel = null;
        const observer = new MutationObserver(() => {
            const panel = document.querySelector('[class^="SkillActionDetail_content"]');
            if (panel && panel !== lastPanel) {
                lastPanel = panel;
                setTimeout(insertQuantityInput, 100);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

})();