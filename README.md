# MWI Toolkit Scripts

**项目地址：** [GitHub](https://github.com/zqzhang1996/MWIscript) | [Gitee镜像](https://gitee.com/zqzhang1996/MWIscript)

## MWI Toolkit ActionDetailPlus

**Script URL:** [GreasyFork](https://greasyfork.org/en/scripts/550483-mwi-toolkit-actiondetailplus)

**Gitee镜像:** [直链下载](https://gitee.com/zqzhang1996/MWIscript/raw/main/MWI_Toolkit_ActionDetailPlus.js)

### 中文说明

为前八个专业的动作面板提供增强功能（炼金支持正在考虑中）

1. **目标数量输入**
   - 为所有单次产出数量大于1的动作添加目标数量输入框，与动作次数输入框实时联动
   - 对于使用加工茶的动作，提供额外输入框显示最终获得的加工产物数量

2. **原材料需求追踪**
   - 自动计算并显示所需原材料数量，与动作输入实时同步。当库存不足时，缺口数量将以橙色高亮显示

3. **重要提醒**
   - 社区采集加成基于打开动作面板时的等级计算，若执行过程中加成失效或升级，计算结果可能出现偏差
   - 茶效果基于页面加载时的配置计算，修改茶配置后需刷新页面生效（未来可能改为实时更新）
   - 暴饮之囊、采集首饰、贤者首饰只要拥有即视为启用状态，贤者首饰优先级高于采集首饰

### Features (English)

Enhances the action panel for the first eight professions (alchemy support may be added in the future).

1. **Target Quantity Input**
   - Adds a target quantity input field for all actions that produce more than 1 item per execution, automatically syncing with the action count field.
   - For actions involving processed tea, provides an additional input field showing the final number of processed items you'll receive.

2. **Material Requirements Tracking**
   - Displays required material quantities that dynamically update based on your action inputs. When inventory is insufficient, the shortage amount is highlighted in orange.

3. **Important Notes**
   - Community gathering buffs are calculated based on the level when the action panel opens. Results may be inaccurate if buffs expire or upgrade during execution.
   - Tea effects are calculated using the configuration present when the page loads. You must refresh the page after changing tea settings (real-time updates may be implemented in the future).
   - Guzzling Pouch, Gathering Jewelry, and Philosopher's Jewelry are automatically considered active when owned. Philosopher's Jewelry takes priority over Gathering Jewelry.

---

## MWI Toolkit Calculator

**Script URL:** [GreasyFork](https://greasyfork.org/en/scripts/552330-mwi-toolkit-calculator)

**Gitee镜像:** [直链下载](https://gitee.com/zqzhang1996/MWIscript/raw/main/MWI_Toolkit_Calculator.js)

### 中文说明

最初为解决IC模式下房屋建造的材料计算难题而开发，现已扩展为全能的物品清单计算器

0. **计算器界面**
   - 在配装标签页右侧新增计算器标签页
   - 仅适配桌面版布局，因宽度限制暂不支持移动端窄屏界面

1. **物品需求管理**
   - 通过顶部搜索功能按数量添加物品至需求清单，支持直接选择房屋并按等级添加
   - 需求清单按角色独立保存，页面刷新后数据不会丢失
   - 支持跨角色复制需求清单：在搜索框输入目标角色ID（游戏网址中的数字）并点击添加，适合管理多个IC角色的玩家

2. **库存状态总览**
   - 左侧面板实时显示当前库存/目标数量，房屋显示当前等级/目标等级
   - 库存数据实时更新，但房屋等级变更后需刷新页面以获取准确数据

3. **材料缺口分析**
   - 右侧面板基于当前库存从源头计算所有缺失材料的数量，需要对制作配方有基本了解，从最基础的原材料开始逐步处理
   - 缺口数量实时更新，跟随制作进度动态调整
   - 已满足需求的物品自动隐藏，保持界面简洁

### Features (English)

Originally developed to solve material calculation challenges when building houses in IC mode, this tool has evolved into a comprehensive item list calculator.

0. **Calculator Interface**
   - Adds a calculator tab to the right of the loadouts tab.
   - Desktop layout only - mobile UI is not supported due to width limitations.

1. **Item Management**
   - Search and add items to your wishlist by quantity at the top of the interface. You can also select houses and add them by level.
   - Wishlists are saved per character and persist through page refreshes.
   - Copy another character's wishlist by entering their character ID (the number from the game's URL) in the search box and clicking Add. This feature is particularly useful for players managing multiple IC characters.

2. **Inventory Overview**
   - The left panel shows current inventory vs. target quantities. For houses, it displays current level vs. target level.
   - Current inventory updates in real-time, but you must refresh the page after changing house levels to get accurate data.

3. **Material Requirements Calculation**
   - The right panel calculates all missing materials from scratch based on your current inventory. You'll need some understanding of crafting recipes to process items efficiently, starting with the most basic raw materials.
   - Missing quantities update in real-time as you make progress.
   - Completed items are automatically hidden from view.

---

## MWI Toolkit Core Library

**Script URL:** [GreasyFork](https://greasyfork.org/en/scripts/550485-mwi-toolkit)

**Gitee镜像:** [直链下载](https://gitee.com/zqzhang1996/MWIscript/raw/main/MWI_Toolkit.js)

### 中文说明

提供全局i18n数据和数据抓取能力的核心库，供其他MWI Toolkit脚本调用

#### 主要功能接口

1. **物品数据管理 (window.MWI_Toolkit.characterItems)**
   - `window.MWI_Toolkit.characterItems.getCount(itemHrid, enhancementLevel = 0)` - 查询物品数量，enhancementLevel默认为0
   - `window.MWI_Toolkit.characterItems.getMaxEnhancementLevel(itemHrid)` - 查询物品的最大强化等级，忽略count为0的项
   - `window.MWI_Toolkit.characterItems.changeCallbacks` - 物品变更事件回调数组，可注册监听物品变化
     - 回调函数签名：`function(endCharacterItems: Array<CharacterItem>)`
     - 参数包含变更后的物品数据数组，每个对象结构如下：
       ```
       {
         id: number,                    // 物品记录ID
         characterID: number,           // 角色ID
         itemLocationHrid: string,      // 物品位置（如"/item_locations/inventory"）
         itemHrid: string,             // 物品ID（如"/items/azure_milk"）
         enhancementLevel: number,      // 强化等级
         count: number,                // 数量
         offlineCount: number,         // 离线数量
         hash: string,                 // 哈希值
         createdAt: string,            // 创建时间（ISO字符串）
         updatedAt: string             // 更新时间（ISO字符串）
       }
       ```
   - `window.MWI_Toolkit.characterItems.map` - 物品数据映射表，结构为 `Map<itemHrid, Map<enhancementLevel, count>>`
     - 外层Map的key为itemHrid（如"/items/oak_log"）
     - 内层Map的key为enhancementLevel（强化等级，数字），value为count（数量，数字）

2. **国际化支持 (window.MWI_Toolkit.i18n)**
   - `window.MWI_Toolkit.i18n.getItemName(itemHrid, lang = "zh")` - 根据itemHrid获取物品名称，支持多语言
   - `window.MWI_Toolkit.i18n.getName(hrid, fieldName = null, lang = "zh")` - 通用方法，根据Hrid获取对应名称
   - `window.MWI_Toolkit.i18n.getItemHridByName(itemName, lang = "zh")` - 根据物品名称查找itemHrid
   - `window.MWI_Toolkit.i18n.getHridByName(name, fieldName = null, lang = "zh")` - 根据名称查找对应Hrid

3. **角色切换监听**
   - `window.MWI_Toolkit.switchCharacterCallbacks` - 角色切换事件回调数组，切换角色时自动触发
     - 回调函数签名：`function()` - 无参数，当检测到角色切换时调用

4. **游戏数据访问**
   - `window.MWI_Toolkit.init_character_data` - 角色初始化数据
   - `window.MWI_Toolkit.init_client_data` - 客户端初始化数据

### Features (English)

Core library providing global i18n data and data capture capabilities for other MWI Toolkit scripts

#### Main API Interfaces

1. **Item Data Management (window.MWI_Toolkit.characterItems)**
   - `window.MWI_Toolkit.characterItems.getCount(itemHrid, enhancementLevel = 0)` - Query item quantity, enhancementLevel defaults to 0
   - `window.MWI_Toolkit.characterItems.getMaxEnhancementLevel(itemHrid)` - Query item's maximum enhancement level, ignoring items with count 0
   - `window.MWI_Toolkit.characterItems.changeCallbacks` - Item change event callback array for monitoring item changes
     - Callback function signature: `function(endCharacterItems: Array<CharacterItem>)`
     - Parameter contains updated item data array, each object structure:
       ```
       {
         id: number,                    // Item record ID
         characterID: number,           // Character ID
         itemLocationHrid: string,      // Item location (e.g., "/item_locations/inventory")
         itemHrid: string,             // Item ID (e.g., "/items/azure_milk")
         enhancementLevel: number,      // Enhancement level
         count: number,                // Quantity
         offlineCount: number,         // Offline quantity
         hash: string,                 // Hash value
         createdAt: string,            // Creation time (ISO string)
         updatedAt: string             // Update time (ISO string)
       }
       ```
   - `window.MWI_Toolkit.characterItems.map` - Item data mapping structure: `Map<itemHrid, Map<enhancementLevel, count>>`
     - Outer Map key: itemHrid (e.g., "/items/oak_log")
     - Inner Map key: enhancementLevel (number), value: count (number)

2. **Internationalization Support (window.MWI_Toolkit.i18n)**
   - `window.MWI_Toolkit.i18n.getItemName(itemHrid, lang = "zh")` - Get item name by itemHrid with multi-language support
   - `window.MWI_Toolkit.i18n.getName(hrid, fieldName = null, lang = "zh")` - Generic method to get name by Hrid
   - `window.MWI_Toolkit.i18n.getItemHridByName(itemName, lang = "zh")` - Find itemHrid by item name
   - `window.MWI_Toolkit.i18n.getHridByName(name, fieldName = null, lang = "zh")` - Find Hrid by name

3. **Character Switch Monitoring**
   - `window.MWI_Toolkit.switchCharacterCallbacks` - Character switch event callback array, triggered automatically on character change
     - Callback function signature: `function()` - No parameters, called when character switch is detected

4. **Game Data Access**
   - `window.MWI_Toolkit.init_character_data` - Character initialization data
   - `window.MWI_Toolkit.init_client_data` - Client initialization data