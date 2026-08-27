// src/pages/Lokacije.js
// Stranica za pregled i upravljanje lokacijama (salama/školama odbojke)

import { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { apiFetch } from '../api';

function Lokacije() {
  const [lokacije, setLokacije] = useState([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [prikaziModal, setPrikaziModal] = useState(false);
  const [urediId, setUrediId] = useState(null);
  const [forma, setForma] = useState({ naziv: '', adresa: '' });
  // forma ovde ima samo dva polja - mnogo jednostavnije od Igrača

  async function ucitajSve() {
    try {
      const data = await apiFetch('/api/lokacije');
      setLokacije(data);
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
    setForma({ naziv: '', adresa: '' });
    setPrikaziModal(true);
  }

  function otvoriZaIzmenu(lokacija) {
    setUrediId(lokacija.id);
    setForma({ naziv: lokacija.naziv, adresa: lokacija.adresa || '' });
    setPrikaziModal(true);
  }

  async function sacuvaj(e) {
    e.preventDefault();
    try {
      if (urediId) {
        await apiFetch(`/api/lokacije/${urediId}`, {
          method: 'PUT',
          body: JSON.stringify(forma)
        });
      } else {
        await apiFetch('/api/lokacije', {
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
    if (!window.confirm('Da li sigurno želiš da obrišeš ovu lokaciju?')) {
      return;
    }
    try {
      await apiFetch(`/api/lokacije/${id}`, { method: 'DELETE' });
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
        <h2>Lokacije</h2>
        <Button variant="success" onClick={otvoriZaDodavanje}>+ Dodaj lokaciju</Button>
      </div>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Adresa</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {lokacije.map((lok) => (
            <tr key={lok.id}>
              <td>{lok.naziv}</td>
              <td>{lok.adresa}</td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => otvoriZaIzmenu(lok)}>
                  Izmeni
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => obrisi(lok.id)}>
                  Obriši
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={prikaziModal} onHide={() => setPrikaziModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{urediId ? 'Izmeni lokaciju' : 'Nova lokacija'}</Modal.Title>
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
              <Form.Label>Adresa</Form.Label>
              <Form.Control
                value={forma.adresa}
                onChange={(e) => setForma({ ...forma, adresa: e.target.value })}
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

export default Lokacije;