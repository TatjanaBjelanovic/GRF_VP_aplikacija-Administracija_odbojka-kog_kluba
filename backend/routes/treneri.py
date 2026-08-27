# routes/treneri.py
# CRUD rute za Trenere

from flask import Blueprint, request, jsonify
# Blueprint - grupiše rute u poseban fajl
# request - čitamo podatke poslate sa frontenda
# jsonify - vraćamo JSON odgovor

from flask_jwt_extended import jwt_required, get_jwt
# get_jwt - čita sadržaj tokena (uključujući ulogu koju smo tamo upisali pri loginu)
# zahteva validan token da bi se ruta pozvala

from werkzeug.security import generate_password_hash
# generate_password_hash - pretvara lozinku u hash pre čuvanja u bazi
# (nikad ne čuvamo pravu lozinku u bazi)

from extensions import db
# db objekat za rad sa bazom

from models import Trener, Selekcija, trener_selekcija
# model Trener - tabela koju menjamo
# Selekcija - potrebna da povežemo trenera sa selekcijama koje vodi
# trener_selekcija - pomoćna tabela (many-to-many) - direktno je koristimo
# da bismo mogli da čitamo/pišemo kolonu glavni_trener (ORM relationship je ne prikazuje sam od sebe)

treneri_bp = Blueprint('treneri', __name__)
# pravimo Blueprint sa imenom 'treneri'


def zahtevaj_admina():
    # pomoćna funkcija - proverava da li je ulogovani korisnik admin
    # vraća None ako JESTE admin, ili (json_odgovor, status_kod) ako NIJE
    # KLJUČNO - sprečava da trener sam sebi (ili nekom drugom) promeni ulogu u admin preko API-ja

    uloga = get_jwt().get('uloga')

    if uloga != 'admin':
        return jsonify({"greska": "Samo admin može da uređuje trenere"}), 403
        # 403 = Forbidden

    return None


def trener_u_json(trener):
    # pomoćna funkcija - pretvara Trener objekat u rečnik za JSON odgovor

    glavni_za_selekcije = db.session.execute(
        db.select(trener_selekcija.c.selekcija_id)
        .where(trener_selekcija.c.trener_id == trener.id)
        .where(trener_selekcija.c.glavni_trener == True)
        # tražimo SVE redove pomoćne tabele gde je OVAJ trener označen kao glavni
    ).scalars().all()
    # .scalars().all() vraća listu vrednosti (ovde: ID-jeva selekcija) umesto punih redova

    return {
        "id": trener.id,
        "ime": trener.ime,
        "prezime": trener.prezime,
        "email": trener.email,
        "uloga": trener.uloga,
        "selekcije": [{"id": s.id, "naziv": s.naziv} for s in trener.selekcije],
        # trener.selekcije dolazi iz many-to-many relationship-a u models.py

        "glavni_za_selekcije": list(glavni_za_selekcije)
        # NOVO - lista ID-jeva selekcija za koje je OVAJ trener glavni
        # NAPOMENA: lozinka_hash namerno NIKAD ne vraćamo frontendu, iz bezbednosti
    }


@treneri_bp.route('/api/treneri', methods=['GET'])
# GET /api/treneri - vraća SVE trenere
@jwt_required()
def get_treneri():
    treneri = Trener.query.all()
    # uzimamo sve redove iz tabele trener

    return jsonify([trener_u_json(t) for t in treneri])
    # koristimo pomoćnu funkciju za svaki trener u listi


@treneri_bp.route('/api/treneri/<int:id>', methods=['GET'])
# GET /api/treneri/2 - vraća JEDNOG trenera po ID-u
@jwt_required()
def get_trener(id):
    trener = Trener.query.get_or_404(id)
    # tražimo trenera po ID-u; 404 ako ne postoji

    return jsonify(trener_u_json(trener))


def postavi_glavne_selekcije(trener_id, glavni_selekcija_ids):
    # pomoćna funkcija - postavlja glavni_trener=True za navedene selekcije OVOG trenera,
    # i glavni_trener=False za sve ostale selekcije tog trenera (da samo prosleđene ostanu glavne)

    db.session.execute(
        trener_selekcija.update()
        .where(trener_selekcija.c.trener_id == trener_id)
        .values(glavni_trener=False)
        # prvo RESETUJEMO sve na False - da ne ostane "zaglavljen" stari glavni status
    )

    if glavni_selekcija_ids:
        db.session.execute(
            trener_selekcija.update()
            .where(trener_selekcija.c.trener_id == trener_id)
            .where(trener_selekcija.c.selekcija_id.in_(glavni_selekcija_ids))
            .values(glavni_trener=True)
            # pa postavljamo True SAMO za selekcije koje su poslate kao "glavne"
        )


