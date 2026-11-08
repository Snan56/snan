import UIKit
import Capacitor
import AVFoundation
import CoreMotion
#if canImport(FoundationModels)
import FoundationModels
#endif

// Vue principale : on y ajoute le plugin du coach IA (Apple Intelligence, sur le téléphone)
class ParcoursViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CoachPlugin())
        bridge?.registerPluginInstance(ScannerPlugin())
        bridge?.registerPluginInstance(PedometerPlugin())
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

// Podomètre de l'iPhone (puce de mouvement, comme l'app Santé) : compte même quand l'appli dort, 7 jours d'historique
@objc(PedometerPlugin)
public class PedometerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PedometerPlugin"
    public let jsName = "Pedometer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "query", returnType: CAPPluginReturnPromise)
    ]
    private let pedo = CMPedometer()

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["steps": CMPedometer.isStepCountingAvailable(), "floors": CMPedometer.isFloorCountingAvailable(),
                      "distance": CMPedometer.isDistanceAvailable(), "auth": CMPedometer.authorizationStatus().rawValue])
    }

    @objc func query(_ call: CAPPluginCall) {
        guard let from = call.getDouble("from"), let to = call.getDouble("to"), to > from else { call.reject("dates"); return }
        guard CMPedometer.isStepCountingAvailable() else { call.reject("unavailable"); return }
        pedo.queryPedometerData(from: Date(timeIntervalSince1970: from / 1000), to: Date(timeIntervalSince1970: to / 1000)) { data, error in
            if let e = error { call.reject(e.localizedDescription); return }
            guard let d = data else { call.reject("nodata"); return }
            var r: [String: Any] = ["steps": d.numberOfSteps.intValue]
            if let x = d.distance { r["distance"] = x.doubleValue }
            if let x = d.floorsAscended { r["floorsUp"] = x.intValue }
            if let x = d.floorsDescended { r["floorsDown"] = x.intValue }
            call.resolve(r)
        }
    }
}

// Scanner de code-barres (produits du commerce) avec la caméra de l'iPhone
@objc(ScannerPlugin)
public class ScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScannerPlugin"
    public let jsName = "Scanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

    @objc func scan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let open = {
                let vc = ScannerViewController()
                vc.onDone = { code in
                    if let code = code { call.resolve(["code": code]) } else { call.resolve(["cancelled": true]) }
                }
                vc.modalPresentationStyle = .fullScreen
                self.bridge?.viewController?.present(vc, animated: true)
            }
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized: open()
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { ok in
                    DispatchQueue.main.async { if ok { open() } else { call.reject("denied") } }
                }
            default: call.reject("denied")
            }
        }
    }
}

class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onDone: ((String?) -> Void)?
    private let session = AVCaptureSession()
    private var finished = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        guard let device = AVCaptureDevice.default(for: .video), let input = try? AVCaptureDeviceInput(device: device), session.canAddInput(input) else {
            finish(nil); return
        }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.ean13, .ean8, .upce, .code128].filter { output.availableMetadataObjectTypes.contains($0) }
        }
        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.addSublayer(preview)

        let frame = UIView()
        frame.layer.borderColor = UIColor(red: 1, green: 0.42, blue: 0.17, alpha: 1).cgColor
        frame.layer.borderWidth = 3
        frame.layer.cornerRadius = 18
        frame.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(frame)

        let label = UILabel()
        label.text = "Vise le code-barres du paquet"
        label.textColor = .white
        label.font = .boldSystemFont(ofSize: 17)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)

        let cancel = UIButton(type: .system)
        cancel.setTitle("Annuler", for: .normal)
        cancel.setTitleColor(.white, for: .normal)
        cancel.titleLabel?.font = .boldSystemFont(ofSize: 18)
        cancel.backgroundColor = UIColor(white: 0.15, alpha: 0.85)
        cancel.layer.cornerRadius = 24
        cancel.translatesAutoresizingMaskIntoConstraints = false
        cancel.addTarget(self, action: #selector(cancelTap), for: .touchUpInside)
        view.addSubview(cancel)

        NSLayoutConstraint.activate([
            frame.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            frame.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -40),
            frame.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.8),
            frame.heightAnchor.constraint(equalToConstant: 170),
            label.bottomAnchor.constraint(equalTo: frame.topAnchor, constant: -20),
            label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            cancel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            cancel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            cancel.widthAnchor.constraint(equalToConstant: 180),
            cancel.heightAnchor.constraint(equalToConstant: 48)
        ])
        DispatchQueue.global(qos: .userInitiated).async { self.session.startRunning() }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        view.layer.sublayers?.compactMap { $0 as? AVCaptureVideoPreviewLayer }.forEach { $0.frame = view.bounds }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !finished, let obj = metadataObjects.first as? AVMetadataMachineReadableCodeObject, let code = obj.stringValue else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        finish(code)
    }

    @objc func cancelTap() { finish(nil) }

    private func finish(_ code: String?) {
        if finished { return }
        finished = true
        if session.isRunning { DispatchQueue.global().async { self.session.stopRunning() } }
        let cb = onDone
        DispatchQueue.main.async {
            if self.presentingViewController != nil { self.dismiss(animated: true) { cb?(code) } } else { cb?(code) }
        }
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
