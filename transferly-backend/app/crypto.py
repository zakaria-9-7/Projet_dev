from cryptography.fernet import Fernet
import os

KEY_FILE = os.path.join(os.path.dirname(__file__), '..', '.key')

def get_or_create_key():
    if not os.path.exists(KEY_FILE):
        key = Fernet.generate_key()
        with open(KEY_FILE, 'wb') as f:
            f.write(key)
        os.chmod(KEY_FILE, 0o600)  # protection OS chmod 600
    else:
        with open(KEY_FILE, 'rb') as f:
            key = f.read()
    return key

fernet = Fernet(get_or_create_key())

def encrypt_file(data: bytes) -> bytes:
    return fernet.encrypt(data)

def decrypt_file(data: bytes) -> bytes:
    return fernet.decrypt(data)