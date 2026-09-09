import Foundation

protocol WorkoutService {
    func fetchPlans() async throws -> [WorkoutPlan]
    func start(plan: WorkoutPlan) async throws -> WorkoutSession
    func save(set: LoggedSet, sessionID: String) async throws
    func finish(session: WorkoutSession) async throws
}

struct DemoWorkoutService: WorkoutService {
    func fetchPlans() async throws -> [WorkoutPlan] {
        try await Task.sleep(for: .milliseconds(250))
        return WorkoutPlan.demoPlans
    }

    func start(plan: WorkoutPlan) async throws -> WorkoutSession {
        WorkoutSession(
            id: UUID().uuidString,
            plan: plan,
            startedAt: Date(),
            loggedSets: []
        )
    }

    func save(set: LoggedSet, sessionID: String) async throws {
        // The demo keeps data locally. ForgeAPIClient implements the production request shape.
    }

    func finish(session: WorkoutSession) async throws {}
}

struct ForgeAPIClient: WorkoutService {
    enum ClientError: Error {
        case missingDeviceToken
        case invalidResponse
        case unsupportedCatalog
    }

    let baseURL: URL
    let deviceToken: String
    private let decoder = JSONDecoder()

    func fetchPlans() async throws -> [WorkoutPlan] {
        // The current site only exposes the dynamic weekly catalog. A normalized
        // /api/watch/workouts endpoint is intentionally left for the pairing phase.
        throw ClientError.unsupportedCatalog
    }

    func start(plan: WorkoutPlan) async throws -> WorkoutSession {
        struct Response: Decodable { let sessionId: String }
        let payload: [String: Any] = [
            "action": "start",
            "program": "weekly7",
            "day": plan.day,
            "date": ISO8601DateFormatter().string(from: Date())
        ]
        let response: Response = try await postWorkout(payload)
        return WorkoutSession(
            id: response.sessionId,
            plan: plan,
            startedAt: Date(),
            loggedSets: []
        )
    }

    func save(set: LoggedSet, sessionID: String) async throws {
        let payload: [String: Any] = [
            "action": "set",
            "sessionId": sessionID,
            "day": set.workoutDay,
            "exercise": set.exerciseName,
            "exerciseOrder": set.exerciseOrder,
            "exerciseIndex": set.exerciseIndex,
            "setNumber": set.setNumber,
            "reps": set.reps,
            "load": set.load
        ]
        let _: SaveResponse = try await postWorkout(payload)
    }

    func finish(session: WorkoutSession) async throws {
        let minutes = max(1, Int(Date().timeIntervalSince(session.startedAt) / 60))
        let payload: [String: Any] = [
            "action": "finish",
            "sessionId": session.id,
            "durationMinutes": minutes,
            "totalSets": session.loggedSets.count
        ]
        let _: FinishResponse = try await postWorkout(payload)
    }

    private struct SaveResponse: Decodable { let saved: Bool }
    private struct FinishResponse: Decodable { let complete: Bool }

    private func postWorkout<Response: Decodable>(_ payload: [String: Any]) async throws -> Response {
        guard !deviceToken.isEmpty else { throw ClientError.missingDeviceToken }
        var request = URLRequest(url: baseURL.appending(path: "api/workouts"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(deviceToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else {
            throw ClientError.invalidResponse
        }
        return try decoder.decode(Response.self, from: data)
    }
}
