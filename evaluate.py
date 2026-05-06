import json
import re
import language_tool_python
from sentence_transformers import SentenceTransformer, util

# ==========================
# LOAD MODELS
# ==========================

print("Loading AI models...")

fast_model = SentenceTransformer('all-MiniLM-L6-v2')
accurate_model = SentenceTransformer('all-mpnet-base-v2')

tool = language_tool_python.LanguageTool('en-US')

print("Models Loaded Successfully\n")

# ==========================
# LOAD QUESTIONS
# ==========================

with open("question.json", "r") as file:
    data = json.load(file)

print("Available Questions:\n")

for item in data:
    print(item["id"], "-", item["question"])

# ==========================
# SELECT QUESTION
# ==========================

qid = int(input("\nEnter Question ID: "))

question = ""
model_answer = ""

for item in data:
    if item["id"] == qid:
        question = item["question"]
        model_answer = item["model_answer"]

print("\nQuestion:", question)

# ==========================
# STUDENT ANSWER
# ==========================

student_answer = input("\nEnter your answer: ")

print("\nModel Answer:", model_answer)
print("\nStudent Answer:", student_answer)

# ==========================
# SEMANTIC SIMILARITY
# ==========================

fast_emb1 = fast_model.encode(model_answer, convert_to_tensor=True)
fast_emb2 = fast_model.encode(student_answer, convert_to_tensor=True)

fast_similarity = util.cos_sim(fast_emb1, fast_emb2)

acc_emb1 = accurate_model.encode(model_answer, convert_to_tensor=True)
acc_emb2 = accurate_model.encode(student_answer, convert_to_tensor=True)

accurate_similarity = util.cos_sim(acc_emb1, acc_emb2)

semantic_score = (float(fast_similarity) + float(accurate_similarity)) / 2

print("\nFast Similarity:", round(float(fast_similarity)*100,2), "%")
print("Accurate Similarity:", round(float(accurate_similarity)*100,2), "%")

# ==========================
# QUESTION RELEVANCE CHECK
# ==========================

q_emb = accurate_model.encode(question, convert_to_tensor=True)
s_emb = accurate_model.encode(student_answer, convert_to_tensor=True)

question_similarity = util.cos_sim(q_emb, s_emb)

print("Question Relevance:", round(float(question_similarity)*100,2), "%")

# 🚨 STRICT REJECTION (IMPORTANT)
if semantic_score < 0.30 or float(question_similarity) < 0.30:
    print("\n❌ Answer is NOT relevant to the question")

    print("\nOverall Score: 0 %")
    print("Marks Obtained: 0 /10")
    print("Result: Incorrect Answer")

    exit()

# ==========================
# KEYWORD COVERAGE
# ==========================

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

keyword_score = matched / len(keywords)

print("\nKeyword Coverage:", round(keyword_score*100,2), "%")

# ==========================
# GRAMMAR CHECK
# ==========================

matches = tool.check(student_answer)

grammar_errors = len(matches)
words = len(student_answer.split())

grammar_score = max(0, 1 - (grammar_errors / max(words,1)))

print("Grammar Quality:", round(grammar_score*100,2), "%")

# ==========================
# FINAL SCORE
# ==========================

final_score = (
    semantic_score * 0.6 +
    keyword_score * 0.25 +
    grammar_score * 0.15
)

percentage = final_score * 100
marks = final_score * 10

print("\nOverall Score:", round(percentage,2), "%")
print("Marks Obtained:", round(marks,2), "/10")

# ==========================
# RESULT
# ==========================

if final_score > 0.75:
    result = "Excellent Answer"
elif final_score > 0.50:
    result = "Partially Correct"
else:
    result = "Incorrect Answer"

print("Result:", result)

# ==========================
# SMART FEEDBACK
# ==========================

print("\n========== FEEDBACK ==========")

if result == "Incorrect Answer":
    print("👉 Your answer is not correct. Please study the concept again.")

elif result == "Partially Correct":
    print("👉 Your answer is somewhat correct but needs improvement.")

elif result == "Excellent Answer":
    print("👉 Great job! Your answer is accurate and well written.")

# Missing keywords feedback
if missing_keywords:
    print("\n🔑 Missing Important Keywords:")
    print(", ".join(missing_keywords[:10]))

# Grammar feedback
if grammar_errors > 0:
    print("\n✍️ Grammar Suggestions:")
    for m in matches[:5]:
        print("-", m.message)