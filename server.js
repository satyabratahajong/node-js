const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const cors = require('cors');
const { json } = require('body-parser');

// In-memory data store
let books = [
  { id: '1', title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', year: 1999, price: 49.99, category: 'Programming' },
  { id: '2', title: 'Clean Code', author: 'Robert Martin', year: 2008, price: 39.99, category: 'Programming' },
  { id: '3', title: 'Design Patterns', author: 'Gang of Four', year: 1994, price: 54.99, category: 'Programming' },
  { id: '4', title: 'The Hobbit', author: 'J.R.R. Tolkien', year: 1937, price: 14.99, category: 'Fiction' },
];

let authors = {};
books.forEach(book => {
  if (!authors[book.author]) {
    authors[book.author] = { name: book.author, books: [] };
  }
  authors[book.author].books.push(book.id);
});

// GraphQL Schema
const typeDefs = `#graphql
  type Book {
    id: ID!
    title: String!
    author: String!
    year: Int
    price: Float
    category: String
  }

  type Author {
    name: String!
    books: [Book!]!
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
    booksByCategory(category: String!): [Book!]!
    booksByAuthor(author: String!): [Book!]!
    author(name: String!): Author
    searchBooks(term: String!): [Book!]!
  }

  type Mutation {
    addBook(title: String!, author: String!, year: Int, price: Float, category: String): Book!
    updateBook(id: ID!, title: String, author: String, year: Int, price: Float, category: String): Book
    deleteBook(id: ID!): Boolean
  }
`;

// Resolvers
const resolvers = {
  Query: {
    books: () => books,
    book: (_, { id }) => books.find(b => b.id === id),
    booksByCategory: (_, { category }) => books.filter(b => b.category === category),
    booksByAuthor: (_, { author }) => books.filter(b => b.author === author),
    author: (_, { name }) => {
      const authorData = authors[name];
      if (!authorData) return null;
      return {
        ...authorData,
        books: authorData.books.map(id => books.find(b => b.id === id))
      };
    },
    searchBooks: (_, { term }) => {
      const lowerTerm = term.toLowerCase();
      return books.filter(b => 
        b.title.toLowerCase().includes(lowerTerm) || 
        b.author.toLowerCase().includes(lowerTerm)
      );
    }
  },
  Mutation: {
    addBook: (_, { title, author, year, price, category }) => {
      const id = String(books.length + 1);
      const newBook = { id, title, author, year, price, category };
      books.push(newBook);
      
      if (!authors[author]) {
        authors[author] = { name: author, books: [] };
      }
      authors[author].books.push(id);
      
      return newBook;
    },
    updateBook: (_, { id, title, author, year, price, category }) => {
      const index = books.findIndex(b => b.id === id);
      if (index === -1) return null;
      
      const oldAuthor = books[index].author;
      const book = { ...books[index], title, author, year, price, category };
      books[index] = book;
      
      // Update author mapping if author changed
      if (oldAuthor !== author) {
        authors[oldAuthor].books = authors[oldAuthor].books.filter(bid => bid !== id);
        if (!authors[author]) {
          authors[author] = { name: author, books: [] };
        }
        authors[author].books.push(id);
      }
      
      return book;
    },
    deleteBook: (_, { id }) => {
      const index = books.findIndex(b => b.id === id);
      if (index === -1) return false;
      
      const author = books[index].author;
      books.splice(index, 1);
      
      authors[author].books = authors[author].books.filter(bid => bid !== id);
      
      return true;
    }
  }
};

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  await server.start();

  const app = express();
  app.use('/graphql', cors(), json(), expressMiddleware(server));

  const PORT = process.env.PORT || 3070;
  app.listen(PORT, () => {
    console.log(`GraphQL Bookstore API running at http://localhost:${PORT}/graphql`);
    console.log('Try this query:');
    console.log(`{ books { id title author } }`);
  });
}

startServer().catch(err => console.error(err));