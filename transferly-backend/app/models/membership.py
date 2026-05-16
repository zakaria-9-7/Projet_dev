from app.extensions import db
from datetime import datetime


class Membership(db.Model):
    __tablename__ = 'memberships'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    espace_id = db.Column(db.Integer, db.ForeignKey('espaces.id'), nullable=False)
    role = db.Column(db.String(20), default='membre')  # 'admin' | 'membre'
    date_ajout = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'espace_id', name='uq_user_espace'),
    )
