// components/Layout.jsx
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-pagebg text-text">
      <Header />
      <main className="flex-1 section-gap">
        <div className="container-app">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
