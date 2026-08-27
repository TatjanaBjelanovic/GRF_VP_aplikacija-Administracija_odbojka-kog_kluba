# routes/auth.py
# Ovde definišemo sve rute vezane za login/autentifikaciju

from flask import Blueprint, request, jsonify
# Blueprint - omogućava da grupišemo rute u posebne fajlove
# request - da čitamo podatke koje šalje frontend
# jsonify - da vratimo JSON odgovor

from flask_jwt_extended import create_access_token
# create_access_token - pravi JWT token nakon uspešnog logina

from werkzeug.security import check_password_hash
# check_password_hash - proverava da li uneta lozinka odgovara sačuvanom hash-u

from extensions import db
# db objekat za rad sa bazom

from models import Trener
# model Trener - iz njega proveravamo email i lozinku

auth_bp = Blueprint('auth', __name__)
# pravimo Blueprint sa imenom 'auth' - grupu ruta koju ćemo kasnije registrovati u app.py


@auth_bp.route('/api/login', methods=['POST'])
# ruta za login - prima POST zahtev (jer šaljemo osetljive podatke: email i lozinku)
def login():
    podaci = request.get_json()
    # čitamo JSON podatke koje je frontend poslao (email i lozinka)

    email = podaci.get('email')
    lozinka = podaci.get('lozinka')
    # izvlačimo email i lozinku iz poslatih podataka

    trener = Trener.query.filter_by(email=email).first()
    # tražimo u bazi trenera/admina sa tim email-om
    # .first() vraća prvi rezultat ili None ako ne postoji

    if not trener or not check_password_hash(trener.lozinka_hash, lozinka):
        # ako trener ne postoji ILI lozinka nije tačna
        return jsonify({"greska": "Pogrešan email ili lozinka"}), 401
        # 401 = Unauthorized (neautorizovan pristup)

    token = create_access_token(
        identity=str(trener.id),
        additional_claims={"uloga": trener.uloga}
    )
    # pravimo JWT token - identity je ID trenera (ko je ulogovan)
    # additional_claims dodaje ulogu (admin/trener) unutar tokena,
    # da kasnije lako proveravamo prava pristupa

    return jsonify({
        "token": token,
        "id": trener.id,
        # NOVO - vraćamo i ID trenera, treba nam na frontend-u (npr. Dashboard za sopstveni raspored)

        "ime": trener.ime,
        "prezime": trener.prezime,
        "uloga": trener.uloga,

        "selekcije": [{"id": s.id, "naziv": s.naziv} for s in trener.selekcije]
        # NOVO - vraćamo i listu selekcija koje OVAJ trener vodi
        # (koristimo na Dashboard-u da mu ponudimo samo NJEGOVE selekcije u padajućem meniju)
    })
    # vraćamo token i osnovne podatke o ulogovanom korisniku
