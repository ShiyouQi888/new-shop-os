import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../core/models.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';
import '../auth/auth_screen.dart';
import 'agent_screens.dart';

class GiftZoneScreen extends StatefulWidget {
  const GiftZoneScreen({super.key});
  @override
  State<GiftZoneScreen> createState() => _GiftZoneScreenState();
}

class _GiftZoneScreenState extends State<GiftZoneScreen> {
  late Future<
      ({
        List<JsonMap> packages,
        List<JsonMap> levels,
        List<JsonMap> commissionRules
      })> _data;

  Future<
      ({
        List<JsonMap> packages,
        List<JsonMap> levels,
        List<JsonMap> commissionRules
      })> _load() async {
    final api = context.read<AppController>().api;
    final values = await Future.wait([
      api.get('/shop/home'),
      api.get('/shop/levels'),
      api.get('/shop/commission-rules'),
    ]);
    final home = asJsonMap(values[0]);
    return (
      packages: asList(home['giftPackages']).map(asJsonMap).toList(),
      levels: asList(values[1]).map(asJsonMap).toList(),
      commissionRules: asList(values[2]).map(asJsonMap).toList(),
    );
  }

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  Future<void> _buy(JsonMap package) async {
    final controller = context.read<AppController>();
    if (!controller.isSignedIn) {
      final ok = await Navigator.of(context)
          .push<bool>(MaterialPageRoute(builder: (_) => const AuthScreen()));
      if (ok != true || !mounted) return;
    }
    final member = context.read<AppController>().member!;
    final packageLevel = int.tryParse('${package['level']}') ?? 0;
    if (member.level >= packageLevel) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('当前会员等级已达到该方案')));
      return;
    }
    final method = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => _PackagePaymentSheet(package: package),
    );
    if (method == null) return;
    try {
      final order = asJsonMap(await controller.api.post('/shop/orders', {
        'giftPackageId': int.tryParse('${package['id']}'),
        'receiverName': member.nickname,
        'receiverPhone': member.phone,
        'receiverAddress': '权益订单无需物流配送',
        'remark': '入会礼包订单',
      }));
      final payment = asJsonMap(await controller.api.post('/shop/payments', {
        'orderId': order['orderId'],
        'payType': method,
      }));
      final paymentNo = '${payment['paymentNo'] ?? ''}';
      if (payment['mode'] != 'mock' && payment['mock'] != true) {
        final credential = asJsonMap(payment['credential']);
        if (mounted)
          await showDialog<void>(
              context: context,
              builder: (context) => AlertDialog(
                    title: const Text('支付单已创建'),
                    content: Text(
                        '${credential['message'] ?? '等待支付渠道完成付款'}\n支付单号：$paymentNo'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('知道了'))
                    ],
                  ));
        return;
      }
      await controller.api.post('/shop/payments/$paymentNo/simulate');
      await controller.api
          .post('/shop/member/upgrade', {'level': packageLevel});
      await controller.refreshMember();
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('模拟支付成功，会员权益已开通')));
      Navigator.of(context).pushReplacement<void, void>(
          MaterialPageRoute(builder: (_) => const AgentDashboardScreen()));
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('入会专区')),
        body: FutureBuilder<
            ({
              List<JsonMap> packages,
              List<JsonMap> levels,
              List<JsonMap> commissionRules
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
            if (data.packages.isEmpty)
              return const EmptyPanel(
                  title: '暂无入会方案', subtitle: '会员方案更新后会在这里展示');
            return ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                children: [
                  Container(
                    padding: const EdgeInsets.all(21),
                    decoration: BoxDecoration(
                        gradient: const LinearGradient(
                            colors: [Color(0xFF20262C), Color(0xFF414A53)]),
                        borderRadius: BorderRadius.circular(23)),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('MEMBER MEMBERSHIP',
                              style: TextStyle(
                                  color: ShopTheme.primary,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1)),
                          const SizedBox(height: 10),
                          Text('选择适合你的会员方案',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(color: Colors.white)),
                          const SizedBox(height: 7),
                          const Text('一次入会，获得专属购物权益与推广资格。',
                              style: TextStyle(color: Colors.white70)),
                          const SizedBox(height: 17),
                          const Wrap(spacing: 14, runSpacing: 8, children: [
                            _AssuranceItem(
                                Icons.verified_user_outlined, '权益透明'),
                            _AssuranceItem(
                                Icons.check_circle_outline_rounded, '即时生效'),
                            _AssuranceItem(Icons.support_agent_rounded, '专属服务'),
                          ]),
                        ]),
                  ),
                  const SizedBox(height: 14),
                  for (final package in data.packages)
                    _MembershipPackage(
                      package: package,
                      levels: data.levels,
                      commissionRules: data.commissionRules,
                      currentLevel:
                          context.watch<AppController>().member?.level ?? 0,
                      onBuy: () => _buy(package),
                    ),
                  const SizedBox(height: 8),
                  _MembershipComparison(
                      levels: data.levels,
                      commissionRules: data.commissionRules),
                ]);
          },
        ),
      );
}

