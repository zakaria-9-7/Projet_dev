import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

# Forcer les variables d'environnement AVANT l'import de l'app
# SECRET_KEY doit correspondre exactement à ce qu'utilise le middleware
os.environ["SQLALCHEMY_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["UPLOAD_ROOT"] = "/tmp/transferly_test"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"