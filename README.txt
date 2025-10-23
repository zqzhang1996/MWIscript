MWI Toolkit Scripts

项目地址：
GitHub: https://github.com/zqzhang1996/MWIscript
Gitee镜像: https://gitee.com/zqzhang1996/MWIscript

================================================================================

MWI Toolkit ActionDetailPlus

脚本地址: https://greasyfork.org/en/scripts/550483-mwi-toolkit-actiondetailplus
Gitee镜像: https://gitee.com/zqzhang1996/MWIscript/raw/main/MWI_Toolkit_ActionDetailPlus.js

【中文说明】
为前八个专业的动作面板提供增强功能（炼金支持正在考虑中）

1. 目标数量输入
   - 为所有单次产出数量大于1的动作添加目标数量输入框，与动作次数输入框实时联动
   - 对于使用加工茶的动作，提供额外输入框显示最终获得的加工产物数量

2. 原材料需求追踪
   - 自动计算并显示所需原材料数量，与动作输入实时同步。当库存不足时，缺口数量将以橙色高亮显示

3. 重要提醒
   - 社区采集加成基于打开动作面板时的等级计算，若执行过程中加成失效或升级，计算结果可能出现偏差
   - 茶效果基于页面加载时的配置计算，修改茶配置后需刷新页面生效（未来可能改为实时更新）
   - 暴饮之囊、采集首饰、贤者首饰只要拥有即视为启用状态，贤者首饰优先级高于采集首饰

【English Description】
Enhances the action panel for the first eight professions (alchemy support may be added in the future).

1. Target Quantity Input
   - Adds a target quantity input field for all actions that produce more than 1 item per execution, automatically syncing with the action count field.
   - For actions involving processed tea, provides an additional input field showing the final number of processed items you'll receive.

2. Material Requirements Tracking
   - Displays required material quantities that dynamically update based on your action inputs. When inventory is insufficient, the shortage amount is highlighted in orange.

3. Important Notes
   - Community gathering buffs are calculated based on the level when the action panel opens. Results may be inaccurate if buffs expire or upgrade during execution.
   - Tea effects are calculated using the configuration present when the page loads. You must refresh the page after changing tea settings (real-time updates may be implemented in the future).
   - Guzzling Pouch, Gathering Jewelry, and Philosopher's Jewelry are automatically considered active when owned. Philosopher's Jewelry takes priority over Gathering Jewelry.

================================================================================

MWI Toolkit Calculator

脚本地址: https://greasyfork.org/en/scripts/552330-mwi-toolkit-calculator
Gitee镜像: https://gitee.com/zqzhang1996/MWIscript/raw/main/MWI_Toolkit_Calculator.js

【中文说明】
最初为解决IC模式下房屋建造的材料计算难题而开发，现已扩展为全能的物品清单计算器

0. 计算器界面
   - 在配装标签页右侧新增计算器标签页
   - 仅适配桌面版布局，因宽度限制暂不支持移动端窄屏界面

1. 物品需求管理
   - 通过顶部搜索功能按数量添加物品至需求清单，支持直接选择房屋并按等级添加
   - 需求清单按角色独立保存，页面刷新后数据不会丢失
   - 支持跨角色复制需求清单：在搜索框输入目标角色ID（游戏网址中的数字）并点击添加，适合管理多个IC角色的玩家

2. 库存状态总览
   - 左侧面板实时显示当前库存/目标数量，房屋显示当前等级/目标等级
   - 库存数据实时更新，但房屋等级变更后需刷新页面以获取准确数据

3. 材料缺口分析
   - 右侧面板基于当前库存从源头计算所有缺失材料的数量，需要对制作配方有基本了解，从最基础的原材料开始逐步处理
   - 缺口数量实时更新，跟随制作进度动态调整
   - 已满足需求的物品自动隐藏，保持界面简洁

【English Description】
Originally developed to solve material calculation challenges when building houses in IC mode, this tool has evolved into a comprehensive item list calculator.

0. Calculator Interface
   - Adds a calculator tab to the right of the loadouts tab.
   - Desktop layout only - mobile UI is not supported due to width limitations.

1. Item Management
   - Search and add items to your wishlist by quantity at the top of the interface. You can also select houses and add them by level.
   - Wishlists are saved per character and persist through page refreshes.
   - Copy another character's wishlist by entering their character ID (the number from the game's URL) in the search box and clicking Add. This feature is particularly useful for players managing multiple IC characters.

2. Inventory Overview
   - The left panel shows current inventory vs. target quantities. For houses, it displays current level vs. target level.
   - Current inventory updates in real-time, but you must refresh the page after changing house levels to get accurate data.

3. Material Requirements Calculation
   - The right panel calculates all missing materials from scratch based on your current inventory. You'll need some understanding of crafting recipes to process items efficiently, starting with the most basic raw materials.
   - Missing quantities update in real-time as you make progress.
   - Completed items are automatically hidden from view.