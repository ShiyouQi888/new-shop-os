import 'dart:ui' as ui;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../core/models.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';
import 'credit_redeem_screen.dart';

class AgentDashboardScreen extends StatefulWidget {
  const AgentDashboardScreen({super.key});
  @override
  State<AgentDashboardScreen> createState() => _AgentDashboardScreenState();
}

class _AgentDashboardScreenState extends State<AgentDashboardScreen> {
  late Future<JsonMap> _data;
  Future<JsonMap> _load() => context.read<AppController>().refreshMember();
  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('会员工作台')),
        body: FutureBuilder<JsonMap>(
          future: _data,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => setState(() => _data = _load()));
            final data = snapshot.data!;
            final member = asJsonMap(data['member']);
            final commission = asJsonMap(data['commission']);
            final team = asJsonMap(data['team']);
            final credit = asJsonMap(data['monthlyCredit']);
            final inviteCode = '${member['inviteCode'] ?? ''}';
            final links = <(String, IconData, Widget)>[
              ('月度领货', Icons.redeem_rounded, const MonthlyCreditScreen()),
              ('发起转卖', Icons.swap_horiz_rounded, const ResellCenterScreen()),
              ('推广海报', Icons.qr_code_2_rounded, const PromotionScreen()),
              ('我的团队', Icons.groups_2_outlined, const TeamScreen()),
              (
                '佣金明细',
                Icons.account_balance_wallet_outlined,
                const CommissionScreen()
              ),
              ('提现账号', Icons.credit_card_outlined, const PayoutAccountScreen()),
            ];
            return RefreshIndicator(
              onRefresh: () async => setState(() => _data = _load()),
              child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                          gradient: const LinearGradient(
                              colors: [Color(0xFF20262C), Color(0xFF414A53)]),
                          borderRadius: BorderRadius.circular(23)),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              CircleAvatar(
                                  radius: 25,
                                  backgroundColor: ShopTheme.primary,
                                  child: Text(
                                      _initial('${member['nickname'] ?? ''}'),
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w800))),
                              const SizedBox(width: 12),
                              Expanded(
                                  child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                    Text('${member['nickname'] ?? '会员'}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleLarge
                                            ?.copyWith(color: Colors.white)),
                                    const SizedBox(height: 4),
                                    Text(
                                        '邀请码 $inviteCode · ${member['levelName'] ?? '会员'}',
                                        style: const TextStyle(
                                            color: Colors.white70,
                                            fontSize: 12)),
                                  ])),
                              IconButton(
                                  onPressed: () => Navigator.of(context)
                                      .push<void>(MaterialPageRoute(
                                          builder: (_) =>
                                              const PromotionScreen())),
                                  icon: const Icon(Icons.share_outlined,
                                      color: Colors.white)),
                            ]),
                            const SizedBox(height: 22),
                            const Text('可提现余额',
                                style: TextStyle(
                                    color: Colors.white70, fontSize: 12)),
                            const SizedBox(height: 3),
                            Row(children: [
                              Expanded(
                                  child: Text(
                                      '¥${(double.tryParse('${commission['available']}') ?? 0).toStringAsFixed(2)}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineMedium
                                          ?.copyWith(color: Colors.white))),
                              OutlinedButton(
                                  onPressed: () => Navigator.of(context)
                                      .push<void>(MaterialPageRoute(
                                          builder: (_) =>
                                              const CommissionScreen())),
                                  style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      side: const BorderSide(
                                          color: Colors.white54)),
                                  child: const Text('申请提现')),
                            ]),
                            const SizedBox(height: 16),
                            Row(children: [
                              _DarkPill(
                                  '${(double.tryParse('${member['shopDiscount']}') ?? 100) / 10}折商城'),
                              _DarkPill(
                                  '本月领货 ¥${double.tryParse('${credit['remainAmount']}')?.toStringAsFixed(0) ?? '0'}'),
                              _DarkPill(
                                  '权益周期 ${member['creditMonths'] ?? 0} 个月'),
                            ]),
                          ]),
                    ),
                    const SizedBox(height: 13),
                    Row(children: [
                      _MetricCard('累计佣金',
                          '¥${(double.tryParse('${commission['total']}') ?? 0).toStringAsFixed(0)}'),
                      const SizedBox(width: 10),
                      _MetricCard('本月待领',
                          '¥${(double.tryParse('${credit['remainAmount']}') ?? 0).toStringAsFixed(0)}'),
                    ]),
                    const SizedBox(height: 10),
                    Row(children: [
                      _MetricCard('团队人数', '${team['total'] ?? 0}'),
                      const SizedBox(width: 10),
                      _MetricCard('转卖处理中', '${data['resellActive'] ?? 0}'),
                    ]),
                    const SizedBox(height: 13),
                    _AgentCard(
                      title: '提现账号',
                      eyebrow: 'PAYOUT ACCOUNT',
                      icon: Icons.credit_card_rounded,
                      onTap: () => Navigator.of(context).push<void>(
                          MaterialPageRoute(
                              builder: (_) => const PayoutAccountScreen())),
                      child: Text(
                        '绑定或更新银行卡、支付宝收款信息',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                    const SizedBox(height: 13),
                    _AgentCard(
                      title: '经营工具',
                      eyebrow: 'OPERATIONS',
                      icon: Icons.dashboard_customize_outlined,
                      child: GridView.count(
                        crossAxisCount: 3,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        childAspectRatio: 1.06,
                        children: [
                          for (final entry in links)
                            _AgentTool(
                                entry.$1,
                                entry.$2,
                                () => Navigator.of(context).push<void>(
                                    MaterialPageRoute(
                                        builder: (_) => entry.$3)))
                        ],
                      ),
                    ),
                    const SizedBox(height: 13),
                    Container(
                      padding: const EdgeInsets.all(17),
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(19)),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('待办提醒',
                                style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 12),
                            const _NoticeLine(Icons.schedule_rounded,
                                '月度领货额度请在权益周期内合理安排', Color(0xFFF5A623)),
                            const SizedBox(height: 9),
                            _NoticeLine(
                                Icons.account_balance_wallet_outlined,
                                '有 ¥${(double.tryParse('${commission['available']}') ?? 0).toStringAsFixed(2)} 可提现，请确认收款账号',
                                ShopTheme.success),
                          ]),
                    ),
                  ]),
            );
          },
        ),
      );
}

class _DarkPill extends StatelessWidget {
  const _DarkPill(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Expanded(
          child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 5),
        decoration: BoxDecoration(
            color: Colors.white.withOpacity(.11),
            borderRadius: BorderRadius.circular(20)),
        child: Text(label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w600)),
      ));
}

class _MetricCard extends StatelessWidget {
  const _MetricCard(this.title, this.value);
  final String title;
  final String value;
  @override
  Widget build(BuildContext context) => Expanded(
          child: Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(17)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 5),
          Text(value, style: Theme.of(context).textTheme.titleLarge),
        ]),
      ));
}

class _AgentCard extends StatelessWidget {
  const _AgentCard(
      {required this.title,
      required this.eyebrow,
      required this.icon,
      this.onTap,
      required this.child});
  final String title;
  final String eyebrow;
  final IconData icon;
  final VoidCallback? onTap;
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(17),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(19)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(eyebrow,
                      style: const TextStyle(
                          color: ShopTheme.primaryDark,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: .4)),
                  const SizedBox(height: 4),
                  Text(title, style: Theme.of(context).textTheme.titleLarge),
                ])),
            Icon(icon, color: ShopTheme.primaryDark),
            if (onTap != null)
              IconButton(
                  onPressed: onTap,
                  icon: const Icon(Icons.chevron_right_rounded)),
          ]),
          const SizedBox(height: 12),
          child,
        ]),
      );
}

