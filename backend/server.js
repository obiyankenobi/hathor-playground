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

    // Use the normalized entry name (already processed on frontend)
    const contractFile = path.join(uniqueTempDir, `${entryName}.py`);
    const testFile = path.join(uniqueTempDir, `test.py`);

    fs.writeFileSync(contractFile, contractCode);
    fs.writeFileSync(testFile, testCode);

    console.log(`Files created for entry: ${entryName}`);
    console.log(`Contract file: ${contractFile}`);
    console.log(`Test file: ${testFile}`);
    console.log(`Temporary directory: ${uniqueTempDir}`);

    // Mount files to the correct paths in the container
    const contractMountPath = `/app/hathor/nanocontracts/blueprints/${entryName}.py`;
    const testMountPath = '/app/tests/nanocontracts/blueprints/test.py';
    
    const dockerCommand = `docker run --rm ` +
      `-v "${contractFile}:${contractMountPath}" ` +
      `-v "${testFile}:${testMountPath}" ` +
      `obiyankenobi/hathor-core-test-image ` +
      `-v tests/nanocontracts/blueprints/test.py`;

    console.log(`Running Docker command: ${dockerCommand}`);

    exec(dockerCommand, (error, stdout, stderr) => {
      // Save stdout and stderr to a single log file in tmp directory
      const logFile = path.join(__dirname, 'tmp', 'docker_output.log');
      const logContent = `
=== Docker Execution Log ===
Timestamp: ${new Date().toISOString()}
Command: ${dockerCommand}
Entry: ${entryName}
Temp Dir: ${uniqueTempDir}

=== STDOUT ===
${stdout || '(no stdout)'}

=== STDERR ===
${stderr || '(no stderr)'}

=== ERROR ===
${error ? error.message : '(no error)'}

=== END LOG ===

`;

      try {
        // Ensure tmp directory exists
        const tmpDir = path.join(__dirname, 'tmp');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        // Append to the log file
        fs.appendFileSync(logFile, logContent);
        console.log(`Docker output appended to: ${logFile}`);
      } catch (logError) {
        console.error(`Error saving log file: ${logError}`);
      }

      // Clean up the specific temporary directory after Docker execution
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
      }
      
      if (stderr) {
        console.error(`Docker stderr: ${stderr}`);
      }

      const output = `${stdout}${stderr ? `\n${stderr}` : ''}`;

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