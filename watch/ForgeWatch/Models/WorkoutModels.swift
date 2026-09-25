import Foundation

struct WorkoutPlan: Identifiable, Codable, Hashable {
    let id: String
    let day: Int
    let dayName: String
    let type: String
    let focus: String
    let exercises: [Exercise]
}

struct Exercise: Identifiable, Codable, Hashable {
    let id: String
    let order: String
    let name: String
    let sets: Int
    let targetReps: Int
    let repRange: String
    let suggestedLoad: Double
    let unit: LoadUnit
    let restSeconds: Int
    let cue: String
}

enum LoadUnit: String, Codable, Hashable {
    case pounds = "lb"
    case bodyweight = "body"
    case minutes
}

struct LoggedSet: Identifiable, Codable, Hashable {
    var id: String { "\(exerciseID)-\(setNumber)" }
    let exerciseID: String
    let exerciseName: String
    let exerciseOrder: String
    let exerciseIndex: Int
    let workoutDay: Int
    let setNumber: Int
    let reps: Int
    let load: Double
}

struct WorkoutSession: Codable, Hashable {
    let id: String
    let plan: WorkoutPlan
    let startedAt: Date
    var loggedSets: [LoggedSet]
}

extension WorkoutPlan {
    static let demoPlans: [WorkoutPlan] = [
        WorkoutPlan(
            id: "weekly-monday",
            day: 1,
            dayName: "Monday",
            type: "Upper Body",
            focus: "Press · Row · Shoulders",
            exercises: [
                Exercise(
                    id: "db-chest-press",
                    order: "A1",
                    name: "Dumbbell Chest Press",
                    sets: 4,
                    targetReps: 10,
                    repRange: "8–10",
                    suggestedLoad: 50,
                    unit: .pounds,
                    restSeconds: 90,
                    cue: "Keep elbows at 45°. Lower with control."
                ),
                Exercise(
                    id: "single-arm-row",
                    order: "B1",
                    name: "Single Arm Row",
                    sets: 4,
                    targetReps: 10,
                    repRange: "8–10",
                    suggestedLoad: 50,
                    unit: .pounds,
                    restSeconds: 90,
                    cue: "Pull through your elbow and pause at the top."
                ),
                Exercise(
                    id: "lateral-raise",
                    order: "C1",
                    name: "Cable Lateral Raise",
                    sets: 3,
                    targetReps: 12,
                    repRange: "10–12",
                    suggestedLoad: 20,
                    unit: .pounds,
                    restSeconds: 60,
                    cue: "Lead with the elbow and lower slowly."
                )
            ]
        ),
        WorkoutPlan(
            id: "weekly-tuesday",
            day: 2,
            dayName: "Tuesday",
            type: "Lower Body",
            focus: "Glutes · Hamstrings · Core",
            exercises: [
                Exercise(
                    id: "rdl",
                    order: "A1",
                    name: "Romanian Deadlift",
                    sets: 4,
                    targetReps: 10,
                    repRange: "8–10",
                    suggestedLoad: 50,
                    unit: .pounds,
                    restSeconds: 120,
                    cue: "Push your hips back and keep your lats tight."
                ),
                Exercise(
                    id: "split-squat",
                    order: "B1",
                    name: "Bulgarian Split Squat",
                    sets: 3,
                    targetReps: 10,
                    repRange: "8–12",
                    suggestedLoad: 0,
                    unit: .bodyweight,
                    restSeconds: 90,
                    cue: "Drop straight down and drive through the front foot."
                )
            ]
        )
    ]
}
