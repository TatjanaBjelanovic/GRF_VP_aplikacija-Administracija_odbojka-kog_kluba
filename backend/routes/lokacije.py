#lokacije.py
# CRUD rute za Lokacije (škole odbojke gde se trenira)

from flask import Blueprint, request, jsonify
# Blueprint - grupiše rute u poseban fajl
# request - čitamo podatke poslate sa frontenda
# jsonify - vraćamo JSON odgovor

from flask_jwt_extended import jwt_required
# jwt_required - dekorator koji zahteva validan token da bi se ruta pozvala
# (bez tokena, korisnik dobija 401 Unauthorized)

from extensions import db
# db objekat za rad sa bazom

from models import Lokacija
# model Lokacija - tabela koju menjamo

lokacije_bp = Blueprint('lokacije', __name__)
# pravimo Blueprint sa imenom 'lokacije'


@lokacije_bp.route('/api/lokacije', methods=['GET'])
# GET /api/lokacije - vraća SVE lokacije
@jwt_required()
# zahteva da korisnik bude ulogovan (ima validan token)
def get_lokacije():
    lokacije = Lokacija.query.all()
    # uzimamo sve redove iz tabele lokacija

    rezultat = [
        {"id": l.id, "naziv": l.naziv, "adresa": l.adresa}
        for l in lokacije
    ]
    # pretvaramo listu Python objekata u listu rečnika (da može u JSON)

    return jsonify(rezultat)
    # vraćamo listu kao JSON


@lokacije_bp.route('/api/lokacije/<int:id>', methods=['GET'])
# GET /api/lokacije/5 - vraća JEDNU lokaciju po ID-u
# <int:id> znači da Flask iz URL-a izvlači broj i prosleđuje ga kao parametar id
@jwt_required()
def get_lokacija(id):
    lokacija = Lokacija.query.get_or_404(id)
    # tražimo lokaciju po ID-u; ako ne postoji, automatski vraća 404 grešku

    return jsonify({"id": lokacija.id, "naziv": lokacija.naziv, "adresa": lokacija.adresa})


@lokacije_bp.route('/api/lokacije', methods=['POST'])
# POST /api/lokacije - pravi NOVU lokaciju
@jwt_required()
def dodaj_lokaciju():
    podaci = request.get_json()
    # čitamo JSON podatke koje je frontend poslao

    nova_lokacija = Lokacija(
        naziv=podaci.get('naziv'),
        adresa=podaci.get('adresa')
    )
    # pravimo novi Python objekat Lokacije sa podacima iz zahteva

    db.session.add(nova_lokacija)
    # dodajemo ga u "sesiju" (privremeno, još nije sačuvano u bazi)

    db.session.commit()
    # tek OVDE se stvarno upisuje u bazu

    return jsonify({"id": nova_lokacija.id, "naziv": nova_lokacija.naziv, "adresa": nova_lokacija.adresa}), 201
    # 201 = Created (uspešno napravljen novi resurs)


@lokacije_bp.route('/api/lokacije/<int:id>', methods=['PUT'])
# PUT /api/lokacije/5 - MENJA postojeću lokaciju
@jwt_required()
def izmeni_lokaciju(id):
    lokacija = Lokacija.query.get_or_404(id)
    # tražimo lokaciju koju menjamo, 404 ako ne postoji

    podaci = request.get_json()
    # čitamo nove podatke poslate sa frontenda

    lokacija.naziv = podaci.get('naziv', lokacija.naziv)
    # menjamo naziv AKO je poslat, inače ostavljamo stari (podaci.get sa default vrednošću)

    lokacija.adresa = podaci.get('adresa', lokacija.adresa)
    # isto za adresu

    db.session.commit()
    # čuvamo izmene u bazi

    return jsonify({"id": lokacija.id, "naziv": lokacija.naziv, "adresa": lokacija.adresa})


@lokacije_bp.route('/api/lokacije/<int:id>', methods=['DELETE'])
# DELETE /api/lokacije/5 - BRIŠE lokaciju
@jwt_required()
def obrisi_lokaciju(id):
    lokacija = Lokacija.query.get_or_404(id)
    # tražimo lokaciju koju brišemo, 404 ako ne postoji

    db.session.delete(lokacija)
    # označavamo objekat za brisanje

    db.session.commit()
    # tek ovde se stvarno briše iz baze

    return jsonify({"poruka": "Lokacija obrisana"}), 200