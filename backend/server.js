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
  let uniqueTempDir = null;
  
  try {
    const { contractCode, testCode, entryName } = req.body;
    
    if (!contractCode || !testCode || !entryName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create unique temporary directory for this API call
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    uniqueTempDir = path.join(__dirname, 'tmp', `${timestamp}_${randomId}`);
    
    fs.mkdirSync(uniqueTempDir, { recursive: true });

    // Replace dashes with underscores in entry name for filenames
    const sanitizedEntryName = entryName.replace(/-/g, '_');
    const contractFile = path.join(uniqueTempDir, `${sanitizedEntryName}_contract.py`);
    const testFile = path.join(uniqueTempDir, `${sanitizedEntryName}_tests.py`);

    fs.writeFileSync(contractFile, contractCode);
    fs.writeFileSync(testFile, testCode);

    console.log(`Files created for entry: ${entryName}`);
    console.log(`Contract file: ${contractFile}`);
    console.log(`Test file: ${testFile}`);
    console.log(`Temporary directory: ${uniqueTempDir}`);

    exec('docker run --rm hello-world', (error, stdout, stderr) => {
      // Clean up temporary directory after Docker execution
      const cleanup = () => {
        if (uniqueTempDir && fs.existsSync(uniqueTempDir)) {
          try {
            fs.rmSync(uniqueTempDir, { recursive: true, force: true });
            console.log(`Cleaned up temporary directory: ${uniqueTempDir}`);
          } catch (cleanupError) {
            console.error(`Error cleaning up temporary directory: ${cleanupError}`);
          }
        }
      };

      if (error) {
        console.error(`Docker error: ${error}`);
        cleanup();
        return res.status(500).send(`Docker execution error: ${error.message}`);
      }
      
      if (stderr) {
        console.error(`Docker stderr: ${stderr}`);
      }

      const output = `Entry: ${entryName}
Files created:
- ${sanitizedEntryName}_contract.py
- ${sanitizedEntryName}_tests.py

Docker Output:
${stdout}

${stderr ? `Docker Stderr:\n${stderr}` : ''}`;

      console.log('Docker execution completed');
      cleanup();
      res.send(output);
    });

  } catch (error) {
    console.error('Server error:', error);
    
    // Clean up on error
    if (uniqueTempDir && fs.existsSync(uniqueTempDir)) {
      try {
        fs.rmSync(uniqueTempDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory after error: ${uniqueTempDir}`);
      } catch (cleanupError) {
        console.error(`Error cleaning up temporary directory after error: ${cleanupError}`);
      }
    }
    
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