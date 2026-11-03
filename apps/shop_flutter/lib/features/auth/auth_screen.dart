import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    this.initialRegister = false,
    this.inviteCode = '',
  });

  final bool initialRegister;
  final String inviteCode;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _nickname = TextEditingController();
  final _inviteCode = TextEditingController();
  bool _registering = false;
  bool _submitting = false;
  bool _obscurePassword = true;
  bool _obscureConfirmation = true;
  String? _error;

  bool get _inviteLocked => widget.inviteCode.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _registering = widget.initialRegister;
    _inviteCode.text = widget.inviteCode.trim().toUpperCase();
  }

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _nickname.dispose();
    _inviteCode.dispose();
    super.dispose();
  }

  void _setMode(bool registering) {
    if (_submitting || _registering == registering) return;
    setState(() {
      _registering = registering;
      _error = null;
    });
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

  String? _validatePhone(String? value) {
    final phone = value?.trim() ?? '';
    if (phone.length < 5 || phone.length > 20) return '请输入有效手机号';
    return null;
  }

  String? _validatePassword(String? value) =>
      (value?.length ?? 0) < 6 ? '密码至少 6 位' : null;

  InputDecoration _decoration({
    required String label,
    required String hint,
    required IconData icon,
    Widget? suffixIcon,
    String? helperText,
  }) =>
      InputDecoration(
        labelText: label,
        hintText: hint,
        helperText: helperText,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: suffixIcon,
      );

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: ShopTheme.canvas,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                Row(
                  children: [
                    IconButton.filledTonal(
                      tooltip: '返回',
                      onPressed: () => Navigator.of(context).maybePop(),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: ShopTheme.ink,
                        fixedSize: const Size(44, 44),
                      ),
                      icon: const Icon(Icons.arrow_back_rounded, size: 20),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: ShopTheme.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.verified_user_outlined,
                              size: 15, color: ShopTheme.primaryDark),
                          const SizedBox(width: 6),
                          Text('橙选会员中心', style: textTheme.labelSmall),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                _AuthWelcomeCard(registering: _registering),
                const SizedBox(height: 16),
                _AuthModeSelector(
                  registering: _registering,
                  enabled: !_submitting,
                  onChanged: _setMode,
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.fromLTRB(18, 19, 18, 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: ShopTheme.border),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x080E1726),
                        blurRadius: 24,
                        offset: Offset(0, 9),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _registering ? '填写注册信息' : '账号登录',
                                    style: textTheme.titleLarge,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _registering
                                        ? '邀请码用于绑定推荐关系'
                                        : '使用注册手机号和密码登录',
                                    style: textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: ShopTheme.primarySoft,
                                borderRadius: BorderRadius.circular(13),
                              ),
                              child: Icon(
                                _registering
                                    ? Icons.person_add_alt_1_rounded
                                    : Icons.lock_person_outlined,
                                size: 20,
                                color: ShopTheme.primaryDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        if (_registering) ...[
                          TextFormField(
                            controller: _nickname,
                            enabled: !_submitting,
                            textCapitalization: TextCapitalization.words,
                            textInputAction: TextInputAction.next,
                            decoration: _decoration(
                              label: '昵称（选填）',
                              hint: '设置商城内显示的称呼',
                              icon: Icons.person_outline_rounded,
                            ),
                            validator: (value) => (value?.length ?? 0) > 20
                                ? '昵称最多 20 个字符'
                                : null,
                          ),
                          const SizedBox(height: 13),
                        ],
                        TextFormField(
                          controller: _phone,
                          enabled: !_submitting,
                          keyboardType: TextInputType.phone,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.telephoneNumber],
                          decoration: _decoration(
                            label: '手机号',
                            hint: '请输入注册手机号',
                            icon: Icons.phone_iphone_rounded,
                          ),
                          validator: _validatePhone,
                        ),
                        const SizedBox(height: 13),
                        TextFormField(
                          controller: _password,
                          enabled: !_submitting,
                          obscureText: _obscurePassword,
                          textInputAction: _registering
                              ? TextInputAction.next
                              : TextInputAction.done,
                          autofillHints: _registering
                              ? const [AutofillHints.newPassword]
                              : const [AutofillHints.password],
                          onFieldSubmitted: (_) =>
                              _registering ? null : _submit(),
                          decoration: _decoration(
                            label: '登录密码',
                            hint: _registering ? '至少 6 位' : '请输入登录密码',
                            icon: Icons.lock_outline_rounded,
                            suffixIcon: IconButton(
                              tooltip: _obscurePassword ? '显示密码' : '隐藏密码',
                              onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword),
                              icon: Icon(_obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined),
                            ),
                          ),
                          validator: _validatePassword,
                        ),
                        if (_registering) ...[
                          const SizedBox(height: 13),
                          TextFormField(
                            controller: _confirmPassword,
                            enabled: !_submitting,
                            obscureText: _obscureConfirmation,
                            textInputAction: TextInputAction.next,
                            decoration: _decoration(
                              label: '确认密码',
                              hint: '请再次输入登录密码',
                              icon: Icons.lock_reset_rounded,
                              suffixIcon: IconButton(
                                tooltip: _obscureConfirmation ? '显示密码' : '隐藏密码',
                                onPressed: () => setState(() =>
                                    _obscureConfirmation =
                                        !_obscureConfirmation),
                                icon: Icon(_obscureConfirmation
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined),
                              ),
                            ),
                            validator: (value) {
                              if ((value ?? '').isEmpty) return '请再次输入密码';
                              if (value != _password.text) return '两次输入的密码不一致';
                              return null;
                            },
                          ),
                          const SizedBox(height: 13),
                          TextFormField(
                            controller: _inviteCode,
                            enabled: !_submitting,
                            readOnly: _inviteLocked,
                            textCapitalization: TextCapitalization.characters,
                            textInputAction: TextInputAction.done,
                            onChanged: (value) {
                              final upper = value.toUpperCase();
                              if (value != upper) {
                                _inviteCode.value = _inviteCode.value.copyWith(
                                  text: upper,
                                  selection: TextSelection.collapsed(
                                      offset: upper.length),
                                );
                              }
                            },
                            decoration: _decoration(
                              label: '邀请码',
                              hint: _inviteLocked ? '已从邀请链接带入' : '请输入推荐人邀请码',
                              icon: Icons.confirmation_number_outlined,
                              suffixIcon: _inviteLocked
                                  ? const Icon(Icons.lock_outline_rounded)
                                  : null,
                              helperText: _inviteLocked
                                  ? '邀请关系将在注册后绑定'
                                  : '请向推荐人获取，注册后不可更改',
                            ),
                            validator: (value) =>
                                (value?.trim().isEmpty ?? true)
                                    ? '注册必须填写邀请码'
                                    : null,
                          ),
                        ],
                        if (_error != null) ...[
                          const SizedBox(height: 14),
                          _AuthError(message: _error!),
                        ],
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: _submitting ? null : _submit,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(54),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Text(_registering ? '创建账户并登录' : '登录'),
                        ),
                        const SizedBox(height: 12),
                        TextButton(
                          onPressed: _submitting
                              ? null
                              : () => _setMode(!_registering),
                          child: Text(
                            _registering ? '已有账号？返回登录' : '没有账号？使用邀请码注册',
                            style: const TextStyle(
                              color: ShopTheme.primaryDark,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.info_outline_rounded,
                                size: 14, color: ShopTheme.mutedInk),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                _registering
                                    ? '请确认邀请码和手机号填写正确'
                                    : '还没有账号？注册时需要有效邀请码',
                                textAlign: TextAlign.center,
                                style: textTheme.bodySmall,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthWelcomeCard extends StatelessWidget {
  const _AuthWelcomeCard({required this.registering});

  final bool registering;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      clipBehavior: Clip.antiAlias,
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF4EE), Colors.white],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFFFE1D4)),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -40,
            top: 6,
            child: Container(
              width: 142,
              height: 142,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: ShopTheme.primary.withValues(alpha: .07),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const BrandLogo(
                assetPath: 'assets/branding/logo-dark.png',
                width: 152,
                height: 54,
                alignment: Alignment.centerLeft,
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: ShopTheme.primarySoft,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  registering ? 'INVITATION MEMBERSHIP' : 'MEMBER ACCOUNT',
                  style: const TextStyle(
                    color: ShopTheme.primaryDark,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: .7,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                registering ? '加入橙选，开启会员权益' : '欢迎回来',
                style: textTheme.headlineSmall?.copyWith(fontSize: 25),
              ),
              const SizedBox(height: 5),
              Text(
                registering ? '填写手机号与邀请码，创建你的会员账户。' : '登录后继续管理订单、会员权益与购物车。',
                style: textTheme.bodyMedium,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AuthModeSelector extends StatelessWidget {
  const _AuthModeSelector({
    required this.registering,
    required this.enabled,
    required this.onChanged,
  });

  final bool registering;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: const Color(0xFFECEEF1),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            _AuthModeButton(
              label: '登录',
              selected: !registering,
              enabled: enabled,
              onTap: () => onChanged(false),
            ),
            _AuthModeButton(
              label: '邀请码注册',
              selected: registering,
              enabled: enabled,
              onTap: () => onChanged(true),
            ),
          ],
        ),
      );
}

class _AuthModeButton extends StatelessWidget {
  const _AuthModeButton({
    required this.label,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: selected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: selected
                ? const [
                    BoxShadow(
                      color: Color(0x100E1726),
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: enabled ? onTap : null,
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: selected ? ShopTheme.ink : ShopTheme.secondaryInk,
                    fontSize: 14,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}

class _AuthError extends StatelessWidget {
  const _AuthError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF0EF),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: const Color(0xFFFFD3D0)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 18, color: Color(0xFFC83F43)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                    color: Color(0xFFC83F43), fontSize: 13, height: 1.4),
              ),
            ),
          ],
        ),
      );
}
