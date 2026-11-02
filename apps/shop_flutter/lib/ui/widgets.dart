import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';

import '../core/app_controller.dart';
import '../core/models.dart';
import 'shop_theme.dart';
import '../features/catalog/catalog_screens.dart';

String imageUrl(String path) {
  if (path.isEmpty) return '';
  final uri = Uri.tryParse(path);
  const configuredBase = String.fromEnvironment('API_BASE_URL');
  final baseUrl = configuredBase.isNotEmpty
      ? configuredBase
      : kIsWeb || defaultTargetPlatform != TargetPlatform.android
          ? 'http://localhost:3000/api/v1'
          : 'http://10.0.2.2:3000/api/v1';
  final base = Uri.parse(baseUrl);
  if (uri != null && uri.hasScheme) {
    final localHost = uri.host == 'localhost' ||
        uri.host == '127.0.0.1' ||
        uri.host == '0.0.0.0';
    if (!kIsWeb && localHost) return uri.replace(host: base.host).toString();
    return path;
  }
  final origin = '${base.scheme}://${base.authority}';
  return '$origin/${path.replaceFirst(RegExp(r'^/+'), '')}';
}

class ShopImage extends StatelessWidget {
  const ShopImage(
      {super.key,
      required this.url,
      this.fit = BoxFit.cover,
      this.radius = 16});
  final String url;
  final BoxFit fit;
  final double radius;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: url.isEmpty
            ? const _ImageFallback()
            : Image.network(
                imageUrl(url),
                fit: fit,
                errorBuilder: (_, __, ___) => const _ImageFallback(),
                loadingBuilder: (context, child, progress) => progress == null
                    ? child
                    : Container(
                        color: const Color(0xFFF0F1F3),
                        child: const Center(
                          child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2)),
                        )),
              ),
      );
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();
  @override
  Widget build(BuildContext context) => Container(
        color: const Color(0xFFF0F1F3),
        alignment: Alignment.center,
        child: const Icon(Icons.image_outlined,
            size: 34, color: Color(0xFFBBC0C6)),
      );
}

class SectionHeading extends StatelessWidget {
  const SectionHeading(
      {super.key, required this.title, this.actionLabel, this.onAction});
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Row(children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        const Spacer(),
        if (actionLabel != null)
          TextButton(
              onPressed: onAction,
              child: Text(actionLabel!,
                  style: const TextStyle(color: ShopTheme.secondaryInk))),
      ]);
}

class EmptyPanel extends StatelessWidget {
  const EmptyPanel({super.key, required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 68,
              height: 68,
              decoration: const BoxDecoration(
                  color: Colors.white, shape: BoxShape.circle),
              child: const Icon(Icons.shopping_bag_outlined,
                  color: ShopTheme.mutedInk, size: 30),
            ),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 5),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall),
          ]),
        ),
      );
}

class ErrorPanel extends StatelessWidget {
  const ErrorPanel({super.key, required this.message, required this.onRetry});
  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off_rounded,
                color: ShopTheme.mutedInk, size: 36),
            const SizedBox(height: 10),
            Text(message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('重新加载')),
          ]),
        ),
      );
}

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final discount =
        context.watch<AppController>().member?.shopDiscount ?? 100.0;
    final memberPrice = product.excludeDiscount
        ? product.price
        : ((product.price * discount / 100 + 1e-10) * 100).round() / 100;
    final struckPrice =
        memberPrice < product.price ? product.price : product.originalPrice;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push<void>(MaterialPageRoute(
          builder: (_) => ProductDetailScreen(productId: product.id),
        )),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              child: Stack(fit: StackFit.expand, children: [
            ShopImage(url: product.image, fit: BoxFit.cover, radius: 0),
            if (product.isGiftPackage)
              Positioned(
                left: 9,
                top: 9,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                      color: ShopTheme.ink.withOpacity(.8),
                      borderRadius: BorderRadius.circular(20)),
                  child: const Text('入会礼包',
                      style: TextStyle(color: Colors.white, fontSize: 10)),
                ),
              ),
            if (product.isMonthlyProduct && !product.isGiftPackage)
              Positioned(
                left: 9,
                top: 9,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                      color: ShopTheme.primaryDark.withOpacity(.9),
                      borderRadius: BorderRadius.circular(20)),
                  child: const Text('月度领货',
                      style: TextStyle(color: Colors.white, fontSize: 10)),
                ),
              ),
          ])),
          Padding(
            padding: const EdgeInsets.fromLTRB(11, 10, 11, 12),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(height: 1.25)),
              const SizedBox(height: 8),
              Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Expanded(
                    child: Text('¥${memberPrice.toStringAsFixed(2)}',
                        maxLines: 1,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(color: ShopTheme.primaryDark))),
                if (struckPrice > memberPrice)
                  Text('¥${struckPrice.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontSize: 10,
                          color: ShopTheme.mutedInk,
                          decoration: TextDecoration.lineThrough)),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

