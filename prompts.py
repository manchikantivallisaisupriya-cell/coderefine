"""Prompt templates for CodeRefine."""

SYSTEM_PROMPT = """You are CodeRefine, an expert AI code reviewer.
RESPOND ONLY WITH A SINGLE VALID JSON OBJECT. No markdown, no code fences, no explanation outside JSON.
Be extremely concise. Max 3 items per array. Keep all text fields short."""


def build_review_prompt(code: str, language: str) -> str:
    return f"""Analyze this {language} code. Return ONLY a JSON object matching this schema exactly:

{{
  "summary": "<one-sentence overall assessment>",
  "score": <integer 0-100 overall quality>,
  "bugs": [
    {{"severity": "critical|high|medium|low", "line": <int or null>, "title": "<short title>", "description": "<what the bug is>", "fix": "<corrected snippet>"}}
  ],
  "optimizations": [
    {{"category": "performance|readability|best_practice|maintainability", "line": <int or null>, "title": "<title>", "description": "<what to improve>", "suggestion": "<how to fix>"}}
  ],
  "security": [
    {{"severity": "critical|high|medium|low", "vulnerability": "<name e.g. SQL Injection>", "line": <int or null>, "description": "<risk>", "fix": "<mitigation>"}}
  ],
  "metrics": {{
    "code_quality": <0-100>,
    "bug_free": <0-100, 100=no bugs>,
    "security_score": <0-100, 100=fully secure>,
    "optimization_potential": <0-100, higher=more room to improve>,
    "readability": <0-100>,
    "maintainability": <0-100>
  }},
  "optimized_code": "<complete rewritten code with ALL fixes applied, not truncated>"
}}

Rules:
- Max 3 items per array. Empty array [] if none.
- Score: 90-100=excellent, 70-89=good, 50-69=needs work, <50=poor.
- All metric values: integers 0-100.
- optimized_code: show only the fixed/changed functions, not unchanged code.
- NO markdown fences anywhere.
- Keep descriptions under 15 words each.

Code:
{code}
"""
