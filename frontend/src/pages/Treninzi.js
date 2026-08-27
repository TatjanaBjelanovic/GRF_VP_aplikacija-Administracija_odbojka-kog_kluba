// src/pages/Treninzi.js
// Stranica za zakazivanje treninga i evidenciju prisustva igrača

import { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { apiFetch } from '../api';

function Treninzi() {
  const [treninzi, setTreninzi] = useState([]);
  const [selekcije, setSelekcije] = useState([]);
  const [treneri, setTreneri] = useState([]);
  const [lokacije, setLokacije] = useState([]);

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [prikaziModal, setPrikaziModal] = useState(false);
  const [urediId, setUrediId] = useState(null);
  const [forma, setForma] = useState({
    datum: '', vreme_pocetka: '', vreme_zavrsetka: '', selekcija_id: '', trener_id: '', lokacija_id: ''
  });

  const [prikaziPrisustvo, setPrikaziPrisustvo] = useState(false);
  const [aktivniTrening, setAktivniTrening] = useState(null);
  const [igraciZaPrisustvo, setIgraciZaPrisustvo] = useState([]);
  const [zapisiPrisustva, setZapisiPrisustva] = useState([]);

  async function ucitajSve() {
    try {
      const [treninziData, selekcijeData, treneriData, lokacijeData] = await Promise.all([
        apiFetch('/api/treninzi'),
        apiFetch('/api/selekcije'),
        apiFetch('/api/treneri'),
        apiFetch('/api/lokacije')
      ]);
      setTreninzi(treninziData);
      setSelekcije(selekcijeData);
      setTreneri(treneriData);
      setLokacije(lokacijeData);
    } catch (err) {
      setGreska(err.message);
    } finally {
      setUcitavanje(false);
    }
  }

  useEffect(() => {
    ucitajSve();
  }, []);

  function otvoriZaDodavanje() {
    setUrediId(null);
    setForma({ datum: '', vreme_pocetka: '', vreme_zavrsetka: '', selekcija_id: '', trener_id: '', lokacija_id: '' });
    setPrikaziModal(true);
  }

  function otvoriZaIzmenu(trening) {
    setUrediId(trening.id);
    setForma({
      datum: trening.datum,
      vreme_pocetka: trening.vreme_pocetka,
      vreme_zavrsetka: trening.vreme_zavrsetka,
      selekcija_id: trening.selekcija_id,
      trener_id: trening.trener_id,
      lokacija_id: trening.lokacija_id
    });
    setPrikaziModal(true);
  }

  function vremenaSePreklapaju(pocetak1, kraj1, pocetak2, kraj2) {
    // proverava da li se dva vremenska intervala PREKLAPAJU
    // (npr. 18:00-19:00 i 18:30-19:30 se preklapaju, ali 18:00-19:00 i 19:00-20:00 NE preklapaju)
    return pocetak1 < kraj2 && pocetak2 < kraj1;
    // tekst poređenje radi ispravno za format "HH:MM" jer su brojevi uvek dve cifre
  }

  function trenerJeZauzet(trenerId, datum, vremePocetka, vremeZavrsetka, iskljuciTreningId) {
    // proverava da li OVAJ trener već ima NEKI DRUGI trening istog datuma, u vreme koje se preklapa
    return treninzi.some((t) =>
      t.trener_id === parseInt(trenerId) &&
      t.datum === datum &&
      t.id !== iskljuciTreningId &&
      // iskljuciTreningId - ne poredimo trening sa samim sobom (bitno kod IZMENE postojećeg)
      vremenaSePreklapaju(vremePocetka, vremeZavrsetka, t.vreme_pocetka, t.vreme_zavrsetka)
    );
  }

  async function sacuvaj(e) {
    e.preventDefault();

    if (trenerJeZauzet(forma.trener_id, forma.datum, forma.vreme_pocetka, forma.vreme_zavrsetka, urediId)) {
      // NOVO - pre slanja na server, proveravamo da izabrani trener nije već zauzet u to vreme
      setGreska('Ovaj trener već ima drugi trening u to vreme istog dana.');
      return;
      // prekidamo funkciju ovde - ne šaljemo zahtev ka backend-u dok se sudar ne reši
    }

    try {
      if (urediId) {
        await apiFetch(`/api/treninzi/${urediId}`, {
          method: 'PUT',
          body: JSON.stringify(forma)
        });
      } else {
        await apiFetch('/api/treninzi', {
          method: 'POST',
          body: JSON.stringify(forma)
        });
      }
      setPrikaziModal(false);
      ucitajSve();
    } catch (err) {
      setGreska(err.message);
    }
  }

  async function obrisi(id) {
    if (!window.confirm('Da li sigurno želiš da obrišeš ovaj trening?')) {
      return;
    }
    try {
      await apiFetch(`/api/treninzi/${id}`, { method: 'DELETE' });
      ucitajSve();
    } catch (err) {
      setGreska(err.message);
    }
  }

  async function oznaciRealizovan(trening, vrednost) {
    try {
      await apiFetch(`/api/treninzi/${trening.id}`, {
        method: 'PUT',
        body: JSON.stringify({ realizovan: vrednost })
      });
      ucitajSve();
    } catch (err) {
      setGreska(err.message);
    }
  }

  async function otvoriPrisustvo(trening) {
    setAktivniTrening(trening);

    try {
      const [sviIgraci, zapisi] = await Promise.all([
        apiFetch('/api/igraci'),
        apiFetch(`/api/treninzi/${trening.id}/prisustvo`)
      ]);

      const igraciSelekcije = sviIgraci.filter((i) => i.selekcija_id === trening.selekcija_id);

      setIgraciZaPrisustvo(igraciSelekcije);
      setZapisiPrisustva(zapisi);
      setPrikaziPrisustvo(true);
    } catch (err) {
      setGreska(err.message);
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
    return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Treninzi</h2>
        <Button variant="success" onClick={otvoriZaDodavanje}>+ Zakaži trening</Button>
      </div>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Vreme</th>
            <th>Selekcija</th>
            <th>Trener</th>
            <th>Lokacija</th>
            <th>Realizovan</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {treninzi.map((t) => (
            <tr key={t.id}>
              <td>{t.datum}</td>
              <td>{t.vreme_pocetka} - {t.vreme_zavrsetka}</td>
              <td>{t.selekcija_naziv}</td>
              <td>{t.trener_ime}</td>
              <td>{t.lokacija_naziv}</td>
              <td>
                <Form.Check
                  type="switch"
                  checked={t.realizovan}
                  onChange={(e) => oznaciRealizovan(t, e.target.checked)}
                />
              </td>
              <td>
                <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => otvoriPrisustvo(t)}>
                  Prisustvo
                </Button>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => otvoriZaIzmenu(t)}>
                  Izmeni
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => obrisi(t.id)}>
                  Obriši
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={prikaziModal} onHide={() => setPrikaziModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{urediId ? 'Izmeni trening' : 'Novi trening'}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={sacuvaj}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Datum</Form.Label>
              <Form.Control
                type="date"
                value={forma.datum}
                onChange={(e) => setForma({ ...forma, datum: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Vreme početka</Form.Label>
              <Form.Control
                type="time"
                value={forma.vreme_pocetka}
                onChange={(e) => setForma({ ...forma, vreme_pocetka: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Vreme završetka</Form.Label>
              <Form.Control
                type="time"
                value={forma.vreme_zavrsetka}
                onChange={(e) => setForma({ ...forma, vreme_zavrsetka: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Selekcija</Form.Label>
              <Form.Select
                value={forma.selekcija_id}
                onChange={(e) => setForma({ ...forma, selekcija_id: e.target.value })}
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
                value={forma.trener_id}
                onChange={(e) => setForma({ ...forma, trener_id: e.target.value })}
                required
              >
                <option value="">-- izaberi trenera --</option>
                {treneri.map((t) => (
                  <option key={t.id} value={t.id}>{t.ime} {t.prezime}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Lokacija</Form.Label>
              <Form.Select
                value={forma.lokacija_id}
                onChange={(e) => setForma({ ...forma, lokacija_id: e.target.value })}
                required
              >
                <option value="">-- izaberi lokaciju --</option>
                {lokacije.map((l) => (
                  <option key={l.id} value={l.id}>{l.naziv}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setPrikaziModal(false)}>Otkaži</Button>
            <Button variant="primary" type="submit">Sačuvaj</Button>
          </Modal.Footer>
        </Form>
      </Modal>

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

export default Treninzi;