from functools import wraps
from flask import g, jsonify


def require_role(role_name):

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'user', None)
            if user is None :
                return jsonify({'error': 'Utilisateur Inexistant'}), 401
            else :
                if user['role'] != role_name :
                    return jsonify({'error': 'Les rôles ne coincident pas'}), 403
                return f(*args, **kwargs)
        
        return wrapper
    return decorator