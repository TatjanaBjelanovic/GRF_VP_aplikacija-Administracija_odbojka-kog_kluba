# clanarine.py
# Rute za evidenciju plaćanja članarina

from flask import Blueprint, request, jsonify
# Blueprint - grupiše rute u poseban fajl
# request - čitamo podatke poslate sa frontenda
# jsonify - vraćamo JSON odgovor

from flask_jwt_extended import jwt_required
# zahteva validan token da bi se ruta pozvala

from datetime import datetime
# koristimo da pretvorimo tekst datuma u pravi Date objekat

from extensions import db
# db objekat za rad sa bazom

from models import Clanarina, Igrac
# model Clanarina - tabela koju menjamo
# Igrac - potreban da proverimo vezu

clanarine_bp = Blueprint('clanarine', __name__)
# pravimo Blueprint sa imenom 'clanarine'


def clanarina_u_json(c):
    # pomoćna funkcija - pretvara Clanarina objekat u rečnik za JSON odgovor
    return {
        "id": c.id,
        "igrac_id": c.igrac_id,
        "igrac_ime": f"{c.igrac.ime} {c.igrac.prezime}",
        "mesec": c.mesec,
        "godina": c.godina,
        "iznos": float(c.iznos),
        # float() pretvara Numeric tip (Decimal) u obican broj da bi mogao u JSON
        "datum_uplate": c.datum_uplate.isoformat() if c.datum_uplate else None,
        # datum_uplate NIJE obavezan (dok se ne plati), pa proveravamo da li postoji
        "placeno": c.placeno
    }


@clanarine_bp.route('/api/clanarine', methods=['GET'])
# GET /api/clanarine - vraća SVE zapise članarina
# podržava i opcioni filter po igraču: /api/clanarine?igrac_id=1
@jwt_required()
def get_clanarine():
    igrac_id = request.args.get('igrac_id', type=int)
    # request.args čita GET parametre iz URL-a (posle znaka ?)
    # type=int automatski pretvara u broj, ili None ako parametar nije poslat

    upit = Clanarina.query
    # počinjemo od "praznog" upita nad tabelom Clanarina

    if igrac_id:
        upit = upit.filter_by(igrac_id=igrac_id)
        # ako je igrac_id poslat, dodajemo filter - samo članarine tog igrača

    clanarine = upit.all()
    # izvršavamo konačan upit

    return jsonify([clanarina_u_json(c) for c in clanarine])


@clanarine_bp.route('/api/clanarine/izvestaj', methods=['GET'])
# GET /api/clanarine/izvestaj?mesec=8&godina=2026 - izveštaj ko je platio/ko duguje za taj mesec
@jwt_required()
def izvestaj_clanarina():
    mesec = request.args.get('mesec', type=int)
    godina = request.args.get('godina', type=int)
    # čitamo mesec i godinu za koje pravimo izveštaj iz URL parametara

    upit = Clanarina.query.filter_by(mesec=mesec, godina=godina)
    # filtriramo samo zapise za traženi mesec i godinu

    placeno = [clanarina_u_json(c) for c in upit.filter_by(placeno=True).all()]
    # svi zapisi gde je placeno=True

    nije_placeno = [clanarina_u_json(c) for c in upit.filter_by(placeno=False).all()]
    # svi zapisi gde je placeno=False (duguju)

    return jsonify({
        "mesec": mesec,
        "godina": godina,
        "placeno": placeno,
        "nije_placeno": nije_placeno,
        "broj_placenih": len(placeno),
        "broj_neplacenih": len(nije_placeno)
    })


@clanarine_bp.route('/api/clanarine', methods=['POST'])
# POST /api/clanarine - dodaje NOVI zapis članarine (npr. na početku meseca za svakog igrača)
@jwt_required()
def dodaj_clanarinu():
    podaci = request.get_json()
    # čitamo JSON podatke poslate sa frontenda

    nova_clanarina = Clanarina(
        igrac_id=podaci.get('igrac_id'),
        mesec=podaci.get('mesec'),
        godina=podaci.get('godina'),
        iznos=podaci.get('iznos'),
        placeno=podaci.get('placeno', False)
        # default False - pretpostavljamo da nije plaćeno dok se ne potvrdi
        # datum_uplate namerno NE postavljamo ovde - popunjava se kad se stvarno plati
    )

    db.session.add(nova_clanarina)
    db.session.commit()

    return jsonify(clanarina_u_json(nova_clanarina)), 201


@clanarine_bp.route('/api/clanarine/<int:id>', methods=['PUT'])
# PUT /api/clanarine/1 - MENJA zapis (najčešće: označava da je PLAĆENO)
@jwt_required()
def izmeni_clanarinu(id):
    clanarina = Clanarina.query.get_or_404(id)
    # tražimo zapis koji menjamo, 404 ako ne postoji

    podaci = request.get_json()

    if 'placeno' in podaci:
        clanarina.placeno = podaci.get('placeno')

        if podaci.get('placeno') and not clanarina.datum_uplate:
            # ako se OZNAČAVA kao plaćeno i još nema datum uplate,
            # automatski postavljamo današnji datum
            clanarina.datum_uplate = datetime.now().date()

    if podaci.get('datum_uplate'):
        # ako je frontend eksplicitno poslao datum, koristimo taj (npr. kasnija uplata)
        clanarina.datum_uplate = datetime.strptime(podaci.get('datum_uplate'), '%Y-%m-%d').date()

    clanarina.iznos = podaci.get('iznos', clanarina.iznos)

    db.session.commit()

    return jsonify(clanarina_u_json(clanarina))


@clanarine_bp.route('/api/clanarine/<int:id>', methods=['DELETE'])
# DELETE /api/clanarine/1 - BRIŠE zapis članarine
@jwt_required()
def obrisi_clanarinu(id):
    clanarina = Clanarina.query.get_or_404(id)
    # tražimo zapis koji brišemo, 404 ako ne postoji

    db.session.delete(clanarina)
    db.session.commit()

    return jsonify({"poruka": "Zapis članarine obrisan"}), 200