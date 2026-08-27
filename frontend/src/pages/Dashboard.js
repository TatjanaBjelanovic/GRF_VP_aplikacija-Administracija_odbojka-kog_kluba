// src/pages/Dashboard.js
// Početna stranica posle logina - raspored narednih 10 dana (treninzi + utakmice),
// unos prisustva, i (za admina) lista treninga kojima treba zamena trenera

import { useEffect, useState } from 'react';
import { Container, Card, Spinner, Alert, Form, Button, Modal, ListGroup, Badge, Row, Col } from 'react-bootstrap';
import { apiFetch } from '../api';

const DANI_U_NEDELJI = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
// indeks 0 = Nedelja, isto kao JS Date.getDay()

function danasnjiDatum() {
  // vraća današnji datum kao tekst "2026-08-22" - GRADIMO ga ručno (ne .toISOString())
  // da izbegnemo pomeranje datuma zbog vremenske zone
  return formatirajDatum(new Date());
}

function formatirajDatum(datumObjekat) {
  const godina = datumObjekat.getFullYear();
  const mesec = String(datumObjekat.getMonth() + 1).padStart(2, '0');
  const dan = String(datumObjekat.getDate()).padStart(2, '0');
  return `${godina}-${mesec}-${dan}`;
}

function narednih10Dana() {
  // vraća niz { datum: "2026-08-22", danNaziv: "Subota" } za DANAS + narednih 9 dana (ukupno 10)
  const niz = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    niz.push({ datum: formatirajDatum(d), danNaziv: DANI_U_NEDELJI[d.getDay()] });
  }
  return niz;
}

