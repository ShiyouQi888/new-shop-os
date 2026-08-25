import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MemberLevel, type Member, type MemberWallet } from '@shop-os/shared'
import { api, MEMBER_TOKEN_KEY } from '@/api'

const STORAGE_KEY = 'shop_os_member'

function toMember(row: Record<string, unknown>): Member {
  return {
    id: Number(row.id),
    phone: String(row.phone || ''),
    nickname: String(row.nickname || ''),
    avatar: String(row.avatar || ''),
    level: Number(row.level ?? 0),
    inviterId: row.inviterId !== null && row.inviterId !== undefined ? Number(row.inviterId) : null,
    secondInviterId: row.secondInviterId !== null && row.secondInviterId !== undefined ? Number(row.secondInviterId) : null,
    thirdInviterId: row.thirdInviterId !== null && row.thirdInviterId !== undefined ? Number(row.thirdInviterId) : null,
    inviteCode: String(row.inviteCode || ''),
    status: Number(row.status ?? 1),
    realName: String(row.realName || ''),
    registerTime: String(row.registerTime || ''),
    becomeAgentTime: row.becomeAgentTime ? String(row.becomeAgentTime) : null,
    levelExpireTime: row.levelExpireTime ? String(row.levelExpireTime) : null,
  }
}

function loadStoredMember(): Member | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Member) : null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  // 当前登录会员（localStorage 持久化）
  const member = ref<Member | null>(loadStoredMember())
  // 会员聚合信息缓存（钱包/折扣/月度额度）
  const meData = ref<{
    wallet: MemberWallet | null
    shopDiscount: number
    monthlyCredit: number
  } | null>(null)

  const isLoggedIn = computed(() => !!member.value)
  const isAgent = computed(() => !!member.value && member.value.level !== MemberLevel.Normal)
  const level = computed(() => member.value?.level ?? MemberLevel.Normal)

  const wallet = computed<MemberWallet | null>(() => meData.value?.wallet ?? null)
  const shopDiscount = computed(() => {
    if (meData.value) return meData.value.shopDiscount
    // 兜底：按等级默认（与后端 level_config 一致）
    const fallback: Record<number, number> = { 0: 100, 1: 90, 2: 80, 3: 70, 4: 60, 5: 55 }
    return fallback[level.value] ?? 100
  })
  const monthlyCredit = computed(() => meData.value?.monthlyCredit ?? 0)

  /** 拉取会员聚合信息（钱包/折扣/额度；折扣以后端等级配置为准） */
  const refreshMe = async () => {
    if (!member.value) { meData.value = null; return }
    try {
      const stats = await api.getAgentStats(member.value)
      member.value = stats.member
      meData.value = {
        wallet: stats.wallet,
        shopDiscount: stats.shopDiscount ?? 100,
        monthlyCredit: stats.monthlyCredit ? Number((stats.monthlyCredit as { creditAmount?: number }).creditAmount ?? 0) : 0,
      }
    } catch {
      /* 网络异常时保留缓存 */
    }
  }

  const persist = () => {
    if (member.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(member.value))
    else localStorage.removeItem(STORAGE_KEY)
  }

  const login = async (phone: string, password: string) => {
    const row = await api.login(phone, password)
    const token = String(row.token || '')
    if (token) localStorage.setItem(MEMBER_TOKEN_KEY, token)
    member.value = toMember(row)
    persist()
    await refreshMe()
  }

  const register = async (payload: { phone: string; password: string; nickname: string; inviteCode: string }) => {
    const row = await api.register(payload)
    const token = String(row.token || '')
    if (token) localStorage.setItem(MEMBER_TOKEN_KEY, token)
    member.value = toMember(row)
    persist()
    await refreshMe()
  }

  const logout = () => {
    member.value = null
    meData.value = null
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(MEMBER_TOKEN_KEY)
  }

  const upgradeToAgent = async (nextLevel: number) => {
    if (!member.value) throw new Error('请先登录后再开通代理商权益')
    await api.upgradeToAgent(nextLevel)
    member.value.level = nextLevel
    member.value.becomeAgentTime = new Date().toISOString()
    persist()
    await refreshMe()
  }

  // 初始化：刷新页面后自动恢复登录态并拉取钱包/折扣/额度
  if (member.value) {
    refreshMe()
  }

  return {
    member,
    isLoggedIn,
    isAgent,
    level,
    wallet,
    shopDiscount,
    monthlyCredit,
    login,
    register,
    logout,
    upgradeToAgent,
    refreshMe,
  }
})
