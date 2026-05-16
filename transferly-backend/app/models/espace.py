from app.extensions import db

class Espace(db.Model):
    __tablename__ = 'espaces'

    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), unique=True, nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    quota = db.Column(db.Float, default=0.0)
    upload_policy = db.Column(db.String(20), default='tous')
    upload_autorises = db.Column(db.Text, default='')