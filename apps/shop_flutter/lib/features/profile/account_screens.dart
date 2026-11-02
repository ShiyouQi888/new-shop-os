import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../core/models.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';
import '../common/china_region_picker.dart';
import '../catalog/catalog_screens.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key, this.initialStatusTab = 0});
  final int initialStatusTab;

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<List<JsonMap>> _orders;
  late int _statusTab;

  Future<List<JsonMap>> _load() async => asList(
        await context.read<AppController>().api.get('/shop/member/orders'),
      ).map(asJsonMap).toList();

  @override
  void initState() {
    super.initState();
    _statusTab = widget.initialStatusTab.clamp(0, 4).toInt();
    _orders = _load();
  }

  Future<void> _refresh() async => setState(() => _orders = _load());

  Future<void> _orderAction(JsonMap order, String action) async {
    final api = context.read<AppController>().api;
    final id = order['id'];
    try {
      if (action == 'cancel') {
        final confirmed = await _confirmOrderAction('取消订单', '取消后该订单将进入已取消状态。');
        if (confirmed != true) return;
        await api.post('/shop/orders/$id/cancel');
      } else if (action == 'confirm') {
        final confirmed = await _confirmOrderAction('确认收货', '确认已经收到商品并完成订单？');
        if (confirmed != true) return;
        await api.post('/shop/orders/$id/confirm');
      } else if (action == 'remind') {
        final orderNo = '${order['orderNo'] ?? ''}';
        final suffix = orderNo.length > 6
            ? orderNo.substring(orderNo.length - 6)
            : orderNo;
        if (mounted)
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text('已提醒商家发货：$suffix')));
        return;
      } else if (action == 'rebuy') {
        final orderType = int.tryParse('${order['orderType']}') ?? 1;
        if (orderType == 2) {
          await Navigator.of(context).pushNamed('/gift-zone');
          return;
        }
        final skuId = int.tryParse('${order['skuId']}');
        if (skuId == null) throw const ApiException('订单商品信息不完整，无法再次购买');
        await api.post('/shop/member/cart', {'skuId': skuId, 'quantity': 1});
        await context.read<AppController>().loadCart();
        if (mounted) await Navigator.of(context).pushNamed('/cart');
        return;
      } else {
        final payType = await showModalBottomSheet<String>(
          context: context,
          backgroundColor: Colors.transparent,
          useSafeArea: true,
          builder: (_) => PaymentMethodPickerSheet(
            amount: double.tryParse('${order['payAmount']}') ?? 0,
          ),
        );
        if (payType == null) return;
        final payment = asJsonMap(await api
            .post('/shop/payments', {'orderId': id, 'payType': payType}));
        if (payment['mode'] == 'mock' || payment['mock'] == true) {
          await api.post('/shop/payments/${payment['paymentNo']}/simulate');
        } else {
          final credential = asJsonMap(payment['credential']);
          if (mounted)
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text('${credential['message'] ?? '请使用已配置的支付渠道付款'}')),
            );
          return;
        }
      }
      await _refresh();
      if (action == 'pay' && mounted) setState(() => _statusTab = 2);
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(action == 'cancel'
                  ? '订单已取消'
                  : action == 'confirm'
                      ? '已确认收货'
                      : '模拟支付成功')),
        );
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    } on Exception catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<bool?> _confirmOrderAction(String title, String message) =>
      showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('再想想')),
            FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('确认')),
          ],
        ),
      );

  List<JsonMap> _filterOrders(List<JsonMap> orders) {
    final status =
        switch (_statusTab) { 1 => 0, 2 => 1, 3 => 2, 4 => 3, _ => -1 };
    return status < 0
        ? orders
        : orders
            .where((order) => int.tryParse('${order['status']}') == status)
            .toList();
  }

  String _status(int status) => switch (status) {
        0 => '待付款',
        1 => '待发货',
        2 => '待收货',
        3 => '已完成',
        4 => '已取消',
        5 => '退款中',
        6 => '已退款',
        _ => '处理中',
      };

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('我的订单')),
        body: FutureBuilder<List<JsonMap>>(
          future: _orders,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => _refresh());
            final orders = snapshot.data ?? [];
            final visibleOrders = _filterOrders(orders);
            final pending = orders
                .where((order) => const {0, 1, 2}
                    .contains(int.tryParse('${order['status']}')))
                .length;
            final completed = orders
                .where((order) => int.tryParse('${order['status']}') == 3)
                .length;
            return Column(children: [
              Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                  child: Row(children: [
                    Expanded(
                        child: _OrderMetric(
                            label: '订单总数', value: '${orders.length}')),
                    const SizedBox(width: 9),
                    Expanded(
                        child: _OrderMetric(label: '待处理', value: '$pending')),
                    const SizedBox(width: 9),
                    Expanded(
                        child: _OrderMetric(label: '已完成', value: '$completed')),
                  ])),
              SizedBox(
                  height: 48,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    children: [
                      for (var index = 0; index < 5; index++)
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 3, vertical: 4),
                          child: ChoiceChip(
                            label:
                                Text(['全部', '待付款', '待发货', '待收货', '已完成'][index]),
                            selected: _statusTab == index,
                            onSelected: (_) =>
                                setState(() => _statusTab = index),
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                    ],
                  )),
              Expanded(
                  child: visibleOrders.isEmpty
                      ? EmptyPanel(
                          title: orders.isEmpty ? '还没有订单' : '暂无相关订单',
                          subtitle:
                              orders.isEmpty ? '下单后可以在这里查看进度' : '切换状态筛选查看其他订单')
                      : RefreshIndicator(
                          onRefresh: _refresh,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                            itemCount: visibleOrders.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final order = visibleOrders[index];
                              final status =
                                  int.tryParse('${order['status']}') ?? -1;
                              final orderType =
                                  int.tryParse('${order['orderType']}') ?? 1;
                              final apiItems = asList(order['items'])
                                  .map(asJsonMap)
                                  .toList();
                              final orderItems = apiItems.isNotEmpty
                                  ? apiItems
                                  : <JsonMap>[
                                      {
                                        'productName': order['productName'] ??
                                            (orderType == 2 ? '入会礼包' : '商城商品'),
                                        'skuName': order['skuName'] ?? '',
                                        'skuId': order['skuId'],
                                        'image': order['itemImage'] ?? '',
                                        'quantity': order['quantity'] ?? 1,
                                        'totalPrice': order['payAmount'] ?? 0,
                                      },
                                    ];
                              final paidAmount =
                                  double.tryParse('${order['payAmount']}') ?? 0;
                              final totalQuantity =
                                  int.tryParse('${order['quantity']}') ??
                                      orderItems.fold<int>(
                                        0,
                                        (sum, item) =>
                                            sum +
                                            (int.tryParse(
                                                    '${item['quantity']}') ??
                                                0),
                                      );
                              return Container(
                                padding: const EdgeInsets.all(15),
                                decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(19)),
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(children: [
                                        Expanded(
                                            child: Text(
                                                '订单 ${order['orderNo'] ?? ''}',
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .bodySmall)),
                                        Text(_status(status),
                                            style: const TextStyle(
                                                color: ShopTheme.primaryDark,
                                                fontWeight: FontWeight.w700)),
                                      ]),
                                      const Divider(height: 22),
                                      for (var itemIndex = 0;
                                          itemIndex < orderItems.length;
                                          itemIndex++) ...[
                                        if (itemIndex > 0)
                                          const SizedBox(height: 12),
                                        _OrderProductLine(
                                          item: orderItems[itemIndex],
                                          fallbackName: orderType == 2
                                              ? '入会礼包'
                                              : '商城商品',
                                          amount: orderItems.length == 1
                                              ? paidAmount
                                              : (double.tryParse(
                                                          '${orderItems[itemIndex]['totalPrice']}') ??
                                                      0),
                                        ),
                                      ],
                                      if (orderItems.length > 1) ...[
                                        const SizedBox(height: 14),
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: Text(
                                            '共 $totalQuantity 件  ·  实付款 ¥${paidAmount.toStringAsFixed(2)}',
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall,
                                          ),
                                        ),
                                      ],
                                      if (status == 0 ||
                                          status == 1 ||
                                          status == 2 ||
                                          status == 3) ...[
                                        const SizedBox(height: 14),
                                        SizedBox(
                                          width: double.infinity,
                                          child: Wrap(
                                            alignment: WrapAlignment.end,
                                            spacing: 8,
                                            runSpacing: 8,
                                            children: [
                                              if (status == 0)
                                                OutlinedButton(
                                                  onPressed: () => _orderAction(
                                                      order, 'cancel'),
                                                  child: const Text('取消订单'),
                                                ),
                                              if (status == 1)
                                                OutlinedButton(
                                                  onPressed: () => _orderAction(
                                                      order, 'remind'),
                                                  child: const Text('催发货'),
                                                ),
                                              if (status == 3)
                                                OutlinedButton(
                                                  onPressed: () => _orderAction(
                                                      order, 'rebuy'),
                                                  child: const Text('再次购买'),
                                                ),
                                              if (status == 0 || status == 2)
                                                FilledButton(
                                                  onPressed: () => _orderAction(
                                                      order,
                                                      status == 0
                                                          ? 'pay'
                                                          : 'confirm'),
                                                  child: Text(status == 0
                                                      ? '立即支付'
                                                      : '确认收货'),
                                                ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ]),
                              );
                            },
                          ),
                        )),
            ]);
          },
        ),
      );
}

