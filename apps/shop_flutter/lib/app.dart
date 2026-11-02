import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'core/app_controller.dart';
import 'core/models.dart';
import 'features/auth/auth_screen.dart';
import 'features/agent/agent_screens.dart';
import 'features/agent/credit_redeem_screen.dart';
import 'features/agent/gift_zone_screen.dart';
import 'features/cart/cart_screen.dart';
import 'features/cart/checkout_screen.dart';
import 'features/catalog/catalog_screens.dart';
import 'features/common/support_screens.dart';
import 'features/profile/account_screens.dart';
import 'features/profile/profile_screen.dart';
import 'ui/shop_theme.dart';
import 'ui/widgets.dart';

class ShopOsApp extends StatelessWidget {
  const ShopOsApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: '橙选商城',
        debugShowCheckedModeBanner: false,
        theme: ShopTheme.light,
        locale: const Locale('zh', 'CN'),
        supportedLocales: const [Locale('zh', 'CN')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        home: const StorefrontShell(),
        onGenerateRoute: _generateShopRoute,
        onGenerateInitialRoutes: (name) {
          if (name == '/') return [MaterialPageRoute<void>(builder: (_) => const StorefrontShell())];
          final route = _generateShopRoute(RouteSettings(name: name));
          final path = Uri.tryParse(name)?.path;
          if (route != null && const {'/home', '/category', '/cart', '/mine'}.contains(path)) return [route];
          return route == null
              ? [MaterialPageRoute<void>(builder: (_) => const StorefrontShell())]
              : [MaterialPageRoute<void>(builder: (_) => const StorefrontShell()), route];
        },
      );
}

Route<dynamic>? _generateShopRoute(RouteSettings settings) {
  final uri = Uri.tryParse(settings.name ?? '/');
  if (uri == null) return null;
  final path = uri.path;
  final segments = uri.pathSegments;
  Widget? page;
  var requiresMember = false;
  var requiresAgent = false;
  switch (path) {
    case '/home': page = const StorefrontShell(initialIndex: 0); break;
    case '/category': page = StorefrontShell(initialIndex: 1, initialCategoryId: int.tryParse(uri.queryParameters['id'] ?? '')); break;
    case '/cart': page = const StorefrontShell(initialIndex: 2); break;
    case '/mine': page = const StorefrontShell(initialIndex: 3); break;
    case '/login': page = const AuthScreen(); break;
    case '/register': page = AuthScreen(initialRegister: true, inviteCode: uri.queryParameters['invite'] ?? ''); break;
    case '/orders': page = OrdersScreen(initialStatusTab: (int.tryParse(uri.queryParameters['status'] ?? '0') ?? 0).clamp(0, 4).toInt()); requiresMember = true; break;
    case '/mine/address': page = const AddressListScreen(); requiresMember = true; break;
    case '/mine/favorites': page = const FavoritesScreen(); requiresMember = true; break;
    case '/mine/history': page = const BrowsingHistoryScreen(); requiresMember = true; break;
    case '/mine/notifications': page = const NotificationsScreen(); requiresMember = true; break;
    case '/mine/help': page = const HelpScreen(); requiresMember = true; break;
    case '/mine/work-orders': page = const WorkOrderScreen(); requiresMember = true; break;
    case '/mine/rules': page = const RulesScreen(); requiresMember = true; break;
    case '/gift-zone': page = const GiftZoneScreen(); requiresMember = true; break;
    case '/agent': page = const AgentDashboardScreen(); requiresMember = true; requiresAgent = true; break;
    case '/agent/credit': page = const MonthlyCreditScreen(); requiresMember = true; break;
    case '/agent/credit-pool': page = const CreditRedeemScreen(); requiresMember = true; break;
    case '/agent/resell': page = const ResellCenterScreen(); requiresMember = true; break;
    case '/agent/commission': page = const CommissionScreen(); requiresMember = true; requiresAgent = true; break;
    case '/agent/withdraw-account': page = const PayoutAccountScreen(); requiresMember = true; requiresAgent = true; break;
    case '/agent/team': page = const TeamScreen(); requiresMember = true; requiresAgent = true; break;
    case '/agent/promote': page = const PromotionScreen(); requiresMember = true; requiresAgent = true; break;
    case '/checkout':
      requiresMember = true;
      page = Builder(builder: (context) {
        final items = context.read<AppController>().cart.where((item) => item.selected).toList();
        return items.isEmpty ? const StorefrontShell(initialIndex: 2) : CheckoutScreen(items: items);
      });
      break;
    default:
      if (segments.length == 2 && segments.first == 'product') {
        final id = int.tryParse(segments[1]);
        if (id != null) page = ProductDetailScreen(productId: id);
      } else if (segments.length == 2 && segments.first == 'r') {
        page = AuthScreen(initialRegister: true, inviteCode: segments[1]);
      }
  }
  if (page == null) return null;
  final target = page;
  return MaterialPageRoute<dynamic>(
    settings: settings,
    builder: (context) => requiresMember
        ? _MemberRoute(page: target, requiresAgent: requiresAgent)
        : target,
  );
}

