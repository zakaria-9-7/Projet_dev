from app.extensions import db
from datetime import datetime

class Log(db.Model):
    __tablename__ = 'logs'

    id          = db.Column(db.Integer, primary_key=True)
    action      = db.Column(db.String(200), nullable=False)  # ex: 'upload', 'download', 'connexion'
    statut      = db.Column(db.String(20))                   # 'succes' | 'echec'
    resource_id = db.Column(db.Integer, nullable=True)       # ID du fichier/dossier concerné
    details     = db.Column(db.Text, nullable=True)          # informations complémentaires libres
    date        = db.Column(db.DateTime, default=datetime.utcnow)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'))
from app.extensions import db
from datetime import datetime

class Log(db.Model):
    __tablename__ = 'logs'

    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(200), nullable=False)
    statut = db.Column(db.String(20))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
