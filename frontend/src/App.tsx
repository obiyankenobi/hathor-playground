import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';

interface Entry {
  id: string;
  name: string;
  contractCode: string;
  testCode: string;
}

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contract' | 'tests'>('contract');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const sidebarWidth = 250;
  const terminalHeight = 300;

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

  const deleteEntry = (entryId: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== entryId);
    setEntries(updatedEntries);
    if (selectedEntry === entryId) {
      setSelectedEntry(updatedEntries.length > 0 ? updatedEntries[0].id : null);
    }
  };

  const renameEntry = (entryId: string, newName: string) => {
    setEntries(entries.map(entry => 
      entry.id === entryId ? { ...entry, name: newName } : entry
    ));
  };

  const updateCode = (code: string) => {
    if (!selectedEntry) return;
    
    setEntries(entries.map(entry => 
      entry.id === selectedEntry 
        ? { ...entry, [activeTab === 'contract' ? 'contractCode' : 'testCode']: code }
        : entry
    ));
  };

  const runCode = async () => {
    if (!selectedEntry) return;
    
    const entry = entries.find(e => e.id === selectedEntry);
    if (!entry) return;

    setIsRunning(true);
    setTerminalOutput('Running...\n');

    try {
      const response = await fetch('http://localhost:3001/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractCode: entry.contractCode,
          testCode: entry.testCode,
          entryName: entry.name
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
        <h1>Code Editor</h1>
      </header>
      
      <div className="main-container">
        <div className="layout-container">
          <div className="top-section" style={{ height: `calc(100% - ${terminalHeight}px)` }}>
            <div 
              className="file-explorer"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="file-explorer-header">
                <span>Files</span>
              </div>
              
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEntry(entry.id);
                      }}
                      className="delete-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <button onClick={createEntry} className="create-entry-btn">
                + New Contract
              </button>
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
                  theme="vs-dark"
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
          
          
          <div className="terminal-section" style={{ height: `${terminalHeight}px` }}>
            <div className="run-button-container">
              <button 
                onClick={runCode} 
                disabled={isRunning || !selectedEntry}
                className="run-button"
              >
                {isRunning ? 'Running...' : 'RUN CODE'}
              </button>
            </div>
            
            <div className="terminal-output">
              <pre>{terminalOutput}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
