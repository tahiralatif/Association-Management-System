"""Exception handlers — centralized error handling."""

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("assochub.errors")


class AppException(Exception):
    """Base application exception."""

    def __init__(self, status_code: int, detail: str, error_code: str | None = None):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail, error_code="NOT_FOUND")


class ForbiddenException(AppException):
    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=403, detail=detail, error_code="FORBIDDEN")


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(status_code=409, detail=detail, error_code="CONFLICT")


class ValidationException(AppException):
    def __init__(self, detail: str = "Validation error"):
        super().__init__(status_code=422, detail=detail, error_code="VALIDATION_ERROR")


def register_exception_handlers(app: FastAPI):
    """Register global exception handlers."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.error_code, "message": exc.detail}},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        # PasswordValidationError from password strength checker
        from app.core.password import PasswordValidationError
        if isinstance(exc, PasswordValidationError):
            return JSONResponse(
                status_code=422,
                content={"detail": exc.message},
            )

        # HTTPException from FastAPI/Starlette
        from fastapi import HTTPException
        if isinstance(exc, HTTPException):
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": str(exc.detail)},
            )

        # Generate a unique error ID for tracing — never expose internals to clients
        error_id = str(uuid.uuid4())[:8]
        request_id = getattr(request.state, "request_id", None)
        logger.error(
            "Unhandled error error_id=%s request_id=%s path=%s %s: %s",
            error_id, request_id, request.url.path,
            type(exc).__name__, str(exc)[:500],
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An internal error occurred. Please try again later.",
                    "error_id": error_id,
                }
            },
        )
