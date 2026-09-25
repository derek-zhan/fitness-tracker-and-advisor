import SwiftUI

@main
struct ForgeWatchApp: App {
    @StateObject private var store = WorkoutStore(service: DemoWorkoutService())

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
    }
}
