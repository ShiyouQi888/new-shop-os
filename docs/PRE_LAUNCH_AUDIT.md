# Shop-OS 上线前系统审查报告

审查日期：2026-08-27
审查范围：`apps/server` 全部 23 个路由文件、5 个 service 文件、db 层/schema/seed，共约 5500 行后端代码；逐文件全文通读，非抽样。
审查方式：本人逐文件通读核心资金链路（会员端路由、支付、信用额度、财务大盘）+ 5 个并行子代理分别覆盖认证权限、支付佣金分销、商品订单库存、钱包提现会员管理、文件帮助工单海报五大板块，每条发现均要求给出精确 file:line、可触发的具体场景与修复建议，不接受笼统猜测。所有高危发现均由本人二次核对源码后确认。

**汇总：47 项问题，其中严重(Critical) 11 项，高危(High) 13 项，中危(Medium) 15 项，低危(Low) 13 项**（部分子发现已合并同类项）。

---

## 一、严重问题（Critical）

### 1. 会员 JWT 与管理端 JWT 共用密钥且无类型校验 —— 根因漏洞，导致下方多个接口可被任意注册用户攻破
**文件**：`apps/server/src/middlewares/auth.ts:8-12`（`AuthPayload` 无区分字段）、`:35-41`（`verifyToken`）、`:59-66`（`requireAuth`）

`signToken`（管理端）与 `signMemberToken`（会员端，`routes/shop-member.ts`）使用同一个 `config.jwtSecret` 签名，且管理端的 `AuthPayload` 没有 `type` 字段。`verifyToken` 只做 `jwt.verify(token, secret) as AuthPayload` 的强制类型转换，从不校验载荷是否真的含有 `uid`/`role`。`requireAuth` 只要签名验证通过就放行。

对比：会员端 `verifyMemberToken`（`:49-56`）正确校验了 `payload?.type === 'member'`，管理端却没有对称的校验。

**攻击链（已亲自验证可行）**：任何人访问 `POST /api/v1/shop/member/register`（公开自助注册，只需手机号+密码+任意邀请码）→ 登录拿到会员 JWT（payload 为 `{type:'member', mid, phone}`）→ 用该 token 作为 `Authorization: Bearer` 请求任意仅有 `requireAuth`、没有叠加 `requirePermission`/`requireRole` 的管理端接口 → `requireAuth` 验签通过，`req.auth = {type:'member', mid, phone}`（`role` 为 `undefined`）→ 若该路由后面没有权限检查，直接执行。

**受影响的具体接口（已确认无任何权限层，仅 `requireAuth`）**：
- `apps/server/src/routes/member.ts` 全部 8 个接口（本人逐行确认，全文件搜索不到任何 `requirePermission` 调用）——任意注册用户可以 `GET /members` 拉取全部会员的手机号/银行卡/支付宝账号/钱包余额，可以 `PATCH /:id/status` 冻结/解冻任意会员，可以 `POST /` 冒充后台创建新会员（还会自动发放该等级的月度额度）。这是当前系统里破坏性最大的一条链路。
- `apps/server/src/routes/file.ts` 的 `POST /upload`、`GET /`、`PATCH /group`、`PATCH /:id/group`、`PATCH /:id/name`、`DELETE /:id`（子代理发现，本人未逐行复核但代码模式与 member.ts 一致）
- `apps/server/src/routes/help.ts` 的创建/编辑/删除接口
- `apps/server/src/routes/log.ts` 的操作日志/登录日志查询（可读取所有管理员的登录 IP 与敏感操作描述）

**修复方向**：给管理端 payload 增加 `type: 'admin'` 判别字段，`requireAuth` 显式校验 `payload.type === 'admin' && typeof payload.uid === 'number'`，拒绝一切不符合结构的载荷；同时给 `member.ts`、`file.ts`、`help.ts`、`log.ts` 补齐对应的 `requirePermission` 权限校验（`permissions.ts` 里已经定义了 `member:edit`/`member:view`/`system:file`/`system:log` 等权限码，只是没有接到路由上）。

### 2. `POST /shop/member/upgrade` 无重入保护，可无限刷额度（本人发现）
**文件**：`apps/server/src/routes/shop-member.ts:107-159`

