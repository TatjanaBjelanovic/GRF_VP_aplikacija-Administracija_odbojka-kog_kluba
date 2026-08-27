# prisustvo.py
# Rute za evidenciju prisustva igrača na treninzima

from flask import Blueprint, request, jsonify
# Blueprint - grupiše rute u poseban fajl
# request - čitamo podatke poslate sa frontenda
# jsonify - vraćamo JSON odgovor

from flask_jwt_extended import jwt_required
# zahteva validan token da bi se ruta pozvala

from extensions import db
# db objekat za rad sa bazom

from models import Prisustvo, Trening, Igrac
# model Prisustvo - tabela koju menjamo
# Trening, Igrac - potrebni da proverimo veze

prisustvo_bp = Blueprint('prisustvo', __name__)
# pravimo Blueprint sa imenom 'prisustvo'


def prisustvo_u_json(p):
    # pomoćna funkcija - pretvara Prisustvo objekat u rečnik za JSON odgovor
    return {
        "id": p.id,
        "trening_id": p.trening_id,
        "igrac_id": p.igrac_id,
        "igrac_ime": f"{p.igrac.ime} {p.igrac.prezime}",
        "prisutan": p.prisutan
    }


@prisustvo_bp.route('/api/treninzi/<int:trening_id>/prisustvo', methods=['GET'])
# GET /api/treninzi/1/prisustvo - vraća SVU evidenciju prisustva za JEDAN trening
# ruta je "ugnježdena" pod treningom jer prisustvo uvek posmatramo U KONTEKSTU treninga
@jwt_required()
def get_prisustvo_za_trening(trening_id):
    Trening.query.get_or_404(trening_id)
    # proveravamo da trening postoji, 404 ako ne postoji

    zapisi = Prisustvo.query.filter_by(trening_id=trening_id).all()
    # uzimamo SAMO zapise prisustva koji pripadaju ovom treningu

    return jsonify([prisustvo_u_json(p) for p in zapisi])


@prisustvo_bp.route('/api/treninzi/<int:trening_id>/prisustvo', methods=['POST'])
# POST /api/treninzi/1/prisustvo - dodaje NOVI zapis prisustva (jedan igrač na jednom treningu)
@jwt_required()
def dodaj_prisustvo(trening_id):
    Trening.query.get_or_404(trening_id)
    # proveravamo da trening postoji

    podaci = request.get_json()

    novi_zapis = Prisustvo(
        trening_id=trening_id,
        # trening_id uzimamo iz URL-a (ne iz tela zahteva), jer je već deo putanje

        igrac_id=podaci.get('igrac_id'),
        prisutan=podaci.get('prisutan', False)
        # default False ako nije eksplicitno poslato
    )

    db.session.add(novi_zapis)
    db.session.commit()

    return jsonify(prisustvo_u_json(novi_zapis)), 201


@prisustvo_bp.route('/api/prisustvo/<int:id>', methods=['PUT'])
# PUT /api/prisustvo/1 - MENJA postojeći zapis (npr. naknadno označi da JE ipak bio prisutan)
@jwt_required()
def izmeni_prisustvo(id):
    zapis = Prisustvo.query.get_or_404(id)
    # tražimo zapis koji menjamo, 404 ako ne postoji

    podaci = request.get_json()

    zapis.prisutan = podaci.get('prisutan', zapis.prisutan)
    # menjamo status prisustva

    db.session.commit()

    return jsonify(prisustvo_u_json(zapis))


@prisustvo_bp.route('/api/prisustvo/<int:id>', methods=['DELETE'])
# DELETE /api/prisustvo/1 - BRIŠE zapis prisustva
@jwt_required()
def obrisi_prisustvo(id):
    zapis = Prisustvo.query.get_or_404(id)
    # tražimo zapis koji brišemo, 404 ako ne postoji

    db.session.delete(zapis)
    db.session.commit()

    return jsonify({"poruka": "Zapis prisustva obrisan"}), 200