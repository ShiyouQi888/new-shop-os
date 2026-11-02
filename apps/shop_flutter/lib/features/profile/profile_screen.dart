import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_controller.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';
import 'account_screens.dart';
import '../common/support_screens.dart';
import '../agent/agent_screens.dart';
import '../agent/gift_zone_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.onLogin});
  final Future<void> Function() onLogin;

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    final member = controller.member;
    Future<void> openMemberPage(Widget page) async {
      if (!controller.isSignedIn) {
        await onLogin();
        if (!context.mounted || !context.read<AppController>().isSignedIn)
          return;
      }
      await Navigator.of(context)
          .push<void>(MaterialPageRoute(builder: (_) => page));
    }

    return CustomScrollView(slivers: [
      SliverAppBar(
        pinned: true,
        title: Text('我的', style: Theme.of(context).textTheme.headlineSmall),
        actions: [
          IconButton(
              onPressed: controller.loadCart,
              icon: const Icon(Icons.refresh_rounded))
        ],
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        sliver: SliverList.list(children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [Color(0xFF252B31), Color(0xFF414A53)]),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Row(children: [
              if (member?.avatar.isNotEmpty ?? false)
                CircleAvatar(
                    radius: 27,
                    backgroundImage: NetworkImage(imageUrl(member!.avatar)))
              else
                const CircleAvatar(
                    radius: 27,
                    backgroundColor: ShopTheme.primary,
                    child: Icon(Icons.person_rounded,
                        color: Colors.white, size: 30)),
              const SizedBox(width: 14),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(member?.nickname ?? '欢迎来到橙选',
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(color: Colors.white)),
                    const SizedBox(height: 5),
                    Text(member?.phone ?? '登录后查看会员权益',
                        style: const TextStyle(
                            color: Color(0xFFD4D8DC), fontSize: 13)),
                  ])),
              if (member == null)
                IconButton(
                    onPressed: onLogin,
                    icon: const Icon(Icons.arrow_forward_ios_rounded,
                        color: Colors.white, size: 18)),
            ]),
          ),
          const SizedBox(height: 16),
          if (member == null)
            FilledButton(onPressed: onLogin, child: const Text('登录 / 使用邀请码注册'))
          else
            InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => openMemberPage(const GiftZoneScreen()),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20)),
                  child: Row(children: [
                    const Icon(Icons.workspace_premium_outlined,
                        color: ShopTheme.primaryDark),
                    const SizedBox(width: 10),
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text(
                              member.levelName.isEmpty
                                  ? '普通会员'
                                  : member.levelName,
                              style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 3),
                          Text('会员权益与入会方案',
                              style: Theme.of(context).textTheme.bodySmall),
                        ])),
                    const Icon(Icons.chevron_right_rounded,
                        color: ShopTheme.mutedInk),
                  ]),
                )),
          if (member != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.fromLTRB(15, 14, 15, 10),
              decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(20)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Text('我的订单',
                          style: Theme.of(context).textTheme.titleMedium),
                      const Spacer(),
                      TextButton(
                          onPressed: () => openMemberPage(const OrdersScreen()),
                          child: const Text('全部订单')),
                    ]),
                    Row(children: [
                      for (final entry in const [
                        (Icons.credit_card_outlined, '待付款', 1),
                        (Icons.inventory_2_outlined, '待发货', 2),
                        (Icons.local_shipping_outlined, '待收货', 3),
                        (Icons.task_alt_rounded, '已完成', 4),
                      ])
                        Expanded(
                            child: _OrderShortcut(
                          icon: entry.$1,
                          label: entry.$2,
                          onTap: () => openMemberPage(
                              OrdersScreen(initialStatusTab: entry.$3)),
                        )),
                    ]),
                  ]),
            ),
          ],
          const SizedBox(height: 18),
          _ProfileActionGroup(title: '会员与交易', items: [
            _MenuEntry(Icons.card_giftcard_outlined, '入会专区', '会员方案与权益',
                () => openMemberPage(const GiftZoneScreen())),
            _MenuEntry(Icons.redeem_outlined, '月度领货', '额度兑换商品',
                () => openMemberPage(const MonthlyCreditScreen())),
            _MenuEntry(Icons.receipt_long_outlined, '我的订单', '订单与物流',
                () => openMemberPage(const OrdersScreen())),
            _MenuEntry(Icons.location_on_outlined, '收货地址', '管理常用地址',
                () => openMemberPage(const AddressListScreen())),
          ]),
          const SizedBox(height: 14),
          _ProfileActionGroup(title: '我的记录', items: [
            _MenuEntry(Icons.favorite_border_rounded, '我的收藏', '收藏的商品',
                () => openMemberPage(const FavoritesScreen())),
            _MenuEntry(Icons.history_rounded, '浏览历史', '最近看过的商品',
                () => openMemberPage(const BrowsingHistoryScreen())),
            _MenuEntry(Icons.notifications_none_rounded, '消息通知', '订单与账户消息',
                () => openMemberPage(const NotificationsScreen())),
          ]),
          const SizedBox(height: 14),
          _ProfileActionGroup(title: '客服与规则', items: [
            _MenuEntry(Icons.support_agent_outlined, '客服与帮助', '常见问题解答',
                () => openMemberPage(const HelpScreen())),
            _MenuEntry(Icons.assignment_outlined, '我的工单', '问题处理进度',
                () => openMemberPage(const WorkOrderScreen())),
            _MenuEntry(Icons.description_outlined, '规则中心', '平台交易规则',
                () => openMemberPage(const RulesScreen())),
          ]),
          if ((member?.level ?? 0) > 0) ...[
            const SizedBox(height: 14),
            _AgentServicesCard(
              dashboard: _MenuEntry(
                  Icons.dashboard_outlined,
                  '代理商工作台',
                  '团队、月度领货与推广工具',
                  () => openMemberPage(const AgentDashboardScreen())),
              tools: [
                _MenuEntry(Icons.account_balance_wallet_outlined, '佣金与提现',
                    '结算记录', () => openMemberPage(const CommissionScreen())),
                _MenuEntry(Icons.qr_code_2_rounded, '推广中心', '邀请海报',
                    () => openMemberPage(const PromotionScreen())),
                _MenuEntry(Icons.credit_card_outlined, '提现账号', '银行卡 / 支付宝',
                    () => openMemberPage(const PayoutAccountScreen())),
              ],
            ),
          ],
          if (member != null) ...[
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () async {
                final shouldLogout = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('退出当前账号？'),
                    content: const Text('你可以随时重新登录。'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('取消')),
                      FilledButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('退出登录')),
                    ],
                  ),
                );
                if (shouldLogout == true)
                  await context.read<AppController>().logout();
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('退出登录'),
              style: OutlinedButton.styleFrom(
                foregroundColor: ShopTheme.secondaryInk,
                side: const BorderSide(color: ShopTheme.border),
              ),
            ),
          ],
        ]),
      ),
    ]);
  }
}

