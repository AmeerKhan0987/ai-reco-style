-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products are viewable by everyone
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Cart items policies
CREATE POLICY "Users can view own cart"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own cart"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own cart"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create browsing_history table
CREATE TABLE public.browsing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.browsing_history ENABLE ROW LEVEL SECURITY;

-- Browsing history policies
CREATE POLICY "Users can view own history"
  ON public.browsing_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own history"
  ON public.browsing_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Purchases policies
CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_browsing_history_user_id ON public.browsing_history(user_id);
CREATE INDEX idx_browsing_history_viewed_at ON public.browsing_history(viewed_at DESC);
CREATE INDEX idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX idx_products_category ON public.products(category);

-- Insert sample products
INSERT INTO public.products (name, description, price, category, image_url, rating, rating_count) VALUES
  ('Sony WH-1000XM5 Headphones', 'Industry-leading noise canceling wireless headphones', 29999.00, 'electronics', 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=400&fit=crop', 4.8, 156),
  ('Apple AirPods Pro', 'Active noise cancellation, transparency mode, spatial audio', 24900.00, 'electronics', 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=400&h=400&fit=crop', 4.7, 243),
  ('Samsung Galaxy Buds2 Pro', 'Intelligent ANC, 360 audio, comfortable fit', 17999.00, 'electronics', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop', 4.5, 89),
  ('Leather Laptop Bag', 'Premium leather messenger bag for 15-inch laptops', 4999.00, 'accessories', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', 4.6, 78),
  ('Wireless Charging Pad', 'Fast wireless charger for all Qi-enabled devices', 2499.00, 'accessories', 'https://images.unsplash.com/photo-1591290619762-3deac7eac7c3?w=400&h=400&fit=crop', 4.3, 134),
  ('Smart Watch Band', 'Silicone sport band compatible with Apple Watch', 1299.00, 'accessories', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', 4.4, 201),
  ('Amazon Echo Dot 5th Gen', 'Smart speaker with Alexa voice control', 5499.00, 'smart home', 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&h=400&fit=crop', 4.6, 412),
  ('Philips Hue Smart Bulb', 'Color changing LED smart light bulb', 3999.00, 'smart home', 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop', 4.5, 289),
  ('Ring Video Doorbell', 'HD video doorbell with motion detection', 8999.00, 'smart home', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop', 4.7, 156),
  ('TP-Link Smart Plug', 'WiFi enabled smart plug with app control', 1499.00, 'smart home', 'https://images.unsplash.com/photo-1558089687-e1b5a5e9f4b5?w=400&h=400&fit=crop', 4.4, 234),
  ('MacBook Pro 14-inch', 'M3 Pro chip, 18GB RAM, 512GB SSD', 199900.00, 'electronics', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop', 4.9, 87),
  ('iPad Air', '10.9-inch Liquid Retina display, M1 chip', 59900.00, 'electronics', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop', 4.8, 143),
  ('USB-C Hub 7-in-1', 'Multi-port adapter with HDMI and SD card reader', 2999.00, 'accessories', 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&h=400&fit=crop', 4.2, 167),
  ('Mechanical Keyboard', 'RGB backlit gaming keyboard with blue switches', 7999.00, 'accessories', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop', 4.6, 198),
  ('Google Nest Hub', 'Smart display with Google Assistant', 8499.00, 'smart home', 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=400&h=400&fit=crop', 4.5, 276);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for cart_items
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();