// src/pages/Clanarine.js
// Unos članarine - bira se selekcija, pa se prikazuju SAMO igrači koji imaju dug,
// klik na ime otvara prozor sa iznosom duga i mogućnošću da se plati

import { useEffect, useState } from 'react';
import { Container, ListGroup, Form, Alert, Spinner, Modal, Button, Badge } from 'react-bootstrap';
import { apiFetch } from '../api';

// Popust po kategoriji članarine - množimo cenu selekcije ovim brojem da dobijemo pravu cenu
const POPUST_PO_KATEGORIJI = {
  regularna: 1,      // bez popusta
  popust10: 0.9,      // 10% jeftinije
  popust20: 0.8,      // 20% jeftinije
  popust30: 0.7,      // 30% jeftinije
  drugo_dete: 0.5,    // pola cene
  trece_dete: 0,      // besplatno
  oslobodjen: 0       // besplatno
};

function sezonaMeseci() {
  // vraća niz { mesec, godina } za CELU sezonu - septembar do juna (isto kao u Administraciji)
  const danas = new Date();
  const tekucaGodina = danas.getFullYear();
  const redosledMeseci = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
  // avgust-decembar pripadaju "tekućoj" godini, januar-jun pripadaju SLEDEĆOJ godini
  // (sezona počinje avgustom, ne septembrom)
  return redosledMeseci.map((mesec) => ({
    mesec,
    godina: mesec >= 8 ? tekucaGodina : tekucaGodina + 1
  }));
}

function danasnjiDatum() {
  // vraća današnji datum kao tekst "2026-08-22" - gradimo ručno, bez pomeranja zbog vremenske zone
  const danas = new Date();
  const godina = danas.getFullYear();
  const mesec = String(danas.getMonth() + 1).padStart(2, '0');
  const dan = String(danas.getDate()).padStart(2, '0');
  return `${godina}-${mesec}-${dan}`;
}

