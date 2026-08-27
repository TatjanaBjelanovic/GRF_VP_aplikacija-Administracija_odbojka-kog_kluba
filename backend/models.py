# models.py
# Ovde definišemo sve tabele baze podataka kao Python klase (SQLAlchemy modeli)

from extensions import db
# uvozimo db objekat da bismo mogli da definišemo modele preko njega


class Lokacija(db.Model):
    # klasa Lokacija predstavlja tabelu "lokacija" u bazi
    # (skola odbojke - jedan od objekata gde se trenira)

    id = db.Column(db.Integer, primary_key=True)
    # id - jedinstveni broj svakog reda, glavni ključ (primary key)

    naziv = db.Column(db.String(100), nullable=False)
    # naziv lokacije, npr. "Sala Banjica" - obavezno polje (nullable=False)

    adresa = db.Column(db.String(200))
    # adresa lokacije - nije obavezno polje

    def __repr__(self):
        # __repr__ definiše kako se objekat prikazuje kad ga odštampamo (za debug)
        return f"<Lokacija {self.naziv}>"


# Pomoćna tabela za many-to-many vezu selekcija <-> lokacija
# (jedna selekcija može trenirati na VIŠE lokacija, jedna lokacija ugošćava više selekcija)
selekcija_lokacija = db.Table(
    'selekcija_lokacija',
    # ime tabele u bazi

    db.Column('selekcija_id', db.Integer, db.ForeignKey('selekcija.id'), primary_key=True),
    # kolona koja pokazuje na selekciju

    db.Column('lokacija_id', db.Integer, db.ForeignKey('lokacija.id'), primary_key=True)
    # kolona koja pokazuje na lokaciju
    # obe kolone zajedno čine složeni primary key ove tabele
)


class Selekcija(db.Model):
    # klasa Selekcija predstavlja tabelu "selekcija"
    # (npr. "Mlađi pioniri", "Kadeti", "Seniori")

    id = db.Column(db.Integer, primary_key=True)
    # jedinstveni broj selekcije

    naziv = db.Column(db.String(100), nullable=False)
    # naziv selekcije, npr. "Kadetkinje"

    cena_clanarine = db.Column(db.Numeric(10, 2), nullable=True)
    # mesečna cena članarine za ovu selekciju - koristi se kao podrazumevana vrednost
    # kad se dodaje nova članarina za igrača ove selekcije; nullable=True jer nije uvek uneta

    lokacije = db.relationship('Lokacija', secondary=selekcija_lokacija, backref='selekcije')
    # many-to-many veza - selekcija.lokacije daje LISTU lokacija na kojima trenira,
    # a lokacija.selekcije daje sve selekcije koje treniraju na toj lokaciji
    # (ranije je ovo bilo lokacija_id, jedna lokacija po selekciji - sad ih može biti više)

    def __repr__(self):
        return f"<Selekcija {self.naziv}>"


# Pomoćna tabela za many-to-many vezu trener <-> selekcija
# (jedan trener može voditi više selekcija, jedna selekcija može imati više trenera)
trener_selekcija = db.Table(
    'trener_selekcija',
    # ime tabele u bazi

    db.Column('trener_id', db.Integer, db.ForeignKey('trener.id'), primary_key=True),
    # kolona koja pokazuje na trenera

    db.Column('selekcija_id', db.Integer, db.ForeignKey('selekcija.id'), primary_key=True),
    # kolona koja pokazuje na selekciju

    db.Column('glavni_trener', db.Boolean, default=False, nullable=False)
    # NOVO - da li je OVAJ trener glavni (šef) za OVU selekciju
    # samo JEDAN trener po selekciji treba da ima True (to čuvamo na nivou rute, ne baze)
)


class Trener(db.Model):
    # klasa Trener predstavlja tabelu "trener"

    id = db.Column(db.Integer, primary_key=True)
    # jedinstveni broj trenera

    ime = db.Column(db.String(50), nullable=False)
    # ime trenera - obavezno

    prezime = db.Column(db.String(50), nullable=False)
    # prezime trenera - obavezno

    email = db.Column(db.String(100), unique=True, nullable=False)
    # email trenera - unique=True znači da ne mogu dva trenera imati isti email
    # koristićemo ga i za login

    lozinka_hash = db.Column(db.String(200), nullable=False)
    # ovde NE čuvamo pravu lozinku, već njen hash (enkriptovanu verziju)
    # pravu lozinku nikad ne smemo čuvati u bazi u čitljivom obliku

    uloga = db.Column(db.String(20), nullable=False, default='trener')
    # uloga korisnika - 'admin' ili 'trener', default je 'trener'
    # ovo koristimo za proveru prava pristupa (admin vidi/radi sve, trener samo svoje)

    selekcije = db.relationship('Selekcija', secondary=trener_selekcija, backref='treneri')
    # many-to-many veza - trener.selekcije daje sve selekcije koje vodi,
    # a selekcija.treneri daje sve trenere te selekcije
    # (da li je trener GLAVNI za neku selekciju se čita iz pomoćne tabele trener_selekcija,
    # posebno preko upita, jer relationship ovde ne prikazuje dodatne kolone automatski)

    def __repr__(self):
        return f"<Trener {self.ime} {self.prezime}>"


