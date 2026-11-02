import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_controller.dart';
import '../../core/models.dart';
import '../../ui/shop_theme.dart';
import '../../ui/widgets.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});
  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  late Future<List<JsonMap>> _articles;
  Future<List<JsonMap>> _load() async => asList(await context
          .read<AppController>()
          .api
          .get('/help', {'scope': 'help'}))
      .map(asJsonMap)
      .toList();
  @override
  void initState() {
    super.initState();
    _articles = _load();
  }

  Future<void> _refresh() async => setState(() => _articles = _load());

  Future<void> _openArticle(JsonMap article) async {
    try {
      final detail = asJsonMap(await context
          .read<AppController>()
          .api
          .get('/help/${article['id']}'));
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (context) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: SingleChildScrollView(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('${detail['title'] ?? ''}',
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 16),
                  SelectableText('${detail['content'] ?? ''}',
                      style: Theme.of(context).textTheme.bodyLarge),
                ])),
          ),
        ),
      );
    } on ApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('客服与帮助')),
        body: FutureBuilder<List<JsonMap>>(
          future: _articles,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => _refresh());
            final items = snapshot.data ?? [];
            return ListView(padding: const EdgeInsets.all(16), children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  gradient: const LinearGradient(
                      colors: [Color(0xFF252B31), Color(0xFF414A53)]),
                ),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('CUSTOMER CARE',
                          style: TextStyle(
                              color: ShopTheme.primary,
                              fontSize: 11,
                              fontWeight: FontWeight.w800)),
                      const SizedBox(height: 9),
                      Text('需要帮助吗？',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(color: Colors.white)),
                      const SizedBox(height: 7),
                      const Text('查找常见问题，或提交工单与客服沟通。',
                          style: TextStyle(color: Colors.white70)),
                      const SizedBox(height: 16),
                      FilledButton.tonalIcon(
                        onPressed: () => Navigator.of(context).push<void>(
                            MaterialPageRoute(
                                builder: (_) => const WorkOrderScreen())),
                        icon: const Icon(Icons.support_agent_rounded),
                        label: const Text('我的工单'),
                        style: FilledButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: ShopTheme.ink),
                      ),
                    ]),
              ),
              const SizedBox(height: 20),
              Text('常见问题', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 10),
              if (items.isEmpty)
                const EmptyPanel(title: '暂无帮助内容', subtitle: '可以提交工单联系平台客服')
              else
                for (final item in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: ListTile(
                      tileColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      leading: const Icon(Icons.help_outline_rounded,
                          color: ShopTheme.primaryDark),
                      title: Text('${item['title'] ?? ''}',
                          style: Theme.of(context).textTheme.titleSmall),
                      subtitle: Text('${item['category'] ?? ''}'),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => _openArticle(item),
                    ),
                  ),
            ]);
          },
        ),
      );
}

class RulesScreen extends StatefulWidget {
  const RulesScreen({super.key});
  @override
  State<RulesScreen> createState() => _RulesScreenState();
}

class _RulesScreenState extends State<RulesScreen> {
  late Future<List<JsonMap>> _rules;
  Future<List<JsonMap>> _load() async => asList(await context
          .read<AppController>()
          .api
          .get('/help', {'scope': 'rules'}))
      .map(asJsonMap)
      .toList();
  @override
  void initState() {
    super.initState();
    _rules = _load();
  }

