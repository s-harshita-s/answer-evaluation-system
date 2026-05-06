import re
import language_tool_python
from sentence_transformers import SentenceTransformer, util
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

print("Loading AI models...")
fast_model = SentenceTransformer('all-MiniLM-L6-v2')
accurate_model = SentenceTransformer('all-mpnet-base-v2')
tool = language_tool_python.LanguageTool('en-US')
print("Models Loaded Successfully\n")

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    question = data.get('question', "")
    model_answer = data.get('model_answer', "")
    student_answer = data.get('student_answer', "")

    if not question or not model_answer or not student_answer:
        return jsonify({"error": "Missing question, model_answer, or student_answer"}), 400

    # SEMANTIC SIMILARITY
    fast_emb1 = fast_model.encode(model_answer, convert_to_tensor=True)
    fast_emb2 = fast_model.encode(student_answer, convert_to_tensor=True)
    fast_similarity = util.cos_sim(fast_emb1, fast_emb2)

    acc_emb1 = accurate_model.encode(model_answer, convert_to_tensor=True)
    acc_emb2 = accurate_model.encode(student_answer, convert_to_tensor=True)
    accurate_similarity = util.cos_sim(acc_emb1, acc_emb2)

    semantic_score = (float(fast_similarity) + float(accurate_similarity)) / 2

    # QUESTION RELEVANCE CHECK
    q_emb = accurate_model.encode(question, convert_to_tensor=True)
    s_emb = accurate_model.encode(student_answer, convert_to_tensor=True)
    question_similarity = util.cos_sim(q_emb, s_emb)

    if semantic_score < 0.30 or float(question_similarity) < 0.30:
        return jsonify({
            "percentage": 0,
            "marks": 0,
            "result": "Incorrect Answer",
            "semantic_score": round(float(semantic_score) * 100, 2),
            "keyword_score": 0,
            "grammar_score": 0,
            "feedback": ["Your answer is NOT relevant to the question"]
        })

    # KEYWORD COVERAGE
    keywords = re.findall(r'\b[a-zA-Z]{4,}\b', model_answer.lower())
    keywords = list(set(keywords))
    student_words = student_answer.lower()
    
    matched = 0
    missing_keywords = []
    for word in keywords:
        if word in student_words:
            matched += 1
        else:
            missing_keywords.append(word)
    
    keyword_score = matched / len(keywords) if keywords else 1.0

    # GRAMMAR CHECK
    matches = tool.check(student_answer)
    grammar_errors = len(matches)
    words = len(student_answer.split())
    grammar_score = max(0, 1 - (grammar_errors / max(words,1)))

    # FINAL SCORE
    final_score = (float(semantic_score) * 0.6 + keyword_score * 0.25 + float(grammar_score) * 0.15)
    percentage = final_score * 100
    marks = final_score * 10

    if final_score > 0.75:
        result = "Excellent Answer"
    elif final_score > 0.50:
        result = "Partially Correct"
    else:
        result = "Incorrect Answer"

    feedback = []
    if result == "Incorrect Answer":
        feedback.append("Your answer is not correct. Please study the concept again.")
    elif result == "Partially Correct":
        feedback.append("Your answer is somewhat correct but needs improvement.")
    elif result == "Excellent Answer":
        feedback.append("Great job! Your answer is accurate and well written.")

    if missing_keywords:
        feedback.append(f"Missing Important Keywords: {', '.join(missing_keywords[:10])}")
    
    if grammar_errors > 0:
        grammar_suggestions = [m.message for m in matches[:5]]
        feedback.append(f"Grammar Suggestions: {'; '.join(grammar_suggestions)}")

    return jsonify({
        "percentage": round(percentage, 2),
        "marks": round(marks, 2),
        "result": result,
        "semantic_score": round(float(semantic_score) * 100, 2),
        "keyword_score": round(keyword_score * 100, 2),
        "grammar_score": round(grammar_score * 100, 2),
        "feedback": feedback
    })

if __name__ == '__main__':
    app.run(port=8000, debug=True)
