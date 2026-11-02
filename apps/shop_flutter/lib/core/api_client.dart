import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client, FlutterSecureStorage? storage})
      : _client = client ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage();

  static const _configuredBase = String.fromEnvironment('API_BASE_URL');
  static const tokenKey = 'shop_os_member_token';

  final http.Client _client;
  final FlutterSecureStorage _storage;

  String get baseUrl {
    if (_configuredBase.isNotEmpty) return _configuredBase;
    if (kIsWeb) return 'http://localhost:3000/api/v1';
    return defaultTargetPlatform == TargetPlatform.android
        ? 'http://10.0.2.2:3000/api/v1'
        : 'http://localhost:3000/api/v1';
  }

  Future<dynamic> get(String path, [Map<String, Object?> query = const {}]) =>
      _send('GET', path, query: query);

  Future<dynamic> post(String path, [Object? body]) =>
      _send('POST', path, body: body);

  Future<dynamic> put(String path, [Object? body]) =>
      _send('PUT', path, body: body);

  Future<dynamic> patch(String path, [Object? body]) =>
      _send('PATCH', path, body: body);

  Future<dynamic> delete(String path) => _send('DELETE', path);

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, Object?> query = const {},
    Object? body,
  }) async {
    final token = await _storage.read(key: tokenKey);
    final uri = Uri.parse('$baseUrl$path').replace(
      queryParameters: {
        ...Uri.parse('$baseUrl$path').queryParameters,
        for (final entry in query.entries)
          if (entry.value != null) entry.key: '${entry.value}',
      },
    );
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (token != null && token.isNotEmpty) headers['Authorization'] = 'Bearer $token';

    late http.Response response;
    try {
      final request = http.Request(method, uri)
        ..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      final streamed = await _client.send(request).timeout(const Duration(seconds: 20));
      response = await http.Response.fromStream(streamed);
    } on Exception catch (error) {
      throw ApiException('连接商城服务失败，请检查网络和 API 地址：$error');
    }

    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    } on FormatException {
      throw ApiException('商城服务返回了无法识别的数据', statusCode: response.statusCode);
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map ? '${decoded['message'] ?? '请求失败'}' : '请求失败';
      if (response.statusCode == 401) await _storage.delete(key: tokenKey);
      throw ApiException(message, statusCode: response.statusCode);
    }
    if (decoded is Map && decoded.containsKey('code')) {
      if (decoded['code'] != 0) {
        throw ApiException('${decoded['message'] ?? '请求失败'}');
      }
      return decoded['data'];
    }
    return decoded;
  }
}
