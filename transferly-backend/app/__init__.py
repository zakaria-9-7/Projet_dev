from flask import Flask
from dotenv import load_dotenv
import os
from app.middleware import register_middleware
from app.models import db 
from app.routes.auth import auth_bp
from app.routes.files import files_bp
from app.routes.admin_global import admin_global_bp
from app.routes.admin_espace import admin_espace_bp
from app.routes.acl import acl_bp


load_dotenv()

def create_app():

    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URL'] = os.getenv('SQLALCHEMY_DATABASE_URL')

    db.init_app(app)

    register_middleware(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(admin_global_bp)
    app.register_blueprint(admin_espace_bp)
    app.register_blueprint(acl_bp)

    return app