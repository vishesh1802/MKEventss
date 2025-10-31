import { Heart, MapPin, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-muted border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 gradient-hero rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-xl font-bold">
                MKE <span className="text-primary">Discover</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Connecting Milwaukee residents and visitors with the city's vibrant events and community.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/" className="hover:text-primary transition-smooth">
                  Home
                </a>
              </li>
              <li>
                <a href="/discover" className="hover:text-primary transition-smooth">
                  Discover Events
                </a>
              </li>
              <li>
                <a href="/recommendations" className="hover:text-primary transition-smooth">
                  Recommendations
                </a>
              </li>
              <li>
                <a href="/profile" className="hover:text-primary transition-smooth">
                  My Profile
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Get in Touch</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Milwaukee, Wisconsin
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                hello@mkediscover.com
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            Made with <Heart className="w-4 h-4 text-secondary fill-secondary" /> in Milwaukee
          </p>
          <p className="mt-2">© 2025 MKE Discover. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
