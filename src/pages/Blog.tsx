import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, User, ArrowRight, Search, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { blogPosts } from '@/data/blogPosts';

const categories = [
  'All',
  'Career Change',
  'AI & ML',
  'Job Search',
  'Workplace',
  'Cloud',
  'Interviews',
];

const Blog = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() => {
    return blogPosts.filter((p) => {
      const matchesCategory =
        activeCategory === 'All' || p.category === activeCategory;
      const q = search.toLowerCase();
      const matchesSearch =
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const featured = blogPosts.length > 0 ? blogPosts[0] : null;
  const rest = featured
    ? filtered.filter((p) => p.id !== featured.id)
    : filtered;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="secondary" className="mb-4">Blog</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Latest Insights & Articles
          </h1>
          <p className="text-lg text-muted-foreground">
            Original thinking on careers, AI, and engineering — from our team to yours.
          </p>
        </div>

        {/* Search + Filters */}
        <div className="max-w-4xl mx-auto mb-10 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search articles, tags, topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12"
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="rounded-full"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Post */}
        {featured && activeCategory === 'All' && search === '' && (
          <Link
            to={`/blog/${featured.id}`}
            className="block mb-12 bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-xl transition-all group"
          >
            <div className="grid md:grid-cols-2">
              <div
                className="aspect-video md:aspect-auto bg-cover bg-center min-h-[260px]"
                style={{ backgroundImage: `url(${featured.coverImage})` }}
              />
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <Badge className="w-fit mb-4">Featured</Badge>
                <Badge variant="outline" className="w-fit mb-3">{featured.category}</Badge>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {featured.title}
                </h2>
                <p className="text-muted-foreground mb-4">{featured.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{featured.author}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{featured.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {rest.length} article{rest.length !== 1 ? 's' : ''}
        </p>

        {/* Grid */}
        {rest.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No articles found. Try a different search.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post, index) => (
              <Link
                to={`/blog/${post.id}`}
                key={post.id}
                className="bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all animate-fade-in-up flex flex-col group"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Cover Image */}
                <div
                  className="aspect-video bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${post.coverImage})` }}
                >
                  <div className="absolute top-3 left-3 text-3xl bg-background/90 backdrop-blur rounded-lg w-12 h-12 flex items-center justify-center shadow">
                    {post.image}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <Badge variant="outline" className="w-fit mb-3 text-xs">{post.category}</Badge>
                  <h2 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">{post.excerpt}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4 border-t border-border flex-wrap">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                  </div>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Read article <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Blog;