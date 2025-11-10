import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Package } from "lucide-react";

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPurchases();
      fetchCartItemsCount();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  const fetchPurchases = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("purchases")
      .select("*, products(*)")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false })
      .limit(10);

    setPurchases(data || []);
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation cartItemsCount={cartItemsCount} user={user} />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">My Account</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <p className="font-semibold">{profile?.full_name || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="font-semibold">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Member Since</label>
                <p className="font-semibold">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase) => {
                    const product = purchase.products;
                    return (
                      <div
                        key={purchase.id}
                        className="flex items-center gap-4 p-3 border rounded-lg"
                      >
                        <img
                          src={product?.image_url}
                          alt={product?.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{product?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(purchase.purchased_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-semibold">
                          ₹{purchase.price_at_purchase.toLocaleString('en-IN')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}