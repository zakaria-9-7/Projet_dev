from flask import current_app
from flask_mail import Message
from app.extensions import mail


def send_otp_email(to_email: str, code: str, nom: str = None):
    try:
        nom_display = nom or to_email
        body = f"""Bonjour {nom_display},

Votre code de vérification Transferly : {code}

Ce code expire dans 5 minutes. Ne le partagez avec personne.

Si vous n'avez pas tenté de vous connecter, ignorez ce message.

— L'équipe Transferly"""
        msg = Message(
            subject="Transferly — Votre code de connexion",
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
        nom_display = nom or to_email
        body = f"""Bonjour {nom_display},

Vous avez demandé à réinitialiser votre mot de passe Transferly.

Cliquez sur ce lien pour choisir un nouveau mot de passe :
{reset_url}

Ce lien expire dans 15 minutes. Si vous n'avez pas demandé cette opération, ignorez ce message — votre mot de passe restera inchangé.

— L'équipe Transferly"""
        msg = Message(
            subject="Transferly — Réinitialisation de votre mot de passe",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi reset à {to_email}: {e}")
        return False
