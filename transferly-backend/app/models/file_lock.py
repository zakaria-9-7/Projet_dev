from datetime import datetime
from app.extensions import db


class FileLock(db.Model):
    __tablename__ = 'file_locks'

    id            = db.Column(db.Integer, primary_key=True)
    fichier_id    = db.Column(db.Integer, db.ForeignKey('fichiers.id', ondelete='CASCADE'), nullable=False, unique=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_manual     = db.Column(db.Boolean, default=False, nullable=False)

    fichier = db.relationship('Fichier', backref='lock', uselist=False)
    user    = db.relationship('User')

    def is_expired(self, timeout_minutes=15):
        from datetime import timedelta
        return (datetime.utcnow() - self.last_activity) > timedelta(minutes=timeout_minutes)

    def to_dict(self):
        return {
            'id': self.id,
            'fichier_id': self.fichier_id,
            'user_id': self.user_id,
            'user_nom': self.user.nom if self.user else None,
            'user_email': self.user.email if self.user else None,
            'created_at': self.created_at.isoformat(),
            'last_activity': self.last_activity.isoformat(),
            'is_manual': self.is_manual,
        }
