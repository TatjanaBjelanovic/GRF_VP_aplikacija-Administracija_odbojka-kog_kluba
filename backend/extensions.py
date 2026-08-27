# extensions.py
# Ovaj fajl postoji da izbegnemo "circular import" problem
# db objekat definišemo OVDE, a onda ga uvoze i app.py i models.py

from flask_sqlalchemy import SQLAlchemy
# uvozimo SQLAlchemy klasu

db = SQLAlchemy()
# pravimo instancu db BEZ app-a za sada
# povezaćemo je sa Flask aplikacijom kasnije, u app.py, preko db.init_app(app)