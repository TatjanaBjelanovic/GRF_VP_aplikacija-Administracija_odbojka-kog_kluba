// src/pages/LekarskiPregledi.js
// Stranica za evidenciju lekarskih pregleda i upozorenja o isteku

import { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { apiFetch } from '../api';

function LekarskiPregledi() {
  const [pregledi, setPregledi] = useState([]);
  const [igraci, setIgraci] = useState([]);
  const [istekIds, setIstekIds] = useState(new Set());

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [prikaziModal, setPrikaziModal] = useState(false);
  const [urediId, setUrediId] = useState(null);
  const [forma, setForma] = useState({ igrac_id: '', datum_pregleda: '', datum_isteka: '' });

  async function ucitajSve() {
    try {
      const [pregledData, igraciData, istekData] = await Promise.all([
        apiFetch('/api/lekarski-pregledi'),
        apiFetch('/api/igraci'),
        apiFetch('/api/lekarski-pregledi/istek?dana=30')
      ]);
      setPregledi(pregledData);
      setIgraci(igraciData);

      const sviRizicniIds = [
        ...istekData.isticu_uskoro.map((p) => p.id),
        ...istekData.vec_istekli.map((p) => p.id)
      ];

      setIstekIds(new Set(sviRizicniIds));

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
    setForma({ igrac_id: '', datum_pregleda: '', datum_isteka: '' });
    setPrikaziModal(true);
  }

  function otvoriZaIzmenu(pregled) {
    setUrediId(pregled.id);
    setForma({
      igrac_id: pregled.igrac_id,
      datum_pregleda: pregled.datum_pregleda,
      datum_isteka: pregled.datum_isteka
    });
    setPrikaziModal(true);
  }

  async function sacuvaj(e) {
    e.preventDefault();
    try {
      if (urediId) {
        await apiFetch(`/api/lekarski-pregledi/${urediId}`, {
          method: 'PUT',
          body: JSON.stringify(forma)
        });
      } else {
        await apiFetch('/api/lekarski-pregledi', {
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
    if (!window.confirm('Da li sigurno želiš da obrišeš ovaj zapis?')) {
      return;
    }
    try {
      await apiFetch(`/api/lekarski-pregledi/${id}`, { method: 'DELETE' });
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
        <h2>Lekarski pregledi</h2>
        <Button variant="success" onClick={otvoriZaDodavanje}>+ Dodaj pregled</Button>
      </div>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Igrač</th>
            <th>Datum pregleda</th>
            <th>Datum isteka</th>
            <th>Status</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {pregledi.map((p) => (
            <tr key={p.id}>
              <td>{p.igrac_ime}</td>
              <td>{p.datum_pregleda}</td>
              <td>{p.datum_isteka}</td>
              <td>
                {istekIds.has(p.id)
                  ? <Badge bg="danger">Ističe uskoro / istekao</Badge>
                  : <Badge bg="success">Važeći</Badge>
                }
              </td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => otvoriZaIzmenu(p)}>
                  Izmeni
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => obrisi(p.id)}>
                  Obriši
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={prikaziModal} onHide={() => setPrikaziModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{urediId ? 'Izmeni pregled' : 'Novi pregled'}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={sacuvaj}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Igrač</Form.Label>
              <Form.Select
                value={forma.igrac_id}
                onChange={(e) => setForma({ ...forma, igrac_id: e.target.value })}
                required
              >
                <option value="">-- izaberi igrača --</option>
                {igraci.map((i) => (
                  <option key={i.id} value={i.id}>{i.ime} {i.prezime}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Datum pregleda</Form.Label>
              <Form.Control
                type="date"
                value={forma.datum_pregleda}
                onChange={(e) => setForma({ ...forma, datum_pregleda: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Datum isteka</Form.Label>
              <Form.Control
                type="date"
                value={forma.datum_isteka}
                onChange={(e) => setForma({ ...forma, datum_isteka: e.target.value })}
                required
              />
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

export default LekarskiPregledi;