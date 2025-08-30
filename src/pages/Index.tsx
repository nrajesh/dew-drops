import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Twitter, Instagram, ShoppingCart } from "lucide-react";

const books = [
  {
    title: "The Magical Treehouse",
    coverUrl: "https://via.placeholder.com/400x600.png/2c2c2c/888888?text=Book+Cover",
    amazonUrl: "https://www.amazon.com/author/sripriyasrinivasan"
  },
  {
    title: "Adventures of a Little Elephant",
    coverUrl: "https://via.placeholder.com/400x600.png/2c2c2c/888888?text=Book+Cover",
    amazonUrl: "https://www.amazon.com/author/sripriyasrinivasan"
  },
  {
    title: "The Girl Who Talked to Animals",
    coverUrl: "https://via.placeholder.com/400x600.png/2c2c2c/888888?text=Book+Cover",
    amazonUrl: "https://www.amazon.com/author/sripriyasrinivasan"
  }
];

const socialLinks = [
  { name: "Amazon", url: "https://www.amazon.com/author/sripriyasrinivasan", icon: ShoppingCart },
  { name: "Twitter", url: "https://twitter.com/sripriya_s", icon: Twitter },
  { name: "Instagram", url: "https://www.instagram.com/sripriya.srinivasan/", icon: Instagram }
];

const Index = () => {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      {/* Hero Section */}
      <section className="text-center">
        <Avatar className="w-32 h-32 mx-auto mb-4">
          <AvatarImage src="https://via.placeholder.com/128x128.png/2c2c2c/888888?text=SS" alt="Sripriya Srinivasan" />
          <AvatarFallback>SS</AvatarFallback>
        </Avatar>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Sripriya Srinivasan</h1>
        <p className="mt-2 text-lg text-muted-foreground">Children's Book Author</p>
        <p className="mt-6 max-w-2xl mx-auto text-xl">
          Welcome! I write fun, engaging, and educational stories for young readers, often exploring themes of friendship, courage, and kindness.
        </p>
      </section>

      {/* Books Section */}
      <section id="books" className="mt-20 scroll-mt-20">
        <h2 className="text-3xl font-bold text-center">My Books</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.title} className="overflow-hidden">
              <CardHeader className="p-0">
                <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="w-full h-64 object-cover" />
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg">{book.title}</CardTitle>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button asChild className="w-full">
                  <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer">
                    Buy on Amazon
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="mt-20 scroll-mt-20 text-center">
        <h2 className="text-3xl font-bold">About Me</h2>
        <div className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground space-y-4">
          <p>
            Sripriya Srinivasan is an author of children's books. She loves to write stories that are fun, engaging, and educational for young readers. Her books often feature themes of friendship, courage, and kindness.
          </p>
        </div>
      </section>

      {/* Social Links Section */}
      <section id="connect" className="mt-20 text-center">
        <h2 className="text-3xl font-bold">Connect With Me</h2>
        <div className="mt-6 flex justify-center gap-4">
          {socialLinks.map((link) => (
            <Button key={link.name} variant="outline" size="icon" asChild>
              <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.name}>
                <link.icon className="h-5 w-5" />
              </a>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;