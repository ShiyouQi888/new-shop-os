// ===== PostgreSQL Schema（Shop-OS） =====
// 主键使用 SERIAL；金额使用 NUMERIC(14,2)，比例及非货币测量值使用双精度数值。

export const SCHEMA_SQL = `
-- 管理员（后台账号）
CREATE TABLE IF NOT EXISTS admin_user (
  id            SERIAL PRIMARY KEY,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  name          TEXT    NOT NULL DEFAULT '',
  role          TEXT    NOT NULL DEFAULT 'ops',   -- super_admin / ops / finance
  avatar        TEXT    NOT NULL DEFAULT '',
  status        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  updated_at    TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 会员 / 代理商（含三级推荐关系）
CREATE TABLE IF NOT EXISTS member (
  id                 SERIAL PRIMARY KEY,
  username           TEXT    UNIQUE,
  password_hash      TEXT    DEFAULT '',
  nickname           TEXT    NOT NULL DEFAULT '',
  avatar             TEXT    NOT NULL DEFAULT '',
  phone              TEXT    NOT NULL DEFAULT '',
  level              INTEGER NOT NULL DEFAULT 0,   -- 0 普通 1 银卡 2 金卡 3 铂金 4 钻石（对应 level_config.level）
  inviter_id         INTEGER REFERENCES member(id),
  second_inviter_id  INTEGER REFERENCES member(id),
  third_inviter_id   INTEGER REFERENCES member(id),
  invite_code        TEXT    NOT NULL UNIQUE,
  status             INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  updated_at         TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_member_inviter ON member(inviter_id);
CREATE INDEX IF NOT EXISTS idx_member_level ON member(level);

-- 钱包
CREATE TABLE IF NOT EXISTS wallet (
  id             SERIAL PRIMARY KEY,
  member_id      INTEGER NOT NULL UNIQUE REFERENCES member(id),
  balance        NUMERIC(14,2)    NOT NULL DEFAULT 0,
  frozen         NUMERIC(14,2)    NOT NULL DEFAULT 0,
  total_income   NUMERIC(14,2)    NOT NULL DEFAULT 0,
  total_withdraw NUMERIC(14,2)    NOT NULL DEFAULT 0,
  updated_at     TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 商品分类（支持二级）
CREATE TABLE IF NOT EXISTS category (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL,
  parent_id   INTEGER NOT NULL DEFAULT 0,
  icon        TEXT    NOT NULL DEFAULT 'folder',
  sort        INTEGER NOT NULL DEFAULT 0,
  is_gift_zone INTEGER NOT NULL DEFAULT 0,   -- 1 入会专区
  status      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  updated_at  TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 商品 SPU
CREATE TABLE IF NOT EXISTS product_spu (
  id                SERIAL PRIMARY KEY,
  name              TEXT    NOT NULL,
  category_id       INTEGER REFERENCES category(id),
  main_image        TEXT    NOT NULL DEFAULT '',
  images            TEXT    NOT NULL DEFAULT '[]',
  description       TEXT    NOT NULL DEFAULT '',
  is_gift_package   INTEGER NOT NULL DEFAULT 0,
  is_monthly_product INTEGER NOT NULL DEFAULT 0,
  exclude_discount  INTEGER NOT NULL DEFAULT 0,
  status            INTEGER NOT NULL DEFAULT 1,
  sort              INTEGER NOT NULL DEFAULT 0,
  create_time       TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time       TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_spu_category ON product_spu(category_id);
CREATE INDEX IF NOT EXISTS idx_spu_status ON product_spu(status);

-- 商品 SKU
CREATE TABLE IF NOT EXISTS product_sku (
  id             SERIAL PRIMARY KEY,
  spu_id         INTEGER NOT NULL REFERENCES product_spu(id),
  sku_name       TEXT    NOT NULL,
  spec_info      TEXT    NOT NULL DEFAULT '{}',
  price          NUMERIC(14,2)    NOT NULL DEFAULT 0,
  market_price   NUMERIC(14,2)    NOT NULL DEFAULT 0,       -- 营销参考价，仅前台展示，不参与任何资金计算
  cost_price     NUMERIC(14,2)    NOT NULL DEFAULT 0,       -- 内部采购/成本价，仅后台财务/商品管理使用
  original_price NUMERIC(14,2)    NOT NULL DEFAULT 0,
  stock          BIGINT  NOT NULL DEFAULT 0,
  sales          INTEGER NOT NULL DEFAULT 0,
  image          TEXT    NOT NULL DEFAULT '',
  status         INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sku_spu ON product_sku(spu_id);

-- 入会大礼包
CREATE TABLE IF NOT EXISTS gift_package (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL,
  spu_id      INTEGER NOT NULL REFERENCES product_spu(id),
  price       NUMERIC(14,2)    NOT NULL DEFAULT 0,
  level       INTEGER NOT NULL DEFAULT 1,   -- 关联 level_config.level
  status      INTEGER NOT NULL DEFAULT 1,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 礼包内容
CREATE TABLE IF NOT EXISTS gift_package_item (
  id         SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES gift_package(id),
  sku_id     INTEGER NOT NULL,
  sku_name   TEXT    NOT NULL DEFAULT '',
  quantity   INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2)    NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gpi_package ON gift_package_item(package_id);

-- 订单
CREATE TABLE IF NOT EXISTS "order" (
  id               SERIAL PRIMARY KEY,
  order_no         TEXT    NOT NULL UNIQUE,
  member_id        INTEGER NOT NULL REFERENCES member(id),
  member_name      TEXT    NOT NULL DEFAULT '',
  order_type       INTEGER NOT NULL DEFAULT 1,   -- 1 零售 2 礼包
  total_amount     NUMERIC(14,2)    NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(14,2)    NOT NULL DEFAULT 0,
  shipping_fee     NUMERIC(14,2)    NOT NULL DEFAULT 0,
  pay_amount       NUMERIC(14,2)    NOT NULL DEFAULT 0,
  status           INTEGER NOT NULL DEFAULT 0,   -- 0待支付 1待发货 2待收货 3已完成 4已取消 5退款中 6已退款
  receiver_name    TEXT    NOT NULL DEFAULT '',
  receiver_phone   TEXT    NOT NULL DEFAULT '',
  receiver_address TEXT    NOT NULL DEFAULT '',
  logistics_company TEXT   NOT NULL DEFAULT '',
  logistics_no     TEXT    NOT NULL DEFAULT '',
  remark           TEXT    NOT NULL DEFAULT '',
  create_time      TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  pay_time         TEXT    DEFAULT NULL,
  ship_time        TEXT    DEFAULT NULL,
  finish_time      TEXT    DEFAULT NULL,
  cancel_time      TEXT    DEFAULT NULL,
  refund_reason    TEXT    NOT NULL DEFAULT '',
  refund_request_time TEXT  DEFAULT NULL,
  refund_audit_remark TEXT  NOT NULL DEFAULT '',
  refund_audit_time TEXT    DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_member ON "order"(member_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON "order"(status);
CREATE INDEX IF NOT EXISTS idx_order_create ON "order"(create_time);

-- 订单明细
CREATE TABLE IF NOT EXISTS order_item (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES "order"(id),
  sku_id        INTEGER NOT NULL DEFAULT 0,
  sku_name      TEXT    NOT NULL DEFAULT '',
  spec_info     TEXT    NOT NULL DEFAULT '{}',
  image         TEXT    NOT NULL DEFAULT '',
  quantity      INTEGER NOT NULL DEFAULT 1,
  original_price NUMERIC(14,2)   NOT NULL DEFAULT 0,
  unit_price    NUMERIC(14,2)    NOT NULL DEFAULT 0,
  total_price   NUMERIC(14,2)    NOT NULL DEFAULT 0,
  member_level  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_oi_order ON order_item(order_id);

-- 文件分组
CREATE TABLE IF NOT EXISTS file_group (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL,
  icon        TEXT    NOT NULL DEFAULT 'folder',
  match_rules TEXT    NOT NULL DEFAULT '',
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 文件资产
CREATE TABLE IF NOT EXISTS file_asset (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  thumb_url   TEXT    NOT NULL DEFAULT '',
  size        INTEGER NOT NULL DEFAULT 0,
  mime_type   TEXT    NOT NULL DEFAULT '',
  ext         TEXT    NOT NULL DEFAULT '',
  type        INTEGER NOT NULL DEFAULT 1,   -- 1 图片 2 视频
  width       INTEGER DEFAULT NULL,
  height      INTEGER DEFAULT NULL,
  duration    DOUBLE PRECISION    DEFAULT NULL,
  group_id    INTEGER REFERENCES file_group(id),
  uploader_id INTEGER DEFAULT NULL,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_file_group ON file_asset(group_id);

-- 领货额度记录
CREATE TABLE IF NOT EXISTS credit_record (
  id            SERIAL PRIMARY KEY,
  member_id     INTEGER NOT NULL REFERENCES member(id),
  month         TEXT    NOT NULL,               -- 'YYYY-MM'
  credit_amount NUMERIC(14,2)    NOT NULL DEFAULT 0,
  used_amount   NUMERIC(14,2)    NOT NULL DEFAULT 0,
  remain_amount NUMERIC(14,2)    NOT NULL DEFAULT 0,
  status        INTEGER NOT NULL DEFAULT 0,     -- 0 待使用 1 部分使用 2 已用完 3 已过期 4 已转卖
  remark        TEXT    NOT NULL DEFAULT '',
  create_time   TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time   TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_credit_member_month ON credit_record(member_id, month);

-- 领货额度流水
CREATE TABLE IF NOT EXISTS credit_flow (
  id            SERIAL PRIMARY KEY,
  record_id     INTEGER NOT NULL REFERENCES credit_record(id),
  member_id     INTEGER NOT NULL REFERENCES member(id),
  change_amount NUMERIC(14,2)    NOT NULL DEFAULT 0,     -- 正增负减
  balance       NUMERIC(14,2)    NOT NULL DEFAULT 0,
  type          INTEGER NOT NULL DEFAULT 1,     -- 1 发放 2 使用 3 调整 4 回补
  reason        TEXT    NOT NULL DEFAULT '',
  operator_id   INTEGER DEFAULT NULL,
  order_id      INTEGER DEFAULT NULL,
  create_time   TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 领货兑换的现金差价待支付记录：超出额度部分需要现金补差价时，额度/佣金扣减推迟到现金支付成功后才生效
-- （避免会员在付现金前取消订单，导致额度/佣金已扣但订单已退的资金黑洞），见 finalizeCreditRedeem
CREATE TABLE IF NOT EXISTS credit_redeem_pending (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL UNIQUE REFERENCES "order"(id),
  credit_id     INTEGER NOT NULL REFERENCES credit_record(id),
  credit_amount NUMERIC(14,2)    NOT NULL DEFAULT 0,
  wallet_amount NUMERIC(14,2)    NOT NULL DEFAULT 0,
  create_time   TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 转卖单
CREATE TABLE IF NOT EXISTS resell_order (
  id             SERIAL PRIMARY KEY,
  resell_no      TEXT    NOT NULL UNIQUE,
  member_id      INTEGER NOT NULL REFERENCES member(id),
  member_name    TEXT    NOT NULL DEFAULT '',
  credit_id      INTEGER REFERENCES credit_record(id),
  order_id       INTEGER REFERENCES "order"(id),
  order_no       TEXT    NOT NULL DEFAULT '',
  sku_name       TEXT    NOT NULL DEFAULT '',
  goods_value    NUMERIC(14,2)    NOT NULL DEFAULT 0,
  service_fee    NUMERIC(14,2)    NOT NULL DEFAULT 0,
  shipping_fee   NUMERIC(14,2)    NOT NULL DEFAULT 0,
  settle_amount  NUMERIC(14,2)    NOT NULL DEFAULT 0,
  status         INTEGER NOT NULL DEFAULT 0,    -- 0 待匹配 1 匹配中 2 已匹配 3 已完成 4 已取消 5 匹配失败
  match_order_id INTEGER DEFAULT NULL,
  match_time     TEXT    DEFAULT NULL,
  settle_time    TEXT    DEFAULT NULL,
  cancel_time    TEXT    DEFAULT NULL,
  create_time    TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_resell_member ON resell_order(member_id);
CREATE INDEX IF NOT EXISTS idx_resell_status ON resell_order(status);

-- 佣金记录
CREATE TABLE IF NOT EXISTS commission (
  id                SERIAL PRIMARY KEY,
  member_id         INTEGER NOT NULL REFERENCES member(id),
  source_member_id  INTEGER NOT NULL REFERENCES member(id),
  order_id          INTEGER NOT NULL REFERENCES "order"(id),
  package_level     INTEGER NOT NULL DEFAULT 1,
  distribution_level INTEGER NOT NULL DEFAULT 1,  -- 1/2/3
  rate              NUMERIC(10,4)    NOT NULL DEFAULT 0,
  amount            NUMERIC(14,2)    NOT NULL DEFAULT 0,
  status            INTEGER NOT NULL DEFAULT 0,   -- 0 待结算 1 可提现 2 已提现 3 已冻结 4 已回滚
  settlement_due_time TEXT DEFAULT NULL,
  settle_time       TEXT    DEFAULT NULL,
  rollback_reason   TEXT    NOT NULL DEFAULT '',
  create_time       TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time       TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_comm_member ON commission(member_id);
CREATE INDEX IF NOT EXISTS idx_comm_status ON commission(status);

-- 提现单
CREATE TABLE IF NOT EXISTS withdraw (
  id             SERIAL PRIMARY KEY,
  withdraw_no    TEXT    NOT NULL UNIQUE,
  member_id      INTEGER NOT NULL REFERENCES member(id),
  member_name    TEXT    NOT NULL DEFAULT '',
  amount         NUMERIC(14,2)    NOT NULL DEFAULT 0,
  fee            NUMERIC(14,2)    NOT NULL DEFAULT 0,
  actual_amount  NUMERIC(14,2)    NOT NULL DEFAULT 0,
  pay_type       INTEGER NOT NULL DEFAULT 0,    -- 0 银行卡 1 支付宝
  bank_name      TEXT    NOT NULL DEFAULT '',
  bank_card      TEXT    NOT NULL DEFAULT '',
  bank_holder    TEXT    NOT NULL DEFAULT '',
  alipay_name    TEXT    NOT NULL DEFAULT '',
  alipay_account TEXT    NOT NULL DEFAULT '',
  status         INTEGER NOT NULL DEFAULT 0,    -- 0 待审核 1 待打款 2 已打款 3 已驳回
  audit_time     TEXT    DEFAULT NULL,
  audit_remark   TEXT    NOT NULL DEFAULT '',
  pay_time       TEXT    DEFAULT NULL,
  transaction_no TEXT    NOT NULL DEFAULT '',
  create_time    TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_withdraw_member ON withdraw(member_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw(status);

-- 资金流水
CREATE TABLE IF NOT EXISTS finance_flow (
  id          SERIAL PRIMARY KEY,
  flow_no     TEXT    NOT NULL UNIQUE,
  type        INTEGER NOT NULL DEFAULT 1,       -- 1 订单收入 2 服务费收入 3 佣金支出 4 提现打款 5 其他
  amount      NUMERIC(14,2)    NOT NULL DEFAULT 0,       -- 正收负支
  balance     NUMERIC(14,2)    NOT NULL DEFAULT 0,
  related_no  TEXT    NOT NULL DEFAULT '',
  remark      TEXT    NOT NULL DEFAULT '',
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_finance_create ON finance_flow(create_time);

-- 等级权益配置
CREATE TABLE IF NOT EXISTS level_config (
  id              SERIAL PRIMARY KEY,
  level           INTEGER NOT NULL UNIQUE,
  level_name      TEXT    NOT NULL,
  level_sort      INTEGER NOT NULL DEFAULT 0,
  entry_amount    NUMERIC(14,2)    NOT NULL DEFAULT 0,
  shop_discount   INTEGER NOT NULL DEFAULT 100,  -- 90 = 9折
  monthly_credit  NUMERIC(14,2)    NOT NULL DEFAULT 0,
  credit_months   INTEGER NOT NULL DEFAULT 1,
  resell_fee_rate NUMERIC(10,4)    NOT NULL DEFAULT 0,
  status          INTEGER NOT NULL DEFAULT 1,
  update_time     TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 分销佣金规则
CREATE TABLE IF NOT EXISTS commission_rule (
  id                SERIAL PRIMARY KEY,
  package_level     INTEGER NOT NULL,            -- 礼包关联等级
  distribution_level INTEGER NOT NULL,           -- 1/2/3
  rate              NUMERIC(10,4)    NOT NULL DEFAULT 0,
  status            INTEGER NOT NULL DEFAULT 1,
  update_time       TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 系统配置
CREATE TABLE IF NOT EXISTS system_config (
  id              SERIAL PRIMARY KEY,
  config_key      TEXT    NOT NULL UNIQUE,
  config_value    TEXT    NOT NULL DEFAULT '',
  config_group    TEXT    NOT NULL DEFAULT 'general',
  description     TEXT    NOT NULL DEFAULT '',
  update_operator TEXT    NOT NULL DEFAULT '',
  update_time     TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 帮助/规则文档（后台维护，前台 /mine/help 与 /mine/rules 展示）
CREATE TABLE IF NOT EXISTS help_article (
  id          SERIAL PRIMARY KEY,
  scope       TEXT    NOT NULL DEFAULT 'help',   -- help 帮助文档 / rules 规则条款
  title       TEXT    NOT NULL,
  category    TEXT    NOT NULL DEFAULT 'general',   -- 分类：order/member/join/commission/aftersale/general
  content     TEXT    NOT NULL DEFAULT '',
  sort        INTEGER NOT NULL DEFAULT 0,
  status      INTEGER NOT NULL DEFAULT 1,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 收货地址（前台 /mine/address 管理）
CREATE TABLE IF NOT EXISTS member_address (
  id          SERIAL PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES member(id),
  name        TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  province    TEXT    NOT NULL DEFAULT '',
  city        TEXT    NOT NULL DEFAULT '',
  district    TEXT    NOT NULL DEFAULT '',
  detail      TEXT    NOT NULL DEFAULT '',
  is_default  INTEGER NOT NULL DEFAULT 0,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_maddr_member ON member_address(member_id);

-- 购物车（前台 /cart）
CREATE TABLE IF NOT EXISTS member_cart (
  id          SERIAL PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES member(id),
  sku_id      INTEGER NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  selected    INTEGER NOT NULL DEFAULT 1,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  UNIQUE (member_id, sku_id)
);
CREATE INDEX IF NOT EXISTS idx_mcart_member ON member_cart(member_id);

-- 消息通知（前台 /mine/notifications）
CREATE TABLE IF NOT EXISTS member_notification (
  id          SERIAL PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES member(id),
  type        TEXT    NOT NULL DEFAULT 'system',  -- order/commission/credit/system
  title       TEXT    NOT NULL,
  content     TEXT    NOT NULL DEFAULT '',
  is_read     INTEGER NOT NULL DEFAULT 0,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_mnotif_member ON member_notification(member_id);

-- 客服工单（前台提交，后台处理）
CREATE TABLE IF NOT EXISTS work_order (
  id            SERIAL PRIMARY KEY,
  ticket_no     TEXT    NOT NULL UNIQUE,
  member_id     INTEGER NOT NULL REFERENCES member(id),
  member_name   TEXT    NOT NULL DEFAULT '',
  phone         TEXT    NOT NULL DEFAULT '',
  type          TEXT    NOT NULL DEFAULT 'consult',
  title         TEXT    NOT NULL DEFAULT '',
  content       TEXT    NOT NULL DEFAULT '',
  images        TEXT    NOT NULL DEFAULT '[]',
  priority      INTEGER NOT NULL DEFAULT 1,
  status        INTEGER NOT NULL DEFAULT 0, -- 0 待处理 1 处理中 2 已回复 3 已关闭
  reply_content TEXT    NOT NULL DEFAULT '',
  handler       TEXT    NOT NULL DEFAULT '',
  handle_time   TEXT    DEFAULT NULL,
  close_time    TEXT    DEFAULT NULL,
  create_time   TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time   TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_work_order_member ON work_order(member_id);
CREATE INDEX IF NOT EXISTS idx_work_order_status ON work_order(status);

-- 浏览历史（前台 /mine/history）
CREATE TABLE IF NOT EXISTS member_browse (
  id          SERIAL PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES member(id),
  spu_id      INTEGER NOT NULL,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_mbrowse_member ON member_browse(member_id);

-- 商品收藏（前台 /mine/favorites）
CREATE TABLE IF NOT EXISTS member_favorite (
  id          SERIAL PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES member(id),
  spu_id      INTEGER NOT NULL,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  UNIQUE (member_id, spu_id)
);
CREATE INDEX IF NOT EXISTS idx_mfav_member ON member_favorite(member_id);

-- 提现收款账号（前台 /agent/withdraw-account）
CREATE TABLE IF NOT EXISTS payout_account (
  id             SERIAL PRIMARY KEY,
  member_id      INTEGER NOT NULL UNIQUE REFERENCES member(id),
  bank_name      TEXT    NOT NULL DEFAULT '',
  bank_card      TEXT    NOT NULL DEFAULT '',
  bank_holder    TEXT    NOT NULL DEFAULT '',
  alipay_name    TEXT    NOT NULL DEFAULT '',
  alipay_account TEXT    NOT NULL DEFAULT '',
  update_time    TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 支付单（微信/支付宝支付流程：下单 → 创建支付单 → 支付回调）
CREATE TABLE IF NOT EXISTS payment_order (
  id          SERIAL PRIMARY KEY,
  payment_no  TEXT    NOT NULL UNIQUE,
  order_id    INTEGER NOT NULL REFERENCES "order"(id),
  member_id   INTEGER NOT NULL REFERENCES member(id),
  pay_type    TEXT    NOT NULL DEFAULT 'wechat',  -- wechat / alipay
  amount      NUMERIC(14,2)    NOT NULL DEFAULT 0,
  status      INTEGER NOT NULL DEFAULT 0,          -- 0 待支付 1 已支付 2 已关闭
  trade_no    TEXT    NOT NULL DEFAULT '',          -- 第三方交易号（模拟）
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  pay_time    TEXT    DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_payorder_member ON payment_order(member_id);
CREATE INDEX IF NOT EXISTS idx_payorder_order ON payment_order(order_id);

-- 后台操作日志（系统管理 / 日志与审计）
CREATE TABLE IF NOT EXISTS admin_log (
  id          SERIAL PRIMARY KEY,
  operator    TEXT    NOT NULL DEFAULT '',
  module      TEXT    NOT NULL DEFAULT '',
  action      TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  ip          TEXT    NOT NULL DEFAULT '',
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_adminlog_time ON admin_log(create_time);

-- 后台角色（权限组）
CREATE TABLE IF NOT EXISTS admin_role (
  id          SERIAL PRIMARY KEY,
  code        TEXT    NOT NULL UNIQUE,          -- 角色编码：super_admin / ops / finance / customer_service
  name        TEXT    NOT NULL,                 -- 角色名称
  description TEXT    NOT NULL DEFAULT '',
  permissions TEXT    NOT NULL DEFAULT '[]',    -- 权限码 JSON 数组（空=全部）
  is_builtin  INTEGER NOT NULL DEFAULT 0,       -- 内置角色不可删除
  status      INTEGER NOT NULL DEFAULT 1,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 后台登录日志
CREATE TABLE IF NOT EXISTS admin_login_log (
  id          SERIAL PRIMARY KEY,
  username    TEXT    NOT NULL DEFAULT '',
  ip          TEXT    NOT NULL DEFAULT '',
  device      TEXT    NOT NULL DEFAULT '',
  success     INTEGER NOT NULL DEFAULT 1,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_admlogin_time ON admin_login_log(create_time);

-- 分销推广海报（后台维护，前台推广中心展示）
CREATE TABLE IF NOT EXISTS promote_poster (
  id          SERIAL PRIMARY KEY,
  title       TEXT    NOT NULL DEFAULT '',
  image       TEXT    NOT NULL DEFAULT '',       -- 海报图片 URL（/uploads/...）
  status      INTEGER NOT NULL DEFAULT 1,        -- 1 启用 0 停用
  is_fixed    INTEGER NOT NULL DEFAULT 0,        -- 1 固定海报（前台优先展示）0 参与随机
  qr_x        DOUBLE PRECISION    NOT NULL DEFAULT 38,       -- 二维码左上角 X（占海报宽度百分比）
  qr_y        DOUBLE PRECISION    NOT NULL DEFAULT 72,       -- 二维码左上角 Y（占海报高度百分比）
  qr_size     DOUBLE PRECISION    NOT NULL DEFAULT 24,       -- 二维码尺寸（占海报宽度百分比）
  sort        INTEGER NOT NULL DEFAULT 0,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);

-- 月度领货商品池（按等级配置：会员只能用领货额度兑换自己等级池内的商品）
CREATE TABLE IF NOT EXISTS credit_pool_item (
  id          SERIAL PRIMARY KEY,
  level       INTEGER NOT NULL,
  spu_id      INTEGER NOT NULL REFERENCES product_spu(id),
  sort        INTEGER NOT NULL DEFAULT 0,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  UNIQUE (level, spu_id)
);
CREATE INDEX IF NOT EXISTS idx_credit_pool_level ON credit_pool_item(level);

-- 转卖自动匹配商品池（按等级配置：商城/入会礼包订单命中池内商品才能触发自动匹配）
CREATE TABLE IF NOT EXISTS resell_pool_item (
  id          SERIAL PRIMARY KEY,
  level       INTEGER NOT NULL,
  spu_id      INTEGER NOT NULL REFERENCES product_spu(id),
  sort        INTEGER NOT NULL DEFAULT 0,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  UNIQUE (level, spu_id)
);
CREATE INDEX IF NOT EXISTS idx_resell_pool_level ON resell_pool_item(level);

-- 商城首页轮播图（后台维护，前台首页轮播展示）
CREATE TABLE IF NOT EXISTS home_banner (
  id          SERIAL PRIMARY KEY,
  title       TEXT    NOT NULL DEFAULT '',       -- 内部备注名称，前台不展示
  image       TEXT    NOT NULL DEFAULT '',       -- 轮播图片 URL（/uploads/...）
  link        TEXT    NOT NULL DEFAULT '',       -- 点击跳转路径（站内相对路径），留空则不可点击
  status      INTEGER NOT NULL DEFAULT 1,        -- 1 启用 0 停用
  sort        INTEGER NOT NULL DEFAULT 0,
  create_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')),
  update_time TEXT    NOT NULL DEFAULT (to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'))
);
CREATE INDEX IF NOT EXISTS idx_home_banner_sort ON home_banner(sort, id);
`
