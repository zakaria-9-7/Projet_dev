import jwt
import os
from flask import request, g, jsonify

PUBLIC_ROUTES = ['/register', '/login', '/mfa/verify', '/forgot-password']

def register_middleware(app):
    @app.before_request
    def verify_token():
        
        if request.method == 'OPTIONS' :
            return 

        if request.path in PUBLIC_ROUTES or request.path.startswith('/reset-password/') :
            return 

        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer ') :
            return jsonify({'error': 'Token manquant'}), 401
        
        token = header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, os.getenv('SECRET_KEY', 'devsecret'), algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expiré'}), 401 
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401  

        
        g.user = {
            'id' : payload['user_id'],
            'role' : payload['role'],
            'email' : payload.get('email')
        }