class _AgentTool extends StatelessWidget {
  const _AgentTool(this.title, this.icon, this.onTap);
  final String title;
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
              width: 43,
              height: 43,
              decoration: BoxDecoration(
                  color: ShopTheme.primarySoft,
                  borderRadius: BorderRadius.circular(15)),
              child: Icon(icon, color: ShopTheme.primaryDark)),
          const SizedBox(height: 6),
          Text(title,
              style: Theme.of(context).textTheme.labelSmall,
              textAlign: TextAlign.center),
        ]),
      );
}

class _NoticeLine extends StatelessWidget {
  const _NoticeLine(this.icon, this.text, this.color);
  final IconData icon;
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) =>
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 17, color: color),
        const SizedBox(width: 8),
        Expanded(
            child: Text(text, style: Theme.of(context).textTheme.bodyMedium)),
      ]);
}

class MonthlyCreditScreen extends StatefulWidget {
  const MonthlyCreditScreen({super.key});
  @override
  State<MonthlyCreditScreen> createState() => _MonthlyCreditScreenState();
}

class _MonthlyCreditScreenState extends State<MonthlyCreditScreen> {
  late Future<List<JsonMap>> _credits;
  Future<List<JsonMap>> _load() async => asList(
          await context.read<AppController>().api.get('/shop/member/credits'))
      .map(asJsonMap)
      .toList();
  @override
  void initState() {
    super.initState();
    _credits = _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('月度领货')),
        body: FutureBuilder<List<JsonMap>>(
          future: _credits,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => setState(() => _credits = _load()));
            final credits = snapshot.data ?? [];
            if (credits.isEmpty)
              return const EmptyPanel(
                  title: '暂无领货额度', subtitle: '购物消费或开通会员后，额度会显示在这里');
            final current = credits.first;
            final amount = double.tryParse('${current['creditAmount']}') ?? 0;
            final used = double.tryParse('${current['usedAmount']}') ?? 0;
            final remain = double.tryParse('${current['remainAmount']}') ?? 0;
            final percent =
                amount <= 0 ? 0.0 : (used / amount).clamp(0, 1).toDouble();
            return ListView(padding: const EdgeInsets.all(16), children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [Color(0xFF20262C), Color(0xFF414A53)]),
                    borderRadius: BorderRadius.circular(22)),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('AVAILABLE CREDIT',
                          style: TextStyle(
                              color: ShopTheme.primary,
                              fontSize: 10,
                              fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Text('¥${remain.toStringAsFixed(2)}',
                          style: Theme.of(context)
                              .textTheme
                              .headlineMedium
                              ?.copyWith(color: Colors.white)),
                      const SizedBox(height: 5),
                      Text('${current['month'] ?? ''} · 剩余可领额度',
                          style: const TextStyle(color: Colors.white70)),
                      const SizedBox(height: 19),
                      ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: LinearProgressIndicator(
                              value: percent,
                              minHeight: 8,
                              color: ShopTheme.primary,
                              backgroundColor: Colors.white24)),
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(
                            child: Text('已使用 ¥${used.toStringAsFixed(2)}',
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 12))),
                        Text('总额度 ¥${amount.toStringAsFixed(2)}',
                            style: const TextStyle(
                                color: Colors.white70, fontSize: 12)),
                      ]),
                      const SizedBox(height: 17),
                      Row(children: [
                        Expanded(
                            child: FilledButton.icon(
                          onPressed: () => Navigator.of(context).push<void>(
                              MaterialPageRoute(
                                  builder: (_) => CreditRedeemScreen(
                                      creditId:
                                          int.tryParse('${current['id']}') ?? 0,
                                      remainAmount: remain))),
                          icon: const Icon(Icons.shopping_bag_outlined),
                          label: const Text('领取商品'),
                        )),
                        if ((double.tryParse(
                                    '${current['resellableAmount']}') ??
                                0) >
                            0) ...[
                          const SizedBox(width: 9),
                          OutlinedButton.icon(
                              onPressed: () => Navigator.of(context).push<void>(
                                  MaterialPageRoute(
                                      builder: (_) =>
                                          const ResellCenterScreen())),
                              style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  side:
                                      const BorderSide(color: Colors.white54)),
                              icon: const Icon(Icons.swap_horiz_rounded),
                              label: const Text('转卖')),
                        ],
                      ]),
                    ]),
              ),
              const SizedBox(height: 14),
              _AgentCard(
                  eyebrow: 'CREDIT CYCLE',
                  title: '领货周期进度',
                  icon: Icons.calendar_month_outlined,
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('已累计 ${credits.length} 个月额度记录',
                            style: Theme.of(context).textTheme.bodyMedium),
                        const SizedBox(height: 10),
                        Wrap(spacing: 7, runSpacing: 7, children: [
                          for (var month = 1; month <= 10; month++)
                            Container(
                              width: 29,
                              height: 29,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                  color: month <= credits.length
                                      ? ShopTheme.success
                                      : ShopTheme.canvas,
                                  shape: BoxShape.circle),
                              child: Text('$month',
                                  style: TextStyle(
                                      color: month <= credits.length
                                          ? Colors.white
                                          : ShopTheme.mutedInk,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700)),
                            )
                        ]),
                      ])),
              const SizedBox(height: 14),
              _AgentCard(
                eyebrow: 'CREDIT HISTORY',
                title: '领货记录',
                icon: Icons.receipt_long_outlined,
                child: Column(children: [
                  for (final credit in credits)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      child: Row(children: [
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text('${credit['month'] ?? ''}',
                                  style:
                                      Theme.of(context).textTheme.titleSmall),
                              Text('状态 ${credit['status'] ?? '-'}',
                                  style: Theme.of(context).textTheme.bodySmall),
                            ])),
                        Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                  '¥${(double.tryParse('${credit['usedAmount']}') ?? 0).toStringAsFixed(2)} / ¥${(double.tryParse('${credit['creditAmount']}') ?? 0).toStringAsFixed(2)}',
                                  style:
                                      Theme.of(context).textTheme.titleSmall),
                              Text(
                                  '剩余 ¥${(double.tryParse('${credit['remainAmount']}') ?? 0).toStringAsFixed(2)}',
                                  style: Theme.of(context).textTheme.bodySmall),
                            ]),
                      ]),
                    )
                ]),
              ),
            ]);
          },
        ),
      );
}

class ResellCenterScreen extends StatefulWidget {
  const ResellCenterScreen({super.key});
  @override
  State<ResellCenterScreen> createState() => _ResellCenterScreenState();
}

class _ResellCenterScreenState extends State<ResellCenterScreen> {
  late Future<({List<JsonMap> credits, List<JsonMap> resells})> _data;
  int _filter = 0;
  final Set<int> _submittingCreditIds = {};

