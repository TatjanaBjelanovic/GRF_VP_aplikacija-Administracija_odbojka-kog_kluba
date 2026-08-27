// src/pages/Login.js
// Stranica za prijavu korisnika (admin ili trener)

import { useState } from 'react';
// useState - React "hook" koji nam omogućava da čuvamo podatke koji se menjaju (npr. tekst u inputu)

import { useNavigate } from 'react-router-dom';
// useNavigate - omogućava da programski prebacimo korisnika na drugu stranicu posle uspešnog logina

import { Form, Button, Container, Alert, Card } from 'react-bootstrap';
// Bootstrap komponente za lep izgled forme

import { apiFetch } from '../api';
// naša pomoćna funkcija za pozive ka backend-u

function Login({ setKorisnik }) {
  // Login je React komponenta (funkcija koja vraća JSX/HTML)
  // setKorisnik primamo kao "prop" iz App.js - njime obaveštavamo celu aplikaciju ko je ulogovan

  const [email, setEmail] = useState('');
  // stanje za email input - počinje kao prazan string

  const [lozinka, setLozinka] = useState('');
  // stanje za lozinku input

  const [greska, setGreska] = useState('');
  // stanje za poruku o grešci (prikazuje se ako login ne uspe)

  const navigate = useNavigate();
  // funkcija kojom prebacujemo korisnika na drugu stranicu

  async function handleSubmit(e) {
    // funkcija koja se poziva kad korisnik klikne "Prijavi se"

    e.preventDefault();
    // sprečavamo podrazumevano ponašanje forme (osvežavanje cele stranice)

    setGreska('');
    // brišemo staru poruku o grešci pre novog pokušaja

    try {
      const podaci = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, lozinka })
        // šaljemo email i lozinku kao JSON telo zahteva
      });

      localStorage.setItem('token', podaci.token);
      // čuvamo token u browseru da ostane sačuvan i posle refresh-a

      localStorage.setItem('uloga', podaci.uloga);
      localStorage.setItem('ime', `${podaci.ime} ${podaci.prezime}`);
      localStorage.setItem('trenerId', podaci.id);
      // NOVO - čuvamo ID trenera, koristimo ga kasnije (npr. na Dashboard-u)

      localStorage.setItem('selekcije', JSON.stringify(podaci.selekcije));
      // NOVO - čuvamo selekcije koje ovaj trener vodi (kao JSON tekst, jer localStorage čuva samo tekst)

      setKorisnik({ ime: podaci.ime, prezime: podaci.prezime, uloga: podaci.uloga, id: podaci.id });
      // obaveštavamo App.js da je korisnik ulogovan

      navigate('/dashboard');
      // prebacujemo korisnika na Dashboard stranicu

    } catch (err) {
      setGreska(err.message);
      // ako je apiFetch bacio grešku (npr. pogrešna lozinka), prikazujemo je korisniku
    }
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      {/* Container centrira formu na sredini ekrana, i vertikalno i horizontalno */}

      <Card style={{ width: '400px' }} className="p-4 shadow">
        {/* Card daje formi lep "okvir" sa senkom */}

        <h3 className="text-center mb-4">Prijava - Odbojkaški klub</h3>

        {greska && <Alert variant="danger">{greska}</Alert>}
        {/* Alert se prikazuje SAMO ako postoji poruka o grešci */}

        <Form onSubmit={handleSubmit}>
          {/* onSubmit poziva našu funkciju kad se forma pošalje (Enter ili klik na dugme) */}

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // svaki put kad korisnik kuca, ažuriramo email state
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Lozinka</Form.Label>
            <Form.Control
              type="password"
              value={lozinka}
              onChange={(e) => setLozinka(e.target.value)}
              required
            />
          </Form.Group>

          <Button type="submit" variant="primary" className="w-100">
            Prijavi se
          </Button>
        </Form>
      </Card>
    </Container>
  );
}

export default Login;
// izvozimo komponentu da je App.js može koristiti