  Future<void> _refresh() async => setState(() => _rules = _load());

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('规则中心')),
        body: FutureBuilder<List<JsonMap>>(
          future: _rules,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done)
              return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError)
              return ErrorPanel(
                  message: '${snapshot.error}',
                  onRetry: () async => _refresh());
            final rules = snapshot.data ?? [];
            if (rules.isEmpty)
              return const EmptyPanel(
                  title: '暂无规则内容', subtitle: '平台规则发布后会在这里展示');
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(padding: const EdgeInsets.all(16), children: [
                for (final rule in rules)
                  Container(
                    padding: const EdgeInsets.all(17),
                    margin: const EdgeInsets.only(bottom: 10),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18)),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            const Icon(Icons.verified_user_outlined,
                                color: ShopTheme.primaryDark, size: 20),
                            const SizedBox(width: 9),
                            Expanded(
                                child: Text('${rule['title'] ?? ''}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium)),
                            Text('${rule['category'] ?? ''}',
                                style: Theme.of(context).textTheme.bodySmall),
                          ]),
                          const SizedBox(height: 10),
                          SelectableText('${rule['content'] ?? ''}',
                              style: Theme.of(context).textTheme.bodyMedium),
                        ]),
                  ),
              ]),
            );
          },
        ),
      );
}

class WorkOrderScreen extends StatefulWidget {
  const WorkOrderScreen({super.key});
  @override
  State<WorkOrderScreen> createState() => _WorkOrderScreenState();
}

class _WorkOrderScreenState extends State<WorkOrderScreen> {
  late Future<List<JsonMap>> _orders;
  Future<List<JsonMap>> _load() async => asList(await context
          .read<AppController>()
          .api
          .get('/shop/member/work-orders'))
      .map(asJsonMap)
      .toList();

  @override
  void initState() {
    super.initState();
    _orders = _load();
  }

  Future<void> _refresh() async {
    setState(() => _orders = _load());
    await _orders;
  }

  Future<void> _create() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const _CreateWorkOrderScreen()),
    );
    if (created != true || !mounted) return;
    setState(() => _orders = _load());
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('工单已提交')));
  }

  Future<void> _close(JsonMap order) async {
    final yes = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: Container(
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: ShopTheme.primarySoft,
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.mark_email_read_outlined,
                  color: ShopTheme.primaryDark, size: 26),
            ),
            const SizedBox(height: 13),
            Text('关闭这张工单？', style: Theme.of(sheetContext).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text('关闭后将结束本次处理，之后可以重新提交工单。',
                textAlign: TextAlign.center,
                style: Theme.of(sheetContext).textTheme.bodyMedium),
            const SizedBox(height: 19),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(sheetContext, false),
                  child: const Text('继续保留'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: () => Navigator.pop(sheetContext, true),
                  child: const Text('确认关闭'),
                ),
              ),
            ]),
          ]),
        ),
      ),
    );
    if (yes != true) return;
    try {
      await context
          .read<AppController>()
          .api
          .patch('/shop/member/work-orders/${order['id']}/close');
      if (mounted) setState(() => _orders = _load());
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('我的工单')),
        bottomNavigationBar: SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 11, 16, 12),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: ShopTheme.border)),
            ),
            child: SizedBox(
              height: 52,
              child: FilledButton.icon(
                onPressed: _create,
                icon: const Icon(Icons.add_comment_outlined, size: 19),
                label: const Text('提交工单'),
              ),
            ),
          ),
        ),
        body: FutureBuilder<List<JsonMap>>(
          future: _orders,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ErrorPanel(
                  message: '${snapshot.error}', onRetry: _refresh);
            }
            final list = snapshot.data ?? [];
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
                children: [
                  _WorkOrderOverview(
                    total: list.length,
                    active: list
                        .where((item) =>
                            (int.tryParse('${item['status']}') ?? 0) != 3)
                        .length,
                  ),
                  const SizedBox(height: 15),
                  if (list.isEmpty)
                    const _WorkOrderEmptyCard()
                  else ...[
                    Row(children: [
                      Text('工单记录',
                          style: Theme.of(context).textTheme.titleMedium),
                      const Spacer(),
                      Text('${list.length} 条',
                          style: Theme.of(context).textTheme.bodySmall),
                    ]),
                    const SizedBox(height: 9),
                    for (final item in list) ...[
                      _WorkOrderRecordCard(
                        item: item,
                        onClose: () => _close(item),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ],
                ],
              ),
            );
          },
        ),
      );
}

class _WorkOrderOverview extends StatelessWidget {
  const _WorkOrderOverview({required this.total, required this.active});

