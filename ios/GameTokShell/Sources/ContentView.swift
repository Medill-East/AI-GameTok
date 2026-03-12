import SwiftUI

struct ContentView: View {
    private let baseURLString = Bundle.main.object(forInfoDictionaryKey: "GAMETOK_BASE_URL") as? String

    var body: some View {
        NavigationStack {
            if let url = resolvedURL {
                GameTokWebView(url: url)
                    .ignoresSafeArea()
                    .navigationBarTitleDisplayMode(.inline)
            } else {
                VStack(spacing: 12) {
                    Text("Missing URL")
                        .font(.title2.weight(.semibold))
                    Text("Set GAMETOK_BASE_URL in the target build settings.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                .padding(24)
            }
        }
    }

    private var resolvedURL: URL? {
        guard let baseURLString, !baseURLString.isEmpty else {
            return nil
        }

        return URL(string: baseURLString)
    }
}
