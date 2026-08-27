# routes/treninzi.py
# CRUD rute za Treninge (zakazani termini treninga)

from flask import Blueprint, request, jsonify
# Blueprint - grupiše rute u poseban fajl
# request - čitamo podatke poslate sa frontenda
# jsonify - vraćamo JSON odgovor

from flask_jwt_extended import jwt_required
# zahteva validan token da bi se ruta pozvala

from datetime import datetime
# koristimo da pretvorimo tekst datuma/vremena u prave Date/Time objekte

from extensions import db
# db objekat za rad sa bazom

from models import Trening
# model Trening - tabela koju menjamo

treninzi_bp = Blueprint('treninzi', __name__)
# pravimo Blueprint sa imenom 'treninzi'


def trening_u_json(trening):
    # pomoćna funkcija - pretvara Trening objekat u rečnik za JSON odgovor
    return {
        "id": trening.id,
        "datum": trening.datum.isoformat(),
        # .isoformat() pretvara Date u tekst "2026-08-10"
        "vreme_pocetka": trening.vreme_pocetka.strftime('%H:%M'),
        # .strftime('%H:%M') pretvara Time u tekst "18:00" (sat:minut)
        "vreme_zavrsetka": trening.vreme_zavrsetka.strftime('%H:%M'),
        "realizovan": trening.realizovan,
        "potrebna_zamena": trening.potrebna_zamena,
        # NOVO - da li ovaj trening treba zamenu trenera
        "selekcija_id": trening.selekcija_id,
        "selekcija_naziv": trening.selekcija.naziv,
        "trener_id": trening.trener_id,
        "trener_ime": f"{trening.trener.ime} {trening.trener.prezime}",
        "lokacija_id": trening.lokacija_id,
        "lokacija_naziv": trening.lokacija.naziv
    }


@treninzi_bp.route('/api/treninzi', methods=['GET'])
# GET /api/treninzi - vraća SVE treninge
@jwt_required()
def get_treninzi():
    treninzi = Trening.query.all()
    # uzimamo sve redove iz tabele trening

    return jsonify([trening_u_json(t) for t in treninzi])


@treninzi_bp.route('/api/treninzi/<int:id>', methods=['GET'])
# GET /api/treninzi/1 - vraća JEDAN trening po ID-u
@jwt_required()
def get_trening(id):
    trening = Trening.query.get_or_404(id)
    # tražimo trening po ID-u; 404 ako ne postoji

    return jsonify(trening_u_json(trening))


@treninzi_bp.route('/api/treninzi', methods=['POST'])
# POST /api/treninzi - zakazuje NOVI trening
@jwt_required()
def dodaj_trening():
    podaci = request.get_json()
    # čitamo JSON podatke poslate sa frontenda

    novi_trening = Trening(
        datum=datetime.strptime(podaci.get('datum'), '%Y-%m-%d').date(),
        # pretvaramo tekst datuma u Date objekat

        vreme_pocetka=datetime.strptime(podaci.get('vreme_pocetka'), '%H:%M').time(),
        # pretvaramo tekst vremena (npr. "18:00") u Time objekat

        vreme_zavrsetka=datetime.strptime(podaci.get('vreme_zavrsetka'), '%H:%M').time(),

        selekcija_id=podaci.get('selekcija_id'),
        trener_id=podaci.get('trener_id'),
        lokacija_id=podaci.get('lokacija_id')
        # realizovan i potrebna_zamena namerno NE postavljamo ovde - default je False iz models.py
    )

    db.session.add(novi_trening)
    db.session.commit()

    return jsonify(trening_u_json(novi_trening)), 201


@treninzi_bp.route('/api/treninzi/<int:id>', methods=['PUT'])
# PUT /api/treninzi/1 - MENJA postojeći trening (raspored, status realizacije, ili zamena trenera)
@jwt_required()
def izmeni_trening(id):
    trening = Trening.query.get_or_404(id)
    # tražimo trening koji menjamo, 404 ako ne postoji

    podaci = request.get_json()

    if podaci.get('datum'):
        trening.datum = datetime.strptime(podaci.get('datum'), '%Y-%m-%d').date()

    if podaci.get('vreme_pocetka'):
        trening.vreme_pocetka = datetime.strptime(podaci.get('vreme_pocetka'), '%H:%M').time()

    if podaci.get('vreme_zavrsetka'):
        trening.vreme_zavrsetka = datetime.strptime(podaci.get('vreme_zavrsetka'), '%H:%M').time()

    trening.selekcija_id = podaci.get('selekcija_id', trening.selekcija_id)
    trening.lokacija_id = podaci.get('lokacija_id', trening.lokacija_id)

    if 'trener_id' in podaci:
        # NOVO - ako se EKSPLICITNO menja trener (npr. admin dodeljuje zamenu),
        # automatski skidamo oznaku "potrebna_zamena" jer je problem rešen
        trening.trener_id = podaci.get('trener_id')
        trening.potrebna_zamena = False

    if 'realizovan' in podaci:
        # ovo je KLJUČNO polje - trener ovde potvrđuje da je trening zaista održan
        trening.realizovan = podaci.get('realizovan')

    if 'potrebna_zamena' in podaci:
        # NOVO - trener označava da NE MOŽE da drži ovaj trening
        trening.potrebna_zamena = podaci.get('potrebna_zamena')

    db.session.commit()

    return jsonify(trening_u_json(trening))


@treninzi_bp.route('/api/treninzi/<int:id>', methods=['DELETE'])
# DELETE /api/treninzi/1 - BRIŠE zakazan trening
@jwt_required()
def obrisi_trening(id):
    trening = Trening.query.get_or_404(id)
    # tražimo trening koji brišemo, 404 ako ne postoji

    db.session.delete(trening)
    db.session.commit()

    return jsonify({"poruka": "Trening obrisan"}), 200
