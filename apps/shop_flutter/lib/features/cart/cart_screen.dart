import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../core/models.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';
import 'checkout_screen.dart';

Future<void> _runCartAction(BuildContext context, Future<void> Function() action) async {
  try {
    await action();
  } on ApiException catch (error) {
    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
  } on Exception catch (error) {
    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
  }
}

class CartScreen extends StatelessWidget {
  const CartScreen({super.key, required this.onLogin});
  final Future<void> Function() onLogin;

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 16, 14),
        child: Row(children: [
          Text('购物车', style: Theme.of(context).textTheme.headlineSmall),
          const Spacer(),
          if (controller.cart.isNotEmpty) Text('${controller.cart.length} 件', style: Theme.of(context).textTheme.bodyMedium),
        ]),
      ),
      Expanded(
        child: !controller.isSignedIn
            ? _CartLoginPanel(onLogin: onLogin)
            : controller.loadingCart && controller.cart.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : controller.cart.isEmpty
                    ? const EmptyPanel(title: '购物车还是空的', subtitle: '去商城看看，挑几件喜欢的好物')
                    : RefreshIndicator(
                        onRefresh: controller.loadCart,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                          itemCount: controller.cart.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            return _CartItemCard(item: controller.cart[index]);
                          },
                        ),
                      ),
      ),
      if (controller.isSignedIn && controller.cart.isNotEmpty)
        SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(18, 10, 18, 10),
            decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: ShopTheme.border))),
            child: Row(children: [
              TextButton.icon(
                onPressed: () => _runCartAction(context, () => controller.selectAll(!controller.allCartSelected)),
                icon: Icon(controller.allCartSelected ? Icons.check_circle_rounded : Icons.circle_outlined),
                label: const Text('全选'),
              ),
              const Spacer(),
              Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
                Text('应付 ¥${controller.selectedTotal.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(color: ShopTheme.primaryDark)),
                if (controller.selectedDiscount > 0)
                  Text('已省 ¥${controller.selectedDiscount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11, color: ShopTheme.success)),
              ]),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: controller.selectedTotal <= 0
                    ? null
                    : () => Navigator.of(context).push<void>(MaterialPageRoute(
                          builder: (_) => CheckoutScreen(items: controller.cart.where((item) => item.selected).toList()),
                        )),
                child: const Text('去结算'),
              ),
            ]),
          ),
        ),
    ]);
  }
}

class _CartLoginPanel extends StatelessWidget {
  const _CartLoginPanel({required this.onLogin});
  final Future<void> Function() onLogin;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const EmptyPanel(title: '登录后查看购物车', subtitle: '商品和购物车会同步保存到你的账号'),
          FilledButton(onPressed: onLogin, child: const Text('登录 / 注册')),
        ]),
      );
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({required this.item});
  final CartItem item;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<AppController>();
    final memberPrice = item.memberPrice(controller.shopDiscount);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(19)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Checkbox.adaptive(
          value: item.selected,
          onChanged: (value) => _runCartAction(context, () => controller.setCartItem(item, selected: value ?? false)),
          activeColor: ShopTheme.primary,
          visualDensity: VisualDensity.compact,
        ),
        SizedBox(width: 60, height: 60, child: ShopImage(url: item.image, radius: 13)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(item.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 4),
          Text(item.skuName, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 7),
          Row(children: [
            Text('¥${memberPrice.toStringAsFixed(2)}', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: ShopTheme.primaryDark)),
            if (memberPrice < item.price) ...[
              const SizedBox(width: 7),
              Text('¥${item.price.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11, color: ShopTheme.mutedInk, decoration: TextDecoration.lineThrough)),
            ],
          ]),
          const SizedBox(height: 3),
          Text(item.stock <= 0 ? '当前缺货' : '库存 ${item.stock} 件', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: item.stock <= 0 ? const Color(0xFFE5484D) : null)),
          const SizedBox(height: 4),
          Row(children: [
            _QuantityButton(icon: Icons.remove_rounded, onTap: item.quantity > 1
                ? () => _runCartAction(context, () => controller.setCartItem(item, quantity: item.quantity - 1))
                : null),
            Padding(padding: const EdgeInsets.symmetric(horizontal: 9), child: Text('${item.quantity}')),
            _QuantityButton(icon: Icons.add_rounded, onTap: item.quantity < item.stock
                ? () => _runCartAction(context, () => controller.setCartItem(item, quantity: item.quantity + 1))
                : null),
            const Spacer(),
            IconButton(
              visualDensity: VisualDensity.compact,
              onPressed: () => _runCartAction(context, () => controller.removeCartItem(item)),
              tooltip: '移除商品',
              icon: const Icon(Icons.delete_outline_rounded, size: 19, color: ShopTheme.mutedInk),
            ),
          ]),
        ])),
      ]),
    );
  }
}

class _QuantityButton extends StatelessWidget {
  const _QuantityButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 27,
          height: 27,
          decoration: BoxDecoration(color: ShopTheme.canvas, borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, size: 15, color: onTap == null ? ShopTheme.mutedInk : ShopTheme.ink),
        ),
      );
}
