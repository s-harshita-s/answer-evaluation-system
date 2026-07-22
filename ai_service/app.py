import os
import re
import json
import faiss
import numpy as np
import fitz
import pdfplumber
from pypdf import PdfReader
import docx
import language_tool_python
from sentence_transformers import SentenceTransformer, util
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
# Also search parent directory for .env
parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(parent_env):
    load_dotenv(parent_env)

app = Flask(__name__)
CORS(app)

print("Loading AI models...")
try:
    fast_model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f"Online load failed ({e}), loading fast_model offline...")
    fast_model = SentenceTransformer('all-MiniLM-L6-v2', local_files_only=True)


def check_grammar(student_answer):
    """Safe, fast grammar checker with 2-second timeout and heuristic fallback to prevent server hangs."""
    if not student_answer or not student_answer.strip():
        return 1.0, 0, []

    words = student_answer.split()
    word_count = len(words)

    # Try LanguageTool with strict 2-second timeout
    try:
        import concurrent.futures
        def _lt_call():
            import language_tool_python
            t = language_tool_python.LanguageToolPublicAPI('en-US')
            return t.check(student_answer)
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_lt_call)
            matches = future.result(timeout=2.0)
            grammar_errors = len(matches)
            grammar_score = max(0, 1 - (grammar_errors / max(word_count, 1)))
            suggestions = [m.message for m in matches[:5]]
            return grammar_score, grammar_errors, suggestions
    except Exception:
        pass

    # Fast heuristic fallback (0ms, 100% reliable)
    errors = []
    if student_answer[0].islower():
        errors.append("Sentence should start with a capital letter.")
    if not student_answer.strip().endswith(('.', '?', '!')):
        errors.append("Sentence should end with proper punctuation (. ! ?).")
    repeated = re.findall(r'\b(\w+)\s+\1\b', student_answer, flags=re.IGNORECASE)
    if repeated:
        errors.append(f"Repeated words found: {', '.join(set(repeated))}")

    grammar_errors = len(errors)
    grammar_score = max(0.5, 1 - (grammar_errors * 0.15))
    return grammar_score, grammar_errors, errors

print("Models Loaded Successfully\n")

# Vector Database directory
VECTOR_DBS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vector_dbs')
if not os.path.exists(VECTOR_DBS_DIR):
    os.makedirs(VECTOR_DBS_DIR)

# Configure Gemini
gemini_api_key = os.environ.get("GEMINI_API_KEY")
if gemini_api_key and gemini_api_key != "your_gemini_api_key_here":
    genai.configure(api_key=gemini_api_key)
    print("Gemini API configured successfully.")
else:
    print("WARNING: GEMINI_API_KEY not found in environment. Reference answers will fall back to raw note text.")

import threading
indexing_lock = threading.Lock()

# --- Text Extraction Helpers ---

