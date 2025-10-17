// ==UserScript==
// @name         MWI_Toolkit_Calculator
// @namespace    http://tampermonkey.net/
// @version      2.2.0
// @description  MWI计算器
// @author       zqzhang1996
// @icon         https://www.milkywayidle.com/favicon.svg
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @require      https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js
// @require      https://update.greasyfork.org/scripts/550719/1677027/MWI_Toolkit.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-body
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    //#region 数据模型层

    // 基础数据结构
    class Item {
        constructor(itemHrid, count) {
            this.itemHrid = itemHrid;
            this.count = count;
        }
    }

    // 显示物品类 - 包含计算和显示逻辑
    class DisplayItem {
        constructor(itemHrid, ownedCount, requiredCount) {
            this.itemHrid = itemHrid;
            this.ownedCount = ownedCount;
            this.requiredCount = requiredCount;
            this.missingCount = Math.max(0, requiredCount - ownedCount);

            // DOM 元素引用
            this.domElement = null;
            this.ownedCountElement = null;
            this.requiredCountElement = null;
            this.missingCountElement = null;

            this.initDisplayProperties();
        }

        initDisplayProperties() {
            if (this.itemHrid.includes('/items/')) {
                // 显示名称和图标等属性初始化
                this.displayName = Utils.getItemDisplayName(this.itemHrid);
                this.iconHref = Utils.getIconHrefByItemHrid(this.itemHrid);
                this.sortIndex = Utils.getSortIndexByHrid(this.itemHrid);
            }
            else if (this.itemHrid.includes('/house_rooms/')) {
                // 显示名称和图标等属性初始化
                this.displayName = Utils.getHouseRoomDisplayName(this.itemHrid);
                this.iconHref = Utils.getIconHrefByHouseRoomHrid(this.itemHrid);
                this.sortIndex = Utils.getSortIndexByHrid(this.itemHrid);
            }
        }

        // 更新数据并同步到DOM
        updateCounts(ownedCount, requiredCount) {
            this.ownedCount = ownedCount;
            this.requiredCount = requiredCount;
            this.missingCount = Math.max(0, requiredCount - ownedCount);

            // 仅在数值变化时才更新DOM，避免丢失选中状态
            if (this.ownedCountElement) {
                const newText = Utils.formatNumber(this.ownedCount);
                if (this.ownedCountElement.textContent !== newText) {
                    this.ownedCountElement.textContent = newText;
                }
            }
            if (this.missingCountElement) {
                const newText = Utils.formatNumber(this.missingCount);
                if (this.missingCountElement.textContent !== newText) {
                    this.missingCountElement.textContent = newText;
                }
            }
            if (this.requiredCountElement) {
                // requiredCountElement 是输入框，无需对数字进行格式化
                const newValue = this.requiredCount;
                if (this.requiredCountElement.value !== newValue) {
                    this.requiredCountElement.value = newValue;
                }
            }
        }

        // 设置DOM元素引用
        setDomReferences(domElement, ownedCountElement = null, requiredCountElement = null, missingCountElement = null) {
            this.domElement = domElement;
            this.ownedCountElement = ownedCountElement;
            this.requiredCountElement = requiredCountElement;
            this.missingCountElement = missingCountElement;
        }

        // 销毁DOM引用
        destroyDomReferences() {
            this.domElement = null;
            this.ownedCountElement = null;
            this.requiredCountElement = null;
            this.missingCountElement = null;
        }
    }

    //#endregion

    //#region 工具类

    class Utils {
        // 格式化数字显示
        static formatNumber(num) {
            if (typeof num !== 'number' || isNaN(num)) return '0';
            if (num < 0) num = 0;
            if (num < 100) {
                // 整数部分<=2位，保留1位小数，但如果小数为0则只显示整数
                const fixed = num.toFixed(1);
                if (fixed.endsWith('.0')) {
                    return Math.round(num).toString();
                }
                return fixed;
            } else if (num < 100000) {
                // 整数部分<=5位，向上取整
                return Math.ceil(num).toString();
            } else if (num < 10_000_000) {
                // 10,000,000~9,999,999 显示xxxK
                return Math.floor(num / 1000) + 'K';
            } else if (num < 10_000_000_000) {
                // 10,000,000~9,999,999,999 显示xxxM
                return Math.floor(num / 1_000_000) + 'M';
            } else {
                // 更大的数值显示NaN
                return 'NaN';
            }
        }

        // 获取物品排序索引
        static getSortIndexByHrid(hrid) {
            if (hrid.includes('/items/')) {
                return window.MWI_Toolkit?.init_client_data?.itemDetailMap?.[hrid]?.sortIndex || 9999;
            }
            if (hrid.includes('/house_rooms/')) {
                return window.MWI_Toolkit?.init_client_data?.houseRoomDetailMap?.[hrid]?.sortIndex - 9999 || -9999;
            }
            return 9999;
        }

        static getIconHrefByItemHrid(itemHrid) {
            return '/static/media/items_sprite.d4d08849.svg#' + itemHrid.split('/').pop();
        }

        static getIconHrefBySkillHrid(skillHrid) {
            return '/static/media/skills_sprite.3bb4d936.svg#' + skillHrid.split('/').pop();
        }

        static getIconHrefByHouseRoomHrid(houseRoomHrid) {
            const skillHrid = window.MWI_Toolkit?.init_client_data?.houseRoomDetailMap?.[houseRoomHrid]?.skillHrid || houseRoomHrid;
            return Utils.getIconHrefBySkillHrid(skillHrid);
        }

        static getIconHrefByMiscHrid(hrid) {
            if (MWI_Toolkit_Calculator_App.Language === 'zh') {
                return '/static/media/misc_sprite.3bb4d936.svg#' + hrid.split('/').pop();
            }
            else {
                return '/static/media/misc_sprite.6fa5e97c.svg#' + hrid.split('/').pop();
            }
        }

        static getItemDisplayName(itemHrid) {
            return window.MWI_Toolkit?.i18n?.getItemName(itemHrid, MWI_Toolkit_Calculator_App.Language);
        }

        static getHouseRoomDisplayName(houseRoomHrid) {
            return window.MWI_Toolkit?.i18n?.getName(houseRoomHrid, "houseRoomNames", MWI_Toolkit_Calculator_App.Language);
        }
    }
    //#endregion

    //#region 核心计算引擎

    class MWI_Toolkit_Calculator_Core {
        constructor() {
            this.targetItems = [];
        }

        // 递归计算所需材料
        calculateRequiredItems(itemHrid, count) {
            let requiredItems = [];

            if (itemHrid.includes('/house_rooms/')) {
                // 处理房屋房间逻辑
                return this.calculateRequiredItemsForHouseRoom(itemHrid, count);
            }

            requiredItems.push(new Item(itemHrid, count));

            const actionTypes = ["cheesesmithing", "crafting", "tailoring", "cooking", "brewing"];
            const itemName = itemHrid.split('/').pop();

            for (const actionType of actionTypes) {
                const actionHrid = `/actions/${actionType}/${itemName}`;
                if (window.MWI_Toolkit?.init_client_data?.actionDetailMap?.hasOwnProperty(actionHrid)) {
                    const actionDetail = window.MWI_Toolkit.init_client_data.actionDetailMap[actionHrid];
                    const upgradeItemHrid = actionDetail.upgradeItemHrid;
                    const inputItems = actionDetail.inputItems;

                    let outputCount = 1;
                    const outputItems = actionDetail.outputItems;
                    if (outputItems && outputItems.length > 0) {
                        const matchingOutput = outputItems.find(output => output.itemHrid === itemHrid);
                        if (matchingOutput) {
                            outputCount = matchingOutput.count;
                        }
                    }

                    const actionTypeDrinkSlots = this.getActionTypeDrinkSlots(actionType);
                    // 检查工匠茶加成
                    let artisanBuff = 0;
                    if (actionTypeDrinkSlots?.some(slot => slot && slot.itemHrid === '/items/artisan_tea')) {
                        artisanBuff = 0.1 * this.getDrinkConcentration();
                    }

                    // 检查美食茶加成
                    let gourmetBuff = 0;
                    if (actionTypeDrinkSlots?.some(slot => slot && slot.itemHrid === '/items/gourmet_tea')) {
                        gourmetBuff = 0.12 * this.getDrinkConcentration();
                    }

                    // 递归计算输入材料
                    for (const input of inputItems) {
                        const adjustedCount = input.count * count / outputCount * (1 - artisanBuff) / (1 + gourmetBuff);
                        requiredItems = this.mergeMaterialArrays(requiredItems, this.calculateRequiredItems(input.itemHrid, adjustedCount));
                    }

                    // 处理升级物品（不适用工匠茶加成）
                    if (upgradeItemHrid) {
                        requiredItems = this.mergeMaterialArrays(requiredItems, this.calculateRequiredItems(upgradeItemHrid, count / outputCount / (1 + gourmetBuff)));
                    }

                    return requiredItems;
                }
            }
            return requiredItems;
        }

        // 计算房屋房间所需材料
        calculateRequiredItemsForHouseRoom(houseRoomHrid, level) {
            let targetItems = [];
            const characterHouseRoomLevel = window.MWI_Toolkit?.init_character_data?.characterHouseRoomMap[houseRoomHrid]?.level || 0;
            const upgradeCostsMap = window.MWI_Toolkit?.init_client_data?.houseRoomDetailMap?.[houseRoomHrid]?.upgradeCostsMap;

            for (let i = characterHouseRoomLevel + 1; i <= level && i <= 8; i++) {
                targetItems = targetItems.concat(upgradeCostsMap[i] || []);
            }

            return this.batchCalculateRequiredItems(targetItems);
        }

        // 批量计算材料需求
        batchCalculateRequiredItems(targetItems) {
            let result = [];
            for (const targetItem of targetItems) {
                const requiredItems = this.calculateRequiredItems(targetItem.itemHrid, targetItem.count);
                result = this.mergeMaterialArrays(result, requiredItems);
            }
            return result;
        }

        // 计算等效材料
        calculateEquivalentItems(requiredItems, ownedItems) {
            const equivalentItems = [];
            for (const ownedItem of ownedItems) {
                // 这里count取requiredItems和ownedItems中的较小值并乘-1，表示用于抵消需求
                const requiredItem = requiredItems.find(ri => ri.itemHrid === ownedItem.itemHrid);
                if (requiredItem) {
                    const equivalentCount = Math.min(requiredItem.count, ownedItem.count) * -1;
                    equivalentItems.push(new Item(ownedItem.itemHrid, equivalentCount));
                }
            }
            return this.batchCalculateRequiredItems(equivalentItems);
        }

        // 合并材料数组并按排序顺序返回
        mergeMaterialArrays(arr1, arr2) {
            const map = new Map();
            for (const item of arr1.concat(arr2)) {
                if (map.has(item.itemHrid)) {
                    if (item.itemHrid.includes('/items/')) {
                        map.get(item.itemHrid).count += item.count;
                    }
                    if (item.itemHrid.includes('/house_rooms/')) {
                        map.get(item.itemHrid).count = Math.max(map.get(item.itemHrid).count, item.count);
                    }
                } else {
                    map.set(item.itemHrid, new Item(item.itemHrid, item.count));
                }
            }
            // 排序
            return Array.from(map.values()).sort(
                (a, b) => Utils.getSortIndexByHrid(a.itemHrid) - Utils.getSortIndexByHrid(b.itemHrid)
            );
        }

        // 检查拥有的物品
        checkOwnedItems(requiredItems) {
            const ownedItems = [];
            for (const requiredItem of requiredItems) {
                const ownedCount = window.MWI_Toolkit?.characterItems?.getCount(requiredItem.itemHrid) || 0;
                ownedItems.push(new Item(requiredItem.itemHrid, ownedCount));
            }
            return ownedItems;
        }

        // 获取茶列表
        getActionTypeDrinkSlots(actionType) {
            return window.MWI_Toolkit?.init_character_data?.actionTypeDrinkSlotsMap?.[`/action_types/${actionType}`];
        }

        // 获取饮料浓度系数
        getDrinkConcentration() {
            let drinkConcentration = 1;
            if (window.MWI_Toolkit?.init_client_data && window.MWI_Toolkit?.characterItems) {
                const enhancementLevel = window.MWI_Toolkit.characterItems.getMaxEnhancementLevel("/items/guzzling_pouch");
                if (enhancementLevel != -1) {
                    drinkConcentration = 1
                        + window.MWI_Toolkit.init_client_data.itemDetailMap?.[`/items/guzzling_pouch`].equipmentDetail.noncombatStats.drinkConcentration
                        + window.MWI_Toolkit.init_client_data.itemDetailMap?.[`/items/guzzling_pouch`].equipmentDetail.noncombatEnhancementBonuses.drinkConcentration
                        * window.MWI_Toolkit.init_client_data.enhancementLevelTotalBonusMultiplierTable[enhancementLevel];
                }
            }
            return drinkConcentration;
        }
    }

    //#endregion

    //#region 数据持久化管理

    class MWI_Toolkit_Calculator_DataManager {
        constructor() {
            this.characterID = null;
            this.storageKey = null;
        }

        // 初始化存储键
        initStorageKey() {
            try {
                const characterID = window.MWI_Toolkit?.init_character_data?.character?.id;
                if (characterID) {
                    this.characterID = characterID;
                    this.storageKey = `MWI_Toolkit_Calculator_targetItems_${characterID}`;
                }
            } catch (error) {
                console.error('[MWI计算器] 初始化存储键失败:', error);
            }
        }

        // 保存目标物品
        saveTargetItems(targetItems) {
            if (!this.storageKey) {
                return false;
            }

            try {
                const dataToSave = targetItems.map(item => ({
                    itemHrid: item.itemHrid,
                    count: item.count
                }));
                GM_setValue(this.storageKey, JSON.stringify(dataToSave));
                return true;
            } catch (error) {
                return false;
            }
        }

        // 加载目标物品
        loadTargetItems() {
            if (this.characterID) {
                return this.tryLoadTargetItemsFromCharacterID(this.characterID);
            }
        }

        // 从特定角色ID加载数据
        tryLoadTargetItemsFromCharacterID(characterID) {
            const storageKeys = GM_listValues();
            const storageKey = storageKeys.find(key => key.includes(characterID));

            if (!storageKey) return;

            try {
                const savedData = GM_getValue(storageKey, '[]');
                const loadedItems = JSON.parse(savedData);

                // 验证并转换为Item实例
                const validItems = loadedItems.map(item => {
                    if (item && item.itemHrid && typeof item.count === 'number') {
                        return new Item(item.itemHrid, item.count);
                    }
                    return null;
                }).filter(item => item !== null);

                if (validItems.length > 0) {
                    MWI_Toolkit_Calculator_App.Core.targetItems = loadedItems;
                    MWI_Toolkit_Calculator_App.UIManager.renderItemsDisplay();

                    // 替换旧的键为新的
                    if (!storageKey.startsWith('MWI_Toolkit_Calculator_targetItems_')
                        && storageKey.includes(this.characterID)) {
                        GM_deleteValue(storageKey);
                    }
                    this.saveTargetItems(MWI_Toolkit_Calculator_App.Core.targetItems);
                }
            } catch { }
        }

        // 清空保存的数据
        clearSavedData() {
            if (!this.storageKey) {
                return false;
            }

            try {
                GM_setValue(this.storageKey, '[]');
                return true;
            } catch (error) {
                return false;
            }
        }
    }

    //#endregion

    //#region UI 组件管理

    class MWI_Toolkit_Calculator_UIManager {
        constructor() {
            this.tabButton = null;
            this.tabPanel = null;
            this.targetItemDiv = null;
            this.missingItemDiv = null;
            this.isInitialized = false;

            // DisplayItem 实例管理
            this.targetDisplayItems = new Map(); // itemHrid -> DisplayItem
            this.missingDisplayItems = new Map(); // itemHrid -> DisplayItem
        }

        // 初始化UI
        initialize() {
            if (this.isInitialized) return;

            // 获取容器
            const tabsContainer = document.querySelector('[class^="CharacterManagement_tabsComponentContainer"] [class*="TabsComponent_tabsContainer"]');
            const tabPanelsContainer = document.querySelector('[class^="CharacterManagement_tabsComponentContainer"] [class*="TabsComponent_tabPanelsContainer"]');

            if (!tabsContainer || !tabPanelsContainer) {
                console.error('[MWI计算器] 无法找到标签页容器');
                return;
            }

            this.createCalculatorTab(tabsContainer, tabPanelsContainer);

            this.isInitialized = true;
            console.log('[MWI计算器] UI初始化完成');
        }

        // 创建MWI计算器标签页
        createCalculatorTab(tabsContainer, tabPanelsContainer) {
            // 新增"MWI计算器"按钮
            const oldTabButtons = tabsContainer.querySelectorAll("button");
            this.tabButton = oldTabButtons[1].cloneNode(true);
            this.tabButton.children[0].textContent = (MWI_Toolkit_Calculator_App.Language === 'zh') ? 'MWI计算器' : 'MWI_Calculator';
            oldTabButtons[0].parentElement.appendChild(this.tabButton);

            // 新增MWI计算器tabPanel
            const oldTabPanels = tabPanelsContainer.querySelectorAll('[class*="TabPanel_tabPanel"]');
            this.tabPanel = oldTabPanels[1].cloneNode(false);
            oldTabPanels[0].parentElement.appendChild(this.tabPanel);

            this.bindCalculatorTabEvents(oldTabButtons, oldTabPanels);

            // 创建计算器面板
            const calculatorPanel = this.createCalculatorPanel();
            this.tabPanel.appendChild(calculatorPanel);
        }

        // 绑定标签页事件
        bindCalculatorTabEvents(oldTabButtons, oldTabPanels) {
            for (let i = 0; i < oldTabButtons.length; i++) {
                oldTabButtons[i].addEventListener('click', (event) => {
                    this.tabPanel.hidden = true; // 强制隐藏
                    this.tabPanel.classList.add('TabPanel_hidden__26UM3');
                    this.tabButton.classList.remove('Mui-selected');
                    this.tabButton.setAttribute('aria-selected', 'false');
                    this.tabButton.tabIndex = -1;

                    oldTabButtons[i].classList.add('Mui-selected');
                    oldTabButtons[i].setAttribute('aria-selected', 'true');
                    oldTabButtons[i].tabIndex = 0;
                    oldTabPanels[i].classList.remove('TabPanel_hidden__26UM3');
                    oldTabPanels[i].hidden = false; // 显示目标
                }, true);
            }

            this.tabButton.addEventListener('click', (event) => {
                oldTabButtons.forEach(btn => {
                    btn.classList.remove('Mui-selected');
                    btn.setAttribute('aria-selected', 'false');
                    btn.tabIndex = -1;
                });
                oldTabPanels.forEach(panel => {
                    panel.hidden = true; // 强制隐藏
                    panel.classList.add('TabPanel_hidden__26UM3');
                });

                this.tabButton.classList.add('Mui-selected');
                this.tabButton.setAttribute('aria-selected', 'true');
                this.tabButton.tabIndex = 0;
                this.tabPanel.classList.remove('TabPanel_hidden__26UM3');
                this.tabPanel.hidden = false; // 显示目标
            }, true);
        }

        // 创建计算器面板
        createCalculatorPanel() {
            const calculatorPanel = document.createElement('div');
            calculatorPanel.className = 'Toolkit_Calculator_Container';

            // 创建物品搜索区域
            const addItemSection = this.createAddItemSection();
            calculatorPanel.appendChild(addItemSection);

            // 创建左右分栏布局
            this.targetItemDiv = document.createElement('div');
            this.targetItemDiv.style.display = 'inline-block';
            this.targetItemDiv.style.verticalAlign = 'top';
            this.targetItemDiv.style.width = '60%';

            this.missingItemDiv = document.createElement('div');
            this.missingItemDiv.style.display = 'inline-block';
            this.missingItemDiv.style.verticalAlign = 'top';
            this.missingItemDiv.style.width = '40%';

            calculatorPanel.appendChild(this.targetItemDiv);
            calculatorPanel.appendChild(this.missingItemDiv);

            return calculatorPanel;
        }

        // 创建添加物品区域
        createAddItemSection() {
            const addItemSection = document.createElement('div');

            // 左侧60%：物品搜索区域
            const leftSection = document.createElement('div');
            leftSection.style.display = 'inline-block';
            leftSection.style.verticalAlign = 'top';
            leftSection.style.width = '60%';

            const searchContainer = this.createItemSearchComponent();
            leftSection.appendChild(searchContainer);

            // 右侧40%：房屋选择区域
            const rightSection = document.createElement('div');
            rightSection.style.display = 'inline-block';
            rightSection.style.verticalAlign = 'top';
            rightSection.style.width = '40%';

            const houseContainer = this.createHouseRoomSelectionComponent();
            rightSection.appendChild(houseContainer);

            addItemSection.appendChild(leftSection);
            addItemSection.appendChild(rightSection);

            return addItemSection;
        }

        // 创建物品搜索组件
        createItemSearchComponent() {
            const itemSearchComponent = document.createElement('div');
            itemSearchComponent.style.background = '#2c2e45';
            itemSearchComponent.style.border = 'none';
            itemSearchComponent.style.borderRadius = '4px';
            itemSearchComponent.style.padding = '4px';
            itemSearchComponent.style.margin = '2px';
            itemSearchComponent.style.display = 'flex';
            itemSearchComponent.style.position = 'relative';

            // 物品搜索输入框
            const itemSearchInput = document.createElement('input');
            itemSearchInput.type = 'text';
            itemSearchInput.placeholder = (MWI_Toolkit_Calculator_App.Language === 'zh') ? '搜索物品名称...' : 'Search item name...';
            itemSearchInput.style.background = '#dde2f8';
            itemSearchInput.style.color = '#000000';
            itemSearchInput.style.border = 'none';
            itemSearchInput.style.borderRadius = '4px';
            itemSearchInput.style.padding = '4px';
            itemSearchInput.style.margin = '2px';
            itemSearchInput.style.minWidth = '40px';
            itemSearchInput.style.flex = '1';

            // 搜索结果下拉列表
            const searchResults = document.createElement('div');
            searchResults.style.background = '#2c2e45';
            searchResults.style.border = 'none';
            searchResults.style.borderRadius = '4px';
            searchResults.style.padding = '4px';
            searchResults.style.margin = '2px';
            searchResults.style.width = '200px';
            searchResults.style.maxHeight = '335px';
            searchResults.style.overflowY = 'auto';
            searchResults.style.zIndex = '1000';
            searchResults.style.display = 'none';
            searchResults.style.position = 'absolute';
            searchResults.style.left = '4px';
            searchResults.style.top = '32px';

            // 数量输入框
            const countInput = document.createElement('input');
            countInput.type = 'text';
            countInput.value = '1';
            countInput.placeholder = (MWI_Toolkit_Calculator_App.Language === 'zh') ? '数量' : 'Count';
            countInput.style.imeMode = 'disabled';
            countInput.style.background = '#dde2f8';
            countInput.style.color = '#000000';
            countInput.style.border = 'none';
            countInput.style.borderRadius = '4px';
            countInput.style.padding = '4px';
            countInput.style.margin = '2px';
            countInput.style.width = '60px';

            // 添加按钮
            const addButton = document.createElement('button');
            addButton.textContent = (MWI_Toolkit_Calculator_App.Language === 'zh') ? '添加' : 'Add';
            addButton.style.background = '#4CAF50';
            addButton.style.color = '#FFFFFF';
            addButton.style.border = 'none';
            addButton.style.borderRadius = '4px';
            addButton.style.padding = '4px';
            addButton.style.margin = '2px';
            addButton.style.width = '35px';
            addButton.style.cursor = 'pointer';

            // 清空按钮
            const clearAllButton = document.createElement('button');
            clearAllButton.textContent = (MWI_Toolkit_Calculator_App.Language === 'zh') ? '清空' : 'Clear';
            clearAllButton.style.background = '#f44336';
            clearAllButton.style.color = '#FFFFFF';
            clearAllButton.style.border = 'none';
            clearAllButton.style.borderRadius = '4px';
            clearAllButton.style.padding = '4px';
            clearAllButton.style.margin = '2px';
            clearAllButton.style.width = (MWI_Toolkit_Calculator_App.Language === 'zh') ? '35px' : '40px';
            clearAllButton.style.cursor = 'pointer';

            // 绑定搜索事件
            this.bindItemSearchComponentEvents(itemSearchInput, countInput, searchResults, addButton, clearAllButton);

            itemSearchComponent.appendChild(itemSearchInput);
            itemSearchComponent.appendChild(countInput);
            itemSearchComponent.appendChild(addButton);
            itemSearchComponent.appendChild(clearAllButton);

            itemSearchComponent.appendChild(searchResults);

            return itemSearchComponent;
        }

        // 填充搜索结果
        populateSearchResults(searchResults, filteredItems, onItemSelect) {
            searchResults.innerHTML = '';
            filteredItems.forEach((itemHrid, index) => {
                const resultItem = document.createElement('div');
                resultItem.style.borderBottom = '1px solid #98a7e9';
                resultItem.style.borderRadius = '4px';
                resultItem.style.padding = '4px';
                resultItem.style.alignItems = 'center';
                resultItem.style.display = 'flex';
                resultItem.style.cursor = 'pointer';

                if (index === 0) {
                    resultItem.style.background = '#4a4c6a';
                }

                // 物品图标
                const itemIcon = document.createElement('div');
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('width', '16px');
                svg.setAttribute('height', '16px');
                svg.style.display = 'block';
                const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', Utils.getIconHrefByItemHrid(itemHrid));
                svg.appendChild(use);
                itemIcon.appendChild(svg);

                // 物品名称
                const itemName = document.createElement('span');
                itemName.textContent = window.MWI_Toolkit.i18n.getItemName(itemHrid, MWI_Toolkit_Calculator_App.Language) || itemHrid;
                itemName.style.marginLeft = '2px';

                resultItem.appendChild(itemIcon);
                resultItem.appendChild(itemName);

                // 悬停高亮
                resultItem.addEventListener('mouseenter', () => {
                    resultItem.style.background = '#4a4c6a';
                });
                resultItem.addEventListener('mouseleave', () => {
                    resultItem.style.background = 'transparent';
                });

                resultItem.addEventListener('click', () => onItemSelect(itemHrid));
                searchResults.appendChild(resultItem);
            });
        }

        // 绑定搜索相关事件
        bindItemSearchComponentEvents(itemSearchInput, countInput, searchResults, addButton, clearAllButton) {
            // 输入框获得焦点时全选内容
            itemSearchInput.addEventListener('focus', function () {
                setTimeout(() => {
                    itemSearchInput.select();
                }, 0);
            });

            // 搜索功能
            itemSearchInput.addEventListener('input', (event) => {
                const searchTerm = event.target.value.toLowerCase().trim();
                if (searchTerm.length < 2) {
                    searchResults.style.display = 'none';
                    return;
                }

                // 获取并过滤物品
                const itemDetailMap = window.MWI_Toolkit?.init_client_data?.itemDetailMap;
                if (!itemDetailMap) return;

                const filteredItems = Object.keys(itemDetailMap)
                    .filter(itemHrid => {
                        const itemName = window.MWI_Toolkit.i18n.getItemName(itemHrid, MWI_Toolkit_Calculator_App.Language) || itemHrid;
                        return itemName.toLowerCase().includes(searchTerm);
                    })
                    .sort((a, b) => {
                        const sortIndexA = Utils.getSortIndexByHrid(a);
                        const sortIndexB = Utils.getSortIndexByHrid(b);
                        return sortIndexA - sortIndexB;
                    });

                if (filteredItems.length === 0) {
                    searchResults.style.display = 'none';
                    return;
                }

                this.populateSearchResults(searchResults, filteredItems, (itemHrid) => {
                    itemSearchInput.value = window.MWI_Toolkit.i18n.getItemName(itemHrid, MWI_Toolkit_Calculator_App.Language) || itemHrid;
                    searchResults.style.display = 'none';
                });

                searchResults.style.display = 'block';
            });

            // 键盘操作
            itemSearchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.addItemAndResetItemSearchComponent(itemSearchInput, countInput, searchResults);
                } else if (event.key === 'Escape') {
                    searchResults.style.display = 'none';
                }
            });

            // 输入框获得焦点时全选内容
            countInput.addEventListener('focus', function () {
                setTimeout(() => {
                    countInput.select();
                }, 0);
            });

            // 仅允许输入数字
            countInput.addEventListener('input', function () {
                this.value = this.value.replace(/\D/g, '');
                if (this.value !== '' && parseInt(this.value) < 1) {
                    this.value = '1';
                }
            });

            // 键盘操作
            countInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.addItemAndResetItemSearchComponent(itemSearchInput, countInput, searchResults);
                } else if (event.key === 'Escape') {
                    searchResults.style.display = 'none';
                }
            });

            // 添加按钮事件
            addButton.addEventListener('click', () => {
                this.addItemAndResetItemSearchComponent(itemSearchInput, countInput, searchResults);
            });

            // 清空按钮事件
            clearAllButton.addEventListener('click', () => {
                if (confirm((MWI_Toolkit_Calculator_App.Language === 'zh') ? '确定要清空所有目标物品吗？' : 'Are you sure you want to clear all target items?')) {
                    // 通过事件处理器清空
                    if (MWI_Toolkit_Calculator_App.EventHandler) {
                        MWI_Toolkit_Calculator_App.EventHandler.clearAllTargetItems();
                    }
                }
            });

            // 点击其他地方隐藏搜索结果
            document.addEventListener('click', (event) => {
                if (!searchResults.contains(event.target) && !itemSearchInput.contains(event.target)) {
                    searchResults.style.display = 'none';
                }
            });
        }

        // 添加物品并重置搜索组件（包含itemHrid获取和判空）
        addItemAndResetItemSearchComponent(itemSearchInput, countInput, searchResults) {
            const InputValue = itemSearchInput.value.trim();
            // 如果InputValue是纯数字
            if (/^\d+$/.test(InputValue)) {
                MWI_Toolkit_Calculator_App.DataManager.tryLoadTargetItemsFromCharacterID(InputValue);
                return;
            }
            const itemHrid = window.MWI_Toolkit.i18n.getItemHridByName(InputValue, MWI_Toolkit_Calculator_App.Language);
            if (!itemHrid) return;
            const count = parseInt(countInput.value) || 1;
            if (MWI_Toolkit_Calculator_App.EventHandler) {
                MWI_Toolkit_Calculator_App.EventHandler.addTargetItem(itemHrid, count);
            }
            itemSearchInput.value = '';
            countInput.value = '1';
            searchResults.style.display = 'none';
        }

        // 创建房屋选择区域
        createHouseRoomSelectionComponent() {
            const HouseRoomSelectionComponent = document.createElement('div');
            HouseRoomSelectionComponent.style.background = '#2c2e45';
            HouseRoomSelectionComponent.style.border = 'none';
            HouseRoomSelectionComponent.style.borderRadius = '4px';
            HouseRoomSelectionComponent.style.padding = '4px';
            HouseRoomSelectionComponent.style.margin = '2px';
            HouseRoomSelectionComponent.style.display = 'flex';

            // 下拉菜单
            const dropdown = this.createHouseRoomTypeDropdown();

            // 等级输入框
            const levelInput = document.createElement('input');
            levelInput.type = 'number';
            levelInput.min = '1';
            levelInput.max = '8';
            levelInput.step = '1';
            levelInput.value = '1';
            levelInput.placeholder = (MWI_Toolkit_Calculator_App.Language === 'zh') ? '等级' : 'Level';
            levelInput.style.imeMode = 'disabled';
            levelInput.style.background = '#dde2f8';
            levelInput.style.color = '#000000';
            levelInput.style.border = 'none';
            levelInput.style.borderRadius = '4px';
            levelInput.style.padding = '4px';
            levelInput.style.margin = '2px';
            levelInput.style.width = '35px';

            // 添加按钮
            const addListButton = document.createElement('button');
            addListButton.textContent = (MWI_Toolkit_Calculator_App.Language === 'zh') ? '添加' : 'Add';
            addListButton.style.background = '#4CAF50';
            addListButton.style.color = '#FFFFFF';
            addListButton.style.border = 'none';
            addListButton.style.borderRadius = '4px';
            addListButton.style.padding = '4px';
            addListButton.style.margin = '2px';
            addListButton.style.width = '35px';
            addListButton.style.cursor = 'pointer';

            // 绑定事件
            this.bindHouseRoomSelectionComponentEvents(dropdown, levelInput, addListButton);

            HouseRoomSelectionComponent.appendChild(dropdown);
            HouseRoomSelectionComponent.appendChild(levelInput);
            HouseRoomSelectionComponent.appendChild(addListButton);

            return HouseRoomSelectionComponent;
        }

        // 创建房屋类型下拉菜单
        createHouseRoomTypeDropdown() {
            // 创建容器
            const dropdown = document.createElement('div');
            dropdown.style.display = 'flex';
            dropdown.style.minWidth = '20px';
            dropdown.style.flex = '1';
            dropdown.style.position = 'relative';

            // 选中项显示区
            const selected = document.createElement('div');
            selected.style.background = '#393a5b';
            selected.style.color = '#000000';
            selected.style.border = 'none';
            selected.style.borderRadius = '4px';
            selected.style.paddingLeft = '4px';
            selected.style.margin = '2px';
            selected.style.minWidth = '40px';
            selected.style.flex = '1';
            selected.style.cursor = 'pointer';
            selected.style.display = 'flex';
            selected.style.alignItems = 'center';

            // 下拉菜单列表
            const list = document.createElement('div');
            list.style.background = '#2c2e45';
            list.style.border = 'none';
            list.style.borderRadius = '4px';
            list.style.padding = '4px';
            list.style.margin = '2px';
            list.style.width = '150px';
            list.style.maxHeight = '335px';
            list.style.overflowY = 'auto';
            list.style.zIndex = '1000';
            list.style.display = 'none';
            list.style.position = 'absolute';
            list.style.left = '0px';
            list.style.top = '32px';

            const HouseRoomTypeOptions = this.createHouseRoomTypeOptions(selected, dropdown);
            HouseRoomTypeOptions.forEach(optionItem => { list.appendChild(optionItem); });
            HouseRoomTypeOptions[0] && HouseRoomTypeOptions[0].click(); // 默认选中第一个

            dropdown.appendChild(selected);
            dropdown.appendChild(list);

            // 点击展开/收起
            selected.addEventListener('click', () => {
                list.style.display = list.style.display === 'block' ? 'none' : 'block';
            });

            // 点击外部关闭
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    list.style.display = 'none';
                }
            });

            return dropdown;
        }

        // 创建房屋类型选项
        createHouseRoomTypeOptions(selected, dropdown) {
            const houseRoomDetailMap = window.MWI_Toolkit?.init_client_data?.houseRoomDetailMap;
            if (!houseRoomDetailMap) { return []; }

            return Object.values(houseRoomDetailMap)
                .sort((a, b) => (a.sortIndex ?? 9999) - (b.sortIndex ?? 9999))
                .map(houseRoomDetail => {
                    const optionItem = document.createElement('div');
                    optionItem.style.borderBottom = '1px solid #98a7e9';
                    optionItem.style.borderRadius = '4px';
                    optionItem.style.padding = '4px';
                    optionItem.style.alignItems = 'center';
                    optionItem.style.display = 'flex';
                    optionItem.style.cursor = 'pointer';

                    // 房屋房间图标
                    const houseRoomIcon = document.createElement('div');
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('width', '16px');
                    svg.setAttribute('height', '16px');
                    svg.style.display = 'block';
                    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', Utils.getIconHrefBySkillHrid(houseRoomDetail.skillHrid));
                    svg.appendChild(use);
                    houseRoomIcon.appendChild(svg);

                    // 房屋房间名称
                    const houseRoomName = document.createElement('span');
                    houseRoomName.textContent = window.MWI_Toolkit?.i18n?.getName(houseRoomDetail.hrid, "houseRoomNames", MWI_Toolkit_Calculator_App.Language) || houseRoomDetail.hrid;
                    houseRoomName.style.marginLeft = '2px';
                    houseRoomName.style.whiteSpace = 'nowrap';
                    houseRoomName.style.overflow = 'hidden';

                    optionItem.appendChild(houseRoomIcon);
                    optionItem.appendChild(houseRoomName);
                    optionItem.addEventListener('click', () => {
                        selected.innerHTML = '';
                        const selectedIcon = houseRoomIcon.cloneNode(true);
                        selected.appendChild(selectedIcon);
                        const selectedName = houseRoomName.cloneNode(true);
                        selectedName.style.color = '#FFFFFF';
                        selected.appendChild(selectedName);

                        dropdown.dataset.value = houseRoomDetail.hrid;
                        optionItem.parentElement.style.display = 'none';
                    });

                    // 悬停高亮
                    optionItem.addEventListener('mouseenter', () => {
                        optionItem.style.background = '#4a4c6a';
                    });
                    optionItem.addEventListener('mouseleave', () => {
                        optionItem.style.background = 'transparent';
                    });

                    optionItem.value = houseRoomDetail.hrid;
                    return optionItem;
                });
        }

        // 绑定房屋选择相关事件
        bindHouseRoomSelectionComponentEvents(dropdown, levelInput, addListButton) {
            // 输入框获得焦点时全选内容
            levelInput.addEventListener('focus', function () {
                setTimeout(() => {
                    levelInput.select();
                }, 0);
            });

            // 添加按钮事件
            addListButton.addEventListener('click', () => {
                const houseRoomHrid = dropdown.dataset.value;
                const level = parseInt(levelInput.value) || 1;

                if (MWI_Toolkit_Calculator_App.EventHandler) {
                    MWI_Toolkit_Calculator_App.EventHandler.addTargetItem(houseRoomHrid, level);
                }
            });
        }

        // 创建目标物品元素
        createTargetItemElement(displayItem) {
            // 拥有数量
            const ownedSpan = document.createElement('span');
            ownedSpan.textContent = Utils.formatNumber(displayItem.ownedCount);
            ownedSpan.style.padding = '4px 1px';
            ownedSpan.style.marginLeft = '4px';

            // 斜杠分隔符
            const slash = document.createElement('span');
            slash.textContent = "/";
            slash.style.padding = '4px 1px';

            // 可编辑的需求数量输入框
            const inputTarget = document.createElement('input');
            inputTarget.type = 'text';
            inputTarget.value = displayItem.requiredCount;
            inputTarget.placeholder = '需求';
            inputTarget.style.imeMode = 'disabled';
            inputTarget.style.background = '#dde2f8';
            inputTarget.style.color = '#000000';
            inputTarget.style.border = 'none';
            inputTarget.style.borderRadius = '4px';
            inputTarget.style.padding = '4px';
            inputTarget.style.margin = '2px';
            inputTarget.style.width = '60px';

            // 绑定输入事件
            this.bindInputEvents(inputTarget, displayItem.itemHrid);

            // 删除按钮
            const removeButton = document.createElement('button');
            removeButton.style.background = '#f44336';
            removeButton.style.border = 'none';
            removeButton.style.borderRadius = '4px';
            removeButton.style.padding = '4px';
            removeButton.style.margin = '2px';
            removeButton.style.width = '26px';
            removeButton.style.cursor = 'pointer';

            const removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            removeSvg.setAttribute('width', '18px');
            removeSvg.setAttribute('height', '18px');
            removeSvg.style.display = 'block';
            const removeUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            removeUse.setAttributeNS('http://www.w3.org/1999/xlink', 'href', Utils.getIconHrefByMiscHrid('remove'));
            removeSvg.appendChild(removeUse);
            removeButton.appendChild(removeSvg);

            removeButton.addEventListener('click', () => {
                if (MWI_Toolkit_Calculator_App.EventHandler) {
                    MWI_Toolkit_Calculator_App.EventHandler.removeTargetItem(displayItem.itemHrid);
                }
            });

            const itemRow = this.createItemRowBase(displayItem, [ownedSpan, slash, inputTarget, removeButton]);
            itemRow.className = 'Toolkit_Calculator_TargetRow';

            // 设置DOM引用
            displayItem.setDomReferences(itemRow, ownedSpan, inputTarget, null);

            return itemRow;
        }

        // 绑定输入框事件
        bindInputEvents(inputElement, itemHrid) {
            // 输入框获得焦点时全选内容
            inputElement.addEventListener('focus', function () {
                setTimeout(() => {
                    inputElement.select();
                }, 0);
            });

            inputElement.addEventListener('input', function () {
                // 清理非数字字符
                this.value = this.value.replace(/\D/g, '');

                // 直接调用事件处理器（事件处理器内部有防抖）
                const newCount = parseInt(this.value) || 0;
                if (MWI_Toolkit_Calculator_App.EventHandler) {
                    MWI_Toolkit_Calculator_App.EventHandler.updateTargetItem(itemHrid, newCount);
                }
            });

            inputElement.addEventListener('blur', function () {
                const newCount = parseInt(this.value) || 0;
                if (MWI_Toolkit_Calculator_App.EventHandler) {
                    MWI_Toolkit_Calculator_App.EventHandler.updateTargetItem(itemHrid, newCount);
                }
            });

            inputElement.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    const newCount = parseInt(this.value) || 0;
                    if (MWI_Toolkit_Calculator_App.EventHandler) {
                        MWI_Toolkit_Calculator_App.EventHandler.updateTargetItem(itemHrid, newCount);
                    }
                    this.blur();
                }
            });
        }

        // 创建缺口物品元素
        createMissingItemElement(displayItem) {
            const missingSpan = document.createElement('span');
            missingSpan.textContent = Utils.formatNumber(displayItem.missingCount);
            missingSpan.style.padding = '4px 1px';
            missingSpan.style.marginLeft = '4px';

            const itemRow = this.createItemRowBase(displayItem, [missingSpan]);
            itemRow.className = 'Toolkit_Calculator_ProgressRow';

            // 设置DOM引用
            displayItem.setDomReferences(itemRow, null, null, missingSpan);

            return itemRow;
        }

        // 创建物品行基础结构
        createItemRowBase(displayItem, rightContentNodes) {
            const container = document.createElement('div');
            container.style.background = '#2c2e45';
            container.style.border = 'none';
            container.style.borderRadius = '4px';
            container.style.padding = '1px 4px';
            container.style.margin = '2px';
            container.style.display = 'flex';

            // 左侧：图标和名称
            const left = document.createElement('div');
            left.style.minWidth = '40px';
            left.style.alignItems = 'center';
            left.style.display = 'flex';
            left.style.flex = '1';

            // 物品图标
            const iconContainer = document.createElement('div');
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '18px');
            svg.setAttribute('height', '18px');
            svg.style.display = 'block';
            const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', displayItem.iconHref);
            svg.appendChild(use);
            iconContainer.appendChild(svg);

            // 物品名称
            const displayNameDiv = document.createElement('div');
            displayNameDiv.textContent = displayItem.displayName;
            displayNameDiv.style.padding = "4px 1px";
            displayNameDiv.style.marginLeft = '2px';
            displayNameDiv.style.whiteSpace = 'nowrap';
            displayNameDiv.style.overflow = 'hidden';

            left.appendChild(iconContainer);
            left.appendChild(displayNameDiv);
            container.appendChild(left);

            // 右侧：内容
            const right = document.createElement('div');
            right.style.display = 'flex';
            rightContentNodes.forEach(node => right.appendChild(node));
            container.appendChild(right);

            return container;
        }

        // 渲染物品列表
        renderItemsDisplay() {
            if (!MWI_Toolkit_Calculator_App.Core.targetItems || MWI_Toolkit_Calculator_App.Core.targetItems.length === 0) {
                this.clearAllDisplayItems();
                return;
            }

            // 合并重复物品并对列表进行排序
            MWI_Toolkit_Calculator_App.Core.targetItems = MWI_Toolkit_Calculator_App.Core.mergeMaterialArrays(MWI_Toolkit_Calculator_App.Core.targetItems, []);

            // 更新目标物品区域
            this.updateTargetItemsDisplay();

            // 更新缺失物品区域
            this.updateMissingItemsDisplay();
        }

        // 更新目标物品显示区域
        updateTargetItemsDisplay() {
            if (!this.targetItemDiv) return;

            // 计算目标物品显示数据
            // 开始更新前对目标物品进行了去重和排序，因此targetItems是有序的
            const targetItems = MWI_Toolkit_Calculator_App.Core.targetItems;
            const ownedItems = MWI_Toolkit_Calculator_App.Core.checkOwnedItems(targetItems);

            // 移除不再需要的物品
            for (const [itemHrid, displayItem] of this.targetDisplayItems) {
                if (!targetItems.some(item => item.itemHrid === itemHrid)) {
                    if (displayItem.domElement && displayItem.domElement.parentNode) {
                        displayItem.domElement.parentNode.removeChild(displayItem.domElement);
                    }
                    displayItem.destroyDomReferences();
                    this.targetDisplayItems.delete(itemHrid);
                }
            }

            // 此时this.targetDisplayItems中只包含仍然需要显示的物品
            // 使用一个变量指向上一个处理的TargetItemElement
            let lastElement = null;
            targetItems.forEach(targetItem => {
                const ownedItem = ownedItems.find(oi => oi.itemHrid === targetItem.itemHrid);
                let displayItem = this.targetDisplayItems.get(targetItem.itemHrid);

                const houseRoomLevel = window.MWI_Toolkit?.init_character_data?.characterHouseRoomMap[targetItem.itemHrid]?.level || 0;
                const ownedCount = (ownedItem ? ownedItem.count : 0) + houseRoomLevel;
                const requiredCount = targetItem.count;

                if (displayItem) {
                    // 更新现有物品
                    displayItem.updateCounts(ownedCount, requiredCount);
                    // 不需要确认顺序，创建时顺序正确即可
                    lastElement = displayItem.domElement;
                } else {
                    // 创建新物品
                    displayItem = new DisplayItem(targetItem.itemHrid, ownedCount, requiredCount);
                    const element = this.createTargetItemElement(displayItem);
                    this.targetDisplayItems.set(targetItem.itemHrid, displayItem);
                    if (lastElement) {
                        lastElement.insertAdjacentElement('afterend', element);
                    } else {
                        if (this.targetItemDiv.firstChild) {
                            this.targetItemDiv.firstChild.insertAdjacentElement('beforebegin', element);
                        } else {
                            this.targetItemDiv.appendChild(element);
                        }
                    }
                    lastElement = element;
                }
            });
        }

        // 更新缺失物品显示区域
        updateMissingItemsDisplay() {
            if (!this.missingItemDiv) return;

            // 计算需求物品显示数据
            // batchCalculateRequiredItems返回的requiredItems已经是有序的
            const requiredItems = MWI_Toolkit_Calculator_App.Core.batchCalculateRequiredItems(MWI_Toolkit_Calculator_App.Core.targetItems);
            const ownedItems = MWI_Toolkit_Calculator_App.Core.checkOwnedItems(requiredItems);
            const equivalentItems = MWI_Toolkit_Calculator_App.Core.calculateEquivalentItems(requiredItems, ownedItems);
            const missingItems = MWI_Toolkit_Calculator_App.Core.mergeMaterialArrays(requiredItems, equivalentItems);

            // 移除不再需要的物品
            for (const [itemHrid, displayItem] of this.missingDisplayItems) {
                const missingItem = missingItems.find(mi => mi.itemHrid === itemHrid);
                if (!missingItem || missingItem.count <= 0) {
                    if (displayItem.domElement && displayItem.domElement.parentNode) {
                        displayItem.domElement.parentNode.removeChild(displayItem.domElement);
                    }
                    displayItem.destroyDomReferences();
                    this.missingDisplayItems.delete(itemHrid);
                }
            }

            // 按顺序处理缺失物品
            let lastElement = null;
            missingItems.forEach(missingItem => {
                // 只处理数量大于0的缺失物品
                if (missingItem.count <= 0.001) return;

                const ownedItem = ownedItems.find(oi => oi.itemHrid === missingItem.itemHrid);
                let displayItem = this.missingDisplayItems.get(missingItem.itemHrid);

                const ownedCount = ownedItem ? ownedItem.count : 0;
                const requiredCount = missingItem.count + ownedCount;

                if (displayItem) {
                    // 更新现有物品
                    displayItem.updateCounts(ownedCount, requiredCount);
                    // 不需要确认顺序，创建时顺序正确即可
                    lastElement = displayItem.domElement;
                } else {
                    // 创建新物品
                    displayItem = new DisplayItem(missingItem.itemHrid, ownedCount, requiredCount);
                    const element = this.createMissingItemElement(displayItem);
                    this.missingDisplayItems.set(missingItem.itemHrid, displayItem);
                    if (lastElement) {
                        lastElement.insertAdjacentElement('afterend', element);
                    } else {
                        if (this.missingItemDiv.firstChild) {
                            this.missingItemDiv.firstChild.insertAdjacentElement('beforebegin', element);
                        } else {
                            this.missingItemDiv.appendChild(element);
                        }
                    }
                    lastElement = element;
                }
            });
        }

        // 清空所有显示项
        clearAllDisplayItems() {
            // 清空目标物品
            for (const [itemHrid, displayItem] of this.targetDisplayItems) {
                displayItem.destroyDomReferences();
            }
            this.targetDisplayItems.clear();
            if (this.targetItemDiv) {
                this.targetItemDiv.innerHTML = '';
            }

            // 清空需求物品
            for (const [itemHrid, displayItem] of this.missingDisplayItems) {
                displayItem.destroyDomReferences();
            }
            this.missingDisplayItems.clear();
            if (this.missingItemDiv) {
                this.missingItemDiv.innerHTML = '';
            }
        }
    }

    //#endregion

    //#region 事件处理器

    class MWI_Toolkit_Calculator_EventHandler {
        constructor() {
            this.renderTimeout = null;
        }

        // 添加目标物品
        addTargetItem(itemHrid, count = 1) {
            if (!itemHrid || count <= 0) return;

            const existingItemIndex = MWI_Toolkit_Calculator_App.Core.targetItems.findIndex(item => item.itemHrid === itemHrid);
            if (existingItemIndex !== -1) {
                // 如果物品已存在，增加数量
                if (itemHrid.includes('/items/')) {
                    MWI_Toolkit_Calculator_App.Core.targetItems[existingItemIndex].count += count;
                }
                if (itemHrid.includes('/house_rooms/')) {
                    MWI_Toolkit_Calculator_App.Core.targetItems[existingItemIndex].count = Math.max(MWI_Toolkit_Calculator_App.Core.targetItems[existingItemIndex].count, count);
                }
            } else {
                // 添加新物品
                MWI_Toolkit_Calculator_App.Core.targetItems.push(new Item(itemHrid, count));
            }

            this.saveAndScheduleRender('数据已保存');
        }

        // 更新目标物品
        updateTargetItem(itemHrid, newCount) {
            if (!itemHrid) return;
            if (newCount < 0) newCount = 0;

            const existingItemIndex = MWI_Toolkit_Calculator_App.Core.targetItems.findIndex(item => item.itemHrid === itemHrid);
            if (existingItemIndex !== -1) {
                MWI_Toolkit_Calculator_App.Core.targetItems[existingItemIndex].count = newCount;
            } else if (newCount > 0) {
                // 如果物品不存在且数量大于0，添加新物品
                MWI_Toolkit_Calculator_App.Core.targetItems.push(new Item(itemHrid, newCount));
            }

            this.saveAndScheduleRender('数据已保存');
        }

        // 删除目标物品
        removeTargetItem(itemHrid) {
            if (!itemHrid) return;

            const index = MWI_Toolkit_Calculator_App.Core.targetItems.findIndex(item => item.itemHrid === itemHrid);
            if (index !== -1) {
                MWI_Toolkit_Calculator_App.Core.targetItems.splice(index, 1);
                this.saveAndScheduleRender('数据已保存');
            }
        }

        // 清空所有目标物品
        clearAllTargetItems() {
            MWI_Toolkit_Calculator_App.Core.targetItems = [];

            // 清空保存的数据
            MWI_Toolkit_Calculator_App.DataManager.clearSavedData();

            this.scheduleRender();
        }

        // 保存数据并计划渲染
        saveAndScheduleRender() {
            // 保存数据到存储
            MWI_Toolkit_Calculator_App.DataManager.saveTargetItems(MWI_Toolkit_Calculator_App.Core.targetItems);

            this.scheduleRender();
        }

        // 计划延迟渲染
        scheduleRender() {
            // 清除之前的计时器
            if (this.renderTimeout) {
                clearTimeout(this.renderTimeout);
            }

            // 设置新的计时器
            this.renderTimeout = setTimeout(() => {
                MWI_Toolkit_Calculator_App.UIManager.renderItemsDisplay();
                this.renderTimeout = null;
            }, 300); // 300ms 防抖延迟
        }

        // 注册物品变更监听器
        registerItemChangeListener() {
            // 注册物品变更监听器
            if (window.MWI_Toolkit?.characterItems?.changeCallbacks) {
                window.MWI_Toolkit.characterItems.changeCallbacks.push((endCharacterItems) => {
                    this.scheduleRender();
                });
                console.log('[MWI计算器] 物品变更监听器已注册');
            } else {
                console.warn('[MWI计算器] 无法注册物品变更监听器，MWI_Toolkit.characterItems.changeCallbacks 不可用');
            }
        }
    }

    //#endregion

    //#region 主应用程序

    class MWI_Toolkit_Calculator_App {
        static Core;
        static DataManager;
        static UIManager;
        static EventHandler;
        static Language;

        constructor() {
            const playerCountDiv = document.querySelector('[class^="Header_playerCount"]');
            if (playerCountDiv.textContent.startsWith('活跃角色')) {
                MWI_Toolkit_Calculator_App.Language = 'zh';
            }
            else {
                MWI_Toolkit_Calculator_App.Language = 'en';
            }

            MWI_Toolkit_Calculator_App.Core = new MWI_Toolkit_Calculator_Core();
            MWI_Toolkit_Calculator_App.DataManager = new MWI_Toolkit_Calculator_DataManager();
            MWI_Toolkit_Calculator_App.UIManager = new MWI_Toolkit_Calculator_UIManager();
            MWI_Toolkit_Calculator_App.EventHandler = new MWI_Toolkit_Calculator_EventHandler();
        }

        // 初始化应用程序
        initialize() {
            this.waitForDependencies(() => {
                console.log('[MWI计算器] 开始初始化...');

                // 设置全局引用，供UI组件使用
                // MWI_Toolkit_Calculator_App.EventHandler = MWI_Toolkit_Calculator_App.EventHandler;

                // 初始化各个模块
                MWI_Toolkit_Calculator_App.DataManager.initStorageKey();
                MWI_Toolkit_Calculator_App.EventHandler.registerItemChangeListener();
                MWI_Toolkit_Calculator_App.UIManager.initialize();

                // 加载保存的数据
                MWI_Toolkit_Calculator_App.DataManager.loadTargetItems();

                console.log('[MWI计算器] 初始化完成');
            });
        }

        // 等待依赖项加载完成
        waitForDependencies(callback) {
            const checkDependencies = setInterval(() => {
                if (window.MWI_Toolkit?.init_character_data &&
                    window.MWI_Toolkit?.init_client_data) {
                    clearInterval(checkDependencies);
                    console.log('[MWI计算器] 依赖项加载完成');

                    // 等待DOM元素出现
                    this.waitForElement(
                        '[class^="CharacterManagement_tabsComponentContainer"] [class*="TabsComponent_tabsContainer"]',
                        callback
                    );
                }
            }, 500);
        }

        // 等待DOM元素出现
        waitForElement(selector, callback) {
            const el = document.querySelector(selector);
            if (el) {
                callback(el);
                return;
            }
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    callback(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    //#endregion

    // 创建并启动应用程序实例
    const app = new MWI_Toolkit_Calculator_App();
    app.initialize();

})();