/**
 * Shop API - Mock
 */
import {
  mockProducts, mockSkus, mockCategories, mockGiftPackages,
  mockCredits, mockResellOrders, mockCommissions,
  mockMembers, mockWallets,
  CommissionStatus, type Member,
} from '@shop-os/shared'

function delay<T>(data: T, ms = 100): Promise<T> {
  return new Promise(r => setTimeout(() => r(data), ms))
}

export const api = {
  // 首页数据
  getHomeData: () => delay({
    banners: [
      { image: 'https://picsum.photos/seed/banner1/750/320', link: '/gift-zone' },
      { image: 'https://picsum.photos/seed/banner2/750/320', link: '' },
      { image: 'https://picsum.photos/seed/banner3/750/320', link: '' },
    ],
    categories: mockCategories.filter(c => c.parentId === 0),
    giftPackages: mockGiftPackages,
    hotProducts: mockProducts.filter(p => !p.isGiftPackage).slice(0, 6),
    newProducts: mockProducts.filter(p => !p.isGiftPackage).slice(0, 4),
  }),

  // 商品
  getProducts: (params: { categoryId?: number; keyword?: string; isGiftPackage?: boolean }) => {
    let list = mockProducts.filter(p => p.status === 1)
    if (params.categoryId) list = list.filter(p => p.categoryId === params.categoryId)
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(kw) || p.brand.toLowerCase().includes(kw))
    }
    if (params.isGiftPackage !== undefined) list = list.filter(p => p.isGiftPackage === params.isGiftPackage)
    return delay(list)
  },
  getProduct: (id: number) => {
    const spu = mockProducts.find(p => p.id === id)
    if (!spu) return delay(null)
    const skus = mockSkus.filter(s => s.spuId === id)
    return delay({ spu, skus })
  },
  getCategories: () => delay(mockCategories),

  // 代理商数据
  getAgentStats: (member: Member = mockMembers[0]) => {
    const commissions = mockCommissions.filter(c => c.memberId === member.id)
    const total = commissions.reduce((sum, c) => sum + c.amount, 0)
    const available = commissions.filter(c => c.status === CommissionStatus.Available).reduce((sum, c) => sum + c.amount, 0)
    const pending = commissions.filter(c => c.status === CommissionStatus.PendingSettle).reduce((sum, c) => sum + c.amount, 0)
    const withdrawn = commissions.filter(c => c.status === CommissionStatus.Withdrawn).reduce((sum, c) => sum + c.amount, 0)
    const level1 = mockMembers.filter(m => m.inviterId === member.id).length
    const level2 = mockMembers.filter(m => m.secondInviterId === member.id).length
    const level3 = mockMembers.filter(m => m.thirdInviterId === member.id).length
    const wallet = mockWallets.find(w => w.memberId === member.id) || {
      id: 0,
      memberId: member.id,
      balance: available,
      frozen: pending,
      totalIncome: total,
      totalWithdraw: withdrawn,
      updateTime: '',
    }

    return delay({
      member,
      wallet,
      monthlyCredit: mockCredits.find(c => c.memberId === member.id),
      commission: { total, available, pending, withdrawn },
      team: { level1, level2, level3, total: level1 + level2 + level3 },
      resellActive: mockResellOrders.filter(r => r.memberId === member.id && r.status < 3).length,
    })
  },
  getMonthlyCredit: (memberId = 1) => delay(mockCredits.filter(c => c.memberId === memberId)),
  getResellOrders: (memberId = 1) => delay(mockResellOrders.filter(r => r.memberId === memberId)),
  getCommissions: (memberId = 1, level?: number) => {
    let list = mockCommissions.filter(c => c.memberId === memberId)
    if (level) list = list.filter(c => c.distributionLevel === level)
    return delay(list)
  },
  getTeam: (memberId: number, level: 1 | 2 | 3) => {
    let teamMembers: typeof mockMembers = []
    if (level === 1) teamMembers = mockMembers.filter(m => m.inviterId === memberId)
    if (level === 2) teamMembers = mockMembers.filter(m => m.secondInviterId === memberId)
    if (level === 3) teamMembers = mockMembers.filter(m => m.thirdInviterId === memberId)
    return delay(teamMembers)
  },
}
