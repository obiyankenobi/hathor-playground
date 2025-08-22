# Hathor Playground

A web-based code editor and testing environment for Hathor nanocontracts, similar to Remix IDE for Ethereum. Hathor Playground provides an intuitive interface for writing, testing, and running Python-based smart contracts on the Hathor network.

## Features

- **Dual-panel Code Editor**: Separate editors for contract code and test files with Monaco Editor
- **Live Testing**: Execute contracts and tests using Docker with the official Hathor core test image
- **Project Management**: Create, rename, and delete contract projects with persistent storage
- **Theme Support**: Light and dark mode with automatic system preference detection
- **Collapsible UI**: Expandable/collapsible sidebar and terminal for maximum coding space
- **Real-time Output**: View test results and error messages in an integrated terminal
- **File Persistence**: Auto-save functionality with localStorage backup

## Project Structure

```
├── frontend/          # React TypeScript application
│   ├── src/
│   │   ├── App.tsx           # Main application component
│   │   ├── App.css           # Application styles
│   │   ├── ThemeContext.tsx  # Theme management
│   │   └── ThemeDropdown.tsx # Theme selector component
│   └── public/        # Static assets and HTML template
├── backend/           # Node.js Express server
│   ├── server.js      # Main server file
│   └── tmp/           # Temporary files and logs
└── README.md
```

## Requirements

### System Requirements
- **Node.js**: v16 or higher
- **npm**: v8 or higher  
- **Docker**: Latest stable version
- **Git**: For version control

### Docker Image
The project uses the official Hathor core test image:
- `obiyankenobi/hathor-core-test-image`

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd hathor-remix
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Docker Setup
Pull the required Docker image:
```bash
docker pull obiyankenobi/hathor-core-test-image
```

## Running the Application

### 1. Start the Backend Server
```bash
cd backend
npm start
```
The backend will start on `http://localhost:3001`

### 2. Start the Frontend Development Server
```bash
cd frontend
npm start
```
The frontend will start on `http://localhost:3000`

### 3. Access the Application
Open your browser and navigate to `http://localhost:3000`

## Development

### Frontend Development
The frontend is built with:
- **React 18** with TypeScript
- **Monaco Editor** for code editing
- **CSS Variables** for theming
- **LocalStorage** for persistence

### Backend Development  
The backend provides:
- **Express.js** REST API
- **Docker integration** for test execution
- **File management** for temporary contract files
- **Logging** for debugging Docker executions

### Key API Endpoints
- `POST /run` - Execute contract tests
- `GET /health` - Health check endpoint

## TODO

1. **Make it easier to deploy the Playground in production and test environments**
   - Add Docker Compose configuration
   - Environment-specific configurations
   - CI/CD pipeline setup
   - Production build optimizations

2. **Make frontend validations on the code**
   - The test file should have the correct import from the contract
   - Python syntax validation
   - Contract-specific linting rules
   - Real-time error highlighting

3. **Code Quality Features**
   - Python code formatting (Black/autopep8)
   - Hathor nanocontract API suggestions
   - Context-aware completions
   - Import statement auto-completion
   - Linting integration (pylint, flake8)
   - Code analysis and suggestions

4. **Enhanced Error Handling**
   - Better error messages and formatting
   - Stack trace visualization
   - Error categorization (syntax, runtime, test failures)

5. **Terminal Improvements**
   - Resizable terminal panel
   - Syntax highlighting for output
   - Clear terminal functionality

6. **Template System**
   - Pre-built contract templates
   - Boilerplate test file generation
   - Example projects gallery
   - Add contract with basic imports and initialize method
   - Add test file with basic imports and helper methods

7. **Performance Optimizations**
   - Code editor virtualization for large files
   - Lazy loading of components
   - Optimized Docker container reuse

8. **User Experience**
   - Keyboard shortcuts
   - Multi-tab support for contracts

9. **Advanced Features**
   - Version control integration
   - Contract deployment tools
   - Contract verification tools


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please [create an issue](link-to-issues) or contact the development team.
