import SwiftUI

struct WorkoutListView: View {
    @EnvironmentObject private var store: WorkoutStore

    var body: some View {
        NavigationStack {
            List(store.plans) { plan in
                Button {
                    Task { await store.start(plan) }
                } label: {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(plan.dayName.uppercased())
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.orange)
                        Text(plan.type)
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Text(plan.focus)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
            }
            .navigationTitle("FORGE")
        }
    }
}
