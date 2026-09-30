import Foundation
import Combine
import WatchKit

@MainActor
final class WorkoutStore: ObservableObject {
    enum Phase: Equatable {
        case loading
        case ready
        case exercising
        case resting
        case complete
        case failed(String)
    }

    @Published private(set) var plans: [WorkoutPlan] = []
    @Published private(set) var session: WorkoutSession?
    @Published private(set) var phase: Phase = .loading
    @Published private(set) var exerciseIndex = 0
    @Published private(set) var setNumber = 1
    @Published var reps = 10
    @Published var load = 0.0
    @Published private(set) var restRemaining = 0

    private let service: WorkoutService
    private var restTask: Task<Void, Never>?

    init(service: WorkoutService) {
        self.service = service
    }

    var currentExercise: Exercise? {
        guard let exercises = session?.plan.exercises,
              exercises.indices.contains(exerciseIndex) else { return nil }
        return exercises[exerciseIndex]
    }

    var progressLabel: String {
        guard let session else { return "" }
        let total = session.plan.exercises.reduce(0) { $0 + $1.sets }
        return "\(session.loggedSets.count)/\(total) sets"
    }

    func loadPlans() async {
        phase = .loading
        do {
            plans = try await service.fetchPlans()
            phase = .ready
        } catch {
            phase = .failed("Workouts could not be loaded.")
        }
    }

    func start(_ plan: WorkoutPlan) async {
        do {
            session = try await service.start(plan: plan)
            exerciseIndex = 0
            prepareCurrentExercise()
            phase = .exercising
        } catch {
            phase = .failed("Workout could not be started.")
        }
    }

    func logCurrentSet() async {
        guard let exercise = currentExercise, var session else { return }
        let entry = LoggedSet(
            exerciseID: exercise.id,
            exerciseName: exercise.name,
            exerciseOrder: exercise.order,
            exerciseIndex: exerciseIndex,
            workoutDay: session.plan.day,
            setNumber: setNumber,
            reps: reps,
            load: load
        )

        do {
            try await service.save(set: entry, sessionID: session.id)
            session.loggedSets.removeAll { $0.id == entry.id }
            session.loggedSets.append(entry)
            self.session = session
            WKInterfaceDevice.current().play(.success)

            if isWorkoutComplete(session) {
                try await service.finish(session: session)
                phase = .complete
            } else if exercise.restSeconds > 0 {
                beginRest(seconds: exercise.restSeconds)
            } else {
                advance()
            }
        } catch {
            phase = .failed("This set was not saved.")
        }
    }

    func skipRest() {
        restTask?.cancel()
        advance()
    }

    func capRest(to seconds: Int) {
        // Only allow reducing the remaining rest time; ignore if already less or equal
        guard seconds >= 0, restRemaining > seconds else { return }
        restRemaining = seconds
    }

    func reset() {
        restTask?.cancel()
        session = nil
        phase = .ready
    }

    private func beginRest(seconds: Int) {
        restTask?.cancel()
        restRemaining = seconds
        phase = .resting
        restTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled && self.restRemaining > 0 {
                try? await Task.sleep(for: .seconds(1))
                if !Task.isCancelled { self.restRemaining -= 1 }
            }
            guard !Task.isCancelled else { return }
            WKInterfaceDevice.current().play(.notification)
            self.advance()
        }
    }

    private func advance() {
        guard let exercise = currentExercise else { return }
        if setNumber < exercise.sets {
            setNumber += 1
        } else {
            exerciseIndex += 1
            setNumber = 1
        }
        prepareCurrentExercise()
        phase = .exercising
    }

    private func prepareCurrentExercise() {
        guard let exercise = currentExercise else { return }
        reps = exercise.targetReps
        load = exercise.suggestedLoad
    }

    private func isWorkoutComplete(_ session: WorkoutSession) -> Bool {
        let total = session.plan.exercises.reduce(0) { $0 + $1.sets }
        return session.loggedSets.count >= total
    }
}