  Future<({List<JsonMap> credits, List<JsonMap> resells})> _load() async {
    final api = context.read<AppController>().api;
    final values = await Future.wait([
      api.get('/shop/member/credits'),
      api.get('/shop/member/resells'),
    ]);
    return (
      credits: asList(values[0]).map(asJsonMap).toList(),
      resells: asList(values[1]).map(asJsonMap).toList(),
    );
  }

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _data = next);
    try {
      await next;
    } on Exception {
      // FutureBuilder displays the failed state and retry action.
    }
  }

  Future<void> _start(JsonMap credit) async {
    final value = double.tryParse('${credit['resellableAmount']}') ?? 0;
    final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
              title: const Text('确认发起转卖'),
              content: Text(
                  '将一次性转卖 ${credit['month'] ?? ''} 的全部可转卖额度 ¥${_formatResellMoney(value)}。提交后额度会锁定，服务费、快递费和最终到账金额由后台当前规则核算。'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('取消')),
                FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('确认转卖'))
              ],
            ));
    if (yes != true) return;
    final creditId = int.tryParse('${credit['id']}');
    if (creditId == null || _submittingCreditIds.contains(creditId)) return;
    setState(() => _submittingCreditIds.add(creditId));
    try {
      await context.read<AppController>().api.post('/shop/member/resells',
          {'creditId': creditId, 'skuName': '月度领货转卖商品'});
      if (mounted) setState(() => _data = _load());
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('转卖申请已提交，等待系统匹配')));
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _submittingCreditIds.remove(creditId));
    }
  }

  Future<void> _showResellDetails(JsonMap item) async {
    final goodsValue = _resellAmount(item['goodsValue']);
    final serviceFee = _resellAmount(item['serviceFee']);
    final shippingFee = _resellAmount(item['shippingFee']);
    final settleAmount = _resellAmount(item['settleAmount']);
    final status = int.tryParse('${item['status']}') ?? -1;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('转卖单详情', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                _ResellDetailRow('转卖额度', '¥${_formatResellMoney(goodsValue)}'),
                _ResellDetailRow('服务费', '-¥${_formatResellMoney(serviceFee)}'),
                _ResellDetailRow('快递费', '-¥${_formatResellMoney(shippingFee)}'),
                const Divider(height: 20),
                _ResellDetailRow(
                    status == 3
                        ? '已到账'
                        : status == 4
                            ? '额度已退回'
                            : '预计到账',
                    status == 4
                        ? '已取消'
                        : '¥${_formatResellMoney(settleAmount)}',
                    emphasized: true),
                const SizedBox(height: 12),
                Text('单号：${item['resellNo'] ?? '—'}',
                    style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 4),
                Text('申请时间：${item['createTime'] ?? '—'}',
                    style: Theme.of(context).textTheme.bodySmall),
                if (item['settleTime'] != null &&
                    '${item['settleTime']}'.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text('结算时间：${item['settleTime']}',
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('转卖中心')),
        body: FutureBuilder<({List<JsonMap> credits, List<JsonMap> resells})>(
          future: _data,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => setState(() => _data = _load()));
            final data = snapshot.data!;
            final eligible = data.credits
                .where(
                  (c) =>
                      _resellAmount(c['resellableAmount']) > 0 &&
                      [0, 1].contains(int.tryParse('${c['status']}') ?? 0),
                )
                .toList();
            final filtered = data.resells.where((item) {
              final status = int.tryParse('${item['status']}') ?? 9;
              return _filter == 0 ||
                  (_filter == 1 ? status >= 0 && status <= 2 : status == 3);
            }).toList();
            final eligibleTotal = eligible.fold<double>(
              0,
              (sum, credit) => sum + _resellAmount(credit['resellableAmount']),
            );
            return RefreshIndicator(
                onRefresh: _refresh,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    _AgentCard(
                        eyebrow: 'RESALE ESTIMATE',
                        title: '可转卖额度',
                        icon: Icons.swap_horiz_rounded,
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (eligible.isEmpty) ...[
                                const Text('当前没有可转卖的礼包额度。消费返还额度仅可用于兑换商品。'),
                                const SizedBox(height: 10),
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: OutlinedButton.icon(
                                    onPressed: () => Navigator.of(context)
                                        .push<void>(MaterialPageRoute(
                                            builder: (_) =>
                                                const MonthlyCreditScreen())),
                                    icon: const Icon(
                                        Icons.card_giftcard_outlined),
                                    label: const Text('查看月度领货额度'),
                                  ),
                                ),
                              ] else ...[
                                Text(
                                    '共 ${eligible.length} 笔可申请 · 合计 ¥${_formatResellMoney(eligibleTotal)}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium),
                                const SizedBox(height: 5),
                                Text('申请后会锁定该笔额度；费率和到账金额按后台实时规则计算。',
                                    style:
                                        Theme.of(context).textTheme.bodySmall),
                                const SizedBox(height: 10),
                                for (final credit in eligible) ...[
                                  Container(
                                    margin: const EdgeInsets.only(top: 8),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                        color: ShopTheme.canvas,
                                        borderRadius:
                                            BorderRadius.circular(14)),
                                    child: Row(children: [
                                      Expanded(
                                          child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                            Text('${credit['month'] ?? '月度额度'}',
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .titleSmall),
                                            const SizedBox(height: 4),
                                            Text(
                                                '可转卖 ¥${_formatResellMoney(_resellAmount(credit['resellableAmount']))}',
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .bodyMedium),
                                          ])),
                                      const SizedBox(width: 8),
                                      Builder(builder: (context) {
                                        final creditId =
                                            int.tryParse('${credit['id']}');
                                        final submitting = creditId != null &&
                                            _submittingCreditIds
                                                .contains(creditId);
                                        return FilledButton(
                                          onPressed:
                                              creditId == null || submitting
                                                  ? null
                                                  : () => _start(credit),
                                          child: Text(
                                              submitting ? '提交中…' : '申请转卖'),
                                        );
                                      }),
                                    ]),
                                  ),
                                ],
                              ],
                            ])),
                    const SizedBox(height: 12),
                    _AgentCard(
                        eyebrow: 'RESALE POLICY',
                        title: '转卖规则',
                        icon: Icons.rule_folder_outlined,
                        child: const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('• 仅礼包产生的可转卖额度支持转卖'),
                              SizedBox(height: 5),
                              Text('• 每笔申请一次性转卖该额度，不支持部分转卖'),
                              SizedBox(height: 5),
                              Text('• 服务费、快递费与结算金额以服务端配置为准'),
                              SizedBox(height: 5),
                              Text('• 提交后可在记录中跟进匹配和结算状态'),
                            ])),
                    const SizedBox(height: 12),
                    _AgentCard(
                        eyebrow: 'RESALE RECORDS',
                        title: '转卖记录',
                        icon: Icons.receipt_long_outlined,
                        child: Column(children: [
                          SegmentedButton<int>(
                            segments: const [
                              ButtonSegment(value: 0, label: Text('全部')),
                              ButtonSegment(value: 1, label: Text('处理中')),
                              ButtonSegment(value: 2, label: Text('已完成'))
                            ],
                            selected: {_filter},
                            onSelectionChanged: (value) =>
                                setState(() => _filter = value.first),
                          ),
                          const SizedBox(height: 12),
                          if (filtered.isEmpty)
                            const EmptyPanel(
                                title: '暂无转卖记录',
                                subtitle: '申请提交后，可在这里跟踪匹配和到账进度')
                          else
                            for (final item in filtered)
                              _ResellRecordTile(
                                item: item,
                                onTap: () => _showResellDetails(item),
                              ),
                        ])),
                  ],
                ));
          },
        ),
      );
}

double _resellAmount(dynamic value) => double.tryParse('$value') ?? 0;

String _formatResellMoney(double value) {
  final fixed = value.abs().toStringAsFixed(2).split('.');
  final grouped = fixed.first.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  return '${value < 0 ? '-' : ''}$grouped.${fixed.last}';
}

String _resellStatus(int status) => switch (status) {
      0 => '待匹配',
      1 => '匹配中',
      2 => '已匹配',
      3 => '已完成',
      4 => '已取消',
      _ => '处理中'
    };

