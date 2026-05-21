"""
Migration idempotente : ajout de la colonne must_reset_password à la table users.
Usage : python3 migrate_must_reset.py

- Ajoute la colonne si elle n'existe pas.
- Met must_reset_password=0 (False) pour tous les users existants.
- Peut être lancé plusieurs fois sans effet de bord.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db


def main():
    app = create_app()

    with app.app_context():
        print("=" * 60)
        print("  Transferly — migration must_reset_password")
        print("=" * 60)

        conn = db.engine.raw_connection()
        try:
            cursor = conn.cursor()

            # 1. Vérifier si la colonne existe déjà
            cursor.execute("PRAGMA table_info(users)")
            colonnes = [row[1] for row in cursor.fetchall()]

            if 'must_reset_password' in colonnes:
                print("\n  – colonne must_reset_password : déjà présente, rien à faire.")
            else:
                cursor.execute(
                    "ALTER TABLE users ADD COLUMN must_reset_password BOOLEAN NOT NULL DEFAULT 0"
                )
                print("\n  ✓ colonne must_reset_password : ajoutée.")

                # Mettre à False pour tous les users existants (redondant avec DEFAULT 0
                # mais garantit la cohérence sur les drivers qui ignorent le DEFAULT)
                cursor.execute("UPDATE users SET must_reset_password = 0 WHERE must_reset_password IS NULL")
                print("  ✓ Valeur initialisée à 0 pour tous les utilisateurs existants.")

            conn.commit()
        finally:
            conn.close()

        print("\n" + "=" * 60)
        print("  Migration terminée sans erreur.")
        print("=" * 60)


if __name__ == "__main__":
    main()