class _OrderShortcut extends StatelessWidget {
  const _OrderShortcut(
      {required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(children: [
              Icon(icon, color: ShopTheme.primaryDark, size: 23),
              const SizedBox(height: 6),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ])),
      );
}

class _MenuEntry {
  const _MenuEntry(this.icon, this.title, this.subtitle, this.onTap);
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
}

class _AgentServicesCard extends StatelessWidget {
  const _AgentServicesCard({required this.dashboard, required this.tools});

  final _MenuEntry dashboard;
  final List<_MenuEntry> tools;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text('代理商服务', style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            Text('工作台与经营工具', style: Theme.of(context).textTheme.bodySmall),
          ]),
          const SizedBox(height: 10),
          Material(
            color: ShopTheme.primarySoft.withValues(alpha: .58),
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              onTap: dashboard.onTap,
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                child: Row(children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(dashboard.icon,
                        color: ShopTheme.primaryDark, size: 21),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(dashboard.title,
                            style: Theme.of(context).textTheme.titleSmall),
                        const SizedBox(height: 3),
                        Text(dashboard.subtitle,
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      color: ShopTheme.mutedInk),
                ]),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 11),
            child: Divider(height: 1),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final item in tools)
                Expanded(
                  child: _AgentToolShortcut(item: item),
                ),
            ],
          ),
        ]),
      );
}