def extract_text_from_pdf(filepath):
    text = ""
    # Method 1: PyMuPDF (fitz) - Extremely fast (< 1 sec) & handles malformed streams
    try:
        doc = fitz.open(filepath)
        for page in doc:
            t = page.get_text()
            if t:
                text += t + "\n"
        if len(text.strip()) > 30:
            print(f"Extracted {len(text)} characters using PyMuPDF (fitz)")
            return text
    except Exception as e:
        print(f"PyMuPDF extraction error: {e}")

    # Method 2: pdfplumber fallback
    try:
        with pdfplumber.open(filepath) as pdf:
            p_text = ""
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    p_text += t + "\n"
            if len(p_text.strip()) > 30:
                print(f"Extracted {len(p_text)} characters using pdfplumber")
                return p_text
    except Exception as e:
        print(f"pdfplumber extraction error: {e}")

    # Method 3: PyPDF with strict=False fallback
    try:
        reader = PdfReader(filepath, strict=False)
        p_text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                p_text += t + "\n"
        if len(p_text.strip()) > 30:
            print(f"Extracted {len(p_text)} characters using PyPDF")
            return p_text
    except Exception as e:
        print(f"PyPDF extraction error: {e}")

    # Method 4: Fast Local EasyOCR on PDF page images (dpi=90, max 2 pages for instant response)
    try:
        import easyocr
        from PIL import Image
        import io
        print("Attempting fast local EasyOCR on PDF page images...")
        ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        doc = fitz.open(filepath)
        e_text = ""
        for page in doc[:2]:
            pix = page.get_pixmap(dpi=90)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            res = ocr_reader.readtext(np.array(img), detail=0)
            if res:
                e_text += " ".join(res) + "\n"
        if len(e_text.strip()) > 30:
            print(f"Extracted {len(e_text)} characters using fast EasyOCR")
            return e_text
    except Exception as e:
        print(f"EasyOCR attempt failed: {e}")

    # Method 5: Local pytesseract OCR if available
    try:
        import pytesseract
        from PIL import Image
        import io
        print("Attempting local Tesseract OCR on PDF page images...")
        doc = fitz.open(filepath)
        ocr_text = ""
        for page in doc[:8]:
            pix = page.get_pixmap(dpi=100)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            t = pytesseract.image_to_string(img)
            if t:
                ocr_text += t + "\n"
        if len(ocr_text.strip()) > 30:
            print(f"Extracted {len(ocr_text)} characters using local Tesseract OCR")
            return ocr_text
    except Exception as e:
        print(f"Local Tesseract OCR attempt failed: {e}")

    return text

def extract_text_from_docx(filepath):
    doc = docx.Document(filepath)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)

def extract_text_from_txt(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def chunk_text(text):
    """Sentence-based sliding window chunking to keep concepts localized."""
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return []
    # Split text into sentences
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 10]
    
    chunks = []
    for i in range(len(sentences)):
        chunk = " ".join(sentences[i:i+2])
        if chunk.strip():
            chunks.append(chunk)
    return chunks



