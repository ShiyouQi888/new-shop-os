import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'core/app_controller.dart';
import 'core/api_client.dart';
import 'core/session_store.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();
  final api = ApiClient();
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppController(api, SessionStore())..initialize(),
      child: const ShopOsApp(),
    ),
  );
}
