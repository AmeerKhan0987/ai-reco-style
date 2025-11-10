import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's browsing history
    const { data: browsingHistory } = await supabase
      .from('browsing_history')
      .select('product_id, products(name, category)')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(10);

    // Fetch user's cart items
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select('product_id, products(name, category)')
      .eq('user_id', userId);

    // Fetch user's past purchases
    const { data: purchases } = await supabase
      .from('purchases')
      .select('product_id, products(name, category)')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false })
      .limit(10);

    // Prepare context for AI
    const viewedProducts = browsingHistory?.map(h => (h as any).products?.name).filter(Boolean) || [];
    const cartProducts = cartItems?.map(c => (c as any).products?.name).filter(Boolean) || [];
    const purchasedProducts = purchases?.map(p => (p as any).products?.name).filter(Boolean) || [];

    const prompt = `Based on the following user activity, suggest 6 product IDs that would be most relevant:

Recently Viewed: ${viewedProducts.join(', ') || 'None'}
Cart Items: ${cartProducts.join(', ') || 'None'}
Past Purchases: ${purchasedProducts.join(', ') || 'None'}

Available product categories: electronics, accessories, smart home

Provide diverse recommendations across categories that complement their interests. Return ONLY a JSON array of 6 product category preferences in this format:
["electronics", "accessories", "smart home", "electronics", "accessories", "smart home"]`;

    console.log('Calling AI with prompt:', prompt);

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a product recommendation AI. Return only valid JSON arrays with no additional text.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);
    
    const aiContent = aiData.choices[0].message.content;
    let categoryPreferences: string[];
    
    try {
      categoryPreferences = JSON.parse(aiContent);
    } catch {
      // Fallback to balanced recommendations
      categoryPreferences = ['electronics', 'accessories', 'smart home', 'electronics', 'accessories', 'smart home'];
    }

    // Fetch recommended products based on AI suggestions
    const recommendations = [];
    for (const category of categoryPreferences) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .limit(1)
        .order('rating', { ascending: false });
      
      if (data && data.length > 0) {
        recommendations.push(data[0]);
      }
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});