class _ResellRecordTile extends StatelessWidget {
  const _ResellRecordTile({required this.item, required this.onTap});
  final JsonMap item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = int.tryParse('${item['status']}') ?? -1;
    final amount = _resellAmount(item['settleAmount']);
    final statusColor = status == 3
        ? ShopTheme.success
        : status == 4
            ? ShopTheme.mutedInk
            : ShopTheme.primaryDark;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Material(
        color: ShopTheme.canvas,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('${item['skuName'] ?? '月度领货转卖商品'}',
                        style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 4),
                    Text('${item['resellNo'] ?? ''}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 3),
                    Text('${item['createTime'] ?? ''}',
                        style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 7),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: .10),
                          borderRadius: BorderRadius.circular(20)),
                      child: Text(_resellStatus(status),
                          style: TextStyle(
                              color: statusColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w700)),
                    ),
                  ])),
              const SizedBox(width: 10),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(
                    status == 3
                        ? '已到账'
                        : status == 4
                            ? '额度已退回'
                            : '预计到账',
                    style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 4),
                Text(status == 4 ? '已取消' : '¥${_formatResellMoney(amount)}',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.w800,
                        fontSize: 15)),
                const SizedBox(height: 5),
                const Icon(Icons.chevron_right_rounded,
                    color: ShopTheme.mutedInk, size: 19),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}

class _ResellDetailRow extends StatelessWidget {
  const _ResellDetailRow(this.label, this.value, {this.emphasized = false});
  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: [
          Text(label,
              style: emphasized
                  ? Theme.of(context).textTheme.titleSmall
                  : Theme.of(context).textTheme.bodyMedium),
          const Spacer(),
          Text(value,
              style: emphasized
                  ? Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(color: ShopTheme.primaryDark)
                  : Theme.of(context).textTheme.bodyMedium),
        ]),
      );
}

class CommissionScreen extends StatefulWidget {
  const CommissionScreen({super.key});
  @override
  State<CommissionScreen> createState() => _CommissionScreenState();
}

