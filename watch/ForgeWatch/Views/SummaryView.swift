import SwiftUI

struct SummaryView: View {
    @EnvironmentObject private var store: WorkoutStore

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 42))
                    .foregroundStyle(.green)

                Text("Strong work.")
                    .font(.title3.weight(.bold))

                if let session = store.session {
                    Text("\(session.loggedSets.count) working sets")
                        .font(.headline)
                    Text(session.plan.type)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Button("Done") {
                    store.reset()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}