class _MemberRoute extends StatelessWidget {
  const _MemberRoute({required this.page, this.requiresAgent = false});
  final Widget page;
  final bool requiresAgent;

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    if (!controller.isSignedIn) {
      return Scaffold(appBar: AppBar(), body: Center(child: FilledButton(onPressed: () => Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => const AuthScreen())), child: const Text('登录后继续'))));
    }
    if (requiresAgent && (controller.member?.level ?? 0) <= 0) {
      return Scaffold(appBar: AppBar(title: const Text('会员权益')), body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('开通会员方案后可使用该功能', textAlign: TextAlign.center),
        const SizedBox(height: 14),
        FilledButton(onPressed: () => Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => const GiftZoneScreen())), child: const Text('查看入会方案')),
      ]))));
    }
    return page;
  }
}

class StorefrontShell extends StatefulWidget {
  const StorefrontShell({super.key, this.initialIndex = 0, this.initialCategoryId});
  final int initialIndex;
  final int? initialCategoryId;

  @override
  State<StorefrontShell> createState() => _StorefrontShellState();
}

class _StorefrontShellState extends State<StorefrontShell> {
  late int _selectedIndex = widget.initialIndex.clamp(0, 3).toInt();
  final _categoryKey = GlobalKey<CategoryScreenState>();

  void _openCategory(int? categoryId) {
    setState(() => _selectedIndex = 1);
    _categoryKey.currentState?.selectCategory(categoryId);
  }

  void _openBanner(String link) {
    final target = link.trim();
    if (target.startsWith('/')) Navigator.of(context).pushNamed(target);
  }

