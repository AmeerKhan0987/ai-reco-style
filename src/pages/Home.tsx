import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchProducts();
    if (user) {
      fetchCartItemsCount();
      fetchRecommendations();
    }
  }, [user]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("rating", { ascending: false })
      .limit(12);

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
  };

  const fetchCartItemsCount = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", user.id);

    if (!error && data) {
      const total = data.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemsCount(total);
    }
  };

  const fetchRecommendations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-recommendations', {
        body: { userId: user.id }
      });

      if (error) throw error;
      setRecommendations(data?.recommendations || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to add items to cart",
      });
      return;
    }

    const { error } = await supabase
      .from("cart_items")
      .upsert(
        {
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        },
        { onConflict: "user_id,product_id" }
      );

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item to cart",
      });
    } else {
      toast({ title: "Added to cart!" });
      fetchCartItemsCount();
    }

    // Track browsing history
    await supabase.from("browsing_history").insert({
      user_id: user.id,
      product_id: productId,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation cartItemsCount={cartItemsCount} user={user} />
      <Hero />

      <main className="container mx-auto px-4 py-12 space-y-16">
        {user && recommendations.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold mb-6">
              Recommended for You
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Powered by AI
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendations.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  rating={product.rating}
                  ratingCount={product.rating_count}
                  imageUrl={product.image_url}
                  isAIRecommended
                  onAddToCart={() => handleAddToCart(product.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section id="products">
          <h2 className="text-3xl font-bold mb-6">Trending Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                rating={product.rating}
                ratingCount={product.rating_count}
                imageUrl={product.image_url}
                onAddToCart={() => handleAddToCart(product.id)}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-muted/30 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          © 2025 SmartRecommender | Powered by AI
        </div>
      </footer>
    </div>
  );
}