  final int total;
  final int active;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFFF4EE), Color(0xFFFFE9DF)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFFFE0D2)),
        ),
        child: Row(children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .8),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.support_agent_rounded,
                color: ShopTheme.primaryDark, size: 25),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('工单服务', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text('提交问题，客服将持续跟进',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('$active',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: ShopTheme.primaryDark,
                      fontSize: 21,
                    )),
            Text('处理中 / 共 $total',
                style: Theme.of(context).textTheme.bodySmall),
          ]),
        ]),
      );
}

class _WorkOrderEmptyCard extends StatelessWidget {
  const _WorkOrderEmptyCard();

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 18),
        padding: const EdgeInsets.fromLTRB(22, 28, 22, 30),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Column(children: [
          Container(
            width: 66,
            height: 66,
            decoration: BoxDecoration(
              color: ShopTheme.primarySoft,
              borderRadius: BorderRadius.circular(22),
            ),
            child: const Icon(Icons.forum_outlined,
                color: ShopTheme.primaryDark, size: 30),
          ),
          const SizedBox(height: 14),
          Text('这里还没有工单', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 5),
          Text('遇到订单、售后或账户问题时，可以提交工单联系平台客服。',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall),
        ]),
      );
}

class _WorkOrderRecordCard extends StatelessWidget {
  const _WorkOrderRecordCard({required this.item, required this.onClose});

  final JsonMap item;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final status = int.tryParse('${item['status']}') ?? 0;
    final statusLabel = switch (status) {
      0 => '待处理',
      1 => '处理中',
      2 => '已回复',
      _ => '已关闭',
    };
    final statusColor =
        status == 3 ? ShopTheme.mutedInk : ShopTheme.primaryDark;
    final reply = '${item['replyContent'] ?? ''}'.trim();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: ShopTheme.border.withValues(alpha: .7)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Text('${item['title'] ?? ''}',
                style: Theme.of(context).textTheme.titleSmall),
          ),
          const SizedBox(width: 9),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
            decoration: BoxDecoration(
              color:
                  status == 3 ? const Color(0xFFF1F2F4) : ShopTheme.primarySoft,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(statusLabel,
                style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          ),
        ]),
        const SizedBox(height: 7),
        Text('${item['ticketNo'] ?? ''} · ${item['createTime'] ?? ''}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 12),
        Text('${item['content'] ?? ''}',
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyMedium),
        if (reply.isNotEmpty) ...[
          const SizedBox(height: 13),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF7F8FA),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('客服回复',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: ShopTheme.primaryDark,
                        )),
                const SizedBox(height: 4),
                Text(reply, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
        ],
        if (status != 3) ...[
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: onClose,
              icon: const Icon(Icons.check_circle_outline_rounded, size: 17),
              label: const Text('结束工单'),
            ),
          ),
        ],
      ]),
    );
  }
}

class _CreateWorkOrderScreen extends StatefulWidget {
  const _CreateWorkOrderScreen();

  @override
  State<_CreateWorkOrderScreen> createState() => _CreateWorkOrderScreenState();
}

