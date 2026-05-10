import { useParams, Link, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, List } from 'lucide-react';
import { blogPosts } from '@/data/blogPosts';

// Helper: convert heading text into a URL-safe id
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const BlogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const post = blogPosts.find((p) => p.id === Number(id));

  if (!post) return <Navigate to="/blog" replace />;

  const related = blogPosts
    .filter((p) => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  // Build the table of contents from headings
  const toc = post.content
    .filter((b) => !!b.heading)
    .map((b) => ({ text: b.heading!, id: slugify(b.heading!) }));

  const handleTocClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout>
      {/* Hero Image */}
      <div
        className="w-full h-[280px] md:h-[420px] bg-cover bg-center relative"
        style={{ backgroundImage: `url(${post.coverImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <article className="container mx-auto px-4 -mt-24 relative pb-12 max-w-4xl">
        <Link to="/blog">
          <Button variant="ghost" size="sm" className="mb-6 bg-background/80 backdrop-blur">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-10 shadow-lg">
          <div className="text-6xl mb-4">{post.image}</div>
          <Badge variant="outline" className="mb-4">{post.category}</Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            {post.title}
          </h1>
          <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground pb-6 mb-8 border-b border-border flex-wrap">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span className="font-medium text-foreground">{post.author}</span>
              <span className="text-muted-foreground">· {post.authorRole}</span>
            </span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{post.date}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{post.readTime}</span>
          </div>

          {/* Table of Contents */}
          {toc.length > 0 && (
            <div className="bg-muted/40 border border-border rounded-xl p-5 mb-10">
              <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">In This Article</h3>
              </div>
              <ol className="space-y-2 list-decimal list-inside">
                {toc.map((item) => (
                  <li key={item.id} className="text-sm">
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => handleTocClick(e, item.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Article body */}
          <div className="prose prose-lg max-w-none">
            {post.content.map((block, i) => (
              <div key={i} className="mb-6">
                {block.heading && (
                  <h2
                    id={slugify(block.heading)}
                    className="text-2xl font-bold text-foreground mt-10 mb-3 scroll-mt-24"
                  >
                    {block.heading}
                  </h2>
                )}
                <p className="text-foreground/90 leading-relaxed text-[1.05rem]">
                  {block.paragraph}
                </p>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-border">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">#{tag}</Badge>
            ))}
          </div>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-foreground mb-6">Related Articles</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((p) => (
                <Link
                  key={p.id}
                  to={`/blog/${p.id}`}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all group"
                >
                  <div
                    className="aspect-video bg-cover bg-center"
                    style={{ backgroundImage: `url(${p.coverImage})` }}
                  />
                  <div className="p-5">
                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {p.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {p.readTime}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </Layout>
  );
};

export default BlogDetail;