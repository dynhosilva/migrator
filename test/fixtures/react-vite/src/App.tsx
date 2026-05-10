import { BrowserRouter, Routes, Route } from 'react-router-dom';

const apiUrl = import.meta.env.VITE_API_URL;
const appTitle = import.meta.env.VITE_APP_TITLE;

function Home() {
  return <div>{appTitle} — Home</div>;
}

function About() {
  return <div>About — API: {apiUrl}</div>;
}

function NotFound() {
  return <div>404 Not Found</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
