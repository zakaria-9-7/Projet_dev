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


def send_invitation_email(to_email: str, invite_url: str, espace_nom: str, nom: str = None):
    try:
        nom_display = nom or to_email
        body = f"""Bonjour {nom_display},

Vous avez été invité à rejoindre l'espace "{espace_nom}" sur Transferly.

Cliquez sur ce lien pour accepter l'invitation :
{invite_url}

Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message.

— L'équipe Transferly"""
        msg = Message(
            subject="Transferly — Invitation à rejoindre un espace",
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
        nom_display = nom or to_email
        body = f"""Bonjour {nom_display},

Bienvenue sur Transferly ! Votre compte a bien été créé.

Vous pouvez dès maintenant vous connecter et commencer à utiliser votre espace de stockage personnel.

— L'équipe Transferly"""
        msg = Message(
            subject="Transferly — Bienvenue",
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
        nom_display = nom or to_email
        body = f"""Bonjour {nom_display},

Votre mot de passe Transferly vient d'être modifié avec succès.

Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement notre support.

— L'équipe Transferly"""
        msg = Message(
            subject="Transferly — Mot de passe modifié",
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
        nom_display = nom or to_email
        body = f"""Bonjour {nom_display},

Votre compte Transferly a été créé par un administrateur.

Vos identifiants de connexion :
  Adresse e-mail    : {to_email}
  Mot de passe temporaire : {temp_password}

À votre première connexion, vous devrez obligatoirement changer ce mot de passe avant d'accéder à l'application.

— L'équipe Transferly"""
        msg = Message(
            subject="Transferly — Bienvenue, votre compte a été créé",
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
        nom_display = nom or to_email
        body = f"""Bonjour {nom_display},

Votre compte Transferly a bien été supprimé. Nous vous remercions de nous avoir fait confiance.

Toutes vos données personnelles ont été effacées de nos serveurs.

Si vous souhaitez revenir, vous pouvez créer un nouveau compte à tout moment.

— L'équipe Transferly"""
        msg = Message(
            subject="Transferly — Compte supprimé",
            recipients=[to_email],
            body=body,
        )
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur envoi confirmation suppression à {to_email}: {e}")
        return False
