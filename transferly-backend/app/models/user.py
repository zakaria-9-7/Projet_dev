from app.extensions import db
from datetime import datetime
import json

DEFAULT_PREFERENCES = {
    "notif_partages": True,
    "notif_versions": True,
    "notif_connexions_suspectes": True,
    "notif_resume_hebdo": False,
    "confidentialite_profil_visible": True,
    "confidentialite_historique_connexion": True,
}

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
    _preferences = db.Column('preferences', db.Text, nullable=True)
    must_reset_password = db.Column(db.Boolean, default=False, nullable=False, server_default='0')

    otps = db.relationship('OTP', backref='user', lazy=True, cascade='all, delete')
    fichiers = db.relationship('Fichier', backref='owner', lazy=True)
    logs = db.relationship('Log', backref='user', lazy=True)

    @property
    def preferences(self):
        if self._preferences:
            try:
                stored = json.loads(self._preferences)
                # Merge with defaults so new keys are always present
                return {**DEFAULT_PREFERENCES, **stored}
            except (json.JSONDecodeError, TypeError):
                pass
        return dict(DEFAULT_PREFERENCES)

    @preferences.setter
    def preferences(self, value: dict):
        if isinstance(value, dict):
            self._preferences = json.dumps(value)
        else:
            self._preferences = None