import SwiftUI

struct RestView: View {
    @EnvironmentObject private var store: WorkoutStore
    @State private var showingNextDetails = false

    var body: some View {
        VStack(spacing: 8) {
            Text("REST")
                .font(.caption2.weight(.bold))
                .foregroundStyle(.orange)

            Text(timeLabel)
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .monospacedDigit()

            HStack(spacing: 8) {
                Button("30s") {
                    store.capRest(to: 30)
                }
                .buttonStyle(.bordered)

                Button("60s") {
                    store.capRest(to: 60)
                }
                .buttonStyle(.bordered)
            }
            .font(.caption2)

            if let exercise = store.currentExercise {
                Button { showingNextDetails = true } label: {
                    Text("Up next · \(exercise.name)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Up next, \(exercise.name). Show details")
            }

            Spacer(minLength: 0)

            Button("Skip rest") {
                store.skipRest()
            }
            .buttonStyle(.bordered)
        }
        .sheet(isPresented: $showingNextDetails) {
            if let exercise = store.currentExercise {
                ScrollView {
                    VStack(spacing: 8) {
                        Text(exercise.name)
                            .font(.headline)
                            .multilineTextAlignment(.center)
                        Text(exercise.cue)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.top, 2)
                        Button("Close") { showingNextDetails = false }
                            .buttonStyle(.bordered)
                            .padding(.top, 6)
                    }
                    .padding()
                }
            }
        }
    }

    private var timeLabel: String {
        let minutes = store.restRemaining / 60
        let seconds = store.restRemaining % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

