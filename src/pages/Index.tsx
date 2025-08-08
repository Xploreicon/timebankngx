import { Link } from "react-router-dom";

const Index = () => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <section className="max-w-5xl mx-auto text-center px-6 py-16">
        <p className="inline-flex items-center gap-2 text-sm rounded-full px-3 py-1 bg-secondary text-secondary-foreground animate-fade-in">
          <span className="font-brand">TimeBank.ng</span>
          <span className="text-accent">•</span> Trade services without money
        </p>
        <h1 className="mt-6 text-5xl md:text-6xl font-bold leading-tight font-brand">
          Time Banking for Nigerian Businesses
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Exchange skills using time credits. Build trust, grow faster, and keep cash for what matters.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/auth/register" className="px-6 py-3 rounded-lg bg-accent text-accent-foreground font-semibold shadow-[var(--shadow-elevate)] hover:opacity-90 transition">
            Get Started
          </Link>
          <Link to="/auth/login" className="px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:bg-muted transition">
            Log In
          </Link>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Cities: Lagos • Abuja • Port Harcourt • Kano</p>
      </section>
    </main>
  );
};

export default Index;
