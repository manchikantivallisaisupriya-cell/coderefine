"""AI provider routing and response parsing for CodeRefine."""

import json
import os
import re

import httpx
from prompts import SYSTEM_PROMPT, build_review_prompt


SUPPORTED_LANGUAGES = [
    "JavaScript","TypeScript","HTML","CSS","SCSS",
    "Python","Java","C","C++","C#","Go","Rust","Kotlin","Swift","Dart","Scala","Groovy",
    "PHP","Ruby","Perl","Lua","Bash / Shell","PowerShell",
    "SQL","R","MATLAB",
    "Assembly","Zig","Nim",
    "Haskell","Elixir","Erlang","F#","Clojure","OCaml",
    "Visual Basic","COBOL","Fortran","Lisp",
    "YAML","JSON","XML","TOML",
    "Objective-C","Other",
]

PROVIDERS = {
    "gemini":      "Google Gemini",
    "groq":        "Groq (LLaMA 3)",
    "huggingface": "Hugging Face",
}


def analyze_code(code: str, language: str, provider: str = "gemini") -> dict:
    provider = provider.lower()
    if provider == "gemini":
        raw = _call_gemini(code, language)
    elif provider == "groq":
        raw = _call_groq(code, language)
    elif provider == "huggingface":
        raw = _call_huggingface(code, language)
    else:
        raise ValueError(f"Unknown provider: {provider}")
    return _parse_response(raw)


# Fallback model chain — tried in order if quota is exhausted
_GEMINI_FALLBACKS = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]

def _call_gemini(code: str, language: str) -> str:
    import time
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in .env")

    # Build model list: configured model first, then fallbacks
    primary = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    models = [primary] + [m for m in _GEMINI_FALLBACKS if m != primary]

    # Truncate large inputs to keep latency low (keep first 60 lines)
    code_lines = code.split("\n")
    if len(code_lines) > 60:
        code = "\n".join(code_lines[:60]) + "\n# ... (truncated to first 60 lines for analysis)"

    payload = {
        "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\n{build_review_prompt(code, language)}"}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1200},
    }

    last_err = None
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        for attempt in range(2):  # up to 2 retries per model
            with httpx.Client(timeout=30.0) as client:
                r = client.post(url, json=payload)

            if r.status_code == 200:
                try:
                    return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                except (KeyError, IndexError) as e:
                    raise ValueError(f"Unexpected Gemini response: {r.json()}") from e

            if r.status_code == 429:
                # Extract retry delay from error message if available
                wait = 8 * (attempt + 1)  # 8s, 16s
                try:
                    msg = r.json().get("error", {}).get("message", "")
                    import re as _re
                    m = _re.search(r"retry in ([\d.]+)s", msg)
                    if m:
                        wait = min(int(float(m.group(1))) + 1, 20)
                except Exception:
                    pass
                last_err = f"Quota exceeded on {model}, retrying in {wait}s…"
                time.sleep(wait)
                continue  # retry same model

            # Non-429 error — try next model immediately
            last_err = f"Gemini API error {r.status_code} on {model}: {r.text[:200]}"
            break

    raise ValueError(last_err or "All Gemini models failed.")


def _call_groq(code: str, language: str) -> str:
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in .env")
    # Truncate large inputs
    code_lines = code.split("\n")
    if len(code_lines) > 60:
        code = "\n".join(code_lines[:60]) + "\n# ... (truncated)"
    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        temperature=0.1,
        max_tokens=1200,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": build_review_prompt(code, language)},
        ],
    )
    return completion.choices[0].message.content.strip()


def _call_huggingface(code: str, language: str) -> str:
    api_key = os.getenv("HF_API_KEY")
    if not api_key:
        raise ValueError("HF_API_KEY not set in .env")
    # Truncate large inputs
    code_lines = code.split("\n")
    if len(code_lines) > 60:
        code = "\n".join(code_lines[:60]) + "\n# ... (truncated)"
    model_id = os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
    url = f"https://api-inference.huggingface.co/models/{model_id}/v1/chat/completions"
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": build_review_prompt(code, language)},
        ],
        "temperature": 0.1,
        "max_tokens": 1200,
    }
    with httpx.Client(timeout=45.0) as client:
        r = client.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
    if r.status_code != 200:
        raise ValueError(f"HuggingFace API error {r.status_code}: {r.text}")
    data = r.json()
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected HF response: {data}") from e


def _parse_response(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(0)
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Could not parse JSON from model response:\n{raw}") from e

    result.setdefault("summary", "No summary provided.")
    result.setdefault("score", 0)
    result.setdefault("bugs", [])
    result.setdefault("optimizations", [])
    result.setdefault("security", [])
    result.setdefault("optimized_code", "")
    result.setdefault("metrics", {
        "code_quality":           result.get("score", 0),
        "bug_free":               max(0, 100 - len(result.get("bugs", [])) * 15),
        "security_score":         max(0, 100 - len(result.get("security", [])) * 20),
        "optimization_potential": min(100, len(result.get("optimizations", [])) * 18),
        "readability":            70,
        "maintainability":        70,
    })
    return result
