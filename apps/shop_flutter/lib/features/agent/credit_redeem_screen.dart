import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../core/models.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';
import '../profile/account_screens.dart';

class CreditRedeemScreen extends StatefulWidget {
  const CreditRedeemScreen({super.key, this.creditId, this.remainAmount});
  final int? creditId;
  final double? remainAmount;

  @override
  State<CreditRedeemScreen> createState() => _CreditRedeemScreenState();
}

class _CreditRedeemScreenState extends State<CreditRedeemScreen> {
  late Future<void> _loading;
  List<JsonMap> _pool = [];
  List<JsonMap> _credits = [];
  List<JsonMap> _addresses = [];
  JsonMap _memberData = {};
  int? _creditId;
  int? _addressId;
  int? _pendingOrderId;
  double _pendingCashAmount = 0;
  final Map<int, int> _selectedSku = {};
  final Map<int, int> _quantities = {};
  bool _loadingAction = false;
  bool _useWallet = false;
  String? _error;

  JsonMap get _credit =>
      _credits
          .cast<JsonMap?>()
          .firstWhere((item) => item?['id'] == _creditId, orElse: () => null) ??
      <String, dynamic>{};
  double get _remaining =>
      _money(_credit['remainAmount'] ?? widget.remainAmount);
  JsonMap? get _address => _addresses
      .cast<JsonMap?>()
      .firstWhere((item) => item?['id'] == _addressId, orElse: () => null);
  double get _walletBalance {
    final member = asJsonMap(_memberData['member']);
    final commission = asJsonMap(_memberData['commission']);
    final wallet = asJsonMap(member['wallet']);
    return _money(commission['available'] ?? wallet['balance']);
  }

  List<JsonMap> get _lines => [
        for (final product in _pool)
          if (_quantity(product) > 0)
            {
              'product': product,
              'sku': _activeSku(product),
              'quantity': _quantity(product),
            },
      ];
  double get _total => _lines.fold<double>(
      0,
      (sum, line) =>
          sum +
          _money(asJsonMap(line['sku'])['price']) * (line['quantity'] as int));
  double get _overage =>
      (_total - _remaining).clamp(0, double.infinity).toDouble();
  double get _walletApplied =>
      _useWallet ? _overage.clamp(0, _walletBalance).toDouble() : 0;
  double get _cashDue =>
      (_overage - _walletApplied).clamp(0, double.infinity).toDouble();
  int get _selectedCount =>
      _lines.fold<int>(0, (sum, line) => sum + (line['quantity'] as int));
  bool get _lumpSum =>
      '${asJsonMap(_memberData['member'])['claimMode'] ?? _memberData['claimMode'] ?? ''}' ==
      'lump_sum';
  bool get _canSubmit =>
      _creditId != null &&
      _remaining > 0 &&
      _lines.isNotEmpty &&
      (!_lumpSum || _total >= _remaining - .005);

  @override
  void initState() {
    super.initState();
    _loading = _load();
  }

  double _money(dynamic value) => double.tryParse('$value') ?? 0;

  Future<void> _load() async {
    final api = context.read<AppController>().api;
    final results = await Future.wait([
      api.get('/shop/member/credits'),
      api.get('/shop/member/credit-pool'),
      api.get('/shop/member/addresses'),
      api.get('/shop/member/me'),
    ]);
    _credits = asList(results[0]).map(asJsonMap).toList();
    final poolData = results[1];
    _pool = poolData is List
        ? asList(poolData).map(asJsonMap).toList()
        : asList(asJsonMap(poolData)['list']).map(asJsonMap).toList();
    _addresses = asList(results[2]).map(asJsonMap).toList();
    _memberData = asJsonMap(results[3]);
    final wanted = widget.creditId ?? _creditId;
    _creditId = _credits.any((credit) => credit['id'] == wanted)
        ? wanted
        : (_firstOrNull(_credits
                .where((credit) => _money(credit['remainAmount']) > 0)
                .map((credit) => int.tryParse('${credit['id']}'))
                .whereType<int>()) ??
            _firstOrNull(_credits
                .map((credit) => int.tryParse('${credit['id']}'))
                .whereType<int>()));
    _addressId ??= _firstOrNull(_addresses
            .where((address) =>
                address['isDefault'] == 1 || address['isDefault'] == true)
            .map((address) => int.tryParse('${address['id']}'))
            .whereType<int>()) ??
        _firstOrNull(_addresses
            .map((address) => int.tryParse('${address['id']}'))
            .whereType<int>());
    for (final product in _pool) {
      final skus = _skus(product);
      final productId = int.tryParse('${product['id']}') ?? 0;
      _selectedSku.putIfAbsent(
          productId,
          () =>
              _firstOrNull(skus
                  .where((sku) => _stock(sku) > 0)
                  .map((sku) => int.tryParse('${sku['id']}'))
                  .whereType<int>()) ??
              int.tryParse('${_firstOrNull(skus)?['id']}') ??
              0);
      _quantities.putIfAbsent(productId, () => 0);
    }
  }

