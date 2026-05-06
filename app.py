import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'your_secret_key_here' # For development purposes

# Build absolute path for the SQLite database so it stays in the same folder
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'ai_evaluation.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False) # 'student' or 'teacher'
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    
    # Student specific fields
    roll_no = db.Column(db.String(50), nullable=True)
    semester = db.Column(db.String(20), nullable=True)

with app.app_context():
    db.create_all()

# --- Routes ---

@app.route('/')
def index():
    """Welcome Page"""
    return render_template('index.html')

@app.route('/auth')
def auth():
    """Dynamic Login/Register Page"""
    return render_template('auth.html')

@app.route('/dashboard')
def dashboard():
    """A simple dashboard for authenticated users."""
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    user = User.query.get(session['user_id'])
    return render_template('dashboard.html', user=user)

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))

# --- API Endpoints ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    role = data.get('role')
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'status': 'error', 'message': 'Email already registered.'}), 400

    new_user = User(
        role=role,
        name=name,
        email=email,
        password_hash=generate_password_hash(password)
    )

    if role == 'student':
        new_user.roll_no = data.get('rollNo')
        new_user.semester = data.get('semester')
        if not new_user.roll_no or not new_user.semester:
            return jsonify({'status': 'error', 'message': 'Roll Number and Semester are required for students.'}), 400

    db.session.add(new_user)
    db.session.commit()
    
    # Auto login after register
    session['user_id'] = new_user.id
    
    return jsonify({'status': 'success', 'message': f'{role.capitalize()} registered successfully!'})


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'status': 'error', 'message': 'Invalid email or password.'}), 401
    
    # Set session
    session['user_id'] = user.id
    
    return jsonify({
        'status': 'success', 
        'message': 'Logged in successfully!', 
        'role': user.role, 
        'name': user.name
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
