# 橙选 Shop-OS 技术文档

面向二次开发 / 运维 / 接口对接的完整技术参考。产品功能与部署速览见根目录 [README.md](../README.md)。

## 目录

- [1. 架构总览](#1-架构总览)
- [2. 后端约定](#2-后端约定)
  - [2.1 统一响应体与错误码](#21-统一响应体与错误码)
  - [2.2 鉴权模型](#22-鉴权模型)
  - [2.3 权限与角色](#23-权限与角色)
  - [2.4 数据库访问约定](#24-数据库访问约定)
  - [2.5 数据库迁移策略](#25-数据库迁移策略)
- [3. 数据库表结构](#3-数据库表结构)
- [4. REST 接口清单](#4-rest-接口清单)
- [5. 核心业务流程](#5-核心业务流程)
- [6. 部署架构](#6-部署架构)

---

## 1. 架构总览

```
┌────────────────┐   ┌────────────────┐
│  apps/admin     │   │  apps/shop      │   浏览器 / App
│  Vue3+ElementPl │   │  Vue3+Vant      │
└───────┬────────┘   └───────┬────────┘
        │  fetch /api/v1/*            │
        └───────────────┬──────────────┘
                         ▼
              ┌──────────────────────┐
              │   apps/server         │  Express 4 + TypeScript
              │   routes/ · services/ │
              │   middlewares/ · db/  │
              └──────────┬────────────┘
                         │  node:sqlite
                         ▼
              ┌──────────────────────┐
              │  SQLite 单文件数据库    │  data/shop-os.db
              └──────────────────────┘

packages/shared —— 设计令牌 / TS 类型 / 工具函数，被 admin 与 shop 共同引用
```

- **单体后端 + 双前端**：一个 Express 服务同时服务管理后台与会员商城两套接口（`/api/v1/*` 下分为后台管理接口与 `/api/v1/shop/*` 商城公开/会员接口两大类）。
- **数据库**：使用 Node.js 22 内置的 `node:sqlite`（`DatabaseSync`），单文件、无需额外数据库进程，`journal_mode = DELETE`（而非 WAL，避免容器环境下杀毒/同步进程对 `-wal` 文件加锁导致写入失败）。
- **鉴权**：管理员与会员是两套完全独立的 JWT 体系，互不通用（见 [2.2](#22-鉴权模型)）。
- **权限**：管理员按角色 → 权限点两级模型（见 [2.3](#23-权限与角色)）。

### 技术栈版本

| 包 | 关键依赖 |
|----|---------|
| `apps/server` | express ^4.19、jsonwebtoken ^9、bcryptjs ^2.4、multer ^1.4、zod ^3.23、typescript ^5.5、tsx（开发热重载） |
| `apps/admin` | vue ^3.4、element-plus ^2.7、echarts ^5.5、pinia ^2.1、vite ^5.2 |
| `apps/shop` | vue ^3.4、vant ^4.9、pinia ^2.1、@capacitor/android ^8.5、vite ^5.2 |
| `packages/shared` | 纯 TypeScript，无框架依赖，供 admin/shop 直接引用源码（非构建产物） |

---

## 2. 后端约定

### 2.1 统一响应体与错误码

所有接口返回统一 JSON 结构（`apps/server/src/utils/response.ts`）：

```ts
{ code: number, message: string, data: T | null }
```

| code | 含义 | HTTP 状态 |
|------|------|-----------|
| 0 | 成功 | 200 / 201 |
| 40000 | 参数错误 / 业务校验失败 | 400 |
| 40100 | 未登录或登录已过期 | 401 |
| 40300 | 无权限 | 403 |
| 40400 | 资源不存在 | 404 |
| 40900 | 冲突（唯一性/状态冲突） | 409 |
| 50000 | 服务器内部错误 | 500 |

请求体校验统一使用 [zod](https://zod.dev)，校验失败会被全局错误处理中间件转换为 `40000` 响应。

### 2.2 鉴权模型

系统存在两套**互不通用**的 JWT：

| | 管理员 Token | 会员 Token |
|---|---|---|
| 签发接口 | `POST /auth/login` | `POST /shop/member/login`、`/shop/member/register` |
| Payload | `{ uid, username, role }` | `{ type: 'member', mid, phone }` |
| 有效期 | 由 `JWT_EXPIRES_IN` 配置（默认 7 天） | 30 天 |
| 请求头 | `Authorization: Bearer <token>` | `Authorization: Bearer <token>` |
| 校验中间件 | `requireAuth` | `requireMember` |

中间件（`apps/server/src/middlewares/auth.ts`）：

- `requireAuth`：管理员必须登录，写入 `req.auth`
- `requireMember`：会员必须登录，写入 `req.member`
- `requireRole(...roles)`：限定管理员角色码（如 `super_admin`）
- `requirePermission(code)` / `requireAnyPermission(...codes)`：按权限点校验；`super_admin` 恒放行，其余角色查 `admin_role.permissions`（JSON 数组）

### 2.3 权限与角色

权限点定义在 `apps/server/src/permissions.ts`，共 26 个权限码，按模块分组：仪表盘、商城管理、订单管理、会员管理、分销管理、权益配置、领货管理、转卖管理、客服工单、财务管理、系统设置。

内置角色（`admin_role` 表，`is_builtin=1` 不可删除，服务启动时幂等补种）：

| 角色码 | 名称 | 权限范围 |
|--------|------|---------|
| `super_admin` | 超级管理员 | 全部权限，恒通过所有权限校验 |
| `ops` | 运营 | 商城/订单/会员/权益/领货/转卖/分销关系/海报/工单日常运营，不含财务与角色管理 |
| `finance` | 财务 | 佣金查看、提现审核与打款、财务总览、分销关系查看 |
| `customer_service` | 客服 | 订单查看/发货、会员查看、领货查看、工单处理 |

管理后台也支持新增**自定义角色**（`POST /roles`），从全量权限点中勾选组合。

### 2.4 数据库访问约定

- 表名 `snake_case` 复数；主键 `id INTEGER PRIMARY KEY AUTOINCREMENT`
- 外键列以 `_id` 结尾；金额统一 `REAL`（元，两位小数，见 `utils/money()`）
- 时间统一 `TEXT`，格式 `YYYY-MM-DD HH:mm:ss`（本地时区，见 `utils/now()`）
- 状态列 `status INTEGER`：多数表 `1` 启用/有效、`0` 停用/无效（个别表如订单、提现有更多状态值，见下表）
- 查询层（`apps/server/src/db/index.ts`）统一做 **snake_case → camelCase** 转换：`all()` / `get()` 返回的字段名与前端 TS 类型保持一致，无需在路由层手写映射（路由里出现的 `AS xxxAs` 是 SQL 别名，直接决定了返回字段名）
- `paginate(baseSql, countSql, params, page, pageSize)` 统一分页，返回 `{ list, total, page, pageSize }`

### 2.5 数据库迁移策略

本项目**没有传统迁移文件系统**，采用三层幂等策略，全部在 `apps/server/src/db/index.ts` 与 `db/seed.ts` 中：

1. **建表**：`schema.ts` 的 `CREATE TABLE IF NOT EXISTS` 在每次启动时执行，新增表可以直接加进去。
2. **补列**：已上线表新增字段时，用 `ensureColumn(table, column, ddl)` 做 `ALTER TABLE ... ADD COLUMN`（幂等：先查 `PRAGMA table_info` 是否已存在）。
3. **首次种子数据**：`seed()` 函数顶部有 `if (seeded('seed.done')) return` 的**一次性**守卫——`system_config` 表里存在 `seed.done` 这一行就直接跳过，不会重复插入管理员账号、演示商品等初始数据。

   ⚠️ **常见坑**：新增的 `system_config` 配置项如果只加进 `seed()` 内部 `seeded('seed.done')` 判断之后的数组里，**旧数据库永远不会补上**（包括本地已跑过一次的开发库、以及生产环境已运行过的 Docker 数据卷）。正确做法是加进 `seed()` 函数最开头、`seed.done` 判断**之前**的 `patchConfigDefaults()` 之类的无条件幂等补丁函数（`INSERT OR IGNORE`），让它在每次进程启动时都执行一遍。当前 `site.logo` / `site.icon` 两个配置项就是用这种方式补的，可参考同样写法追加新配置项。
4. **演示数据补种**：`ensureDemoData()` / `ensureSysConfig()` / `ensureAgentTimes()` / `ensureBuiltinRoles()` / `ensurePromoteGuide()` 在每次进程启动时执行，只在数据缺失时补齐，用于老库升级场景。

---

## 3. 数据库表结构

数据库为单文件 SQLite（默认路径 `apps/server/data/shop-os.db`，可用 `DB_FILE` 环境变量覆盖）。以下按业务域分组列出全部 34 张表。

### 3.1 管理员与权限

**`admin_user`** 管理员账号

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| username | TEXT UNIQUE | 登录账号 |
| password_hash | TEXT | bcrypt 哈希 |
| name | TEXT | 姓名 |
| role | TEXT | 角色码，关联 `admin_role.code` |
| avatar | TEXT | 头像 URL |
| status | INTEGER | 1 启用 / 0 禁用 |
| created_at / updated_at | TEXT | |

**`admin_role`** 角色（权限组）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| code | TEXT UNIQUE | 角色编码 |
| name | TEXT | 角色名称 |
| description | TEXT | |
| permissions | TEXT | 权限码 JSON 数组，空数组=无权限（非"全部"） |
| is_builtin | INTEGER | 1 内置角色，不可删除 |
| status | INTEGER | |

**`admin_log`** 操作日志 ｜ **`admin_login_log`** 登录日志（含 `success` 字段记录登录失败尝试）

### 3.2 会员、钱包与等级权益

**`level_config`** 等级权益配置（后台"权益配置"页面的可视化编辑对象，`member.level` 与 `gift_package.level` 均引用此表的 `level`）

| 字段 | 类型 | 说明 |
|------|------|------|
| level | INTEGER UNIQUE | 等级序号，0 由代码保留给"普通会员"，配置表中一般从 1 开始 |
| level_name | TEXT | 等级名称，如"银卡代理商" |
| level_sort | INTEGER | 展示排序 |
| entry_amount | REAL | 入门金额（对应大礼包价格，仅展示用途，实际以礼包价格为准） |
| shop_discount | INTEGER | 商城折扣，100=不打折，90=9 折 |
| monthly_credit | REAL | 每月领货额度 |
| credit_months | INTEGER | 领货持续月数（当前未做到期自动停发的调度，需配合 `member.level_expire_time` 后续扩展） |
| resell_fee_rate | REAL | 转卖服务费率(%)（当前转卖服务费在下单时由前端计算传入，此字段为预留的等级维度费率位） |
| status | INTEGER | 1 启用 / 0 停用 |

**`member`** 会员 / 代理商（含三级推荐关系）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| username / password_hash | TEXT | 会员登录用手机号（见下方 `phone`），密码可为空（老数据） |
| nickname / avatar / phone | TEXT | |
| level | INTEGER | 0 普通会员，1+ 对应 `level_config.level`（代理商等级） |
| invite_code | TEXT UNIQUE | 专属邀请码 |
| inviter_id / second_inviter_id / third_inviter_id | INTEGER | 一/二/三级邀请人，注册时按邀请人的邀请链一次性写死，不随后续关系变化 |
| status | INTEGER | 1 正常 / 2 冻结 |
| real_name | TEXT | 迁移补列 |
| register_time / become_agent_time / level_expire_time | TEXT | 迁移补列：注册时间 / 成为代理商时间 / 等级到期时间（当前未启用到期逻辑，预留字段） |

**`wallet`** 钱包（与 member 一对一）：`balance` 可提现余额、`frozen` 冻结中（提现审核期间）、`total_income` 累计收入、`total_withdraw` 累计已提现

**`payout_account`** 提现收款账号（会员维护，与 member 一对一）：银行卡三要素 + 支付宝姓名/账号

### 3.3 商品与分类

**`category`** 分类（自引用二级）：`parent_id=0` 为根分类，`is_gift_zone` 标记"入会专区"（不可停用）

**`product_spu`** 商品 SPU：`is_gift_package` 是否为礼包商品、`is_monthly_product` 是否月度领货商品、`exclude_discount` 是否排除会员折扣（大礼包内商品恒为 1，保证入门金额不被打折）、`images` 为 JSON 数组字符串

**`product_sku`** 商品 SKU：`spec_info` JSON 字符串（规格键值），`price`/`original_price`/`stock`/`sales`

**`gift_package`** 入会大礼包：关联一个 `spu_id` 展示商品 + `level` 对应代理商等级

**`gift_package_item`** 礼包内含 SKU 明细（`package_id` → `gift_package.id`）

### 3.4 订单

**`order`**（SQL 中需加引号 `"order"`，为 SQLite 保留字冲突处理）

| 字段 | 类型 | 说明 |
|------|------|------|
| order_no | TEXT UNIQUE | 业务单号，`genNo('SO')` 生成 |
| member_id / member_name | | |
| order_type | INTEGER | 1 零售 / 2 礼包 |
| total_amount / discount_amount / shipping_fee / pay_amount | REAL | |
| status | INTEGER | 0 待支付 / 1 待发货 / 2 待收货 / 3 已完成 / 4 已取消 / 6 已退款（退款审核通过后，见 `order.ts`） |
| receiver_name / receiver_phone / receiver_address | | |
| logistics_company / logistics_no | | |
| create_time / pay_time / ship_time / finish_time / cancel_time | TEXT，可空 | |

**`order_item`** 订单明细：`member_level` 记录下单时买家等级（用于礼包场景下识别礼包等级，驱动分销佣金计算）

**`payment_order`** 支付单：`pay_type`（wechat/alipay）、`status`（0 待支付/1 已支付/2 已关闭）、`trade_no` 第三方交易号（mock 模式为 `MOCK` 前缀伪造值）

### 3.5 分销与佣金

**`commission`** 佣金记录

| 字段 | 类型 | 说明 |
|------|------|------|
| member_id | INTEGER | 收佣人 |
| source_member_id | INTEGER | 触发佣金的下单人（下级） |
| order_id | INTEGER | 触发佣金的礼包订单 |
| package_level | INTEGER | 礼包对应等级 |
| distribution_level | INTEGER | 1/2/3，收佣人相对下单人的分销层级 |
| rate / amount | REAL | 费率(%) / 金额 |
| status | INTEGER | 0 待结算 / 1 可提现 / 2 已提现（预留，当前提现走钱包汇总余额，不回写单条佣金）/ 3 已冻结（预留未使用）/ 4 已回滚 |
| settlement_due_time | TEXT | 到期自动结算时间点，订单完成时按 `commission.settle_days` 天数计算写入 |
| settle_time / rollback_reason | | |

**`commission_rule`** 佣金费率配置：`(package_level, distribution_level)` 唯一确定一条费率

### 3.6 领货与转卖

**`credit_record`** 月度领货额度：`month`（'YYYY-MM'）、`credit_amount`/`used_amount`/`remain_amount`、`status`（0 待使用/1 部分使用/2 已用完/3 已过期，预留/4 已转卖）

**`credit_flow`** 领货额度流水：`type` 1 发放/2 使用/3 调整（后台人工）/4 回补（取消转卖时回补）

**`resell_order`** 转卖单：`credit_id` 关联被消耗的领货额度、`order_id`/`order_no` 关联匹配到的零售订单（可空——商城端发起转卖时不强制关联具体订单，由后台人工匹配）、`status`（0 待匹配/1 匹配中，预留/2 已匹配/3 已完成/4 已取消/5 匹配失败，预留）

> ⚠️ **实现细节**：`service_fee`/`shipping_fee`/`settle_amount` 由**商城前端**按 `system_config` 中的 `resell.service_fee_rate`/`resell.shipping_fee` 算好后随 `POST /shop/member/resells` 一并提交，服务端（`routes/shop-member.ts`）仅校验 `settleAmount > 0` 与领货额度是否充足，**不会用配置费率重新核算**这三个金额。二次开发涉及资金安全加固时，应在服务端补一遍费率复核。

### 3.7 财务

**`finance_flow`** 资金流水（全平台维度的流水账，链式记录 `balance` 滚动余额）

| type | 含义 |
|------|------|
| 1 | 订单收入 |
| 2 | 转卖服务费收入 |
| 3 | 佣金支出（含结算/强制结算的负向，回滚冲正的正向） |
| 4 | 提现打款支出 |
| 5 | 其他（订单退款支出、转卖结算给会员） |

**`withdraw`** 提现单：`pay_type`（0 银行卡/1 支付宝）、`status`（0 待审核/1 待打款/2 已打款/3 已驳回）、`fee`/`actual_amount`

### 3.8 系统配置与内容

**`system_config`** 通用键值配置表（`config_key` 唯一），后台"全局参数"页面即此表的可视化编辑器。当前分组（`config_group`）：`basic`（站点名称/客服电话/域名/Logo/图标）、`order`、`withdraw`、`credit`、`resell`、`distribution`、`payment`（微信/支付宝网关参数）。

**`help_article`** 帮助与规则文档：`scope`（help 帮助文档 / rules 规则条款），前台 `/mine/help`、`/mine/rules` 读取

**`promote_poster`** 推广海报：`is_fixed` 唯一固定海报（同一时刻只有一张），`qr_x`/`qr_y`/`qr_size` 为二维码在海报图上的百分比布局坐标，供前台合成专属二维码

**`file_group`** / **`file_asset`** 文件素材库分组与文件：`file_asset.type`（1 图片/2 视频），`file_group.match_rules` 支持按关键字/`image`/`video` 自动归组

### 3.9 会员端个人数据

`member_address`（收货地址，`is_default` 唯一默认）、`member_cart`（购物车，`(member_id, sku_id)` 唯一）、`member_favorite`（收藏，唯一）、`member_browse`（浏览历史，同一商品仅保留最新一条）、`member_notification`（消息通知，`type`: order/commission/credit/system）

### 3.10 客服

**`work_order`** 客服工单：`type`（consult/order/after_sale/commission/withdraw/other）、`priority`（1-3）、`status`（0 待处理/1 处理中/2 已回复/3 已关闭）、`images` JSON 数组

---

## 4. REST 接口清单

统一前缀 `/api/v1`。**鉴权列**说明：`公开` 无需任何 token；`管理员` 需 `requireAuth`（部分标注具体权限码）；`会员` 需 `requireMember`。

### 4.1 认证 `/auth`（`routes/auth.ts`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | /auth/login | 公开 | 管理员登录，返回 token + 用户信息 + 权限码数组（`super_admin` 返回 `permissions: null` 代表全部） |
| GET | /auth/me | 管理员 | 当前登录管理员信息 |
| POST | /auth/logout | 公开 | JWT 无状态，仅作占位 |

### 4.2 管理员账号 `/admins`（`routes/admin.ts`，全量 `requireAuth + requireRole('super_admin')`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admins | 分页列表，支持账号/姓名关键字 |
| GET | /admins/:id | 详情 |
| POST | /admins | 新增（校验角色是否存在） |
| PUT | /admins/:id | 编辑（密码可选，超管仅超管可编辑） |
| PATCH | /admins/:id/status | 启停（超管不可禁用） |
| DELETE | /admins/:id | 删除（超管不可删除，不可删除自己） |

### 4.3 角色权限 `/roles`（`routes/roles.ts`，全量 `requireRole('super_admin')`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /roles | 角色列表 |
| GET | /roles/permission-tree | 权限点清单（按分组返回，供前端渲染勾选树） |
| POST | /roles | 新增自定义角色 |
| PUT | /roles/:id | 编辑（校验权限码合法性） |
| DELETE | /roles/:id | 删除（内置角色/仍有管理员占用时禁止） |
| POST | /roles/seed-builtin | 重置内置角色为默认值（幂等） |

### 4.4 商品分类 `/categories`（`routes/category.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /categories | - | 分类树（含每个分类下商品数） |
| POST | /categories | category:edit | 新增 |
| PUT | /categories/:id | category:edit | 编辑（入会专区不可停用） |
| DELETE | /categories/:id | category:edit | 删除（级联删子分类，商品分类置空） |

### 4.5 商品管理 `/products`（`routes/product.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /products | - | 分页，含 SKU 数/总库存 |
| GET | /products/:id | - | 详情含 SKU 列表 |
| POST | /products | product:edit | 新增 SPU |
| PUT | /products/:id | product:edit | 编辑 SPU |
| PATCH | /products/status | product:edit | 批量上下架 |
| PATCH | /products/:id/status | product:edit | 单个上下架 |
| DELETE | /products/:id | product:edit | 删除（级联删 SKU） |
| DELETE | /products | product:edit | 批量删除（body: `{ ids }`） |
| GET | /products/:id/skus | - | SKU 列表 |
| POST | /products/:id/skus | product:edit | 新增 SKU |
| PUT | /products/:id/skus/:skuId | product:edit | 编辑 SKU |
| DELETE | /products/:id/skus/:skuId | product:edit | 删除 SKU |

### 4.6 入会大礼包 `/gift-packages`（`routes/gift.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /gift-packages | - | 列表（含明细 items） |
| POST | /gift-packages | gift:edit | 新增（含 items） |
| PUT | /gift-packages/:id | gift:edit | 编辑（items 整体替换） |
| PATCH | /gift-packages/:id/status | gift:edit | 上架/停售 |
| DELETE | /gift-packages/:id | gift:edit | 删除 |

### 4.7 订单管理 `/orders`（`routes/order.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /orders | - | 分页，支持状态/类型/关键字筛选 |
| GET | /orders/:id | - | 详情含明细 |
| PATCH | /orders/:id/status | order:ship | 更新状态（发货需物流信息；状态流转有严格前置校验） |
| PATCH | /orders/ship | order:ship | 批量发货 |
| POST | /orders/:id/refund-audit | order:ship | 退款审核（通过则回滚佣金 + 回补库存 + 记资金流水） |

### 4.8 会员管理 `/members`（`routes/member.ts`，`requireAuth`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /members | 分页，关键字/等级/状态筛选 |
| GET | /members/:id | 详情（含订单/佣金统计、直属与团队人数、近 5 条订单与佣金） |
| GET | /members/:id/wallet | 钱包 |
| PATCH | /members/:id/status | 启停（1 正常/2 冻结） |
| POST | /members | 后台录入会员（若指定代理商等级，自动发放当月领货额度） |
| GET | /members/:id/orders | 订单记录（分页） |
| GET | /members/:id/commissions | 佣金记录（分页） |
| GET | /members/:id/credits | 领货额度列表 |

### 4.9 分销佣金 `/commissions`（`routes/commission.ts`，`requireAuth`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /commissions | 分页，读取前会先触发一次到期佣金自动结算扫描 |
| GET | /commissions/:id | 详情 |

### 4.10 提现管理 `/withdraws`（`routes/withdraw.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /withdraws | - | 分页 |
| POST | /withdraws/:id/audit | withdraw:audit | 审核（驳回自动解冻退回余额） |
| POST | /withdraws/:id/pay | withdraw:audit | 打款（扣冻结、累加累计提现、记资金流水） |

### 4.11 月度领货 `/credits`（`routes/credit.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /credits | - | 分页 |
| POST | /credits/:id/adjust | credit:adjust | 人工调整额度（body: `{ delta, reason }`，正增负减，自动重算状态） |

### 4.12 转卖管理 `/resells`（`routes/resell.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /resells | - | 分页 |
| GET | /resells/pending-orders | - | 可供匹配的待发货零售订单（近 50 条） |
| POST | /resells/:id/match | resell:match | 手动匹配到某个零售订单 |
| POST | /resells/:id/complete | resell:match | 完成结算（入会员钱包余额，记两笔资金流水） |
| POST | /resells/:id/cancel | resell:match | 取消（回补领货额度） |

### 4.13 权益与系统配置 `/config`（`routes/config.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /config/levels | - | 等级权益配置列表 |
| PUT | /config/levels/:id | benefit:config | 编辑等级权益 |
| POST | /config/levels | benefit:config | 新增等级（自动取下一个等级序号） |
| DELETE | /config/levels/:id | benefit:config | 删除（至少保留一个等级） |
| GET | /config/commission-rules | - | 佣金费率列表 |
| PUT | /config/commission-rules/:id | benefit:config | 编辑费率 |
| GET | /config/system?group= | - | 通用配置列表（可按分组筛选） |
| PUT | /config/system/:id | benefit:config 或 system:admin | 编辑配置值 |

### 4.14 站点品牌配置 `/site`（`routes/site.ts`，公开）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /site/config | 公开接口，返回 `{ name, logo, icon }`（读取 `system_config` 的 `site.name`/`site.logo`/`site.icon`），供登录页/未登录场景展示站点品牌，值为空时前端回退到内置默认资源 |

站点 Logo/图标本身通过后台"全局参数"页面的文件上传控件写入 `system_config`（复用 `POST /files/upload` 通用上传接口，见 4.16），不需要单独的写接口。

### 4.15 数据看板 `/dashboard`（`routes/dashboard.ts`，`requireAuth`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /dashboard/summary | 会员/代理商总数、今日新增、订单与营收统计、待处理事项计数、领货使用率、等级分布 |
| GET | /dashboard/trends?days=7 | 近 N 天（7-30）营收与订单数趋势 |

### 4.16 文件与素材库 `/files`、`/file-groups`（`routes/file.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | /files/upload | - | 上传（multipart `file` 字段，≤200MB，自动按分组规则归组，也可指定 `groupId`） |
| GET | /files | - | 分页，关键字/类型(image\|video)/分组筛选 |
| PATCH | /files/group | - | 批量移动分组 |
| PATCH | /files/:id/group | - | 单个移动分组 |
| PATCH | /files/:id/name | - | 重命名 |
| DELETE | /files/:id | - | 删除 |
| GET | /file-groups | - | 分组列表（含文件计数） |
| POST | /file-groups | system:file | 新增分组 |
| PUT | /file-groups/:id | system:file | 编辑分组 |
| DELETE | /file-groups/:id | system:file | 删除分组（组内文件转为未分组） |

### 4.17 财务 `/finance`（`routes/finance.ts`，`requireRole('super_admin','finance','ops')`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /finance/overview | 资金总览：订单收入、服务费收入、佣金支出（含待支出）、提现支出（含待处理）、平台净收入 |
| GET | /finance/flows | 资金流水分页 |

### 4.18 帮助与规则文档 `/help`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | /help?scope=help\|rules | 公开 | 启用中的文档列表 |
| GET | /help/:id | 公开 | 文档详情 |
| GET | /help/admin/list?scope= | 管理员 | 全量列表（含停用） |
| POST | /help | 管理员 | 新增 |
| PUT | /help/:id | 管理员 | 编辑 |
| DELETE | /help/:id | 管理员 | 删除 |

### 4.19 客服工单 `/work-orders`（`routes/work-order.ts`，`requireAuth`）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /work-orders | workorder:view | 分页，状态排序优先（待处理→处理中→已回复→已关闭） |
| GET | /work-orders/:id | workorder:view | 详情 |
| POST | /work-orders/:id/reply | workorder:handle | 回复（默认置为"已回复"，可指定关闭；自动给会员发通知） |
| PATCH | /work-orders/:id/status | workorder:handle | 直接改状态 |

### 4.20 日志 `/logs`（`routes/log.ts`，`requireAuth`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /logs/operations | 操作日志分页 |
| GET | /logs/logins | 登录日志分页（含失败记录） |

### 4.21 推广海报 `/posters`（`routes/posters.ts`，全量 `requireAuth + poster:config`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /posters | 列表（含停用） |
| POST | /posters | 新增 |
| PUT | /posters/:id | 编辑（含二维码布局坐标） |
| PATCH | /posters/:id/fixed | 设为固定（唯一，自动清除其他海报的固定标记）/取消固定 |
| DELETE | /posters/:id | 删除 |

### 4.22 商城端公开接口 `/shop`（`routes/shop.ts`）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | /shop/home | 公开 | 首页聚合：分类、热销 6 个、新品 4 个、启用中礼包（含明细） |
| GET | /shop/categories | 公开 | 分类树 |
| GET | /shop/products | 公开 | 商品分页，支持分类（含子分类）/关键字/是否礼包筛选 |
| GET | /shop/products/:id | 公开 | 商品详情 |
| GET | /shop/gift-packages | 公开 | 礼包列表 |
| GET | /shop/levels | 公开 | 启用中的等级权益（供展示） |
| GET | /shop/commission-rules | 公开 | 启用中的佣金费率（供展示） |
| GET | /shop/distribution-config | 公开 | 分销总开关 + 各级开关 + 实际生效层级 |
| GET | /shop/promote-config | 公开 | 站点域名（用于拼推广链接/海报二维码） |
| GET | /shop/posters | 公开 | 启用中的推广海报（固定 + 随机列表） |
| POST | /shop/orders | 会员 | 下单（零售 `items[]` 或礼包 `giftPackageId`，服务端重算价格与折扣，校验库存） |
| POST | /shop/payments | 会员 | 创建支付单（`payType: wechat\|alipay`，按 `payment.mode` 返回 mock 凭证或真实网关就绪校验） |
| POST | /shop/payments/:paymentNo/simulate | 会员 | 模拟支付回调成功（仅 mock 模式），触发订单状态流转 + 佣金预生成/调度 |
| POST | /shop/orders/:id/pay | 会员 | 兼容旧流程的直接支付成功（跳过支付单） |
| POST | /shop/orders/:id/confirm | 会员 | 确认收货，触发佣金结算调度 |
| POST | /shop/orders/:id/cancel | 会员 | 取消待支付订单，回补库存 |

### 4.23 会员端个人接口 `/shop/member`（`routes/shop-member.ts`）

**账号**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | /shop/member/login | 公开 | 手机号+密码登录 |
| POST | /shop/member/register | 公开 | 注册，邀请码必填，绑定三级邀请链（分销总开关关闭时不绑定） |
| POST | /shop/member/upgrade | 会员 | 凭已支付的对应等级礼包订单升级为代理商，发放当月领货额度 |
| GET | /shop/member/me | 会员 | 聚合信息：会员详情、佣金汇总、团队人数、转卖中数量、最新领货额度 |
| GET | /shop/member/promote-stats | 会员 | 推广数据：直属/团队人数、下级成交订单数、累计佣金 |

**领货 / 转卖**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /shop/member/credits | 领货额度列表 |
| GET | /shop/member/resells | 我的转卖单 |
| POST | /shop/member/resells | 发起转卖（校验对应额度余量，扣减额度并生成转卖单） |

**佣金 / 团队 / 订单**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /shop/member/commissions?level= | 佣金记录，可按分销层级筛选 |
| GET | /shop/member/team?level=1\|2\|3 | 团队成员列表（含每人为当前用户贡献的佣金） |
| GET | /shop/member/orders | 我的订单 |

**收货地址**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET / POST | /shop/member/addresses | 列表 / 新增（首个地址自动设默认） |
| PUT | /shop/member/addresses/:id | 更新 |
| PUT | /shop/member/addresses/:id/default | 设为默认 |
| DELETE | /shop/member/addresses/:id | 删除（若删的是默认地址，自动转移给最新一条） |

**购物车**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /shop/member/cart | 购物车（联查 SKU 实时价格） |
| POST | /shop/member/cart | 加入购物车（已存在则叠加数量） |
| PUT | /shop/member/cart/select-all | 全选/全不选 |
| PUT | /shop/member/cart/:skuId | 更新数量/选中状态 |
| DELETE | /shop/member/cart/:skuId | 移除 |

**收藏 / 浏览历史 / 通知**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET / POST | /shop/member/favorites | 列表 / 收藏 |
| DELETE | /shop/member/favorites/:spuId | 取消收藏 |
| GET / POST | /shop/member/history | 浏览历史（最近 50 条）/ 记录（同商品只保留最新一条） |
| GET | /shop/member/notifications | 列表（未读优先）+ 未读数 |
| POST | /shop/member/notifications/read-all | 全部已读 |

**客服工单**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET / POST | /shop/member/work-orders | 我的工单 / 提交 |
| PATCH | /shop/member/work-orders/:id/close | 关闭自己的工单 |

**提现**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET / PUT | /shop/member/payout-account | 提现收款账号 |
| GET | /shop/member/withdraws | 我的提现记录 |
| POST | /shop/member/withdraws | 申请提现（校验余额，按 `payType` 校验已绑定对应收款方式，冻结对应余额） |

### 4.24 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/health | 无鉴权，返回服务名与进程 uptime，供 Docker healthcheck 使用 |

---

## 5. 核心业务流程

### 5.1 会员注册与三级邀请链

注册时读取邀请人当前的 `inviter_id`/`second_inviter_id`，一次性写死为新会员的 `second_inviter_id`/`third_inviter_id`——即邀请链在注册那一刻**冻结快照**，之后邀请人自己的推荐关系变化不会影响已注册下级的归属。分销总开关（`distribution.enabled`）关闭时，注册仍然成功但不绑定任何邀请关系。

### 5.2 下单 → 支付 → 佣金 流程

```
POST /shop/orders          创建订单（status=0 待支付），服务端按等级折扣/礼包价重新计算金额
        │
        ▼
POST /shop/payments        创建支付单（mock 模式返回可模拟凭证；real 模式先校验网关参数是否配置完整）
        │
        ▼
POST /shop/payments/:no/simulate   模拟第三方回调成功
        │
        ├─ 礼包订单（order_type=2）→ 直接置为已完成(status=3) → createPendingCommissions() 生成待结算佣金
        │                                                    → scheduleOrderCommissions() 写入到期结算时间
        └─ 零售订单（order_type=1）→ 置为待发货(status=1)
                │
                ▼
        管理后台发货 → 会员确认收货(status=3) → scheduleOrderCommissions()
```

- `createPendingCommissions`：仅礼包订单触发。按买家的 `inviter_id`/`second_inviter_id`/`third_inviter_id` 依次查 `commission_rule(package_level, distribution_level)` 费率，生成 `status=0`（待结算）的佣金记录，跳过分销开关关闭的层级。
- `scheduleOrderCommissions`：按 `commission.settle_days`（默认 7 天）在订单完成时间基础上计算 `settlement_due_time` 并尝试结算已到期的。
- `settleDueCommissions`：`GET /commissions`、`/commissions/:id` 以及所有 `/shop/*` 公开接口进入时都会被动触发一次全局到期扫描，把 `settlement_due_time` 已过的佣金结算进钱包余额——**没有独立定时任务**，靠请求触发。
- 退款/取消：`rollbackOrderCommissions` 会把该订单已结算的佣金从对应会员钱包**扣回**并记一笔冲正流水，未结算的直接标记为已回滚。

### 5.3 站内转卖流程

```
会员发起转卖 POST /shop/member/resells
  → 校验对应月度额度剩余量 → 扣减额度(credit_record) → 生成转卖单(status=0 待匹配)
        │
        ▼
后台匹配 POST /resells/:id/match（绑定一个待发货零售订单）→ status=2 已匹配
        │
        ▼
后台完成 POST /resells/:id/complete → status=3 → 结算金额进会员钱包余额
                                              → 记两笔资金流水（服务费收入 + 结算支出）

取消（待匹配/匹配中/已匹配均可）POST /resells/:id/cancel
  → 回补对应 credit_record 的 remain_amount，记一笔 credit_flow（type=4 回补）
```

### 5.4 提现流程

```
会员申请 POST /shop/member/withdraws（校验余额，冻结对应金额：balance -= amount, frozen += amount）
        │
        ▼
后台审核 POST /withdraws/:id/audit
  ├─ 通过 → status=1 待打款
  └─ 驳回 → status=3，解冻退回余额（frozen -= amount, balance += amount）
        │
        ▼
后台打款 POST /withdraws/:id/pay → status=2，frozen 扣减、total_withdraw 累加，记资金流水
```

### 5.5 支付网关就绪模式

`payment.mode` 配置项控制 `mock`（默认，任何金额可模拟成功，不产生真实扣款）与 `real` 两种模式。`real` 模式下 `createPayment` 会校验微信/支付宝对应的 AppID、商户号、密钥、回调地址等是否配置完整，不完整则直接抛 `400`；当前仓库**未接入真实网关的下单/回调签名逻辑**，`real` 模式仅做配置校验与凭证占位，接入真实网关需在 `services/payment.ts` 的 `createRealCredential` 中补充实际的预下单请求与签名。

---

## 6. 部署架构

### 6.1 容器组成

| 容器 | 基础镜像 | 说明 |
|------|---------|------|
| `shop-os-server` | `node:22-slim`（多阶段构建） | `tsc` 编译后仅拷贝 `dist` + 生产依赖运行；入口脚本 `docker-entrypoint.sh` 按 `AUTO_SEED` 决定是否先跑一遍幂等种子，再启动服务 |
| `shop-os-admin` | `node:22-slim` 构建 → `nginx:1.27-alpine` 运行 | Vite 构建产物 + `nginx.conf` 反代 `/api` `/uploads` 到 `server` 容器（容器间通过 Compose 网络的服务名 `server:3000` 通信） |
| `shop-os-shop` | 同上 | 同上，反代逻辑相同 |

### 6.2 数据持久化

| Volume | 挂载路径 | 内容 |
|--------|---------|------|
| `shop_os_data` | `/data` | SQLite 数据库文件 |
| `shop_os_uploads` | `/uploads` | 用户上传文件（商品图、海报、Logo 等），同时由 `server` 通过 Express `express.static` 与两个前端容器的 Nginx 反代双路径提供访问 |

### 6.3 启动依赖

`docker-compose.yml` 中 `admin`/`shop` 均 `depends_on: server: condition: service_healthy`，`server` 的健康检查通过 `node -e "fetch('http://127.0.0.1:3000/api/v1/health')..."` 实现，`start_period: 180s` 容忍首次构建/依赖安装较慢的情况。

### 6.4 前端构建期变量

`VITE_API_BASE_URL` 在**构建时**写入前端产物（Vite 环境变量），使用内置 Nginx 反代方案时保持默认值 `/api/v1` 即可（相对路径，天然适配任何域名）；如果前端与后端不通过同一 Nginx 反代（例如前端用 CDN、后端独立域名），需要在构建时改为绝对地址，如 `https://api.example.com/api/v1`。

### 6.5 本地非容器开发时的多进程约定

本地 `pnpm dev` 系列命令启动的是三个独立进程（server: 3000、admin: 5173、shop: 5174），彼此通过绝对 URL（`VITE_API_BASE_URL` 开发期默认值）直接请求，不经过 Nginx 反代；这与生产的容器化部署（相对路径 + Nginx 反代）是两套不同的网络拓扑，排查跨域/端口问题时注意区分场景。