class _OrderProductLine extends StatelessWidget {
  const _OrderProductLine({
    required this.item,
    required this.fallbackName,
    required this.amount,
  });

  final JsonMap item;
  final String fallbackName;
  final double amount;

  @override
  Widget build(BuildContext context) {
    final skuName = '${item['skuName'] ?? ''}'.trim();
    final rawProductName = '${item['productName'] ?? ''}'.trim();
    final productName = rawProductName.isEmpty || rawProductName == '商城商品'
        ? (skuName.isNotEmpty ? skuName : fallbackName)
        : rawProductName;
    final quantity = int.tryParse('${item['quantity']}') ?? 1;
    final detail = [
      if (skuName.isNotEmpty && skuName != productName) '规格：$skuName',
      '× $quantity',
    ].join('  ·  ');

    return Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
      SizedBox(
        width: 58,
        height: 58,
        child: ShopImage(url: '${item['image'] ?? ''}', radius: 12),
      ),
      const SizedBox(width: 11),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              productName,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 5),
            Text(
              detail,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
      const SizedBox(width: 8),
      Text(
        '¥${amount.toStringAsFixed(2)}',
        style: Theme.of(context).textTheme.titleSmall,
      ),
    ]);
  }
}

class _OrderMetric extends StatelessWidget {
  const _OrderMetric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(15)),
        child: Column(children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 3),
          Text(value, style: Theme.of(context).textTheme.titleMedium),
        ]),
      );
}

