from flask import current_app
from flask_mail import Message
from app.extensions import mail


def send_otp_email(to_email: str, code: str, nom: str = None):
    try:
        body = f"Code de validation : {code}\n\nCe code est temporaire et expire dans 5 minutes.\n\nLa cigale veille."
        msg = Message(
            subject="Wings — Code de validation",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi OTP à {to_email}: {e}")
        return False


def send_reset_email(to_email: str, reset_url: str, nom: str = None):
    try:
        body = f"""Une demande de modification de mot de passe a été initiée pour ton compte Wings.

Utilise le lien suivant pour configurer ton nouveau mot de passe :
{reset_url}

L'équipe Wings."""
        msg = Message(
            subject="Wings — Modification de mot de passe",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi reset à {to_email}: {e}")
        return False


def send_invitation_email(to_email: str, invite_url: str, espace_nom: str, nom: str = None):
    try:
        body = f"""Tu as été invité à rejoindre l'espace "{espace_nom}" sur Wings.

Lien d'invitation :
{invite_url}

L'équipe Wings."""
        msg = Message(
            subject=f"Wings — Invitation : {espace_nom}",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi invitation à {to_email}: {e}")
        return False


def send_welcome_email(to_email: str, nom: str = None):
    try:
        body = """Bienvenue sur Wings. Ton compte a été créé avec succès.

La cigale veille."""
        msg = Message(
            subject="Wings — Bienvenue",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi bienvenue à {to_email}: {e}")
        return False


def send_password_changed_email(to_email: str, nom: str = None):
    try:
        body = """Le mot de passe de ton compte Wings a été modifié.

Si tu n'es pas à l'origine de ce changement, contacte-nous immédiatement.

L'équipe Wings."""
        msg = Message(
            subject="Wings — Sécurité : Mot de passe modifié",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi confirmation mdp à {to_email}: {e}")
        return False


def send_temp_password_email(to_email: str, nom: str, temp_password: str):
    try:
        body = f"""Ton compte Wings a été créé par un administrateur.

Identifiants :
  E-mail   : {to_email}
  Pass     : {temp_password}

Un changement de mot de passe sera requis à la première connexion.

L'équipe Wings."""
        msg = Message(
            subject="Wings — Ton compte est prêt",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi compte temporaire à {to_email}: {e}")
        return False


def send_account_deleted_email(to_email: str, nom: str = None):
    try:
        body = """Ton compte Wings a été supprimé. Toutes tes données ont été effacées.

L'équipe Wings."""
        msg = Message(
            subject="Wings — Compte supprimé",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi confirmation suppression à {to_email}: {e}")
        return False
