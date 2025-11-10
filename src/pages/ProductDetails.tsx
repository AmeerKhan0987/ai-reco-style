import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
    if (id) {
      fetchProduct();
    }
    if (user) {
      fetchCartItemsCount();
    }
  }, [id, user]);

  useEffect(() => {
    if (user && product) {
      trackView();
    }
  }, [user, product]);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product not found",
      });
      navigate("/");
    } else {
      setProduct(data);
    }
    setLoading(false);
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

  const trackView = async () => {
    if (!user || !product) return;

    await supabase.from("browsing_history").insert({
      user_id: user.id,
      product_id: product.id,
    });
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to add items to cart",
      });
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("cart_items")
      .upsert(
        {
          user_id: user.id,
          product_id: product.id,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation cartItemsCount={cartItemsCount} user={user} />
        <div className="container mx-auto px-4 py-12">Loading...</div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation cartItemsCount={cartItemsCount} user={user} />

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square overflow-hidden rounded-lg border">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(product.rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground">
                  ({product.rating_count} reviews)
                </span>
              </div>
            </div>

            <div className="text-4xl font-bold text-primary">
              ₹{product.price.toLocaleString('en-IN')}
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Category:</span>
                <span className="capitalize">{product.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Availability:</span>
                <span className={product.in_stock ? "text-green-600" : "text-red-600"}>
                  {product.in_stock ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={!product.in_stock}
              className="w-full"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}