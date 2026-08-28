// ===== 种子数据（幂等：已存在则跳过） =====
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db, run, get } from './index.js'
import { config } from '../config.js'
import { now, genNo } from '../utils/index.js'

function seeded(key: string): boolean {
  return !!get<{ c: number }>('SELECT COUNT(*) AS c FROM system_config WHERE config_key = ?', key)?.c
}

function markSeed(key: string) {
  run(
    'INSERT OR IGNORE INTO system_config (config_key, config_value, config_group, description, update_time) VALUES (?, ?, ?, ?, ?)',
    key, '1', 'seed', '种子数据标记', now(),
  )
}

/**
 * 新增系统配置项的补丁列表：即使已完成初次播种（seed.done），也在每次启动时补齐，
 * 避免存量数据库缺失新增配置键（同一份列表在新库初始化时同样生效，无需重复维护）。
 */
function patchConfigDefaults() {
  const patches: [string, string, string, string][] = [
    ['site.logo', '', 'basic', '站点Logo（登录页/侧边栏展示，留空使用默认）'],
    ['site.icon', '', 'basic', '站点图标/Favicon（留空使用默认）'],
    ['site.theme', 'orange', 'basic', '商城前台主题：orange 橘意暖阳 / blue 海洋蓝 / green 森林绿 / purple 至尊紫'],
    ['credit.claim_mode', 'lump_sum', 'credit', '领货/转卖模式：lump_sum 一次性用完剩余额度 / flexible 自由任意额度'],
    ['consumption_credit.enabled', '0', 'consumption_credit', '消费返还额度总开关：1 开启 0 关闭（购物消费按比例累加当月领货额度）'],
    ['consumption_credit.normal_rate', '0', 'consumption_credit', '普通会员消费返还比例(%)，按订单实付金额计算'],
    ['consumption_credit.normal_months', '0', 'consumption_credit', '普通会员消费返还额度有效月数（0 表示不限）'],
    ['consumption_credit.normal_resellable', '0', 'consumption_credit', '普通会员消费所得额度是否支持转卖：1 支持 0 不支持'],
    ['resell.auto_match_enabled', '0', 'resell', '转卖自动匹配总开关：1 开启后，商城/入会礼包订单命中转卖商品池即自动匹配最早的待匹配转卖单'],
  ]
  for (const c of patches) {
    run('INSERT OR IGNORE INTO system_config (config_key, config_value, config_group, description, update_time) VALUES (?, ?, ?, ?, ?)', c[0], c[1], c[2], c[3], now())
  }
}

/** 一次性修正历史种子数据的错误：早期种子把 9 个普通零售商品也错误标记为 is_gift_package=1，
 *  导致商城详情页把它们的"立即购买"全部导向入会流程。只修正非入会专区分类下被误标的商品，
 *  不影响管理员后续手动设置的真实礼包商品。 */
function fixSeedGiftPackageFlag() {
  if (seeded('migration.fix_seed_gift_package_flag')) return
  run("UPDATE product_spu SET is_gift_package = 0 WHERE is_gift_package = 1 AND category_id != 5 AND id IN (1,2,3,4,5,6,7,8,9)")
  markSeed('migration.fix_seed_gift_package_flag')
}