本次会话为支持"消费额度可叠加"而移除了原有的 `!get(...)` 存在性检查，但这同时移除了唯一的防重放保护。会员对同一等级重复调用该接口，每次都会把 `level.monthlyCredit` 再加进当月 `credit_amount`/`remain_amount`/`resellable_amount` 一次。由于 `resellable_amount` 可以通过转卖直接变现，这是一个无限印钱漏洞。此外也没有校验 `body.level` 必须高于会员当前等级，理论上可以借该接口发放任意等级的额度。

**修复方向**：调用前重新查询会员当前 `level`，若 `member.level >= body.level` 直接拒绝（"已是该等级或更高等级，无需重复开通"）。

### 3. 支付双路径导致收入与消费额度重复入账（本人发现，子代理独立验证并补充细节）
**文件**：`apps/server/src/services/payment.ts:156-181`（`completeMockPayment`，只检查 `payment_order.status`，从不检查 `order.status`）+ `apps/server/src/routes/shop.ts` 的旧版 `POST /orders/:id/pay`（自身检查 `order.status!==0`，但完全不触碰 `payment_order` 表）

**触发路径（顺序请求即可，不需要并发竞态）**：
1. 会员 `POST /shop/payments` 创建一条 `payment_order`（status=0，`order.status` 仍为 0）
2. 改用旧接口 `POST /shop/orders/:id/pay` 支付成功（`order.status` 变为已支付，记录收入，若为零售订单还会调用 `grantConsumptionCredit`）
3. 会员随后调用 `POST /shop/payments/:paymentNo/simulate`——`completeMockPayment` 发现 `payment_order.status` 仍是 0（因为步骤 2 从未碰过这张表），校验通过，**再次**执行订单支付完成逻辑：`recordFinanceFlow` 重复记一遍收入，`grantConsumptionCredit` 重复发一遍消费返还额度（`createPendingCommissions` 有自己的存在性检查，唯独消费额度发放函数没有）。

**修复方向**：`completeMockPayment` 内部增加对 `order.status === 0` 的校验（与旧路由保持一致的前置检查）；同时给 `grantConsumptionCredit`（`services/credit.ts`）增加按 order_id 的去重判断，与 `createPendingCommissions` 的写法保持一致。建议长期废弃旧版 `/orders/:id/pay` 路径。

### 4. "真实支付模式"是未实现的空壳，且没有任何阻拦，一旦启用会让下单全部卡死
**文件**：`apps/server/src/services/payment.ts:91-127`（`assertRealProviderReady`/`createRealCredential`）、`:156-159`（`completeMockPayment` 的模式校验）

`assertRealProviderReady` 只检查微信/支付宝配置字段"非空"，不校验有效性，就返回"配置已就绪"；但全仓库搜不到任何真实网关回调/`notify` 路由的实现。任何有 `benefit:config` 或 `system:admin` 权限的管理员，只要在系统配置里随便填几个非空字符串把 `payment.mode` 切到 `real`，之后**所有订单都无法完成支付**——因为唯一能把 `payment_order.status` 从 0 改为 1 的函数 `completeMockPayment` 会在非 mock 模式下直接抛错拒绝执行，而真实网关代码根本不存在。

**修复方向**：在 `payment.mode` 写入时直接拒绝设为 `real`（除非真实网关已实现），或至少让 `createRealCredential` 不要谎称"已就绪"。

### 5. 佣金回滚在会员已提现的情况下会静默丢失平台资金
**文件**：`apps/server/src/services/distribution.ts:135-157`（`rollbackOrderCommissions`）

已结算佣金（status=1，已进入 `wallet.balance`）对应的订单被取消/退款时，回滚逻辑是：
```
balance = CASE WHEN balance >= amount THEN balance - amount ELSE 0 END
```
若会员在退款发生前已经把这笔佣金提现走了（`balance` 已经被提现流程扣减为 0 或更小），这里会被钳制到 0（少扣或不扣），但紧接着 `recordFinanceFlow(3, +amount, ...)` 依然无条件按**全额**记一笔"冲正"收回。也就是说账本上显示"已全额追回"，但实际上平台已经把这笔钱通过提现打给了会员且追不回来——差额没有作为会员欠款/坏账被记录在任何地方，直接从账目里消失。这是电商平台"结算→提现→退款"的常规操作序列即可触发，不需要恶意行为。