class Igrac(db.Model):
    # klasa Igrac predstavlja tabelu "igrac" (član kluba)

    id = db.Column(db.Integer, primary_key=True)
    # jedinstveni broj igrača

    ime = db.Column(db.String(50), nullable=False)
    # ime igrača - obavezno

    prezime = db.Column(db.String(50), nullable=False)
    # prezime igrača - obavezno

    datum_rodjenja = db.Column(db.Date, nullable=False)
    # datum rođenja - koristimo tip Date (samo datum, bez vremena)

    telefon_roditelja = db.Column(db.String(30))
    # kontakt telefon roditelja - nije obavezno

    ime_roditelja = db.Column(db.String(100), nullable=True)
    # ime roditelja/staratelja igrača - nije obavezno

    kategorija_clanarine = db.Column(db.String(30), nullable=True, default='regularna')
    # kategorija za obračun članarine: regularna, popust10, popust20, popust30,
    # drugo_dete, trece_dete, oslobodjen - za sada samo tekstualna oznaka

    datum_lekarskog = db.Column(db.Date, nullable=True)
    # datum kad je igrač obavio lekarski pregled - istek se računa automatski (6 meseci kasnije)
    # u routes/igraci.py, nije posebna kolona u bazi

    selekcija_id = db.Column(db.Integer, db.ForeignKey('selekcija.id'), nullable=False)
    # svaki igrač MORA pripadati nekoj selekciji

    selekcija = db.relationship('Selekcija', backref='igraci')
    # relationship - igrac.selekcija daje objekat selekcije,
    # a selekcija.igraci daje listu svih igrača te selekcije

    def __repr__(self):
        return f"<Igrac {self.ime} {self.prezime}>"


class Trening(db.Model):
    # klasa Trening predstavlja tabelu "trening" (zakazan termin treninga NA KONKRETAN DATUM)

    id = db.Column(db.Integer, primary_key=True)
    # jedinstveni broj termina treninga

    datum = db.Column(db.Date, nullable=False)
    # datum kada je trening zakazan

    vreme_pocetka = db.Column(db.Time, nullable=False)
    # vreme početka treninga (tip Time - samo sati i minuti)

    vreme_zavrsetka = db.Column(db.Time, nullable=False)
    # vreme završetka treninga

    realizovan = db.Column(db.Boolean, default=False)
    # da li je trening ZAISTA održan (trener to naknadno potvrđuje)
    # default=False znači da je trening isprva samo "zakazan", ne i odrađen

    potrebna_zamena = db.Column(db.Boolean, default=False, nullable=False)
    # NOVO - trener je označio da NE MOŽE da drži ovaj trening, treba mu zamena
    # admin ovo vidi na svojoj Početnoj i može da dodeli drugog trenera SAMO za ovaj trening

    selekcija_id = db.Column(db.Integer, db.ForeignKey('selekcija.id'), nullable=False)
    # trening MORA pripadati nekoj selekciji

    trener_id = db.Column(db.Integer, db.ForeignKey('trener.id'), nullable=False)
    # trening MORA imati trenera koji ga vodi

    lokacija_id = db.Column(db.Integer, db.ForeignKey('lokacija.id'), nullable=False)
    # trening MORA imati lokaciju gde se održava

    selekcija = db.relationship('Selekcija', backref='treninzi')
    trener = db.relationship('Trener', backref='treninzi')
    lokacija = db.relationship('Lokacija', backref='treninzi')
    # relationship prečice za sve tri veze gore

    def __repr__(self):
        return f"<Trening {self.datum} {self.vreme_pocetka}>"


class Prisustvo(db.Model):
    # klasa Prisustvo predstavlja tabelu "prisustvo"
    # beleži da li je KONKRETAN igrač bio prisutan na KONKRETNOM treningu

    id = db.Column(db.Integer, primary_key=True)
    # jedinstveni broj zapisa o prisustvu

    trening_id = db.Column(db.Integer, db.ForeignKey('trening.id'), nullable=False)
    # na koji trening se ovaj zapis odnosi (trening već ima svoj datum)

    igrac_id = db.Column(db.Integer, db.ForeignKey('igrac.id'), nullable=False)
    # koji igrač je u pitanju

    prisutan = db.Column(db.Boolean, default=False, nullable=False)
    # da li je igrač bio prisutan (True/False)

    trening = db.relationship('Trening', backref='prisustva')
    igrac = db.relationship('Igrac', backref='prisustva')
    # relationship prečice - trening.prisustva daje sve zapise za taj trening,
    # igrac.prisustva daje sve zapise prisustva tog igrača

    def __repr__(self):
        return f"<Prisustvo igrac={self.igrac_id} trening={self.trening_id} prisutan={self.prisutan}>"


