Odbojkaški klub - veb aplikacija

Veb aplikacija za vođenje odbojkaškog kluba - evidencija igrača, trenera, selekcija, treninga, utakmica, članarina i lekarskih pregleda.

Struktura projekta
├── backend/              # Flask API (Python)
│   ├── app.py            # glavni fajl aplikacije
│   ├── extensions.py     # SQLAlchemy inicijalizacija
│   ├── models.py         # modeli baze podataka
│   ├── routes/           # API rute, po entitetima
│   └── requirements.txt
├── frontend/             # React aplikacija
│   ├── src/
│   │   ├── pages/        # stranice aplikacije
│   │   ├── components/   # deljene komponente
│   │   └── App.js
│   └── package.json
├── podaci/               # primeri CSV fajlova za uvoz podataka (primer kako se uvoze podci)
├── docker-compose.yml
└── SETUP.md              # detaljno uputstvo za pokretanje


Rad aplikacije

Trener može da radi u aplikaciji:

Kad se uloguje, na početnoj strani vidi svoj raspored za narednih 10 dana - i treninge i utakmice njegovih selekcija. Ako baš tog dana ima trening, postoji dugme da unese ko je od igrača bio prisutan - samo se čekiraju imena. Ako se desi da ne može trener da drži neki od svoji treninga, ima dugme "Ne mogu da držim" - to se odmah javlja adminu, koji onda dodeljuje nekog drugog trenera za taj konkretan termin.

Stranica Termini pokazuje stalni nedeljni raspored kluba - ko kada trenira i gde, u obliku tabele (dani kao kolone, vremena kao redovi). To može da menja samo admin, ali svi mogu da vide.

Na Utakmicama zakazuješ utakmice - upiše se protivnik, datum, vreme, i da li smo domaćini (ako jesmo, može da se izabere od sala koje klub već ima, ako ne izlazi polje za slobodan unos).

Unos članarine pokazuje samo igrače koji nešto duguju, iz selekcija ulogovanog trenera. Klikne na ime, vidi koliko duguje (cena se sama računa, uzima u obzir popust ako ga igrač ima), i ili označi da je sve plaćeno, ili upiše tačan iznos ako je platio manje/drugačije.

Pod Izveštaji vidi, za mesec ili celu godinu, koliko je treninga održao/la, koliko je članarina naplaćeno, i slično - samo za svoje selekcije.

Ako si admin, ima i posebnu stranicu Administracija gde se sve ostalo podešava - dodaju se novi igrači, treneri, sale, selekcije, termini, mogu se uvesti podaci iz Excel fajla umesto ručnog kucanja, i tu se vidi kompletan pregled cele škole odbojke, ne samo svojih selekcija.
