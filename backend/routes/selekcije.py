# routes/selekcije.py
# CRUD rute za Selekcije (npr. "Kadetkinje", "Mlađi pioniri")

from flask import Blueprint, request, jsonify
# Blueprint - grupiše rute u poseban fajl
# request - čitamo podatke poslate sa frontenda
# jsonify - vraćamo JSON odgovor

from flask_jwt_extended import jwt_required
# zahteva validan token da bi se ruta pozvala

from extensions import db
# db objekat za rad sa bazom

from models import Selekcija, Lokacija
# model Selekcija - tabela koju menjamo
# Lokacija - potrebna da pronađemo lokacije po ID-jevima

selekcije_bp = Blueprint('selekcije', __name__)
# pravimo Blueprint sa imenom 'selekcije'


def selekcija_u_json(s):
    # pomoćna funkcija - pretvara Selekcija objekat u rečnik za JSON odgovor
    return {
        "id": s.id,
        "naziv": s.naziv,
        "cena_clanarine": float(s.cena_clanarine) if s.cena_clanarine is not None else None,
        # pretvaramo Decimal u obican broj (float) da bi mogao u JSON

        "lokacije": [{"id": l.id, "naziv": l.naziv} for l in s.lokacije],
        # LISTA lokacija (ranije je bila samo jedna) - s.lokacije dolazi iz many-to-many relationship-a

        "lokacije_nazivi": ", ".join([l.naziv for l in s.lokacije])
        # spojeni nazivi u jedan tekst, zgodno za prikaz u tabeli bez dodatne obrade na frontend-u
    }


@selekcije_bp.route('/api/selekcije', methods=['GET'])
# GET /api/selekcije - vraća SVE selekcije
@jwt_required()
def get_selekcije():
    selekcije = Selekcija.query.all()
    # uzimamo sve redove iz tabele selekcija

    return jsonify([selekcija_u_json(s) for s in selekcije])


@selekcije_bp.route('/api/selekcije/<int:id>', methods=['GET'])
# GET /api/selekcije/3 - vraća JEDNU selekciju po ID-u
@jwt_required()
def get_selekcija(id):
    selekcija = Selekcija.query.get_or_404(id)
    # tražimo selekciju po ID-u; 404 ako ne postoji

    return jsonify(selekcija_u_json(selekcija))


@selekcije_bp.route('/api/selekcije', methods=['POST'])
# POST /api/selekcije - pravi NOVU selekciju
@jwt_required()
def dodaj_selekciju():
    podaci = request.get_json()
    # čitamo JSON podatke poslate sa frontenda

    nova_selekcija = Selekcija(
        naziv=podaci.get('naziv'),
        cena_clanarine=podaci.get('cena_clanarine')
        # cena nije obavezna - ako nije poslata, ostaje None
    )

    lokacija_ids = podaci.get('lokacija_ids', [])
    # NOVO - očekujemo LISTU ID-jeva lokacija (ne jedan broj kao ranije)

    if lokacija_ids:
        nova_selekcija.lokacije = Lokacija.query.filter(Lokacija.id.in_(lokacija_ids)).all()
        # pronalazimo sve lokacije čiji je ID u poslatoj listi i povezujemo ih sa selekcijom

    db.session.add(nova_selekcija)
    db.session.commit()
    # dodajemo i čuvamo u bazi

    return jsonify(selekcija_u_json(nova_selekcija)), 201
    # 201 = Created


@selekcije_bp.route('/api/selekcije/<int:id>', methods=['PUT'])
# PUT /api/selekcije/3 - MENJA postojeću selekciju
@jwt_required()
def izmeni_selekciju(id):
    selekcija = Selekcija.query.get_or_404(id)
    # tražimo selekciju koju menjamo, 404 ako ne postoji

    podaci = request.get_json()

    selekcija.naziv = podaci.get('naziv', selekcija.naziv)
    # menjamo naziv AKO je poslat, inače ostavljamo stari

    selekcija.cena_clanarine = podaci.get('cena_clanarine', selekcija.cena_clanarine)
    # isto za cenu članarine

    if 'lokacija_ids' in podaci:
        # lokacije menjamo SAMO ako je taj podatak poslat (lista ID-jeva)
        selekcija.lokacije = Lokacija.query.filter(Lokacija.id.in_(podaci.get('lokacija_ids'))).all()

    db.session.commit()

    return jsonify(selekcija_u_json(selekcija))


@selekcije_bp.route('/api/selekcije/<int:id>', methods=['DELETE'])
# DELETE /api/selekcije/3 - BRIŠE selekciju
@jwt_required()
def obrisi_selekciju(id):
    selekcija = Selekcija.query.get_or_404(id)
    # tražimo selekciju koju brišemo, 404 ako ne postoji

    db.session.delete(selekcija)
    db.session.commit()

    return jsonify({"poruka": "Selekcija obrisana"}), 200