**修复方向**：计算 `实际追回 = MIN(amount, 回滚前余额)`，`recordFinanceFlow` 按实际追回值记账，差额应作为会员应收欠款单独记录，而不是静默钳零。

### 6. 硬编码的 JWT 兜底密钥
**文件**：`apps/server/src/config.ts:10`：`jwtSecret: process.env.JWT_SECRET || 'shop-os-dev-secret-change-me'`

若部署环境忘记设置 `JWT_SECRET`，任何读过源码（公开仓库/泄露构建产物）的人都可以离线签发 `{uid:1,role:'super_admin'}` 的合法管理员 token，无需登录即可拿到最高权限。且这是静默失败模式——忘记配置也不会有任何报错或异常表现。

**修复方向**：生产环境下 `JWT_SECRET` 未设置应直接拒绝启动，禁止兜底值；上线前务必更换该密钥。

### 7. 默认管理员账号密码 `123456` 无条件写入，且没有强制改密机制
**文件**：`apps/server/src/db/seed.ts:48-58`，由 `index.ts` 无环境判断地无条件调用

`admin`/`super_admin`、`ops`、`finance` 账号全部以 `123456` 播种，只受一次性的 `seed.done` 标记控制，不受 `NODE_ENV` 限制。叠加下面第 8 条（登录无限流），一旦忘记改密，`admin/123456` 就是完整的超管权限。

**修复方向**：生产环境不应播种真实可登录密码；至少首次登录强制改密，且必须叠加登录限流。

### 8. 登录接口无任何限流/防暴力破解
**文件**：`apps/server/src/routes/auth.ts`（`POST /login`）、全仓库 `app.ts` 均未接入限流中间件

无失败锁定、无退避、无验证码，管理员密码最短只要求 6 位。配合第 7 条的已知默认密码，攻击者可以对已知/可枚举的用户名无限次尝试。

**修复方向**：接入 `express-rate-limit` 做基于 IP/用户名的限流+失败退避，并提高密码最小长度。

### 9. 商品删除跨表无事务保护，外键失败会造成不可逆的 SKU 丢失
**文件**：`apps/server/src/routes/product.ts:139-147`（单个删除）、`:150-158`（批量删除）

`DELETE FROM product_sku` 与 `DELETE FROM product_spu` 是两条独立自动提交的语句（全仓库没有任何显式事务）。`gift_package.spu_id`/`credit_pool_item.spu_id` 都有外键约束且未设级联。当被删商品正被礼包或月度商品池引用时：第一条语句（删 SKU）没有外键保护，会直接成功提交；第二条语句（删 SPU）撞上外键约束失败——**SKU 已经被真实删除且无法回滚**，SPU 变成一个没有任何 SKU 的空壳，管理员只会看到一个模糊的"服务器内部错误"，毫无数据已被破坏的提示。批量删除时一个引用冲突的 id 会连带把同批次其他正常商品的 SKU 也一起清空。

**修复方向**：两条语句包一个事务；删除前先检查是否被 `gift_package`/`credit_pool_item` 引用，是则友好拒绝。

### 10. 退款审核接口没有前置状态校验，而系统里根本不存在能产生其目标状态的路径
**文件**：`apps/server/src/routes/order.ts:117-133`（`POST /:id/refund-audit`）

该接口意图处理"退款中"（status=5）的订单，但全仓库搜不到任何写入 `order.status=5` 的代码——会员端根本没有"申请退款"入口，管理端 UI 只在 status=5 时才显示这个审核按钮，可后端从未检查调用时订单是否真的处于 5。可以对**任意状态**的订单调用：对已完成订单（status=3）"通过"退款，会回滚佣金、恢复库存，但不会撤销该订单可能已经触发的等级升级/月度额度发放（`grantConsumptionCredit`/`/upgrade` 的额度是分开发放的，这里从不联动扣回）；重复调用两次会让 `restoreOrderStock` 把库存重复加回、`recordFinanceFlow` 重复记一笔退款支出。

