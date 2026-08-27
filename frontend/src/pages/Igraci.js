// src/pages/Igraci.js
// Stranica za pregled i upravljanje igračima (članovima kluba)

import { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { apiFetch } from '../api';

const KATEGORIJE_CLANARINE = [
  { vrednost: 'regularna', naziv: 'Regularna' },
  { vrednost: 'popust10', naziv: 'Popust 10%' },
  { vrednost: 'popust20', naziv: 'Popust 20%' },
  { vrednost: 'popust30', naziv: 'Popust 30%' },
  { vrednost: 'drugo_dete', naziv: 'Drugo dete' },
  { vrednost: 'trece_dete', naziv: 'Treće dete' },
  { vrednost: 'oslobodjen', naziv: 'Oslobođen' }
];
// niz mogućih kategorija za obračun članarine - koristimo ga za padajući meni

function Igraci() {
  const [igraci, setIgraci] = useState([]);
  const [selekcije, setSelekcije] = useState([]);

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [prikaziModal, setPrikaziModal] = useState(false);
  const [urediId, setUrediId] = useState(null);

  const [forma, setForma] = useState({
    ime: '', prezime: '', datum_rodjenja: '', telefon_roditelja: '', ime_roditelja: '',
    kategorija_clanarine: 'regularna', datum_lekarskog: '', selekcija_id: ''
  });

  async function ucitajSve() {
    try {
      const [igraciData, selekcijeData] = await Promise.all([
        apiFetch('/api/igraci'),
        apiFetch('/api/selekcije')
      ]);
      setIgraci(igraciData);
      setSelekcije(selekcijeData);
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
    setForma({
      ime: '', prezime: '', datum_rodjenja: '', telefon_roditelja: '', ime_roditelja: '',
      kategorija_clanarine: 'regularna', datum_lekarskog: '', selekcija_id: ''
    });
    setPrikaziModal(true);
  }

  function otvoriZaIzmenu(igrac) {
    setUrediId(igrac.id);
    setForma({
      ime: igrac.ime,
      prezime: igrac.prezime,
      datum_rodjenja: igrac.datum_rodjenja,
      telefon_roditelja: igrac.telefon_roditelja || '',
      ime_roditelja: igrac.ime_roditelja || '',
      kategorija_clanarine: igrac.kategorija_clanarine || 'regularna',
      datum_lekarskog: igrac.datum_lekarskog || '',
      selekcija_id: igrac.selekcija_id
    });
    setPrikaziModal(true);
  }

  async function sacuvaj(e) {
    e.preventDefault();
    try {
      if (urediId) {
        await apiFetch(`/api/igraci/${urediId}`, {
          method: 'PUT',
          body: JSON.stringify(forma)
        });
      } else {
        await apiFetch('/api/igraci', {
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
    if (!window.confirm('Da li sigurno želiš da obrišeš ovog igrača?')) {
      return;
    }
    try {
      await apiFetch(`/api/igraci/${id}`, { method: 'DELETE' });
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
        <h2>Igrači</h2>
        <Button variant="success" onClick={otvoriZaDodavanje}>+ Dodaj igrača</Button>
      </div>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Ime</th>
            <th>Prezime</th>
            <th>Datum rođenja</th>
            <th>Ime roditelja</th>
            <th>Telefon roditelja</th>
            <th>Kategorija članarine</th>
            <th>Datum lekarskog</th>
            <th>Selekcija</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {igraci.map((igrac) => (
            <tr key={igrac.id}>
              <td>{igrac.ime}</td>
              <td>{igrac.prezime}</td>
              <td>{igrac.datum_rodjenja}</td>
              <td>{igrac.ime_roditelja}</td>
              <td>{igrac.telefon_roditelja}</td>
              <td>
                {KATEGORIJE_CLANARINE.find((k) => k.vrednost === igrac.kategorija_clanarine)?.naziv || igrac.kategorija_clanarine}
                {/* tražimo čitljiv naziv za kategoriju; ako ga nema, prikazujemo sirovu vrednost */}
              </td>
              <td>{igrac.datum_lekarskog || '-'}</td>
              <td>{igrac.selekcija_naziv}</td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => otvoriZaIzmenu(igrac)}>
                  Izmeni
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => obrisi(igrac.id)}>
                  Obriši
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={prikaziModal} onHide={() => setPrikaziModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{urediId ? 'Izmeni igrača' : 'Novi igrač'}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={sacuvaj}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Ime</Form.Label>
              <Form.Control
                value={forma.ime}
                onChange={(e) => setForma({ ...forma, ime: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Prezime</Form.Label>
              <Form.Control
                value={forma.prezime}
                onChange={(e) => setForma({ ...forma, prezime: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Datum rođenja</Form.Label>
              <Form.Control
                type="date"
                value={forma.datum_rodjenja}
                onChange={(e) => setForma({ ...forma, datum_rodjenja: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Ime roditelja</Form.Label>
              <Form.Control
                value={forma.ime_roditelja}
                onChange={(e) => setForma({ ...forma, ime_roditelja: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Telefon roditelja</Form.Label>
              <Form.Control
                value={forma.telefon_roditelja}
                onChange={(e) => setForma({ ...forma, telefon_roditelja: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Kategorija članarine</Form.Label>
              <Form.Select
                value={forma.kategorija_clanarine}
                onChange={(e) => setForma({ ...forma, kategorija_clanarine: e.target.value })}
              >
                {KATEGORIJE_CLANARINE.map((k) => (
                  <option key={k.vrednost} value={k.vrednost}>{k.naziv}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Datum lekarskog pregleda</Form.Label>
              <Form.Control
                type="date"
                value={forma.datum_lekarskog}
                onChange={(e) => setForma({ ...forma, datum_lekarskog: e.target.value })}
              />
              <Form.Text className="text-muted">
                Lekarski važi 6 meseci od unetog datuma - istek se računa automatski.
              </Form.Text>
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

export default Igraci;