def perform_indexing(exam_id, notes_path):
    with indexing_lock:
        exam_db_dir = os.path.join(VECTOR_DBS_DIR, f"exam_{exam_id}")
        index_path = os.path.join(exam_db_dir, "index.faiss")
        chunks_path = os.path.join(exam_db_dir, "chunks.json")
        
        if not os.path.exists(notes_path):
            raise FileNotFoundError(f"Notes file not found at {notes_path}")
            
        _, ext = os.path.splitext(notes_path.lower())
        
        # Extract text based on file format
        if ext == '.pdf':
            text = extract_text_from_pdf(notes_path)
            if not text or not text.strip():
                api_key = os.environ.get("GEMINI_API_KEY")
                if api_key and api_key != "your_gemini_api_key_here":
                    print("PDF text extraction returned empty. Attempting Gemini OCR/transcription...")
                    try:
                        genai.configure(api_key=api_key)
                        uploaded_file = genai.upload_file(path=notes_path)
                        model = genai.GenerativeModel('gemini-1.5-flash')
                        response = model.generate_content([
                            uploaded_file, 
                            "Extract all text content from this document. Output only the transcribed text of the document page by page in markdown format. Do not summarize or add commentary."
                        ])
                        text = response.text
                        try:
                            uploaded_file.delete()
                        except Exception:
                            pass
                    except Exception as e:
                        raise RuntimeError(f"Gemini OCR failed: {str(e)}")
                else:
                    raise ValueError("The uploaded PDF appears to be a scanned image without selectable text. Please upload a text-searchable PDF/docx/txt file or configure GEMINI_API_KEY in .env for AI vision OCR.")
        elif ext in ['.docx', '.doc']:
            text = extract_text_from_docx(notes_path)
        elif ext in ['.txt', '.md']:
            text = extract_text_from_txt(notes_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
            
        if not text or not text.strip():
            raise ValueError("Extracted text is empty. Ensure the file has readable text content.")
            
        # Chunk text
        chunks = chunk_text(text)
        if not chunks:
            raise ValueError("No text chunks could be generated")
            
        # Encode chunks using fast_model (all-MiniLM-L6-v2)
        embeddings = fast_model.encode(chunks, convert_to_numpy=True, show_progress_bar=False)
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        embeddings = embeddings / np.where(norms == 0, 1.0, norms)
        embeddings = np.array(embeddings).astype('float32')
        
        # Build FAISS index using Inner Product (Inner Product on normalized vectors is Cosine Similarity)
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings)
        
        # Save vector database
        if not os.path.exists(exam_db_dir):
            os.makedirs(exam_db_dir)
            
        faiss.write_index(index, index_path)
        with open(chunks_path, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
            
        return len(chunks)


# --- Endpoints ---

@app.route('/index-notes', methods=['POST'])
def index_notes():
    data = request.json
    exam_id = data.get('exam_id')
    notes_path = data.get('notes_path')
    
    if not exam_id or not notes_path:
        return jsonify({"error": "Missing exam_id or notes_path"}), 400
        
    try:
        chunks_count = perform_indexing(exam_id, notes_path)
        return jsonify({
            "status": "success",
            "message": f"Successfully indexed unit notes for exam {exam_id}",
            "chunks_count": chunks_count
        })
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error during indexing notes: {e}")
        return jsonify({"error": f"Indexing error: {str(e)}"}), 500


@app.route('/auto-index-all', methods=['POST'])
def auto_index_all():
    """Scan backend uploads and SQLite database for active exams and index their unit notes if missing."""
    import sqlite3
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # project root
    db_path = os.path.join(project_root, 'backend', 'database.sqlite')
    uploads_dir = os.path.join(project_root, 'backend', 'uploads')
    
    if not os.path.exists(db_path):
        return jsonify({"error": f"Database not found at {db_path}"}), 404
        
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, notes_file FROM exams WHERE IFNULL(is_deleted, 0) = 0 AND notes_file IS NOT NULL AND notes_file != ''")
        active_exams = cursor.fetchall()
        conn.close()
        
        results = []
        indexed_count = 0
        for exam_id, title, notes_file in active_exams:
            exam_db_dir = os.path.join(VECTOR_DBS_DIR, f"exam_{exam_id}")
            index_path = os.path.join(exam_db_dir, "index.faiss")
            chunks_path = os.path.join(exam_db_dir, "chunks.json")
            
            notes_path = os.path.join(uploads_dir, notes_file)
            if not os.path.exists(notes_path):
                results.append({"exam_id": exam_id, "title": title, "status": "skipped", "reason": f"Notes file missing: {notes_file}"})
                continue
                
            if not (os.path.exists(index_path) and os.path.exists(chunks_path)):
                try:
                    c_count = perform_indexing(exam_id, notes_path)
                    indexed_count += 1
                    results.append({"exam_id": exam_id, "title": title, "status": "indexed", "chunks": c_count})
                except Exception as e:
                    results.append({"exam_id": exam_id, "title": title, "status": "failed", "error": str(e)})
            else:
                results.append({"exam_id": exam_id, "title": title, "status": "already_indexed"})
                
        return jsonify({
            "status": "success",
            "indexed_exams_count": indexed_count,
            "details": results
        })
    except Exception as e:
        print(f"Error during auto-index-all: {e}")
        return jsonify({"error": str(e)}), 500


ENGLISH_STOPWORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", "you'll", "you'd",
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 'her', 'hers',
    'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
    'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
    'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should',
    "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', "aren't", 'couldn', "couldn't",
    'didn', "didn't", 'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't", 'isn', "isn't",
    'ma', 'mightn', "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't",
    'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't"
}

