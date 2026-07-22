import urllib.request
import json
import os

url = "http://127.0.0.1:8000/evaluate"
exam_id = 30
notes_path = os.path.abspath("backend/uploads/1784664245521-123031072-physics1.pdf")

test_cases = [
    {
        "desc": "Q1: State Newton's First Law (Correct, different wording)",
        "question": "State newton`s first law of motion?",
        "student_answer": "An object remains at rest or continues to move in a straight line at a constant speed unless acted upon by an unbalanced external force.",
        "expected_range": (95.0, 100.0)
    },
    {
        "desc": "Q2: State Newton's Second Law (Unrelated)",
        "question": "State newton`s second law of motion?",
        "student_answer": "I don't know who I am.",
        "expected_range": (0.0, 5.0)
    },
    {
        "desc": "Q3: State Newton's Third Law (Correct, exact)",
        "question": "State newton`s third law of motion?",
        "student_answer": "For every action there is an equal and opposite reaction.",
        "expected_range": (95.0, 100.0)
    }
]

print("Starting pipeline validation tests...\n")
all_passed = True

for tc in test_cases:
    print(f"--- Running: {tc['desc']} ---")
    data = {
        "exam_id": exam_id,
        "question": tc["question"],
        "student_answer": tc["student_answer"],
        "notes_path": notes_path
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            percentage = res["percentage"]
            print(f"Result:")
            print(f"  Final Score      : {percentage}%")
            print(f"  Semantic Score   : {res.get('semantic_score')}%")
            print(f"  Keyword Score    : {res.get('keyword_score')}%")
            
            result_str = str(res.get('result')).encode('ascii', 'ignore').decode('ascii')
            feedback_str = str(res.get('feedback')).encode('ascii', 'ignore').decode('ascii')
            ref_str = str(res.get('reference_answer')[:120]).encode('ascii', 'ignore').decode('ascii')
            
            print(f"  Result Category  : {result_str}")
            print(f"  Feedback         : {feedback_str}")
            print(f"  Retrieved Ref    : {ref_str}...")
            
            low, high = tc["expected_range"]
            if low <= percentage <= high:
                print("  STATUS           : PASS")
            else:
                print(f"  STATUS           : FAIL (Expected between {low}% and {high}%)")
                all_passed = False
    except Exception as e:
        print(f"  Request failed   : {e}")
        all_passed = False
    print()

if all_passed:
    print("ALL TESTS PASSED SUCCESSFULLY! (SUCCESS)")
else:
    print("SOME TESTS FAILED. Please check the implementation. (FAILURE)")
