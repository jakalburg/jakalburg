import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container-vh grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex" aria-label="Jakalburg home"><img src="/logo.png" alt="Jakalburg" className="h-12 w-auto mix-blend-multiply" /></Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Considered wardrobe essentials in natural fibres, made to be kept.
          </p>
        </div>
        <div>
          <p className="eyebrow text-mute-text">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/women">Women</Link></li>
            <li><Link href="/men">Men</Link></li>
            <li><Link href="/new-arrivals">New arrivals</Link></li>
            <li><Link href="/collections">Collections</Link></li>
            <li><Link href="/essentials">Essentials</Link></li>
            <li><Link href="/sale">Sale</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-mute-text">Help</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/shipping-policy">Shipping</Link></li>
            <li><Link href="/returns-policy">Returns</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-mute-text">About</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/about">Our story</Link></li>
            <li><Link href="/privacy-policy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/account">My account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container-vh flex flex-col items-start justify-between gap-3 py-6 text-xs text-mute-text md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Jakalburg. All rights reserved.</p>
          <p>Prices in INR. Demo prototype — no real transactions.</p>
        </div>
      </div>
    </footer>
  );
}
