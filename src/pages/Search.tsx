import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export default function Search() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const { toast } = useToast();

  const query = searchParams.get("q");
  const category = searchParams.get("category");

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
    }
  }, [query, category, user]);

  const fetchProducts = async () => {
    let queryBuilder = supabase.from("products").select("*");

    if (category) {
      queryBuilder = queryBuilder.eq("category", category);
    }

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data, error } = await queryBuilder;

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
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation cartItemsCount={cartItemsCount} user={user} />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">
          {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Products` : "Search Results"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {query && `Search results for "${query}"`}
          {products.length > 0 ? ` (${products.length} products found)` : ""}
        </p>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No products found</p>
          </div>
        ) : (
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
        )}
      </main>
    </div>
  );
}