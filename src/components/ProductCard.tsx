import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  rating: number;
  ratingCount: number;
  imageUrl: string;
  isAIRecommended?: boolean;
  onAddToCart: () => void;
}

export const ProductCard = ({
  id,
  name,
  price,
  rating,
  ratingCount,
  imageUrl,
  isAIRecommended,
  onAddToCart,
}: ProductCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="relative">
        {isAIRecommended && (
          <Badge className="absolute top-2 right-2 z-10 ai-badge">
            AI Recommended
          </Badge>
        )}
        <div
          className="aspect-square overflow-hidden cursor-pointer"
          onClick={() => navigate(`/product/${id}`)}
        >
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      </div>
      
      <CardContent className="p-4 space-y-2">
        <h3
          className="font-semibold line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(`/product/${id}`)}
        >
          {name}
        </h3>
        
        <div className="flex items-center gap-1">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.floor(rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">({ratingCount})</span>
        </div>
        
        <div className="text-2xl font-bold text-primary">₹{price.toLocaleString('en-IN')}</div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(`/product/${id}`)}
        >
          View Details
        </Button>
        <Button onClick={onAddToCart} className="flex-1">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};