class PaymentProviderIcon extends StatelessWidget {
  const PaymentProviderIcon({
    super.key,
    required this.provider,
    this.size = 44,
  });

  final String provider;
  final double size;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(size * .25),
        child: SizedBox.square(
          dimension: size,
          child: provider == 'wechat'
              ? ColoredBox(
                  color: const Color(0xFF07C160),
                  child: CustomPaint(painter: _WeChatBrandPainter()),
                )
              : DecoratedBox(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF1687FF), Color(0xFF0568E8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '支',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: size * .62,
                        height: 1,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
        ),
      );
}

class _WeChatBrandPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 48, size.height / 48);
    final bubble = Paint()..color = Colors.white;
    final eye = Paint()..color = const Color(0xFF07C160);
    final main = Path()
      ..addRRect(RRect.fromRectAndRadius(
          const Rect.fromLTWH(4, 16, 27, 20), const Radius.circular(9)))
      ..moveTo(10, 32)
      ..lineTo(6, 41)
      ..lineTo(18, 34);
    final secondary = Path()
      ..addRRect(RRect.fromRectAndRadius(
          const Rect.fromLTWH(21, 6, 22, 17), const Radius.circular(8)))
      ..moveTo(36, 20)
      ..lineTo(41, 27)
      ..lineTo(30, 22);
    canvas.drawPath(main, bubble);
    canvas.drawPath(secondary, bubble);
    for (final point in const [Offset(12, 25), Offset(23, 25)]) {
      canvas.drawCircle(point, 1.7, eye);
    }
    for (final point in const [Offset(28, 13), Offset(37, 13)]) {
      canvas.drawCircle(point, 1.4, eye);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class PaymentMethodPickerSheet extends StatelessWidget {
  const PaymentMethodPickerSheet({
    super.key,
    this.title = '选择支付方式',
    this.subtitle = '请选择一种安全的支付方式',
    this.amount,
  });

  final String title;
  final String subtitle;
  final double? amount;

  @override
  Widget build(BuildContext context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 18),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFD8DCE1),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 19),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      Text(subtitle,
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                if (amount != null) ...[
                  const SizedBox(width: 12),
                  Text('¥${amount!.toStringAsFixed(2)}',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(color: ShopTheme.primaryDark)),
                ],
              ]),
              const SizedBox(height: 18),
              _PaymentMethodOption(
                provider: 'wechat',
                title: '微信支付',
                subtitle: '微信安全支付',
                onTap: () => Navigator.pop(context, 'wechat'),
              ),
              const SizedBox(height: 10),
              _PaymentMethodOption(
                provider: 'alipay',
                title: '支付宝',
                subtitle: '支付宝快捷支付',
                onTap: () => Navigator.pop(context, 'alipay'),
              ),
              const SizedBox(height: 6),
            ]),
          ),
        ),
      );
}

class _PaymentMethodOption extends StatelessWidget {
  const _PaymentMethodOption({
    required this.provider,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String provider;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: const Color(0xFFFFFBF9),
        borderRadius: BorderRadius.circular(17),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(17),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(17),
              border: Border.all(color: ShopTheme.border),
            ),
            child: Row(children: [
              PaymentProviderIcon(provider: provider, size: 44),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 3),
                    Text(subtitle,
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: ShopTheme.mutedInk),
            ]),
          ),
        ),
      );
}

class ProductGrid extends StatelessWidget {
  const ProductGrid(
      {super.key, required this.products, this.padding = EdgeInsets.zero});
  final List<Product> products;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) =>
      LayoutBuilder(builder: (context, constraints) {
        final columns = constraints.maxWidth > 600 ? 4 : 2;
        final outer = padding.resolve(Directionality.of(context));
        final width =
            (constraints.maxWidth - outer.horizontal - (columns - 1) * 12) /
                columns;
        return Padding(
          padding: padding,
          child: Wrap(
            spacing: 12,
            runSpacing: 14,
            children: [
              for (final product in products)
                SizedBox(
                    width: width,
                    height: width * 1.52,
                    child: ProductCard(product: product)),
            ],
          ),
        );
      });
}
