# routes/utakmice.py
# CRUD rute za Utakmice - čuvamo SAMO raspored (kad je zakazana), NE rezultat

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

from models import Utakmica
# model Utakmica - tabela koju menjamo

utakmice_bp = Blueprint('utakmice', __name__)
# pravimo Blueprint sa imenom 'utakmice'


def utakmica_u_json(u):
    # pomoćna funkcija - pretvara Utakmica objekat u rečnik za JSON odgovor
    return {
        "id": u.id,
        "datum": u.datum.isoformat(),
        "vreme": u.vreme.strftime('%H:%M'),
        "protivnik": u.protivnik,
        "domacin": u.domacin,
        "mesto_odrzavanja": u.mesto_odrzavanja,
        # NOVO - slobodan tekst umesto veze ka tabeli lokacija
        # (rezultat se više ne čuva ni ne vraća - tabela ga više nema)

        "selekcija_id": u.selekcija_id,
        "selekcija_naziv": u.selekcija.naziv
    }


@utakmice_bp.route('/api/utakmice', methods=['GET'])
# GET /api/utakmice - vraća SVE utakmice
@jwt_required()
def get_utakmice():
    utakmice = Utakmica.query.all()
    # uzimamo sve redove iz tabele utakmica

    return jsonify([utakmica_u_json(u) for u in utakmice])


@utakmice_bp.route('/api/utakmice/<int:id>', methods=['GET'])
# GET /api/utakmice/1 - vraća JEDNU utakmicu po ID-u
@jwt_required()
def get_utakmica(id):
    utakmica = Utakmica.query.get_or_404(id)
    # tražimo utakmicu po ID-u; 404 ako ne postoji

    return jsonify(utakmica_u_json(utakmica))


@utakmice_bp.route('/api/utakmice', methods=['POST'])
# POST /api/utakmice - zakazuje NOVU utakmicu
@jwt_required()
def dodaj_utakmicu():
    podaci = request.get_json()
    # čitamo JSON podatke poslate sa frontenda

    nova_utakmica = Utakmica(
        datum=datetime.strptime(podaci.get('datum'), '%Y-%m-%d').date(),
        vreme=datetime.strptime(podaci.get('vreme'), '%H:%M').time(),
        protivnik=podaci.get('protivnik'),
        domacin=podaci.get('domacin', True),
        # default True - pretpostavljamo da smo domaćini ako nije drugačije rečeno

        mesto_odrzavanja=podaci.get('mesto_odrzavanja'),
        # slobodan tekst - nije obavezno

        selekcija_id=podaci.get('selekcija_id')
    )

    db.session.add(nova_utakmica)
    db.session.commit()

    return jsonify(utakmica_u_json(nova_utakmica)), 201


@utakmice_bp.route('/api/utakmice/<int:id>', methods=['PUT'])
# PUT /api/utakmice/1 - MENJA postojeću utakmicu (samo raspored, nema rezultata)
@jwt_required()
def izmeni_utakmicu(id):
    utakmica = Utakmica.query.get_or_404(id)
    # tražimo utakmicu koju menjamo, 404 ako ne postoji

    podaci = request.get_json()

    if podaci.get('datum'):
        utakmica.datum = datetime.strptime(podaci.get('datum'), '%Y-%m-%d').date()

    if podaci.get('vreme'):
        utakmica.vreme = datetime.strptime(podaci.get('vreme'), '%H:%M').time()

    utakmica.protivnik = podaci.get('protivnik', utakmica.protivnik)
    utakmica.domacin = podaci.get('domacin', utakmica.domacin)
    utakmica.mesto_odrzavanja = podaci.get('mesto_odrzavanja', utakmica.mesto_odrzavanja)
    utakmica.selekcija_id = podaci.get('selekcija_id', utakmica.selekcija_id)

    db.session.commit()

    return jsonify(utakmica_u_json(utakmica))


@utakmice_bp.route('/api/utakmice/<int:id>', methods=['DELETE'])
# DELETE /api/utakmice/1 - BRIŠE utakmicu
@jwt_required()
def obrisi_utakmicu(id):
    utakmica = Utakmica.query.get_or_404(id)
    # tražimo utakmicu koju brišemo, 404 ako ne postoji

    db.session.delete(utakmica)
    db.session.commit()

    return jsonify({"poruka": "Utakmica obrisana"}), 200
