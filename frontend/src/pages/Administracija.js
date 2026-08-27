// src/pages/Administracija.js
// Stranica vidljiva SAMO adminu.
// Gornji deo ("Održavanje") - dugmad koja otvaraju iskačuće forme za brz unos
// Termina, Selekcija, Igrača, Lokacija i Trenera.
// Donji deo - pregled po selekciji: igrači, ukupan dug po igraču, lekarski pregledi.

import { useEffect, useState } from 'react';
import { Container, Table, Button, Form, Alert, Spinner, ButtonGroup, Modal } from 'react-bootstrap';
import { apiFetch } from '../api';
import Lokacije from './Lokacije';
import Selekcije from './Selekcije';
import Igraci from './Igraci';
import Treninzi from './Treninzi';
import Treneri from './Treneri';
import IzvestajiSekcija from '../components/IzvestajiSekcija';
// reusable komponenta - ista se koristi i na Izvestaji.js stranici za trenere
// uvozimo GOTOVE stranice kao komponente - prikazaćemo ih UNUTAR Administracije
// umesto da prepisujemo istu CRUD logiku (tabela + forma) ponovo

function preuzmiCSV(nazivFajla, redovi, kolone) {
  // pomoćna funkcija - pravi CSV tekst od podataka i pokreće preuzimanje u browseru
  const zaglavlje = kolone.map((k) => k.naslov).join(',');
  // spajamo nazive kolona zarezom - to je prvi red CSV fajla (zaglavlje tabele)

  const linije = redovi.map((red) =>
    kolone.map((k) => `"${(red[k.kljuc] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    // svaku vrednost stavljamo pod navodnike, udvostručujemo eventualne navodnike unutar teksta
  );

  const csvSadrzaj = [zaglavlje, ...linije].join('\n');
  // spajamo zaglavlje i sve redove, svaki u svom redu teksta

  const blob = new Blob(['\uFEFF' + csvSadrzaj], { type: 'text/csv;charset=utf-8;' });
  // '\uFEFF' (BOM) osigurava da Excel ispravno prikaže slova sa kvačicama

  const url = URL.createObjectURL(blob);
  // pravimo privremeni link ka tom fajlu u memoriji

  const link = document.createElement('a');
  link.href = url;
  link.download = nazivFajla;
  document.body.appendChild(link);
  link.click();
  // programski "kliknemo" na nevidljivi link da pokrenemo preuzimanje

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  // čistimo za sobom
}

const DANI = ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];
// koristimo za padajući meni dana u formi za Termin

// Popust po kategoriji članarine - množimo cenu selekcije ovim brojem da dobijemo pravu cenu
// (ISTA logika kao na stranici Unos članarine - Clanarine.js)
const POPUST_PO_KATEGORIJI = {
  regularna: 1,
  popust10: 0.9,
  popust20: 0.8,
  popust30: 0.7,
  drugo_dete: 0.5,
  trece_dete: 0,
  oslobodjen: 0
};

function sezonaMeseci() {
  // vraća niz { mesec, godina } za CELU sezonu - septembar do juna
  const danas = new Date();
  const tekucaGodina = danas.getFullYear();

  const redosledMeseci = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
  // avgust-decembar pripadaju "tekućoj" godini, januar-jun pripadaju SLEDEĆOJ godini
  // (sezona počinje avgustom, ne septembrom)

  return redosledMeseci.map((mesec) => ({
    mesec,
    godina: mesec >= 8 ? tekucaGodina : tekucaGodina + 1
    // ako je mesec 8-12 (avg-dec), godina je ova godina; inače (jan-jun) sledeća godina
  }));
}

function Administracija() {
  // --- Podaci za padajuće menije (potrebni u više formi) ---
  const [selekcije, setSelekcije] = useState([]);
  const [lokacije, setLokacije] = useState([]);
  const [treneri, setTreneri] = useState([]);

  // --- Pregled po izabranoj selekciji (donji deo stranice) ---
  const [selekcijaId, setSelekcijaId] = useState('');
  const [igraci, setIgraci] = useState([]);
  const [dugovanja, setDugovanja] = useState([]);
  // dugovanja - JEDAN red po igraču sa ukupnim iznosom duga (ne po mesecu)

  const [pregledi, setPregledi] = useState([]);
  const [aktivnaSekcija, setAktivnaSekcija] = useState('igraci');
  // koje dugme je trenutno izabrano - 'igraci', 'clanarine' ili 'lekarski'

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  // --- Održavanje (gornji deo) - koji modal je otvoren i sadržaj forme unutar njega ---
  const [otvoreniModal, setOtvoreniModal] = useState(null);
  // 'termin', 'selekcija', 'igrac', 'lokacija', 'trener', ili null (nijedan otvoren)

  const [otvorenaTabela, setOtvorenaTabela] = useState(null);
  // 'lokacije', 'selekcije', 'igraci', 'treninzi', 'treneri', ili null (nijedna otvorena)
  // ovo je ODVOJENO od otvoreniModal (koji kontroliše Održavanje formu)

  const [uvozOtvoren, setUvozOtvoren] = useState(false);
  // NOVO - da li je odeljak "Uvoz kroz Excel" trenutno prikazan (klikom na dugme se otvara/zatvara)

  // --- Uvoz kroz Excel (CSV) ---
  const [uvozPoruka, setUvozPoruka] = useState('');
  const [uvozGreska, setUvozGreska] = useState('');
  const [uvozUToku, setUvozUToku] = useState(false);
  // sprečava da korisnik pokrene DVA uvoza istovremeno

  const [formaTermin, setFormaTermin] = useState({
    dan_u_nedelji: 'Ponedeljak', vreme_pocetka: '', vreme_zavrsetka: '',
    selekcija_id: '', trener_id: '', lokacija_id: ''
  });

  const [formaSelekcija, setFormaSelekcija] = useState({
    naziv: '', cena_clanarine: '', lokacija_ids: []
    // NOVO - lokacija_ids je NIZ (selekcija može trenirati na više lokacija)
  });

  const [formaIgrac, setFormaIgrac] = useState({
    ime: '', prezime: '', datum_rodjenja: '', telefon_roditelja: '', ime_roditelja: '',
    kategorija_clanarine: 'regularna', datum_lekarskog: '', selekcija_id: ''
  });

  const [formaLokacija, setFormaLokacija] = useState({
    naziv: '', adresa: ''
  });

  const [formaTrener, setFormaTrener] = useState({
    ime: '', prezime: '', email: '', lozinka: '', uloga: 'trener', selekcija_ids: []
  });

  // --- Učitavanje osnovnih listi (selekcije, lokacije, treneri) pri prvom prikazu stranice ---
  useEffect(() => {
    async function ucitajOsnovno() {
      try {
        const [selData, lokData, trenData] = await Promise.all([
          apiFetch('/api/selekcije'),
          apiFetch('/api/lokacije'),
          apiFetch('/api/treneri')
        ]);
        setSelekcije(selData);
        setLokacije(lokData);
        setTreneri(trenData);
      } catch (err) {
        setGreska(err.message);
      } finally {
        setUcitavanje(false);
      }
    }
    ucitajOsnovno();
  }, []);

  // --- Učitavanje pregleda za IZABRANU selekciju (donji deo) ---
  useEffect(() => {
    if (!selekcijaId) {
      // ako ništa nije izabrano, praznimo sve tri liste i ne pozivamo backend
      setIgraci([]);
      setDugovanja([]);
      setPregledi([]);
      return;
    }

    async function ucitajZaSelekciju() {
      try {
        const [sviIgraci, sveClanarineSvih, istekData] = await Promise.all([
          apiFetch('/api/igraci'),
          apiFetch('/api/clanarine'),
          apiFetch('/api/igraci/lekarski/istek?dana=10')
        ]);

        const igraciSelekcije = sviIgraci.filter((i) => i.selekcija_id === parseInt(selekcijaId));
        setIgraci(igraciSelekcije);

        const idjeviIgracaSelekcije = igraciSelekcije.map((i) => i.id);
        // lista ID-jeva igrača ove selekcije - koristimo je da filtriramo preglede

        // --- Obračun UKUPNOG duga po igraču, do današnjeg dana ---
        const sezona = sezonaMeseci();
        // ceo spisak meseci sezone (sept-jun) sa odgovarajućim godinama

        const danas = new Date();
        // koristimo današnji datum da odsečemo BUDUĆE mesece iz obračuna

        const sezonaDoSada = sezona.filter(({ mesec, godina }) => {
          const prviUMesecu = new Date(godina, mesec - 1, 1);
          // pravimo datum "prvi dan tog meseca" da ga uporedimo sa danas
          return prviUMesecu <= danas;
          // uzimamo SAMO mesece koji su već počeli (prošli ili tekući), ne buduće
        });

        const selekcijaObjekat = selekcije.find((s) => s.id === parseInt(selekcijaId));
        const cena = selekcijaObjekat ? selekcijaObjekat.cena_clanarine : null;
        // cena članarine za IZABRANU selekciju - null ako nije uneta

        const dugovanjaLista = igraciSelekcije.map((igrac) => {
          // za SVAKOG igrača pravimo JEDAN red sa ukupnim dugom

          const brojNeplacenih = sezonaDoSada.filter(({ mesec, godina }) => {
            const zapis = sveClanarineSvih.find(
              (c) => c.igrac_id === igrac.id && c.mesec === mesec && c.godina === godina
            );
            return zapis ? !zapis.placeno : true;
            // ako zapis ne postoji, tretiramo kao neplaćeno
          }).length;
          // .length broji koliko meseci od početka sezone do danas NIJE plaćeno

          const multiplikator = POPUST_PO_KATEGORIJI[igrac.kategorija_clanarine] ?? 1;
          // ISTA logika kao na stranici Unos članarine - popust po kategoriji igrača
          // (regularna=1, popust10=0.9, popust20=0.8, popust30=0.7, drugo_dete=0.5, trece_dete/oslobodjen=0)

          const cenaPoMesecu = cena !== null ? cena * multiplikator : null;

          return {
            id: igrac.id,
            igrac_ime: `${igrac.ime} ${igrac.prezime}`,
            broj_meseci: brojNeplacenih,
            ukupno: cenaPoMesecu !== null ? Math.round(brojNeplacenih * cenaPoMesecu * 100) / 100 : null
            // ukupan dug = broj neplaćenih meseci * cena SA popustom; null ako cena nije uneta
          };
        }).filter((d) => d.broj_meseci > 0);
        // prikazujemo SAMO igrače koji stvarno nešto duguju

        setDugovanja(dugovanjaLista);

        // Lekarski pregledi - spajamo dve liste, ali BELEŽIMO koja je koja (za crveno obeležavanje)
        const uskoro = istekData.isticu_uskoro
          .filter((p) => idjeviIgracaSelekcije.includes(p.igrac_id))
          .map((p) => ({ ...p, istekao: false }));

        const istekli = istekData.vec_istekli
          .filter((p) => idjeviIgracaSelekcije.includes(p.igrac_id))
          .map((p) => ({ ...p, istekao: true }));

        setPregledi([...istekli, ...uskoro]);
        // prvo istekli (hitnije), pa oni koji tek ističu

      } catch (err) {
        setGreska(err.message);
      }
    }

    ucitajZaSelekciju();
  }, [selekcijaId, selekcije]);
  // dodali smo "selekcije" u dependency listu - treba nam cena_clanarine iz nje

  // --- Osvežavanje osnovnih listi posle unosa u Održavanju ---
  async function osveziOsnovno() {
    // pozivamo je posle SVAKOG uspešnog unosa u Održavanju - da se novi podaci odmah vide svuda
    try {
      const [selData, lokData, trenData] = await Promise.all([
        apiFetch('/api/selekcije'),
        apiFetch('/api/lokacije'),
        apiFetch('/api/treneri')
      ]);
      setSelekcije(selData);
      setLokacije(lokData);
      setTreneri(trenData);
    } catch (err) {
      setGreska(err.message);
    }
  }

  // --- Brisanje igrača (u donjem delu, sekcija Igrači) ---
  async function obrisiIgraca(id) {
    if (!window.confirm('Da li sigurno želiš da obrišeš ovog igrača?')) {
      return;
    }
    try {
      await apiFetch(`/api/igraci/${id}`, { method: 'DELETE' });
      setIgraci(igraci.filter((i) => i.id !== id));
    } catch (err) {
      setGreska(err.message);
    }
  }

  // --- Funkcije za čuvanje (POST) iz Održavanja - svaka zatvara svoj modal i osvežava liste ---

  async function sacuvajTermin(e) {
    e.preventDefault();
    // sprečavamo osvežavanje cele stranice pri submit-u forme
    try {
      await apiFetch('/api/termini', {
        method: 'POST',
        body: JSON.stringify(formaTermin)
      });
      setOtvoreniModal(null);
      // zatvaramo modal
      setFormaTermin({
        dan_u_nedelji: 'Ponedeljak', vreme_pocetka: '', vreme_zavrsetka: '',
        selekcija_id: '', trener_id: '', lokacija_id: ''
      });
      // praznimo formu za sledeći unos
    } catch (err) {
      setGreska(err.message);
    }
  }

  function promeniIzborLokacijaSelekcija(e) {
    // NOVO - multi-select za lokacije u formi Selekcije
    const izabraniIdovi = Array.from(e.target.selectedOptions, (opcija) => parseInt(opcija.value));
    setFormaSelekcija({ ...formaSelekcija, lokacija_ids: izabraniIdovi });
  }

  async function sacuvajSelekciju(e) {
    e.preventDefault();
    try {
      await apiFetch('/api/selekcije', {
        method: 'POST',
        body: JSON.stringify(formaSelekcija)
      });
      setOtvoreniModal(null);
      setFormaSelekcija({ naziv: '', cena_clanarine: '', lokacija_ids: [] });
      osveziOsnovno();
      // OVDE osvežavamo jer nova selekcija treba odmah da se pojavi u ostalim padajućim menijima
    } catch (err) {
      setGreska(err.message);
    }
  }

  async function sacuvajIgraca(e) {
    e.preventDefault();
    try {
      await apiFetch('/api/igraci', {
        method: 'POST',
        body: JSON.stringify(formaIgrac)
      });
      setOtvoreniModal(null);
      setFormaIgrac({
        ime: '', prezime: '', datum_rodjenja: '', telefon_roditelja: '', ime_roditelja: '',
        kategorija_clanarine: 'regularna', datum_lekarskog: '', selekcija_id: ''
      });

      if (formaIgrac.selekcija_id === selekcijaId) {
        // ako smo dodali igrača BAŠ za trenutno izabranu selekciju, osvežavamo i donji pregled
        const sviIgraci = await apiFetch('/api/igraci');
        setIgraci(sviIgraci.filter((i) => i.selekcija_id === parseInt(selekcijaId)));
      }
    } catch (err) {
      setGreska(err.message);
    }
  }

  async function sacuvajLokaciju(e) {
    e.preventDefault();
    try {
      await apiFetch('/api/lokacije', {
        method: 'POST',
        body: JSON.stringify(formaLokacija)
      });
      setOtvoreniModal(null);
      setFormaLokacija({ naziv: '', adresa: '' });
      osveziOsnovno();
    } catch (err) {
      setGreska(err.message);
    }
  }

  async function sacuvajTrenera(e) {
    e.preventDefault();
    try {
      await apiFetch('/api/treneri', {
        method: 'POST',
        body: JSON.stringify(formaTrener)
      });
      setOtvoreniModal(null);
      setFormaTrener({ ime: '', prezime: '', email: '', lozinka: '', uloga: 'trener', selekcija_ids: [] });
      osveziOsnovno();
    } catch (err) {
      setGreska(err.message);
    }
  }

  function promeniIzborSelekcijaTrener(e) {
    // posebna funkcija za multi-select (trener može voditi više selekcija)
    const izabraniIdovi = Array.from(e.target.selectedOptions, (opcija) => parseInt(opcija.value));
    setFormaTrener({ ...formaTrener, selekcija_ids: izabraniIdovi });
  }

  // --- Izvoz u Excel (CSV) za donje sekcije ---

  function izvezIgrace() {
    preuzmiCSV(
      `igraci-${nazivIzabraneSelekcije()}.csv`,
      igraci,
      [
        { kljuc: 'ime', naslov: 'Ime' },
        { kljuc: 'prezime', naslov: 'Prezime' },
        { kljuc: 'datum_rodjenja', naslov: 'Datum rođenja' },
        { kljuc: 'telefon_roditelja', naslov: 'Telefon roditelja' }
      ]
    );
  }

  function izvezDugovanja() {
    preuzmiCSV(
      `dugovanja-${nazivIzabraneSelekcije()}.csv`,
      dugovanja,
      [
        { kljuc: 'igrac_ime', naslov: 'Igrač' },
        { kljuc: 'broj_meseci', naslov: 'Broj neplaćenih meseci' },
        { kljuc: 'ukupno', naslov: 'Ukupno duguje (din)' }
      ]
    );
  }

  function izvezPreglede() {
    const zaExport = pregledi.map((p) => ({
      ...p,
      status: p.istekao ? 'Istekao' : 'Ističe uskoro'
    }));

    preuzmiCSV(
      `lekarski-${nazivIzabraneSelekcije()}.csv`,
      zaExport,
      [
        { kljuc: 'igrac_ime', naslov: 'Igrač' },
        { kljuc: 'datum_isteka', naslov: 'Datum isteka' },
        { kljuc: 'status', naslov: 'Status' }
      ]
    );
  }

  function nazivIzabraneSelekcije() {
    const s = selekcije.find((s) => s.id === parseInt(selekcijaId));
    return s ? s.naziv.replace(/\s+/g, '_') : 'selekcija';
    // .replace uklanja razmake iz naziva fajla
  }

  // --- Uvoz kroz Excel (CSV) - pomoćne funkcije ---

  function parsirajCSV(tekst) {
    // pretvara sirov CSV tekst u niz objekata (jedan objekat po redu, ključevi = imena kolona)

    const redovi = tekst.trim().split('\n').filter((r) => r.trim() !== '');
    // .trim() uklanja prazne linije na početku/kraju, .split('\n') deli po redovima

    const zaglavlje = redovi[0].split(',').map((k) => k.trim());
    // prvi red je zaglavlje - imena kolona

    return redovi.slice(1).map((red) => {
      // slice(1) preskače zaglavlje, ostaje samo pravi sadržaj

      const vrednosti = red.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      // uklanjamo eventualne navodnike sa početka/kraja svake vrednosti

      const objekat = {};
      zaglavlje.forEach((kolona, i) => {
        objekat[kolona] = vrednosti[i] ?? '';
        // spajamo naziv kolone sa odgovarajućom vrednošću iz tog reda
      });
      return objekat;
    });
  }

  function pronadjiIdPoNazivu(lista, naziv) {
    // pomoćna funkcija - traži u listi (selekcije/lokacije/treneri) objekat čiji se naziv poklapa
    // koristimo je da pretvorimo TEKST iz Excel-a (npr. "Kadetkinje") u pravi ID iz baze

    const pronadjen = lista.find(
      (stavka) => (stavka.naziv || '').toLowerCase() === naziv.toLowerCase()
    );
    return pronadjen ? pronadjen.id : null;
    // vraća null ako nije pronađen - to je signal da red ima grešku
  }

  async function obradiUvoz(fajl, tip) {
    // GLAVNA funkcija za uvoz - čita fajl, parsira ga, PROVERAVA SVE redove,
    // i tek ako je SVE ispravno šalje zahteve ka backend-u (sve ili ništa)

    setUvozGreska('');
    setUvozPoruka('');
    setUvozUToku(true);

    try {
      const tekst = await fajl.text();
      // .text() čita sadržaj fajla kao običan tekst

      const redovi = parsirajCSV(tekst);

      if (redovi.length === 0) {
        setUvozGreska('Fajl je prazan ili nije u ispravnom CSV formatu.');
        setUvozUToku(false);
        return;
      }

      const pripremljeniPodaci = [];
      // ovde skupljamo GOTOVE objekte spremne za slanje na backend

      for (let i = 0; i < redovi.length; i++) {
        const red = redovi[i];
        const brojReda = i + 2;
        // +2 jer red 1 je zaglavlje, a ljudi broje redove od 1 (ne od 0)

        if (tip === 'lokacije') {
          if (!red.naziv) {
            setUvozGreska(`Red ${brojReda}: nedostaje "naziv".`);
            setUvozUToku(false);
            return;
          }
          pripremljeniPodaci.push({ naziv: red.naziv, adresa: red.adresa || '' });

        } else if (tip === 'selekcije') {
          if (!red.naziv) {
            setUvozGreska(`Red ${brojReda}: nedostaje "naziv".`);
            setUvozUToku(false);
            return;
          }

          const nazivLokacija = (red.lokacije || '').split(';').map((n) => n.trim()).filter((n) => n);
          // lokacije u CSV-u su odvojene znakom ; (tačka-zarez), jer zarez već koristimo za kolone

          const lokacijaIdovi = [];
          for (const nazivLok of nazivLokacija) {
            const id = pronadjiIdPoNazivu(lokacije, nazivLok);
            if (id === null) {
              setUvozGreska(`Red ${brojReda}: lokacija "${nazivLok}" ne postoji u bazi.`);
              setUvozUToku(false);
              return;
            }
            lokacijaIdovi.push(id);
          }

          pripremljeniPodaci.push({
            naziv: red.naziv,
            cena_clanarine: red.cena_clanarine || null,
            lokacija_ids: lokacijaIdovi
          });

        } else if (tip === 'igraci') {
          if (!red.ime || !red.prezime || !red.datum_rodjenja || !red.selekcija) {
            setUvozGreska(`Red ${brojReda}: nedostaje obavezno polje (ime, prezime, datum_rodjenja ili selekcija).`);
            setUvozUToku(false);
            return;
          }

          const selekcijaId = pronadjiIdPoNazivu(selekcije, red.selekcija);
          if (selekcijaId === null) {
            setUvozGreska(`Red ${brojReda}: selekcija "${red.selekcija}" ne postoji u bazi.`);
            setUvozUToku(false);
            return;
          }

          pripremljeniPodaci.push({
            ime: red.ime,
            prezime: red.prezime,
            datum_rodjenja: red.datum_rodjenja,
            telefon_roditelja: red.telefon_roditelja || '',
            ime_roditelja: red.ime_roditelja || '',
            kategorija_clanarine: red.kategorija_clanarine || 'regularna',
            datum_lekarskog: red.datum_lekarskog || null,
            selekcija_id: selekcijaId
          });

        } else if (tip === 'termini') {
          if (!red.dan_u_nedelji || !red.vreme_pocetka || !red.vreme_zavrsetka || !red.selekcija || !red.trener_email || !red.lokacija) {
            setUvozGreska(`Red ${brojReda}: nedostaje obavezno polje.`);
            setUvozUToku(false);
            return;
          }

          const selekcijaId = pronadjiIdPoNazivu(selekcije, red.selekcija);
          if (selekcijaId === null) {
            setUvozGreska(`Red ${brojReda}: selekcija "${red.selekcija}" ne postoji.`);
            setUvozUToku(false);
            return;
          }

          const trenerPronadjen = treneri.find((t) => t.email.toLowerCase() === red.trener_email.toLowerCase());
          if (!trenerPronadjen) {
            setUvozGreska(`Red ${brojReda}: trener sa email-om "${red.trener_email}" ne postoji.`);
            setUvozUToku(false);
            return;
          }

          const lokacijaId = pronadjiIdPoNazivu(lokacije, red.lokacija);
          if (lokacijaId === null) {
            setUvozGreska(`Red ${brojReda}: lokacija "${red.lokacija}" ne postoji.`);
            setUvozUToku(false);
            return;
          }

          pripremljeniPodaci.push({
            dan_u_nedelji: red.dan_u_nedelji,
            vreme_pocetka: red.vreme_pocetka,
            vreme_zavrsetka: red.vreme_zavrsetka,
            selekcija_id: selekcijaId,
            trener_id: trenerPronadjen.id,
            lokacija_id: lokacijaId
          });

        } else if (tip === 'treneri') {
          if (!red.ime || !red.prezime || !red.email || !red.lozinka) {
            setUvozGreska(`Red ${brojReda}: nedostaje obavezno polje (ime, prezime, email ili lozinka).`);
            setUvozUToku(false);
            return;
          }

          const nazivSelekcija = (red.selekcije || '').split(';').map((n) => n.trim()).filter((n) => n);
          const selekcijaIdovi = [];
          for (const nazivSel of nazivSelekcija) {
            const id = pronadjiIdPoNazivu(selekcije, nazivSel);
            if (id === null) {
              setUvozGreska(`Red ${brojReda}: selekcija "${nazivSel}" ne postoji u bazi.`);
              setUvozUToku(false);
              return;
            }
            selekcijaIdovi.push(id);
          }

          pripremljeniPodaci.push({
            ime: red.ime,
            prezime: red.prezime,
            email: red.email,
            lozinka: red.lozinka,
            uloga: red.uloga || 'trener',
            selekcija_ids: selekcijaIdovi
          });
        }
      }

      // SVI redovi su prošli proveru - tek SAD šaljemo zahteve ka backend-u, jedan po jedan
      const rutePoTipu = {
        lokacije: '/api/lokacije',
        selekcije: '/api/selekcije',
        igraci: '/api/igraci',
        termini: '/api/termini',
        treneri: '/api/treneri'
      };

      for (const podatak of pripremljeniPodaci) {
        await apiFetch(rutePoTipu[tip], {
          method: 'POST',
          body: JSON.stringify(podatak)
        });
      }

      setUvozPoruka(`Uspešno uvezeno ${pripremljeniPodaci.length} redova.`);
      osveziOsnovno();
      // osvežavamo padajuće menije (i eventualno pregled po selekciji) da se novi podaci odmah vide

    } catch (err) {
      setUvozGreska(err.message);
    } finally {
      setUvozUToku(false);
    }
  }

  if (ucitavanje) {
    return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
  }

  return (
    <Container>
      <h2 className="mb-4">Administracija</h2>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <Button
        variant="outline-dark"
        className="mb-3"
        onClick={() => setUvozOtvoren(!uvozOtvoren)}
      >
        {uvozOtvoren ? 'Sakrij uvoz kroz Excel' : 'Uvoz kroz Excel'}
      </Button>

      {uvozOtvoren && (
        <>
          <p className="text-muted small">
            Fajl mora biti .csv sa zaglavljem u prvom redu. Ako BILO KOJI red ima grešku
            (nedostaje polje ili navedena selekcija/lokacija/trener ne postoji), ceo uvoz se prekida.
          </p>

          {uvozGreska && <Alert variant="danger" onClose={() => setUvozGreska('')} dismissible>{uvozGreska}</Alert>}
          {uvozPoruka && <Alert variant="success" onClose={() => setUvozPoruka('')} dismissible>{uvozPoruka}</Alert>}

          <Table bordered size="sm" className="mb-4">
            <thead>
              <tr>
                <th>Tabela</th>
                <th>Očekivane kolone (zaglavlje CSV-a)</th>
                <th>Fajl</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Lokacije</td>
                <td><code>naziv,adresa</code></td>
                <td>
                  <Form.Control
                    type="file"
                    accept=".csv"
                    size="sm"
                    disabled={uvozUToku}
                    onChange={(e) => e.target.files[0] && obradiUvoz(e.target.files[0], 'lokacije')}
                  />
                </td>
              </tr>
              <tr>
                <td>Selekcije</td>
                <td><code>naziv,cena_clanarine,lokacije</code> (lokacije odvojene sa ;)</td>
                <td>
                  <Form.Control
                    type="file"
                    accept=".csv"
                    size="sm"
                    disabled={uvozUToku}
                    onChange={(e) => e.target.files[0] && obradiUvoz(e.target.files[0], 'selekcije')}
                  />
                </td>
              </tr>
              <tr>
                <td>Igrači</td>
                <td><code>ime,prezime,datum_rodjenja,telefon_roditelja,ime_roditelja,kategorija_clanarine,datum_lekarskog,selekcija</code></td>
                <td>
                  <Form.Control
                    type="file"
                    accept=".csv"
                    size="sm"
                    disabled={uvozUToku}
                    onChange={(e) => e.target.files[0] && obradiUvoz(e.target.files[0], 'igraci')}
                  />
                </td>
              </tr>
              <tr>
                <td>Termini</td>
                <td><code>dan_u_nedelji,vreme_pocetka,vreme_zavrsetka,selekcija,trener_email,lokacija</code></td>
                <td>
                  <Form.Control
                    type="file"
                    accept=".csv"
                    size="sm"
                    disabled={uvozUToku}
                    onChange={(e) => e.target.files[0] && obradiUvoz(e.target.files[0], 'termini')}
                  />
                </td>
              </tr>
              <tr>
                <td>Treneri</td>
                <td><code>ime,prezime,email,lozinka,uloga,selekcije</code> (selekcije odvojene sa ;)</td>
                <td>
                  <Form.Control
                    type="file"
                    accept=".csv"
                    size="sm"
                    disabled={uvozUToku}
                    onChange={(e) => e.target.files[0] && obradiUvoz(e.target.files[0], 'treneri')}
                  />
                </td>
              </tr>
            </tbody>
          </Table>

          {uvozUToku && <Spinner animation="border" size="sm" className="mb-3" />}
        </>
      )}

      <hr className="mb-4" />

      {/* ========== ODRŽAVANJE - dugmad za brz unos svega ========== */}
      <h5 className="mb-2">Održavanje</h5>
      <ButtonGroup className="mb-4">
        <Button variant="outline-success" onClick={() => setOtvoreniModal('termin')}>
          + Novi termin
        </Button>
        <Button variant="outline-success" onClick={() => setOtvoreniModal('selekcija')}>
          + Nova selekcija
        </Button>
        <Button variant="outline-success" onClick={() => setOtvoreniModal('igrac')}>
          + Novi igrač
        </Button>
        <Button variant="outline-success" onClick={() => setOtvoreniModal('lokacija')}>
          + Nova lokacija
        </Button>
        <Button variant="outline-success" onClick={() => setOtvoreniModal('trener')}>
          + Novi trener
        </Button>
      </ButtonGroup>

      <hr className="mb-4" />

      <h5 className="mb-2">Upravljanje tabelama</h5>
      <ButtonGroup className="mb-3">
        <Button
          variant={otvorenaTabela === 'lokacije' ? 'primary' : 'outline-primary'}
          onClick={() => setOtvorenaTabela(otvorenaTabela === 'lokacije' ? null : 'lokacije')}
          // klik na VEĆ otvorenu tabelu je ZATVARA (toggle) - drugi klik na isto dugme vraća na null
        >
          Lokacije
        </Button>
        <Button
          variant={otvorenaTabela === 'selekcije' ? 'primary' : 'outline-primary'}
          onClick={() => setOtvorenaTabela(otvorenaTabela === 'selekcije' ? null : 'selekcije')}
        >
          Selekcije
        </Button>
        <Button
          variant={otvorenaTabela === 'igraci' ? 'primary' : 'outline-primary'}
          onClick={() => setOtvorenaTabela(otvorenaTabela === 'igraci' ? null : 'igraci')}
        >
          Svi igrači
        </Button>
        <Button
          variant={otvorenaTabela === 'treninzi' ? 'primary' : 'outline-primary'}
          onClick={() => setOtvorenaTabela(otvorenaTabela === 'treninzi' ? null : 'treninzi')}
        >
          Treninzi
        </Button>
        <Button
          variant={otvorenaTabela === 'treneri' ? 'primary' : 'outline-primary'}
          onClick={() => setOtvorenaTabela(otvorenaTabela === 'treneri' ? null : 'treneri')}
        >
          Treneri
        </Button>
      </ButtonGroup>

      {otvorenaTabela === 'lokacije' && <Lokacije />}
      {otvorenaTabela === 'selekcije' && <Selekcije />}
      {otvorenaTabela === 'igraci' && <Igraci />}
      {otvorenaTabela === 'treninzi' && <Treninzi />}
      {otvorenaTabela === 'treneri' && <Treneri />}
      {/* svaka od ovih komponenti je POTPUNO SAMOSTALNA - sama povlači svoje podatke,
          ima svoju tabelu i svoj Modal za dodavanje/izmenu, mi je samo "ubacujemo" ovde */}

      {otvorenaTabela && <hr className="mb-4" />}
      {/* razdvajamo prikazanu tabelu od ostatka Administracije ispod, samo kad je nešto otvoreno */}


      {/* ========== MODAL - Novi termin ========== */}
      <Modal show={otvoreniModal === 'termin'} onHide={() => setOtvoreniModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Novi termin</Modal.Title>
        </Modal.Header>
        <Form onSubmit={sacuvajTermin}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Dan u nedelji</Form.Label>
              <Form.Select
                value={formaTermin.dan_u_nedelji}
                onChange={(e) => setFormaTermin({ ...formaTermin, dan_u_nedelji: e.target.value })}
                required
              >
                {DANI.map((dan) => (
                  <option key={dan} value={dan}>{dan}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Vreme početka</Form.Label>
              <Form.Control
                type="time"
                value={formaTermin.vreme_pocetka}
                onChange={(e) => setFormaTermin({ ...formaTermin, vreme_pocetka: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Vreme završetka</Form.Label>
              <Form.Control
                type="time"
                value={formaTermin.vreme_zavrsetka}
                onChange={(e) => setFormaTermin({ ...formaTermin, vreme_zavrsetka: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Selekcija</Form.Label>
              <Form.Select
                value={formaTermin.selekcija_id}
                onChange={(e) => setFormaTermin({ ...formaTermin, selekcija_id: e.target.value })}
                required
              >
                <option value="">-- izaberi selekciju --</option>
                {selekcije.map((s) => (
                  <option key={s.id} value={s.id}>{s.naziv}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Trener</Form.Label>
              <Form.Select
                value={formaTermin.trener_id}
                onChange={(e) => setFormaTermin({ ...formaTermin, trener_id: e.target.value })}
                required
              >
                <option value="">-- izaberi trenera --</option>
                {treneri.map((t) => (
                  <option key={t.id} value={t.id}>{t.ime} {t.prezime}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Sala</Form.Label>
              <Form.Select
                value={formaTermin.lokacija_id}
                onChange={(e) => setFormaTermin({ ...formaTermin, lokacija_id: e.target.value })}
                required
              >
                <option value="">-- izaberi salu --</option>
                {lokacije.map((l) => (
                  <option key={l.id} value={l.id}>{l.naziv}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setOtvoreniModal(null)}>Otkaži</Button>
            <Button variant="primary" type="submit">Sačuvaj</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========== MODAL - Nova selekcija ========== */}
      <Modal show={otvoreniModal === 'selekcija'} onHide={() => setOtvoreniModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Nova selekcija</Modal.Title>
        </Modal.Header>
        <Form onSubmit={sacuvajSelekciju}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Naziv</Form.Label>
              <Form.Control
                value={formaSelekcija.naziv}
                onChange={(e) => setFormaSelekcija({ ...formaSelekcija, naziv: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Cena članarine (din, mesečno)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formaSelekcija.cena_clanarine}
                onChange={(e) => setFormaSelekcija({ ...formaSelekcija, cena_clanarine: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Lokacije (drži Ctrl/Cmd za više izbora)</Form.Label>
              <Form.Select
                multiple
                value={formaSelekcija.lokacija_ids}
                onChange={promeniIzborLokacijaSelekcija}
                style={{ height: '120px' }}
              >
                {lokacije.map((l) => (
                  <option key={l.id} value={l.id}>{l.naziv}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setOtvoreniModal(null)}>Otkaži</Button>
            <Button variant="primary" type="submit">Sačuvaj</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========== MODAL - Novi igrač ========== */}
      <Modal show={otvoreniModal === 'igrac'} onHide={() => setOtvoreniModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Novi igrač</Modal.Title>
        </Modal.Header>
        <Form onSubmit={sacuvajIgraca}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Ime</Form.Label>
              <Form.Control
                value={formaIgrac.ime}
                onChange={(e) => setFormaIgrac({ ...formaIgrac, ime: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Prezime</Form.Label>
              <Form.Control
                value={formaIgrac.prezime}
                onChange={(e) => setFormaIgrac({ ...formaIgrac, prezime: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Datum rođenja</Form.Label>
              <Form.Control
                type="date"
                value={formaIgrac.datum_rodjenja}
                onChange={(e) => setFormaIgrac({ ...formaIgrac, datum_rodjenja: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Ime roditelja</Form.Label>
              <Form.Control
                value={formaIgrac.ime_roditelja}
                onChange={(e) => setFormaIgrac({ ...formaIgrac, ime_roditelja: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Telefon roditelja</Form.Label>
              <Form.Control
                value={formaIgrac.telefon_roditelja}
                onChange={(e) => setFormaIgrac({ ...formaIgrac, telefon_roditelja: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Datum lekarskog pregleda</Form.Label>
              <Form.Control
                type="date"
                value={formaIgrac.datum_lekarskog}
                onChange={(e) => setFormaIgrac({ ...formaIgrac, datum_lekarskog: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Selekcija</Form.Label>
              <Form.Select
                value={formaIgrac.selekcija_id}
                onChange={(e) => setFormaIgrac({ ...formaIgrac, selekcija_id: e.target.value })}
                required
              >
                <option value="">-- izaberi selekciju --</option>
                {selekcije.map((s) => (
                  <option key={s.id} value={s.id}>{s.naziv}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setOtvoreniModal(null)}>Otkaži</Button>
            <Button variant="primary" type="submit">Sačuvaj</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========== MODAL - Nova lokacija ========== */}
      <Modal show={otvoreniModal === 'lokacija'} onHide={() => setOtvoreniModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Nova lokacija</Modal.Title>
        </Modal.Header>
        <Form onSubmit={sacuvajLokaciju}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Naziv</Form.Label>
              <Form.Control
                value={formaLokacija.naziv}
                onChange={(e) => setFormaLokacija({ ...formaLokacija, naziv: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Adresa</Form.Label>
              <Form.Control
                value={formaLokacija.adresa}
                onChange={(e) => setFormaLokacija({ ...formaLokacija, adresa: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setOtvoreniModal(null)}>Otkaži</Button>
            <Button variant="primary" type="submit">Sačuvaj</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========== MODAL - Novi trener ========== */}
      <Modal show={otvoreniModal === 'trener'} onHide={() => setOtvoreniModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Novi trener</Modal.Title>
        </Modal.Header>
        <Form onSubmit={sacuvajTrenera}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Ime</Form.Label>
              <Form.Control
                value={formaTrener.ime}
                onChange={(e) => setFormaTrener({ ...formaTrener, ime: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Prezime</Form.Label>
              <Form.Control
                value={formaTrener.prezime}
                onChange={(e) => setFormaTrener({ ...formaTrener, prezime: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={formaTrener.email}
                onChange={(e) => setFormaTrener({ ...formaTrener, email: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Lozinka</Form.Label>
              <Form.Control
                type="password"
                value={formaTrener.lozinka}
                onChange={(e) => setFormaTrener({ ...formaTrener, lozinka: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Uloga</Form.Label>
              <Form.Select
                value={formaTrener.uloga}
                onChange={(e) => setFormaTrener({ ...formaTrener, uloga: e.target.value })}
              >
                <option value="trener">trener</option>
                <option value="admin">admin</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Selekcije (drži Ctrl/Cmd za više izbora)</Form.Label>
              <Form.Select
                multiple
                value={formaTrener.selekcija_ids}
                onChange={promeniIzborSelekcijaTrener}
                style={{ height: '120px' }}
              >
                {selekcije.map((s) => (
                  <option key={s.id} value={s.id}>{s.naziv}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setOtvoreniModal(null)}>Otkaži</Button>
            <Button variant="primary" type="submit">Sačuvaj</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========== PREGLED PO SELEKCIJI ========== */}

      <Form.Group className="mb-4" style={{ maxWidth: '350px' }}>
        <Form.Label>Izaberi selekciju</Form.Label>
        <Form.Select value={selekcijaId} onChange={(e) => setSelekcijaId(e.target.value)}>
          <option value="">-- izaberi selekciju --</option>
          {selekcije.map((s) => (
            <option key={s.id} value={s.id}>{s.naziv}</option>
          ))}
        </Form.Select>
      </Form.Group>

      {!selekcijaId && (
        <Alert variant="info">Izaberi selekciju da vidiš igrače, dugovanja i lekarske preglede.</Alert>
      )}

      {selekcijaId && (
        <>
          <ButtonGroup className="mb-3">
            <Button
              variant={aktivnaSekcija === 'igraci' ? 'primary' : 'outline-primary'}
              onClick={() => setAktivnaSekcija('igraci')}
            >
              Igrači
            </Button>
            <Button
              variant={aktivnaSekcija === 'clanarine' ? 'primary' : 'outline-primary'}
              onClick={() => setAktivnaSekcija('clanarine')}
            >
              Neplaćene članarine
            </Button>
            <Button
              variant={aktivnaSekcija === 'lekarski' ? 'primary' : 'outline-primary'}
              onClick={() => setAktivnaSekcija('lekarski')}
            >
              Lekarski pri isteku
            </Button>
          </ButtonGroup>

          {aktivnaSekcija === 'igraci' && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Igrači selekcije</h5>
                <Button size="sm" variant="outline-secondary" onClick={izvezIgrace} disabled={igraci.length === 0}>
                  Izvezi u Excel
                </Button>
              </div>

              {igraci.length === 0 ? (
                <p className="text-muted">Ova selekcija nema unetih igrača.</p>
              ) : (
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Ime</th>
                      <th>Prezime</th>
                      <th>Datum rođenja</th>
                      <th>Telefon roditelja</th>
                      <th>Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {igraci.map((i) => (
                      <tr key={i.id}>
                        <td>{i.ime}</td>
                        <td>{i.prezime}</td>
                        <td>{i.datum_rodjenja}</td>
                        <td>{i.telefon_roditelja}</td>
                        <td>
                          <Button size="sm" variant="outline-danger" onClick={() => obrisiIgraca(i.id)}>
                            Obriši
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}

          {aktivnaSekcija === 'clanarine' && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Ukupan dug po igraču (do danas, sezona avg-jun)</h5>
                <Button size="sm" variant="outline-secondary" onClick={izvezDugovanja} disabled={dugovanja.length === 0}>
                  Izvezi u Excel
                </Button>
              </div>

              {dugovanja.length === 0 ? (
                <p className="text-muted">Nema dugovanja - sve je plaćeno.</p>
              ) : (
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Igrač</th>
                      <th>Broj neplaćenih meseci</th>
                      <th>Ukupno duguje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dugovanja.map((d) => (
                      <tr key={d.id}>
                        <td>{d.igrac_ime}</td>
                        <td>{d.broj_meseci}</td>
                        <td>{d.ukupno !== null ? `${d.ukupno} din` : 'cena nije definisana'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}

          {aktivnaSekcija === 'lekarski' && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Lekarski pregledi pri isteku</h5>
                <Button size="sm" variant="outline-secondary" onClick={izvezPreglede} disabled={pregledi.length === 0}>
                  Izvezi u Excel
                </Button>
              </div>

              {pregledi.length === 0 ? (
                <p className="text-muted">Nema pregleda koji ističu u narednih 10 dana.</p>
              ) : (
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Igrač</th>
                      <th>Datum isteka</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pregledi.map((p) => (
                      <tr key={p.id} className={p.istekao ? 'table-danger' : ''}>
                        <td>{p.igrac_ime}</td>
                        <td>{p.datum_isteka}</td>
                        <td>{p.istekao ? 'Istekao' : 'Ističe uskoro'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </>
      )}

      <hr className="mb-4" />

      {/* ========== IZVEŠTAJI - koristimo istu komponentu kao trener na svojoj stranici ========== */}
      <h5 className="mb-2">Izveštaji</h5>
      <IzvestajiSekcija />
    </Container>
  );
}

export default Administracija;