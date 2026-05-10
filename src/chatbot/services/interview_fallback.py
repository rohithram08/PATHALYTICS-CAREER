# services/interview_fallback.py

from typing import List, Dict, Tuple


FALLBACK_QUESTIONS = {
    "Systems Engineer": {
        "Beginner": [
            "What is the difference between monolithic architecture and microservices architecture?",
            "How would you troubleshoot a simple network connectivity issue between two systems?",
            "What is load balancing, and why is it important in distributed systems?",
            "How would you improve the availability of a critical system?",
            "How would you manage file permissions and access control in Linux?",
        ],
        "Intermediate": [
            "How would you investigate intermittent latency between dependent services?",
            "How would you approach diagnosing a production issue affecting multiple system components?",
            "What metrics would you monitor to maintain a healthy backend infrastructure?",
            "How would you plan capacity for a system expecting rapid growth?",
            "How would you reduce single points of failure in an infrastructure stack?",
        ],
        "Advanced": [
            "Design a resilient multi-region system for a critical internal platform.",
            "How would you handle cascading failures across a distributed infrastructure?",
            "What trade-offs would you consider when balancing consistency, availability, and scalability?",
            "How would you redesign a legacy platform for better reliability and observability?",
            "How would you create an incident response strategy for a complex production system?",
        ],
    },
    "Frontend Developer": {
        "Beginner": [
            "What is the difference between HTML, CSS, and JavaScript?",
            "What is the DOM and how does it work?",
            "What does responsive design mean?",
            "What is state in React?",
            "How do you debug a broken UI in the browser?",
        ],
        "Intermediate": [
            "How would you optimize a slow React component?",
            "How do you manage shared state across multiple components?",
            "What are the trade-offs between client-side rendering and server-side rendering?",
            "How would you improve accessibility in a form-heavy application?",
            "How would you structure a scalable frontend codebase?",
        ],
        "Advanced": [
            "Design the frontend architecture for a large SaaS dashboard.",
            "How would you handle performance bottlenecks in a complex React application?",
            "What trade-offs do you consider when choosing a state management strategy?",
            "How would you build a reusable design system for multiple teams?",
            "How would you improve observability and reliability in frontend production systems?",
        ],
    },
    "Backend Developer": {
        "Beginner": [
            "What is an API and how does it work?",
            "What is the difference between SQL and NoSQL databases?",
            "What is the purpose of authentication in a backend system?",
            "How would you debug a failing API endpoint?",
            "What is the difference between GET and POST requests?",
        ],
        "Intermediate": [
            "How would you design a scalable REST API?",
            "How would you optimize a slow database query?",
            "How do you handle authentication and authorization in an application?",
            "What strategies would you use for caching backend responses?",
            "How would you structure backend services for maintainability?",
        ],
        "Advanced": [
            "Design a backend architecture for a high-traffic application.",
            "How would you handle distributed transactions across services?",
            "What trade-offs would you consider when choosing between synchronous and asynchronous communication?",
            "How would you improve observability in a microservices environment?",
            "How would you design a resilient event-driven backend system?",
        ],
    },
}


LOW_EFFORT_PHRASES = {
    "i don't know",
    "dont know",
    "do not know",
    "no idea",
    "not sure",
    "i am not sure",
    "idk",
    "skip",
    "(no answer provided)",
    "",
}


def get_fallback_questions(
    career_title: str,
    difficulty: str,
    question_count: int,
) -> List[str]:
    role_bank = FALLBACK_QUESTIONS.get(career_title)
    if not role_bank:
        role_bank = FALLBACK_QUESTIONS.get("Systems Engineer", {})

    questions = role_bank.get(difficulty) or role_bank.get("Beginner") or []

    if not questions:
        questions = [
            "Tell me about yourself and your interest in this role.",
            "Describe a technical problem you solved recently.",
            "How do you approach debugging when something fails unexpectedly?",
            "How do you learn a new tool or technology quickly?",
            "What kind of technical work do you enjoy most and why?",
        ]

    result = []
    for i in range(question_count):
        result.append(questions[i % len(questions)])
    return result


def heuristic_score_answer(answer: str) -> Tuple[int, str]:
    text = (answer or "").strip().lower()
    words = [w for w in text.split() if w]

    if text in LOW_EFFORT_PHRASES:
        return (
            5,
            "This answer did not demonstrate understanding of the question. Try explaining even a partial idea, related concept, or how you would approach solving it."
        )

    if len(words) <= 3:
        return (
            10,
            "This answer is too short to show meaningful understanding. Add more detail, reasoning, and at least one relevant concept."
        )

    if len(words) <= 8:
        return (
            20,
            "This answer shows very limited depth. Improve it by defining the core idea and supporting it with a simple example."
        )

    if len(words) <= 20:
        return (
            35,
            "This answer shows partial effort, but it lacks depth and specificity. Improve it with better terminology and a clearer explanation."
        )

    quality_terms = [
        "because", "for example", "trade-off", "scal", "performance", "security",
        "availability", "latency", "database", "api", "architecture", "monitoring",
        "testing", "component", "state", "deployment", "cache", "network"
    ]
    hits = sum(1 for term in quality_terms if term in text)

    if hits >= 5:
        return (
            75,
            "This answer shows a solid attempt with relevant terminology and reasonable depth. To improve, make the explanation more structured and concrete."
        )

    if hits >= 3:
        return (
            60,
            "This answer covers some relevant concepts and shows moderate understanding. Improve it by adding clearer structure and a more specific example."
        )

    return (
        45,
        "This answer shows some effort, but it remains too general. Strengthen it by using more precise technical language and explaining your reasoning step by step."
    )


def generate_fallback_closing_remark(
    career_title: str,
    avg_score: int,
    answers: List[Dict],
) -> str:
    if avg_score >= 75:
        return (
            f"You showed a strong overall performance for the {career_title} interview. "
            f"Your best answers demonstrated relevant knowledge and solid structure. "
            f"Keep improving precision and consistency to become even more interview-ready."
        )

    if avg_score >= 50:
        return (
            f"You showed some promising understanding during this {career_title} interview, "
            f"but your answers need more depth and specificity. "
            f"Focus on using concrete examples and clearer technical reasoning in future practice."
        )

    return (
        f"This interview showed that you still need more practice for the {career_title} role. "
        f"Start with the fundamentals, and try answering each question with at least a partial explanation or approach. "
        f"With structured practice, your confidence will improve."
    )