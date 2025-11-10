import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Hero = () => {
  const scrollToProducts = () => {
    const productsSection = document.getElementById("products");
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI-Powered Recommendations
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Discover Products
            <br />
            <span className="text-primary">Tailored Just for You</span>
          </h1>
          
          <p className="text-xl text-muted-foreground">
            Experience intelligent shopping with personalized AI recommendations based on your preferences and browsing history
          </p>
          
          <Button
            size="lg"
            onClick={scrollToProducts}
            className="text-lg px-8 py-6 rounded-xl"
          >
            Start Exploring
          </Button>
        </div>
      </div>
    </section>
  );
};