from app.extensions import db
from datetime import datetime, timedelta
import secrets


class Invitation(db.Model):
    __tablename__ = 'invitations'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    espace_id = db.Column(db.Integer, db.ForeignKey('espaces.id'), nullable=False)
    email = db.Column(db.String(150), nullable=True)  # null si invitation par lien générique
    cree_par = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    utilise = db.Column(db.Boolean, default=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    date_expiration = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(days=7))
