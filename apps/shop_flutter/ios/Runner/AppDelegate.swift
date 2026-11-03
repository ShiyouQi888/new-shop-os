import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "LauncherIconBridge")
    let channel = FlutterMethodChannel(
      name: "com.chengxuan.shop/launcher_icon",
      binaryMessenger: registrar.messenger()
    )
    channel.setMethodCallHandler { call, result in
      guard call.method == "setLauncherIcon" else {
        result(FlutterMethodNotImplemented)
        return
      }
      guard let arguments = call.arguments as? [String: Any],
            let variant = arguments["variant"] as? String else {
        result(FlutterError(code: "invalid_icon", message: "Unknown launcher icon preset", details: nil))
        return
      }
      let iconName: String?
      switch variant {
      case "orange": iconName = nil
      case "cream": iconName = "AppIconCream"
      case "night": iconName = "AppIconNight"
      default:
        result(FlutterError(code: "invalid_icon", message: "Unknown launcher icon preset", details: nil))
        return
      }
      guard UIApplication.shared.supportsAlternateIcons else {
        result(FlutterError(code: "unsupported", message: "Alternate app icons are unavailable", details: nil))
        return
      }
      let requestedKey = "lastRequestedLauncherIcon"
      if UIApplication.shared.alternateIconName == iconName {
        UserDefaults.standard.set(variant, forKey: requestedKey)
        result(nil)
        return
      }
      // A dismissed iOS system prompt should not reappear on every foreground event.
      if UserDefaults.standard.string(forKey: requestedKey) == variant {
        result(nil)
        return
      }
      UserDefaults.standard.set(variant, forKey: requestedKey)
      UIApplication.shared.setAlternateIconName(iconName) { error in
        if let error {
          result(FlutterError(code: "icon_update_failed", message: error.localizedDescription, details: nil))
        } else {
          result(nil)
        }
      }
    }
  }
}
