from flask import Blueprint, jsonify, request, g
from app.extensions import db
from app.models.log import Log
from app.models.user import User
from app.decorators import require_role

logs_bp = Blueprint('logs', __name__, url_prefix='/logs')

_LIMIT_MAX = 1000


def _log_to_dict(log):
    user = User.query.get(log.user_id) if log.user_id else None
    return {
        'id':          log.id,
        'action':      log.action,
        'statut':      log.statut,
        'user_email':  user.email if user else None,
        'date':        log.date.isoformat() if log.date else None,
        'resource_id': log.resource_id,
        'details':     log.details,
    }


# ── GET /logs/ ────────────────────────────────────────────────────
@logs_bp.route('/', methods=['GET'])
@require_role('AdminGlobal')
def get_all_logs():
    limit  = min(request.args.get('limit',  100, type=int), _LIMIT_MAX)
    offset = request.args.get('offset', 0, type=int)

    logs = (
        Log.query
        .order_by(Log.date.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return jsonify([_log_to_dict(l) for l in logs]), 200


# ── GET /logs/me ──────────────────────────────────────────────────
@logs_bp.route('/me', methods=['GET'])
def get_my_logs():
    user_id = g.user['id']
    limit   = min(request.args.get('limit',  100, type=int), _LIMIT_MAX)
    offset  = request.args.get('offset', 0, type=int)

    logs = (
        Log.query
        .filter_by(user_id=user_id)
        .order_by(Log.date.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return jsonify([_log_to_dict(l) for l in logs]), 200
