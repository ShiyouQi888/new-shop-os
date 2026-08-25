# Shop-OS 后端服务（@shop-os/server）

电商代理商系统标准后端：**Express 5 + TypeScript + SQLite（Node 内置 node:sqlite）**。
接口采用 RESTful 标准化设计，统一响应格式、统一分页、JWT 鉴权、角色权限。

## 快速开始

```bash
# 安装依赖（已用 npm 安装过可跳过）
cd apps/server && npm install

# 开发运行（首次启动自动建表 + 种子数据）
npm run dev          # 等价 tsx src/index.ts，端口 3000

# 生产构建与启动
npm run build        # tsc → dist/
npm start            # node dist/index.js

# 手动重置数据：删除 data/shop-os.db 后重启即可重新建表+种子
```

默认地址：`http://localhost:3000`，健康检查：`GET /api/v1/health`

## 演示账号（密码均为 123456）

| 账号 | 角色 | 权限 |
|---|---|---|
| `admin` | super_admin | 全部 |
| `ops` | ops | 业务运营（商品/订单/会员/配置） |
| `finance` | finance | 财务（提现审核/打款、资金流水） |

## 接口规范

### 统一响应格式
```json
{ "code": 0, "message": "ok", "data": { } }
```
- `code = 0` 成功；非 0 为业务错误（40000 参数、40100 未登录、40300 无权限、40400 不存在、40900 冲突、50000 服务端）
- 业务错误同时使用 HTTP 状态码（400/401/403/404/409/500）

### 鉴权
除 `POST /auth/login`、`GET /shop/*`、`GET /health` 外均需请求头：
```
Authorization: Bearer <token>
```

### 分页
查询参数 `?page=1&pageSize=10`（pageSize 上限 100），响应：
```json
{ "code": 0, "message": "ok", "data": { "list": [], "total": 0, "page": 1, "pageSize": 10 } }
```

### 字段规范
- 数据库字段：`snake_case`（`order_no`、`pay_amount`、`created_at`…），主键 `id`，外键 `xxx_id`，金额 `REAL`（元），时间 `YYYY-MM-DD HH:mm:ss`
- API 响应字段：自动转 `camelCase`（`orderNo`、`payAmount`、`createdAt`…）

## 接口清单（前缀 /api/v1）

### 认证
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /auth/login | 管理员登录，返回 token + 用户信息 |
| GET | /auth/me | 当前登录管理员信息 |
| POST | /auth/logout | 登出（前端清除 token） |

### 管理员
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /admins | 管理员列表（keyword 筛选） |
| GET | /admins/:id | 详情 |
| POST | /admins | 新增 |
| PUT | /admins/:id | 编辑（可选改密） |
| PATCH | /admins/:id/status | 启停（超管不可禁） |
| DELETE | /admins/:id | 删除（超管不可删） |

### 会员
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /members | 列表（keyword/level/status 筛选，含钱包与推荐人） |
| GET | /members/:id | 详情（统计：订单数/消费/佣金/直推/团队 + 近期订单/佣金） |
| GET | /members/:id/wallet | 钱包 |
| GET | /members/:id/orders | 订单记录 |
| GET | /members/:id/commissions | 佣金记录 |
| GET | /members/:id/credits | 领货额度 |

### 商品 / 分类 / 礼包
| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | /categories | 分类树 / 新增 |
| PUT/DELETE | /categories/:id | 编辑 / 删除（级联子分类） |
| GET/POST | /products | SPU 列表（含 SKU 汇总）/ 新增 |
| GET/PUT/DELETE | /products/:id | SPU 详情 / 编辑 / 删除 |
| PATCH | /products/status | 批量上下架 |
| PATCH | /products/:id/status | 单个启停 |
| DELETE | /products | 批量删除 |
| GET/POST | /products/:id/skus | SKU 列表 / 新增 |
| PUT/DELETE | /products/:id/skus/:skuId | SKU 编辑 / 删除 |
| GET/POST | /gift-packages | 礼包列表（含内容）/ 新增 |
| PUT | /gift-packages/:id | 编辑（整体替换内容） |
| PATCH | /gift-packages/:id/status | 上架/停售 |
| DELETE | /gift-packages/:id | 删除 |

