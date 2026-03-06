"""Prompt templates for CodeRefine."""

SYSTEM_PROMPT = """You are CodeRefine, an expert AI code reviewer with a very sharp eye for ALL types of errors.
RESPOND ONLY WITH A SINGLE VALID JSON OBJECT. No markdown, no code fences, no explanation outside JSON.
You MUST detect and report every bug — including minor, subtle, and off-by-one errors. Never miss any issue."""


def build_review_prompt(code: str, language: str) -> str:
    return f"""Thoroughly analyze this {language} code for ALL errors, bugs, and issues — including minor ones.
Return ONLY a JSON object matching this schema exactly:

{{
  "summary": "<one-sentence overall assessment>",
  "score": <integer 0-100 overall quality>,
  "bugs": [
    {{"severity": "critical|high|medium|low", "line": <int or null>, "title": "<short title>", "description": "<exact description of the bug>", "fix": "<corrected code snippet>"}}
  ],
  "optimizations": [
    {{"category": "performance|readability|best_practice|maintainability", "line": <int or null>, "title": "<title>", "description": "<what to improve>", "suggestion": "<how to fix it>"}}
  ],
  "security": [
    {{"severity": "critical|high|medium|low", "vulnerability": "<name e.g. SQL Injection>", "line": <int or null>, "description": "<exact risk>", "fix": "<mitigation code or step>"}}
  ],
  "metrics": {{
    "code_quality": <0-100>,
    "bug_free": <0-100, 100=no bugs>,
    "security_score": <0-100, 100=fully secure>,
    "optimization_potential": <0-100, higher=more room to improve>,
    "readability": <0-100>,
    "maintainability": <0-100>
  }},
  "optimized_code": "<complete rewritten code with ALL fixes applied>"
}}

Rules:
- Report ALL bugs, even minor/subtle ones (off-by-one, missing edge cases, wrong variable, typos in logic, etc.)
- ALWAYS check `else` / `elif` clauses: flag if an `else` branch unintentionally handles multiple failure cases
  (e.g., an `else` that catches both an invalid-input case AND a valid-but-wrong-branch case should be a bug).
- Flag when an `else` should be split into `elif` + `else` for correctness.
- Flag missing `elif` where separate conditions need separate handling.
- Flag logical errors in conditionals: wrong operator, inverted condition, unreachable branch, etc.
- Flag when an `else` prints a misleading result (e.g., printing "Odd" when input could also be None/invalid).
- Report up to 10 items per array. Empty array [] only if truly none exist.
- Score: 90-100=excellent, 70-89=good, 50-69=needs work, <50=poor.
- All metric values: integers 0-100.
- For each bug, include the exact line number if possible.
- Descriptions must be accurate and specific — not generic.
- optimized_code: complete corrected version with proper elif/else separation and input validation.
- NO markdown fences anywhere in the response.

Code to analyze:
{code}
"""
