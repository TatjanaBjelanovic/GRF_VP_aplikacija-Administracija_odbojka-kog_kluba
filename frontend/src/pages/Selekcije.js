// src/pages/Selekcije.js
// Stranica za pregled i upravljanje selekcijama (npr. Kadetkinje, Mlađi pioniri)

import { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { apiFetch } from '../api';

function Selekcije() {
  const [selekcije, setSelekcije] = useState([]);
  const [lokacije, setLokacije] = useState([]);
  // lokacije nam trebaju za multi-select pri dodavanju/izmeni selekcije

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [prikaziModal, setPrikaziModal] = useState(false);
  const [urediId, setUrediId] = useState(null);
  const [forma, setForma] = useState({ naziv: '', cena_clanarine: '', lokacija_ids: [] });
  // lokacija_ids je NIZ (lista) - selekcija sad može trenirati na VIŠE lokacija

  async function ucitajSve() {
    try {
      const [selekcijeData, lokacijeData] = await Promise.all([
        apiFetch('/api/selekcije'),
        apiFetch('/api/lokacije')
      ]);
      setSelekcije(selekcijeData);
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
    setForma({ naziv: '', cena_clanarine: '', lokacija_ids: [] });
    setPrikaziModal(true);
  }

  function otvoriZaIzmenu(selekcija) {
    setUrediId(selekcija.id);
    setForma({
      naziv: selekcija.naziv,
      cena_clanarine: selekcija.cena_clanarine ?? '',
      // ?? '' - ako je cena null, prikazujemo prazno polje umesto teksta "null"

      lokacija_ids: selekcija.lokacije.map((l) => l.id)
      // izvlačimo samo ID-jeve iz liste objekata lokacija
    });
    setPrikaziModal(true);
  }

  function promeniIzborLokacija(e) {
    // posebna funkcija za multi-select input (nije obično onChange)

    const izabraniIdovi = Array.from(e.target.selectedOptions, (opcija) => parseInt(opcija.value));
    // e.target.selectedOptions je lista SVIH trenutno označenih opcija u multi-select-u
    // Array.from je pretvara u pravi niz, a parseInt svaku vrednost pretvara iz teksta u broj

    setForma({ ...forma, lokacija_ids: izabraniIdovi });
  }

  async function sacuvaj(e) {
    e.preventDefault();
    try {
      if (urediId) {
        await apiFetch(`/api/selekcije/${urediId}`, {
          method: 'PUT',
          body: JSON.stringify(forma)
        });
      } else {
        await apiFetch('/api/selekcije', {
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
    if (!window.confirm('Da li sigurno želiš da obrišeš ovu selekciju?')) {
      return;
    }
    try {
      await apiFetch(`/api/selekcije/${id}`, { method: 'DELETE' });
      ucitajSve();
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
        <h2>Selekcije</h2>
        <Button variant="success" onClick={otvoriZaDodavanje}>+ Dodaj selekciju</Button>
      </div>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Lokacije</th>
            <th>Cena članarine</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {selekcije.map((sel) => (
            <tr key={sel.id}>
              <td>{sel.naziv}</td>
              <td>{sel.lokacije_nazivi || '-'}</td>
              {/* lokacije_nazivi je već spojen tekst sa backend-a, npr. "Sala Banjica, Sala Zvezdara" */}
              <td>{sel.cena_clanarine !== null ? `${sel.cena_clanarine} din` : '-'}</td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => otvoriZaIzmenu(sel)}>
                  Izmeni
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => obrisi(sel.id)}>
                  Obriši
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={prikaziModal} onHide={() => setPrikaziModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{urediId ? 'Izmeni selekciju' : 'Nova selekcija'}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={sacuvaj}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Naziv</Form.Label>
              <Form.Control
                value={forma.naziv}
                onChange={(e) => setForma({ ...forma, naziv: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Cena članarine (din, mesečno)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={forma.cena_clanarine}
                onChange={(e) => setForma({ ...forma, cena_clanarine: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Lokacije (drži Ctrl/Cmd za više izbora)</Form.Label>
              <Form.Select
                multiple
                // multiple omogućava da se označi VIŠE opcija odjednom
                value={forma.lokacija_ids}
                onChange={promeniIzborLokacija}
                style={{ height: '120px' }}
              >
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
    </Container>
  );
}

export default Selekcije;