@treneri_bp.route('/api/treneri', methods=['POST'])
# POST /api/treneri - pravi NOVOG trenera
@jwt_required()
def dodaj_trenera():
    provera = zahtevaj_admina()
    if provera:
        return provera

    podaci = request.get_json()
    # čitamo JSON podatke poslate sa frontenda

    novi_trener = Trener(
        ime=podaci.get('ime'),
        prezime=podaci.get('prezime'),
        email=podaci.get('email'),
        lozinka_hash=generate_password_hash(podaci.get('lozinka')),
        # ODMAH hashujemo lozinku - nikad je ne čuvamo u čitljivom obliku
        uloga=podaci.get('uloga', 'trener')
        # default uloga je 'trener' ako nije poslata
    )

    selekcija_id_lista = podaci.get('selekcija_ids', [])
    # opciono - lista ID-jeva selekcija koje ovaj trener vodi

    if selekcija_id_lista:
        novi_trener.selekcije = Selekcija.query.filter(Selekcija.id.in_(selekcija_id_lista)).all()
        # pronalazimo sve selekcije čiji je ID u poslatoj listi i povezujemo ih sa trenerom

    db.session.add(novi_trener)
    db.session.commit()
    # dodajemo i čuvamo u bazi - OVDE se prvi put pravi red i u trener_selekcija tabeli

    glavni_selekcija_ids = podaci.get('glavni_selekcija_ids', [])
    # NOVO - opciono - lista ID-jeva selekcija za koje je OVAJ trener glavni

    if glavni_selekcija_ids:
        postavi_glavne_selekcije(novi_trener.id, glavni_selekcija_ids)
        db.session.commit()
        # commit ponovo, jer smo posle prvog commit-a dodatno menjali pomoćnu tabelu

    return jsonify(trener_u_json(novi_trener)), 201


@treneri_bp.route('/api/treneri/<int:id>', methods=['PUT'])
# PUT /api/treneri/2 - MENJA postojećeg trenera
@jwt_required()
def izmeni_trenera(id):
    provera = zahtevaj_admina()
    if provera:
        return provera

    trener = Trener.query.get_or_404(id)
    # tražimo trenera kojeg menjamo, 404 ako ne postoji

    podaci = request.get_json()

    trener.ime = podaci.get('ime', trener.ime)
    trener.prezime = podaci.get('prezime', trener.prezime)
    trener.email = podaci.get('email', trener.email)
    trener.uloga = podaci.get('uloga', trener.uloga)
    # menjamo polja AKO su poslata, inače ostavljamo staro

    if podaci.get('lozinka'):
        # lozinku menjamo SAMO ako je nova lozinka poslata
        trener.lozinka_hash = generate_password_hash(podaci.get('lozinka'))

    if 'selekcija_ids' in podaci:
        # selekcije menjamo SAMO ako je taj podatak poslat
        trener.selekcije = Selekcija.query.filter(Selekcija.id.in_(podaci.get('selekcija_ids'))).all()

    db.session.commit()
    # čuvamo osnovne izmene PRE nego što diramo glavni_trener kolonu

    if 'glavni_selekcija_ids' in podaci:
        # NOVO - menjamo koje selekcije su OVOM treneru "glavne", ako je poslato
        postavi_glavne_selekcije(trener.id, podaci.get('glavni_selekcija_ids'))
        db.session.commit()

    return jsonify(trener_u_json(trener))


@treneri_bp.route('/api/treneri/<int:id>', methods=['DELETE'])
# DELETE /api/treneri/2 - BRIŠE trenera
@jwt_required()
def obrisi_trenera(id):
    provera = zahtevaj_admina()
    if provera:
        return provera

    trener = Trener.query.get_or_404(id)
    # tražimo trenera kojeg brišemo, 404 ako ne postoji

    db.session.delete(trener)
    db.session.commit()

    return jsonify({"poruka": "Trener obrisan"}), 200