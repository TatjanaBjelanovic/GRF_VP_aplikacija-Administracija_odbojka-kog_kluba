// src/pages/Termini.js
// Stalni nedeljni raspored - matrica (kolone = dani, redovi = vremena)
// Svi ulogovani vide, samo admin uređuje

import { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { apiFetch } from '../api';

const DANI = ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];

function Termini() {
  const [termini, setTermini] = useState([]);
  const [selekcije, setSelekcije] = useState([]);
  const [treneri, setTreneri] = useState([]);
  const [lokacije, setLokacije] = useState([]);

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const jeAdmin = localStorage.getItem('uloga') === 'admin';

  const [prikaziModal, setPrikaziModal] = useState(false);
  const [urediId, setUrediId] = useState(null);
  const [forma, setForma] = useState({
    dan_u_nedelji: 'Ponedeljak', vreme_pocetka: '', vreme_zavrsetka: '',
    selekcija_id: '', trener_id: '', lokacija_id: ''
  });

  async function ucitajSve() {
    try {
      const [termData, selData, trenData, lokData] = await Promise.all([
        apiFetch('/api/termini'),
        apiFetch('/api/selekcije'),
        apiFetch('/api/treneri'),
        apiFetch('/api/lokacije')
      ]);
      setTermini(termData);
      setSelekcije(selData);
      setTreneri(trenData);
      setLokacije(lokData);
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
      dan_u_nedelji: 'Ponedeljak', vreme_pocetka: '', vreme_zavrsetka: '',
      selekcija_id: '', trener_id: '', lokacija_id: ''
    });
    setPrikaziModal(true);
  }

  function otvoriZaIzmenu(termin) {
    setUrediId(termin.id);
    setForma({
      dan_u_nedelji: termin.dan_u_nedelji,
      vreme_pocetka: termin.vreme_pocetka,
      vreme_zavrsetka: termin.vreme_zavrsetka,
      selekcija_id: termin.selekcija_id,
      trener_id: termin.trener_id,
      lokacija_id: termin.lokacija_id
    });
    setPrikaziModal(true);
  }

  async function sacuvaj(e) {
    e.preventDefault();
    try {
      if (urediId) {
        await apiFetch(`/api/termini/${urediId}`, {
          method: 'PUT',
          body: JSON.stringify(forma)
        });
      } else {
        await apiFetch('/api/termini', {
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
    if (!window.confirm('Da li sigurno želiš da obrišeš ovaj termin?')) {
      return;
    }
    try {
      await apiFetch(`/api/termini/${id}`, { method: 'DELETE' });
      ucitajSve();
    } catch (err) {
      setGreska(err.message);
    }
  }

  if (ucitavanje) {
    return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
  }

  const sviRedovi = [...new Set(termini.map((t) => t.vreme_pocetka))].sort();

  function terminiZaPolje(dan, vreme) {
    return termini.filter((t) => t.dan_u_nedelji === dan && t.vreme_pocetka === vreme);
  }

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Termini - nedeljni raspored</h2>
        {jeAdmin && (
          <Button variant="success" onClick={otvoriZaDodavanje}>+ Dodaj termin</Button>
        )}
      </div>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      {sviRedovi.length === 0 ? (
        <Alert variant="info">Još uvek nema unetih termina.</Alert>
      ) : (
        <Table bordered responsive style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Vreme</th>
              {DANI.map((dan) => (
                <th key={dan} className="text-center">{dan}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sviRedovi.map((vreme) => (
              <tr key={vreme}>
                <td className="fw-bold align-middle">
                 {vreme} - {termini.find((t) => t.vreme_pocetka === vreme)?.vreme_zavrsetka}
                 {/* .find() pronalazi PRVI termin sa tim vremenom početka, samo da pročitamo vreme_zavrsetka za prikaz reda */}
                </td>

                {DANI.map((dan) => (
                  <td key={dan} style={{ verticalAlign: 'top' }}>
                    {terminiZaPolje(dan, vreme).map((t) => (
                      <div key={t.id} className="mb-2 p-1 border-bottom">
                        <div><strong>{t.selekcija_naziv}</strong></div>
                        <div className="text-muted small">{t.trener_ime}</div>
                        <div className="text-muted small">{t.lokacija_naziv}</div>

                        {jeAdmin && (
                          <div className="mt-1">
                            <Button size="sm" variant="link" className="p-0 me-2" onClick={() => otvoriZaIzmenu(t)}>
                              Izmeni
                            </Button>
                            <Button size="sm" variant="link" className="p-0 text-danger" onClick={() => obrisi(t.id)}>
                              Obriši
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={prikaziModal} onHide={() => setPrikaziModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{urediId ? 'Izmeni termin' : 'Novi termin'}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={sacuvaj}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Dan u nedelji</Form.Label>
              <Form.Select
                value={forma.dan_u_nedelji}
                onChange={(e) => setForma({ ...forma, dan_u_nedelji: e.target.value })}
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
              <Form.Label>Sala</Form.Label>
              <Form.Select
                value={forma.lokacija_id}
                onChange={(e) => setForma({ ...forma, lokacija_id: e.target.value })}
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
            <Button variant="secondary" onClick={() => setPrikaziModal(false)}>Otkaži</Button>
            <Button variant="primary" type="submit">Sačuvaj</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default Termini;