  List<JsonMap> _skus(JsonMap product) =>
      asList(product['skus']).map(asJsonMap).toList();
  int _stock(JsonMap sku) => int.tryParse('${sku['stock']}') ?? 0;
  int _quantity(JsonMap product) =>
      _quantities[int.tryParse('${product['id']}') ?? 0] ?? 0;
  JsonMap? _activeSku(JsonMap product) {
    final id = _selectedSku[int.tryParse('${product['id']}') ?? 0];
    for (final sku in _skus(product)) {
      if (int.tryParse('${sku['id']}') == id) return sku;
    }
    return null;
  }

  void _setQuantity(JsonMap product, int value) {
    final id = int.tryParse('${product['id']}') ?? 0;
    final max = _stock(_activeSku(product) ?? {});
    setState(() => _quantities[id] = value.clamp(0, max).toInt());
  }

  void _autoCompose() {
    final target = (_remaining * 100).round();
    if (target <= 0) return;
    final unit = (target / 300000).ceil().clamp(1, target).toInt();
    final capacity = target ~/ unit;
    final items = <({int spu, int sku, int cost, int max})>[];
    for (final product in _pool) {
      final inStock = _skus(product).where((sku) => _stock(sku) > 0).toList()
        ..sort((a, b) => _money(a['price']).compareTo(_money(b['price'])));
      if (inStock.isEmpty) continue;
      final sku = inStock.first;
      final cost = (_money(sku['price']) * 100 / unit).round();
      if (cost <= 0 || cost > capacity) continue;
      items.add((
        spu: int.tryParse('${product['id']}') ?? 0,
        sku: int.tryParse('${sku['id']}') ?? 0,
        cost: cost,
        max: _stock(sku).clamp(0, capacity ~/ cost).toInt()
      ));
    }
    var dp = List<int>.filled(capacity + 1, 0);
    final history = <List<int>>[dp];
    for (final item in items) {
      final itemChunks = <(int, int)>[];
      var left = item.max;
      var chunk = 1;
      while (left > 0) {
        final quantity = chunk.clamp(1, left).toInt();
        final price = quantity * item.cost;
        itemChunks.add((quantity, price));
        left -= quantity;
        chunk *= 2;
      }
      dp = List<int>.from(history.last);
      for (final (_, price) in itemChunks) {
        for (var amount = capacity; amount >= price; amount--) {
          final candidate = dp[amount - price] + price;
          if (candidate > dp[amount]) dp[amount] = candidate;
        }
      }
      history.add(dp);
    }
    final picks = <int, (int, int)>{};
    var amount = capacity;
    for (var index = items.length - 1; index >= 0; index--) {
      var chosen = 0;
      final item = items[index];
      final maxQuantity = item.max.clamp(0, amount ~/ item.cost).toInt();
      for (var quantity = maxQuantity; quantity > 0; quantity--) {
        final price = quantity * item.cost;
        if (history[index][amount - price] + price ==
            history[index + 1][amount]) {
          chosen = quantity;
          amount -= price;
          break;
        }
      }
      if (chosen > 0) picks[items[index].spu] = (items[index].sku, chosen);
    }
    setState(() {
      for (final product in _pool) {
        final id = int.tryParse('${product['id']}') ?? 0;
        final pick = picks[id];
        if (pick == null) {
          _quantities[id] = 0;
        } else {
          _selectedSku[id] = pick.$1;
          _quantities[id] = pick.$2;
        }
      }
    });
  }