**修复方向**：先建好真实的会员端"申请退款"链路把订单打到 status=5，再让本接口强制要求 `order.status===5` 才能执行；`restoreOrderStock` 增加幂等保护。

### 11. `apps/server/src/routes/member.ts` 全文件零权限校验（与发现1同源，单独列出因其破坏性独立成立）
**文件**：`apps/server/src/routes/member.ts:12`，全文件仅 `router.use(requireAuth)`

即使不考虑发现1的跨 token 问题，`permissions.ts` 里明确定义了 `member:edit`（"新增/冻结/额度调整"）这个权限码，但整个文件没有任何地方调用它。这意味着**任何登录的后台账号**（包括权限模型里明确不该有此权限的 `customer_service` 客服角色）都能冻结/创建会员、查看全部会员的银行卡与支付宝信息。

**修复方向**：`GET` 系列接口加 `requirePermission('member:view')`，`PATCH /:id/status`、`POST /` 加 `requirePermission('member:edit')`。

---

## 二、高危问题（High）

### 12. 提现接口完全绕过后台可配置的最低金额与手续费率（本人发现，子代理独立验证）
**文件**：`apps/server/src/routes/shop-member.ts:783`（`z.object({ amount: z.number().min(10) ...})`）、`:799-801`（INSERT 硬编码 `fee=0`）

后台 `system_config` 里配置的 `withdraw.min_amount`（种子值 100）、`withdraw.fee_rate`（种子值 1%）从未被这个真正处理提现申请的接口读取——管理员在后台修改这两个值不会产生任何实际效果，提现最低门槛实际是硬编码的 10 元，手续费永远是 0。

**修复方向**：从 `system_config` 读取 `withdraw.min_amount`/`withdraw.fee_rate`，按配置校验最低金额并计算 `fee = money(amount * feeRate / 100)`、`actualAmount = money(amount - fee)`。

### 13. 角色被"禁用"后完全不生效
**文件**：`apps/server/src/middlewares/auth.ts:93,105`：`SELECT permissions FROM admin_role WHERE code = ?` 只查了 `permissions`，从不检查 `status`

超管在后台把某个角色禁用（`PUT /roles/:id {status:0}`），以为持有该角色的所有管理员会立刻失去权限，实际上 `requirePermission`/`requireAnyPermission` 依然按原权限放行——`status` 字段对鉴权毫无作用，只是后台列表里的一个展示性开关。

**修复方向**：权限查询加 `AND status = 1`，禁用角色应视为零权限。

### 14. 禁用/删除/降级管理员不会让其已签发的 JWT 失效
**文件**：`apps/server/src/middlewares/auth.ts:59-66`；`routes/admin.ts` 的状态/角色变更接口

`role` 在登录时被写死进 JWT，`requireAuth` 从不回查数据库当前状态。超管发现某账号被盗后立即禁用/删除/降级，该账号已持有的 token（最长 7 天有效期）依然对所有权限校验有效，可以在被"禁用"之后继续操作，甚至创建新的超管账号。

**修复方向**：增加服务端可控的失效机制（如 `token_version` 字段，变更时递增并在 `requireAuth` 中核对），或大幅缩短 token 有效期并在敏感操作上强制回查数据库状态。

### 15. `PUT /admins/:id` 可以把系统里最后一个超管降级，且没有任何保护
**文件**：`apps/server/src/routes/admin.ts:65-84`

`DELETE`/`PATCH /:id/status` 都明确保护"超管不可删除/禁用"，但 `PUT`（改角色）没有对称保护。一次误操作或恶意操作就能让系统里不再存在任何 `super_admin` 账号——由于创建/管理角色的接口本身要求 `requireRole('super_admin')`，届时没有任何账号能再创建超管，只能直接操作数据库修复。

**修复方向**：改角色前校验，若目标账号是仅存的 `super_admin` 则拒绝降级。

### 16. 文件上传没有类型白名单，任意文件类型都会被公开托管
**文件**：`apps/server/src/routes/file.ts:15-21`（multer 配置无 `fileFilter`）+ `app.ts:39`（`/uploads` 静态托管）

