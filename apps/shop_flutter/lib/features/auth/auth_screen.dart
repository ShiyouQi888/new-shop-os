import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../ui/shop_theme.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen(
      {super.key, this.initialRegister = false, this.inviteCode = ''});
  final bool initialRegister;
  final String inviteCode;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _nickname = TextEditingController();
  final _inviteCode = TextEditingController();
  bool _registering = false;
  bool _submitting = false;
  bool _obscurePassword = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _registering = widget.initialRegister;
    _inviteCode.text = widget.inviteCode;
  }

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    _nickname.dispose();
    _inviteCode.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    final controller = context.read<AppController>();
    try {
      if (_registering) {
        await controller.register(
          phone: _phone.text,
          password: _password.text,
          nickname: _nickname.text,
          inviteCode: _inviteCode.text,
        );
      } else {
        await controller.signIn(_phone.text, _password.text);
      }
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(leading: const BackButton()),
        body: SafeArea(
          top: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
                children: [
                  Image.asset('assets/branding/logo-dark.png',
                      height: 66,
                      alignment: Alignment.centerLeft,
                      fit: BoxFit.contain),
                  const SizedBox(height: 22),
                  Text(_registering ? '创建橙选账号' : '欢迎回来',
                      style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 7),
                  Text(_registering ? '填写邀请码，加入橙选会员体系' : '登录后继续选购心仪好物',
                      style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 28),
                  Form(
                    key: _formKey,
                    child: Column(children: [
                      if (_registering) ...[
                        TextFormField(
                          controller: _nickname,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                              labelText: '昵称（选填）',
                              prefixIcon: Icon(Icons.person_outline_rounded)),
                          validator: (value) =>
                              (value?.length ?? 0) > 20 ? '昵称最多 20 个字符' : null,
                        ),
                        const SizedBox(height: 13),
                      ],
                      TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                            labelText: '手机号',
                            prefixIcon: Icon(Icons.phone_iphone_rounded)),
                        validator: (value) {
                          final phone = value?.trim() ?? '';
                          if (phone.length < 5 || phone.length > 20)
                            return '请输入有效手机号';
                          return null;
                        },
                      ),
                      const SizedBox(height: 13),
                      TextFormField(
                        controller: _password,
                        obscureText: _obscurePassword,
                        textInputAction: _registering
                            ? TextInputAction.next
                            : TextInputAction.done,
                        onFieldSubmitted: (_) =>
                            _registering ? null : _submit(),
                        decoration: InputDecoration(
                          labelText: '密码',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            onPressed: () => setState(
                                () => _obscurePassword = !_obscurePassword),
                            icon: Icon(_obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined),
                          ),
                        ),
                        validator: (value) =>
                            (value?.length ?? 0) < 6 ? '密码至少 6 位' : null,
                      ),
                      if (_registering) ...[
                        const SizedBox(height: 13),
                        TextFormField(
                          controller: _inviteCode,
                          textCapitalization: TextCapitalization.characters,
                          textInputAction: TextInputAction.done,
                          decoration: const InputDecoration(
                              labelText: '邀请码',
                              prefixIcon:
                                  Icon(Icons.confirmation_number_outlined)),
                          validator: (value) =>
                              (value?.trim().isEmpty ?? true) ? '请输入邀请码' : null,
                        ),
                      ],
                    ]),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(13),
                      decoration: BoxDecoration(
                          color: const Color(0xFFFFEEEE),
                          borderRadius: BorderRadius.circular(13)),
                      child: Text(_error!,
                          style: const TextStyle(color: Color(0xFFC83F43))),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _submitting ? null : _submit,
                    style: FilledButton.styleFrom(
                        minimumSize:
                            Size.fromHeight(ShopTheme.formButtonHeight)),
                    child: _submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : Text(_registering ? '注册并登录' : '登录'),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: _submitting
                        ? null
                        : () => setState(() {
                              _registering = !_registering;
                              _error = null;
                            }),
                    child: Text(_registering ? '已有账号？立即登录' : '还没有账号？使用邀请码注册',
                        style: const TextStyle(
                            color: ShopTheme.primaryDark,
                            fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(height: 20),
                  Text('继续即表示你同意商城服务条款与隐私政策',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
          ),
        ),
      );
}
