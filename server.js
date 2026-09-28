const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const handlebars = require('handlebars');

const app = express();
const PORT = process.env.PORT || 3071;

app.use(cors());
app.use(express.json());
app.use('/pdfs', express.static('pdfs'));

// Ensure output directory exists
if (!fs.existsSync('pdfs')) {
  fs.mkdirSync('pdfs', { recursive: true });
}

// HTML Template for invoice
const invoiceTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .invoice-details { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f5f5; }
    .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
    <p>Invoice #{{invoiceNumber}}</p>
  </div>
  
  <div class="invoice-details">
    <p><strong>From:</strong> {{companyName}}</p>
    <p><strong>To:</strong> {{customerName}}</p>
    <p><strong>Date:</strong> {{date}}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Quantity</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{this.name}}</td>
        <td>{{this.quantity}}</td>
        <td>${{this.price}}</td>
        <td>${{this.total}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  
  <div class="total">
    Grand Total: ${{grandTotal}}
  </div>
</body>
</html>
`;

// Generate PDF from HTML
app.post('/api/generate-invoice', async (req, res) => {
  try {
    const { invoiceNumber, companyName, customerName, items } = req.body;
    
    if (!invoiceNumber || !customerName || !items) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate totals
    const itemsWithTotals = items.map(item => ({
      ...item,
      total: item.quantity * item.price
    }));
    
    const grandTotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);

    // Compile template
    const template = handlebars.compile(invoiceTemplate);
    const html = template({
      invoiceNumber,
      companyName: companyName || 'Your Company',
      customerName,
      date: new Date().toLocaleDateString(),
      items: itemsWithTotals,
      grandTotal: grandTotal.toFixed(2)
    });

    // Launch browser and generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const filename = `invoice-${invoiceNumber}.pdf`;
    const filepath = path.join('pdfs', filename);
    
    await page.pdf({
      path: filepath,
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    res.json({
      success: true,
      filename,
      url: `/pdfs/${filename}`,
      grandTotal
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF generation failed', message: err.message });
  }
});

// Generate PDF from custom HTML
app.post('/api/generate-custom', async (req, res) => {
  try {
    const { html, filename = 'custom.pdf' } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content required' });
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const safeFilename = filename.replace(/[^a-z0-9.-]/gi, '_');
    const filepath = path.join('pdfs', safeFilename);
    
    await page.pdf({
      path: filepath,
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    res.json({
      success: true,
      filename: safeFilename,
      url: `/pdfs/${safeFilename}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF generation failed', message: err.message });
  }
});

// List generated PDFs
app.get('/api/pdfs', (req, res) => {
  const files = fs.readdirSync('pdfs')
    .filter(f => f.endsWith('.pdf'))
    .map(filename => ({
      filename,
      url: `/pdfs/${filename}`,
      size: fs.statSync(path.join('pdfs', filename)).size
    }));
  
  res.json(files);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`PDF Generator running on http://localhost:${PORT}`);
});