class AddressListScreen extends StatefulWidget {
  const AddressListScreen({super.key});

  @override
  State<AddressListScreen> createState() => _AddressListScreenState();
}

class _AddressListScreenState extends State<AddressListScreen> {
  late Future<List<JsonMap>> _addresses;

  Future<List<JsonMap>> _load() async => asList(
        await context.read<AppController>().api.get('/shop/member/addresses'),
      ).map(asJsonMap).toList();

  @override
  void initState() {
    super.initState();
    _addresses = _load();
  }

  Future<void> _refresh() async => setState(() => _addresses = _load());

  Future<void> _edit([JsonMap? current]) async {
    final name = TextEditingController(text: '${current?['name'] ?? ''}');
    final phone = TextEditingController(text: '${current?['phone'] ?? ''}');
    final province =
        TextEditingController(text: '${current?['province'] ?? ''}');
    final city = TextEditingController(text: '${current?['city'] ?? ''}');
    final district =
        TextEditingController(text: '${current?['district'] ?? ''}');
    final detail = TextEditingController(text: '${current?['detail'] ?? ''}');
    final formKey = GlobalKey<FormState>();
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(current == null ? '新增收货地址' : '编辑收货地址'),
        content: SizedBox(
          width: 420,
          child: Form(
            key: formKey,
            child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
              _AddressField(controller: name, label: '收货人'),
              _AddressField(
                  controller: phone,
                  label: '手机号',
                  keyboardType: TextInputType.phone),
              FormField<String>(
                initialValue: '${province.text}${city.text}${district.text}',
                validator: (value) =>
                    value == null || value.isEmpty ? '请选择所在地区' : null,
                builder: (field) => Padding(
                  padding: const EdgeInsets.only(bottom: 9),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () async {
                      final region = await pickChinaRegion(context,
                          province: province.text,
                          city: city.text,
                          district: district.text);
                      if (region == null) return;
                      province.text = region.province;
                      city.text = region.city;
                      district.text = region.district;
                      field.didChange(
                          '${region.province}${region.city}${region.district}');
                    },
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: '省市区',
                        errorText: field.errorText,
                        suffixIcon:
                            const Icon(Icons.keyboard_arrow_right_rounded),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 12),
                      ),
                      child: Text(
                          field.value?.isNotEmpty == true
                              ? field.value!
                              : '请选择省、市、区县',
                          style: TextStyle(
                              color: field.value?.isNotEmpty == true
                                  ? ShopTheme.ink
                                  : ShopTheme.mutedInk)),
                    ),
                  ),
                ),
              ),
              _AddressField(controller: detail, label: '详细地址', maxLines: 2),
            ])),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消')),
          FilledButton(
              onPressed: () {
                if (formKey.currentState!.validate())
                  Navigator.pop(context, true);
              },
              child: const Text('保存')),
        ],
      ),
    );
    if (save == true) {
      try {
        final payload = {
          'name': name.text.trim(),
          'phone': phone.text.trim(),
          'province': province.text.trim(),
          'city': city.text.trim(),
          'district': district.text.trim(),
          'detail': detail.text.trim(),
          'isDefault':
              current?['isDefault'] == 1 || current?['isDefault'] == true,
        };
        final api = context.read<AppController>().api;
        if (current == null) {
          await api.post('/shop/member/addresses', payload);
        } else {
          await api.put('/shop/member/addresses/${current['id']}', payload);
        }
        await _refresh();
      } on ApiException catch (error) {
        if (mounted)
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
    name.dispose();
    phone.dispose();
    province.dispose();
    city.dispose();
    district.dispose();
    detail.dispose();
  }

  Future<void> _setDefault(JsonMap address) async {
    try {
      await context
          .read<AppController>()
          .api
          .put('/shop/member/addresses/${address['id']}/default');
      await _refresh();
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  Future<void> _delete(JsonMap address) async {
    final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
              title: const Text('删除这个地址？'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('取消')),
                FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('删除')),
              ],
            ));
    if (confirm != true) return;
    try {
      await context
          .read<AppController>()
          .api
          .delete('/shop/member/addresses/${address['id']}');
      await _refresh();
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('收货地址')),
        body: FutureBuilder<List<JsonMap>>(
          future: _addresses,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => _refresh());
            final list = snapshot.data ?? [];
            if (list.isEmpty)
              return const EmptyPanel(title: '还没有收货地址', subtitle: '添加地址后下单更方便');
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final address = list[index];
                  final isDefault =
                      address['isDefault'] == 1 || address['isDefault'] == true;
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18)),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Expanded(
                                child: Text(
                                    '${address['name']}  ${address['phone']}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium)),
                            if (isDefault) const _DefaultTag(),
                          ]),
                          const SizedBox(height: 8),
                          Text(
                              '${address['province'] ?? ''}${address['city'] ?? ''}${address['district'] ?? ''}${address['detail'] ?? ''}',
                              style: Theme.of(context).textTheme.bodyMedium),
                          const Divider(height: 22),
                          Row(children: [
                            TextButton.icon(
                              onPressed:
                                  isDefault ? null : () => _setDefault(address),
                              icon: const Icon(
                                  Icons.check_circle_outline_rounded,
                                  size: 18),
                              label: const Text('设为默认'),
                            ),
                            const Spacer(),
                            IconButton(
                                onPressed: () => _edit(address),
                                icon: const Icon(Icons.edit_outlined),
                                tooltip: '编辑'),
                            IconButton(
                                onPressed: () => _delete(address),
                                icon: const Icon(Icons.delete_outline_rounded),
                                tooltip: '删除'),
                          ]),
                        ]),
                  );
                },
              ),
            );
          },
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _edit(),
          icon: const Icon(Icons.add_rounded),
          label: const Text('新增地址'),
        ),
      );
}

