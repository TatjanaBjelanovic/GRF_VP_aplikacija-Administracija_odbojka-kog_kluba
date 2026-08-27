# routes/termini.py
# Rute za stalni nedeljni raspored (Termin) - vide svi, uređuje samo admin

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
# get_jwt - čita sadržaj tokena (uključujući ulogu koju smo tamo upisali pri loginu)

from datetime import datetime
from extensions import db
from models import Termin

termini_bp = Blueprint('termini', __name__)


def zahtevaj_admina():
    # pomoćna funkcija - proverava da li je ulogovani korisnik admin
    # vraća None ako JESTE admin, ili (json_odgovor, status_kod) ako NIJE

    uloga = get_jwt().get('uloga')

    if uloga != 'admin':
        return jsonify({"greska": "Samo admin može da menja raspored termina"}), 403
        # 403 = Forbidden

    return None
def selekcija_vec_ima_termin(selekcija_id, dan_u_nedelji, izuzmi_id=None):
    # proverava da li SELEKCIJA već ima termin TOG DANA (bilo koji sat)
    # izuzmi_id koristimo pri IZMENI - da termin ne "sudari" sam sa sobom

    upit = Termin.query.filter_by(selekcija_id=selekcija_id, dan_u_nedelji=dan_u_nedelji)

    if izuzmi_id:
        upit = upit.filter(Termin.id != izuzmi_id)
        # isključujemo termin koji trenutno menjamo iz provere

    return upit.first() is not None
    # vraća True ako postoji BAR JEDAN takav termin, inače False

def termin_u_json(t):
    return {
        "id": t.id,
        "dan_u_nedelji": t.dan_u_nedelji,
        "vreme_pocetka": t.vreme_pocetka.strftime('%H:%M'),
        "vreme_zavrsetka": t.vreme_zavrsetka.strftime('%H:%M'),
        "selekcija_id": t.selekcija_id,
        "selekcija_naziv": t.selekcija.naziv,
        "trener_id": t.trener_id,
        "trener_ime": f"{t.trener.ime} {t.trener.prezime}",
        "lokacija_id": t.lokacija_id,
        "lokacija_naziv": t.lokacija.naziv
    }


@termini_bp.route('/api/termini', methods=['GET'])
@jwt_required()
def get_termini():
    termini = Termin.query.all()
    return jsonify([termin_u_json(t) for t in termini])


@termini_bp.route('/api/termini', methods=['POST'])
# POST /api/termini - dodaje NOVI termin (SAMO admin)
@jwt_required()
def dodaj_termin():
    provera = zahtevaj_admina()
    if provera:
        return provera

    podaci = request.get_json()

    if selekcija_vec_ima_termin(podaci.get('selekcija_id'), podaci.get('dan_u_nedelji')):
        # NOVO - ako selekcija VEĆ ima termin tog dana, odbijamo dodavanje
        return jsonify({"greska": "Ova selekcija već ima termin tog dana"}), 400
        # 400 = Bad Request (zahtev je razumljiv, ali podaci krše pravilo)

    novi_termin = Termin(
        dan_u_nedelji=podaci.get('dan_u_nedelji'),
        vreme_pocetka=datetime.strptime(podaci.get('vreme_pocetka'), '%H:%M').time(),
        vreme_zavrsetka=datetime.strptime(podaci.get('vreme_zavrsetka'), '%H:%M').time(),
        selekcija_id=podaci.get('selekcija_id'),
        trener_id=podaci.get('trener_id'),
        lokacija_id=podaci.get('lokacija_id')
    )

    db.session.add(novi_termin)
    db.session.commit()

    return jsonify(termin_u_json(novi_termin)), 201


@termini_bp.route('/api/termini/<int:id>', methods=['PUT'])
# PUT /api/termini/1 - MENJA termin (SAMO admin)
@jwt_required()
def izmeni_termin(id):
    provera = zahtevaj_admina()
    if provera:
        return provera

    termin = Termin.query.get_or_404(id)
    podaci = request.get_json()

    novi_selekcija_id = podaci.get('selekcija_id', termin.selekcija_id)
    novi_dan = podaci.get('dan_u_nedelji', termin.dan_u_nedelji)
    # uzimamo NOVE vrednosti (ili stare, ako se ne menjaju) da proverimo pravilo PRE čuvanja

    if selekcija_vec_ima_termin(novi_selekcija_id, novi_dan, izuzmi_id=id):
        # NOVO - proveravamo sudar, izuzimajući OVAJ ISTI termin iz provere
        return jsonify({"greska": "Ova selekcija već ima termin tog dana"}), 400

    termin.dan_u_nedelji = novi_dan
    termin.selekcija_id = novi_selekcija_id

    if podaci.get('vreme_pocetka'):
        termin.vreme_pocetka = datetime.strptime(podaci.get('vreme_pocetka'), '%H:%M').time()

    if podaci.get('vreme_zavrsetka'):
        termin.vreme_zavrsetka = datetime.strptime(podaci.get('vreme_zavrsetka'), '%H:%M').time()

    termin.trener_id = podaci.get('trener_id', termin.trener_id)
    termin.lokacija_id = podaci.get('lokacija_id', termin.lokacija_id)

    db.session.commit()

    return jsonify(termin_u_json(termin))


@termini_bp.route('/api/termini/<int:id>', methods=['DELETE'])
@jwt_required()
def obrisi_termin(id):
    provera = zahtevaj_admina()
    if provera:
        return provera

    termin = Termin.query.get_or_404(id)

    db.session.delete(termin)
    db.session.commit()

    return jsonify({"poruka": "Termin obrisan"}), 200