from app.extensions import db

class ACL(db.Model):
    __tablename__ = 'acls'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    fichier_id = db.Column(db.Integer, db.ForeignKey('fichiers.id'), nullable=False)
    lecture = db.Column(db.Boolean, default=False)
    ecriture = db.Column(db.Boolean, default=False)
    upload = db.Column(db.Boolean, default=False)
    download = db.Column(db.Boolean, default=False)
    suppression = db.Column(db.Boolean, default=False)
    partage = db.Column(db.Boolean, default=False)