// src/components/IzvestajiSekcija.js
// Odeljak sa izveštajima za CEO klub - koristi ga i Administracija (za admina)
// i posebna stranica Izveštaji (za trenere) - ista logika, samo drugačiji "omotač" oko nje

import { useEffect, useState } from 'react';
import { Table, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { apiFetch } from '../api';

function preuzmiCSV(nazivFajla, redovi, kolone) {
  // pomoćna funkcija - pravi CSV tekst od podataka i pokreće preuzimanje u browseru
  const zaglavlje = kolone.map((k) => k.naslov).join(',');

  const linije = redovi.map((red) =>
    kolone.map((k) => `"${(red[k.kljuc] ?? '').toString().replace(/"/g, '""')}"`).join(',')
  );

  const csvSadrzaj = [zaglavlje, ...linije].join('\n');

  const blob = new Blob(['\uFEFF' + csvSadrzaj], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = nazivFajla;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function IzvestajiSekcija() {
  const [sviTreninzi, setSviTreninzi] = useState([]);
  const [sveClanarine, setSveClanarine] = useState([]);

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [tipIzvestaja, setTipIzvestaja] = useState('mesecni');
  // 'mesecni' ili 'godisnji'

  const [izvestajMesec, setIzvestajMesec] = useState(new Date().getMonth() + 1);
  const [izvestajGodina, setIzvestajGodina] = useState(new Date().getFullYear());

  useEffect(() => {
    async function ucitaj() {
      try {
        const [treninziData, clanarineData, igraciData] = await Promise.all([
          apiFetch('/api/treninzi'),
          apiFetch('/api/clanarine'),
          apiFetch('/api/igraci')
          // NOVO - trebaju nam igrači da znamo kojoj selekciji pripada svaka članarina
          // (tabela Clanarina sama po sebi nema selekcija_id, samo igrac_id)
        ]);

        const jeAdmin = localStorage.getItem('uloga') === 'admin';

        if (jeAdmin) {
          // admin vidi izveštaje za CEO klub - bez filtriranja
          setSviTreninzi(treninziData);
          setSveClanarine(clanarineData);
        } else {
          // NOVO - trener vidi izveštaje SAMO za svoje selekcije
          const sopstveneIds = JSON.parse(localStorage.getItem('selekcije') || '[]').map((s) => s.id);

          setSviTreninzi(treninziData.filter((t) => sopstveneIds.includes(t.selekcija_id)));

          const igracIdSelekcijaMapa = {};
          // pravimo "mapu" igrac_id -> selekcija_id, da po njoj filtriramo članarine
          igraciData.forEach((i) => {
            igracIdSelekcijaMapa[i.id] = i.selekcija_id;
          });

          setSveClanarine(
            clanarineData.filter((c) => sopstveneIds.includes(igracIdSelekcijaMapa[c.igrac_id]))
          );
        }

      } catch (err) {
        setGreska(err.message);
      } finally {
        setUcitavanje(false);
      }
    }
    ucitaj();
  }, []);

  function trenaziUPeriodu() {
    return sviTreninzi.filter((t) => {
      if (!t.realizovan) return false;
      const [godinaTreninga, mesecTreninga] = t.datum.split('-').map(Number);
      if (tipIzvestaja === 'godisnji') {
        return godinaTreninga === parseInt(izvestajGodina);
      }
      return godinaTreninga === parseInt(izvestajGodina) && mesecTreninga === parseInt(izvestajMesec);
    });
  }

  function treninziPoTreneru() {
    const treninziFiltrirani = trenaziUPeriodu();
    const grupisano = {};
    treninziFiltrirani.forEach((t) => {
      const kljuc = `${t.trener_id}-${t.selekcija_id}`;
      if (!grupisano[kljuc]) {
        grupisano[kljuc] = {
          trener_ime: t.trener_ime,
          selekcija_naziv: t.selekcija_naziv,
          trener_id: t.trener_id,
          broj: 0
        };
      }
      grupisano[kljuc].broj += 1;
    });
    return Object.values(grupisano);
  }

  function ukupnoPoTreneru() {
    const detaljno = treninziPoTreneru();
    const grupisano = {};
    detaljno.forEach((red) => {
      if (!grupisano[red.trener_id]) {
        grupisano[red.trener_id] = { trener_ime: red.trener_ime, ukupno: 0 };
      }
      grupisano[red.trener_id].ukupno += red.broj;
    });
    return Object.values(grupisano);
  }

  function statistikaClanarina() {
    const filtrirano = sveClanarine.filter((c) => {
      if (tipIzvestaja === 'godisnji') {
        return c.godina === parseInt(izvestajGodina);
      }
      return c.godina === parseInt(izvestajGodina) && c.mesec === parseInt(izvestajMesec);
    });
    const placene = filtrirano.filter((c) => c.placeno);
    const neplacene = filtrirano.filter((c) => !c.placeno);
    const ukupnoPrikupljeno = placene.reduce((zbir, c) => zbir + parseFloat(c.iznos), 0);
    return { brojPlacenih: placene.length, brojNeplacenih: neplacene.length, ukupnoPrikupljeno };
  }

  function satiPoSali() {
    const treninziFiltrirani = trenaziUPeriodu();
    const grupisano = {};
    treninziFiltrirani.forEach((t) => {
      const [satPocetak, minutPocetak] = t.vreme_pocetka.split(':').map(Number);
      const [satKraj, minutKraj] = t.vreme_zavrsetka.split(':').map(Number);
      const minutaPocetak = satPocetak * 60 + minutPocetak;
      const minutaKraj = satKraj * 60 + minutKraj;
      const trajanjeSati = (minutaKraj - minutaPocetak) / 60;
      if (!grupisano[t.lokacija_id]) {
        grupisano[t.lokacija_id] = { lokacija_naziv: t.lokacija_naziv, sati: 0 };
      }
      grupisano[t.lokacija_id].sati += trajanjeSati;
    });
    return Object.values(grupisano);
  }

  function nazivPerioda() {
    return tipIzvestaja === 'godisnji' ? `${izvestajGodina}` : `${izvestajMesec}-${izvestajGodina}`;
  }

  function izvezTreninziPoTreneru() {
    preuzmiCSV(
      `izvestaj-treninzi-${nazivPerioda()}.csv`,
      treninziPoTreneru(),
      [
        { kljuc: 'trener_ime', naslov: 'Trener' },
        { kljuc: 'selekcija_naziv', naslov: 'Selekcija' },
        { kljuc: 'broj', naslov: 'Broj treninga' }
      ]
    );
  }

  function izvezClanarine() {
    const stat = statistikaClanarina();
    preuzmiCSV(
      `izvestaj-clanarine-${nazivPerioda()}.csv`,
      [{ placeno: stat.brojPlacenih, neplaceno: stat.brojNeplacenih, ukupno: stat.ukupnoPrikupljeno }],
      [
        { kljuc: 'placeno', naslov: 'Broj plaćenih' },
        { kljuc: 'neplaceno', naslov: 'Broj neplaćenih' },
        { kljuc: 'ukupno', naslov: 'Ukupno prikupljeno (din)' }
      ]
    );
  }

  function izvezSate() {
    preuzmiCSV(
      `izvestaj-sati-${nazivPerioda()}.csv`,
      satiPoSali(),
      [
        { kljuc: 'lokacija_naziv', naslov: 'Lokacija' },
        { kljuc: 'sati', naslov: 'Broj sati' }
      ]
    );
  }

  function izvezSveZajedno() {
    // NOVO - spaja SVA TRI izveštaja u JEDAN CSV fajl, sekcija po sekcija
    // (CSV nema "listove" kao pravi Excel fajl, pa sekcije razdvajamo praznim redom i naslovom)
    const redoviTreninga = treninziPoTreneru();
    const redoviUkupno = ukupnoPoTreneru();
    const stat = statistikaClanarina();
    const redoviSati = satiPoSali();

    const linije = [];

    linije.push('IZVEŠTAJ - ' + nazivPerioda());
    linije.push('');

    linije.push('TRENINZI PO TRENERU');
    linije.push('Trener,Selekcija,Broj treninga');
    redoviTreninga.forEach((r) => {
      linije.push(`"${r.trener_ime}","${r.selekcija_naziv}",${r.broj}`);
    });
    linije.push('');

    linije.push('UKUPNO PO TRENERU');
    linije.push('Trener,Ukupno treninga');
    redoviUkupno.forEach((r) => {
      linije.push(`"${r.trener_ime}",${r.ukupno}`);
    });
    linije.push('');

    linije.push('ČLANARINE');
    linije.push('Broj plaćenih,Broj neplaćenih,Ukupno prikupljeno (din)');
    linije.push(`${stat.brojPlacenih},${stat.brojNeplacenih},${stat.ukupnoPrikupljeno}`);
    linije.push('');

    linije.push('SATI PO SALI');
    linije.push('Lokacija,Broj sati');
    redoviSati.forEach((r) => {
      linije.push(`"${r.lokacija_naziv}",${r.sati}`);
    });

    const csvSadrzaj = linije.join('\n');
    const blob = new Blob(['\uFEFF' + csvSadrzaj], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `izvestaj-kompletan-${nazivPerioda()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (ucitavanje) {
    return <Spinner animation="border" />;
  }

  return (
    <div>
      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <div className="d-flex justify-content-between align-items-end mb-3 flex-wrap gap-3">
        <div className="d-flex gap-3 align-items-end flex-wrap">
          <Form.Group>
            <Form.Label>Tip izveštaja</Form.Label>
            <Form.Select value={tipIzvestaja} onChange={(e) => setTipIzvestaja(e.target.value)}>
              <option value="mesecni">Mesečni</option>
              <option value="godisnji">Godišnji</option>
            </Form.Select>
          </Form.Group>

          {tipIzvestaja === 'mesecni' && (
            <Form.Group>
              <Form.Label>Mesec</Form.Label>
              <Form.Select value={izvestajMesec} onChange={(e) => setIzvestajMesec(e.target.value)}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          <Form.Group>
            <Form.Label>Godina</Form.Label>
            <Form.Control
              type="number"
              style={{ width: '110px' }}
              value={izvestajGodina}
              onChange={(e) => setIzvestajGodina(e.target.value)}
            />
          </Form.Group>
        </div>

        <Button variant="success" onClick={izvezSveZajedno}>
          Izvezi ceo izveštaj (spojeno)
        </Button>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Treninzi po treneru (samo realizovani)</h6>
        <Button size="sm" variant="outline-secondary" onClick={izvezTreninziPoTreneru} disabled={treninziPoTreneru().length === 0}>
          Izvezi u Excel
        </Button>
      </div>

      {treninziPoTreneru().length === 0 ? (
        <p className="text-muted">Nema realizovanih treninga u izabranom periodu.</p>
      ) : (
        <Table striped bordered hover responsive size="sm" className="mb-3">
          <thead>
            <tr>
              <th>Trener</th>
              <th>Selekcija</th>
              <th>Broj treninga</th>
            </tr>
          </thead>
          <tbody>
            {treninziPoTreneru().map((red, i) => (
              <tr key={i}>
                <td>{red.trener_ime}</td>
                <td>{red.selekcija_naziv}</td>
                <td>{red.broj}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {ukupnoPoTreneru().map((red, i) => (
              <tr key={i} className="fw-bold table-secondary">
                <td colSpan={2}>Ukupno - {red.trener_ime}</td>
                <td>{red.ukupno}</td>
              </tr>
            ))}
          </tfoot>
        </Table>
      )}

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Članarine</h6>
        <Button size="sm" variant="outline-secondary" onClick={izvezClanarine}>
          Izvezi u Excel
        </Button>
      </div>

      <Table bordered size="sm" className="mb-3" style={{ maxWidth: '500px' }}>
        <tbody>
          <tr>
            <td>Broj plaćenih članarina</td>
            <td className="fw-bold">{statistikaClanarina().brojPlacenih}</td>
          </tr>
          <tr>
            <td>Broj neplaćenih članarina</td>
            <td className="fw-bold">{statistikaClanarina().brojNeplacenih}</td>
          </tr>
          <tr>
            <td>Ukupno prikupljeno</td>
            <td className="fw-bold">{statistikaClanarina().ukupnoPrikupljeno} din</td>
          </tr>
        </tbody>
      </Table>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Sati treninga po sali</h6>
        <Button size="sm" variant="outline-secondary" onClick={izvezSate} disabled={satiPoSali().length === 0}>
          Izvezi u Excel
        </Button>
      </div>

      {satiPoSali().length === 0 ? (
        <p className="text-muted">Nema realizovanih treninga u izabranom periodu.</p>
      ) : (
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th>Lokacija</th>
              <th>Broj sati</th>
            </tr>
          </thead>
          <tbody>
            {satiPoSali().map((red, i) => (
              <tr key={i}>
                <td>{red.lokacija_naziv}</td>
                <td>{red.sati}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export default IzvestajiSekcija;
