# routes/igraci.py
# CRUD rute za Igrače (članovi kluba)

from flask import Blueprint, request, jsonify
# Blueprint - grupiše rute u poseban fajl
# request - čitamo podatke poslate sa frontenda
# jsonify - vraćamo JSON odgovor

from flask_jwt_extended import jwt_required
# zahteva validan token da bi se ruta pozvala

from datetime import datetime, timedelta
# datetime - pretvaramo tekst datuma u pravi Date objekat
# timedelta - računamo razmak između datuma (6 meseci za istek lekarskog)

from extensions import db
# db objekat za rad sa bazom

from models import Igrac, Selekcija
# model Igrac - tabela koju menjamo
# Selekcija - potrebna da proverimo da li selekcija postoji

igraci_bp = Blueprint('igraci', __name__)
# pravimo Blueprint sa imenom 'igraci'


def izracunaj_istek_lekarskog(datum_lekarskog):
    # pomoćna funkcija - računa dokle važi lekarski pregled
    # pravilo: lekarski važi 6 meseci od datuma pregleda

    if datum_lekarskog is None:
        return None
        # ako pregled uopšte nije unet, nemamo od čega da računamo istek

    return datum_lekarskog + timedelta(days=182)
    # 182 dana je približno 6 meseci (koristimo dane jer timedelta ne podržava direktno "meseце")


def igrac_u_json(igrac):
    # pomoćna funkcija - pretvara Igrac objekat u rečnik za JSON odgovor
    istek = izracunaj_istek_lekarskog(igrac.datum_lekarskog)
    # računamo istek na osnovu datuma pregleda

    return {
        "id": igrac.id,
        "ime": igrac.ime,
        "prezime": igrac.prezime,
        "datum_rodjenja": igrac.datum_rodjenja.isoformat(),
        # .isoformat() pretvara Python Date objekat u tekst oblika "2010-05-20"

        "telefon_roditelja": igrac.telefon_roditelja,
        "ime_roditelja": igrac.ime_roditelja,
        # novo polje - ime roditelja/staratelja

        "kategorija_clanarine": igrac.kategorija_clanarine,
        # novo polje - tekstualna oznaka (regularna, popust10...)

        "datum_lekarskog": igrac.datum_lekarskog.isoformat() if igrac.datum_lekarskog else None,
        # datum pregleda - može biti prazan ako još nije unet

        "datum_isteka_lekarskog": istek.isoformat() if istek else None,
        # izračunati datum isteka - šaljemo ga frontendu da ne mora sam da računa

        "selekcija_id": igrac.selekcija_id,
        "selekcija_naziv": igrac.selekcija.naziv
        # igrac.selekcija koristi relationship da dođemo do imena selekcije
    }


@igraci_bp.route('/api/igraci', methods=['GET'])
# GET /api/igraci - vraća SVE igrače
@jwt_required()
def get_igraci():
    igraci = Igrac.query.all()
    # uzimamo sve redove iz tabele igrac

    return jsonify([igrac_u_json(i) for i in igraci])
    # koristimo pomoćnu funkciju za svakog igrača u listi


@igraci_bp.route('/api/igraci/<int:id>', methods=['GET'])
# GET /api/igraci/1 - vraća JEDNOG igrača po ID-u
@jwt_required()
def get_igrac(id):
    igrac = Igrac.query.get_or_404(id)
    # tražimo igrača po ID-u; 404 ako ne postoji

    return jsonify(igrac_u_json(igrac))


