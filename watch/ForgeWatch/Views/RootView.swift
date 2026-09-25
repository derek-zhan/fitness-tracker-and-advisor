import SwiftUI

struct RootView: View {
    @EnvironmentObject private var store: WorkoutStore

    var body: some View {
        Group {
            switch store.phase {
            case .loading:
                ProgressView("Loading Forge")
            case .ready:
                WorkoutListView()
            case .exercising:
                ExerciseView()
            case .resting:
                RestView()
            case .complete:
                SummaryView()
            case .failed(let message):
                ContentUnavailableView(
                    "Something went wrong",
                    systemImage: "exclamationmark.triangle",
                    description: Text(message)
                )
            }
        }
        .tint(.orange)
        .task {
            if store.plans.isEmpty {
                await store.loadPlans()
            }
        }
    }
}
