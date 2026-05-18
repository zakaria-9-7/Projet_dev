from app.extensions import db
from datetime import datetime

class VersionFichier(db.Model):
    __tablename__ = 'versions'

    id = db.Column(db.Integer, primary_key=True)
    numero_version = db.Column(db.Integer, nullable=False)
    date_modification = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.String(300))
    chemin = db.Column(db.String(500))
    sha256 = db.Column(db.String(64), nullable=True)
    auteur_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    fichier_id = db.Column(db.Integer, db.ForeignKey('fichiers.id'))