  Future<void> _openAuth() async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const AuthScreen()),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    final pages = <Widget>[
      const HomeScreen(),
      CategoryScreen(key: _categoryKey, initialCategoryId: widget.initialCategoryId),
      CartScreen(onLogin: _openAuth),
      ProfileScreen(onLogin: _openAuth),
    ];

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: IndexedStack(index: _selectedIndex, children: pages),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: SizedBox(
          height: 68,
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 760),
              child: NavigationBar(
                selectedIndex: _selectedIndex,
                onDestinationSelected: (index) => setState(() => _selectedIndex = index),
                destinations: [
                  const NavigationDestination(
                    icon: Icon(Icons.storefront_outlined),
                    selectedIcon: Icon(Icons.storefront_rounded),
                    label: '商城',
                  ),
                  const NavigationDestination(
                    icon: Icon(Icons.grid_view_outlined),
                    selectedIcon: Icon(Icons.grid_view_rounded),
                    label: '分类',
                  ),
                  NavigationDestination(
                    icon: _CartNavIcon(count: controller.cartCount),
                    selectedIcon: _CartNavIcon(count: controller.cartCount, selected: true),
                    label: '购物车',
                  ),
                  const NavigationDestination(
                    icon: Icon(Icons.person_outline_rounded),
                    selectedIcon: Icon(Icons.person_rounded),
                    label: '我的',
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CartNavIcon extends StatelessWidget {
  const _CartNavIcon({required this.count, this.selected = false});
  final int count;
  final bool selected;

  @override
  Widget build(BuildContext context) => Badge(
        isLabelVisible: count > 0,
        label: Text(count > 99 ? '99+' : '$count'),
        child: Icon(selected ? Icons.shopping_bag_rounded : Icons.shopping_bag_outlined),
      );
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final keyword = _searchController.text.trim();
    if (keyword.isEmpty) return;
    await Navigator.of(context).push<void>(MaterialPageRoute(
      builder: (_) => ProductSearchScreen(keyword: keyword),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppController>();
    return RefreshIndicator(
      onRefresh: controller.loadHome,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            titleSpacing: 20,
            title: Row(children: [
              Image.asset('assets/branding/logo-dark.png', height: 35, fit: BoxFit.contain),
            ]),
            actions: [
              IconButton(tooltip: '消息通知', onPressed: () => Navigator.of(context).pushNamed('/mine/notifications'), icon: const Icon(Icons.notifications_none_rounded)),
              IconButton(tooltip: '个人中心', onPressed: () {
                final shell = context.findAncestorStateOfType<_StorefrontShellState>();
                shell?.setState(() => shell._selectedIndex = 3);
              }, icon: const Icon(Icons.person_outline_rounded)),
              const SizedBox(width: 6),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 120),
            sliver: SliverList.list(children: [
              TextField(
                controller: _searchController,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _search(),
                decoration: InputDecoration(
                  hintText: '搜索商品、品牌或礼包',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: IconButton(
                    onPressed: _search,
                    icon: const Icon(Icons.arrow_forward_rounded),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              if (controller.banners.isNotEmpty)
                _HomeBannerCarousel(banners: controller.banners, onTap: (link) {
                  final shell = context.findAncestorStateOfType<_StorefrontShellState>();
                  shell?._openBanner(link);
                })
              else
                _WelcomePanel(onExplore: () {
                  final shell = context.findAncestorStateOfType<_StorefrontShellState>();
                  shell?._openCategory(null);
                }),
              const SizedBox(height: 24),
              SectionHeading(
                title: '精选分类',
                actionLabel: '全部分类',
                onAction: () {
                  final shell = context.findAncestorStateOfType<_StorefrontShellState>();
                  shell?._openCategory(null);
                },
              ),
              const SizedBox(height: 12),
              if (controller.categories.isEmpty)
                controller.loading
                    ? const _CategoryPlaceholders()
                    : Text('更多分类即将上架', style: Theme.of(context).textTheme.bodyMedium)
              else
                SizedBox(
                  height: 94,
                  child: LayoutBuilder(builder: (context, constraints) {
                    final itemCount = controller.categories.length.clamp(0, 8).toInt();
                    final fitsInRow = itemCount <= 5;
                    final gap = fitsInRow ? 6.0 : 12.0;
                    final tileWidth = fitsInRow
                        ? (constraints.maxWidth - (itemCount - 1) * gap) / itemCount
                        : 74.0;
                    return ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: itemCount,
                      separatorBuilder: (_, __) => SizedBox(width: gap),
                      itemBuilder: (context, index) {
                        final category = controller.categories[index];
                        return _CategoryTile(
                          category: category,
                          width: tileWidth,
                          onTap: () {
                            final shell = context.findAncestorStateOfType<_StorefrontShellState>();
                            shell?._openCategory(category.id);
                          },
                        );
                      },
                    );
                  }),
                ),
              const SizedBox(height: 18),
              InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => Navigator.of(context).pushNamed('/gift-zone'),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(17, 15, 15, 15),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFFFFF7F0), Color(0xFFFFE9DA)]),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFFFD5C5)),
                  ),
                  child: Row(children: [
                    Container(width: 42, height: 42, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                      child: const Icon(Icons.diamond_outlined, color: ShopTheme.primaryDark)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('会员专属权益', style: TextStyle(color: ShopTheme.primaryDark, fontSize: 11, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 3),
                      Text('入会礼包 · 月度领货 · 会员折扣', style: Theme.of(context).textTheme.titleSmall),
                    ])),
                    const Icon(Icons.chevron_right_rounded, color: ShopTheme.primaryDark),
                  ]),
                ),
              ),
              const SizedBox(height: 24),
              SectionHeading(title: '人气好物'),
              const SizedBox(height: 12),
              if (controller.loading && controller.hotProducts.isEmpty)
                const Center(child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                ))
              else if (controller.error != null && controller.hotProducts.isEmpty)
                ErrorPanel(message: controller.error!, onRetry: controller.loadHome)
              else if (controller.hotProducts.isEmpty)
                const EmptyPanel(title: '暂时没有商品', subtitle: '上新后会第一时间展示在这里')
              else
                ProductGrid(products: controller.hotProducts),
              if (controller.newProducts.isNotEmpty) ...[
                const SizedBox(height: 28),
                SectionHeading(title: '新品上架'),
                const SizedBox(height: 12),
                ProductGrid(products: controller.newProducts),
              ],
            ]),
          ),
        ],
      ),
    );
  }
}

class _WelcomePanel extends StatelessWidget {
  const _WelcomePanel({required this.onExplore});
  final VoidCallback onExplore;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF252B31), Color(0xFF3A424A)],
          ),
        ),
        child: Stack(children: [
          Positioned(right: -8, top: -15, child: Icon(
            Icons.shopping_bag_outlined,
            size: 110,
            color: Colors.white.withOpacity(.06),
          )),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0E9),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text('ORANGE SELECT · 精选商城', style: TextStyle(
                color: ShopTheme.primaryDark,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: .4,
              )),
            ),
            const SizedBox(height: 18),
            Text('好物精选，\n认真生活', style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              height: 1.2,
            )),
            const SizedBox(height: 8),
            Text('发现日常值得拥有的品质好物', style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.white.withOpacity(.76),
            )),
            const SizedBox(height: 20),
            FilledButton.tonalIcon(
              onPressed: onExplore,
              icon: const Icon(Icons.arrow_forward_rounded, size: 17),
              label: const Text('开始逛逛'),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: ShopTheme.ink,
                visualDensity: VisualDensity.comfortable,
              ),
            ),
          ]),
        ]),
      );
}