class _CommissionScreenState extends State<CommissionScreen> {
  late Future<
      ({
        JsonMap summary,
        List<JsonMap> records,
        List<JsonMap> withdrawals,
        JsonMap account,
        List<int> levels
      })> _data;
  int _filter = 0;
  Future<
      ({
        JsonMap summary,
        List<JsonMap> records,
        List<JsonMap> withdrawals,
        JsonMap account,
        List<int> levels
      })> _load() async {
    final api = context.read<AppController>().api;
    final result = await Future.wait([
      api.get('/shop/member/me'),
      api.get('/shop/member/commissions'),
      api.get('/shop/member/withdraws'),
      api.get('/shop/member/payout-account'),
      api.get('/shop/distribution-config'),
    ]);
    final stats = asJsonMap(result[0]);
    final dist = asJsonMap(result[4]);
    final levels = asList(dist['activeLevels'])
        .map((item) => int.tryParse('$item') ?? 0)
        .where((n) => n > 0)
        .toList();
    return (
      summary: asJsonMap(stats['commission']),
      records: asList(result[1]).map(asJsonMap).toList(),
      withdrawals: asList(result[2]).map(asJsonMap).toList(),
      account: asJsonMap(result[3]),
      levels: levels,
    );
  }

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  Future<void> _withdraw(JsonMap account, double balance) async {
    final hasBank = '${account['bankCard'] ?? ''}'.trim().isNotEmpty;
    final hasAlipay = '${account['alipayAccount'] ?? ''}'.trim().isNotEmpty;
    if (!hasBank && !hasAlipay) {
      await Navigator.of(context).push<void>(
          MaterialPageRoute(builder: (_) => const PayoutAccountScreen()));
      if (mounted) setState(() => _data = _load());
      return;
    }
    final amount = TextEditingController();
    var payType = hasBank ? 0 : 1;
    final form = GlobalKey<FormState>();
    final bankName = '${account['bankName'] ?? '银行卡'}'.trim();
    final bankCard = '${account['bankCard'] ?? ''}'.trim();
    final alipayAccount = '${account['alipayAccount'] ?? ''}'.trim();
    String maskAccount(String value) {
      if (value.length <= 4) return value;
      if (value.contains('@')) {
        final parts = value.split('@');
        return '${parts.first.substring(0, 1)}***@${parts.last}';
      }
      if (RegExp(r'^1\d{10}$').hasMatch(value)) {
        return '${value.substring(0, 3)}****${value.substring(value.length - 4)}';
      }
      return '尾号 ${value.substring(value.length - 4)}';
    }

    final approved = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
              builder: (context, setDialogState) => Dialog(
                backgroundColor: Colors.white,
                surfaceTintColor: Colors.transparent,
                insetPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24)),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Form(
                    key: form,
                    child: SingleChildScrollView(
                      padding: EdgeInsets.fromLTRB(20, 18, 20,
                          20 + MediaQuery.viewInsetsOf(context).bottom),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: ShopTheme.primarySoft,
                                borderRadius: BorderRadius.circular(15),
                              ),
                              child: const Icon(Icons.payments_outlined,
                                  color: ShopTheme.primaryDark),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('申请提现',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleLarge),
                                  const SizedBox(height: 2),
                                  Text('确认金额与到账方式',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall),
                                ],
                              ),
                            ),
                            IconButton(
                              visualDensity: VisualDensity.compact,
                              onPressed: () =>
                                  Navigator.pop(dialogContext, false),
                              icon: const Icon(Icons.close_rounded),
                              color: ShopTheme.mutedInk,
                            ),
                          ]),
                          const SizedBox(height: 17),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.fromLTRB(16, 13, 13, 13),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF5F0),
                              borderRadius: BorderRadius.circular(17),
                              border:
                                  Border.all(color: const Color(0xFFFFE3D8)),
                            ),
                            child: Row(children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('可提现余额',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall),
                                    const SizedBox(height: 4),
                                    Text(
                                      '¥${balance.toStringAsFixed(2)}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineSmall
                                          ?.copyWith(fontSize: 25),
                                    ),
                                  ],
                                ),
                              ),
                              TextButton(
                                onPressed: () {
                                  amount.text = balance.toStringAsFixed(2);
                                  amount.selection = TextSelection.collapsed(
                                      offset: amount.text.length);
                                  setDialogState(() {});
                                },
                                child: const Text('全部提现'),
                              ),
                            ]),
                          ),
                          const SizedBox(height: 17),
                          Text('提现金额',
                              style: Theme.of(context).textTheme.titleSmall),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: amount,
                            keyboardType: const TextInputType.numberWithOptions(
                                decimal: true),
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontSize: 21),
                            decoration: InputDecoration(
                              hintText: '输入提现金额',
                              prefixText: '¥ ',
                              prefixStyle: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(color: ShopTheme.secondaryInk),
                              filled: true,
                              fillColor: ShopTheme.canvas,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 15, vertical: 15),
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(15),
                                  borderSide: BorderSide.none),
                              enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(15),
                                  borderSide: const BorderSide(
                                      color: ShopTheme.border)),
                              focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(15),
                                  borderSide: const BorderSide(
                                      color: ShopTheme.primary, width: 1.4)),
                              errorMaxLines: 2,
                            ),
                            validator: (value) {
                              final number = double.tryParse(value ?? '');
                              if (number == null || number <= 0)
                                return '请输入有效金额';
                              if (number > balance) return '不能超过可提现余额';
                              return null;
                            },
                          ),
                          const SizedBox(height: 18),
                          Row(children: [
                            Text('到账方式',
                                style: Theme.of(context).textTheme.titleSmall),
                            const Spacer(),
                            Text('选择收款账户',
                                style: Theme.of(context).textTheme.bodySmall),
                          ]),
                          const SizedBox(height: 9),
                          Row(children: [
                            if (hasBank)
                              Expanded(
                                child: _WithdrawalMethodCard(
                                  selected: payType == 0,
                                  icon: Icons.credit_card_rounded,
                                  title: bankName.isEmpty ? '银行卡' : bankName,
                                  subtitle: maskAccount(bankCard),
                                  onTap: () =>
                                      setDialogState(() => payType = 0),
                                ),
                              ),
                            if (hasBank && hasAlipay) const SizedBox(width: 9),
                            if (hasAlipay)
                              Expanded(
                                child: _WithdrawalMethodCard(
                                  selected: payType == 1,
                                  icon: Icons.account_balance_wallet_outlined,
                                  title: '支付宝',
                                  subtitle: maskAccount(alipayAccount),
                                  onTap: () =>
                                      setDialogState(() => payType = 1),
                                ),
                              ),
                          ]),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(11),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF7F8FA),
                              borderRadius: BorderRadius.circular(13),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.info_outline_rounded,
                                    size: 17, color: ShopTheme.mutedInk),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '最低提现金额、手续费及最终到账金额，以后台财务规则和审核结果为准。',
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 17),
                          Row(children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () =>
                                    Navigator.pop(dialogContext, false),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: ShopTheme.secondaryInk,
                                  side:
                                      const BorderSide(color: ShopTheme.border),
                                ),
                                child: const Text('取消'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              flex: 2,
                              child: FilledButton.icon(
                                onPressed: () {
                                  if (form.currentState!.validate()) {
                                    Navigator.pop(dialogContext, true);
                                  }
                                },
                                icon: const Icon(Icons.lock_outline_rounded,
                                    size: 17),
                                label: const Text('提交申请'),
                              ),
                            ),
                          ]),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ));
    if (approved != true) {
      amount.dispose();
      return;
    }
    try {
      await context.read<AppController>().api.post('/shop/member/withdraws', {
        'amount': double.parse(amount.text),
        'payType': payType,
      });
      if (mounted) {
        setState(() => _data = _load());
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('提现申请已提交，等待审核')));
      }
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    }
    amount.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('我的佣金')),
        body: FutureBuilder<
            ({
              JsonMap summary,
              List<JsonMap> records,
              List<JsonMap> withdrawals,
              JsonMap account,
              List<int> levels
            })>(
          future: _data,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => setState(() => _data = _load()));
            final data = snapshot.data!;
            final summary = data.summary;
            final available = double.tryParse('${summary['available']}') ?? 0;
            final hasPayoutAccount =
                '${data.account['bankCard'] ?? ''}'.trim().isNotEmpty ||
                    '${data.account['alipayAccount'] ?? ''}'.trim().isNotEmpty;
            final records = data.records
                .where((item) =>
                    _filter == 0 ||
                    int.tryParse('${item['distributionLevel']}') == _filter)
                .toList();
            return ListView(padding: const EdgeInsets.all(16), children: [
              Container(
                padding: const EdgeInsets.all(19),
                decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [Color(0xFF20262C), Color(0xFF414A53)]),
                    borderRadius: BorderRadius.circular(21)),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              const Text('AVAILABLE COMMISSION',
                                  style: TextStyle(
                                      color: ShopTheme.primary,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800)),
                              const SizedBox(height: 5),
                              Text('¥${available.toStringAsFixed(2)}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .headlineMedium
                                      ?.copyWith(color: Colors.white)),
                            ])),
                        FilledButton.tonal(
                            onPressed: !hasPayoutAccount || available > 0
                                ? () => _withdraw(data.account, available)
                                : null,
                            style: FilledButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: ShopTheme.ink),
                            child: Text(hasPayoutAccount ? '申请提现' : '绑定账号')),
                      ]),
                      const SizedBox(height: 18),
                      Row(children: [
                        _DarkPill(
                            '累计 ¥${(double.tryParse('${summary['total']}') ?? 0).toStringAsFixed(0)}'),
                        _DarkPill(
                            '待结算 ¥${(double.tryParse('${summary['pending']}') ?? 0).toStringAsFixed(0)}'),
                        _DarkPill(
                            '已提现 ¥${(double.tryParse('${summary['withdrawn']}') ?? 0).toStringAsFixed(0)}'),
                      ]),
                    ]),
              ),
              const SizedBox(height: 13),
              _AgentCard(
                  eyebrow: 'COMMISSION DETAILS',
                  title: '佣金明细',
                  icon: Icons.receipt_long_outlined,
                  child: Column(children: [
                    SegmentedButton<int>(
                      segments: [
                        const ButtonSegment(value: 0, label: Text('全部')),
                        for (final level in data.levels)
                          ButtonSegment(
                              value: level,
                              label: Text('${_levelName(level)}级'))
                      ],
                      selected: {_filter},
                      onSelectionChanged: (selection) =>
                          setState(() => _filter = selection.first),
                    ),
                    const SizedBox(height: 10),
                    if (records.isEmpty)
                      const EmptyPanel(title: '暂无佣金记录', subtitle: '佣金结算后会显示在这里')
                    else
                      for (final item in records)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                              backgroundColor: ShopTheme.primarySoft,
                              child: Text(
                                  '${item['distributionLevel'] ?? '-'}级',
                                  style: const TextStyle(
                                      color: ShopTheme.primaryDark,
                                      fontSize: 11))),
                          title: Text(
                              '+¥${(double.tryParse('${item['amount']}') ?? 0).toStringAsFixed(2)}',
                              style: const TextStyle(
                                  color: ShopTheme.primaryDark,
                                  fontWeight: FontWeight.w800)),
                          subtitle: Text(
                              '${item['rate'] ?? 0}% · ${item['createTime'] ?? ''}'),
                          trailing: Text(
                              _commissionStatus(
                                  int.tryParse('${item['status']}') ?? -1),
                              style: Theme.of(context).textTheme.bodySmall),
                        ),
                  ])),
              const SizedBox(height: 13),
              _AgentCard(
                eyebrow: 'PAYOUT HISTORY',
                title: '提现记录',
                icon: Icons.payments_outlined,
                child: data.withdrawals.isEmpty
                    ? const EmptyPanel(
                        title: '暂无提现记录', subtitle: '提交提现后可在这里跟踪状态')
                    : Column(children: [
                        for (final item in data.withdrawals)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                                '申请 ¥${(double.tryParse('${item['amount']}') ?? 0).toStringAsFixed(2)}'),
                            subtitle: Text(
                                '${item['withdrawNo'] ?? ''} · ${item['createTime'] ?? ''}'),
                            trailing: Text(_withdrawStatus(
                                int.tryParse('${item['status']}') ?? -1)),
                          )
                      ]),
              ),
            ]);
          },
        ),
      );
}

String _levelName(int level) =>
    switch (level) { 1 => '一', 2 => '二', 3 => '三', _ => '$level' };
String _commissionStatus(int status) => switch (status) {
      0 => '待结算',
      1 => '可提现',
      2 => '已提现',
      3 => '冻结',
      4 => '已冲销',
      _ => '处理中'
    };
