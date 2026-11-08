import UIKit
import Capacitor
#if canImport(FoundationModels)
import FoundationModels
#endif

// Vue principale : on y ajoute le plugin du coach IA (Apple Intelligence, sur le téléphone)
class ParcoursViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CoachPlugin())
    }
}

// Coach IA : modèle de langage d'Apple Intelligence, gratuit, sur l'iPhone, rien n'est envoyé sur internet
@objc(CoachPlugin)
public class CoachPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CoachPlugin"
    public let jsName = "Coach"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "respond", returnType: CAPPluginReturnPromise)
    ]

    @objc func status(_ call: CAPPluginCall) {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available: call.resolve(["state": "available"])
            case .unavailable(.deviceNotEligible): call.resolve(["state": "deviceNotEligible"])
            case .unavailable(.appleIntelligenceNotEnabled): call.resolve(["state": "appleIntelligenceNotEnabled"])
            case .unavailable(.modelNotReady): call.resolve(["state": "modelNotReady"])
            default: call.resolve(["state": "unavailable"])
            }
            return
        }
        #endif
        call.resolve(["state": "oldIOS"])
    }

    @objc func respond(_ call: CAPPluginCall) {
        let instructions = call.getString("instructions") ?? ""
        let prompt = call.getString("prompt") ?? ""
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    let session = LanguageModelSession(instructions: instructions)
                    var last = ""
                    for try await snap in session.streamResponse(to: prompt) {
                        last = snap.content
                        self.notifyListeners("partial", data: ["text": last])
                    }
                    call.resolve(["text": last])
                } catch {
                    call.reject(String(describing: error))
                }
            }
            return
        }
        #endif
        call.reject("unavailable")
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ParcoursViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
