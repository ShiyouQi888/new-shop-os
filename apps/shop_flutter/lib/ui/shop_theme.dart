import 'package:flutter/material.dart';

class ShopTheme {
  static const buttonHeight = 48.0;
  static const purchaseButtonHeight = 50.0;
  static const formButtonHeight = 52.0;
  static const buttonRadius = 15.0;

  static const primary = Color(0xFFFF6B35);
  static const primaryDark = Color(0xFFE85222);
  static const primarySoft = Color(0xFFFFF1EB);
  static const ink = Color(0xFF171A1F);
  static const secondaryInk = Color(0xFF626A73);
  static const mutedInk = Color(0xFF9299A2);
  static const border = Color(0xFFE7E9ED);
  static const canvas = Color(0xFFF5F6F8);
  static const success = Color(0xFF18A66A);

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      primary: primary,
      onPrimary: Colors.white,
      surface: Colors.white,
      error: const Color(0xFFE5484D),
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      fontFamily: 'Roboto',
      textTheme: const TextTheme(
        headlineSmall: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: ink,
            letterSpacing: -.4),
        headlineMedium: TextStyle(
            fontSize: 29,
            fontWeight: FontWeight.w800,
            color: ink,
            letterSpacing: -.5),
        titleLarge:
            TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: ink),
        titleMedium:
            TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: ink),
        titleSmall:
            TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: ink),
        bodyLarge: TextStyle(fontSize: 15, color: secondaryInk, height: 1.45),
        bodyMedium: TextStyle(fontSize: 13, color: secondaryInk, height: 1.5),
        bodySmall: TextStyle(fontSize: 12, color: mutedInk, height: 1.4),
        labelSmall: TextStyle(
            fontSize: 11, color: secondaryInk, fontWeight: FontWeight.w600),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: canvas,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle:
            TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: ink),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        hintStyle: const TextStyle(color: mutedInk, fontSize: 14),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        prefixIconColor: mutedInk,
        suffixIconColor: mutedInk,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: border)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: primary, width: 1.4)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFFFFC8B4),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          minimumSize: const Size(0, buttonHeight),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(buttonRadius)),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryDark,
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          minimumSize: const Size(0, buttonHeight),
          side: const BorderSide(color: Color(0xFFFFD5C5)),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(buttonRadius)),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        backgroundColor: Colors.white,
        indicatorColor: primarySoft,
        labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
              fontSize: 11,
              fontWeight: states.contains(WidgetState.selected)
                  ? FontWeight.w700
                  : FontWeight.w500,
              color: states.contains(WidgetState.selected)
                  ? primaryDark
                  : secondaryInk,
            )),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: canvas,
        selectedColor: primarySoft,
        side: const BorderSide(color: border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        labelStyle: const TextStyle(fontSize: 13, color: secondaryInk),
        secondaryLabelStyle: const TextStyle(
            fontSize: 13, color: primaryDark, fontWeight: FontWeight.w700),
      ),
      dividerColor: border,
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: ink,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
