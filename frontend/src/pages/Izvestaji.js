// src/pages/Izvestaji.js
// Stranica sa izveštajima za CELI klub - vidljiva treneru (admin ima ovo UNUTAR Administracije)

import { Container } from 'react-bootstrap';
import IzvestajiSekcija from '../components/IzvestajiSekcija';
// koristimo istu reusable komponentu kao Administracija - nema dupliranja koda

function Izvestaji() {
  return (
    <Container>
      <h2 className="mb-4">Izveštaji</h2>
      <IzvestajiSekcija />
    </Container>
  );
}

export default Izvestaji;