String _withdrawStatus(int status) => switch (status) {
      0 => '审核中',
      1 => '已打款',
      2 => '已驳回',
      3 => '已取消',
      _ => '处理中'
    };

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});
  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  late Future<({JsonMap data, JsonMap config})> _summary;
  Future<({JsonMap data, JsonMap config})> _load() async {
    final api = context.read<AppController>().api;
    final result = await Future.wait(
        [api.get('/shop/member/me'), api.get('/shop/distribution-config')]);
    return (data: asJsonMap(result[0]), config: asJsonMap(result[1]));
  }

  @override
  void initState() {
    super.initState();
    _summary = _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('我的团队')),
        body: FutureBuilder<({JsonMap data, JsonMap config})>(
          future: _summary,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => setState(() => _summary = _load()));
            final data = snapshot.data!;
            final team = asJsonMap(data.data['team']);
            final enabled =
                data.config['enabled'] == true || data.config['enabled'] == 1;
            final levels = asList(data.config['activeLevels'])
                .map((item) => int.tryParse('$item') ?? 0)
                .where((level) => level > 0)
                .toList();
            if (!enabled)
              return const EmptyPanel(
                  title: '推广功能已暂停', subtitle: '分销功能开启后可查看团队数据');
            return DefaultTabController(
              length: levels.length.clamp(1, 3).toInt(),
              child: Column(children: [
                Padding(
                    padding: const EdgeInsets.all(14),
                    child: LayoutBuilder(
                        builder: (context, constraints) => Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                _TeamMetricCard(
                                    '一级人数',
                                    '${team['level1'] ?? 0}',
                                    (constraints.maxWidth - 8) / 2),
                                _TeamMetricCard(
                                    '二级人数',
                                    '${team['level2'] ?? 0}',
                                    (constraints.maxWidth - 8) / 2),
                                _TeamMetricCard(
                                    '三级人数',
                                    '${team['level3'] ?? 0}',
                                    (constraints.maxWidth - 8) / 2),
                                _TeamMetricCard('团队总数', '${team['total'] ?? 0}',
                                    (constraints.maxWidth - 8) / 2),
                              ],
                            ))),
                if (levels.isNotEmpty)
                  TabBar(isScrollable: true, tabs: [
                    for (final level in levels)
                      Tab(text: '${_levelName(level)}级成员')
                  ]),
                Expanded(
                    child: levels.isEmpty
                        ? const EmptyPanel(title: '暂无可用层级', subtitle: '请稍后再试')
                        : TabBarView(children: [
                            for (final level in levels)
                              _TeamLevelList(level: level)
                          ])),
              ]),
            );
          },
        ),
      );
}

class _TeamLevelList extends StatefulWidget {
  const _TeamLevelList({required this.level});
  final int level;
  @override
  State<_TeamLevelList> createState() => _TeamLevelListState();
}

class _TeamMetricCard extends StatelessWidget {
  const _TeamMetricCard(this.label, this.value, this.width);
  final String label;
  final String value;
  final double width;
  @override
  Widget build(BuildContext context) => SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 5),
          Text(value, style: Theme.of(context).textTheme.titleLarge),
        ]),
      ));
}

class _TeamLevelListState extends State<_TeamLevelList> {
  late Future<List<JsonMap>> _members;
  Future<List<JsonMap>> _load() async => asList(await context
          .read<AppController>()
          .api
          .get('/shop/member/team', {'level': widget.level}))
      .map(asJsonMap)
      .toList();
  @override
  void initState() {
    super.initState();
    _members = _load();
  }

  @override
  void didUpdateWidget(covariant _TeamLevelList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.level != widget.level) _members = _load();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<List<JsonMap>>(
        future: _members,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done)
            return const Center(child: CircularProgressIndicator());
          if (snapshot.hasError)
            return ErrorPanel(
                message: '${snapshot.error}',
                onRetry: () async => setState(() => _members = _load()));
          final items = snapshot.data ?? [];
          if (items.isEmpty)
            return const EmptyPanel(
                title: '暂无团队成员', subtitle: '分享邀请后，新成员会显示在这里');
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 9),
            itemBuilder: (context, index) {
              final item = items[index];
              final nickname = '${item['nickname'] ?? '会员'}';
              final masked = nickname.length < 2
                  ? '*$nickname'
                  : '${nickname.substring(0, 1)}${'*' * (nickname.length - 1)}';
              return ListTile(
                tileColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                leading: CircleAvatar(
                    backgroundColor: ShopTheme.primarySoft,
                    child: Text(masked.substring(0, 1),
                        style: const TextStyle(color: ShopTheme.primaryDark))),
                title: Text(masked),
                subtitle: Text('注册于 ${item['registerTime'] ?? ''}'),
                trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                          '¥${(double.tryParse('${item['contributedAmount']}') ?? 0).toStringAsFixed(2)}',
                          style: const TextStyle(
                              color: ShopTheme.primaryDark,
                              fontWeight: FontWeight.w700)),
                      Text('贡献佣金',
                          style: Theme.of(context).textTheme.bodySmall),
                    ]),
              );
            },
          );
        },
      );
}

class PromotionScreen extends StatefulWidget {
  const PromotionScreen({super.key});
  @override
  State<PromotionScreen> createState() => _PromotionScreenState();
}