可以上传 `.html`/`.svg` 等可执行内容，存储后仍以其原始扩展名通过 `express.static` 公开访问，`Content-Type` 会被浏览器当作 HTML/SVG 执行。叠加发现1（任意注册会员即可调用上传接口），相当于把服务器变成任何人都能用的免费脚本托管，若管理端 token 存在 localStorage 且与上传目录同源，存在 XSS 窃取管理员 token 的风险。

**修复方向**：加 `fileFilter` 只允许图片/视频等安全类型；非图片类型改为 `Content-Disposition: attachment` 或放到非同源静态域名。

### 17. `help.ts` 的创建/编辑/删除接口无任何权限校验
**文件**：`apps/server/src/routes/help.ts:39,58,76,97`

叠加发现1，任意注册会员可以直接往平台"规则中心"发布/删除任意公开内容，或读取未发布的草稿文章。`permissions.ts` 里甚至从未定义过对应的权限码。

**修复方向**：新增 `help:manage` 权限码并接到这四个接口上。

### 18. 管理端取消已支付订单不会冲正财务流水
**文件**：`apps/server/src/routes/order.ts:89-92`（`PATCH /:id/status {status:4}`，从 status 1/2 取消）

已支付订单（`finance_flow` 已经 `+payAmount` 记过收入）被直接取消时，只回滚了佣金和库存，唯独没有像"退款审核通过"分支那样调用 `recordFinanceFlow` 冲正收入。`GET /finance/overview` 的口径是实时从 `order` 表重新聚合、不受影响，但独立的资金流水台账（`GET /finance/flows`）会永久保留一笔从未真正实现的收入。

**修复方向**：从 status 1/2 取消时也调用 `recordFinanceFlow` 记一笔等额负向流水。

### 19. 礼包/商品 SKU 关联无存在性校验，可能悄悄冻结整个入会转化漏斗
**文件**：`apps/server/src/routes/gift.ts:36-58,61-86`

创建/编辑礼包时不校验 `spuId`/`items[].skuId` 是否存在或已下架，而真正购买时（`shop.ts:155`）才会校验并报错。管理后台列表展示的是保存时冻结的商品名/价格快照，不会重新校验，导致配置错误的礼包在后台看起来完全正常，却在所有会员尝试购买礼包（进而触发升级、分销）时全部失败，且没有任何后台提示。

**修复方向**：创建/编辑礼包时校验 `spuId`/每个 `skuId` 存在且状态正常。

### 20. `PATCH /:id/status` 允许把订单强制拨回"待支付"状态，无前置校验
**文件**：`apps/server/src/routes/order.ts:71`（zod 允许 status 1-4）、`:75-78`（if 分支只覆盖了 2/3/4）

可以对已完成或已取消的订单直接下发 `status:1`，而发货/完成动作从不重新扣库存（只有下单时扣一次），造成"库存显示可售、实际货已发出"的超卖状态，且不需要任何并发条件，一次构造请求即可。

**修复方向**：移除 1 这个允许值，或补上对应的前置状态校验。

### 21. 冻结会员账号后，其已登录的 token 仍可继续操作资金
**文件**：`apps/server/src/middlewares/auth.ts:69-76`（`requireMember` 不回查 `member.status`）

登录时会阻止 status=2（冻结）的会员拿到新 token，但已经持有 30 天有效期 token 的会员被冻结后不受任何影响，包括仍可正常调用提现申请接口——冻结操作对已登录设备形同虚设。

**修复方向**：`requireMember` 或至少资金类接口（提现、转卖、领货）应回查当前 `member.status`。

### 22. `resell`/`credit` 相关路由与 `member.ts` 同款问题：`routes/withdraw.ts` 的 `GET /` 列表无权限校验
**文件**：`apps/server/src/routes/withdraw.ts:15`

任意已登录后台账号（包括不该有 `withdraw:view` 权限的客服角色）可以拉取全部会员的提现记录，包含银行卡号、开户人、支付宝账号。

**修复方向**：加 `requirePermission('withdraw:view')`。

