I want to make an online code editor and testing environment, similar to Remix on Ethereum. It will have two main components:
1. The frontend, which is a code editor on the browser.
2. The backend will receive the files from the browser and execute a docker command to test it. It should capture the Docker command output and return to the user.


## Frontend

It's an online code editor, with a few different panels. All of them should be resizeable.

The file explorer, on the left side, will show the different entries available. It should be collapsable to the left side. It should allow entries to be renamed and deleted. It should also allow new entries to be created, with a button at the bottom of the panel. When added, the entry should be selected with it's name editable, like when a user renames an entry. Each entry corresponds to 2 files. Each of them should be displayed on the 2 tabs on the code editor panel. 

The first tab (tab 1 - contract) is called Contract and its file will always be named entry-contract.py. The second one (tab 2 - tests) is called Tests and its files are called entry-tests.py. Both should be code editors, with line numbers. The code should be formatted for Python. On the code editor, tabs should be replaced for 4 spaces.

Let's suppose there are 2 entries in the file explorer: 'crowdsale' and 'vault'. When clicking on the crowdsale entry, it should display the files crowdsale-contract.py (tab 1) and crowdsale-tests.py (tab 2). Similarly, vault will have files vault-contract.py and vault-tests.py. 

These files should be saved locally so if the user reloads the page they are persisted.

The terminal output will be used for displaying the return from the backend. The run code button, when pressed, will invoke the backend via the REST API and send the 2 files that are active on the code editor. While the API call does not return, the button should be disabled.

                                                                                                             
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
  │   LOGO                                                                                                 │ 
  └──────────────────┌─────────────────────┬───────────────────┬───────────────────────────────────────────┐ 
  │                  │ Tab 1 - contract    │ Tab 2 - tests     │                                           │ 
  │                  └─────────────────────┼───────────────────┼───────────────────────────────────────────┘ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │   File explorer  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                         Code editor                                                 │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  │                  │                                                                                     │ 
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
  │ RUN CODE BUTTON                                                                                        │ 
  └────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
  │    Terminal output                                                                                     │ 
  │                                                                                                        │ 
  │                                                                                                        │ 
  │                                                                                                        │ 
  │                                                                                                        │ 
  └────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
                                                                                                             

## Backend

The backend will receive the 2 files from the frontend and run a docker command. For now, we can run the hello-world image from Docker, capture its output and return it to the frontend.

This backend should have a nodejs server that accepts these files and invoke the docker command.