class _AddressField extends StatelessWidget {
  const _AddressField(
      {required this.controller,
      required this.label,
      this.keyboardType,
      this.maxLines = 1});
  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;
  final int maxLines;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          decoration: InputDecoration(
              labelText: label,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 12)),
          validator: (value) =>
              value == null || value.trim().isEmpty ? '请填写$label' : null,
        ),
      );
}

class _DefaultTag extends StatelessWidget {
  const _DefaultTag();
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
            color: ShopTheme.primarySoft,
            borderRadius: BorderRadius.circular(20)),
        child: const Text('默认',
            style: TextStyle(
                color: ShopTheme.primaryDark,
                fontSize: 11,
                fontWeight: FontWeight.w700)),
      );
}

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});
  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  late Future<List<JsonMap>> _items;
  Future<List<JsonMap>> _load() async => asList(
          await context.read<AppController>().api.get('/shop/member/favorites'))
      .map(asJsonMap)
      .toList();
  @override
  void initState() {
    super.initState();
    _items = _load();
  }

  Future<void> _refresh() async => setState(() => _items = _load());

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('我的收藏')),
        body: FutureBuilder<List<JsonMap>>(
          future: _items,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => _refresh());
            final list = snapshot.data ?? [];
            if (list.isEmpty)
              return const EmptyPanel(
                  title: '还没有收藏', subtitle: '看到喜欢的商品，可以先收藏起来');
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = list[index];
                  return ListTile(
                    tileColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(17)),
                    leading: SizedBox(
                        width: 56,
                        height: 56,
                        child: ShopImage(
                            url: '${item['mainImage'] ?? ''}', radius: 12)),
                    title: Text('${item['name'] ?? ''}',
                        maxLines: 2, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                        '¥${(double.tryParse('${item['minPrice']}') ?? 0).toStringAsFixed(2)}',
                        style: const TextStyle(
                            color: ShopTheme.primaryDark,
                            fontWeight: FontWeight.w700)),
                    trailing: IconButton(
                      onPressed: () async {
                        try {
                          await context.read<AppController>().api.delete(
                              '/shop/member/favorites/${item['spuId']}');
                          await _refresh();
                        } on ApiException catch (error) {
                          if (mounted)
                            ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(error.message)));
                        }
                      },
                      icon: const Icon(Icons.favorite_rounded,
                          color: ShopTheme.primary),
                    ),
                    onTap: () =>
                        Navigator.of(context).push<void>(MaterialPageRoute(
                      builder: (_) => ProductDetailScreen(
                          productId: int.tryParse('${item['spuId']}') ?? 0),
                    )),
                  );
                },
              ),
            );
          },
        ),
      );
}

