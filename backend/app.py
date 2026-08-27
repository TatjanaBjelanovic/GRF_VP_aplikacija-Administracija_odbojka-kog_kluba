# app.py
# Glavni fajl Flask aplikacije - ovde se aplikacija pokreće i konfiguriše

import os
# uvozimo modul za rad sa promenljivama okruženja

from flask import Flask, jsonify
# Flask - glavna klasa za pravljenje aplikacije
# jsonify - pretvara Python podatke (dict, list) u JSON odgovor

from flask_cors import CORS
# CORS - dozvoljava frontend-u da komunicira sa ovim backend-om

from flask_migrate import Migrate
# Migrate - alat koji prati promene modela i ažurira strukturu baze

from extensions import db
# uvozimo VEĆ NAPRAVLJEN db objekat iz extensions.py (ne pravimo novi ovde)



app = Flask(__name__)
# kreiramo instancu Flask aplikacije

CORS(app)
# aktiviramo CORS za celu aplikaciju

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
# učitavamo konekcioni string ka bazi iz promenljive okruženja

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# isključujemo nepotrebno praćenje izmena objekata

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'privremeni-tajni-kljuc')
# tajni ključ kojim se JWT token potpisuje - u pravoj produkciji bi trebalo
# da bude nasumičan i tajan, za sada koristimo privremenu vrednost

from flask_jwt_extended import JWTManager
# uvozimo JWTManager - upravlja JWT tokenima (kreiranje, provera)

jwt = JWTManager(app)
# povezujemo JWT sa našom Flask aplikacijom

db.init_app(app)
# POVEZUJEMO db (iz extensions.py) sa OVOM Flask aplikacijom
# ovo je razlika u odnosu na pre - db je napravljen odvojeno, a ovde se "spaja" sa app

migrate = Migrate(app, db)
# aktiviramo Flask-Migrate - prati modele i pravi/ažurira tabele u bazi

from models import *
# uvozimo SVE modele (tabele) koje ćemo napraviti u sledećem koraku
# mora biti POSLE db.init_app() da model klase "vide" pravi db


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "poruka": "Backend radi i povezan je na Flask aplikaciju"
    })


@app.route('/api/db-test', methods=['GET'])
def db_test():
    try:
        db.session.execute(db.text('SELECT 1'))
        return jsonify({"baza": "povezana uspešno"})
    except Exception as e:
        return jsonify({"baza": "greška", "detalji": str(e)}), 500

####
from routes.auth import auth_bp
# uvozimo blueprint koji smo napravili u routes/auth.py

app.register_blueprint(auth_bp)
# registrujemo ga u aplikaciji - sad ruta /api/login stvarno postoji


####
from routes.lokacije import lokacije_bp
# uvozimo blueprint sa CRUD rutama za Lokacije iz routes/lokacije.py

app.register_blueprint(lokacije_bp)
# registrujemo ga u aplikaciji - sad rute /api/lokacije stvarno postoje

####
from routes.selekcije import selekcije_bp
# uvozimo blueprint sa CRUD rutama za Selekcije iz routes/selekcije.py

app.register_blueprint(selekcije_bp)
# registrujemo ga u aplikaciji - sad rute /api/selekcije stvarno postoje


####
from routes.treneri import treneri_bp
# uvozimo blueprint sa CRUD rutama za Trenere iz routes/treneri.py

app.register_blueprint(treneri_bp)
# registrujemo ga u aplikaciji - sad rute /api/treneri stvarno postoje


####
from routes.igraci import igraci_bp
# uvozimo blueprint sa CRUD rutama za Igrače iz routes/igraci.py

app.register_blueprint(igraci_bp)
# registrujemo ga u aplikaciji - sad rute /api/igraci stvarno postoje

####
from routes.treninzi import treninzi_bp
# uvozimo blueprint sa CRUD rutama za Treninge iz routes/treninzi.py

app.register_blueprint(treninzi_bp)
# registrujemo ga u aplikaciji - sad rute /api/treninzi stvarno postoje

####
from routes.prisustvo import prisustvo_bp
# uvozimo blueprint sa rutama za Prisustvo iz routes/prisustvo.py

app.register_blueprint(prisustvo_bp)
# registrujemo ga u aplikaciji - sad rute /api/prisustvo stvarno postoje

####
from routes.utakmice import utakmice_bp
# uvozimo blueprint sa CRUD rutama za Utakmice iz routes/utakmice.py

app.register_blueprint(utakmice_bp)
# registrujemo ga u aplikaciji - sad rute /api/utakmice stvarno postoje

####
from routes.clanarine import clanarine_bp
# uvozimo blueprint sa CRUD rutama za Clanarine iz routes/clanarine.py

app.register_blueprint(clanarine_bp)
# registrujemo ga u aplikaciji - sad rute /api/clanarine stvarno postoje


from routes.termini import termini_bp
# uvozimo blueprint sa rutama za Termine iz routes/termini.py

app.register_blueprint(termini_bp)
# registrujemo ga u aplikaciji - sad rute /api/termini stvarno postoje



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)