def lemmatize_word(word):
    w = word.lower()
    try:
        from nltk.stem import WordNetLemmatizer
        lemmatizer = WordNetLemmatizer()
        lemma = lemmatizer.lemmatize(w, pos='n')
        lemma = lemmatizer.lemmatize(lemma, pos='v')
        lemma = lemmatizer.lemmatize(lemma, pos='a')
        return lemma
    except Exception:
        # Fallback rule-based lemmatizer
        if w.endswith('ies') and len(w) > 4:
            return w[:-3] + 'y'
        if w.endswith('sses') or w.endswith('shes') or w.endswith('ches'):
            return w[:-2]
        if w.endswith('es') and len(w) > 3:
            return w[:-1]
        if w.endswith('s') and not w.endswith('ss') and len(w) > 2:
            return w[:-1]
        if w.endswith('ed') and len(w) > 3:
            return w[:-2]
        if w.endswith('ing') and len(w) > 4:
            return w[:-3]
        return w

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()
    words = [w for w in words if w not in ENGLISH_STOPWORDS]
    lemmatized = [lemmatize_word(w) for w in words]
    return " ".join(lemmatized)

def get_synonym_expanded_keyword_score(student_preprocessed, reference_preprocessed):
    from nltk.corpus import wordnet as wn
    ref_words = reference_preprocessed.split()
    stu_words = set(student_preprocessed.split())
    
    if not ref_words:
        return 0.0
        
    matched_count = 0
    for r_word in ref_words:
        if r_word in stu_words:
            matched_count += 1
            continue
        
        # WordNet synonyms lookup
        synonyms = set()
        try:
            for syn in wn.synsets(r_word):
                for lm in syn.lemmas():
                    syn_name = lm.name().lower().replace('_', ' ')
                    syn_name_prep = preprocess_text(syn_name)
                    for w in syn_name_prep.split():
                        synonyms.add(w)
        except Exception:
            pass
            
        if synonyms.intersection(stu_words):
            matched_count += 1
            
    return (matched_count / len(ref_words)) * 100


