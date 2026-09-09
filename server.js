import express from 'express';
import simpleRestApi from './projects/simple-rest-api/routes.js';
import todoApi from './projects/todo-api/routes.js';
import weatherApi from './projects/weather-api/routes.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Mount each “project” under its own prefix
app.use('/api/simple-rest', simpleRestApi);
app.use('/api/todo', todoApi);
app.use('/api/weather', weatherApi);

app.listen(PORT, () => {
  console.log(`Playground running at http://localhost:${PORT}`);
});