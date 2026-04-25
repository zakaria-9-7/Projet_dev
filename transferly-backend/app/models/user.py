from app.extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), default='Utilisateur')
    statut = db.Column(db.String(20), default='actif')
    quota = db.Column(db.Float, default=2.0)
    quota_utilise = db.Column(db.Float, default=0.0)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    otps = db.relationship('OTP', backref='user', lazy=True, cascade='all, delete')
    fichiers = db.relationship('Fichier', backref='owner', lazy=True)
    logs = db.relationship('Log', backref='user', lazy=True)