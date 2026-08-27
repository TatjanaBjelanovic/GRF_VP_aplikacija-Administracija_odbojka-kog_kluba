// src/api.js
// Centralizovano mesto za sve pozive ka backend-u

const BASE_URL = 'http://localhost:5000';
// osnovna adresa našeg Flask backend-a

export function getToken() {
  return localStorage.getItem('token');
}

export async function apiFetch(putanja, opcije = {}) {
  // apiFetch - "omotač" oko fetch() koji automatski dodaje token i JSON header

  const token = getToken();

  const odgovor = await fetch(`${BASE_URL}${putanja}`, {
    ...opcije,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opcije.headers
    }
  });

  if (odgovor.status === 401) {
    // NOVO: ako server kaže da token nije validan (istekao ili ga nema)
    // automatski čistimo sve podatke i vraćamo korisnika na login

    localStorage.removeItem('token');
    localStorage.removeItem('uloga');
    localStorage.removeItem('ime');

    window.location.href = '/login';
    // window.location.href menja stranicu "grubo" (kao ručno kucanje adrese)
    // koristimo to ovde jer smo van React komponente, nemamo pristup useNavigate

    throw new Error('Sesija je istekla, ulogujte se ponovo');
    // bacamo grešku da pozivalac zna da se nešto desilo (iako se stranica već menja)
  }

  if (!odgovor.ok) {
    const greska = await odgovor.json().catch(() => ({}));
    throw new Error(greska.msg || greska.greska || 'Greška u komunikaciji sa serverom');
  }

  return odgovor.json();
}