export async function seed() {
  patchConfigDefaults()
  fixSeedGiftPackageFlag()

  if (seeded('seed.done')) {
    console.log('[seed] 已存在种子数据，跳过')
    return
  }

  const hash = (pw: string) => bcrypt.hashSync(pw, config.bcryptRounds)

  // ===== 管理员 =====
  const admins: { username: string; name: string; role: string }[] = [
    { username: 'admin', name: '超级管理员', role: 'super_admin' },
    { username: 'ops', name: '运营', role: 'ops' },
    { username: 'finance', name: '财务', role: 'finance' },
  ]
  // 首次初始化的管理员账号使用随机密码，避免生产环境出现"人尽皆知"的固定初始密码；
  // 仅在打印一次的启动日志中出现，请立即登录后自行修改
  console.log('[seed] 首次初始化管理员账号，初始密码如下（仅显示一次，请妥善保存并尽快登录修改）：')
  for (const a of admins) {
    const initialPassword = crypto.randomBytes(6).toString('base64url')
    run(
      'INSERT OR IGNORE INTO admin_user (username, password_hash, name, role, avatar) VALUES (?, ?, ?, ?, ?)',
      a.username, hash(initialPassword), a.name, a.role, '',
    )
    console.log(`[seed]   ${a.username} / ${initialPassword}`)
  }

  // ===== 会员（含三级推荐链） =====
  const members: [string, number, number][] = [
    // [昵称, 等级, 推荐人序号(1 起，0 无)]
    ['刘总', 4, 0], ['陈总', 4, 1], ['王总', 3, 1], ['李总', 3, 2],
    ['张姐', 2, 1], ['赵姐', 2, 3], ['孙哥', 1, 2], ['周哥', 1, 4],
    ['吴哥', 1, 5], ['郑姐', 0, 5], ['冯姐', 0, 6], ['褚哥', 0, 7],
  ]
  const memberIds: number[] = []
  for (let i = 0; i < members.length; i++) {
    const [nickname, level, inviterIdx] = members[i]
    const username = `m${i + 1}`
    const existing = get<{ id: number }>('SELECT id FROM member WHERE username = ?', username)
    if (existing) {
      memberIds.push(existing.id)
      continue
    }
    const inviterId = inviterIdx ? memberIds[inviterIdx - 1] : null
    const inv = inviterId ? get<{ inviterId: number | null; secondInviterId: number | null }>('SELECT inviter_id AS inviterId, second_inviter_id AS secondInviterId FROM member WHERE id = ?', inviterId) : null
    const second = inv?.inviterId ?? null
    const third = inv ? (inv.secondInviterId ?? null) : null
    const res = run(
      `INSERT INTO member (username, password_hash, nickname, avatar, phone, level, inviter_id, second_inviter_id, third_inviter_id, invite_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      username, hash('123456'), nickname, `https://api.dicebear.com/7.x/avataaars/svg?seed=${nickname}`,
      `138${String(10000000 + i * 137)}`, level, inviterId, second, third, `SH${String(1000 + i)}`,
    )
    const mid = Number(res.lastInsertRowid)
    memberIds.push(mid)
    run(
      'INSERT OR IGNORE INTO wallet (member_id, balance, frozen, total_income, total_withdraw) VALUES (?, ?, ?, ?, ?)',
      mid, 2000 + level * 3000, 200, 8000 + level * 12000, 1000 + level * 3000,
    )
  }

  // ===== 分类 =====
  const cats: [number, string, number, string, number, number][] = [
    [1, '美妆护肤', 0, 'lipstick', 1, 0], [2, '健康食品', 0, 'nutrition', 2, 0],
    [3, '家居生活', 0, 'home', 3, 0], [4, '数码电器', 0, 'device', 4, 0],
    [5, '入会专区', 0, 'gift', 0, 1],
    [11, '面部护理', 1, '', 1, 0], [12, '彩妆', 1, '', 2, 0], [21, '营养补充', 2, '', 1, 0],
  ]
  for (const c of cats) {
    run(
      'INSERT OR IGNORE INTO category (id, name, parent_id, icon, sort, is_gift_zone, status) VALUES (?, ?, ?, ?, ?, ?, 1)',
      c[0], c[1], c[2], c[3], c[4], c[5],
    )
  }

  // ===== 商品 SPU + SKU =====
  // 元组: [id, name, categoryId, isGiftPackage, sort] —— 只有入会专区(categoryId=5)的 3 个礼包才是 isGiftPackage=1，
  // 其余 9 个普通零售商品必须是 0，否则商品详情页会把"立即购买"按钮全部导向入会流程
  const spus: [number, string, number, number, number][] = [
    [1, '烟酰胺焕亮精华液', 1, 0, 0], [2, '玻尿酸保湿面膜', 1, 0, 0], [3, '丝绒哑光口红', 1, 0, 0],
    [4, '胶原蛋白肽粉', 2, 0, 0], [5, '益生菌固体饮料', 2, 0, 0],
    [6, '香薰加湿器', 3, 0, 0], [7, '乳胶枕', 3, 0, 0],
    [8, '无线蓝牙耳机', 4, 0, 0], [9, '智能体脂秤', 4, 0, 0],
    [10, '礼包·银卡套装', 5, 1, 1], [11, '礼包·金卡套装', 5, 1, 1], [12, '礼包·铂金套装', 5, 1, 1],
  ]
  const skuDefs: [number, string, number, number][] = [
    [1, '30ml', 199, 129], [1, '50ml', 299, 199],
    [2, '5片装', 89, 59], [3, '正红色', 159, 109], [3, '豆沙色', 159, 109],
    [4, '30条装', 268, 198], [5, '20条装', 158, 108],
    [6, '标准款', 129, 89], [7, '成人款', 199, 149],
    [8, '白色', 399, 299], [9, '黑色', 99, 69],
    [10, '银卡礼包', 5800, 5800], [11, '金卡礼包', 9800, 9800], [12, '铂金礼包', 19800, 19800],
  ]
  for (const s of spus) {
    run(
      'INSERT OR IGNORE INTO product_spu (id, name, category_id, main_image, images, description, is_gift_package, is_monthly_product, exclude_discount, status, sort, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?)',
      s[0], s[1], s[2], `https://picsum.photos/seed/s${s[0]}/400`, JSON.stringify([`https://picsum.photos/seed/s${s[0]}a/400`]),
      `${s[1]} 描述`, s[3], s[4], now(),
    )
  }
  let skuId = 1
  for (const [spuId, skuName, price, orig] of skuDefs) {
    run(
      'INSERT OR IGNORE INTO product_sku (id, spu_id, sku_name, spec_info, price, original_price, stock, sales, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      skuId, spuId, skuName, JSON.stringify({ spec: skuName }), price, orig, 500 + spuId * 37, 12 + spuId * 7,
      `https://picsum.photos/seed/sk${skuId}/300`,
    )
    skuId++
  }

  // ===== 礼包 =====
  const pkgs: [number, string, number, number, number][] = [
    [1, '银卡入会礼包', 10, 5800, 1], [2, '金卡入会礼包', 11, 9800, 2],
    [3, '铂金入会礼包', 12, 19800, 3], [4, '钻石入会礼包', 12, 39800, 4],
  ]
  for (const p of pkgs) {
    run('INSERT OR IGNORE INTO gift_package (id, name, spu_id, price, level, status, create_time) VALUES (?, ?, ?, ?, ?, 1, ?)', p[0], p[1], p[2], p[3], p[4], now())
  }
  const pkgItems: [number, number, string, number, number][] = [
    [1, 1, '烟酰胺焕亮精华液 30ml', 2, 199],
    [1, 3, '丝绒哑光口红 正红色', 2, 159],
    [2, 1, '烟酰胺焕亮精华液 30ml', 4, 199],
    [2, 6, '胶原蛋白肽粉 30条装', 2, 268],
    [3, 1, '烟酰胺焕亮精华液 30ml', 6, 199],
    [3, 11, '银卡礼包', 1, 5800],
    [4, 1, '烟酰胺焕亮精华液 30ml', 8, 199],
    [4, 6, '胶原蛋白肽粉 30条装', 4, 268],
  ]
  for (const it of pkgItems) {
    run('INSERT OR IGNORE INTO gift_package_item (package_id, sku_id, sku_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', it[0], it[1], it[2], it[3], it[4])
  }

  // ===== 订单 =====
  const orders: [string, number, string, number, number, number, number, number, string, number][] = [
    ['SO', 1, '刘总', 2, 9800, 0, 9800, 2, '已签收', 1],
    ['SO', 2, '陈总', 2, 9800, 0, 9800, 3, '已签收', 1],
    ['SO', 3, '王总', 2, 19800, 0, 19800, 1, '已签收', 1],
    ['SO', 5, '张姐', 1, 199, 0, 199, 1, '待发货', 1],
    ['SO', 5, '张姐', 1, 89, 0, 89, 2, '已签收', 1],
    ['SO', 6, '赵姐', 1, 159, 0, 159, 0, '待支付', 1],
    ['SO', 7, '孙哥', 1, 268, 0, 268, 1, '待发货', 1],
    ['SO', 9, '郑姐', 1, 99, 0, 99, 4, '已取消', 1],
  ]
  const orderIds: number[] = []
  for (const o of orders) {
    const [pfx, memberId, memberName, type, total, discount, pay, status, recv] = o
    const res = run(
      `INSERT INTO "order" (order_no, member_id, member_name, order_type, total_amount, discount_amount, shipping_fee, pay_amount, status, receiver_name, receiver_phone, receiver_address, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      genNo(pfx), memberId, memberName, type, total, discount, pay, status, recv, `1380000${memberId}`, '示例收货地址 1 号',
      new Date(Date.now() - (status === 4 ? 3 : 1) * 86400000).toISOString().slice(0, 19).replace('T', ' '),
    )
    const oid = Number(res.lastInsertRowid)
    orderIds.push(oid)
    const skuId2 = 1 + (oid % 12)
    const sku = get<{ skuName: string; price: number; originalPrice: number }>('SELECT sku_name AS skuName, price, original_price AS originalPrice FROM product_sku WHERE id = ?', skuId2)!
    run(
      'INSERT INTO order_item (order_id, sku_id, sku_name, spec_info, image, quantity, original_price, unit_price, total_price, member_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      oid, skuId2, sku.skuName, '{}', '', 1, sku.originalPrice, type === 2 ? total : sku.price, type === 2 ? total : sku.price, 0,
    )
  }

  // ===== 文件分组 / 资产 =====
  const fgroups: [string, string, string][] = [
    ['礼包素材', 'gift', 'gift'], ['商品图片', 'picture', 'jpg,png,jpeg,webp'],
    ['介绍视频', 'video', 'video'], ['宣传物料', 'megaphone', ''],
  ]
  const fgIds: number[] = []
  for (const g of fgroups) {
    const r = run('INSERT OR IGNORE INTO file_group (name, icon, match_rules, create_time) VALUES (?, ?, ?, ?)', g[0], g[1], g[2], now())
    if (r.changes) fgIds.push(Number(r.lastInsertRowid))
  }
  const fg1 = fgIds[0] ?? 1
  for (let i = 1; i <= 8; i++) {
    const isVideo = i % 5 === 0
    run(
      'INSERT OR IGNORE INTO file_asset (name, url, thumb_url, size, mime_type, ext, type, width, height, group_id, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      `示例${isVideo ? '视频' : '图片'}${i}.${isVideo ? 'mp4' : 'jpg'}`, `https://picsum.photos/seed/f${i}/600`,
      isVideo ? '' : `https://picsum.photos/seed/f${i}/200`, 1024 * (30 + i * 13), isVideo ? 'video/mp4' : 'image/jpeg',
      isVideo ? 'mp4' : 'jpg', isVideo ? 2 : 1, isVideo ? null : 600, isVideo ? null : 600, i <= 6 ? fg1 : null, now(),
    )
  }

  // ===== 领货额度 =====
  for (let i = 0; i < 8; i++) {
    const mid = memberIds[i]
    const lv = members[i][1]
    const credit = lv >= 4 ? 3980 : lv === 3 ? 1980 : lv === 2 ? 980 : lv === 1 ? 580 : 0
    if (!credit) continue
    const res = run(
      'INSERT OR IGNORE INTO credit_record (member_id, month, credit_amount, used_amount, remain_amount, status, create_time) VALUES (?, ?, ?, ?, ?, 0, ?)',
      mid, '2026-08', credit, credit * 0.4, credit * 0.6, now(),
    )
    const rid = Number(res.lastInsertRowid)
    run('INSERT OR IGNORE INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, create_time) VALUES (?, ?, ?, ?, 1, ?, ?)', rid, mid, credit, credit, '月度额度发放', now())
  }

  // ===== 佣金 =====
  const comms: [number, number, number, number, number, number, number][] = [
    [memberIds[0], memberIds[1], orderIds[0], 2, 1, 15, 1470],
    [memberIds[1], memberIds[2], orderIds[0], 2, 1, 15, 1470],
    [memberIds[0], memberIds[2], orderIds[1], 2, 1, 15, 1470],
    [memberIds[2], memberIds[3], orderIds[2], 3, 1, 18, 3564],
    [memberIds[4], memberIds[5], orderIds[3], 1, 1, 10, 19.9],
    [memberIds[5], memberIds[6], orderIds[4], 1, 2, 3, 2.67],
  ]
  for (const c of comms) {
    run(
      'INSERT OR IGNORE INTO commission (member_id, source_member_id, order_id, package_level, distribution_level, rate, amount, status, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
      c[0], c[1], c[2], c[3], c[4], c[5], c[6], now(), now(),
    )
  }

  // ===== 提现 =====
  const wds: [number, string, number, number, number, number][] = [
    [memberIds[0], '刘总', 3000, 30, 2970, 1],
    [memberIds[1], '陈总', 5000, 50, 4950, 0],
    [memberIds[2], '王总', 2000, 20, 1980, 2],
  ]
  for (const w of wds) {
    run(
      `INSERT OR IGNORE INTO withdraw (withdraw_no, member_id, member_name, amount, fee, actual_amount, bank_name, bank_card, status, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      genNo('TX'), w[0], w[1], w[2], w[3], w[4], '招商银行', `6225 **** **** ${1000 + w[0]}`, w[5],
      new Date(Date.now() - w[5] * 86400000).toISOString().slice(0, 19).replace('T', ' '),
    )
  }

  // ===== 资金流水 =====
  const flows: [number, number, string, number][] = [
    [1, 9800, '订单收入', orderIds[0]], [2, 392, '服务费收入', orderIds[0]], [3, -4410, '佣金支出', orderIds[0]],
    [1, 19800, '订单收入', orderIds[2]], [4, -2970, '提现打款', 0], [3, -3564, '佣金支出', orderIds[2]],
  ]
  for (const f of flows) {
    run('INSERT OR IGNORE INTO finance_flow (flow_no, type, amount, balance, related_no, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      genNo('LS'), f[0], f[1], 0, f[3] ? String(f[3]) : '', f[2], now())
  }

  // ===== 等级配置 =====
  const levels: [number, string, number, number, number, number, number, number][] = [
    [1, '银卡代理商', 1, 5800, 90, 580, 10, 20], [2, '金卡代理商', 2, 9800, 80, 980, 10, 20],
    [3, '铂金代理商', 3, 19800, 70, 1980, 12, 18], [4, '钻石代理商', 4, 39800, 60, 3980, 12, 15],
  ]
  for (const l of levels) {
    run('INSERT OR IGNORE INTO level_config (level, level_name, level_sort, entry_amount, shop_discount, monthly_credit, credit_months, resell_fee_rate, status, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
      l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[7], now())
  }

  // ===== 佣金规则 =====
  const rules: [number, number, number][] = [
    [1, 1, 10], [1, 2, 3], [1, 3, 1],
    [2, 1, 15], [2, 2, 5], [2, 3, 2],
    [3, 1, 18], [3, 2, 6], [3, 3, 2],
    [4, 1, 20], [4, 2, 7], [4, 3, 3],
  ]
  for (const r of rules) {
    run('INSERT OR IGNORE INTO commission_rule (package_level, distribution_level, rate, status, update_time) VALUES (?, ?, ?, 1, ?)', r[0], r[1], r[2], now())
  }

  // ===== 系统配置 =====
  const syscfg: [string, string, string, string][] = [
    ['site.name', '橙选电商代理商系统', 'basic', '站点名称'],
    ['site.kf_phone', '400-888-0000', 'basic', '客服电话'],
    ['site.domain', 'http://localhost:5174', 'basic', '站点访问域名（用于生成推广链接/海报二维码）'],
    ['order.auto_finish_days', '7', 'order', '确认收货后自动完成天数'],
    ['withdraw.min_amount', '100', 'withdraw', '最低提现金额'],
    ['withdraw.fee_rate', '1', 'withdraw', '提现手续费率(%)'],
    ['credit.start_day', '1', 'credit', '月度领货额度发放日(每月几号)'],
    ['credit.expire_policy', 'void', 'credit', '到期策略：void 作废 / rollover 结转'],
    ['resell.service_fee_rate', '20', 'resell', '转卖服务费率(%)'],
    ['resell.shipping_type', 'fixed', 'resell', '快递费规则：fixed 固定 / buyer 买家承担'],
    ['resell.shipping_fee', '10', 'resell', '转卖固定快递费(元)'],
    ['resell.timeout_days', '30', 'resell', '转卖匹配超时天数'],
    ['resell.timeout_policy', 'auto_refund', 'resell', '超时策略：auto_refund 自动退款 / auto_settle 兜底结算'],
    ['distribution.enabled', '1', 'distribution', '分销总开关：1 开启 0 关闭'],
    ['distribution.level_1', '1', 'distribution', '一级分销开关：1 开启 0 关闭'],
    ['distribution.level_2', '1', 'distribution', '二级分销开关：1 开启 0 关闭'],
    ['distribution.level_3', '1', 'distribution', '三级分销开关：1 开启 0 关闭'],
    ['payment.mode', 'mock', 'payment', '支付模式：mock 模拟 / real 真实网关'],
    ['payment.mock_auto_success', '1', 'payment', '模拟支付是否自动成功：1 是 / 0 否'],
    ['payment.wechat.enabled', '0', 'payment', '微信支付启用状态：1 启用 / 0 关闭'],
    ['payment.wechat.app_id', '', 'payment', '微信支付 AppID'],
    ['payment.wechat.mch_id', '', 'payment', '微信支付商户号'],
    ['payment.wechat.api_v3_key', '', 'payment', '微信支付 APIv3 密钥'],
    ['payment.wechat.cert_serial_no', '', 'payment', '微信支付证书序列号'],
    ['payment.wechat.notify_url', '', 'payment', '微信支付回调地址'],
    ['payment.alipay.enabled', '0', 'payment', '支付宝启用状态：1 启用 / 0 关闭'],
    ['payment.alipay.app_id', '', 'payment', '支付宝 AppID'],
    ['payment.alipay.merchant_private_key', '', 'payment', '支付宝应用私钥'],
    ['payment.alipay.alipay_public_key', '', 'payment', '支付宝公钥'],
    ['payment.alipay.gateway', 'https://openapi.alipay.com/gateway.do', 'payment', '支付宝网关地址'],
    ['payment.alipay.notify_url', '', 'payment', '支付宝回调地址'],
  ]
  for (const c of syscfg) {
    run('INSERT OR IGNORE INTO system_config (config_key, config_value, config_group, description, update_time) VALUES (?, ?, ?, ?, ?)', c[0], c[1], c[2], c[3], now())
  }

  // ===== 帮助文档 =====
  const helps: [string, string, string, number][] = [
    ['订单支付与发货', 'order', '下单支付后订单进入「待发货」状态，商家会在 48 小时内安排发货；发货后可在订单列表查看物流单号并追踪。确认收货后订单完成。', 1],
    ['会员价与折扣说明', 'member', '代理商等级对应商城折扣：银卡 9 折、金卡 8 折、铂金 7 折、钻石 6 折。下单时按当前等级自动计算会员价，入会礼包与月度领货商品不参与折扣。', 2],
    ['大礼包入会流程', 'join', '在入会专区选择对应等级的入会礼包并完成支付，等级权益即时生效，同时自动获得当月领货额度。', 3],
    ['佣金结算与提现', 'commission', '好友通过你的邀请码注册并购买礼包后，系统按分销层级计算佣金；订单确认收货后佣金进入可提现余额，可在钱包申请提现。', 4],
    ['售后与退款规则', 'aftersale', '未发货订单可在订单列表申请取消；已发货订单支持 7 天无理由退货，退款将在审核通过后原路退回。', 5],
    ['分享你的专属推广链接', 'promote', '在推广中心复制你的专属推广链接或保存海报，发送给好友。好友通过链接注册后，将自动成为你的下级会员。', 6],
    ['好友注册并购买大礼包', 'promote', '好友通过你的链接注册后，在入会专区选购任意等级的大礼包并完成支付，即可成为代理商并为你产生佣金。', 7],
    ['佣金自动结算到账', 'promote', '好友确认收货后 7 天，对应层级的分享佣金自动结算进入你的可提现余额，可在佣金明细中查看并申请提现。', 8],
  ]
  for (const h of helps) {
    run('INSERT OR IGNORE INTO help_article (title, category, content, sort, status, create_time, update_time) VALUES (?, ?, ?, ?, 1, ?, ?)', h[0], h[1], h[2], h[3], now(), now())
  }

  markSeed('seed.done')
  console.log('[seed] 种子数据初始化完成')
}

// 支持直接运行：pnpm seed
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
