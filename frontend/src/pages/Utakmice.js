// src/pages/Utakmice.js
// Stranica za zakazivanje utakmica (samo raspored, BEZ praćenja rezultata)
// Ako smo domaćini, mesto se BIRA iz naših sala; ako nismo, upisuje se slobodan tekst

import { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { apiFetch } from '../api';

function Utakmice() {
  const [utakmice, setUtakmice] = useState([]);
  const [selekcije, setSelekcije] = useState([]);
  const [lokacije, setLokacije] = useState([]);
  // NOVO - lokacije nam trebaju za padajući meni kad smo domaćini

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [prikaziModal, setPrikaziModal] = useState(false);
  const [urediId, setUrediId] = useState(null);
  const [forma, setForma] = useState({
    datum: '', vreme: '', protivnik: '', domacin: true, mesto_odrzavanja: '', selekcija_id: ''
  });

  async function ucitajSve() {
    try {
      const [utakmiceData, selekcijeData, lokacijeData] = await Promise.all([
        apiFetch('/api/utakmice'),
        apiFetch('/api/selekcije'),
        apiFetch('/api/lokacije')
        // NOVO - povlačimo i naše sale
      ]);
      setUtakmice(utakmiceData);
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
    setForma({ datum: '', vreme: '', protivnik: '', domacin: true, mesto_odrzavanja: '', selekcija_id: '' });
    setPrikaziModal(true);
  }

  function otvoriZaIzmenu(utakmica) {
    setUrediId(utakmica.id);
    setForma({
      datum: utakmica.datum,
      vreme: utakmica.vreme,
      protivnik: utakmica.protivnik,
      domacin: utakmica.domacin,
      mesto_odrzavanja: utakmica.mesto_odrzavanja || '',
      selekcija_id: utakmica.selekcija_id
    });
    setPrikaziModal(true);
  }

  function promeniDomacin(jeDomacin) {
    // NOVO - kad se menja da/ne domaćin, praznimo mesto_odrzavanja
    // jer se način unosa menja (padajući meni <-> slobodan tekst) pa stara vrednost više nema smisla
    setForma({ ...forma, domacin: jeDomacin, mesto_odrzavanja: '' });
  }

  async function sacuvaj(e) {
    e.preventDefault();
    try {
      if (urediId) {
        await apiFetch(`/api/utakmice/${urediId}`, {
          method: 'PUT',
          body: JSON.stringify(forma)
        });
      } else {
        await apiFetch('/api/utakmice', {
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
    if (!window.confirm('Da li sigurno želiš da obrišeš ovu utakmicu?')) {
      return;
    }
    try {
      await apiFetch(`/api/utakmice/${id}`, { method: 'DELETE' });
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
        <h2>Utakmice</h2>
        <Button variant="success" onClick={otvoriZaDodavanje}>+ Zakaži utakmicu</Button>
      </div>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Vreme</th>
            <th>Protivnik</th>
            <th>Domaćin/Gost</th>
            <th>Mesto održavanja</th>
            <th>Selekcija</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {utakmice.map((u) => (
            <tr key={u.id}>
              <td>{u.datum}</td>
              <td>{u.vreme}</td>
              <td>{u.protivnik}</td>
              <td>
                <Badge bg={u.domacin ? 'success' : 'secondary'}>
                  {u.domacin ? 'Domaćin' : 'Gost'}
                </Badge>
              </td>
              <td>{u.mesto_odrzavanja || '-'}</td>
              <td>{u.selekcija_naziv}</td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => otvoriZaIzmenu(u)}>
                  Izmeni
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => obrisi(u.id)}>
                  Obriši
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={prikaziModal} onHide={() => setPrikaziModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{urediId ? 'Izmeni utakmicu' : 'Nova utakmica'}</Modal.Title>
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
              <Form.Label>Vreme</Form.Label>
              <Form.Control
                type="time"
                value={forma.vreme}
                onChange={(e) => setForma({ ...forma, vreme: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Protivnik</Form.Label>
              <Form.Control
                value={forma.protivnik}
                onChange={(e) => setForma({ ...forma, protivnik: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Mi smo domaćini"
                checked={forma.domacin}
                onChange={(e) => promeniDomacin(e.target.checked)}
                // koristimo promeniDomacin umesto direktnog setForma - da odmah ispraznimo mesto_odrzavanja
              />
            </Form.Group>

            {forma.domacin ? (
              // AKO smo domaćini - biramo IZ NAŠIH sala (padajući meni)
              <Form.Group className="mb-3">
                <Form.Label>Naša sala</Form.Label>
                <Form.Select
                  value={forma.mesto_odrzavanja}
                  onChange={(e) => setForma({ ...forma, mesto_odrzavanja: e.target.value })}
                  required
                >
                  <option value="">-- izaberi salu --</option>
                  {lokacije.map((l) => (
                    <option key={l.id} value={l.naziv}>{l.naziv}</option>
                    // čuvamo NAZIV kao tekst (mesto_odrzavanja je slobodno tekstualno polje u bazi,
                    // ne veza ka tabeli lokacija) - padajući meni samo olakšava unos ispravnog naziva
                  ))}
                </Form.Select>
              </Form.Group>
            ) : (
              // AKO NISMO domaćini - slobodan unos teksta (gostujuće mesto nije u našoj bazi)
              <Form.Group className="mb-3">
                <Form.Label>Mesto održavanja (slobodan tekst)</Form.Label>
                <Form.Control
                  placeholder="npr. Sala protivničkog kluba, ili adresa"
                  value={forma.mesto_odrzavanja}
                  onChange={(e) => setForma({ ...forma, mesto_odrzavanja: e.target.value })}
                />
              </Form.Group>
            )}

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

export default Utakmice;