### 23. 佣金结算/回滚缺少 DB 唯一约束兜底，正确性完全依赖当前单进程同步架构
**文件**：`apps/server/src/services/distribution.ts:45`；`db/schema.ts` 的 `commission` 表无 `UNIQUE(order_id)` 约束

当前 `createPendingCommissions` 的去重完全靠"先查后插"，之所以现在安全，是因为 `node:sqlite` 的 `DatabaseSync` 全同步、请求处理期间没有 `await` 让出事件循环，两个请求不可能在同一个 handler 内部交叉执行。**这一结论同样适用于本报告和历史会话中反复出现的其他"先查后写"模式**（如库存扣减 `UPDATE ... WHERE`未加 `stock>=?` 守卫、提现 audit/pay 的 frozen 钳零逻辑）——它们在当前单容器部署下都不构成真实竞态漏洞，但一旦引入水平扩展或在检查与写入之间插入任何 `await`，会立刻变成真实的资损通道。

**修复方向**：作为上线前的加固项，给 `commission.order_id` 加唯一约束、给库存扣减语句加 `WHERE stock >= ?` 守卫，属于"防御性加固"而非"当前可被攻击的漏洞"，优先级可以低于上面所有确认可触发的问题，但建议在支持多进程/多副本部署之前必须完成。

### 24. 提现审核/打款的 frozen 钳零逻辑存在账目不对称风险（子代理发现，本人复核后修正结论）
**文件**：`apps/server/src/routes/withdraw.ts:54-57,75-78`

驳回提现时无条件 `balance += amount`，但 `frozen` 只在 `frozen>=amount` 时才足额扣减，否则钳到 0——如果 `frozen` 曾经因为某种原因小于 `amount`，会出现"退回的比冻结的还多"的资金增生。**子代理最初认为这可以通过两个并发的 `/audit` 请求触发，本人核实后认为该并发场景在当前单进程全同步架构下不成立**（与发现23同理，Express 同步 handler 不会被交叉执行）——但如果未来 `frozen` 因为一次数据订正/多副本部署而产生偏差，这个钳零逻辑会把偏差静默放大成账目错误而不是报错。

**修复方向**：改成对称扣减 `MIN(amount, frozen)`，而不是各自独立钳零；作为加固项处理，非当前可直接触发的漏洞。

---

## 三、中危问题（Medium）

25. **`services/finance.ts`/`distribution.ts` 部分钱包写入绕过 `money()` 取整**（`distribution.ts:87-90,127-130,145-152`）——全仓库其余资金写入都会先在 JS 侧 `money()` 取整再写库，唯独这几处钱包余额直接做 SQL 层加减，长期可能累积浮点误差。
26. **`order.ts` 驳回退款的确认文案与后端实际行为矛盾**：前端提示"驳回后订单将变为已取消状态，且不可恢复"，后端实际是把订单打回可发货状态（`nextStatus = order.shipTime ? 2 : 1`），运营可能误判订单已作废。
27. **商品 SKU 编辑/删除接口不校验 `:id`（SPU）与 `skuId` 的从属关系**（`product.ts:195-226`）——URL 路径里的商品 id 从未被使用，理论上可以用 A 商品的 id 操作 B 商品的 SKU。
28. **管理端商品/礼包价格字段不经过 `money()` 取整**（`product.ts:184-214`、`gift.ts:47-49,75`）——可能存入如 `29.990000000000002` 这样的浮点脏数据。
29. **礼包总价与明细单价之和无关联校验**（`gift.ts`）——后台可以配置一个和明细金额完全对不上的礼包售价，订单详情页会显示自相矛盾的金额。
30. **二级分类允许挂在非根分类下**（`category.ts:26-42`），会导致该分类在所有树形视图里都不可见但仍可被商品引用。
31. **删除分类不保护"入会专区"分类**（`category.ts:69-80`），编辑接口有保护但删除没有，删除是更彻底的破坏操作。
32. **文件"删除"从不真正删除磁盘文件**（`file.ts:123-131`）——数据库记录没了，`/uploads/xxx` 原始链接依然可公开访问，属于数据保留/删除权合规缺口。
33. **登录耗时侧信道可枚举用户名**（`auth.ts:22`）——用户名不存在时跳过 `bcrypt.compareSync`，响应时间可用于区分账号是否存在。
34. **登录 IP 直接信任客户端可控的 `X-Forwarded-For` 头**（`auth.ts:16`），未配置 `trust proxy` 时任何人可伪造记录到审计日志里的"IP"。
35. **`PUT /roles/:id` 未保护内置 `super_admin` 角色**（`roles.ts:60-89`）——`DELETE` 有保护，`PUT` 没有，可以让其 `status` 变为禁用（虽然 `super_admin` 的免检查旁路不受影响，但展示数据会被污染）。
36. **`dashboard.ts` 的"今日"统计用 UTC 日期，与本地时区的 `create_time` 存储方式不一致**（`dashboard.ts:13`）——每天本地零点到早上 8 点这段时间的"今日"指标会显示成昨天的。
37. **`dashboard.ts` 的"本月领货使用率"没有按月过滤，且统计口径会系统性低估**（`dashboard.ts:25-28`）——分母分子都排除了"已用完"（status=2）的记录，用得越好这个指标反而越难看。
38. **`dashboard.ts` 的 `pendingShip` 指标过滤错了订单状态**（`dashboard.ts:21`，用了 status=0 待支付，应为 status=1 待发货）——目前前端未消费此字段，暂无实际影响。
39. **`routes/member.ts` 创建会员时默认密码硬编码为 `123456`**（`member.ts:119`），且不校验目标等级的 `status` 是否为启用状态。