  Future<JsonMap?> _chooseAddress() async {
    final selected = await showModalBottomSheet<JsonMap>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
          child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
        children: [
          Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text('选择收货地址',
                  style: Theme.of(context).textTheme.titleLarge)),
          if (_addresses.isEmpty)
            const Padding(padding: EdgeInsets.all(18), child: Text('请先添加收货地址')),
          for (final address in _addresses)
            ListTile(
              leading: Icon(
                  address['isDefault'] == 1 || address['isDefault'] == true
                      ? Icons.check_circle_rounded
                      : Icons.location_on_outlined,
                  color: ShopTheme.primaryDark),
              title:
                  Text('${address['name'] ?? ''}  ${address['phone'] ?? ''}'),
              subtitle: Text(
                  '${address['province'] ?? ''}${address['city'] ?? ''}${address['district'] ?? ''}${address['detail'] ?? ''}'),
              onTap: () => Navigator.pop(context, address),
            ),
          OutlinedButton.icon(
            onPressed: () async {
              Navigator.pop(
                  context, <String, dynamic>{'_manageAddresses': true});
            },
            icon: const Icon(Icons.add_location_alt_outlined),
            label: const Text('管理或新增地址'),
          ),
        ],
      )),
    );
    if (selected?['_manageAddresses'] == true) {
      await Navigator.of(context).push<void>(
          MaterialPageRoute(builder: (_) => const AddressListScreen()));
      if (mounted) await _load();
      if (mounted) setState(() {});
      return _address;
    }
    return selected;
  }

  Future<void> _submit() async {
    if (_pendingOrderId != null) {
      setState(() => _loadingAction = true);
      try {
        final paid = await _payShortfall(_pendingOrderId!, _pendingCashAmount);
        if (!paid) return;
        _pendingOrderId = null;
        _pendingCashAmount = 0;
        if (!mounted) return;
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('支付成功，兑换已完成')));
        await context.read<AppController>().refreshMember();
        setState(() => _loading = _load());
        await Future<void>.delayed(const Duration(milliseconds: 350));
        if (mounted)
          Navigator.of(context).push<void>(
              MaterialPageRoute(builder: (_) => const OrdersScreen()));
      } on ApiException catch (error) {
        if (mounted) setState(() => _error = error.message);
      } finally {
        if (mounted) setState(() => _loadingAction = false);
      }
      return;
    }
    if (!_canSubmit) return;
    var address = _address;
    address ??= await _chooseAddress();
    if (address == null) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('请先添加收货地址')));
      return;
    }
    setState(() => _addressId = int.tryParse('${address!['id']}'));
    final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => StatefulBuilder(
            builder: (context, setDialogState) => AlertDialog(
                  title: const Text('确认使用领货额度'),
                  content: SizedBox(
                      width: 400,
                      child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                                '已选 $_selectedCount 件商品，总额 ¥${_total.toStringAsFixed(2)}'),
                            const SizedBox(height: 8),
                            Text(
                                '收货人：${address!['name'] ?? ''} ${address['phone'] ?? ''}'),
                            Text(
                                '地址：${address['province'] ?? ''}${address['city'] ?? ''}${address['district'] ?? ''}${address['detail'] ?? ''}'),
                            if (_overage > 0) ...[
                              const Divider(height: 22),
                              Text('超出额度 ¥${_overage.toStringAsFixed(2)}'),
                              if (_walletBalance > 0)
                                CheckboxListTile(
                                  contentPadding: EdgeInsets.zero,
                                  value: _useWallet,
                                  onChanged: (value) => setDialogState(
                                      () => _useWallet = value ?? false),
                                  title: Text(
                                      '使用佣金余额抵扣（可用 ¥${_walletBalance.toStringAsFixed(2)}）'),
                                ),
                              Text('还需现金支付 ¥${_cashDue.toStringAsFixed(2)}'),
                            ],
                          ])),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('再看看')),
                    FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('确认兑换')),
                  ],
                )));
    if (confirmed != true) return;
    setState(() {
      _loadingAction = true;
      _error = null;
    });
    try {
      final result = asJsonMap(await context
          .read<AppController>()
          .api
          .post('/shop/member/credits/$_creditId/redeem', {
        'items': [
          for (final line in _lines)
            {
              'skuId': asJsonMap(line['sku'])['id'],
              'quantity': line['quantity']
            }
        ],
        'useWalletAmount': _walletApplied,
        'receiverName': address['name'],
        'receiverPhone': address['phone'],
        'receiverAddress':
            '${address['province'] ?? ''}${address['city'] ?? ''}${address['district'] ?? ''}${address['detail'] ?? ''}',
      }));
      final shortfall = _money(result['cashShortfall']);
      if (shortfall > .004) {
        _pendingOrderId = int.tryParse('${result['orderId']}');
        if (_pendingOrderId == null)
          throw const ApiException('兑换订单已创建，但没有收到订单编号');
        _pendingCashAmount = shortfall;
        final paid = await _payShortfall(_pendingOrderId!, shortfall);
        if (!paid) return;
        _pendingOrderId = null;
        _pendingCashAmount = 0;
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(shortfall > .004 ? '支付成功，兑换已完成' : '兑换成功，订单等待发货')));
      await context.read<AppController>().refreshMember();
      setState(() => _loading = _load());
      await Future<void>.delayed(const Duration(milliseconds: 350));
      if (mounted)
        Navigator.of(context).push<void>(
            MaterialPageRoute(builder: (_) => const OrdersScreen()));
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loadingAction = false);
    }
  }

  Future<bool> _payShortfall(int orderId, double amount) async {
    final method = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (_) => PaymentMethodPickerSheet(
        title: '支付现金差价',
        subtitle: '请选择一种方式完成支付',
        amount: amount,
      ),
    );
    if (method == null) return false;
    try {
      final api = context.read<AppController>().api;
      final payment = asJsonMap(await api
          .post('/shop/payments', {'orderId': orderId, 'payType': method}));
      if (payment['mode'] == 'mock' || payment['mock'] == true) {
        await api.post('/shop/payments/${payment['paymentNo']}/simulate');
        return true;
      }
      final credential = asJsonMap(payment['credential']);
      if (mounted)
        await showDialog<void>(
            context: context,
            builder: (context) => AlertDialog(
                  title: const Text('支付单已创建'),
                  content: Text(
                      '${credential['message'] ?? '请在已配置的支付渠道中完成支付。'}\n支付单号：${payment['paymentNo'] ?? ''}'),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('知道了'))
                  ],
                ));
      return false;
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      return false;
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('领取商品自用')),
        body: FutureBuilder<void>(
          future: _loading,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => setState(() => _loading = _load()));
            if (_pool.isEmpty)
              return const EmptyPanel(
                  title: '暂无可兑换商品', subtitle: '当前会员等级没有配置领货商品，请联系客服');
            return RefreshIndicator(
              onRefresh: () async => setState(() => _loading = _load()),
              child: CustomScrollView(slivers: [
                SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    sliver: SliverToBoxAdapter(child: _quotaCard())),
                SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverGrid.builder(
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount:
                            MediaQuery.sizeOf(context).width >= 720 ? 3 : 2,
                        crossAxisSpacing: 11,
                        mainAxisSpacing: 11,
                        childAspectRatio: .58,
                      ),
                      itemCount: _pool.length,
                      itemBuilder: (context, index) =>
                          _productCard(_pool[index]),
                    )),
                if (_error != null)
                  SliverPadding(
                      padding: const EdgeInsets.all(16),
                      sliver: SliverToBoxAdapter(
                          child: Text(_error!,
                              style:
                                  const TextStyle(color: Color(0xFFE5484D))))),
                const SliverToBoxAdapter(child: SizedBox(height: 110)),
              ]),
            );
          },
        ),
        bottomNavigationBar: SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(17, 10, 17, 10),
              decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: ShopTheme.border))),
              child: Row(children: [
                Expanded(
                    child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text('已选 $_selectedCount 件',
                          style: Theme.of(context).textTheme.bodySmall),
                      Text('¥${_total.toStringAsFixed(2)}',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(color: ShopTheme.primaryDark)),
                    ])),
                FilledButton(
                    onPressed: (_canSubmit || _pendingOrderId != null) &&
                            !_loadingAction
                        ? _submit
                        : null,
                    child: _loadingAction
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Text(_pendingOrderId != null ? '继续支付' : '确认兑换')),
              ]),
            )),
      );

  Widget _quotaCard() => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
            gradient: const LinearGradient(
                colors: [Color(0xFF20262C), Color(0xFF414A53)]),
            borderRadius: BorderRadius.circular(22)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('REMAINING MONTHLY CREDIT',
              style: TextStyle(
                  color: ShopTheme.primary,
                  fontSize: 10,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('¥${_remaining.toStringAsFixed(2)}',
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(color: Colors.white)),
          Text('${_credit['month'] ?? ''} · 可用领货额度',
              style: const TextStyle(color: Colors.white70)),
          if (_lumpSum)
            const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('一次性领取模式需选满剩余额度',
                    style: TextStyle(color: Colors.white70, fontSize: 12))),
          if (_remaining > 0)
            Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: _autoCompose,
                  style: TextButton.styleFrom(foregroundColor: Colors.white),
                  icon: const Icon(Icons.auto_awesome_rounded),
                  label: const Text('智能选购'),
                )),
        ]),
      );

  Widget _productCard(JsonMap product) {
    final skus = _skus(product);
    final sku = _activeSku(product);
    final id = int.tryParse('${product['id']}') ?? 0;
    final stock = _stock(sku ?? {});
    return Container(
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(18)),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(
            child: ShopImage(url: '${product['mainImage'] ?? ''}', radius: 0)),
        Padding(
            padding: const EdgeInsets.fromLTRB(11, 9, 11, 0),
            child: Text('${product['name'] ?? ''}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleSmall)),
        if (skus.length > 1)
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: DropdownButton<int>(
                isExpanded: true,
                value: skus.any((item) =>
                        int.tryParse('${item['id']}') == _selectedSku[id])
                    ? _selectedSku[id]
                    : int.tryParse('${_firstOrNull(skus)?['id']}'),
                items: [
                  for (final item in skus)
                    DropdownMenuItem(
                        value: int.tryParse('${item['id']}'),
                        enabled: _stock(item) > 0,
                        child: Text(
                            '${item['skuName'] ?? '规格'}${_stock(item) <= 0 ? ' · 缺货' : ''}',
                            overflow: TextOverflow.ellipsis))
                ],
                onChanged: (value) {
                  if (value != null)
                    setState(() {
                      _selectedSku[id] = value;
                      _quantities[id] = 0;
                    });
                },
              ))
        else
          const SizedBox(height: 6),
        Padding(
            padding: const EdgeInsets.fromLTRB(11, 0, 11, 4),
            child: Text('¥${_money(sku?['price']).toStringAsFixed(2)}',
                style: const TextStyle(
                    color: ShopTheme.primaryDark,
                    fontWeight: FontWeight.w800))),
        Padding(
            padding: const EdgeInsets.fromLTRB(7, 0, 7, 8),
            child: Row(children: [
              IconButton(
                  onPressed: _quantity(product) > 0
                      ? () => _setQuantity(product, _quantity(product) - 1)
                      : null,
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.remove_circle_outline)),
              Expanded(
                  child: Text('${_quantity(product)}',
                      textAlign: TextAlign.center)),
              IconButton(
                  onPressed: stock > _quantity(product)
                      ? () => _setQuantity(product, _quantity(product) + 1)
                      : null,
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.add_circle_outline)),
            ])),
      ]),
    );
  }
}

T? _firstOrNull<T>(Iterable<T> values) {
  final iterator = values.iterator;
  return iterator.moveNext() ? iterator.current : null;
}
