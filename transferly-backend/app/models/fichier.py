from app.extensions import db
from datetime import datetime

class Fichier(db.Model):
    __tablename__ = 'fichiers'

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(200), nullable=False)
    taille = db.Column(db.Float)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    chemin = db.Column(db.String(500))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    espace_id = db.Column(db.Integer, db.ForeignKey('espaces.id'), nullable=True)

    versions = db.relationship('VersionFichier', backref='fichier', lazy=True, cascade='all, delete')
    acls = db.relationship('ACL', backref='fichier', lazy=True, cascade='all, delete')