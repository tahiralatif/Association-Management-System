"""Password strength validation."""

import re


class PasswordValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_password_strength(password: str, min_length: int = 8) -> None:
    """
    Validate password meets minimum security requirements.
    Raises PasswordValidationError if requirements not met.

    Requirements:
    - At least min_length characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < min_length:
        raise PasswordValidationError(
            f"Password must be at least {min_length} characters long"
        )

    if not re.search(r"[A-Z]", password):
        raise PasswordValidationError(
            "Password must contain at least one uppercase letter"
        )

    if not re.search(r"[a-z]", password):
        raise PasswordValidationError(
            "Password must contain at least one lowercase letter"
        )

    if not re.search(r"\d", password):
        raise PasswordValidationError(
            "Password must contain at least one digit"
        )

    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]", password):
        raise PasswordValidationError(
            "Password must contain at least one special character"
        )

    # Check for common weak passwords
    weak_passwords = {
        "password1!", "password123!", "qwerty123!", "admin123!",
        "letmein123!", "welcome123!", "monkey123!", "dragon123!",
    }
    if password.lower() in weak_passwords:
        raise PasswordValidationError("Password is too common. Please choose a stronger password")
