"""
Script de migration idempotent pour Transferly.
Usage : python3 migrate.py

- Crée toutes les tables manquantes via db.create_all().
- Ajoute les colonnes ajoutées après coup via ALTER TABLE protégés (ignore
  "duplicate column" pour rester idempotent).
- Affiche un résumé clair pour chaque colonne.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db

# ---------------------------------------------------------------------------
# Colonnes à garantir  :  (table, colonne, définition SQL)
# ---------------------------------------------------------------------------
COLUMNS = [
    # Fichiers
    ("fichiers",  "folder_id",        "INTEGER REFERENCES folders(id)"),

    # Espaces
    ("espaces",   "upload_policy",    "VARCHAR(20) DEFAULT 'tous'"),
    ("espaces",   "upload_autorises", "TEXT DEFAULT ''"),
    ("espaces",   "statut",           "VARCHAR(20) DEFAULT 'actif'"),

    # Users – colonne preferences ajoutée pour les paramètres utilisateur
    ("users",     "preferences",      "TEXT"),

    # Versions – colonne sha256 et auteur_id ajoutées après coup
    ("versions",  "sha256",           "VARCHAR(64)"),
    ("versions",  "auteur_id",        "INTEGER REFERENCES users(id)"),

    # Logs – resource_id et details ajoutés pour journalisation enrichie
    ("logs",      "resource_id",      "INTEGER"),
    ("logs",      "details",          "TEXT"),

    # Folders – table créée par db.create_all() ; aucune colonne retardée
    ("folders",   "espace_id",        "INTEGER REFERENCES espaces(id)"),
    # ACL – colonnes upload / download / suppression / partage ajoutées après coup
    ("acls",      "upload",           "BOOLEAN DEFAULT 0"),
    ("acls",      "download",         "BOOLEAN DEFAULT 0"),
    ("acls",      "suppression",      "BOOLEAN DEFAULT 0"),
    ("acls",      "partage",          "BOOLEAN DEFAULT 0"),

    # Memberships – role ajouté après la création initiale de la table
    ("memberships", "role",           "VARCHAR(20) DEFAULT 'membre'"),

    # Invitations – date_expiration ajoutée après coup
    ("invitations", "date_expiration","DATETIME"),
]


def _add_column(conn, table, column, definition):
    sql = f"ALTER TABLE {table} ADD COLUMN {column} {definition}"
    try:
        conn.execute(sql)
        return "ajoutée"
    except Exception as exc:
        msg = str(exc).lower()
        if "duplicate column" in msg or "already exists" in msg:
            return "déjà présente"
        raise


def main():
    app = create_app()

    with app.app_context():
        print("=" * 60)
        print("  Transferly — migration de base de données")
        print("=" * 60)

        # 1. Créer toutes les tables manquantes
        print("\n[1/2] db.create_all() …")
        db.create_all()
        print("      Tables vérifiées / créées.")

        # 2. Ajouter les colonnes manquantes
        print("\n[2/2] Vérification des colonnes …\n")
        conn = db.engine.raw_connection()
        try:
            cursor = conn.cursor()
            max_col = max(len(c) for _, c, _ in COLUMNS)
            max_tbl = max(len(t) for t, _, _ in COLUMNS)
            for table, column, definition in COLUMNS:
                result = _add_column(cursor, table, column, definition)
                status = "✓" if result == "ajoutée" else "–"
                print(f"  {status}  {table:<{max_tbl}}  {column:<{max_col}}  [{result}]")
            conn.commit()
        finally:
            conn.close()

        print("\n" + "=" * 60)
        print("  Migration terminée sans erreur.")
        print("=" * 60)


if __name__ == "__main__":
    main()
