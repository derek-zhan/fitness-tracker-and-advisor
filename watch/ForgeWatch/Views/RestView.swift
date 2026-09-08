import SwiftUI

struct RestView: View {
    @EnvironmentObject private var store: WorkoutStore

    var body: some View {
        VStack(spacing: 10) {
            Text("REST")
                .font(.caption.weight(.bold))
                .foregroundStyle(.orange)

            Text(timeLabel)
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .monospacedDigit()

            if let exercise = store.currentExercise {
                Text("Up next · \(exercise.name)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            }

            Button("Skip rest") {
                store.skipRest()
            }
            .buttonStyle(.bordered)
        }
        .containerBackground(.orange.gradient.opacity(0.18), for: .navigation)
    }

    private var timeLabel: String {
        let minutes = store.restRemaining / 60
        let seconds = store.restRemaining % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
