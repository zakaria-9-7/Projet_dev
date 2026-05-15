from flask import Flask
from dotenv import load_dotenv
import os
from app.middleware import register_middleware
from app.extensions import db, bcrypt
from app.routes.auth import auth_bp
from app.routes.files import files_bp
from app.routes.admin_global import admin_global_bp
from app.routes.admin_espace import admin_espace_bp
from app.routes.acl import acl_bp
from app.routes.logs import logs_bp
from app.routes.folders import folders_bp
from app.routes.version import versions_bp
from flask_cors import CORS

load_dotenv()

def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'devsecret')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwtdevsecret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'SQLALCHEMY_DATABASE_URL', 'sqlite:///transferly.db'
    )

    db.init_app(app)
    bcrypt.init_app(app)
    CORS(app, origins='*', supports_credentials=True)

    from app.routes.quota import quota_bp

    register_middleware(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(admin_global_bp)
    app.register_blueprint(admin_espace_bp)
    app.register_blueprint(acl_bp)
    app.register_blueprint(quota_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(folders_bp)
    app.register_blueprint(versions_bp)

    with app.app_context():
        db.create_all()

    return app