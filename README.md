# Shop-OS 电商代理商系统

> 零售商城 + 大礼包入会 + 月度领货权益 + 站内转卖 + 三级分销佣金

## 项目结构

```
shop-OS/
├── packages/
│   └── shared/              # 共享包 - 设计令牌、类型、工具、Mock 数据
│       └── src/
│           ├── tokens/       # 设计令牌（颜色、间距、字体、圆角、阴影）
│           ├── types/         # 全局 TypeScript 类型定义
│           ├── utils/         # 工具函数（金额格式化、日期、折扣计算等）
│           ├── composables/   # Vue Composables（useLocalStorage、useListQuery 等）
│           └── data/          # Mock 数据库（模拟全部业务数据）
│
├── apps/
│   ├── admin/                # 运营管理后台 (Vue3 + Element Plus + Vite)
│   │   └── src/
│   │       ├── layouts/       # 主布局（侧边栏 + 顶栏 + 标签页）
│   │       ├── views/         # 页面
│   │       │   ├── dashboard/  # 数据看板
│   │       │   ├── product/   # 商品管理、分类、大礼包
│   │       │   ├── order/     # 订单管理
│   │       │   ├── member/    # 会员管理、代理商管理
│   │       │   ├── distribution/ # 分销关系、佣金规则、佣金记录、提现
│   │       │   ├── benefit/   # 等级权益、领货规则、转卖规则、全局参数
│   │       │   ├── credit/    # 月度领货管理
│   │       │   ├── resell/    # 转卖管理
│   │       │   ├── finance/   # 财务管理
│   │       │   └── system/    # 系统设置、日志审计
│   │       ├── components/    # 标准化组件（SfPageContainer、SfStatCard 等）
│   │       └── api/           # Mock API
│   │
│   └── shop/                 # 前台商城 H5 (Vue3 + Vant + Vite)
│       └── src/
│           ├── layouts/       # Tab 布局（底部导航）
│           ├── views/
│           │   ├── shop/      # 首页、分类、详情、购物车、结算、订单、入会专区
│           │   ├── agent/    # 工作台、月度领货、转卖中心、佣金、团队、推广
│           │   └── common/   # 个人中心
│           ├── components/   # 共享组件（ProductCard、LevelBadge）
│           ├── stores/       # Pinia（用户、购物车）
│           └── api/          # Mock API
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端（管理后台） | Vue3 + Element Plus + Vite + TypeScript |
| 前端（商城 H5） | Vue3 + Vant + Vite + TypeScript |
| 状态管理 | Pinia |
| 图表 | ECharts |
| 共享层 | 自研 @shop-os/shared（设计令牌 + 类型 + 工具 + Mock 数据） |
| 包管理 | pnpm Workspaces |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动管理后台 (http://localhost:5173)
pnpm dev:admin

# 启动商城 H5 (http://localhost:5174)
pnpm dev:shop

# 构建全部
pnpm build:all
```

## 标准化设计系统

### 设计令牌 (packages/shared/src/tokens/)

所有颜色、间距、字体、圆角、阴影统一定义，Admin 和 Shop 共用：

- **品牌色**: `#e54d42`（商城红，涨/促销/品牌）
- **等级色**: 金卡 `#d4a851`、银卡 `#9a9a9a`
- **功能色**: 成功 `#39b54a`（跌/完成）、警告 `#fbbd08`、危险 `#e54d42`
- **间距**: 4px 基准（xs/sm/md/base/lg/xl/xxl/xxxl）

### 共享类型 (packages/shared/src/types/)

覆盖全部核心领域：会员、商品、订单、佣金、领货、转卖、配置等，含枚举与中文标签映射。

### 标准化组件

**Admin 端**:
- `SfPageContainer` — 页面容器（标题+描述+操作区）
- `SfStatCard` — 数据统计卡片
- `SfPriceTag` — 价格标签
- `SfLevelTag` — 会员等级标签
- `SfStatusBadge` — 状态徽章

**Shop 端**:
- `ProductCard` — 商品卡片（含会员价展示）
- `LevelBadge` — 等级徽章

## 业务模式

### 核心流程

1. **零售购买** → 商城购物 → 会员折扣（金卡8折/银卡9折）→ 下单支付 → 发货
2. **大礼包入会** → 购买9800/5800大礼包 → 升级代理商 → 生成10月领货权益 → 三级佣金冻结
3. **月度领货** → 每月额度（金卡980/银卡580）→ 领取自用 或 转卖变现
4. **站内转卖** → 扣减额度 → 生成转卖单 → 匹配池 → 匹配成功 → 结算到账（扣20%服务费+快递费）
5. **三级分销** → A推荐B→B推荐C→C推荐D → D购买大礼包 → C(一级)/B(二级)/A(三级)各获佣金

### 权益规则（全部后台可配）

| 配置项 | 默认值 |
|--------|--------|
| 金卡入门金额 | ¥9,800 |
| 银卡入门金额 | ¥5,800 |
| 金卡商城折扣 | 8折 |
| 银卡商城折扣 | 9折 |
| 金卡月度领货 | ¥980/月 |
| 银卡月度领货 | ¥580/月 |
| 领货月数 | 10个月 |
| 转卖服务费 | 20% |
| 转卖快递费 | ¥10 |
| 9800佣金 | 一级15%/二级5%/三级2% |
| 5800佣金 | 一级10%/二级3%/三级1% |
| 佣金结算 | 确认收货后7天 |

## 合规设计

- 三级分销为法定上限，技术上硬编码最多三级
- 文案使用「推荐」「合作伙伴」「分享奖励」，禁用「下线」「拉人头」
- 团队页面按 Tab 列表展示，不画树状图
- 大礼包商品排除折扣，确保入门金额不变
