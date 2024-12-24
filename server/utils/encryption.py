from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import padding
from base64 import b64encode, b64decode
import os


def pad_key(key: str) -> bytes:
    """Ensure key is exactly 32 bytes for AES-256."""
    result = bytearray(32)
    key_bytes = key.encode('utf-8')
    result[:len(key_bytes)] = key_bytes
    return bytes(result)


def encrypt(data: str, user_token: str) -> str:
    """Encrypt data using AES-GCM with the user's token as key."""
    try:
        # Pad the key to 32 bytes
        key = pad_key(user_token)

        # Generate a random 96-bit nonce
        nonce = os.urandom(12)

        # Create AESGCM cipher
        aesgcm = AESGCM(key)

        # Encrypt the data
        ciphertext = aesgcm.encrypt(nonce, data.encode('utf-8'), None)

        # Combine nonce and ciphertext and encode to base64
        combined = nonce + ciphertext
        return b64encode(combined).decode('utf-8')
    except Exception as e:
        raise Exception(f"Encryption error: {str(e)}")


def decrypt(encrypted_data: str, user_token: str) -> str:
    """Decrypt data using AES-GCM with the user's token as key."""
    try:
        # Pad the key to 32 bytes
        key = pad_key(user_token)

        # Decode the base64 data
        combined = b64decode(encrypted_data)

        # Split nonce and ciphertext
        nonce = combined[:12]
        ciphertext = combined[12:]

        # Create AESGCM cipher
        aesgcm = AESGCM(key)

        # Decrypt the data
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')
    except Exception as e:
        raise Exception(f"Decryption error: {str(e)}")