class Utakmica(db.Model):
    # klasa Utakmica predstavlja tabelu "utakmica"
    # čuvamo SAMO raspored (kad je zakazana), NE rezultat

    id = db.Column(db.Integer, primary_key=True)
    # jedinstveni broj utakmice

    datum = db.Column(db.Date, nullable=False)
    # datum održavanja utakmice

    vreme = db.Column(db.Time, nullable=False)
    # vreme početka utakmice

    protivnik = db.Column(db.String(100), nullable=False)
    # naziv protivničkog kluba

    domacin = db.Column(db.Boolean, default=True)
    # da li je naš klub domaćin (True) ili gostuje (False)

    mesto_odrzavanja = db.Column(db.String(200), nullable=True)
    # NOVO - slobodan tekst (npr. "Sala Čukarica" ili adresa), NE veza ka tabeli lokacija
    # jer gostujuće utakmice se ne igraju u našim salama

    selekcija_id = db.Column(db.Integer, db.ForeignKey('selekcija.id'), nullable=False)
    # utakmica pripada tačno jednoj selekciji

    selekcija = db.relationship('Selekcija', backref='utakmice')
    # relationship prečica ka selekciji

    def __repr__(self):
        return f"<Utakmica {self.datum} protiv {self.protivnik}>"


class Clanarina(db.Model):
    # klasa Clanarina predstavlja tabelu "clanarina"
    # beleži uplate članarine za svakog igrača, po mesecima

    id = db.Column(db.Integer, primary_key=True)
    # jedinstveni broj zapisa

    igrac_id = db.Column(db.Integer, db.ForeignKey('igrac.id'), nullable=False)
    # za kog igrača je ova uplata

    mesec = db.Column(db.Integer, nullable=False)
    # broj meseca za koji se plaća članarina (1-12)

    godina = db.Column(db.Integer, nullable=False)
    # godina za koju se plaća članarina

    iznos = db.Column(db.Numeric(10, 2), nullable=False)
    # iznos uplate - Numeric(10,2) znači do 10 cifara, 2 decimale (npr. 2500.00)

    datum_uplate = db.Column(db.Date)
    # kada je uplata izvršena - nije obavezno dok se stvarno ne uplati

    placeno = db.Column(db.Boolean, default=False, nullable=False)
    # da li je članarina za taj mesec plaćena (True/False)

    igrac = db.relationship('Igrac', backref='clanarine')
    # relationship - igrac.clanarine daje sve zapise članarina tog igrača

    def __repr__(self):
        return f"<Clanarina igrac={self.igrac_id} {self.mesec}/{self.godina} placeno={self.placeno}>"


class Termin(db.Model):
    # klasa Termin predstavlja tabelu "termin"
    # ovo je STALNI NEDELJNI TERMIN (šablon) - ponavlja se svake nedelje
    # razlikuje se od Treninga koji ima tačan datum i beleži da li je STVARNO održan

    id = db.Column(db.Integer, primary_key=True)
    # jedinstveni broj termina

    dan_u_nedelji = db.Column(db.String(20), nullable=False)
    # npr. "Ponedeljak", "Utorak"... - termin se ponavlja SVAKE nedelje tog dana

    vreme_pocetka = db.Column(db.Time, nullable=False)
    vreme_zavrsetka = db.Column(db.Time, nullable=False)
    # slobodan unos vremena - admin sam bira tačan sat i minut

    selekcija_id = db.Column(db.Integer, db.ForeignKey('selekcija.id'), nullable=False)
    trener_id = db.Column(db.Integer, db.ForeignKey('trener.id'), nullable=False)
    lokacija_id = db.Column(db.Integer, db.ForeignKey('lokacija.id'), nullable=False)
    # termin MORA imati selekciju, trenera i lokaciju (salu)

    selekcija = db.relationship('Selekcija', backref='termini')
    trener = db.relationship('Trener', backref='termini')
    lokacija = db.relationship('Lokacija', backref='termini')
    # relationship prečice - npr. termin.selekcija.naziv

    def __repr__(self):
        return f"<Termin {self.dan_u_nedelji} {self.vreme_pocetka} {self.selekcija_id}>"