class _AssuranceItem extends StatelessWidget {
  const _AssuranceItem(this.icon, this.label);
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, color: ShopTheme.primary, size: 15),
        const SizedBox(width: 5),
        Text(label,
            style: const TextStyle(color: Colors.white70, fontSize: 11)),
      ]);
}

class _MembershipPackage extends StatelessWidget {
  const _MembershipPackage(
      {required this.package,
      required this.levels,
      required this.commissionRules,
      required this.currentLevel,
      required this.onBuy});
  final JsonMap package;
  final List<JsonMap> levels;
  final List<JsonMap> commissionRules;
  final int currentLevel;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    final level = int.tryParse('${package['level']}') ?? 0;
    final rights = levels.cast<JsonMap?>().firstWhere(
        (item) => '${item?['level']}' == '$level',
        orElse: () => null);
    final rules = commissionRules
        .where((rule) => '${rule['packageLevel']}' == '$level')
        .toList()
      ..sort((a, b) => (int.tryParse('${a['distributionLevel']}') ?? 0)
          .compareTo(int.tryParse('${b['distributionLevel']}') ?? 0));
    final items = asList(package['items']).map(asJsonMap).toList();
    final alreadyOwned = currentLevel >= level;
    return Container(
      padding: const EdgeInsets.all(17),
      margin: const EdgeInsets.only(top: 11),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(21)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                    decoration: BoxDecoration(
                        color: ShopTheme.primarySoft,
                        borderRadius: BorderRadius.circular(20)),
                    child: Text('${package['levelName'] ?? '会员方案'}',
                        style: const TextStyle(
                            color: ShopTheme.primaryDark,
                            fontWeight: FontWeight.w700,
                            fontSize: 11))),
                const SizedBox(height: 8),
                Text('${package['name'] ?? ''}',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text('含实物礼包与会员专属权益',
                    style: Theme.of(context).textTheme.bodySmall),
              ])),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('入会价', style: Theme.of(context).textTheme.bodySmall),
            Text(
                '¥${(double.tryParse('${package['price']}') ?? 0).toStringAsFixed(2)}',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(color: ShopTheme.primaryDark)),
          ]),
        ]),
        if (items.isNotEmpty) ...[
          const SizedBox(height: 13),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(children: [
                const Icon(Icons.check_circle_rounded,
                    color: ShopTheme.success, size: 17),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(
                        '${item['skuName'] ?? ''} × ${item['quantity'] ?? 1}',
                        style: Theme.of(context).textTheme.bodyMedium)),
              ]),
            ),
        ],
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
              color: ShopTheme.canvas, borderRadius: BorderRadius.circular(14)),
          child: Row(children: [
            _RightMetric(
                '${(double.tryParse('${rights?['shopDiscount']}') ?? 100) / 10}折',
                '商城折扣'),
            _RightMetric(
                '¥${(double.tryParse('${rights?['monthlyCredit']}') ?? 0).toStringAsFixed(0)}',
                '月度领货'),
            _RightMetric('${rights?['creditMonths'] ?? 0}个月', '领货周期'),
            _RightMetric(
                '${rules.map((rule) => '${rule['rate']}').join('/')}${rules.isEmpty ? '-' : '%'}',
                '分享佣金'),
          ]),
        ),
        const SizedBox(height: 14),
        SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: alreadyOwned ? null : onBuy,
              icon: const Icon(Icons.workspace_premium_outlined),
              label: Text(alreadyOwned ? '已拥有该等级' : '选择此方案'),
            )),
      ]),
    );
  }
}

