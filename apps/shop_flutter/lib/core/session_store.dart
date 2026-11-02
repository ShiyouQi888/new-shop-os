import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'models.dart';

class SessionStore {
  const SessionStore();

  static const _memberKey = 'shop_os_member';
  static const _storage = FlutterSecureStorage();

  Future<MemberProfile?> readMember() async {
    final value = await _storage.read(key: _memberKey);
    if (value == null) return null;
    try {
      return MemberProfile.fromJson(asJsonMap(jsonDecode(value)));
    } on FormatException {
      await clear();
      return null;
    }
  }

  Future<void> writeMember(MemberProfile member) => _storage.write(
        key: _memberKey,
        value: jsonEncode({
          'id': member.id,
          'phone': member.phone,
          'nickname': member.nickname,
          'avatar': member.avatar,
          'levelName': member.levelName,
          'level': member.level,
          'inviteCode': member.inviteCode,
          'shopDiscount': member.shopDiscount,
          'monthlyCredit': member.monthlyCredit,
        }),
      );

  Future<void> clear() => _storage.delete(key: _memberKey);
}
