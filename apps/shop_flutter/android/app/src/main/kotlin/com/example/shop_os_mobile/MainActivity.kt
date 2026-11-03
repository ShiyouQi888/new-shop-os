package com.example.shop_os_mobile

import android.content.ComponentName
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val launcherChannel = "com.chengxuan.shop/launcher_icon"
    private val launcherAliases = mapOf(
        "orange" to ".LauncherIconOrange",
        "cream" to ".LauncherIconCream",
        "night" to ".LauncherIconNight",
    )

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, launcherChannel)
            .setMethodCallHandler { call, result ->
                if (call.method != "setLauncherIcon") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                val variant = call.argument<String>("variant")
                val selectedAlias = launcherAliases[variant]
                if (selectedAlias == null) {
                    result.error("invalid_icon", "Unknown launcher icon preset", null)
                    return@setMethodCallHandler
                }

                try {
                    applyLauncherAlias(selectedAlias)
                    result.success(null)
                } catch (error: Exception) {
                    Log.e("LauncherIcon", "Failed preset=$variant", error)
                    result.error("icon_update_failed", error.message, null)
                }
            }
    }

    private fun applyLauncherAlias(selectedAlias: String) {
        val aliases = launcherAliases.mapValues { (_, alias) ->
            ComponentName(this, "${MainActivity::class.java.packageName}$alias")
        }
        val selectedVariant = launcherAliases.entries.first { it.value == selectedAlias }.key
        val selected = aliases.getValue(selectedVariant)
        val enabledVariants = launcherAliases.keys.filter { variant ->
            val component = aliases.getValue(variant)
            val enabled = when (packageManager.getComponentEnabledSetting(component)) {
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED_UNTIL_USED -> false
                else -> variant == "orange"
            }
            enabled
        }
        if (enabledVariants.size == 1 && enabledVariants.single() == selectedVariant) return
        val flags = PackageManager.DONT_KILL_APP

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManager.setComponentEnabledSettings(
                aliases.values.map { component ->
                    PackageManager.ComponentEnabledSetting(
                        component,
                        if (component == selected) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        flags,
                    )
                },
            )
        } else {
            packageManager.setComponentEnabledSetting(
                selected,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                flags,
            )
            aliases.values.filterNot { it == selected }.forEach { component ->
                packageManager.setComponentEnabledSetting(
                    component,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    flags,
                )
            }
        }
    }
}