function Clanarine() {
  const [selekcije, setSelekcije] = useState([]);
  const [selekcijaId, setSelekcijaId] = useState('');

  const [igraci, setIgraci] = useState([]);
  const [sveClanarine, setSveClanarine] = useState([]);

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [prikaziDetalje, setPrikaziDetalje] = useState(false);
  const [izabraniIgrac, setIzabraniIgrac] = useState(null);
  const [unetaSuma, setUnetaSuma] = useState('');

  useEffect(() => {
    async function ucitajOsnovno() {
      try {
        const selData = await apiFetch('/api/selekcije');
        // uvek povlačimo SVE selekcije (imamo tu i cena_clanarine, koja nam treba za obračun)

        const jeAdmin = localStorage.getItem('uloga') === 'admin';

        if (jeAdmin) {
          setSelekcije(selData);
          // admin vidi i unosi članarinu za SVE selekcije
        } else {
          const sopstveneIds = JSON.parse(localStorage.getItem('selekcije') || '[]').map((s) => s.id);
          // NOVO - trener vidi SAMO selekcije koje sam vodi

          setSelekcije(selData.filter((s) => sopstveneIds.includes(s.id)));
        }
      } catch (err) {
        setGreska(err.message);
      } finally {
        setUcitavanje(false);
      }
    }
    ucitajOsnovno();
  }, []);

  useEffect(() => {
    if (!selekcijaId) {
      setIgraci([]);
      setSveClanarine([]);
      return;
    }

    async function ucitajZaSelekciju() {
      try {
        const [sviIgraci, clanarineData] = await Promise.all([
          apiFetch('/api/igraci'),
          apiFetch('/api/clanarine')
        ]);

        setIgraci(sviIgraci.filter((i) => i.selekcija_id === parseInt(selekcijaId)));
        setSveClanarine(clanarineData);
      } catch (err) {
        setGreska(err.message);
      }
    }

    ucitajZaSelekciju();
  }, [selekcijaId]);

  function nepacaceniMeseci(igracId) {
    // vraća listu { mesec, godina } koje OVAJ igrač NIJE platio, do današnjeg dana
    const sezona = sezonaMeseci();
    const danas = new Date();

    return sezona.filter(({ mesec, godina }) => {
      const prviUMesecu = new Date(godina, mesec - 1, 1);
      if (prviUMesecu > danas) return false;
      // buduće mesece ne računamo

      const zapis = sveClanarine.find(
        (c) => c.igrac_id === igracId && c.mesec === mesec && c.godina === godina
      );
      return zapis ? !zapis.placeno : true;
      // ako zapis ne postoji, tretiramo kao neplaćeno
    });
  }

  function igraciSaDugom() {
    // SAMO igrači koji imaju bar jedan neplaćen mesec
    return igraci.filter((i) => nepacaceniMeseci(i.id).length > 0);
  }

  function cenaZaMesec(igrac, mesec, godina, jeTekuciMesec) {
    // računa cenu za JEDAN mesec, za OVOG igrača, uz njegov popust po kategoriji
    // i dodatni popust od 10% ako se plaća tekući mesec do 8. u mesecu

    const selekcijaObjekat = selekcije.find((s) => s.id === parseInt(selekcijaId));
    const osnovnaCena = selekcijaObjekat && selekcijaObjekat.cena_clanarine !== null
      ? parseFloat(selekcijaObjekat.cena_clanarine)
      : 0;

    const multiplikator = POPUST_PO_KATEGORIJI[igrac.kategorija_clanarine] ?? 1;
    // ?? 1 - ako kategorija nije prepoznata, ne dajemo popust (sigurnosna mera)

    let cena = osnovnaCena * multiplikator;

    const danasnjiDan = new Date().getDate();
    if (jeTekuciMesec && danasnjiDan <= 8) {
      // dodatnih 10% popusta ako se plaća TEKUĆI mesec do 8. u mesecu
      cena = cena * 0.9;
    }

    return Math.round(cena * 100) / 100;
    // zaokružujemo na 2 decimale (pare)
  }

  function ukupanDugIgraca(igrac) {
    // vraća UKUPAN iznos duga za igrača, sabirajući cenu svakog neplaćenog meseca
    const danas = new Date();
    const tekuciMesec = danas.getMonth() + 1;
    const tekucaGodina = danas.getFullYear();

    return nepacaceniMeseci(igrac.id).reduce((zbir, { mesec, godina }) => {
      const jeTekuciMesec = mesec === tekuciMesec && godina === tekucaGodina;
      return zbir + cenaZaMesec(igrac, mesec, godina, jeTekuciMesec);
    }, 0);
  }

  function otvoriDetalje(igrac) {
    setIzabraniIgrac(igrac);
    setUnetaSuma('');
    setPrikaziDetalje(true);
  }

  async function platiSve() {
    // označava SVE neplaćene mesece kao plaćene, sa obračunatom cenom (uz popust gde važi)

    const danas = new Date();
    const tekuciMesec = danas.getMonth() + 1;
    const tekucaGodina = danas.getFullYear();
    const danasnjiTekst = danasnjiDatum();

    try {
      for (const { mesec, godina } of nepacaceniMeseci(izabraniIgrac.id)) {
        const jeTekuciMesec = mesec === tekuciMesec && godina === tekucaGodina;
        const iznos = cenaZaMesec(izabraniIgrac, mesec, godina, jeTekuciMesec);

        const postojeciZapis = sveClanarine.find(
          (c) => c.igrac_id === izabraniIgrac.id && c.mesec === mesec && c.godina === godina
        );

        if (postojeciZapis) {
          // zapis već postoji (sa placeno=false) - samo ga MENJAMO
          await apiFetch(`/api/clanarine/${postojeciZapis.id}`, {
            method: 'PUT',
            body: JSON.stringify({ placeno: true, iznos, datum_uplate: danasnjiTekst })
          });
        } else {
          // zapis NE postoji - pravimo NOVI, odmah označen kao plaćen
          await apiFetch('/api/clanarine', {
            method: 'POST',
            body: JSON.stringify({
              igrac_id: izabraniIgrac.id, mesec, godina, iznos,
              placeno: true, datum_uplate: danasnjiTekst
            })
          });
        }
      }

      setPrikaziDetalje(false);
      const clanarineData = await apiFetch('/api/clanarine');
      setSveClanarine(clanarineData);
      // osvežavamo listu - igrač će nestati iz liste dugova ako je sve plaćeno

    } catch (err) {
      setGreska(err.message);
    }
  }

  async function platiUnetuSumu() {
    // označava SAMO tekući mesec kao plaćen, sa RUČNO unetim iznosom (bez obzira na obračunatu cenu)

    if (!unetaSuma || parseFloat(unetaSuma) <= 0) {
      setGreska('Unesi ispravan iznos.');
      return;
    }

    const danas = new Date();
    const tekuciMesec = danas.getMonth() + 1;
    const tekucaGodina = danas.getFullYear();
    const danasnjiTekst = danasnjiDatum();

    try {
      const postojeciZapis = sveClanarine.find(
        (c) => c.igrac_id === izabraniIgrac.id && c.mesec === tekuciMesec && c.godina === tekucaGodina
      );

      if (postojeciZapis) {
        await apiFetch(`/api/clanarine/${postojeciZapis.id}`, {
          method: 'PUT',
          body: JSON.stringify({ placeno: true, iznos: parseFloat(unetaSuma), datum_uplate: danasnjiTekst })
        });
      } else {
        await apiFetch('/api/clanarine', {
          method: 'POST',
          body: JSON.stringify({
            igrac_id: izabraniIgrac.id, mesec: tekuciMesec, godina: tekucaGodina,
            iznos: parseFloat(unetaSuma), placeno: true, datum_uplate: danasnjiTekst
          })
        });
      }

      setPrikaziDetalje(false);
      const clanarineData = await apiFetch('/api/clanarine');
      setSveClanarine(clanarineData);

    } catch (err) {
      setGreska(err.message);
    }
  }

  if (ucitavanje) {
    return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
  }

  return (
    <Container>
      <h2 className="mb-4">Unos članarine</h2>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

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
        <Alert variant="info">Izaberi selekciju da vidiš igrače koji imaju dugovanje.</Alert>
      )}

      {selekcijaId && (
        igraciSaDugom().length === 0 ? (
          <Alert variant="success">Svi igrači ove selekcije imaju plaćenu članarinu.</Alert>
        ) : (
          <ListGroup>
            {igraciSaDugom().map((igrac) => (
              <ListGroup.Item
                key={igrac.id}
                action
                onClick={() => otvoriDetalje(igrac)}
                className="d-flex justify-content-between align-items-center"
              >
                {igrac.ime} {igrac.prezime}
                <Badge bg="danger">{nepacaceniMeseci(igrac.id).length} mesec(i) duga</Badge>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )
      )}

      {/* Modal sa detaljima duga i opcijama plaćanja */}
      <Modal show={prikaziDetalje} onHide={() => setPrikaziDetalje(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {izabraniIgrac?.ime} {izabraniIgrac?.prezime}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {izabraniIgrac && (
            <>
              <p>
                Neplaćeni meseci: <strong>{nepacaceniMeseci(izabraniIgrac.id).length}</strong>
              </p>
              <p>
                Ukupan dug: <strong>{ukupanDugIgraca(izabraniIgrac)} din</strong>
              </p>
              <p className="text-muted small">
                Cena je obračunata prema kategoriji članarine igrača ({izabraniIgrac.kategorija_clanarine}).
                Ako se plaća do 8. u mesecu, tekući mesec dobija dodatnih 10% popusta.
              </p>

              <Button variant="success" className="w-100 mb-3" onClick={platiSve}>
                Plaćeno sve ({ukupanDugIgraca(izabraniIgrac)} din)
              </Button>

              <hr />

              <Form.Group className="mb-2">
                <Form.Label>Ili unesi konkretnu uplaćenu sumu (plaća SAMO tekući mesec)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={unetaSuma}
                  onChange={(e) => setUnetaSuma(e.target.value)}
                  placeholder="npr. 2000"
                />
              </Form.Group>
              <Button variant="outline-primary" className="w-100" onClick={platiUnetuSumu}>
                Uplati ovaj iznos
              </Button>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPrikaziDetalje(false)}>Zatvori</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Clanarine;
