import SwiftUI

struct ExerciseView: View {
    @EnvironmentObject private var store: WorkoutStore
    @State private var showingCue = false

    var body: some View {
        if let exercise = store.currentExercise {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("\(exercise.order) · SET \(store.setNumber)/\(exercise.sets)")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.orange)
                    Spacer()
                    Text(store.progressLabel)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Button {
                    showingCue = true
                } label: {
                    Text(exercise.name)
                        .font(.headline.weight(.bold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Show description for \(exercise.name)")

                Spacer(minLength: 0)

                MetricStepper(
                    title: exercise.unit == .minutes ? "MINUTES" : "REPS",
                    value: Binding(
                        get: { store.reps },
                        set: { store.reps = $0 }
                    ),
                    range: 0...100,
                    step: 1,
                    suffix: ""
                )

                if exercise.unit == .pounds {
                    LoadStepper(load: $store.load)
                } else if exercise.unit == .bodyweight {
                    Label("BODYWEIGHT", systemImage: "figure.strengthtraining.traditional")
                        .font(.caption.weight(.semibold))
                }

                Spacer(minLength: 0)

                Button {
                    Task { await store.logCurrentSet() }
                } label: {
                    Label("Log set", systemImage: "checkmark")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal, 0)
            .sheet(isPresented: $showingCue) {
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
                        Button("Close") { showingCue = false }
                            .buttonStyle(.bordered)
                            .padding(.top, 6)
                    }
                    .padding()
                }
            }
        }
    }
}

private struct MetricStepper: View {
    let title: String
    @Binding var value: Int
    let range: ClosedRange<Int>
    let step: Int
    let suffix: String

    var body: some View {
        Stepper(value: $value, in: range, step: step) {
            VStack(alignment: .leading, spacing: 0) {
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("\(value)\(suffix)")
                    .font(.title2.monospacedDigit().weight(.bold))
            }
        }
    }
}

private struct LoadStepper: View {
    @Binding var load: Double

    var body: some View {
        Stepper(value: $load, in: 0...500, step: 5) {
            VStack(alignment: .leading, spacing: 0) {
                Text("LOAD")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("\(load, specifier: "%.0f") lb")
                    .font(.title2.monospacedDigit().weight(.bold))
            }
        }
    }
}