def normalize_similarity(sim):
    # Map raw cosine similarity to 0-100:
    if sim >= 0.75:
        return 95.0 + (sim - 0.75) / (1.0 - 0.75) * 5.0
    elif sim >= 0.50:
        return 75.0 + (sim - 0.50) / (0.75 - 0.50) * 20.0
    elif sim >= 0.25:
        return 15.0 + (sim - 0.25) / (0.50 - 0.25) * 60.0
    else:
        return max(0.0, sim) / 0.25 * 14.9

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    exam_id = data.get('exam_id')
    question = data.get('question', "")
    student_answer = data.get('student_answer', "")
    notes_path = data.get('notes_path')

    if not question or not student_answer:
        return jsonify({"error": "Missing question or student_answer"}), 400

    # Retrieve relevant notes from vector database
    retrieved_chunks = []
    if exam_id:
        exam_db_dir = os.path.join(VECTOR_DBS_DIR, f"exam_{exam_id}")
        index_path = os.path.join(exam_db_dir, "index.faiss")
        chunks_path = os.path.join(exam_db_dir, "chunks.json")
        
        # On-the-fly indexing if the index is missing but notes_path is provided
        if not (os.path.exists(index_path) and os.path.exists(chunks_path)) and notes_path:
            try:
                print(f"On-the-fly indexing initiated for exam {exam_id} with notes: {notes_path}")
                perform_indexing(exam_id, notes_path)
            except Exception as e:
                print(f"On-the-fly indexing failed for exam {exam_id}: {e}")
        
        if os.path.exists(index_path) and os.path.exists(chunks_path):
            try:
                index = faiss.read_index(index_path)
                with open(chunks_path, 'r', encoding='utf-8') as f:
                    chunks = json.load(f)
                    
                # Search index using normalized question embedding
                query_emb = fast_model.encode([question], convert_to_numpy=True)
                q_norm = np.linalg.norm(query_emb, axis=1, keepdims=True)
                query_emb = query_emb / np.where(q_norm == 0, 1.0, q_norm)
                query_emb = np.array(query_emb).astype('float32')
                
                k = min(2, len(chunks))
                distances, indices = index.search(query_emb, k)
                
                for idx in indices[0]:
                    if idx != -1 and idx < len(chunks):
                        retrieved_chunks.append(chunks[idx])
            except Exception as e:
                print(f"Error reading vector database for exam {exam_id}: {e}")

    # Generate Reference Answer (Core Concept from Notes)
    reference_answer = ""
    if retrieved_chunks:
        reference_answer = " ".join(retrieved_chunks)
    else:
        # Fallback to direct model_answer if passed in body
        reference_answer = data.get('model_answer', '')
        if not reference_answer:
            reference_answer = "No unit notes were uploaded for this exam, and no reference answer could be retrieved."

    # Preprocess student answer and reference answer
    student_preprocessed = preprocess_text(student_answer)
    reference_preprocessed = preprocess_text(reference_answer)

    # Sentence-by-sentence concept coverage for Semantic Evaluation
    ref_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', reference_answer) if len(s.strip()) > 8]
    student_emb = fast_model.encode(student_answer, convert_to_tensor=True)
    
    if ref_sentences:
        sent_sims = []
        for r_sent in ref_sentences:
            r_emb = fast_model.encode(r_sent, convert_to_tensor=True)
            sent_sims.append(float(util.cos_sim(student_emb, r_emb)))
        raw_similarity = max(sent_sims)
    else:
        ref_emb = fast_model.encode(reference_answer, convert_to_tensor=True)
        raw_similarity = float(util.cos_sim(student_emb, ref_emb))

    # Subject-Independent Keyword Evaluation (Sentence-by-sentence max to prevent dilution)
    ref_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', reference_answer) if len(s.strip()) > 8]
    if ref_sentences:
        kw_scores = []
        for r_sent in ref_sentences:
            kw_scores.append(get_synonym_expanded_keyword_score(student_preprocessed, preprocess_text(r_sent)))
        keyword_score = max(kw_scores)
    else:
        keyword_score = get_synonym_expanded_keyword_score(student_preprocessed, reference_preprocessed)

    # Boost if semantic similarity is reasonably high and we have high synonym keyword coverage
    # This denotes a correct answer written with different wording
    boost = 0.0
    if raw_similarity >= 0.60 and keyword_score >= 55.0:
        boost = 0.30

    final_similarity = min(1.0, raw_similarity + boost)

    # Normalize Semantic Similarity to 0-100
    semantic_score = normalize_similarity(final_similarity)

    # Boost keyword score if semantic similarity is high to prevent word choice penalties
    if final_similarity >= 0.75:
        keyword_score = max(keyword_score, semantic_score)

    # Final Score formula: 70% Semantic + 30% Keyword
    final_score = (0.7 * semantic_score) + (0.3 * keyword_score)
    final_score = max(0.0, min(100.0, final_score))

    # Enforce validation rules
    if final_similarity > 0.90:
        final_score = max(90.1, final_score)
    elif 0.75 <= final_similarity <= 0.90:
        final_score = max(75.0, min(90.0, final_score))
    elif final_similarity < 0.25:
        final_score = min(14.9, final_score)

    # Generate feedback based on score
    if final_score >= 90:
        result = "Excellent Answer"
        feedback = ["Excellent answer. Great job! Your answer matches the required concept from the unit notes."]
    elif final_score >= 75:
        result = "Good Answer with minor missing details"
        feedback = ["Good answer with minor missing details. You covered the main concept, but missed some specific vocabulary or phrasing."]
    elif final_score >= 50:
        result = "Partially Correct"
        feedback = ["Partially correct. Your answer covers some parts of the concept but is incomplete."]
    else:
        result = "Incorrect Answer"
        feedback = ["Incorrect answer. Your answer does not match the core concept required by the unit notes."]

    grammar_score, grammar_errors, grammar_suggestions = check_grammar(student_answer)
    if grammar_suggestions:
        feedback.append(f"Grammar Tips: {'; '.join(grammar_suggestions)}")

    return jsonify({
        "percentage": round(final_score, 2),
        "marks": round(final_score / 10.0, 2),
        "result": result,
        "semantic_score": round(semantic_score, 2),
        "keyword_score": round(keyword_score, 2),
        "grammar_score": round(grammar_score * 100, 2) if grammar_score <= 1.0 else grammar_score,
        "feedback": feedback,
        "reference_answer": reference_answer
    })

if __name__ == '__main__':
    app.run(port=8000, debug=False, threaded=True)
