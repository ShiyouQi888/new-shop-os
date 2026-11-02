import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../core/models.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';
import '../auth/auth_screen.dart';
import '../cart/checkout_screen.dart';

class CategoryScreen extends StatefulWidget {
  const CategoryScreen({super.key, this.initialCategoryId});
  final int? initialCategoryId;

  @override
  CategoryScreenState createState() => CategoryScreenState();
}

class CategoryScreenState extends State<CategoryScreen> {
  final _searchController = TextEditingController();
  int? _selectedCategory;
  int _sortIndex = 0;
  List<Product> _products = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategoryId;
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _load(categoryId: _selectedCategory));
  }

  void selectCategory(int? categoryId) => _load(categoryId: categoryId);

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load({int? categoryId}) async {
    setState(() {
      _loading = true;
      _error = null;
      _selectedCategory = categoryId;
    });
    try {
      final controller = context.read<AppController>();
      await controller.loadCategories();
      final products = await controller.loadProducts(
          categoryId: categoryId, keyword: _searchController.text);
      if (mounted) setState(() => _products = products);
    } on Exception catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Product> get _sortedProducts {
    final products = [..._products];
    if (_sortIndex == 1) {
      products.sort((a, b) => a.price.compareTo(b.price));
    } else if (_sortIndex == 2) {
      products.sort((a, b) => b.id.compareTo(a.id));
    } else {
      products.sort((a, b) {
        final bySort = a.sort.compareTo(b.sort);
        return bySort == 0 ? b.id.compareTo(a.id) : bySort;
      });
    }
    return products;
  }

  @override
  Widget build(BuildContext context) {
    final categories = context.watch<AppController>().categories;
    final activeId = _selectedCategory;
    ShopCategory? activeCategory;
    if (activeId != null) {
      for (final category in categories) {
        if (category.id == activeId) {
          activeCategory = category;
          break;
        }
      }
    }
    Widget catalogPanel() => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
          ),
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 17, 12, 2),
              child: Row(children: [
                Expanded(
                  child: Text(
                    activeCategory?.name ?? '全部商品',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                const Icon(Icons.grid_view_rounded,
                    color: ShopTheme.mutedInk, size: 19),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 7),
              child: TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _load(categoryId: activeId),
                decoration: InputDecoration(
                  hintText: '搜索商品、品牌或礼包',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: IconButton(
                      onPressed: () => _load(categoryId: activeId),
                      icon: const Icon(Icons.arrow_forward_rounded)),
                  isDense: true,
                ),
              ),
            ),
            SizedBox(
                height: 37,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: [
                    for (var index = 0; index < 3; index++)
                      Padding(
                        padding: const EdgeInsets.only(right: 7),
                        child: ChoiceChip(
                          label: Text(['推荐', '价格从低到高', '新品'][index]),
                          selected: _sortIndex == index,
                          onSelected: (_) => setState(() => _sortIndex = index),
                          visualDensity: VisualDensity.compact,
                          labelStyle: TextStyle(
                              fontSize: 11,
                              color: _sortIndex == index
                                  ? ShopTheme.primaryDark
                                  : ShopTheme.secondaryInk),
                        ),
                      ),
                  ],
                )),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 7, 14, 8),
              child: Row(children: [
                Text('${_sortedProducts.length} 件精选商品',
                    style: Theme.of(context).textTheme.bodySmall),
                const Spacer(),
                if (_searchController.text.trim().isNotEmpty)
                  Text('搜索：${_searchController.text.trim()}',
                      style: Theme.of(context).textTheme.bodySmall),
              ]),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? ErrorPanel(
                          message: _error!,
                          onRetry: () => _load(categoryId: activeId))
                      : _sortedProducts.isEmpty
                          ? const EmptyPanel(
                              title: '暂无商品', subtitle: '换个分类或关键词试试')
                          : GridView.builder(
                              padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 10,
                                mainAxisSpacing: 12,
                                childAspectRatio: .62,
                              ),
                              itemCount: _sortedProducts.length,
                              itemBuilder: (context, index) =>
                                  ProductCard(product: _sortedProducts[index]),
                            ),
            ),
          ]),
        );

    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
        child: Row(children: [
          Text('商品分类', style: Theme.of(context).textTheme.headlineSmall),
          const Spacer(),
          IconButton(
              onPressed: () => _load(categoryId: activeId),
              icon: const Icon(Icons.refresh_rounded)),
        ]),
      ),
      Expanded(
        child: LayoutBuilder(builder: (context, constraints) {
          final railWidth = constraints.maxWidth < 380
              ? 82.0
              : constraints.maxWidth < 450
                  ? 92.0
                  : constraints.maxWidth < 620
                      ? 124.0
                      : 168.0;
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(
              width: railWidth,
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  color: Color(0xFFF0F2F4),
                  border: Border(
                    right: BorderSide(color: ShopTheme.border, width: .7),
                  ),
                ),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(7, 7, 6, 16),
                  children: [
                    _CategoryRailItem(
                      title: '全部商品',
                      selected: activeId == null,
                      onTap: () => _load(),
                    ),
                    ...categories.map((category) => _CategoryRailItem(
                          title: category.name,
                          selected: activeId == category.id,
                          onTap: () => _load(categoryId: category.id),
                        )),
                  ],
                ),
              ),
            ),
            Expanded(child: catalogPanel()),
          ]);
        }),
      ),
    ]);
  }
}

