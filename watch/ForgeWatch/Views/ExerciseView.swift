import SwiftUI

struct ExerciseView: View {
    @EnvironmentObject private var store: WorkoutStore

    var body: some View {
        if let exercise = store.currentExercise {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("\(exercise.order) · SET \(store.setNumber)/\(exercise.sets)")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.orange)
                        Spacer()
                        Text(store.progressLabel)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                    Text(exercise.name)
                        .font(.title3.weight(.bold))

                    Text(exercise.cue)
                        .font(.caption)
                        .foregroundStyle(.secondary)

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

                    Button {
                        Task { await store.logCurrentSet() }
                    } label: {
                        Label("Log set", systemImage: "checkmark")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(.horizontal, 4)
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