class BrowsingHistoryScreen extends StatefulWidget {
  const BrowsingHistoryScreen({super.key});
  @override
  State<BrowsingHistoryScreen> createState() => _BrowsingHistoryScreenState();
}

class _BrowsingHistoryScreenState extends State<BrowsingHistoryScreen> {
  late Future<List<JsonMap>> _items;
  Future<List<JsonMap>> _load() async => asList(
          await context.read<AppController>().api.get('/shop/member/history'))
      .map(asJsonMap)
      .toList();
  @override
  void initState() {
    super.initState();
    _items = _load();
  }

  Future<void> _refresh() async => setState(() => _items = _load());

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('浏览历史')),
        body: FutureBuilder<List<JsonMap>>(
          future: _items,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => _refresh());
            final list = snapshot.data ?? [];
            if (list.isEmpty)
              return const EmptyPanel(
                  title: '暂无浏览记录', subtitle: '最近看过的商品会出现在这里');
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = list[index];
                  return ListTile(
                    tileColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(17)),
                    leading: SizedBox(
                        width: 56,
                        height: 56,
                        child: ShopImage(
                            url: '${item['mainImage'] ?? ''}', radius: 12)),
                    title: Text('${item['name'] ?? ''}',
                        maxLines: 2, overflow: TextOverflow.ellipsis),
                    subtitle: const Text('最近浏览'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () =>
                        Navigator.of(context).push<void>(MaterialPageRoute(
                      builder: (_) => ProductDetailScreen(
                          productId: int.tryParse('${item['spuId']}') ?? 0),
                    )),
                  );
                },
              ),
            );
          },
        ),
      );
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<JsonMap> _result;
  Future<JsonMap> _load() async => asJsonMap(await context
      .read<AppController>()
      .api
      .get('/shop/member/notifications'));
  @override
  void initState() {
    super.initState();
    _result = _load();
  }

  Future<void> _refresh() async => setState(() => _result = _load());

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('消息通知'),
          actions: [
            TextButton(
                onPressed: () async {
                  try {
                    await context
                        .read<AppController>()
                        .api
                        .post('/shop/member/notifications/read-all');
                    await _refresh();
                  } on ApiException catch (error) {
                    if (mounted)
                      ScaffoldMessenger.of(context)
                          .showSnackBar(SnackBar(content: Text(error.message)));
                  }
                },
                child: const Text('全部已读'))
          ],
        ),
        body: FutureBuilder<JsonMap>(
          future: _result,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => _refresh());
            final list = asList(snapshot.data?['list']).map(asJsonMap).toList();
            if (list.isEmpty)
              return const EmptyPanel(
                  title: '暂时没有新消息', subtitle: '订单与账户通知会显示在这里');
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 9),
                itemBuilder: (context, index) => Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(17)),
                  child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                            list[index]['isRead'] == 1
                                ? Icons.notifications_none_rounded
                                : Icons.notifications_active_rounded,
                            color: list[index]['isRead'] == 1
                                ? ShopTheme.mutedInk
                                : ShopTheme.primary),
                        const SizedBox(width: 11),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text('${list[index]['title'] ?? ''}',
                                  style:
                                      Theme.of(context).textTheme.titleSmall),
                              const SizedBox(height: 5),
                              Text('${list[index]['content'] ?? ''}',
                                  style:
                                      Theme.of(context).textTheme.bodyMedium),
                              const SizedBox(height: 7),
                              Text('${list[index]['createTime'] ?? ''}',
                                  style: Theme.of(context).textTheme.bodySmall),
                            ])),
                      ]),
                ),
              ),
            );
          },
        ),
      );
}
