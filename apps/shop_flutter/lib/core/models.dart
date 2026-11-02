typedef JsonMap = Map<String, dynamic>;

String _string(dynamic value) => value == null ? '' : '$value';
double _number(dynamic value) => double.tryParse('$value') ?? 0;
int _integer(dynamic value) => int.tryParse('$value') ?? 0;
bool _flag(dynamic value) =>
    value == true || value == 1 || value == '1' || value == 'true';

class ShopBanner {
  const ShopBanner({required this.image, required this.link});

  final String image;
  final String link;

  factory ShopBanner.fromJson(JsonMap json) => ShopBanner(
        image: _string(json['image']),
        link: _string(json['link']),
      );
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.image,
    required this.description,
    required this.price,
    required this.originalPrice,
    required this.categoryId,
    required this.isGiftPackage,
    required this.isMonthlyProduct,
    required this.excludeDiscount,
    required this.images,
    required this.sort,
  });

  final int id;
  final String name;
  final String image;
  final String description;
  final double price;
  final double originalPrice;
  final int categoryId;
  final bool isGiftPackage;
  final bool isMonthlyProduct;
  final bool excludeDiscount;
  final List<String> images;
  final int sort;

  factory Product.fromJson(JsonMap json) => Product(
        id: _integer(json['id']),
        name: _string(json['name']),
        image: _string(json['mainImage'] ?? json['main_image']),
        description: _string(json['description']),
        price: _number(json['minPrice'] ?? json['price']),
        originalPrice:
            _number(json['minOriginalPrice'] ?? json['originalPrice']),
        categoryId: _integer(json['categoryId'] ?? json['category_id']),
        isGiftPackage: _flag(json['isGiftPackage'] ?? json['is_gift_package']),
        isMonthlyProduct:
            _flag(json['isMonthlyProduct'] ?? json['is_monthly_product']),
        excludeDiscount:
            _flag(json['excludeDiscount'] ?? json['exclude_discount']),
        images: asList(json['images'])
            .map((image) => '$image')
            .where((image) => image.isNotEmpty)
            .toList(),
        sort: _integer(json['sort']),
      );
}

class ProductSku {
  const ProductSku({
    required this.id,
    required this.name,
    required this.price,
    required this.originalPrice,
    required this.stock,
    required this.image,
  });

  final int id;
  final String name;
  final double price;
  final double originalPrice;
  final int stock;
  final String image;

  factory ProductSku.fromJson(JsonMap json) => ProductSku(
        id: _integer(json['id']),
        name: _string(json['skuName'] ?? json['sku_name']).isEmpty
            ? '默认规格'
            : _string(json['skuName'] ?? json['sku_name']),
        price: _number(json['price']),
        // Public product detail uses `marketPrice`; cart and older API shapes
        // use `originalPrice`. Both represent the non-transactional reference price.
        originalPrice: _number(
          json['marketPrice'] ??
              json['market_price'] ??
              json['originalPrice'] ??
              json['original_price'],
        ),
        stock: _integer(json['stock']),
        image: _string(json['image']),
      );
}

class ProductPage {
  const ProductPage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  final List<Product> items;
  final int total;
  final int page;
  final int pageSize;

  bool get hasMore => items.length < total && page * pageSize < total;

  factory ProductPage.fromJson(JsonMap json) => ProductPage(
        items: asList(json['list'])
            .map((item) => Product.fromJson(asJsonMap(item)))
            .toList(),
        total: _integer(json['total']),
        page: _integer(json['page']),
        pageSize: _integer(json['pageSize']),
      );
}

class ShopCategory {
  const ShopCategory(
      {required this.id, required this.name, required this.icon});

  final int id;
  final String name;
  final String icon;

  factory ShopCategory.fromJson(JsonMap json) => ShopCategory(
        id: _integer(json['id']),
        name: _string(json['name']),
        icon: _string(json['icon']),
      );
}

class CartItem {
  const CartItem({
    required this.skuId,
    required this.productId,
    required this.name,
    required this.skuName,
    required this.image,
    required this.price,
    required this.originalPrice,
    required this.quantity,
    required this.selected,
    this.stock = 0,
    this.excludeDiscount = false,
  });

  final int skuId;
  final int productId;
  final String name;
  final String skuName;
  final String image;
  final double price;
  final double originalPrice;
  final int quantity;
  final bool selected;
  final int stock;
  final bool excludeDiscount;

  double memberPrice(double discount) => excludeDiscount
      ? price
      : ((price * discount.clamp(0, 100) / 100 + 1e-10) * 100).round() / 100;

  factory CartItem.fromJson(JsonMap json) => CartItem(
        skuId: _integer(json['skuId']),
        productId: _integer(json['spuId']),
        name: _string(json['spuName']),
        skuName: _string(json['skuName']),
        image: _string(json['mainImage']),
        price: _number(json['price']),
        originalPrice: _number(json['originalPrice']),
        quantity: _integer(json['quantity']),
        selected: json['selected'] == true || json['selected'] == 1,
        stock: _integer(json['stock']),
        excludeDiscount:
            _flag(json['excludeDiscount'] ?? json['exclude_discount']),
      );
}

class MemberProfile {
  const MemberProfile({
    required this.id,
    required this.phone,
    required this.nickname,
    required this.avatar,
    required this.levelName,
    required this.level,
    this.inviteCode = '',
    this.shopDiscount = 100,
    this.monthlyCredit = 0,
  });

  final int id;
  final String phone;
  final String nickname;
  final String avatar;
  final String levelName;
  final int level;
  final String inviteCode;
  final double shopDiscount;
  final double monthlyCredit;

  factory MemberProfile.fromJson(JsonMap json) => MemberProfile(
        id: _integer(json['id']),
        phone: _string(json['phone']),
        nickname: _string(json['nickname']).isEmpty
            ? '商城会员'
            : _string(json['nickname']),
        avatar: _string(json['avatar']),
        levelName: _string(json['levelName']),
        level: _integer(json['level']),
        inviteCode: _string(json['inviteCode'] ?? json['invite_code']),
        shopDiscount:
            json['shopDiscount'] == null && json['shop_discount'] == null
                ? 100
                : _number(json['shopDiscount'] ?? json['shop_discount'])
                    .clamp(0, 100)
                    .toDouble(),
        monthlyCredit: _number(json['monthlyCredit'] ?? json['monthly_credit']),
      );
}

JsonMap asJsonMap(dynamic value) => value is Map
    ? value.map((key, dynamic val) => MapEntry('$key', val))
    : <String, dynamic>{};

List<dynamic> asList(dynamic value) => value is List ? value : const [];