class _CreateWorkOrderScreenState extends State<_CreateWorkOrderScreen> {
  static const _types = <({String value, String label, IconData icon})>[
    (value: 'consult', label: '咨询', icon: Icons.chat_bubble_outline_rounded),
    (value: 'order', label: '订单问题', icon: Icons.receipt_long_outlined),
    (value: 'after_sale', label: '售后', icon: Icons.assignment_return_outlined),
    (
      value: 'commission',
      label: '佣金',
      icon: Icons.account_balance_wallet_outlined
    ),
    (value: 'withdraw', label: '提现', icon: Icons.payments_outlined),
    (value: 'other', label: '其他', icon: Icons.more_horiz_rounded),
  ];

  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _content = TextEditingController();
  String _type = 'consult';
  bool _submitting = false;

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await context.read<AppController>().api.post(
        '/shop/member/work-orders',
        {
          'type': _type,
          'title': _title.text.trim(),
          'content': _content.text.trim(),
        },
      );
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('提交工单')),
        bottomNavigationBar: SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 11, 16, 12),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: ShopTheme.border)),
            ),
            child: SizedBox(
              height: 52,
              child: FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send_rounded, size: 18),
                label: Text(_submitting ? '正在提交…' : '提交工单'),
              ),
            ),
          ),
        ),
        body: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            children: [
              Container(
                padding: const EdgeInsets.all(17),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFFF4EE), Color(0xFFFFE9DF)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(21),
                  border: Border.all(color: const Color(0xFFFFE0D2)),
                ),
                child: Row(children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .82),
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: const Icon(Icons.support_agent_rounded,
                        color: ShopTheme.primaryDark),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('告诉我们你遇到的问题',
                            style: Theme.of(context).textTheme.titleSmall),
                        const SizedBox(height: 4),
                        Text('补充清楚问题细节，便于客服快速处理。',
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 20),
              Row(children: [
                Text('问题类型', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(width: 5),
                const Text('*', style: TextStyle(color: Color(0xFFE5484D))),
              ]),
              const SizedBox(height: 4),
              Text('选择最符合问题的类型', style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 11),
              LayoutBuilder(builder: (context, constraints) {
                const gap = 9.0;
                final tileWidth = (constraints.maxWidth - gap) / 2;
                return Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: [
                    for (final item in _types)
                      SizedBox(
                        width: tileWidth,
                        child: _WorkOrderTypeOption(
                          label: item.label,
                          icon: item.icon,
                          selected: _type == item.value,
                          onTap: () => setState(() => _type = item.value),
                        ),
                      ),
                  ],
                );
              }),
              const SizedBox(height: 20),
              Text('问题标题', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 9),
              TextFormField(
                controller: _title,
                textInputAction: TextInputAction.next,
                decoration: _workOrderInputDecoration('简要概括问题，例如：订单迟迟未发货'),
                validator: (value) =>
                    (value?.trim().length ?? 0) < 2 ? '标题至少填写 2 个字符' : null,
              ),
              const SizedBox(height: 17),
              Text('问题描述', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 9),
              TextFormField(
                controller: _content,
                minLines: 5,
                maxLines: 8,
                textAlignVertical: TextAlignVertical.top,
                decoration: _workOrderInputDecoration('请描述发生时间、相关订单或具体情况…'),
                validator: (value) =>
                    (value?.trim().length ?? 0) < 5 ? '请补充描述，至少填写 5 个字符' : null,
              ),
              const SizedBox(height: 12),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.schedule_rounded,
                    size: 16, color: ShopTheme.mutedInk),
                const SizedBox(width: 6),
                Expanded(
                  child: Text('提交后可在工单记录中查看处理进度与客服回复。',
                      style: Theme.of(context).textTheme.bodySmall),
                ),
              ]),
            ],
          ),
        ),
      );
}

InputDecoration _workOrderInputDecoration(String hint) => InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: const Color(0xFFF7F8FA),
      contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 15),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15),
          borderSide: const BorderSide(color: ShopTheme.border)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(15),
          borderSide: const BorderSide(color: ShopTheme.primary, width: 1.4)),
      errorMaxLines: 2,
    );

class _WorkOrderTypeOption extends StatelessWidget {
  const _WorkOrderTypeOption({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? ShopTheme.primarySoft : Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            height: 54,
            padding: const EdgeInsets.symmetric(horizontal: 11),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: selected ? ShopTheme.primary : ShopTheme.border,
                  width: selected ? 1.3 : 1),
            ),
            child: Row(children: [
              Icon(icon,
                  size: 19,
                  color: selected ? ShopTheme.primaryDark : ShopTheme.mutedInk),
              const SizedBox(width: 8),
              Expanded(
                child: Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color:
                              selected ? ShopTheme.primaryDark : ShopTheme.ink,
                        )),
              ),
              if (selected)
                const Icon(Icons.check_circle_rounded,
                    color: ShopTheme.primary, size: 16),
            ]),
          ),
        ),
      );
}