### 订单
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /orders | 列表（status/type/keyword 筛选） |
| GET | /orders/:id | 详情（含明细） |
| PATCH | /orders/:id/status | 状态流转（发货/完成/取消） |
| PATCH | /orders/ship | 批量发货（ids + 物流） |
| POST | /orders/:id/refund-audit | 退款审核（pass + remark） |

### 配置
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /config/levels | 等级权益列表 |
| PUT/POST/DELETE | /config/levels/:id 等 | 等级增删改（多等级代理商体系） |
| GET | /config/commission-rules | 佣金规则 |
| PUT | /config/commission-rules/:id | 编辑佣金比例 |
| GET/PUT | /config/system | 系统配置（group 分组） |

### 财务 / 分销
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /credits | 领货额度（status/month/keyword 筛选） |
| POST | /credits/:id/adjust | 额度调整（delta 正增负减 + 原因） |
| GET | /resells | 转卖单 |
| GET | /resells/pending-orders | 待匹配零售订单 |
| POST | /resells/:id/match | 手动匹配 |
| POST | /resells/:id/cancel | 取消转卖 |
| GET | /commissions | 佣金记录（status/keyword 筛选） |
| GET | /commissions/:id | 佣金详情 |
| GET | /withdraws | 提现单（status/keyword 筛选） |
| POST | /withdraws/:id/audit | 审核（pass + remark） |
| POST | /withdraws/:id/pay | 打款（可选流水号） |
| GET | /finance/overview | 资金总览（收入/服务费/佣金支出/打款/净收入） |
| GET | /finance/flows | 资金流水 |

### 文件
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /files/upload | 上传（multipart file，自动归组） |
| GET | /files | 列表（keyword/type/groupId 筛选） |
| PATCH | /files/:id/group | 单个移动分组 |
| PATCH | /files/group | 批量移动 |
| PATCH | /files/:id/name | 重命名 |
| DELETE | /files/:id | 删除 |
| GET/POST | /file-groups | 分组列表 / 新增 |
| PUT/DELETE | /file-groups/:id | 编辑 / 删除 |

### 仪表盘 / 商城
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /dashboard/summary | 运营总览（会员/订单/待办/等级分布） |
| GET | /shop/home | 商城首页聚合（公开） |
| GET | /shop/products | 商品列表（公开） |
| GET | /shop/products/:id | 商品详情（公开） |
| GET | /shop/gift-packages | 礼包列表（公开） |
| POST | /shop/orders | 商城下单（公开，创建订单） |

## 目录结构

```
apps/server/
├── src/
│   ├── index.ts            # 入口（启动 + 自动种子）
│   ├── app.ts              # Express 装配（/api/v1 挂载）
│   ├── config.ts           # 端口/JWT/路径配置
│   ├── db/
│   │   ├── index.ts        # node:sqlite 连接 + 查询工具 + camelCase 转换
│   │   ├── schema.ts       # 全部建表 SQL（标准化字段）
│   │   └── seed.ts         # 幂等种子数据
│   ├── middlewares/
│   │   ├── auth.ts         # JWT 鉴权 / 角色校验
│   │   └── error.ts        # 404 与统一错误处理
│   ├── utils/
│   │   ├── response.ts     # 统一响应 {code,message,data} + AppError
│   │   └── index.ts        # 分页/单号/时间/金额工具
│   └── routes/             # 各业务模块 REST 路由
├── data/shop-os.db         # SQLite 数据库（自动生成）
├── uploads/                # 上传文件（自动生成）
└── package.json
```

## 技术说明

- **零原生依赖**：SQLite 使用 Node 22 内置 `node:sqlite`（`DatabaseSync`），无需编译原生模块
- 依赖仅：express / cors / multer / jsonwebtoken / bcryptjs / zod
- 金额使用 `REAL`（元）存储，API 层 `money()` 保留两位；生产环境建议迁移 `DECIMAL(12,2)`
- 权限：`requireRole('super_admin','ops')` 等控制写操作；财务角色可审核提现/打款