class _HomeBannerCarousel extends StatefulWidget {
  const _HomeBannerCarousel({required this.banners, required this.onTap});
  final List<ShopBanner> banners;
  final ValueChanged<String> onTap;

  @override
  State<_HomeBannerCarousel> createState() => _HomeBannerCarouselState();
}

class _HomeBannerCarouselState extends State<_HomeBannerCarousel> {
  int _index = 0;

  @override
  Widget build(BuildContext context) => Column(children: [
        SizedBox(
          height: 190,
          child: PageView.builder(
            itemCount: widget.banners.length,
            onPageChanged: (index) => setState(() => _index = index),
            itemBuilder: (context, index) {
              final banner = widget.banners[index];
              return ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: banner.link.trim().isEmpty ? null : () => widget.onTap(banner.link),
                    child: Stack(fit: StackFit.expand, children: [
                      ShopImage(url: banner.image, radius: 0),
                      const DecoratedBox(decoration: BoxDecoration(
                        gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter,
                          colors: [Color(0x990D1117), Color(0x000D1117)], stops: [0, .72]),
                      )),
                      Positioned(left: 18, bottom: 18, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('ORANGE SELECT', style: TextStyle(color: Colors.white70, fontSize: 10, letterSpacing: 1.3)),
                        const SizedBox(height: 5),
                        Text('精选好物 · 品质生活', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
                      ])),
                    ]),
                  ),
                ),
              );
            },
          ),
        ),
        if (widget.banners.length > 1) ...[
          const SizedBox(height: 10),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var index = 0; index < widget.banners.length; index++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: index == _index ? 18 : 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: index == _index ? ShopTheme.primary : const Color(0xFFD6D9DE),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
          ]),
        ],
      ]);
}

class _CategoryPlaceholders extends StatelessWidget {
  const _CategoryPlaceholders();
  @override
  Widget build(BuildContext context) => const SizedBox(
        height: 92,
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({required this.category, required this.width, required this.onTap});
  final ShopCategory category;
  final double width;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final style = _categoryIconStyle(category);
    final iconTileSize = width < 64 ? width - 8 : 58.0;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: SizedBox(
        width: width,
        child: Column(children: [
          Container(
            width: iconTileSize,
            height: iconTileSize,
            decoration: BoxDecoration(
              color: style.background,
              borderRadius: BorderRadius.circular(iconTileSize * .34),
              border: Border.all(color: style.foreground.withOpacity(.12)),
              boxShadow: [
                BoxShadow(
                  color: style.foreground.withOpacity(.08),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(style.icon, color: style.foreground, size: width < 64 ? 24 : 27),
          ),
          const SizedBox(height: 7),
          Text(category.name, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall),
        ]),
      ),
    );
  }
}

class _CategoryIconStyle {
  const _CategoryIconStyle({required this.icon, required this.foreground, required this.background});

  final IconData icon;
  final Color foreground;
  final Color background;
}

_CategoryIconStyle _categoryIconStyle(ShopCategory category) {
  final value = '${category.icon} ${category.name}'.toLowerCase();
  if (value.contains('lipstick') || value.contains('beauty') || value.contains('skin') || value.contains('美妆')) {
    return const _CategoryIconStyle(
      icon: Icons.spa_rounded,
      foreground: Color(0xFFB84D68),
      background: Color(0xFFFFF0F3),
    );
  }
  if (value.contains('nutrition') || value.contains('health') || value.contains('food') || value.contains('健康')) {
    return const _CategoryIconStyle(
      icon: Icons.eco_rounded,
      foreground: Color(0xFF47835F),
      background: Color(0xFFEEF7F0),
    );
  }
  if (value.contains('home') || value.contains('living') || value.contains('家居')) {
    return const _CategoryIconStyle(
      icon: Icons.weekend_rounded,
      foreground: Color(0xFF9A7040),
      background: Color(0xFFF8F1E5),
    );
  }
  if (value.contains('device') || value.contains('digital') || value.contains('phone') || value.contains('数码')) {
    return const _CategoryIconStyle(
      icon: Icons.devices_other_rounded,
      foreground: Color(0xFF4A779E),
      background: Color(0xFFEEF4FA),
    );
  }
  if (value.contains('gift') || value.contains('member') || value.contains('vip') || value.contains('入会')) {
    return const _CategoryIconStyle(
      icon: Icons.workspace_premium_rounded,
      foreground: Color(0xFFB87930),
      background: Color(0xFFFFF3E2),
    );
  }
  return const _CategoryIconStyle(
    icon: Icons.category_rounded,
    foreground: ShopTheme.secondaryInk,
    background: Color(0xFFF0F1F3),
  );
}
