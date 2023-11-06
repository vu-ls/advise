import React from "react";
import CaseThreadApp from "./CaseThreadApp";
import { render, fireEvent, waitFor, screen, waitForElementToBeRemoved } from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory } from "history";



HTMLCanvasElement.prototype.getContext = jest.fn();
//jest.mock("./ThreadAPI");
jest.mock("./ThreadAPI");
jest.mock("./ComponentAPI");
document.execCommand = jest.fn()
window.HTMLElement.prototype.scrollIntoView = jest.fn()
document.createRange = () => {
    const range = new Range();
  
    range.getBoundingClientRect = () => {
        return {
          x: 0,
          y: 0,
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          toJSON: () => {}
        };
      };
  
    range.getClientRects = () => {
      return {
        item: () => null,
        length: 0,
        [Symbol.iterator]: jest.fn()
      };
    };
  
    return range;
  }



/* CaseThreadApp todo
- load all case components (participants, case details, case status, case artifacts, case activity
- load case threads, filter, show archived threads
*/

describe("Main Case Component", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    it("should create new post when user posts something", async () => {

        const { container } = render(
            <MemoryRouter>
                <CaseThreadApp />
            </MemoryRouter>
        );

        const user = userEvent.setup();

        await waitFor(() => {
            expect(container.querySelector(".ql-editor")).toBeInTheDocument();
            const thing = container.querySelector(".ql-editor");
            fireEvent.change(thing, {
                target: { textContent: "Boooooo!" }
            });
            fireEvent.click(screen.getByTestId('submit-post'));
        });

        await waitFor(() => {
            expect(screen.getByText('Boooooo!')).toBeInTheDocument();
        })


    });




    it("should render", async () => {
        const { container } = render(
            <MemoryRouter>
                <CaseThreadApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/CASE#312650/i)).toBeInTheDocument();
            expect(screen.getByText("Original Report")).toBeInTheDocument();
            //expect(screen.getByText("Report submitted")).toBeInTheDocument();
            const items = screen.getAllByText("Case Details");
            expect(items).toHaveLength(2);
            expect(screen.getByText("Vulnerabilities")).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /Add Vul/}));
            expect(screen.getByText("Status")).toBeInTheDocument();
            expect(screen.getByText('Component Status')).toBeInTheDocument();

            expect(screen.getByText('Case Threads')).toBeInTheDocument();
            //expect(screen.getByText('Case Participants')).not.toBeInTheDocument();
            expect(screen.getByText('Case Activity')).toBeInTheDocument();
            expect(screen.getByText('Case Artifacts')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Active/ }));

    
        });
    });

    it("should search posts for content", async () => {

        const { container } = render(
            <MemoryRouter>
                <CaseThreadApp />
            </MemoryRouter>
        );

        const user = userEvent.setup();
        await waitFor(() => {
            /* is post search there? */
            expect(screen.getByPlaceholderText(/Search Posts/)).toBeInTheDocument();
            /* is initial post there? */
            expect(screen.getByText(/Hello, world!/)).toBeInTheDocument();
            /* does search work? */
            fireEvent.change(screen.getByPlaceholderText(/Search Posts/), {
                target: 
                {value: 'Banana'}
            });
            fireEvent.click(container.querySelector("#button-addon2"));
        })

        //await waitForElementToBeRemoved(() => screen.getByText(/Hello, world!/));
        await waitFor(() => {
            expect(screen.getByText(/No posts matched your filter/)).toBeInTheDocument();
            fireEvent.change(screen.getByPlaceholderText(/Search Posts/), {
                target: 
                {value: 'world'}
            });
            fireEvent.click(container.querySelector("#button-addon2"));
        });

        await waitFor(() => {
            expect(screen.getByText(/Hello, world!/)).toBeInTheDocument();
        });

    })

    it("should render a reply post when button is clicked", async () => {

        const { container } = render(
            <MemoryRouter>
                <CaseThreadApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Hello, world!/)).toBeInTheDocument();
            const reply = screen.getAllByRole('button', {name: /Reply/});
            expect(reply).toHaveLength(2);
            fireEvent.click(reply[0]);
        });

        await waitFor(() => {
            expect(container.querySelector(".ql-mention-denotation-char")).toBeInTheDocument();
	    expect(container.querySelector(".mention")).toBeInTheDocument();
            //expect(screen.getByText('@')).toBeInTheDocument();
            //const authors = screen.getAllByText('emily');
            //expect(authors).toHaveLength(5);
        });

    })

    it ("should delete a post", async () => {
        
        const { container } = render(
            <MemoryRouter>
                <CaseThreadApp />
            </MemoryRouter>
        );
        const user = userEvent.setup();

        await waitFor(() => {

            const postedit = container.getElementsByClassName('postactions');
            expect(postedit).toHaveLength(2);
      
            expect(screen.getByText('Hello, world!')).toBeInTheDocument();
        })

        await waitFor(() => {
            const postedit = container.getElementsByClassName('postactions');
            user.click(postedit[0]);
        })

        await waitFor(() => {
    
            expect(screen.getByText(/Delete Post/i)).toBeInTheDocument();
            user.click(screen.getByText(/Delete Post/i));
        })
        
        await waitFor(() => {
            expect(screen.getByText('Confirm this action')).toBeInTheDocument();
            user.click(screen.getByTestId('confirm-cancel'));
        })
        
        await waitForElementToBeRemoved(() => [screen.getByText('Confirm this action'), screen.getByText('Hello, world!')]);

    })

    it("should edit a post", async () => {

        const { container } = render(
            <MemoryRouter>
                <CaseThreadApp />
            </MemoryRouter>
        );
        const user = userEvent.setup();

        await waitFor(() => {

            const postedit = container.getElementsByClassName('postactions');
            expect(postedit).toHaveLength(2);
            expect(screen.getByText('Hello, world!')).toBeInTheDocument();
        })

        await waitFor(() => {
            const postedit = container.getElementsByClassName('postactions');
            user.click(postedit[0]);
        })

        await waitFor(() => {
            expect(screen.getByText(/Edit Post/i)).toBeInTheDocument();
            user.click(screen.getByText(/Edit Post/i));
        })

        await waitFor(() => {
            /* now there should be 2 editors! */
            const editors =  container.getElementsByClassName('ql-editor')

            expect(editors).toHaveLength(2);
            /* Hello, World should still be there */
            expect(screen.getByText(/Boooooo/)).toBeInTheDocument();
            
            const submitbtns = screen.getAllByTestId('submit-post');
            expect(submitbtns).toHaveLength(2);
        
            fireEvent.change(editors[0], {
                target: { textContent: "Boooyah!" }
            });

        })

        await waitFor(() => {
            expect(screen.getByText('Boooyah!')).toBeInTheDocument();
            const submitbtns = screen.getAllByTestId('submit-post');
            expect(submitbtns).toHaveLength(2);
            fireEvent.click(submitbtns[0]);

        })
        
        await waitFor(() => {
            const editors =  container.getElementsByClassName('ql-editor')

            expect(editors).toHaveLength(1);
            /* Hello, World should still be there */
            expect(screen.getByText('Hello, world!')).toBeInTheDocument();
            const submitbtns = screen.getAllByTestId('submit-post');
            expect(submitbtns).toHaveLength(1);

        });

    })


    it("should show case thread tabs, create new thread when asked, archive that thread", async () => {
        
        const { container } = render(
            <MemoryRouter>
                <CaseThreadApp />
            </MemoryRouter>
        );

        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.getByRole('tab', {name: /Official Case Thread/})).toBeInTheDocument();
            expect(screen.getByRole('tab', {name: /Add a Thread/})).toBeInTheDocument();
            expect(container.querySelector(".ql-editor")).toBeInTheDocument();
            user.click(screen.queryByRole('tab', {name:/Add a Thread/}));
        });

        await waitForElementToBeRemoved(() => screen.getByText(/Add a Thread/))
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Add a subject/)).toBeInTheDocument();
           fireEvent.change(screen.getByPlaceholderText(/Add a subject/), {
            target: 
            {value: 'New Thread'}
           });
            fireEvent.click(screen.queryByRole('button', {name:/Create/}));
        });
        await waitFor(() => {
            expect(screen.getByRole('tab', {name:/New Thread/}));
            expect(screen.getByRole('tab', {name: /Add a Thread/})).toBeInTheDocument();
        })

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Add a subject/)).toBeInTheDocument();
            fireEvent.change(screen.getByPlaceholderText(/Add a subject/), {
                target: 
                {value: 'xydsk'}
            });
            fireEvent.click(screen.getByTestId('cancel-create-thread'));
        });
        /*test archve thread */
        await waitFor(() => {
            expect(screen.getByRole('tab', {name: /Add a Thread/})).toBeInTheDocument();
            user.click(screen.queryByRole('tab', {name:/New Thread/}));
            user.click(container.querySelector('#thread-dropdown'));
        })

        await waitFor(() => {
            expect(screen.getByText('Archive Threads')).toBeInTheDocument();
            user.click(screen.getByText('Archive Threads'));
        })

        await waitFor(() => {
            expect(container.querySelector('.react-tabs-tab-close')).toBeInTheDocument();
            user.click(container.querySelector('.react-tabs-tab-close'))

        })

        await waitFor(() => {
            expect(screen.getByText('Confirm this action')).toBeInTheDocument();
            /* click cancel first */
            user.click(screen.getByTestId('cancel-confirm'));

        })
        await waitForElementToBeRemoved(() => [screen.getByText(/Confirm this action/), container.querySelector('.react-tabs-tab-close')]);
        await waitFor(() => {
            user.click(container.querySelector('#thread-dropdown'));
        })
        await waitFor(() => {
            user.click(screen.getByText('Archive Threads'));
        });

        await waitFor(() => {
            expect(container.querySelector('.react-tabs-tab-close')).toBeInTheDocument();
            user.click(container.querySelector('.react-tabs-tab-close'))
        });
        await waitFor(() => {
            expect(screen.getByText('Confirm this action')).toBeInTheDocument();
            user.click(screen.getByTestId('confirm-cancel'));
        })

        await waitForElementToBeRemoved(() => [screen.getByText(/Confirm this action/), container.querySelector('.react-tabs-tab-close'), screen.queryByRole('tab', {name:/New Thread/})]);

    });

    it("should show archived threads", async () => {

        const { container } = render(
            <MemoryRouter>
                <CaseThreadApp />
            </MemoryRouter>
        );
        const user = userEvent.setup();
        await waitFor(() => {
            expect(container.querySelector('#thread-dropdown'));
        })
        await waitFor(() => {
            user.click(container.querySelector('#thread-dropdown'));
        })
        await waitFor(() => {
            expect(screen.getByText('Show Archived')).toBeInTheDocument();
            user.click(screen.getByText('Show Archived'));
        });
        await waitFor(() => {
            expect(screen.getByText('Archived Case Threads')).toBeInTheDocument();
        });
        await waitFor(() => {
            user.click(container.querySelector('#thread-dropdown'));
        })
        await waitFor(() => {
            expect(screen.getByText('Show Current Threads')).toBeInTheDocument();
            user.click(screen.getByText('Show Current Threads'));
        });
        await waitForElementToBeRemoved(() => screen.getByText('Archived Case Threads'))
        

    })

    

});