class _CategoryRailItem extends StatelessWidget {
  const _CategoryRailItem(
      {required this.title, required this.selected, required this.onTap});
  final String title;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 5),
        child: Material(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
              child: Row(children: [
                if (selected)
                  Container(
                    width: 3,
                    height: 17,
                    margin: const EdgeInsets.only(right: 7),
                    decoration: BoxDecoration(
                        color: ShopTheme.primary,
                        borderRadius: BorderRadius.circular(4)),
                  ),
                Expanded(
                    child: Text(title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: selected
                              ? ShopTheme.primaryDark
                              : ShopTheme.secondaryInk,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.w500,
                          fontSize: 12,
                        ))),
              ]),
            ),
          ),
        ),
      );
}

class ProductSearchScreen extends StatefulWidget {
  const ProductSearchScreen({super.key, required this.keyword});
  final String keyword;

  @override
  State<ProductSearchScreen> createState() => _ProductSearchScreenState();
}

class _ProductSearchScreenState extends State<ProductSearchScreen> {
  late Future<List<Product>> _products;

  @override
  void initState() {
    super.initState();
    _products =
        context.read<AppController>().loadProducts(keyword: widget.keyword);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text('搜索「${widget.keyword}」')),
        body: FutureBuilder<List<Product>>(
          future: _products,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError)
              return ErrorPanel(
                message: '${snapshot.error}',
                onRetry: () async => setState(() => _products = context
                    .read<AppController>()
                    .loadProducts(keyword: widget.keyword)),
              );
            final products = snapshot.data ?? [];
            if (products.isEmpty)
              return const EmptyPanel(title: '没有找到相关商品', subtitle: '试试其他关键词');
            return ProductGrid(
                products: products, padding: const EdgeInsets.all(16));
          },
        ),
      );
}

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});
  final int productId;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late Future<({Product product, List<ProductSku> skus})> _detail;
  ProductSku? _selectedSku;
  int _quantity = 1;
  int _galleryIndex = 0;
  bool _adding = false;
  bool _favorited = false;
  bool _savingFavorite = false;

  @override
  void initState() {
    super.initState();
    _detail = _loadDetail();
  }

  Future<({Product product, List<ProductSku> skus})> _loadDetail() async {
    final controller = context.read<AppController>();
    final detail = await controller.loadProduct(widget.productId);
    unawaited(_trackProduct(controller));
    return detail;
  }

  Future<void> _trackProduct(AppController controller) async {
    if (!controller.isSignedIn) return;
    try {
      await controller.api
          .post('/shop/member/history', {'spuId': widget.productId});
      final favorites =
          asList(await controller.api.get('/shop/member/favorites'))
              .map(asJsonMap);
      final isFavorited =
          favorites.any((item) => '${item['spuId']}' == '${widget.productId}');
      if (mounted) setState(() => _favorited = isFavorited);
    } on Exception {
      // Browsing history and favorites do not block product detail rendering.
    }
  }

  Future<void> _toggleFavorite() async {
    final controller = context.read<AppController>();
    if (!controller.isSignedIn) {
      final signedIn = await Navigator.of(context)
          .push<bool>(MaterialPageRoute(builder: (_) => const AuthScreen()));
      if (signedIn != true || !mounted) return;
    }
    setState(() => _savingFavorite = true);
    try {
      if (_favorited) {
        await controller.api
            .delete('/shop/member/favorites/${widget.productId}');
      } else {
        await controller.api
            .post('/shop/member/favorites', {'spuId': widget.productId});
      }
      if (mounted) setState(() => _favorited = !_favorited);
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _savingFavorite = false);
    }
  }

  Future<void> _add(ProductSku? sku) async {
    if (sku == null || sku.stock <= 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('当前规格暂时缺货')));
      return;
    }
    if (_quantity > sku.stock) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('库存不足，当前最多可购买 ${sku.stock} 件')));
      return;
    }
    final controller = context.read<AppController>();
    if (!controller.isSignedIn) {
      final signedIn = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const AuthScreen()),
      );
      if (signedIn != true || !mounted) return;
    }
    setState(() => _adding = true);
    try {
      await controller.addToCart(sku, quantity: _quantity);
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已加入购物车')),
        );
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  Future<void> _buyNow(Product product, ProductSku? sku) async {
    if (sku == null || sku.stock <= 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('当前规格暂时缺货')));
      return;
    }
    if (_quantity > sku.stock) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('库存不足，当前最多可购买 ${sku.stock} 件')));
      return;
    }
    final controller = context.read<AppController>();
    if (!controller.isSignedIn) {
      final signedIn = await Navigator.of(context)
          .push<bool>(MaterialPageRoute(builder: (_) => const AuthScreen()));
      if (signedIn != true || !mounted) return;
    }
    final item = CartItem(
      skuId: sku.id,
      productId: product.id,
      name: product.name,
      skuName: sku.name,
      image: sku.image.isEmpty ? product.image : sku.image,
      price: sku.price,
      originalPrice: sku.originalPrice,
      excludeDiscount: product.excludeDiscount,
      stock: sku.stock,
      quantity: _quantity,
      selected: true,
    );
    await Navigator.of(context).push<void>(MaterialPageRoute(
      builder: (_) =>
          CheckoutScreen(items: [item], removePurchasedFromCart: false),
    ));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('商品详情'),
          actions: [
            IconButton(
              tooltip: _favorited ? '取消收藏' : '收藏商品',
              onPressed: _savingFavorite ? null : _toggleFavorite,
              icon: Icon(
                  _favorited
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  color: _favorited ? ShopTheme.primary : null),
            )
          ],
        ),
        body: FutureBuilder<({Product product, List<ProductSku> skus})>(
          future: _detail,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError || !snapshot.hasData) {
              return ErrorPanel(
                message: snapshot.hasError ? '${snapshot.error}' : '商品不存在或已下架',
                onRetry: () async => setState(() => _detail = _loadDetail()),
              );
            }
            final product = snapshot.data!.product;
            final skus = snapshot.data!.skus;
            final sku = _selectedSku ??
                (skus.isEmpty
                    ? null
                    : skus.firstWhere((item) => item.stock > 0,
                        orElse: () => skus.first));
            if (_selectedSku == null && sku != null) _selectedSku = sku;
            final inStock = sku != null && sku.stock > 0;
            if (sku != null && _quantity > sku.stock && inStock)
              _quantity = sku.stock;
            final memberDiscount =
                context.watch<AppController>().member?.shopDiscount ?? 100;
            final memberPrice = sku == null || product.excludeDiscount
                ? (sku?.price ?? product.price)
                : ((sku.price * memberDiscount / 100 + 1e-10) * 100).round() /
                    100;
            final gallery = <String>{
              ...product.images,
              if (sku?.image.isNotEmpty == true) sku!.image,
            }.where((image) => image.isNotEmpty).toList();
            return Column(children: [
              Expanded(
                child: ListView(
                    padding: const EdgeInsets.only(bottom: 24),
                    children: [
                      Stack(children: [
                        SizedBox(
                          height: MediaQuery.sizeOf(context)
                              .width
                              .clamp(280, 520)
                              .toDouble(),
                          child: PageView.builder(
                            key: ValueKey('${product.id}:${sku?.id ?? 0}'),
                            itemCount: gallery.isEmpty ? 1 : gallery.length,
                            onPageChanged: (index) =>
                                setState(() => _galleryIndex = index),
                            itemBuilder: (context, index) => ShopImage(
                              url: gallery.isEmpty
                                  ? product.image
                                  : gallery[index],
                              fit: BoxFit.cover,
                              radius: 0,
                            ),
                          ),
                        ),
                        Positioned(
                            left: 16,
                            bottom: 14,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                  color: const Color(0xAA20262C),
                                  borderRadius: BorderRadius.circular(20)),
                              child: Text(
                                  product.isGiftPackage
                                      ? '入会权益礼包'
                                      : product.isMonthlyProduct
                                          ? '月度领货商品'
                                          : '精选商品',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700)),
                            )),
                        if (gallery.length > 1)
                          Positioned(
                              right: 16,
                              bottom: 16,
                              child: Row(children: [
                                Text('${_galleryIndex + 1}/${gallery.length}',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700)),
                              ])),
                      ]),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                const Icon(Icons.inventory_2_outlined,
                                    size: 16, color: ShopTheme.mutedInk),
                                const SizedBox(width: 5),
                                Text(inStock ? '库存 ${sku!.stock} 件' : '暂时缺货',
                                    style:
                                        Theme.of(context).textTheme.bodySmall),
                              ]),
                              const SizedBox(height: 8),
                              Wrap(
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  spacing: 9,
                                  runSpacing: 4,
                                  children: [
                                    Text('¥${memberPrice.toStringAsFixed(2)}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .headlineMedium
                                            ?.copyWith(
                                                color: ShopTheme.primaryDark)),
                                    if (sku != null && memberPrice < sku.price)
                                      Text(
                                          '销售价 ¥${sku.price.toStringAsFixed(2)}',
                                          style: const TextStyle(
                                              color: ShopTheme.mutedInk,
                                              decoration:
                                                  TextDecoration.lineThrough)),
                                    if (sku != null &&
                                        sku.originalPrice > sku.price)
                                      Text(
                                          '参考原价 ¥${sku.originalPrice.toStringAsFixed(2)}',
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall),
                                  ]),
                              if (sku != null &&
                                  memberPrice < sku.price &&
                                  (context
                                              .read<AppController>()
                                              .member
                                              ?.level ??
                                          0) >
                                      0) ...[
                                const SizedBox(height: 7),
                                Text(
                                    '${context.read<AppController>().member!.levelName}专享价，已省 ¥${(sku.price - memberPrice).toStringAsFixed(2)}',
                                    style: const TextStyle(
                                        color: ShopTheme.success,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700)),
                              ],
                              const SizedBox(height: 9),
                              Text(product.name,
                                  style:
                                      Theme.of(context).textTheme.titleLarge),
                              if (product.description.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(product.description,
                                    style:
                                        Theme.of(context).textTheme.bodyMedium),
                              ],
                              const SizedBox(height: 22),
                              if (product.isGiftPackage) ...[
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                      color: ShopTheme.primarySoft,
                                      borderRadius: BorderRadius.circular(18)),
                                  child: const Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text('入会权益',
                                            style: TextStyle(
                                                fontWeight: FontWeight.w800)),
                                        SizedBox(height: 10),
                                        Text('开通方案后可享会员专属价、月度领货额度与推广权益。'),
                                        SizedBox(height: 8),
                                        Text('各等级权益与适用规则请查看入会专区。'),
                                      ]),
                                ),
                                const SizedBox(height: 16),
                              ],
                              Text('选择规格',
                                  style:
                                      Theme.of(context).textTheme.titleMedium),
                              const SizedBox(height: 12),
                              if (skus.isEmpty)
                                const Text('暂无可售规格',
                                    style: TextStyle(color: ShopTheme.mutedInk))
                              else
                                Wrap(spacing: 9, runSpacing: 9, children: [
                                  for (final option in skus)
                                    ChoiceChip(
                                      label: Text(
                                          '${option.name}${option.stock <= 0 ? ' · 缺货' : ''}'),
                                      selected: sku?.id == option.id,
                                      onSelected: (_) => setState(() {
                                        _selectedSku = option;
                                        _quantity = option.stock > 0
                                            ? _quantity
                                                .clamp(1, option.stock)
                                                .toInt()
                                            : 1;
                                        _galleryIndex = 0;
                                      }),
                                    ),
                                ]),
                              if (sku != null && skus.length > 1) ...[
                                const SizedBox(height: 8),
                                Text(inStock ? '库存 ${sku.stock} 件' : '该规格暂时缺货',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(
                                            color: inStock
                                                ? ShopTheme.mutedInk
                                                : const Color(0xFFE5484D))),
                              ],
                              const SizedBox(height: 20),
                              Row(children: [
                                Text('购买数量',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium),
                                const Spacer(),
                                _QuantityControl(
                                  value: _quantity,
                                  max: sku?.stock ?? 0,
                                  onChanged: (next) =>
                                      setState(() => _quantity = next),
                                ),
                              ]),
                              const SizedBox(height: 22),
                              const Divider(),
                              const SizedBox(height: 12),
                              Text('商品介绍',
                                  style:
                                      Theme.of(context).textTheme.titleMedium),
                              const SizedBox(height: 8),
                              Text(
                                  product.description.isEmpty
                                      ? '品质精选，详情请以商品实物为准。'
                                      : product.description,
                                  style:
                                      Theme.of(context).textTheme.bodyMedium),
                              const SizedBox(height: 14),
                              const Wrap(spacing: 16, runSpacing: 8, children: [
                                _ServiceBadge(
                                    icon: Icons.verified_outlined,
                                    label: '正品保障'),
                                _ServiceBadge(
                                    icon: Icons.local_shipping_outlined,
                                    label: '快速履约'),
                                _ServiceBadge(
                                    icon: Icons.support_agent_outlined,
                                    label: '专属客服'),
                              ]),
                            ]),
                      ),
                    ]),
              ),
              SafeArea(
                top: false,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(18, 10, 18, 10),
                  decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: ShopTheme.border))),
                  child: Row(children: [
                    IconButton(
                        tooltip: '联系客服',
                        onPressed: () => ScaffoldMessenger.of(context)
                            .showSnackBar(const SnackBar(
                                content: Text('专属客服已接入，请稍后查看消息通知'))),
                        icon: const Icon(Icons.support_agent_outlined)),
                    if (!product.isGiftPackage) ...[
                      Expanded(
                          child: OutlinedButton.icon(
                        onPressed: _adding || !inStock ? null : () => _add(sku),
                        icon: _adding
                            ? const SizedBox(
                                width: 17,
                                height: 17,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.add_shopping_cart_rounded),
                        label: Text(_adding ? '正在加入' : '加入购物车'),
                        style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(
                                ShopTheme.purchaseButtonHeight)),
                      )),
                      const SizedBox(width: 9),
                    ],
                    Expanded(
                        child: FilledButton.icon(
                      onPressed: _adding
                          ? null
                          : product.isGiftPackage
                              ? () =>
                                  Navigator.of(context).pushNamed('/gift-zone')
                              : !inStock
                                  ? null
                                  : () => _buyNow(product, sku),
                      icon: const Icon(Icons.flash_on_rounded),
                      label: Text(product.isGiftPackage ? '查看入会方案' : '立即购买'),
                      style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(
                              ShopTheme.purchaseButtonHeight)),
                    )),
                  ]),
                ),
              ),
            ]);
          },
        ),
      );
}

class _ServiceBadge extends StatelessWidget {
  const _ServiceBadge({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 15, color: ShopTheme.mutedInk),
        const SizedBox(width: 4),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ]);
}

class _QuantityControl extends StatelessWidget {
  const _QuantityControl(
      {required this.value, required this.max, required this.onChanged});
  final int value;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: ShopTheme.canvas, borderRadius: BorderRadius.circular(12)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          IconButton(
              onPressed: value > 1 ? () => onChanged(value - 1) : null,
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.remove_rounded, size: 18)),
          Text('$value', style: Theme.of(context).textTheme.titleSmall),
          IconButton(
              onPressed: value < max ? () => onChanged(value + 1) : null,
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.add_rounded, size: 18)),
        ]),
      );
}
