import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';
import { ThemeProvider, useTheme } from './ThemeContext';
import ThemeDropdown from './ThemeDropdown';

interface Entry {
  id: string;
  name: string;
  contractCode: string;
  testCode: string;
}

function AppContent() {
  const { theme } = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contract' | 'tests'>('contract');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? 40 : 200;
  const terminalHeight = terminalCollapsed ? 70 : 300;

  // Load entries from localStorage on component mount
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem('codeEditorEntries');
      const savedSelectedEntry = localStorage.getItem('codeEditorSelectedEntry');
      const savedActiveTab = localStorage.getItem('codeEditorActiveTab');
      
      console.log('Loading from localStorage:', { savedEntries, savedSelectedEntry, savedActiveTab });
      
      if (savedEntries) {
        const parsedEntries = JSON.parse(savedEntries);
        console.log('Parsed entries:', parsedEntries);
        setEntries(parsedEntries);
        
        if (parsedEntries.length > 0) {
          const entryToSelect = savedSelectedEntry && parsedEntries.find((e: Entry) => e.id === savedSelectedEntry)
            ? savedSelectedEntry
            : parsedEntries[0].id;
          setSelectedEntry(entryToSelect);
        }
      }
      
      if (savedActiveTab && (savedActiveTab === 'contract' || savedActiveTab === 'tests')) {
        setActiveTab(savedActiveTab);
      }
    } catch (error) {
      console.error('Error loading entries from localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Save entries to localStorage whenever entries change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      try {
        console.log('Saving entries to localStorage:', entries);
        localStorage.setItem('codeEditorEntries', JSON.stringify(entries));
      } catch (error) {
        console.error('Error saving entries to localStorage:', error);
      }
    }
  }, [entries, isInitialized]);

  // Save selected entry to localStorage
  useEffect(() => {
    if (isInitialized && selectedEntry) {
      localStorage.setItem('codeEditorSelectedEntry', selectedEntry);
    }
  }, [selectedEntry, isInitialized]);

  // Save active tab to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('codeEditorActiveTab', activeTab);
    }
  }, [activeTab, isInitialized]);

  // Cancel delete confirmation on escape key or when clicking outside
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && deletingEntryId) {
        setDeletingEntryId(null);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (deletingEntryId) {
        const target = event.target as HTMLElement;
        // Don't cancel if clicking on the dropdown or delete button
        if (!target.closest('.delete-button-container')) {
          setDeletingEntryId(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [deletingEntryId]);


  const createEntry = () => {
    const newEntry: Entry = {
      id: Date.now().toString(),
      name: `entry${entries.length + 1}`,
      contractCode: '# Contract code here\n',
      testCode: '# Test code here\n'
    };
    setEntries([...entries, newEntry]);
    setSelectedEntry(newEntry.id);
  };

  const startDeleteEntry = (entryId: string) => {
    setDeletingEntryId(entryId);
  };

  const cancelDeleteEntry = () => {
    setDeletingEntryId(null);
  };

  const confirmDeleteEntry = (entryId: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== entryId);
    setEntries(updatedEntries);
    if (selectedEntry === entryId) {
      setSelectedEntry(updatedEntries.length > 0 ? updatedEntries[0].id : null);
    }
    setDeletingEntryId(null);
  };

  const renameEntry = (entryId: string, newName: string) => {
    setEntries(entries.map(entry => 
      entry.id === entryId ? { ...entry, name: newName } : entry
    ));
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleTerminal = () => {
    setTerminalCollapsed(!terminalCollapsed);
  };

  const updateCode = (code: string) => {
    if (!selectedEntry) return;
    
    setEntries(entries.map(entry => 
      entry.id === selectedEntry 
        ? { ...entry, [activeTab === 'contract' ? 'contractCode' : 'testCode']: code }
        : entry
    ));
  };

  // Normalize entry name for filenames
  const normalizeEntryName = (name: string): string => {
    return name.toLowerCase().replace(/-/g, '_');
  };

  const runCode = async () => {
    if (!selectedEntry) return;
    
    const entry = entries.find(e => e.id === selectedEntry);
    if (!entry) return;

    // Expand terminal when running code
    if (terminalCollapsed) {
      setTerminalCollapsed(false);
    }

    setIsRunning(true);
    setTerminalOutput('Running...\n');

    const normalizedName = normalizeEntryName(entry.name);

    try {
      const response = await fetch('http://localhost:3001/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractCode: entry.contractCode,
          testCode: entry.testCode,
          entryName: normalizedName
        }),
      });

      const result = await response.text();
      setTerminalOutput(result);
    } catch (error) {
      setTerminalOutput(`Error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const selectedEntryData = entries.find(e => e.id === selectedEntry);
  const currentCode = selectedEntryData 
    ? (activeTab === 'contract' ? selectedEntryData.contractCode : selectedEntryData.testCode)
    : '';

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/logo.svg" alt="Hathor Playground Logo" className="logo" />
            <h1>Hathor Playground</h1>
          </div>
          <div className="header-right">
            <ThemeDropdown />
          </div>
        </div>
      </header>
      
      <div className="main-container">
        <div className="layout-container">
          <div className="top-section">
            <div 
              className={`file-explorer ${sidebarCollapsed ? 'collapsed' : ''}`}
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="file-explorer-header">
                {!sidebarCollapsed && <span>Files</span>}
                <button 
                  className="collapse-btn sidebar-collapse-btn"
                  onClick={toggleSidebar}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? '»' : '«'}
                </button>
              </div>
              
              {!sidebarCollapsed && (
                <div className="entries-list">
                  {entries.map(entry => (
                  <div
                    key={entry.id}
                    className={`entry-item ${selectedEntry === entry.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEntry(entry.id)}
                  >
                    <input
                      type="text"
                      value={entry.name}
                      onChange={(e) => renameEntry(entry.id, e.target.value)}
                      onBlur={(e) => e.target.blur()}
                      className="entry-name-input"
                    />
                    <div className="delete-button-container">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          startDeleteEntry(entry.id);
                        }}
                        className="delete-btn"
                        title="Delete entry"
                      >
                        ×
                      </button>
                      
                      {deletingEntryId === entry.id && (
                        <div className="delete-dropdown">
                          <div className="delete-dropdown-content">
                            <div className="delete-message">
                              Delete "{entry.name}"?
                            </div>
                            <div className="delete-actions">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteEntry(entry.id);
                                }}
                                className="delete-confirm-btn"
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelDeleteEntry();
                                }}
                                className="delete-cancel-btn"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  ))}
                </div>
              )}
              
              {!sidebarCollapsed && (
                <button onClick={createEntry} className="create-entry-btn">
                  + New Contract
                </button>
              )}
            </div>
            
            
            <div className="code-editor-panel">
              <div className="tabs-header">
                <button
                  className={`tab ${activeTab === 'contract' ? 'active' : ''}`}
                  onClick={() => setActiveTab('contract')}
                >
                  Contract
                </button>
                <button
                  className={`tab ${activeTab === 'tests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tests')}
                >
                  Tests
                </button>
              </div>
              
              <div className="editor-container">
                <Editor
                  height="100%"
                  language="python"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={currentCode}
                  onChange={(value) => updateCode(value || '')}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    insertSpaces: true,
                    tabSize: 4,
                    detectIndentation: false,
                    fontSize: 14,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  }}
                />
              </div>
            </div>
          </div>
          
          
          <div className={`terminal-section ${terminalCollapsed ? 'collapsed' : ''}`}>
            <div className="run-button-container">
              <button 
                onClick={runCode} 
                disabled={isRunning || !selectedEntry}
                className="run-button"
              >
                {isRunning ? 'Running...' : 'RUN CODE'}
              </button>
              
              <button 
                className={`collapse-btn terminal-collapse-btn ${terminalCollapsed ? 'collapsed' : ''}`}
                onClick={toggleTerminal}
                title={terminalCollapsed ? 'Expand terminal' : 'Collapse terminal'}
              >
                <div className="chevron-icon"></div>
              </button>
            </div>
            
            {!terminalCollapsed && (
              <div className="terminal-output">
                <pre>{terminalOutput}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
