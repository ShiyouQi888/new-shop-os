import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

typedef ChinaRegion = ({String province, String city, String district});

Future<ChinaRegion?> pickChinaRegion(
  BuildContext context, {
  String province = '',
  String city = '',
  String district = '',
}) async {
  final raw = await rootBundle.loadString('assets/data/china_area_data.json');
  final source = jsonDecode(raw) as Map<String, dynamic>;
  final provinces = Map<String, String>.from(source['province_list'] as Map);
  final cities = Map<String, String>.from(source['city_list'] as Map);
  final counties = Map<String, String>.from(source['county_list'] as Map);

  String? provinceCode = _firstOrNull(provinces.entries.where((entry) => entry.value == province).map((entry) => entry.key));
  provinceCode ??= _firstOrNull(provinces.keys);
  String? cityCode = provinceCode == null
      ? null
      : _firstOrNull(cities.entries.where((entry) => entry.key.startsWith(provinceCode!.substring(0, 2)) && entry.value == city).map((entry) => entry.key));
  cityCode ??= _firstOrNull(_cityCodes(cities, provinceCode));
  String? countyCode = cityCode == null
      ? null
      : _firstOrNull(counties.entries.where((entry) => entry.key.startsWith(cityCode!.substring(0, 4)) && entry.value == district).map((entry) => entry.key));
  countyCode ??= _firstOrNull(_countyCodes(counties, cityCode));

  if (!context.mounted) return null;
  return showModalBottomSheet<ChinaRegion>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => StatefulBuilder(
      builder: (context, setState) {
        final cityOptions = _cityCodes(cities, provinceCode);
        final countyOptions = _countyCodes(counties, cityCode);
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.fromLTRB(20, 8, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('选择省市区', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 14),
              _RegionDropdown(
                label: '省 / 直辖市 / 自治区',
                value: provinceCode,
                options: provinces,
                onChanged: (value) => setState(() {
                  provinceCode = value;
                  cityCode = _firstOrNull(_cityCodes(cities, value));
                  countyCode = _firstOrNull(_countyCodes(counties, cityCode));
                }),
              ),
              const SizedBox(height: 10),
              _RegionDropdown(
                label: '城市',
                value: cityOptions.contains(cityCode) ? cityCode : _firstOrNull(cityOptions),
                options: {for (final code in cityOptions) code: cities[code]!},
                onChanged: (value) => setState(() {
                  cityCode = value;
                  countyCode = _firstOrNull(_countyCodes(counties, value));
                }),
              ),
              const SizedBox(height: 10),
              _RegionDropdown(
                label: '区 / 县',
                value: countyOptions.contains(countyCode) ? countyCode : _firstOrNull(countyOptions),
                options: {for (final code in countyOptions) code: counties[code]!},
                onChanged: (value) => setState(() => countyCode = value),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: provinceCode == null || cityCode == null || countyCode == null
                      ? null
                      : () => Navigator.of(sheetContext).pop((
                            province: provinces[provinceCode]!,
                            city: cities[cityCode]!,
                            district: counties[countyCode]!,
                          )),
                  child: const Text('确定'),
                ),
              ),
            ]),
          ),
        );
      },
    ),
  );
}

List<String> _cityCodes(Map<String, String> cities, String? provinceCode) => provinceCode == null
    ? const []
    : cities.keys.where((code) => code.startsWith(provinceCode.substring(0, 2))).toList();

List<String> _countyCodes(Map<String, String> counties, String? cityCode) => cityCode == null
    ? const []
    : counties.keys.where((code) => code.startsWith(cityCode.substring(0, 4))).toList();

T? _firstOrNull<T>(Iterable<T> values) {
  final iterator = values.iterator;
  return iterator.moveNext() ? iterator.current : null;
}

class _RegionDropdown extends StatelessWidget {
  const _RegionDropdown({required this.label, required this.value, required this.options, required this.onChanged});
  final String label;
  final String? value;
  final Map<String, String> options;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) => DropdownButtonFormField<String>(
        value: options.containsKey(value) ? value : _firstOrNull(options.keys),
        isExpanded: true,
        decoration: InputDecoration(labelText: label),
        items: [for (final entry in options.entries) DropdownMenuItem(value: entry.key, child: Text(entry.value, overflow: TextOverflow.ellipsis))],
        onChanged: options.isEmpty ? null : onChanged,
      );
}