class _PromotionScreenState extends State<PromotionScreen> {
  final _posterBoundary = GlobalKey();
  bool _sharingPoster = false;
  late Future<
      ({
        JsonMap stats,
        JsonMap config,
        JsonMap posters,
        List<JsonMap> guides,
        List<JsonMap> commissions,
        List<int> levels
      })> _data;
  Future<
      ({
        JsonMap stats,
        JsonMap config,
        JsonMap posters,
        List<JsonMap> guides,
        List<JsonMap> commissions,
        List<int> levels
      })> _load() async {
    final api = context.read<AppController>().api;
    final result = await Future.wait([
      api.get('/shop/member/promote-stats'),
      api.get('/shop/promote-config'),
      api.get('/shop/posters'),
      api.get('/help', {'scope': 'help'}),
      api.get('/shop/member/commissions'),
      api.get('/shop/distribution-config'),
    ]);
    final config = asJsonMap(result[5]);
    return (
      stats: asJsonMap(result[0]),
      config: asJsonMap(result[1]),
      posters: asJsonMap(result[2]),
      guides: asList(result[3]).map(asJsonMap).toList(),
      commissions: asList(result[4]).map(asJsonMap).toList(),
      levels: asList(config['activeLevels'])
          .map((v) => int.tryParse('$v') ?? 0)
          .where((v) => v > 0)
          .toList(),
    );
  }

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  Future<void> _sharePoster(String link, BuildContext shareContext) async {
    final object = _posterBoundary.currentContext?.findRenderObject();
    if (object is! RenderRepaintBoundary) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('海报正在准备，请稍后重试')));
      return;
    }
    setState(() => _sharingPoster = true);
    try {
      final image = await object.toImage(pixelRatio: 3);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      if (data == null) throw StateError('无法生成海报图片');
      final box = shareContext.findRenderObject() as RenderBox?;
      await Share.shareXFiles(
        [
          XFile.fromData(data.buffer.asUint8List(),
              mimeType: 'image/png', name: '橙选推广海报.png')
        ],
        text: '扫码加入橙选，${link}',
        sharePositionOrigin:
            box == null ? null : box.localToGlobal(Offset.zero) & box.size,
      );
    } on Object catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('海报分享失败：$error')));
    } finally {
      if (mounted) setState(() => _sharingPoster = false);
    }
  }

  Future<void> _shareInviteLink(String link) async {
    try {
      await Share.share('加入橙选商城，使用我的专属邀请链接：$link', subject: '橙选商城邀请');
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('分享邀请链接失败：$error')),
        );
      }
    }
  }

  Future<void> _copyInviteValue(String value, String label) async {
    if (value.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('邀请码暂不可用，请稍后刷新')),
      );
      return;
    }
    await Clipboard.setData(ClipboardData(text: value));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$label已复制')),
      );
    }
  }

  Future<void> _openGuide(JsonMap guide) async {
    try {
      final detail = asJsonMap(
          await context.read<AppController>().api.get('/help/${guide['id']}'));
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (context) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${detail['title'] ?? guide['title'] ?? ''}',
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  SelectableText('${detail['content'] ?? ''}',
                      style: Theme.of(context).textTheme.bodyLarge),
                ],
              ),
            ),
          ),
        ),
      );
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.message)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final member = context.watch<AppController>().member;
    final inviteCode = member?.inviteCode ?? '';
    return Scaffold(
      appBar: AppBar(title: const Text('推广中心')),
      body: FutureBuilder<
          ({
            JsonMap stats,
            JsonMap config,
            JsonMap posters,
            List<JsonMap> guides,
            List<JsonMap> commissions,
            List<int> levels
          })>(
        future: _data,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done)
            return const Center(child: CircularProgressIndicator());
          if (snapshot.hasError)
            return ErrorPanel(
                message: '${snapshot.error}',
                onRetry: () async => setState(() => _data = _load()));
          final data = snapshot.data!;
          final configuredDomain =
              '${data.config['domain'] ?? ''}'.replaceAll(RegExp(r'/+$'), '');
          final browserUri = Uri.base;
          final browserOrigin =
              browserUri.scheme == 'http' || browserUri.scheme == 'https'
                  ? browserUri.origin
                  : '';
          final apiUri =
              Uri.tryParse(context.read<AppController>().api.baseUrl);
          final configuredUri = Uri.tryParse(configuredDomain);
          final configuredIsLocal = configuredUri != null &&
              (configuredUri.host == 'localhost' ||
                  configuredUri.host == '127.0.0.1' ||
                  configuredUri.host == '0.0.0.0');
          final domain = configuredDomain.isNotEmpty
              ? (!kIsWeb && configuredIsLocal && apiUri != null
                  ? configuredUri.replace(host: apiUri.host).toString()
                  : configuredDomain)
              : browserOrigin.isNotEmpty
                  ? browserOrigin
                  : apiUri?.origin ?? '';
          final link = '$domain/r/${Uri.encodeComponent(inviteCode)}';
          final fixed = asJsonMap(data.posters['fixed']);
          final candidates = fixed.isNotEmpty
              ? [fixed]
              : asList(data.posters['randomList']).map(asJsonMap).toList();
          final poster =
              candidates.isEmpty ? <String, dynamic>{} : candidates.first;
          final posterImage = '${poster['image'] ?? ''}';
          final qrX = (double.tryParse('${poster['qrX']}') ?? 38) / 100;
          final qrY = (double.tryParse('${poster['qrY']}') ?? 72) / 100;
          final qrSize = (double.tryParse('${poster['qrSize']}') ?? 24) / 100;
          final enabled = data.levels.isNotEmpty;
          return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                _AgentCard(
                    eyebrow: 'YOUR INVITATION',
                    title: '专属邀请信息',
                    icon: Icons.person_add_alt_1_rounded,
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Expanded(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                  Text('邀请码',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall),
                                  const SizedBox(height: 3),
                                  Text(inviteCode.isEmpty ? '暂不可用' : inviteCode,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleLarge
                                          ?.copyWith(
                                              color: ShopTheme.primaryDark,
                                              letterSpacing: 1.1)),
                                ])),
                            IconButton.filledTonal(
                              tooltip: '复制邀请码',
                              onPressed: () =>
                                  _copyInviteValue(inviteCode, '邀请码'),
                              icon: const Icon(Icons.copy_rounded),
                            ),
                          ]),
                          const SizedBox(height: 8),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(11),
                            decoration: BoxDecoration(
                                color: ShopTheme.canvas,
                                borderRadius: BorderRadius.circular(12)),
                            child: SelectableText(link,
                                style: Theme.of(context).textTheme.bodySmall),
                          ),
                          const SizedBox(height: 10),
                          Row(children: [
                            Expanded(
                                child: OutlinedButton.icon(
                              onPressed: () => _copyInviteValue(link, '邀请链接'),
                              icon: const Icon(Icons.link_rounded),
                              label: const Text('复制链接'),
                            )),
                            const SizedBox(width: 9),
                            Expanded(
                                child: FilledButton.icon(
                              onPressed: inviteCode.isEmpty
                                  ? null
                                  : () => _shareInviteLink(link),
                              icon: const Icon(Icons.ios_share_rounded),
                              label: const Text('分享邀请'),
                            )),
                          ]),
                        ])),
                const SizedBox(height: 12),
                _AgentCard(
                    eyebrow: 'INVITATION POSTER',
                    title: '专属推广海报',
                    icon: Icons.qr_code_2_rounded,
                    child: Column(children: [
                      RepaintBoundary(
                          key: _posterBoundary,
                          child: AspectRatio(
                            aspectRatio: .72,
                            child: ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: LayoutBuilder(
                                    builder: (context, constraints) =>
                                        Stack(fit: StackFit.expand, children: [
                                          if (posterImage.isNotEmpty)
                                            ShopImage(
                                                url: posterImage, radius: 0)
                                          else
                                            Container(
                                                color: const Color(0xFFFFF1EB),
                                                child: Center(
                                                    child: Column(
                                                        mainAxisSize:
                                                            MainAxisSize.min,
                                                        children: [
                                                      Image.asset(
                                                          'assets/branding/logo-dark.png',
                                                          height: 52),
                                                      const SizedBox(
                                                          height: 12),
                                                      const Text(
                                                          '加入橙选 · 开启分享之路',
                                                          style: TextStyle(
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w800)),
                                                    ]))),
                                          Positioned(
                                            left: (constraints.maxWidth * qrX)
                                                .clamp(4,
                                                    constraints.maxWidth - 58)
                                                .toDouble(),
                                            top: (constraints.maxHeight * qrY)
                                                .clamp(4,
                                                    constraints.maxHeight - 58)
                                                .toDouble(),
                                            width: (constraints.maxWidth *
                                                    qrSize)
                                                .clamp(52,
                                                    constraints.maxWidth * .42)
                                                .toDouble(),
                                            height: (constraints.maxWidth *
                                                    qrSize)
                                                .clamp(52,
                                                    constraints.maxWidth * .42)
                                                .toDouble(),
                                            child: Container(
                                                color: Colors.white,
                                                padding:
                                                    const EdgeInsets.all(4),
                                                child: QrImageView(
                                                    data: link,
                                                    backgroundColor:
                                                        Colors.white,
                                                    padding: EdgeInsets.zero)),
                                          ),
                                        ]))),
                          )),
                      const SizedBox(height: 10),
                      Builder(
                          builder: (shareContext) => SizedBox(
                                width: double.infinity,
                                child: OutlinedButton.icon(
                                  onPressed: _sharingPoster
                                      ? null
                                      : () => _sharePoster(link, shareContext),
                                  icon: _sharingPoster
                                      ? const SizedBox(
                                          width: 17,
                                          height: 17,
                                          child: CircularProgressIndicator(
                                              strokeWidth: 2))
                                      : const Icon(Icons.ios_share_rounded),
                                  label: Text(_sharingPoster
                                      ? '海报生成中…'
                                      : '保存 / 分享推广海报'),
                                ),
                              )),
                    ])),
                const SizedBox(height: 12),
                _AgentCard(
                    eyebrow: 'PERFORMANCE',
                    title: '推广数据',
                    icon: Icons.insights_outlined,
                    child: Wrap(spacing: 8, runSpacing: 8, children: [
                      _SmallMetric('直属下级', '${data.stats['directCount'] ?? 0}'),
                      _SmallMetric('团队人数', '${data.stats['teamCount'] ?? 0}'),
                      _SmallMetric('成交订单', '${data.stats['orderCount'] ?? 0}'),
                      _SmallMetric('累计佣金',
                          '¥${(double.tryParse('${data.stats['commissionTotal']}') ?? 0).toStringAsFixed(2)}'),
                    ])),
                if (enabled) ...[
                  const SizedBox(height: 12),
                  _AgentCard(
                      eyebrow: 'COMMISSION MIX',
                      title: '佣金构成',
                      icon: Icons.account_tree_outlined,
                      child: Column(children: [
                        for (final level in data.levels)
                          Builder(builder: (context) {
                            final value = data.commissions
                                .where((c) =>
                                    int.tryParse('${c['distributionLevel']}') ==
                                    level)
                                .fold<double>(
                                    0,
                                    (sum, c) =>
                                        sum +
                                        (double.tryParse('${c['amount']}') ??
                                            0));
                            return ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text('${_levelName(level)}级佣金'),
                                trailing: Text('¥${value.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                        color: ShopTheme.primaryDark,
                                        fontWeight: FontWeight.w700)));
                          })
                      ])),
                ],
                const SizedBox(height: 12),
                _AgentCard(
                    eyebrow: 'QUICK START',
                    title: '推广指南',
                    icon: Icons.menu_book_outlined,
                    child: data.guides.isEmpty
                        ? const Text('暂无推广指南')
                        : Column(children: [
                            for (final item in data.guides.take(8))
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: const Icon(
                                    Icons.lightbulb_outline_rounded,
                                    color: ShopTheme.primaryDark),
                                title: Text('${item['title'] ?? ''}'),
                                trailing:
                                    const Icon(Icons.chevron_right_rounded),
                                onTap: () => _openGuide(item),
                              ),
                          ])),
              ]);
        },
      ),
    );
  }
}

