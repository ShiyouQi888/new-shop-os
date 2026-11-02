import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_client.dart';
import 'models.dart';
import 'session_store.dart';

class AppController extends ChangeNotifier {
  AppController(this.api, this._session);

  final ApiClient api;
  final SessionStore _session;

  bool loading = false;
  bool loadingCart = false;
  String? error;
  List<ShopBanner> banners = [];
  List<Product> hotProducts = [];
  List<Product> newProducts = [];
  List<ShopCategory> categories = [];
  List<CartItem> cart = [];
  MemberProfile? member;
  int cartCount = 0;

  bool get isSignedIn => member != null;
  double get shopDiscount => member?.shopDiscount ?? 100;
  double get selectedListTotal => cart
      .where((item) => item.selected)
      .fold<double>(0, (total, item) => total + item.price * item.quantity);
  double get selectedTotal => cart
      .where((item) => item.selected)
      .fold<double>(0, (total, item) => total + item.memberPrice(shopDiscount) * item.quantity);
  double get selectedDiscount => selectedListTotal - selectedTotal;
  bool get allCartSelected => cart.isNotEmpty && cart.every((item) => item.selected);

  Future<void> initialize() async {
    member = await _session.readMember();
    notifyListeners();
    await loadHome();
    if (member != null) {
      try { await refreshMember(); } on Exception { /* Retain saved membership pricing while the API is unavailable. */ }
      await loadCart();
    }
  }

  Future<void> loadHome() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final data = asJsonMap(await api.get('/shop/home'));
      banners = asList(data['banners'])
          .map((item) => ShopBanner.fromJson(asJsonMap(item)))
          .where((banner) => banner.image.isNotEmpty)
          .toList();
      hotProducts = asList(data['hotProducts'])
          .map((item) => Product.fromJson(asJsonMap(item)))
          .toList();
      newProducts = asList(data['newProducts'])
          .map((item) => Product.fromJson(asJsonMap(item)))
          .toList();
      categories = asList(data['categories'])
          .map((item) => ShopCategory.fromJson(asJsonMap(item)))
          .toList();
    } on Exception catch (exception) {
      error = exception.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<List<Product>> loadProducts({int? categoryId, String? keyword}) async {
    final query = <String, Object?>{'page': 1, 'pageSize': 100};
    if (categoryId != null) query['categoryId'] = categoryId;
    if (keyword != null && keyword.trim().isNotEmpty) query['keyword'] = keyword.trim();
    final result = asJsonMap(await api.get('/shop/products', query));
    return asList(result['list'])
        .map((item) => Product.fromJson(asJsonMap(item)))
        .toList();
  }

  Future<({Product product, List<ProductSku> skus})> loadProduct(int id) async {
    final result = asJsonMap(await api.get('/shop/products/$id'));
    return (
      product: Product.fromJson(result),
      skus: asList(result['skus'])
          .map((item) => ProductSku.fromJson(asJsonMap(item)))
          .toList(),
    );
  }

  Future<void> loadCategories() async {
    final result = asList(await api.get('/shop/categories'));
    final roots = <ShopCategory>[];
    for (final item in result) {
      final map = asJsonMap(item);
      roots.add(ShopCategory.fromJson(map));
      for (final child in asList(map['children'])) {
        roots.add(ShopCategory.fromJson(child));
      }
    }
    categories = roots;
    notifyListeners();
  }

  Future<JsonMap> refreshMember() async {
    final data = asJsonMap(await api.get('/shop/member/me'));
    final current = asJsonMap(data['member']);
    member = MemberProfile.fromJson(current);
    await _session.writeMember(member!);
    notifyListeners();
    return data;
  }

  Future<void> loadCart() async {
    if (!isSignedIn) {
      cart = [];
      cartCount = 0;
      notifyListeners();
      return;
    }
    loadingCart = true;
    notifyListeners();
    try {
      cart = asList(await api.get('/shop/member/cart'))
          .map((item) => CartItem.fromJson(asJsonMap(item)))
          .toList();
      cartCount = cart.fold(0, (total, item) => total + item.quantity);
    } on ApiException catch (exception) {
      if (exception.statusCode == 401) {
        await logout();
      } else {
        error = exception.message;
      }
    } finally {
      loadingCart = false;
      notifyListeners();
    }
  }

  Future<void> signIn(String phone, String password) async {
    final result = asJsonMap(await api.post('/shop/member/login', {
      'phone': phone.trim(),
      'password': password,
    }));
    await _saveMember(result);
  }

  Future<void> register({
    required String phone,
    required String password,
    required String nickname,
    required String inviteCode,
  }) async {
    final result = asJsonMap(await api.post('/shop/member/register', {
      'phone': phone.trim(),
      'password': password,
      'nickname': nickname.trim(),
      'inviteCode': inviteCode.trim(),
    }));
    await _saveMember(result);
  }

  Future<void> _saveMember(JsonMap result) async {
    final token = result['token'];
    if (token is! String || token.isEmpty) throw const ApiException('登录信息不完整，请重试');
    const secureStorage = FlutterSecureStorage();
    await secureStorage.write(key: ApiClient.tokenKey, value: token);
    member = MemberProfile.fromJson(result);
    await _session.writeMember(member!);
    error = null;
    notifyListeners();
    await loadCart();
  }

  Future<void> logout() async {
    const secureStorage = FlutterSecureStorage();
    await secureStorage.delete(key: ApiClient.tokenKey);
    await _session.clear();
    member = null;
    cart = [];
    cartCount = 0;
    notifyListeners();
  }

  Future<void> addToCart(ProductSku sku, {int quantity = 1}) async {
    if (!isSignedIn) throw const ApiException('请先登录后再加入购物车');
    await api.post('/shop/member/cart', {'skuId': sku.id, 'quantity': quantity});
    await loadCart();
  }

  Future<void> setCartItem(CartItem item, {int? quantity, bool? selected}) async {
    if (quantity != null && quantity > item.stock) {
      throw ApiException('当前库存仅剩 ${item.stock} 件');
    }
    await api.put('/shop/member/cart/${item.skuId}', {
      if (quantity != null) 'quantity': quantity,
      if (selected != null) 'selected': selected,
    });
    await loadCart();
  }

  Future<void> selectAll(bool selected) async {
    await api.put('/shop/member/cart/select-all', {'selected': selected});
    await loadCart();
  }

  Future<void> removeCartItem(CartItem item) async {
    await api.delete('/shop/member/cart/${item.skuId}');
    await loadCart();
  }
}
