// src/App.js
// Glavna komponenta aplikacije - postavlja rute (koja stranica se prikazuje gde)

import { useState } from 'react';
// useState - čuvamo podatke o ulogovanom korisniku

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// BrowserRouter - omogućava navigaciju kroz URL bez ponovnog učitavanja stranice
// Routes, Route - definišu koja komponenta se prikazuje na kojoj putanji
// Navigate - programski prebacuje korisnika na drugu putanju

import 'bootstrap/dist/css/bootstrap.min.css';
// uvozimo Bootstrap stilove za CELU aplikaciju

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Lokacije from './pages/Lokacije';
import Selekcije from './pages/Selekcije';
import Igraci from './pages/Igraci';
import Treninzi from './pages/Treninzi';
import Utakmice from './pages/Utakmice';
import Clanarine from './pages/Clanarine';
import Termini from './pages/Termini';
import Treneri from './pages/Treneri';
import Administracija from './pages/Administracija';
import Izvestaji from './pages/Izvestaji';
// NOVO - stranica sa izveštajima za trenere
import Navigacija from './components/Navigacija';

function App() {
  const [korisnik, setKorisnik] = useState(() => {
    // lazy inicijalizacija - proveravamo da li već postoji sačuvan token

    const token = localStorage.getItem('token');
    const uloga = localStorage.getItem('uloga');
    const ime = localStorage.getItem('ime');

    if (token) {
      return { ime, uloga };
    }
    return null;
  });

  return (
    <BrowserRouter>
      {korisnik && <Navigacija korisnik={korisnik} setKorisnik={setKorisnik} />}
      {/* Navigacija se prikazuje SAMO ako je korisnik ulogovan */}

      <Routes>
        <Route
          path="/login"
          element={
            korisnik
              ? <Navigate to="/dashboard" />
              : <Login setKorisnik={setKorisnik} />
          }
        />

        <Route
          path="/dashboard"
          element={
            korisnik
              ? <Dashboard />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/lokacije"
          element={
            korisnik && korisnik.uloga === 'admin'
              ? <Lokacije />
              : <Navigate to="/dashboard" />
          }
        />
        {/* SAMO admin - trener ovde pristupa preko Administracije (Upravljanje tabelama) */}

        <Route
          path="/selekcije"
          element={
            korisnik && korisnik.uloga === 'admin'
              ? <Selekcije />
              : <Navigate to="/dashboard" />
          }
        />
        {/* SAMO admin */}

        <Route
          path="/igraci"
          element={
            korisnik && korisnik.uloga === 'admin'
              ? <Igraci />
              : <Navigate to="/dashboard" />
          }
        />
        {/* SAMO admin */}

        <Route
          path="/treninzi"
          element={
            korisnik && korisnik.uloga === 'admin'
              ? <Treninzi />
              : <Navigate to="/dashboard" />
          }
        />
        {/* SAMO admin */}

        <Route
          path="/utakmice"
          element={
            korisnik
              ? <Utakmice />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/clanarine"
          element={
            korisnik
              ? <Clanarine />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/termini"
          element={
            korisnik
              ? <Termini />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/treneri"
          element={
            korisnik && korisnik.uloga === 'admin'
              ? <Treneri />
              : <Navigate to="/dashboard" />
          }
        />
        {/* SAMO admin - najvažnija zaštita, jer ova stranica menja uloge korisnika */}

        <Route
          path="/administracija"
          element={
            korisnik && korisnik.uloga === 'admin'
              ? <Administracija />
              : <Navigate to="/dashboard" />
          }
        />

        <Route
          path="/izvestaji"
          element={
            korisnik
              ? <Izvestaji />
              : <Navigate to="/login" />
          }
        />
        {/* NOVO - dostupno svim ulogovanim, ali link u meniju vidi samo trener (admin ima Administraciju) */}

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;