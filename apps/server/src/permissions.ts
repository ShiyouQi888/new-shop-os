// ===== 后台权限点清单（菜单/操作两级） =====
export interface PermissionItem {
  code: string
  name: string
  group: string   // 所属模块分组
  desc?: string
}

export const PERMISSIONS: PermissionItem[] = [
  // 仪表盘
  { code: 'dashboard:view', name: '查看仪表盘', group: '仪表盘' },
  // 商城
  { code: 'product:view', name: '查看商品', group: '商城管理' },
  { code: 'product:edit', name: '编辑商品', group: '商城管理', desc: '新增/编辑/上下架/删除商品' },
  { code: 'category:edit', name: '管理分类', group: '商城管理' },
  { code: 'gift:edit', name: '管理礼包', group: '商城管理' },
  // 订单
  { code: 'order:view', name: '查看订单', group: '订单管理' },
  { code: 'order:ship', name: '发货/确认', group: '订单管理', desc: '单发/批量发货、退款审核' },
  // 会员
  { code: 'member:view', name: '查看会员', group: '会员管理' },
  { code: 'member:edit', name: '管理会员', group: '会员管理', desc: '新增/冻结/额度调整' },
  // 分销
  { code: 'relation:view', name: '查看分销关系', group: '分销管理' },
  { code: 'poster:config', name: '管理推广海报', group: '分销管理', desc: '上传/启用/固定分销海报' },
  { code: 'commission:view', name: '查看佣金', group: '分销管理' },
  { code: 'commission:config', name: '配置佣金规则', group: '分销管理' },
  { code: 'withdraw:view', name: '查看提现', group: '分销管理' },
  { code: 'withdraw:audit', name: '审核/打款', group: '分销管理' },
  // 权益
  { code: 'benefit:config', name: '权益规则配置', group: '权益配置', desc: '等级/领货/转卖/全局参数' },
  // 领货
  { code: 'credit:view', name: '查看领货', group: '领货管理' },
  { code: 'credit:adjust', name: '调整额度', group: '领货管理' },
  // 转卖
  { code: 'resell:view', name: '查看转卖', group: '转卖管理' },
  { code: 'resell:match', name: '匹配/取消转卖', group: '转卖管理' },
  // 客服
  { code: 'workorder:view', name: '查看工单', group: '客服工单' },
  { code: 'workorder:handle', name: '处理工单', group: '客服工单' },
  // 财务
  { code: 'finance:view', name: '查看财务', group: '财务管理' },
  // 系统
  { code: 'system:admin', name: '管理员/角色管理', group: '系统设置' },
  { code: 'system:log', name: '查看日志', group: '系统设置' },
  { code: 'system:file', name: '文件管理', group: '系统设置' },
]

/** 按分组归类（供前端权限树渲染） */
export const PERMISSION_GROUPS = PERMISSIONS.reduce<Record<string, PermissionItem[]>>((acc, p) => {
  ;(acc[p.group] = acc[p.group] || []).push(p)
  return acc
}, {})

/** 内置角色默认权限 */
export const BUILTIN_ROLES: { code: string; name: string; description: string; permissions: string[] }[] = [
  {
    code: 'super_admin',
    name: '超级管理员',
    description: '拥有全部权限，不可删除、不可禁用',
    permissions: PERMISSIONS.map(p => p.code),
  },
  {
    code: 'ops',
    name: '运营',
    description: '负责商城、订单、会员、权益等日常运营',
    permissions: [
      'dashboard:view', 'product:view', 'product:edit', 'category:edit', 'gift:edit',
      'order:view', 'order:ship', 'member:view', 'member:edit',
      'benefit:config', 'credit:view', 'credit:adjust', 'resell:view', 'resell:match',
      'relation:view', 'poster:config', 'workorder:view', 'workorder:handle',
      'system:log', 'system:file',
    ],
  },
  {
    code: 'finance',
    name: '财务',
    description: '负责佣金、提现、财务资金',
    permissions: [
      'dashboard:view', 'commission:view', 'withdraw:view', 'withdraw:audit',
      'relation:view', 'credit:view', 'finance:view', 'system:log',
    ],
  },
  {
    code: 'customer_service',
    name: '客服',
    description: '处理订单、售后与会员咨询',
    permissions: ['dashboard:view', 'order:view', 'order:ship', 'member:view', 'credit:view', 'workorder:view', 'workorder:handle'],
  },
]