function Dashboard() {
  const [sviTreninzi, setSviTreninzi] = useState([]);
  const [sveUtakmice, setSveUtakmice] = useState([]);
  const [sviTermini, setSviTermini] = useState([]);
  const [treneri, setTreneri] = useState([]);
  // treneri nam trebaju samo adminu, za dodelu zamene

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [sveSelekcije, setSveSelekcije] = useState([]);
  const [selekcijaId, setSelekcijaId] = useState('');

  const [prikaziPrisustvo, setPrikaziPrisustvo] = useState(false);
  const [aktivniTrening, setAktivniTrening] = useState(null);
  const [igraciZaPrisustvo, setIgraciZaPrisustvo] = useState([]);
  const [zapisiPrisustva, setZapisiPrisustva] = useState([]);
  const [ucitavanjePrisustva, setUcitavanjePrisustva] = useState(false);

  const [izborZamene, setIzborZamene] = useState({});
  // objekat { trening_id: izabrani_trener_id } - pamti izbor u padajućem meniju za svaki "problem" posebno

  const jeAdmin = localStorage.getItem('uloga') === 'admin';
  const sopstveniId = parseInt(localStorage.getItem('trenerId'));
  const sopstveneSelekcijeIds = (JSON.parse(localStorage.getItem('selekcije') || '[]')).map((s) => s.id);
  // ID-jevi selekcija koje OVAJ korisnik vodi - koristimo da filtriramo utakmice koje ga se tiču

  async function ucitajSve() {
    try {
      const [treninziData, utakmiceData, terminiData] = await Promise.all([
        apiFetch('/api/treninzi'),
        apiFetch('/api/utakmice'),
        apiFetch('/api/termini')
      ]);
      setSviTreninzi(treninziData);
      setSveUtakmice(utakmiceData);
      setSviTermini(terminiData);

      if (jeAdmin) {
        const [selData, trenData] = await Promise.all([
          apiFetch('/api/selekcije'),
          apiFetch('/api/treneri')
        ]);
        setSveSelekcije(selData);
        setTreneri(trenData);
      } else {
        const sopstvene = JSON.parse(localStorage.getItem('selekcije') || '[]');
        setSveSelekcije(sopstvene);
      }

    } catch (err) {
      setGreska(err.message);
    } finally {
      setUcitavanje(false);
    }
  }

  useEffect(() => {
    ucitajSve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sastaviRaspored() {
    // pravi JEDNU hronološku listu - kombinuje STVARNE treninge, VIRTUELNE termine (koji još ne postoje
    // kao Trening red) i utakmice, za narednih 10 dana, filtrirano na SOPSTVENE stvari korisnika

    const dani = narednih10Dana();
    const stavke = [];

    dani.forEach(({ datum, danNaziv }) => {
      // 1. STVARNI treninzi - gde je OVAJ korisnik trener, na taj datum
      const stvarniZaDan = sviTreninzi.filter(
        (t) => t.trener_id === sopstveniId && t.datum === datum
      );
      stvarniZaDan.forEach((t) => {
        stavke.push({ tip: 'trening', stvaran: true, ...t, vremeZaSort: t.vreme_pocetka });
      });

      // 2. VIRTUELNI termini - Termin šablon za OVAJ dan u nedelji, gde je korisnik trener,
      //    ali SAMO ako za taj datum+selekciju JOŠ NE postoji stvaran Trening (da ne duplira)
      const terminiZaDan = sviTermini.filter(
        (t) => t.trener_id === sopstveniId && t.dan_u_nedelji === danNaziv
      );
      terminiZaDan.forEach((termin) => {
        const vecPostoji = stvarniZaDan.some((t) => t.selekcija_id === termin.selekcija_id);
        if (!vecPostoji) {
          stavke.push({
            tip: 'trening',
            stvaran: false,
            // stvaran: false znači da OVO JOŠ NIJE pravi red u bazi - materijalizuje se na klik
            termin_id: termin.id,
            datum,
            vreme_pocetka: termin.vreme_pocetka,
            vreme_zavrsetka: termin.vreme_zavrsetka,
            selekcija_id: termin.selekcija_id,
            selekcija_naziv: termin.selekcija_naziv,
            trener_id: termin.trener_id,
            trener_ime: termin.trener_ime,
            lokacija_id: termin.lokacija_id,
            lokacija_naziv: termin.lokacija_naziv,
            realizovan: false,
            potrebna_zamena: false,
            vremeZaSort: termin.vreme_pocetka
          });
        }
      });

      // 3. Utakmice selekcija koje korisnik vodi, na taj datum
      const utakmiceZaDan = sveUtakmice.filter(
        (u) => sopstveneSelekcijeIds.includes(u.selekcija_id) && u.datum === datum
      );
      utakmiceZaDan.forEach((u) => {
        stavke.push({ tip: 'utakmica', datum, ...u, vremeZaSort: u.vreme });
      });
    });

    // sortiramo SVE stavke hronološki - prvo po datumu, pa po vremenu unutar istog dana
    stavke.sort((a, b) => {
      if (a.datum !== b.datum) return a.datum.localeCompare(b.datum);
      return a.vremeZaSort.localeCompare(b.vremeZaSort);
    });

    return stavke;
  }

  function problemiZaAdmina() {
    // SAMO za admina - stvarni treninzi kojima treba zamena, unutar narednih 10 dana
    const dani = narednih10Dana().map((d) => d.datum);
    return sviTreninzi.filter((t) => t.potrebna_zamena && dani.includes(t.datum));
  }

  async function neMoguDaDrzim(stavka) {
    // klik na dugme "Ne mogu da držim" - radi za STVARAN i VIRTUELAN trening

    try {
      if (stavka.stvaran) {
        // već postoji u bazi - samo ga označavamo
        await apiFetch(`/api/treninzi/${stavka.id}`, {
          method: 'PUT',
          body: JSON.stringify({ potrebna_zamena: true })
        });
      } else {
        // NE postoji još - prvo ga pravimo (materijalizujemo iz Termina), pa ga označavamo
        const noviTrening = await apiFetch('/api/treninzi', {
          method: 'POST',
          body: JSON.stringify({
            datum: stavka.datum,
            vreme_pocetka: stavka.vreme_pocetka,
            vreme_zavrsetka: stavka.vreme_zavrsetka,
            selekcija_id: stavka.selekcija_id,
            trener_id: stavka.trener_id,
            lokacija_id: stavka.lokacija_id
          })
        });

        await apiFetch(`/api/treninzi/${noviTrening.id}`, {
          method: 'PUT',
          body: JSON.stringify({ potrebna_zamena: true })
        });
      }

      await ucitajSve();
      // ponovo učitavamo SVE da lista prikaže ažurirano stanje

    } catch (err) {
      setGreska(err.message);
    }
  }

  function vremenaSePreklapaju(pocetak1, kraj1, pocetak2, kraj2) {
    // proverava da li se dva vremenska intervala PREKLAPAJU
    // (npr. 18:00-19:00 i 18:30-19:30 se preklapaju, ali 18:00-19:00 i 19:00-20:00 NE preklapaju)
    return pocetak1 < kraj2 && pocetak2 < kraj1;
    // tekst poređenje radi ispravno za format "HH:MM" jer su brojevi uvek dve cifre
  }

  function trenerJeZauzet(trenerId, datum, vremePocetka, vremeZavrsetka, iskljuciTreningId) {
    // proverava da li OVAJ trener već ima NEKI DRUGI trening istog datuma, u vreme koje se preklapa
    return sviTreninzi.some((t) =>
      t.trener_id === trenerId &&
      t.datum === datum &&
      t.id !== iskljuciTreningId &&
      // iskljuciTreningId - ne poredimo trening sa samim sobom
      vremenaSePreklapaju(vremePocetka, vremeZavrsetka, t.vreme_pocetka, t.vreme_zavrsetka)
    );
  }

  async function dodeliZamenu(treningId) {
    // admin dodeljuje NOVOG trenera za konkretan trening (rešava problem)

    const noviTrenerId = izborZamene[treningId];
    if (!noviTrenerId) {
      setGreska('Prvo izaberi trenera iz padajućeg menija.');
      return;
    }

    try {
      await apiFetch(`/api/treninzi/${treningId}`, {
        method: 'PUT',
        body: JSON.stringify({ trener_id: parseInt(noviTrenerId) })
        // backend automatski skida potrebna_zamena kad se trener_id eksplicitno pošalje
      });
      await ucitajSve();
    } catch (err) {
      setGreska(err.message);
    }
  }

  async function unesiPrisustva() {
    // ista logika kao ranije - nalazi ili pravi trening za DANAS pa otvara formu za prisustvo

    if (!selekcijaId) {
      setGreska('Prvo izaberi selekciju.');
      return;
    }

    setUcitavanjePrisustva(true);
    setGreska('');

    try {
      const danas = danasnjiDatum();

      let trening = sviTreninzi.find(
        (t) => t.selekcija_id === parseInt(selekcijaId) && t.datum === danas
      );

      if (!trening) {
        const dananjiDan = DANI_U_NEDELJI[new Date().getDay()];
        const termin = sviTermini.find(
          (t) => t.selekcija_id === parseInt(selekcijaId) && t.dan_u_nedelji === dananjiDan
        );

        if (!termin) {
          setGreska(`Nema zakazanog termina za ovu selekciju danas (${dananjiDan}).`);
          setUcitavanjePrisustva(false);
          return;
        }

        trening = await apiFetch('/api/treninzi', {
          method: 'POST',
          body: JSON.stringify({
            datum: danas,
            vreme_pocetka: termin.vreme_pocetka,
            vreme_zavrsetka: termin.vreme_zavrsetka,
            selekcija_id: termin.selekcija_id,
            trener_id: termin.trener_id,
            lokacija_id: termin.lokacija_id
          })
        });
      }

      if (!trening.realizovan) {
        // NOVO - unos prisustva znači da se trening ODRŽAO, pa ga automatski označavamo
        trening = await apiFetch(`/api/treninzi/${trening.id}`, {
          method: 'PUT',
          body: JSON.stringify({ realizovan: true })
        });
        // ovo je bitno i za Administraciju - "Treninzi po treneru" u Izveštajima broji SAMO realizovane
      }

      setAktivniTrening(trening);

      const [sviIgraci, zapisi] = await Promise.all([
        apiFetch('/api/igraci'),
        apiFetch(`/api/treninzi/${trening.id}/prisustvo`)
      ]);

      const igraciSelekcije = sviIgraci.filter((i) => i.selekcija_id === parseInt(selekcijaId));

      setIgraciZaPrisustvo(igraciSelekcije);
      setZapisiPrisustva(zapisi);
      setPrikaziPrisustvo(true);

      await ucitajSve();
      // osvežavamo i glavnu listu (sviTreninzi) da Raspored odmah pokaže trening kao realizovan

    } catch (err) {
      setGreska(err.message);
    } finally {
      setUcitavanjePrisustva(false);
    }
  }

  function pronadjiZapis(igracId) {
    return zapisiPrisustva.find((z) => z.igrac_id === igracId);
  }

  async function promeniPrisustvo(igracId, prisutan) {
    const postojeciZapis = pronadjiZapis(igracId);

    try {
      if (postojeciZapis) {
        await apiFetch(`/api/prisustvo/${postojeciZapis.id}`, {
          method: 'PUT',
          body: JSON.stringify({ prisutan })
        });
      } else {
        await apiFetch(`/api/treninzi/${aktivniTrening.id}/prisustvo`, {
          method: 'POST',
          body: JSON.stringify({ igrac_id: igracId, prisutan })
        });
      }

      const noviZapisi = await apiFetch(`/api/treninzi/${aktivniTrening.id}/prisustvo`);
      setZapisiPrisustva(noviZapisi);

    } catch (err) {
      setGreska(err.message);
    }
  }

  if (ucitavanje) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  const raspored = sastaviRaspored();
  const problemi = jeAdmin ? problemiZaAdmina() : [];

  return (
    <Container>
      <h2 className="mb-4">Početna</h2>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      {/* --- Lista problema (SAMO admin) --- */}
      {jeAdmin && problemi.length > 0 && (
        <Card className="mb-4 border-danger">
          <Card.Header className="bg-danger text-white">
            Treninzi kojima treba zamena trenera
          </Card.Header>
          <Card.Body>
            {problemi.map((t) => (
              <Row key={t.id} className="align-items-center mb-2 pb-2 border-bottom">
                <Col md={5}>
                  <strong>{t.datum}</strong> {t.vreme_pocetka}-{t.vreme_zavrsetka} — {t.selekcija_naziv}
                  <div className="text-muted small">Trenutni trener: {t.trener_ime}</div>
                </Col>
                <Col md={4}>
                  <Form.Select
                    size="sm"
                    value={izborZamene[t.id] || ''}
                    onChange={(e) => setIzborZamene({ ...izborZamene, [t.id]: e.target.value })}
                  >
                    <option value="">-- izaberi zamenu --</option>
                    {treneri
                      .filter((tr) => tr.id !== t.trener_id)
                      // isključujemo trenutnog trenera (on je već rekao da ne može)
                      .filter((tr) => !trenerJeZauzet(tr.id, t.datum, t.vreme_pocetka, t.vreme_zavrsetka, t.id))
                      // NOVO - isključujemo trenere koji U ISTO VREME već imaju drugi trening
                      .map((tr) => (
                      <option key={tr.id} value={tr.id}>{tr.ime} {tr.prezime}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Button size="sm" variant="success" onClick={() => dodeliZamenu(t.id)}>
                    Dodeli
                  </Button>
                </Col>
              </Row>
            ))}
          </Card.Body>
        </Card>
      )}

      {/* --- Unos prisustva --- */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Unos prisustva</Card.Title>

          {sveSelekcije.length === 0 ? (
            <p className="text-muted mb-0">
              {jeAdmin ? 'Nema unetih selekcija.' : 'Ne vodiš nijednu selekciju.'}
            </p>
          ) : (
            <div className="d-flex gap-2 align-items-end flex-wrap">
              <Form.Group style={{ minWidth: '250px' }}>
                <Form.Label>Selekcija</Form.Label>
                <Form.Select value={selekcijaId} onChange={(e) => setSelekcijaId(e.target.value)}>
                  <option value="">-- izaberi selekciju --</option>
                  {sveSelekcije.map((s) => (
                    <option key={s.id} value={s.id}>{s.naziv}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Button variant="success" onClick={unesiPrisustva} disabled={ucitavanjePrisustva}>
                {ucitavanjePrisustva ? 'Učitavanje...' : 'Unesi prisustva'}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* --- Raspored narednih 10 dana --- */}
      <Card className="mb-4">
        <Card.Header>
          <strong>Raspored - narednih 10 dana</strong>
        </Card.Header>
        <Card.Body>
          {raspored.length === 0 ? (
            <p className="text-muted mb-0">Nema treninga ni utakmica u narednih 10 dana.</p>
          ) : (
            <ListGroup variant="flush">
              {raspored.map((stavka, i) => (
                <ListGroup.Item key={i}>
                  {stavka.tip === 'trening' ? (
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <div>
                        <Badge bg="info" className="me-2">Trening</Badge>
                        <strong>{stavka.datum}</strong> {stavka.vreme_pocetka}-{stavka.vreme_zavrsetka} — {stavka.selekcija_naziv} ({stavka.lokacija_naziv})
                        {!stavka.stvaran && <Badge bg="secondary" className="ms-2">iz rasporeda</Badge>}
                        {stavka.potrebna_zamena && <Badge bg="danger" className="ms-2">čeka zamenu</Badge>}
                      </div>
                      {!stavka.potrebna_zamena && (
                        <Button size="sm" variant="outline-danger" onClick={() => neMoguDaDrzim(stavka)}>
                          Ne mogu da držim
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Badge bg="warning" text="dark" className="me-2">Utakmica</Badge>
                      <strong>{stavka.datum}</strong> {stavka.vreme} — protiv {stavka.protivnik}
                      {' '}
                      <Badge bg={stavka.domacin ? 'success' : 'secondary'}>
                        {stavka.domacin ? 'Domaćin' : 'Gost'}
                      </Badge>
                      {stavka.mesto_odrzavanja && <span className="text-muted"> ({stavka.mesto_odrzavanja})</span>}
                    </div>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      {/* --- Modal za evidenciju prisustva --- */}
      <Modal show={prikaziPrisustvo} onHide={() => setPrikaziPrisustvo(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Prisustvo - {aktivniTrening?.datum} ({aktivniTrening?.selekcija_naziv})
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {igraciZaPrisustvo.length === 0 && (
            <Alert variant="info">Selekcija nema unetih igrača.</Alert>
          )}

          <ListGroup>
            {igraciZaPrisustvo.map((igrac) => {
              const zapis = pronadjiZapis(igrac.id);

              return (
                <ListGroup.Item key={igrac.id} className="d-flex justify-content-between align-items-center">
                  {igrac.ime} {igrac.prezime}
                  <Form.Check
                    type="checkbox"
                    checked={zapis ? zapis.prisutan : false}
                    onChange={(e) => promeniPrisustvo(igrac.id, e.target.checked)}
                  />
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPrikaziPrisustvo(false)}>Zatvori</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Dashboard;