---

## 四、低危问题（Low）

40. JWT 验证未显式指定 `algorithms: ['HS256']` 白名单（当前 `jsonwebtoken` 默认行为下不构成实际风险，仅为纵深防御建议）。
41. 账号被禁用时登录返回 400 而非语义更准确的 403。
42. `system:admin` 权限码定义了但从未被实际使用（管理员/角色路由硬编码 `requireRole('super_admin')`）。
43. `forceSettleOrderCommissions` 是从未被调用的死代码。
44. 佣金结算依赖请求触发而非独立定时任务，流量稀疏时可能延迟到账。
45. `createPayment` 在已存在未支付 `payment_order` 时会静默沿用旧的支付方式/金额，忽略调用方本次请求的新参数。
46. 帮助中心详情接口未按 `scope` 过滤，可用规则分类的 id 请求到帮助分类的内容（两者都是公开内容，影响很小）。
47. `order.ts` 批量发货接口的成功提示始终报告"请求的数量"而非"实际更新的数量"。

---

## 五、已核实无问题的部分

- 三级分销链路（`distribution.ts` 的 `createPendingCommissions`/`settleOrderCommissions`）的等级映射、去重、结算时间窗口逻辑正确。
- 全仓库 SQL 均使用参数化查询，未发现任何字符串拼接注入点。
- 密码/`password_hash` 字段未在任何响应中被意外返回。
- 会员端 `verifyMemberToken` 的类型校验正确，反向（管理员 token 冒充会员）不成立。
- 工单（`work-order.ts`）、海报（`posters.ts`）、站点配置（`site.ts`）三个模块权限与越权保护完整，未发现问题。
- 礼包购买的库存扣减正确覆盖礼包内每个 SKU，而非仅扣一个"主"SKU。
- `GET /finance/overview` 的口径均为实时聚合 `order`/`commission`/`withdraw`/`resell_order` 表，不依赖 `finance_flow` 流水表，上述流水台账类问题（18、25）不会污染财务大盘首屏数字。

---

## 六、修复优先级与计划

按"资金/数据可被直接破坏的程度"排序，逐一修复、逐一验证：

1. **P0（阻断上线）**：#1/#11（越权访问会员数据+破坏性操作）、#2（无限刷额度）、#3（双重记账）、#6/#7/#8（认证基础设施：密钥/默认密码/限流）
2. **P1（上线前必须）**：#4（虚假就绪的真实支付模式）、#5（佣金回滚资金损失）、#9（商品删除数据损坏）、#10（退款审核状态机）、#12（提现配置被绕过）、#13/#14/#15（权限与账号治理）
3. **P2（可上线后一周内跟进）**：其余 High/Medium 项
4. **P3（加固/技术债）**：#23/#24（当前架构下不可触发，但需在有扩容计划前处理）、Low 项