class _RightMetric extends StatelessWidget {
  const _RightMetric(this.value, this.label);
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Expanded(
          child: Column(children: [
        Text(value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 3),
        Text(label,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center),
      ]));
}

class _MembershipComparison extends StatelessWidget {
  const _MembershipComparison(
      {required this.levels, required this.commissionRules});
  final List<JsonMap> levels;
  final List<JsonMap> commissionRules;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(17),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(21)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('会员权益对比', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 22,
                headingRowHeight: 42,
                dataRowMinHeight: 40,
                dataRowMaxHeight: 48,
                columns: [
                  const DataColumn(label: Text('权益')),
                  const DataColumn(label: Text('普通会员')),
                  for (final level in levels)
                    DataColumn(label: Text('${level['levelName'] ?? '会员'}')),
                ],
                rows: [
                  _comparisonRow('入会条件', '免费注册',
                      levels.map((l) => '¥${l['entryAmount'] ?? 0}').toList()),
                  _comparisonRow(
                      '商城折扣',
                      '原价',
                      levels
                          .map((l) =>
                              '${(double.tryParse('${l['shopDiscount']}') ?? 100) / 10}折')
                          .toList()),
                  _comparisonRow(
                      '月度领货',
                      '-',
                      levels
                          .map((l) => '¥${l['monthlyCredit'] ?? 0}/月')
                          .toList()),
                  _comparisonRow(
                      '领货周期',
                      '-',
                      levels
                          .map((l) => '${l['creditMonths'] ?? 0}个月')
                          .toList()),
                  _comparisonRow(
                      '分享佣金',
                      '-',
                      levels.map((l) {
                        final rates = commissionRules
                            .where((r) =>
                                '${r['packageLevel']}' == '${l['level']}')
                            .map((r) => '${r['rate']}')
                            .join('/');
                        return rates.isEmpty ? '-' : '$rates%';
                      }).toList()),
                ],
              )),
        ]),
      );

  DataRow _comparisonRow(String label, String normal, List<String> values) =>
      DataRow(cells: [
        DataCell(Text(label)),
        DataCell(Text(normal)),
        for (final value in values) DataCell(Text(value)),
      ]);
}

class _PackagePaymentSheet extends StatefulWidget {
  const _PackagePaymentSheet({required this.package});
  final JsonMap package;
  @override
  State<_PackagePaymentSheet> createState() => _PackagePaymentSheetState();
}

class _PackagePaymentSheetState extends State<_PackagePaymentSheet> {
  String _method = 'wechat';
  @override
  Widget build(BuildContext context) => SafeArea(
          child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                  child: Text('支付入会礼包',
                      style: Theme.of(context).textTheme.titleLarge)),
              const SizedBox(height: 5),
              Center(
                  child: Text('${widget.package['name'] ?? ''}',
                      style: Theme.of(context).textTheme.bodyMedium)),
              const SizedBox(height: 18),
              Text('应付金额', style: Theme.of(context).textTheme.bodySmall),
              Text(
                  '¥${(double.tryParse('${widget.package['price']}') ?? 0).toStringAsFixed(2)}',
                  style: Theme.of(context)
                      .textTheme
                      .headlineMedium
                      ?.copyWith(color: ShopTheme.primaryDark)),
              const SizedBox(height: 15),
              Wrap(spacing: 9, children: [
                ChoiceChip(
                  avatar:
                      const PaymentProviderIcon(provider: 'wechat', size: 20),
                  label: const Text('微信支付'),
                  selected: _method == 'wechat',
                  onSelected: (_) => setState(() => _method = 'wechat'),
                ),
                ChoiceChip(
                  avatar:
                      const PaymentProviderIcon(provider: 'alipay', size: 20),
                  label: const Text('支付宝'),
                  selected: _method == 'alipay',
                  onSelected: (_) => setState(() => _method = 'alipay'),
                ),
              ]),
              const SizedBox(height: 14),
              SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                      onPressed: () => Navigator.pop(context, _method),
                      child: const Text('确认支付并开通'))),
            ]),
      ));
}
