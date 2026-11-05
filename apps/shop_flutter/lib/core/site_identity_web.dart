import 'dart:html' as html;

void applySiteIdentity({
  required String name,
  required String iconUrl,
  required int revision,
}) {
  final siteName = name.trim().isEmpty ? '橙选商城' : name.trim();
  html.document.title = siteName;
  _setMeta('application-name', siteName);
  _setMeta('apple-mobile-web-app-title', siteName);

  if (iconUrl.trim().isEmpty) return;
  var link = html.document.querySelector('link[rel="icon"]') as html.LinkElement?;
  if (link == null) {
    link = html.LinkElement()..rel = 'icon';
    html.document.head?.append(link);
  }
  final uri = Uri.parse(iconUrl.trim());
  link.href = uri.replace(queryParameters: {
    ...uri.queryParameters,
    '_brand_revision': '$revision',
  }).toString();
}

void _setMeta(String name, String content) {
  var meta = html.document.querySelector('meta[name="$name"]') as html.MetaElement?;
  if (meta == null) {
    meta = html.MetaElement()..name = name;
    html.document.head?.append(meta);
  }
  meta.content = content;
}
