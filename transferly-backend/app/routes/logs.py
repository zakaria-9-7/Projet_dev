from flask import Blueprint, jsonify, request, g, Response
from app.extensions import db
from app.models.log import Log
from app.models.user import User
from app.models.fichier import Fichier
from app.decorators import require_role
from datetime import datetime, timedelta
import csv
from io import StringIO

logs_bp = Blueprint('logs', __name__, url_prefix='/logs')

_LIMIT_MAX = 1000


def _log_to_dict(log):
    user = User.query.get(log.user_id) if log.user_id else None
    user_email = log.user_email
    if not user_email:
        if user:
            user_email = user.email
        else:
            user_email = f"Utilisateur Supprimé (ID: {log.user_id})" if log.user_id else "Système"

    fichier_nom = None
    # Ne chercher le nom du fichier QUE si l'action n'est pas liée à un espace
    # (pour éviter que l'ID de l'espace ne matche un ID de fichier et n'affiche un nom zip)
    space_actions = ["CRÉATION D'ESPACE", "SUPPRESSION D'ESPACE", "GOUVERNANCE"]
    if log.resource_id and log.action not in space_actions:
        fic = Fichier.query.get(log.resource_id)
        if fic:
            fichier_nom = fic.nom
    return {
        'id':          log.id,
        'action':      log.action,
        'statut':      log.statut,
        'user_email':  user_email,
        'date':        log.date.isoformat() if log.date else None,
        'resource_id': log.resource_id,
        'details':     log.details,
        'fichier_nom': fichier_nom,
    }


# ── GET /logs/ ────────────────────────────────────────────────────
@logs_bp.route('/', methods=['GET'])
@require_role('AdminGlobal')
def get_all_logs():
    limit  = min(request.args.get('limit',  100, type=int), _LIMIT_MAX)
    offset = request.args.get('offset', 0, type=int)

    user_id = request.args.get('user_id', type=int)
    action = request.args.get('action')
    statut = request.args.get('statut')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    export_format = request.args.get('export')

    query = Log.query

    if user_id:
        query = query.filter(Log.user_id == user_id)
    if action:
        query = query.filter(Log.action == action)
    if statut:
        query = query.filter(Log.statut == statut)
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Log.date >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
            query = query.filter(Log.date < end_dt)
        except ValueError:
            pass

    query = query.order_by(Log.date.desc())

    if export_format == 'csv':
        logs = query.all()
        si = StringIO()
        cw = csv.writer(si)
        cw.writerow(['id', 'action', 'statut', 'user_email', 'date', 'resource_id', 'details'])
        for log in logs:
            user = User.query.get(log.user_id) if log.user_id else None
            user_email = log.user_email
            if not user_email:
                if user:
                    user_email = user.email
                else:
                    user_email = f"Utilisateur Supprimé (ID: {log.user_id})" if log.user_id else "Système"
            cw.writerow([log.id, log.action, log.statut, user_email, log.date.isoformat() if log.date else '', log.resource_id or '', log.details or ''])
        return Response(
            si.getvalue(),
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=logs_export.csv"}
        )

    logs = query.limit(limit).offset(offset).all()
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
