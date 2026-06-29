from typing import Any

# Placeholder AI service — wire up Claude / OpenAI here in a future iteration


def profile_suggestions(role: str, profile_data: dict[str, Any]) -> dict:
    """Return AI-generated tips to improve profile completion."""
    generic = [
        "Complete your bio with specific experience and achievements",
        "Add certifications to increase your credibility score",
        "Upload a professional profile photo",
        "List specific fitness areas you specialise in",
    ]
    role_tips = {
        "fitness_trainer": ["Include client transformation results and training methodology"],
        "fitness_coach":   ["Include client transformation results and training methodology"],
        "nutritionist":    ["Add case studies or client success stories"],
        "both":            ["Highlight your dual expertise with combined client success stories"],
    }
    tips = generic + role_tips.get(role, [])
    filled = sum(1 for v in profile_data.values() if v)
    total  = max(len(profile_data), 1)
    return {
        "suggestions": tips[:4],
        "estimated_score_boost": max(0, 100 - int(filled / total * 100)),
    }


def expert_matches(role: str, profile_data: dict[str, Any]) -> list:
    """Return AI-ranked expert IDs for a given user profile (stub)."""
    return []


def generate_bio(role: str, profile_data: dict[str, Any]) -> str:
    """Draft a professional bio from profile fields (stub)."""
    name = profile_data.get("name", "the expert")
    role_label = {
        "fitness_trainer": "Fitness Trainer",
        "fitness_coach":   "Fitness Trainer",
        "nutritionist":    "Nutritionist",
        "both":            "Fitness Trainer & Nutritionist",
    }.get(role, "Fitness Expert")
    return (
        f"{name} is an experienced {role_label} on the ZITLAS fitness platform. "
        "Connect to explore personalised plans and expert consultations."
    )


def generate_assessment(user_data: dict[str, Any]) -> dict:
    """Generate a basic fitness assessment from user input (stub)."""
    goal = user_data.get("fitness_goal", "general fitness")
    activity = user_data.get("activity_level", "moderate")
    return {
        "summary": f"Based on your goal of {goal} and {activity} activity level, you are ready to begin a structured fitness programme.",
        "bmi_category": "Normal",
        "recommended_frequency": "4–5 days per week",
        "focus_areas": ["Strength", "Cardiovascular Health", "Flexibility"],
        "readiness_score": 72,
    }


def generate_swot(user_data: dict[str, Any]) -> dict:
    """Generate a SWOT analysis for the user's fitness journey (stub)."""
    return {
        "strengths": [
            "Motivated to achieve fitness goals",
            "Consistent sleep schedule reported",
        ],
        "weaknesses": [
            "Sedentary work environment",
            "Limited prior structured exercise",
        ],
        "opportunities": [
            "Access to certified fitness trainers on ZITLAS",
            "AI-powered personalised plans available",
        ],
        "threats": [
            "Risk of injury without proper form guidance",
            "Nutritional gaps without professional advice",
        ],
    }


def generate_diet_plan(user_data: dict[str, Any]) -> dict:
    """Generate a basic AI diet plan (stub)."""
    goal = user_data.get("fitness_goal", "general wellness")
    return {
        "goal": goal,
        "daily_calories": 2000,
        "macros": {"protein_g": 150, "carbs_g": 200, "fat_g": 65},
        "meals": [
            {"meal": "Breakfast", "example": "Oats with banana, boiled eggs, green tea"},
            {"meal": "Mid-Morning", "example": "Handful of nuts, 1 fruit"},
            {"meal": "Lunch", "example": "Brown rice, dal, mixed vegetable sabzi, curd"},
            {"meal": "Evening Snack", "example": "Sprouts chaat or protein shake"},
            {"meal": "Dinner", "example": "Grilled chicken/paneer, salad, roti"},
        ],
        "hydration_ml": 3000,
        "note": "This is an AI-generated starter plan. Book a consultation with a Nutritionist on ZITLAS to get a personalised diet tailored to your specific needs.",
    }


def generate_workout_plan(user_data: dict[str, Any]) -> dict:
    """Generate a basic AI workout plan (stub)."""
    goal = user_data.get("fitness_goal", "general fitness")
    return {
        "goal": goal,
        "duration_weeks": 4,
        "sessions_per_week": 4,
        "weekly_plan": [
            {"day": "Monday",    "focus": "Upper Body Strength", "exercises": ["Push-ups 3×12", "Dumbbell rows 3×10", "Shoulder press 3×10"]},
            {"day": "Tuesday",   "focus": "Cardio & Core",       "exercises": ["30 min brisk walk/run", "Plank 3×45s", "Crunches 3×20"]},
            {"day": "Wednesday", "focus": "Rest / Active Recovery", "exercises": ["15 min yoga", "Light stretching"]},
            {"day": "Thursday",  "focus": "Lower Body Strength", "exercises": ["Squats 3×12", "Lunges 3×10 each", "Glute bridges 3×15"]},
            {"day": "Friday",    "focus": "Full Body HIIT",      "exercises": ["Burpees 3×10", "Jump squats 3×12", "Mountain climbers 3×20"]},
            {"day": "Saturday",  "focus": "Cardio",              "exercises": ["45 min cycling or swimming"]},
            {"day": "Sunday",    "focus": "Rest",                "exercises": ["Complete rest or leisure walk"]},
        ],
        "note": "This is an AI-generated starter plan. Book a consultation with a Fitness Trainer on ZITLAS to get a personalised workout programme.",
    }
