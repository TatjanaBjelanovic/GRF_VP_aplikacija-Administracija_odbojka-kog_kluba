// src/pages/Treneri.js
// Stranica za pregled i upravljanje trenerima (dostupno samo adminu preko navigacije)

import { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { apiFetch } from '../api';

function Treneri() {
  const [treneri, setTreneri] = useState([]);
  const [selekcije, setSelekcije] = useState([]);

  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState('');

  const [prikaziModal, setPrikaziModal] = useState(false);
  const [urediId, setUrediId] = useState(null);

  const [forma, setForma] = useState({
    ime: '', prezime: '', email: '', lozinka: '', uloga: 'trener',
    selekcija_ids: [], glavni_selekcija_ids: []
    // selekcija_ids - koje selekcije trener vodi (kao i pre)
    // glavni_selekcija_ids - NOVO - za koje od njih je OVAJ trener glavni (podskup selekcija_ids)
  });

  async function ucitajSve() {
    try {
      const [treneriData, selekcijeData] = await Promise.all([
        apiFetch('/api/treneri'),
        apiFetch('/api/selekcije')
      ]);
      setTreneri(treneriData);
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
      ime: '', prezime: '', email: '', lozinka: '', uloga: 'trener',
      selekcija_ids: [], glavni_selekcija_ids: []
    });
    setPrikaziModal(true);
  }

  function otvoriZaIzmenu(trener) {
    setUrediId(trener.id);
    setForma({
      ime: trener.ime,
      prezime: trener.prezime,
      email: trener.email,
      lozinka: '',
      // lozinku NIKAD ne popunjavamo unapred - ostaje prazna, menja se samo ako korisnik nešto ukuca
      uloga: trener.uloga,
      selekcija_ids: trener.selekcije.map((s) => s.id),
      // izvlačimo ID-jeve iz liste objekata selekcija koje trener vodi

      glavni_selekcija_ids: trener.glavni_za_selekcije || []
      // NOVO - lista ID-jeva selekcija za koje je trener već označen kao glavni
    });
    setPrikaziModal(true);
  }

  function promeniIzborSelekcija(e) {
    // posebna funkcija za multi-select input (koje selekcije trener vodi)

    const izabraniIdovi = Array.from(e.target.selectedOptions, (opcija) => parseInt(opcija.value));
    // e.target.selectedOptions je lista SVIH trenutno označenih opcija u multi-select-u

    // NOVO - ako smo UKLONILI neku selekciju iz izbora, brišemo je i iz glavni_selekcija_ids
    // (ne sme biti "glavni" za selekciju koju više ne vodi)
    const novoGlavni = forma.glavni_selekcija_ids.filter((id) => izabraniIdovi.includes(id));

    setForma({ ...forma, selekcija_ids: izabraniIdovi, glavni_selekcija_ids: novoGlavni });
  }

  function prekidacGlavni(selekcijaId) {
    // funkcija za checkbox "glavni trener" pored svake izabrane selekcije

    const jeVecGlavni = forma.glavni_selekcija_ids.includes(selekcijaId);

    if (jeVecGlavni) {
      // ako je već označen kao glavni, klik ga UKLANJA sa liste
      setForma({
        ...forma,
        glavni_selekcija_ids: forma.glavni_selekcija_ids.filter((id) => id !== selekcijaId)
      });
    } else {
      // inače ga DODAJEMO na listu
      setForma({
        ...forma,
        glavni_selekcija_ids: [...forma.glavni_selekcija_ids, selekcijaId]
      });
    }
  }

  async function sacuvaj(e) {
    e.preventDefault();

    const telo = { ...forma };
    // pravimo kopiju forme da je možemo bezbedno menjati pre slanja

    if (urediId && !telo.lozinka) {
      // ako MENJAMO postojećeg trenera i lozinka polje je prazno,
      // brišemo ga iz tela zahteva da backend ne pokuša da postavi praznu lozinku
      delete telo.lozinka;
    }

    try {
      if (urediId) {
        await apiFetch(`/api/treneri/${urediId}`, {
          method: 'PUT',
          body: JSON.stringify(telo)
        });
      } else {
        await apiFetch('/api/treneri', {
          method: 'POST',
          body: JSON.stringify(telo)
        });
      }
      setPrikaziModal(false);
      ucitajSve();
    } catch (err) {
      setGreska(err.message);
    }
  }

  async function obrisi(id) {
    if (!window.confirm('Da li sigurno želiš da obrišeš ovog trenera?')) {
      return;
    }
    try {
      await apiFetch(`/api/treneri/${id}`, { method: 'DELETE' });
      ucitajSve();
    } catch (err) {
      setGreska(err.message);
    }
  }

  if (ucitavanje) {
    return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
  }

  // pravimo listu SAMO onih selekcija koje su trenutno izabrane u formi
  // (nad njima prikazujemo checkbox "glavni" - nema smisla za selekcije koje trener uopšte ne vodi)
  const izabraneSelekcijeObjekti = selekcije.filter((s) => forma.selekcija_ids.includes(s.id));

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Treneri</h2>
        <Button variant="success" onClick={otvoriZaDodavanje}>+ Dodaj trenera</Button>
      </div>

      {greska && <Alert variant="danger" onClose={() => setGreska('')} dismissible>{greska}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Ime i prezime</th>
            <th>Email</th>
            <th>Uloga</th>
            <th>Selekcije</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {treneri.map((tr) => (
            <tr key={tr.id}>
              <td>{tr.ime} {tr.prezime}</td>
              <td>{tr.email}</td>
              <td>
                <Badge bg={tr.uloga === 'admin' ? 'danger' : 'secondary'}>
                  {tr.uloga}
                </Badge>
              </td>
              <td>
                {tr.selekcije.map((s) => (
                  <span key={s.id}>
                    {s.naziv}
                    {tr.glavni_za_selekcije?.includes(s.id) && (
                      // dodajemo malu oznaku pored naziva selekcije ako je trener glavni za nju
                      <Badge bg="warning" text="dark" className="ms-1">glavni</Badge>
                    )}
                    {' '}
                  </span>
                ))}
              </td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => otvoriZaIzmenu(tr)}>
                  Izmeni
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => obrisi(tr.id)}>
                  Obriši
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={prikaziModal} onHide={() => setPrikaziModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{urediId ? 'Izmeni trenera' : 'Novi trener'}</Modal.Title>
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
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={forma.email}
                onChange={(e) => setForma({ ...forma, email: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Lozinka {urediId && '(ostavi prazno da se ne menja)'}
              </Form.Label>
              <Form.Control
                type="password"
                value={forma.lozinka}
                onChange={(e) => setForma({ ...forma, lozinka: e.target.value })}
                required={!urediId}
                // required SAMO kad dodajemo NOVOG trenera; pri izmeni nije obavezno
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Uloga</Form.Label>
              <Form.Select
                value={forma.uloga}
                onChange={(e) => setForma({ ...forma, uloga: e.target.value })}
              >
                <option value="trener">trener</option>
                <option value="admin">admin</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Selekcije (drži Ctrl/Cmd za više izbora)</Form.Label>
              <Form.Select
                multiple
                value={forma.selekcija_ids}
                onChange={promeniIzborSelekcija}
                style={{ height: '120px' }}
              >
                {selekcije.map((s) => (
                  <option key={s.id} value={s.id}>{s.naziv}</option>
                ))}
              </Form.Select>
            </Form.Group>

            {izabraneSelekcijeObjekti.length > 0 && (
              // ovaj deo forme se prikazuje SAMO ako je trener izabrao bar jednu selekciju
              <Form.Group className="mb-3">
                <Form.Label>Glavni trener za:</Form.Label>
                {izabraneSelekcijeObjekti.map((s) => (
                  <Form.Check
                    key={s.id}
                    type="checkbox"
                    label={s.naziv}
                    checked={forma.glavni_selekcija_ids.includes(s.id)}
                    onChange={() => prekidacGlavni(s.id)}
                    // klik na checkbox poziva prekidacGlavni koji dodaje/uklanja iz liste
                  />
                ))}
              </Form.Group>
            )}
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

export default Treneri;
