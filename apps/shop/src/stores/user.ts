import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  MemberLevel, MemberStatus, type Member,
  mockMembers, mockWallets,
} from '@shop-os/shared'

export const useUserStore = defineStore('user', () => {
  // 当前用户 - 模拟已登录的金卡会员
  const members = ref<Member[]>(mockMembers.map(item => ({ ...item })))
  const member = ref<Member | null>(mockMembers[0])
  const validInviteCodes = computed(() => members.value.map(m => m.inviteCode))

  const isLoggedIn = computed(() => !!member.value)
  const isAgent = computed(() => !!member.value && member.value.level !== MemberLevel.Normal)
  const level = computed(() => member.value?.level ?? MemberLevel.Normal)
  const wallet = computed(() => member.value ? mockWallets.find(w => w.memberId === member.value!.id) : null)

  // 会员折扣率
  const shopDiscount = computed(() => {
    switch (level.value) {
      case MemberLevel.Gold: return 80
      case MemberLevel.Silver: return 90
      default: return 100
    }
  })

  // 月度领货额度
  const monthlyCredit = computed(() => {
    switch (level.value) {
      case MemberLevel.Gold: return 980
      case MemberLevel.Silver: return 580
      default: return 0
    }
  })

  const login = (phone: string) => {
    const matched = members.value.find(m => m.phone === phone)
    if (!matched) {
      throw new Error('账号不存在，请先使用邀请码注册')
    }
    member.value = matched
  }

  const register = (payload: { phone: string; nickname: string; inviteCode: string }) => {
    if (members.value.some(m => m.phone === payload.phone)) {
      throw new Error('该手机号已注册，请直接登录')
    }
    if (!validInviteCodes.value.includes(payload.inviteCode)) {
      throw new Error('邀请码无效，请确认后重新输入')
    }

    const inviter = members.value.find(m => m.inviteCode === payload.inviteCode)
    const nextMember: Member = {
      id: Date.now(),
      phone: payload.phone,
      nickname: payload.nickname || `会员${payload.phone.slice(-4)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.phone}`,
      level: MemberLevel.Normal,
      inviterId: inviter?.id ?? null,
      secondInviterId: inviter?.inviterId ?? null,
      thirdInviterId: inviter?.secondInviterId ?? null,
      inviteCode: `NOR${payload.phone.slice(-3)}`,
      status: MemberStatus.Active,
      realName: '',
      registerTime: new Date().toISOString(),
      becomeAgentTime: null,
      levelExpireTime: null,
    }
    members.value.push(nextMember)
    member.value = nextMember
  }

  const logout = () => {
    member.value = null
  }

  const upgradeToAgent = (nextLevel: MemberLevel.Silver | MemberLevel.Gold) => {
    if (!member.value) {
      throw new Error('请先登录后再开通代理商权益')
    }
    member.value.level = nextLevel
    member.value.becomeAgentTime = new Date().toISOString()
    member.value.levelExpireTime = null
  }

  return {
    member,
    isLoggedIn,
    isAgent,
    level,
    wallet,
    shopDiscount,
    monthlyCredit,
    validInviteCodes,
    login,
    register,
    logout,
    upgradeToAgent,
  }
})