class _AgentToolShortcut extends StatelessWidget {
  const _AgentToolShortcut({required this.item});

  final _MenuEntry item;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(3, 2, 3, 4),
          child: Column(children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: ShopTheme.primarySoft,
                borderRadius: BorderRadius.circular(13),
              ),
              child: Icon(item.icon, color: ShopTheme.primaryDark, size: 20),
            ),
            const SizedBox(height: 7),
            Text(
              item.title,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelMedium,
            ),
            const SizedBox(height: 2),
            Text(
              item.subtitle,
              maxLines: 1,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontSize: 10,
                  ),
            ),
          ]),
        ),
      );
}

class _ProfileActionGroup extends StatelessWidget {
  const _ProfileActionGroup({required this.title, required this.items});

  final String title;
  final List<_MenuEntry> items;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.only(left: 2, bottom: 11),
            child: Text(title, style: Theme.of(context).textTheme.titleMedium),
          ),
          LayoutBuilder(builder: (context, constraints) {
            final isTwoColumn = items.length == 4;
            const gap = 8.0;
            final columns = isTwoColumn ? 2 : 3;
            final tileWidth =
                (constraints.maxWidth - gap * (columns - 1)) / columns;
            final tileHeight = isTwoColumn ? 72.0 : 104.0;

            return Wrap(
              spacing: gap,
              runSpacing: gap,
              children: [
                for (final item in items)
                  SizedBox(
                    width: tileWidth,
                    height: tileHeight,
                    child: _ProfileActionTile(
                      item: item,
                      horizontal: isTwoColumn,
                    ),
                  ),
              ],
            );
          }),
        ]),
      );
}

class _ProfileActionTile extends StatelessWidget {
  const _ProfileActionTile({required this.item, required this.horizontal});

  final _MenuEntry item;
  final bool horizontal;

  @override
  Widget build(BuildContext context) => Material(
        color: const Color(0xFFFFF8F5),
        borderRadius: BorderRadius.circular(15),
        child: InkWell(
          onTap: item.onTap,
          borderRadius: BorderRadius.circular(15),
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: horizontal ? 9 : 4,
              vertical: horizontal ? 8 : 9,
            ),
            child: horizontal
                ? Row(children: [
                    _ProfileActionIcon(icon: item.icon, size: 36),
                    const SizedBox(width: 9),
                    Expanded(
                        child: _ProfileActionText(item: item, maxLines: 1)),
                    const Icon(Icons.chevron_right_rounded,
                        color: ShopTheme.mutedInk, size: 19),
                  ])
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                        _ProfileActionIcon(icon: item.icon, size: 36),
                        const SizedBox(height: 6),
                        _ProfileActionText(
                            item: item, maxLines: 1, centered: true),
                        const SizedBox(height: 2),
                        Text(
                          item.subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    fontSize: 10,
                                  ),
                        ),
                      ]),
          ),
        ),
      );
}

class _ProfileActionIcon extends StatelessWidget {
  const _ProfileActionIcon({required this.icon, required this.size});

  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: ShopTheme.primarySoft,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: ShopTheme.primaryDark, size: 19),
      );
}

class _ProfileActionText extends StatelessWidget {
  const _ProfileActionText({
    required this.item,
    required this.maxLines,
    this.centered = false,
  });

  final _MenuEntry item;
  final int maxLines;
  final bool centered;

  @override
  Widget build(BuildContext context) => Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment:
            centered ? CrossAxisAlignment.center : CrossAxisAlignment.start,
        children: [
          Text(
            item.title,
            maxLines: maxLines,
            overflow: TextOverflow.ellipsis,
            textAlign: centered ? TextAlign.center : TextAlign.start,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          if (!centered) ...[
            const SizedBox(height: 2),
            Text(
              item.subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontSize: 10,
                  ),
            ),
          ],
        ],
      );
}
