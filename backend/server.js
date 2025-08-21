const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/run', async (req, res) => {
  try {
    const { contractCode, testCode, entryName } = req.body;
    
    if (!contractCode || !testCode || !entryName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tempDir = path.join(__dirname, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const contractFile = path.join(tempDir, `${entryName}-contract.py`);
    const testFile = path.join(tempDir, `${entryName}-tests.py`);

    fs.writeFileSync(contractFile, contractCode);
    fs.writeFileSync(testFile, testCode);

    console.log(`Files created for entry: ${entryName}`);
    console.log(`Contract file: ${contractFile}`);
    console.log(`Test file: ${testFile}`);

    exec('docker run --rm hello-world', (error, stdout, stderr) => {
      if (error) {
        console.error(`Docker error: ${error}`);
        return res.status(500).send(`Docker execution error: ${error.message}`);
      }
      
      if (stderr) {
        console.error(`Docker stderr: ${stderr}`);
      }

      const output = `Entry: ${entryName}
Files created:
- ${entryName}-contract.py
- ${entryName}-tests.py

Docker Output:
${stdout}

${stderr ? `Docker Stderr:\n${stderr}` : ''}`;

      console.log('Docker execution completed');
      res.send(output);
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send(`Server error: ${error.message}`);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});