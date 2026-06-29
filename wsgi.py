from a2wsgi import ASGIMiddleware

from backend.main import app as asgi_app

app = ASGIMiddleware(asgi_app)