@igraci_bp.route('/api/igraci/lekarski/istek', methods=['GET'])
# GET /api/igraci/lekarski/istek?dana=10 - vraća igrače kojima lekarski ističe u narednih X dana
# (zamena za staru rutu /api/lekarski-pregledi/istek, sad računamo iz podataka na Igraču)
@jwt_required()
def igraci_lekarski_istek():
    dana = request.args.get('dana', default=10, type=int)
    # broj dana unapred koje proveravamo - default 10 ako nije poslato

    danas = datetime.now().date()
    granica = danas + timedelta(days=dana)
    # granica = datum do kog gledamo (danas + X dana)

    svi_igraci = Igrac.query.all()
    # moramo proveriti SVE igrače jer istek nije direktno u bazi, već se računa

    isticu_uskoro = []
    vec_istekli = []

    for igrac in svi_igraci:
        istek = izracunaj_istek_lekarskog(igrac.datum_lekarskog)

        if istek is None:
            continue
            # igrač bez unetog datuma pregleda se ne pojavljuje ni u jednoj listi

        podaci_igraca = {
            "id": igrac.id,
            "igrac_id": igrac.id,
            "igrac_ime": f"{igrac.ime} {igrac.prezime}",
            "datum_isteka": istek.isoformat()
        }

        if istek < danas:
            vec_istekli.append(podaci_igraca)
            # istek je u prošlosti - lekarski je VEĆ istekao

        elif istek <= granica:
            isticu_uskoro.append(podaci_igraca)
            # istek je između danas i granice - ističe USKORO

    return jsonify({
        "isticu_uskoro": isticu_uskoro,
        "vec_istekli": vec_istekli
    })


@igraci_bp.route('/api/igraci', methods=['POST'])
# POST /api/igraci - pravi NOVOG igrača
@jwt_required()
def dodaj_igraca():
    podaci = request.get_json()
    # čitamo JSON podatke poslate sa frontenda

    datum_rodjenja = datetime.strptime(podaci.get('datum_rodjenja'), '%Y-%m-%d').date()
    # pretvaramo tekst datuma u pravi Python Date objekat

    datum_lekarskog = None
    if podaci.get('datum_lekarskog'):
        # datum lekarskog NIJE obavezan - unosimo ga samo ako je poslat
        datum_lekarskog = datetime.strptime(podaci.get('datum_lekarskog'), '%Y-%m-%d').date()

    novi_igrac = Igrac(
        ime=podaci.get('ime'),
        prezime=podaci.get('prezime'),
        datum_rodjenja=datum_rodjenja,
        telefon_roditelja=podaci.get('telefon_roditelja'),
        ime_roditelja=podaci.get('ime_roditelja'),
        kategorija_clanarine=podaci.get('kategorija_clanarine', 'regularna'),
        # default 'regularna' ako nije poslato
        datum_lekarskog=datum_lekarskog,
        selekcija_id=podaci.get('selekcija_id')
        # selekcija_id MORA biti prosleđen - igrač mora pripadati selekciji
    )

    db.session.add(novi_igrac)
    db.session.commit()
    # dodajemo i čuvamo u bazi

    return jsonify(igrac_u_json(novi_igrac)), 201


@igraci_bp.route('/api/igraci/<int:id>', methods=['PUT'])
# PUT /api/igraci/1 - MENJA postojećeg igrača
@jwt_required()
def izmeni_igraca(id):
    igrac = Igrac.query.get_or_404(id)
    # tražimo igrača kojeg menjamo, 404 ako ne postoji

    podaci = request.get_json()

    igrac.ime = podaci.get('ime', igrac.ime)
    igrac.prezime = podaci.get('prezime', igrac.prezime)
    igrac.telefon_roditelja = podaci.get('telefon_roditelja', igrac.telefon_roditelja)
    igrac.ime_roditelja = podaci.get('ime_roditelja', igrac.ime_roditelja)
    igrac.kategorija_clanarine = podaci.get('kategorija_clanarine', igrac.kategorija_clanarine)
    igrac.selekcija_id = podaci.get('selekcija_id', igrac.selekcija_id)
    # menjamo polja AKO su poslata, inače ostavljamo staro

    if podaci.get('datum_rodjenja'):
        igrac.datum_rodjenja = datetime.strptime(podaci.get('datum_rodjenja'), '%Y-%m-%d').date()

    if podaci.get('datum_lekarskog'):
        igrac.datum_lekarskog = datetime.strptime(podaci.get('datum_lekarskog'), '%Y-%m-%d').date()

    db.session.commit()

    return jsonify(igrac_u_json(igrac))


@igraci_bp.route('/api/igraci/<int:id>', methods=['DELETE'])
# DELETE /api/igraci/1 - BRIŠE igrača
@jwt_required()
def obrisi_igraca(id):
    igrac = Igrac.query.get_or_404(id)
    # tražimo igrača kojeg brišemo, 404 ako ne postoji

    db.session.delete(igrac)
    db.session.commit()

    return jsonify({"poruka": "Igrač obrisan"}), 200
