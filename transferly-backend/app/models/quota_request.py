from app.extensions import db
from datetime import datetime

class QuotaRequest(db.Model):
    __tablename__ = 'quota_requests'

    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    espace_id     = db.Column(db.Integer, db.ForeignKey('espaces.id'), nullable=True)
    quota_demande = db.Column(db.Float, nullable=False)
    raison        = db.Column(db.Text, nullable=True)
    statut        = db.Column(db.String(20), default='pending', nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    traite_par    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    traite_at     = db.Column(db.DateTime, nullable=True)
    reponse_admin = db.Column(db.Text, nullable=True)

    demandeur = db.relationship(
        'User',
        foreign_keys=[user_id],
        backref=db.backref('quota_requests', lazy=True),
    )
    espace = db.relationship(
        'Espace',
        backref=db.backref('quota_requests', lazy=True),
    )
    admin = db.relationship(
        'User',
        foreign_keys=[traite_par],
        backref=db.backref('quota_requests_traites', lazy=True),
    )