class _SmallMetric extends StatelessWidget {
  const _SmallMetric(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => SizedBox(
      width: (MediaQuery.sizeOf(context).width - 100) / 2,
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
            color: ShopTheme.canvas, borderRadius: BorderRadius.circular(14)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 5),
          Text(value, style: Theme.of(context).textTheme.titleMedium),
        ]),
      ));
}

class PayoutAccountScreen extends StatefulWidget {
  const PayoutAccountScreen({super.key});
  @override
  State<PayoutAccountScreen> createState() => _PayoutAccountScreenState();
}

class _WithdrawalMethodCard extends StatelessWidget {
  const _WithdrawalMethodCard({
    required this.selected,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? ShopTheme.primarySoft : Colors.white,
        borderRadius: BorderRadius.circular(15),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(15),
          child: Container(
            constraints: const BoxConstraints(minHeight: 68),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(15),
              border: Border.all(
                color: selected ? ShopTheme.primary : ShopTheme.border,
                width: selected ? 1.3 : 1,
              ),
            ),
            child: Row(children: [
              Icon(icon,
                  size: 19,
                  color: selected ? ShopTheme.primaryDark : ShopTheme.mutedInk),
              const SizedBox(width: 7),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.labelLarge),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              if (selected) ...[
                const SizedBox(width: 4),
                const Icon(Icons.check_circle_rounded,
                    color: ShopTheme.primary, size: 17),
              ],
            ]),
          ),
        ),
      );
}

class _PayoutAccountScreenState extends State<PayoutAccountScreen> {
  final _form = GlobalKey<FormState>();
  final _bankName = TextEditingController();
  final _bankHolder = TextEditingController();
  final _bankCard = TextEditingController();
  final _alipayName = TextEditingController();
  final _alipayAccount = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  List<JsonMap> _withdrawals = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _bankName.dispose();
    _bankHolder.dispose();
    _bankCard.dispose();
    _alipayName.dispose();
    _alipayAccount.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final api = context.read<AppController>().api;
      final result = await Future.wait([
        api.get('/shop/member/payout-account'),
        api.get('/shop/member/withdraws')
      ]);
      final account = asJsonMap(result[0]);
      _bankName.text = '${account['bankName'] ?? ''}';
      _bankHolder.text = '${account['bankHolder'] ?? ''}';
      _bankCard.text = '${account['bankCard'] ?? ''}';
      _alipayName.text = '${account['alipayName'] ?? ''}';
      _alipayAccount.text = '${account['alipayAccount'] ?? ''}';
      _withdrawals = asList(result[1]).map(asJsonMap).toList();
    } on Exception catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await context
          .read<AppController>()
          .api
          .put('/shop/member/payout-account', {
        'bankName': _bankName.text.trim(),
        'bankHolder': _bankHolder.text.trim(),
        'bankCard': _bankCard.text.trim(),
        'alipayName': _alipayName.text.trim(),
        'alipayAccount': _alipayAccount.text.trim(),
      });
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('提现账号已保存')));
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('提现账号绑定')),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(padding: const EdgeInsets.all(16), children: [
                Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                        gradient: const LinearGradient(
                            colors: [Color(0xFF20262C), Color(0xFF414A53)]),
                        borderRadius: BorderRadius.circular(21)),
                    child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('PAYOUT ACCOUNT',
                              style: TextStyle(
                                  color: ShopTheme.primary,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800)),
                          SizedBox(height: 8),
                          Text('安全管理收款方式',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800)),
                          SizedBox(height: 6),
                          Text('收款账号仅用于佣金提现；修改后将用于下一笔申请。',
                              style: TextStyle(color: Colors.white70)),
                        ])),
                const SizedBox(height: 12),
                Form(
                    key: _form,
                    child: Column(children: [
                      _AgentCard(
                          eyebrow: 'BANK CARD',
                          title: '银行卡',
                          icon: Icons.credit_card_rounded,
                          child: Column(children: [
                            TextFormField(
                                controller: _bankName,
                                decoration:
                                    const InputDecoration(labelText: '开户银行')),
                            const SizedBox(height: 10),
                            TextFormField(
                                controller: _bankHolder,
                                decoration:
                                    const InputDecoration(labelText: '持卡人姓名')),
                            const SizedBox(height: 10),
                            TextFormField(
                                controller: _bankCard,
                                keyboardType: TextInputType.number,
                                decoration:
                                    const InputDecoration(labelText: '银行卡号')),
                          ])),
                      const SizedBox(height: 12),
                      _AgentCard(
                          eyebrow: 'ALIPAY',
                          title: '支付宝',
                          icon: Icons.account_balance_wallet_outlined,
                          child: Column(children: [
                            TextFormField(
                                controller: _alipayName,
                                decoration:
                                    const InputDecoration(labelText: '支付宝实名')),
                            const SizedBox(height: 10),
                            TextFormField(
                                controller: _alipayAccount,
                                decoration:
                                    const InputDecoration(labelText: '支付宝账号')),
                          ])),
                    ])),
                const SizedBox(height: 13),
                FilledButton(
                    onPressed: _saving ? null : _save,
                    child: Text(_saving ? '保存中…' : '保存绑定信息')),
                const SizedBox(height: 18),
                _AgentCard(
                    eyebrow: 'WITHDRAWALS',
                    title: '提现记录',
                    icon: Icons.payments_outlined,
                    child: _withdrawals.isEmpty
                        ? const EmptyPanel(
                            title: '暂无提现记录', subtitle: '申请提现后可跟踪审核与打款进度')
                        : Column(children: [
                            for (final item in _withdrawals)
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(
                                    '¥${(double.tryParse('${item['amount']}') ?? 0).toStringAsFixed(2)} · 实际到账 ¥${(double.tryParse('${item['actualAmount']}') ?? 0).toStringAsFixed(2)}'),
                                subtitle: Text(
                                    '${item['withdrawNo'] ?? ''} · ${item['createTime'] ?? ''}'),
                                trailing: Text(_withdrawStatus(
                                    int.tryParse('${item['status']}') ?? -1)),
                              ),
                          ])),
              ]),
      );
}

String _initial(String value) =>
    value.trim().isEmpty ? '会' : String.fromCharCode(value.trim().runes.first);