以下开始按此顺序修复。

---

## 七、修复过程中新发现的问题（现场联调验证阶段发现，报告初稿未覆盖）

在逐项修复并用 Docker 容器 + 真实接口调用做端到端验证时，触发了一个报告初稿静态审查未能覆盖的问题：

### 48.（新增 · 严重）`wallet` 表时间戳列名拼写与实际 schema 不一致，导致提现审核/打款、佣金结算、转卖结算全部在运行时抛 500
**根因**：`wallet` 表在 `db/schema.ts` 中的时间戳列名是 `updated_at`（与 `admin_user`/`member`/`category` 三张表同款），但全仓库其余大多数表都叫 `update_time`——这是 schema 本身遗留的命名不一致，不是本次会话引入的。多处对 `wallet` 表的 `UPDATE` 语句照抄了 `update_time` 这个（对其他表正确、对 wallet 表错误）的列名：
- `apps/server/src/routes/withdraw.ts`（提现驳回退回余额、提现打款释放冻结）
- `apps/server/src/services/distribution.ts`（佣金结算/强制结算/回滚 三处对钱包的写入）
- `apps/server/src/routes/resell.ts`（转卖完成结算）

**实际影响（已通过真实接口调用复现）**：
- `POST /withdraws/:id/audit`（驳回）与 `POST /withdraws/:id/pay`（打款）此前**每次调用必定抛出 500**（`SqliteError: no such column: update_time`），也就是说提现管理后台的驳回和打款功能在合并前的代码里完全不可用。
- `settleDueCommissions()` 作为全局中间件挂在**所有** `/api/v1/shop/*` 请求上（见 `routes/shop.ts`），只要系统里存在任意一笔到期未结算的佣金，**该次调用会让当次 shop 端请求直接 500**——这是影响面最大的一个子问题，因为它不是"提现管理页面点不动"这种后台内部问题，而是会直接影响所有会员的商城浏览/下单体验。
- `POST /resells/:id/complete`（转卖结算打款）同样必定 500。

**验证方式**：将 `apps/server/src/services/distribution.ts`、`routes/withdraw.ts`、`routes/resell.ts` 中所有 `UPDATE wallet ... update_time` 修正为 `updated_at` 后，重新构建容器，对提现驳回、提现打款、佣金到期结算（通过任意 `/shop/*` 请求触发全局中间件）、转卖完成结算 四条链路分别用真实数据跑通，逐一确认返回成功且钱包余额/冻结/累计字段按预期增减，测试数据已清理复原。

**顺带修复**：这几处原本是"状态更新"与"钱包写入"两条 SQL 语句分开执行、没有事务包裹——验证过程中亲眉触发了一次真实的部分写入（钱包更新那条语句报错前，提现单状态已经先一步提交成功，导致"单已驳回但钱没退"的悬空状态）。已改为使用新增的 `transaction()`（`db/index.ts`）包裹，确保状态变更与资金变更要么同时成功要么同时回滚。

---

## 八、修复完成情况

除以下两项外，本报告严重(Critical)、高危(High)、中危(Medium) 全部问题（含新发现的第 48 项）均已修复并通过 TypeScript 编译 + Docker 容器实测验证：

- **暂不处理**：#29（礼包总价与明细单价和校验，纯展示层软提示，非资损项）、#42（`system:admin` 权限码当前未接线——这是"该不该把管理员/角色管理开放给自定义角色"的产品策略决策，不属于纯 bug，未擅自变更）。
- **需要人工操作、AI 不便代为决定**：数据库中已存在的 `admin`/`ops`/`finance` 三个管理员账号密码仍是 `123456`（本次修复只让*新建*数据库不再播种固定密码，不会反过来修改已在使用中的登录密码，以免把人锁在自己的后台外）。**上线前请务必手动登录后台修改这三个账号的密码**。
- **已生成但需妥善保管**：`.env` 文件中已生成一个新的随机 `JWT_SECRET` 并替换了原先硬编码的默认值；该文件已加入 `.gitignore`，不会被提交。重启后所有现存登录态（管理端与会员端）都会失效，需要重新登录，这是预期行为。
