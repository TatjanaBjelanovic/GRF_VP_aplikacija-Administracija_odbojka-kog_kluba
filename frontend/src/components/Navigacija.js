// src/components/Navigacija.js
// Gornja navigaciona traka - prikazuje se na svim stranicama posle logina
// POJEDNOSTAVLJENA - trener vidi 5 linkova, admin ima Administraciju umesto Izveštaja

import { Navbar, Nav, Container, Button } from 'react-bootstrap';
// Bootstrap komponente za izgled navigacione trake

import { useNavigate, Link } from 'react-router-dom';
// useNavigate - prebacuje korisnika programski (npr. posle odjave)
// Link - pravi navigacione linkove bez ponovnog učitavanja stranice

function Navigacija({ korisnik, setKorisnik }) {
  // korisnik - podaci o ulogovanom korisniku (ime, uloga)
  // setKorisnik - funkcija kojom menjamo stanje u App.js (npr. na null pri odjavi)

  const navigate = useNavigate();

  function odjaviSe() {
    // funkcija koja se poziva klikom na dugme "Odjava"

    localStorage.removeItem('token');
    localStorage.removeItem('uloga');
    localStorage.removeItem('ime');
    localStorage.removeItem('trenerId');
    localStorage.removeItem('selekcije');
    // brišemo sačuvane podatke iz browsera

    setKorisnik(null);
    // obaveštavamo App.js da niko više nije ulogovan

    navigate('/login');
    // vraćamo korisnika na login stranicu
  }

  const jeAdmin = korisnik?.uloga === 'admin';

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      {/* bg="dark" i variant="dark" - tamna tema navbar-a
          expand="lg" - na manjim ekranima se linkovi skupljaju u "hamburger" meni */}

      <Container>
        <Navbar.Brand as={Link} to="/dashboard">
          🏐 Odbojkaški klub
        </Navbar.Brand>
        {/* as={Link} pretvara Bootstrap komponentu u React Router link */}

        <Navbar.Toggle aria-controls="glavni-meni" />
        {/* dugme koje se pojavljuje na malim ekranima za otvaranje menija */}

        <Navbar.Collapse id="glavni-meni">
          <Nav className="me-auto">
            {/* me-auto gura ostale elemente (dugme Odjava) na desnu stranu */}

            <Nav.Link as={Link} to="/dashboard">Početna</Nav.Link>
            <Nav.Link as={Link} to="/termini">Termini</Nav.Link>
            <Nav.Link as={Link} to="/utakmice">Utakmice</Nav.Link>
            <Nav.Link as={Link} to="/clanarine">Unos članarine</Nav.Link>
            {/* isti /clanarine ruta kao pre, samo je link preimenovan u meniju */}

            {jeAdmin ? (
              // ADMIN vidi Administraciju (koja UKLJUČUJE i Izveštaje unutar sebe)
              <Nav.Link as={Link} to="/administracija">Administracija</Nav.Link>
            ) : (
              // TRENER vidi samo Izveštaje (čita, ne uređuje)
              <Nav.Link as={Link} to="/izvestaji">Izveštaji</Nav.Link>
            )}
          </Nav>

          <Nav>
            <Navbar.Text className="me-3">
              {korisnik?.ime} ({korisnik?.uloga})
            </Navbar.Text>
            {/* prikazujemo ime i ulogu ulogovanog korisnika */}

            <Button variant="outline-light" size="sm" onClick={odjaviSe}>
              Odjava
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Navigacija;
