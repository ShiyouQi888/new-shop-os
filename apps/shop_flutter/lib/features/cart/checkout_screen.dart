import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../core/models.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';
import '../common/china_region_picker.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen(
      {super.key, required this.items, this.removePurchasedFromCart = true});
  final List<CartItem> items;
  final bool removePurchasedFromCart;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _regionFieldKey = GlobalKey<FormFieldState<String>>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _province = TextEditingController();
  final _city = TextEditingController();
  final _district = TextEditingController();
  final _address = TextEditingController();
  List<JsonMap> _savedAddresses = [];
  bool _loadingAddress = true;
  bool _submitting = false;
  String _payType = 'wechat';
  String? _error;
  int? _pendingOrderId;

  double get _listTotal => widget.items
      .fold<double>(0, (sum, item) => sum + item.price * item.quantity);
  double _estimatedTotal(double discount) => widget.items.fold<double>(
      0, (sum, item) => sum + item.memberPrice(discount) * item.quantity);

  @override
  void initState() {
    super.initState();
    _loadAddress();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _province.dispose();
    _city.dispose();
    _district.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _loadAddress() async {
    try {
      final addresses = asList(await context
          .read<AppController>()
          .api
          .get('/shop/member/addresses'));
      _savedAddresses = addresses.map(asJsonMap).toList();
      if (addresses.isNotEmpty) {
        final entries = _savedAddresses;
        final address = entries.firstWhere(
          (item) => item['isDefault'] == 1 || item['isDefault'] == true,
          orElse: () => entries.first,
        );
        _name.text = '${address['name'] ?? ''}';
        _phone.text = '${address['phone'] ?? ''}';
        _province.text = '${address['province'] ?? ''}';
        _city.text = '${address['city'] ?? ''}';
        _district.text = '${address['district'] ?? ''}';
        _address.text = '${address['detail'] ?? ''}';
      }
    } on Exception catch (error) {
      _error = error.toString();
    } finally {
      if (mounted) setState(() => _loadingAddress = false);
    }
  }

  Future<void> _selectSavedAddress() async {
    if (_savedAddresses.isEmpty) {
      await Navigator.of(context).pushNamed('/mine/address');
      if (mounted) await _loadAddress();
      if (mounted) setState(() {});
      return;
    }
    final address = await showModalBottomSheet<JsonMap>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
          child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 18),
        children: [
          Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text('选择收货地址',
                  style: Theme.of(context).textTheme.titleLarge)),
          for (final item in _savedAddresses)
            ListTile(
              leading: Icon(
                  item['isDefault'] == true || item['isDefault'] == 1
                      ? Icons.check_circle_rounded
                      : Icons.location_on_outlined,
                  color: ShopTheme.primaryDark),
              title: Text('${item['name'] ?? ''}  ${item['phone'] ?? ''}'),
              subtitle: Text(
                  '${item['province'] ?? ''}${item['city'] ?? ''}${item['district'] ?? ''}${item['detail'] ?? ''}'),
              onTap: () => Navigator.pop(context, item),
            ),
          OutlinedButton.icon(
              onPressed: () =>
                  Navigator.pop(context, <String, dynamic>{'_manage': true}),
              icon: const Icon(Icons.add_location_alt_outlined),
              label: const Text('管理地址')),
        ],
      )),
    );
    if (address?['_manage'] == true) {
      await Navigator.of(context).pushNamed('/mine/address');
      if (mounted) await _loadAddress();
      if (mounted) setState(() {});
      return;
    }
    if (address == null || !mounted) return;
    setState(() {
      _name.text = '${address['name'] ?? ''}';
      _phone.text = '${address['phone'] ?? ''}';
      _province.text = '${address['province'] ?? ''}';
      _city.text = '${address['city'] ?? ''}';
      _district.text = '${address['district'] ?? ''}';
      _address.text = '${address['detail'] ?? ''}';
    });
    _regionFieldKey.currentState?.didChange(
        '${address['province'] ?? ''}${address['city'] ?? ''}${address['district'] ?? ''}');
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    final controller = context.read<AppController>();
    var orderId = _pendingOrderId;
    try {
      if (orderId == null) {
        final order = asJsonMap(await controller.api.post('/shop/orders', {
          'items': widget.items
              .map((item) => {'skuId': item.skuId, 'quantity': item.quantity})
              .toList(),
          'receiverName': _name.text.trim(),
          'receiverPhone': _phone.text.trim(),
          'receiverAddress':
              '${_province.text}${_city.text}${_district.text}${_address.text.trim()}',
        }));
        orderId = int.tryParse('${order['orderId']}');
        if (orderId == null) throw const ApiException('订单已提交，但没有收到订单编号');
        _pendingOrderId = orderId;
      }

      final payment = asJsonMap(await controller.api.post('/shop/payments', {
        'orderId': orderId,
        'payType': _payType,
      }));
      final paymentNo = '${payment['paymentNo'] ?? ''}';
      final isMock = payment['mode'] == 'mock' || payment['mock'] == true;
      final amount = double.tryParse('${payment['amount'] ?? ''}') ?? 0;
      if (!isMock) {
        final credential = asJsonMap(payment['credential']);
        if (!mounted) return;
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            icon: const Icon(Icons.account_balance_wallet_outlined,
                size: 42, color: ShopTheme.primary),
            title: const Text('支付单已创建'),
            content: Text(
                '${credential['message'] ?? '请在已接入的支付渠道中完成付款。'}\n\n订单号：$orderId\n支付单号：$paymentNo\n应付金额：¥${amount.toStringAsFixed(2)}'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('返回结算'))
            ],
          ),
        );
        return;
      }
      if (paymentNo.isEmpty) throw const ApiException('支付单创建失败，没有返回支付单号');
      await controller.api.post('/shop/payments/$paymentNo/simulate');

      try {
        if (widget.removePurchasedFromCart) {
          for (final item in widget.items) {
            await controller.api.delete('/shop/member/cart/${item.skuId}');
          }
        }
      } catch (_) {
        // Payment has already succeeded; a failed cart cleanup must not turn success into a payment error.
      }
      await controller.loadCart();
      _pendingOrderId = null;
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          icon: Icon(
              isMock ? Icons.check_circle_rounded : Icons.hourglass_top_rounded,
              size: 42,
              color: isMock ? ShopTheme.success : ShopTheme.primary),
          title: Text(isMock ? '模拟支付成功' : '订单已创建'),
          content:
              Text('实付金额 ¥${amount.toStringAsFixed(2)}\n订单已支付，支付单号 $paymentNo'),
          actions: [
            FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('完成'))
          ],
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (mounted)
        setState(() => _error = orderId == null
            ? error.message
            : '订单 #$orderId 已创建，支付没有完成：${error.message}。可重试支付，不会重复创建订单。');
    } on Exception catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    final discount = controller.shopDiscount;
    final listTotal = _listTotal;
    final estimatedTotal = _estimatedTotal(discount);
    final discountAmount = listTotal - estimatedTotal;
    return Scaffold(
      appBar: AppBar(title: const Text('确认订单')),
      body: _loadingAddress
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  children: [
                    _CheckoutCard(
                      title: '收货信息',
                      child: Column(children: [
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton.icon(
                            onPressed: _selectSavedAddress,
                            icon: const Icon(Icons.contacts_outlined, size: 18),
                            label: Text(_savedAddresses.isEmpty
                                ? '添加 / 管理地址'
                                : '选择地址簿'),
                          ),
                        ),
                        TextFormField(
                          controller: _name,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                              labelText: '收货人',
                              prefixIcon: Icon(Icons.person_outline_rounded)),
                          validator: (value) =>
                              value == null || value.trim().isEmpty
                                  ? '请填写收货人'
                                  : null,
                        ),
                        const SizedBox(height: 11),
                        TextFormField(
                          controller: _phone,
                          keyboardType: TextInputType.phone,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                              labelText: '联系电话',
                              prefixIcon: Icon(Icons.phone_iphone_rounded)),
                          validator: (value) => (value?.trim().length ?? 0) < 5
                              ? '请填写有效联系电话'
                              : null,
                        ),
                        const SizedBox(height: 11),
                        FormField<String>(
                          key: _regionFieldKey,
                          initialValue:
                              '${_province.text}${_city.text}${_district.text}',
                          validator: (value) =>
                              value == null || value.isEmpty ? '请选择省市区' : null,
                          builder: (field) => Padding(
                            padding: const EdgeInsets.only(bottom: 11),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () async {
                                final region = await pickChinaRegion(context,
                                    province: _province.text,
                                    city: _city.text,
                                    district: _district.text);
                                if (region == null) return;
                                setState(() {
                                  _province.text = region.province;
                                  _city.text = region.city;
                                  _district.text = region.district;
                                });
                                field.didChange(
                                    '${region.province}${region.city}${region.district}');
                              },
                              child: InputDecorator(
                                decoration: InputDecoration(
                                  labelText: '省市区',
                                  errorText: field.errorText,
                                  prefixIcon:
                                      const Icon(Icons.location_on_outlined),
                                  suffixIcon: const Icon(
                                      Icons.keyboard_arrow_right_rounded),
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
                        TextFormField(
                          controller: _address,
                          minLines: 2,
                          maxLines: 3,
                          decoration: const InputDecoration(
                              labelText: '详细地址',
                              prefixIcon: Icon(Icons.location_on_outlined),
                              alignLabelWithHint: true),
                          validator: (value) =>
                              value == null || value.trim().isEmpty
                                  ? '请填写收货地址'
                                  : null,
                        ),
                      ]),
                    ),
                    const SizedBox(height: 12),
                    _CheckoutCard(
                      title: '商品清单',
                      child: Column(children: [
                        for (var index = 0;
                            index < widget.items.length;
                            index++) ...[
                          if (index > 0) const Divider(height: 20),
                          Row(children: [
                            SizedBox(
                                width: 58,
                                height: 58,
                                child: ShopImage(
                                    url: widget.items[index].image,
                                    radius: 12)),
                            const SizedBox(width: 11),
                            Expanded(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                  Text(widget.items[index].name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleSmall),
                                  const SizedBox(height: 4),
                                  Text(widget.items[index].skuName,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall),
                                ])),
                            const SizedBox(width: 8),
                            Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                      '¥${widget.items[index].memberPrice(discount).toStringAsFixed(2)}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleSmall
                                          ?.copyWith(
                                              color: ShopTheme.primaryDark)),
                                  if (widget.items[index]
                                          .memberPrice(discount) <
                                      widget.items[index].price)
                                    Text(
                                        '¥${widget.items[index].price.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: ShopTheme.mutedInk,
                                            decoration:
                                                TextDecoration.lineThrough)),
                                  Text('×${widget.items[index].quantity}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall),
                                ]),
                          ]),
                        ],
                      ]),
                    ),
                    const SizedBox(height: 12),
                    _CheckoutCard(
                      title: '费用明细',
                      child: Column(children: [
                        _PriceLine(
                            label: '销售价合计',
                            value: '¥${listTotal.toStringAsFixed(2)}'),
                        _PriceLine(
                            label: '会员优惠',
                            value: '-¥${discountAmount.toStringAsFixed(2)}',
                            valueColor: ShopTheme.success),
                        const Divider(height: 18),
                        _PriceLine(
                            label: '商品金额',
                            value: '¥${estimatedTotal.toStringAsFixed(2)}',
                            bold: true),
                        const SizedBox(height: 5),
                        Align(
                            alignment: Alignment.centerLeft,
                            child: Text('提交后由服务端按当前会员等级与商品规则核价。',
                                style: Theme.of(context).textTheme.bodySmall)),
                      ]),
                    ),
                    const SizedBox(height: 12),
                    _CheckoutCard(
                      title: '支付方式',
                      child: Wrap(spacing: 8, children: [
                        ChoiceChip(
                          label: const Text('微信支付'),
                          avatar: const PaymentProviderIcon(
                              provider: 'wechat', size: 20),
                          selected: _payType == 'wechat',
                          onSelected: (_) =>
                              setState(() => _payType = 'wechat'),
                        ),
                        ChoiceChip(
                          label: const Text('支付宝'),
                          avatar: const PaymentProviderIcon(
                              provider: 'alipay', size: 20),
                          selected: _payType == 'alipay',
                          onSelected: (_) =>
                              setState(() => _payType = 'alipay'),
                        ),
                      ]),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!,
                          style: const TextStyle(color: Color(0xFFC83F43))),
                    ],
                  ]),
            ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 11, 18, 11),
          decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: ShopTheme.border))),
          child: Row(children: [
            Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    const Text('预计应付 '),
                    Text('¥${estimatedTotal.toStringAsFixed(2)}',
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(color: ShopTheme.primaryDark)),
                  ]),
                  Text('优惠以后端核价为准',
                      style: Theme.of(context).textTheme.bodySmall),
                ]),
            const Spacer(),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('提交并支付'),
            ),
          ]),
        ),
      ),
    );
  }
}

class _PriceLine extends StatelessWidget {
  const _PriceLine(
      {required this.label,
      required this.value,
      this.valueColor,
      this.bold = false});
  final String label;
  final String value;
  final Color? valueColor;
  final bool bold;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Text(label,
              style: TextStyle(
                  fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
          const Spacer(),
          Text(value,
              style: TextStyle(
                  color: valueColor,
                  fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
        ]),
      );
}

class _CheckoutCard extends StatelessWidget {
  const _CheckoutCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(17),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(20)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 14),
          child,
        ]),
      );
}
